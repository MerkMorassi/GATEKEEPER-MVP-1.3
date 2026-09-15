import { db } from '../../db.js';
import { Payout, PayoutStatus, Settlement, Order } from '../../../src/types/index.js';
import { PayoutProviderAdapter } from './payoutProvider.js';
import { talentirProvider } from './talentirProvider.js';

export class PayoutService {
  private adapter: PayoutProviderAdapter;
  private processedWebhookEvents: Set<string> = new Set();

  constructor(adapter: PayoutProviderAdapter = talentirProvider) {
    this.adapter = adapter;
  }

  public getAdapter(): PayoutProviderAdapter {
    return this.adapter;
  }

  /**
   * Allowed state transitions map
   */
  private allowedTransitions: Record<PayoutStatus, PayoutStatus[]> = {
    pending: ['created', 'approved', 'requested', 'failed', 'cancelled'],
    created: ['approved', 'requested', 'completed', 'failed', 'cancelled', 'deleted'],
    approved: ['requested', 'completed', 'failed', 'cancelled'],
    requested: ['completed', 'failed', 'cancelled', 'expired'],
    submitted: ['completed', 'failed', 'cancelled'],
    completed: [], // Terminal state - immutable!
    failed: ['pending', 'created', 'requested'], // Allowed retry
    cancelled: [], // Terminal
    deleted: [],   // Terminal
    expired: [],   // Terminal
  };

  /**
   * Validate if a state transition is legal
   */
  public isValidTransition(currentStatus: PayoutStatus, newStatus: PayoutStatus): boolean {
    if (currentStatus === newStatus) return true;
    const allowed = this.allowedTransitions[currentStatus] || [];
    return allowed.includes(newStatus);
  }

  /**
   * Authoritative Payout Execution from Settlement
   */
  public async executePayoutFromSettlement(
    order: Order,
    settlement: Settlement,
    recipientEmail: string,
    creatorId: string
  ): Promise<Payout> {
    const payoutId = `GK-${order.id}-PROVIDER`;

    // Invariant A: Server-authoritative creatorId from settlement/order
    if (!creatorId) {
      throw new Error('PAYOUT_INVARIANT_VIOLATION: creatorId is required from server-authoritative record');
    }

    // Invariant B & C: Amount derived from authoritative settlement
    const amountCents = settlement.providerCents;
    if (amountCents > settlement.providerCents) {
      throw new Error('PAYOUT_INVARIANT_VIOLATION: Payout amount exceeds settlement provider share');
    }

    // Invariant D: No duplicate payout check
    const existingPayout = db.getPayout(payoutId);
    if (existingPayout) {
      if (existingPayout.status === 'completed') {
        db.logAuditEvent('PAYOUT_REQUESTED', 'system', {
          payoutId,
          orderId: order.id,
          note: 'Idempotent duplicate payout request ignored; already completed.',
        });
        return existingPayout;
      }
      if (existingPayout.status === 'requested' || existingPayout.status === 'created' || existingPayout.status === 'approved') {
        return existingPayout;
      }
    }

    // Invariant E: GateKeeper payoutId becomes customId (Idempotency Key)
    const customId = payoutId;

    const createResult = await this.adapter.createPayout({
      payoutId,
      orderId: order.id,
      creatorId,
      settlementId: order.id,
      recipientEmail,
      amountCents,
      currency: settlement.currency || 'USD',
      description: `GateKeeper Settlement Payout for Order ${order.id}`,
      customId,
    });

    const newPayout: Payout = {
      payoutId,
      orderId: order.id,
      creatorId,
      settlementId: order.id,
      recipientEmail,
      amountCents,
      currency: settlement.currency || 'USD',
      status: createResult.status,
      provider: this.adapter.providerName,
      providerPayoutId: createResult.providerPayoutId,
      customId,
      providerFeeCents: createResult.providerFeeCents,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (createResult.status === 'completed') {
      newPayout.completedAt = new Date().toISOString();
    }

    db.savePayout(newPayout);

    db.logAuditEvent(createResult.success ? 'PAYOUT_SUCCEEDED' : 'PAYOUT_FAILED', 'payout_service', {
      payoutId,
      orderId: order.id,
      provider: this.adapter.providerName,
      providerPayoutId: createResult.providerPayoutId,
      customId,
      status: createResult.status,
      feeCents: createResult.providerFeeCents,
      error: createResult.error,
    });

    return newPayout;
  }

  /**
   * Process incoming Webhook with HMAC Verification & Idempotency
   */
  public async processWebhook(rawBody: Buffer | string, signature: string) {
    const verifiedEvent = await this.adapter.verifyWebhook(rawBody, signature);
    if (!verifiedEvent.valid) {
      return { success: false, httpStatus: 401, error: verifiedEvent.error || 'Invalid signature' };
    }

    const eventId = verifiedEvent.eventId || `evt_${Date.now()}`;
    const providerName = this.adapter.providerName;
    
    // Persistent Webhook Idempotency Check (Survives process restart)
    if (db.isWebhookProcessed(providerName, eventId)) {
      return {
        success: true,
        httpStatus: 200,
        message: 'Duplicate webhook event ignored (Persistent Idempotency).',
        eventId,
      };
    }

    const customId = verifiedEvent.customId;
    if (!customId) {
      return { success: false, httpStatus: 400, error: 'Webhook payload missing customId' };
    }

    // Resolve internal payout using customId
    const payout = db.getPayout(customId) || Object.values(db.getAllPayouts()).find(p => p.customId === customId || p.payoutId === customId);
    if (!payout) {
      return { success: false, httpStatus: 404, error: `Payout not found for customId: ${customId}` };
    }

    // Invariant H: Immutable completed payouts
    if (payout.status === 'completed' && verifiedEvent.status !== 'completed') {
      return {
        success: true,
        httpStatus: 200,
        message: 'Payout is already completed. Immutable completed status preserved.',
      };
    }

    // Validate legal state transition
    const targetStatus = verifiedEvent.status || 'pending';
    if (!this.isValidTransition(payout.status, targetStatus)) {
      return {
        success: false,
        httpStatus: 400,
        error: `Illegal state transition from ${payout.status} to ${targetStatus}`,
      };
    }

    const previousStatus = payout.status;
    payout.status = targetStatus;
    payout.updatedAt = new Date().toISOString();
    if (targetStatus === 'completed') {
      payout.completedAt = new Date().toISOString();
    }

    db.savePayout(payout);
    db.recordProcessedWebhook(providerName, eventId);

    db.logAuditEvent('PAYOUT_SUCCEEDED', 'talentir_webhook', {
      payoutId: payout.payoutId,
      customId,
      previousStatus,
      newStatus: targetStatus,
      eventId,
    });

    return {
      success: true,
      httpStatus: 200,
      payoutId: payout.payoutId,
      customId,
      previousStatus,
      newStatus: targetStatus,
    };
  }

  /**
   * Get Financial Breakdown for Creator with Tenant Isolation (Invariant G)
   */
  public getCreatorFinancials(creatorId: string) {
    const provider = db.getProvider();
    if (provider.id !== creatorId) {
      throw new Error('TENANT_ISOLATION_VIOLATION: Cannot access financial records for another creator');
    }

    const allOrders = db.getAllOrders().filter(o => o.providerId === creatorId && o.status === 'settled');
    const allSettlements = db.getAllSettlements().filter(s => {
      const order = db.getOrder(s.orderId);
      return order && order.providerId === creatorId;
    });
    const allPayouts = db.getAllPayouts().filter(p => {
      if (p.creatorId) return p.creatorId === creatorId;
      const order = db.getOrder(p.orderId);
      return order && order.providerId === creatorId;
    });

    const totalGrossCents = allSettlements.reduce((sum, s) => sum + s.grossCents, 0);
    const totalProviderCents = allSettlements.reduce((sum, s) => sum + s.providerCents, 0);
    const totalAgentCents = allSettlements.reduce((sum, s) => sum + s.agentCents, 0);
    const totalPayoutFeeCents = allPayouts.reduce((sum, p) => sum + (p.providerFeeCents || 0), 0);
    const netDeliveredCents = totalProviderCents - totalPayoutFeeCents;

    return {
      creatorId,
      totalOrders: allOrders.length,
      grossEarningsCents: totalGrossCents,
      platformFeeCents: totalAgentCents,
      settlementCents: totalProviderCents,
      payoutFeeCents: totalPayoutFeeCents,
      netDeliveredCents,
      currency: 'USD',
      payouts: allPayouts,
    };
  }
}

export const payoutService = new PayoutService();
