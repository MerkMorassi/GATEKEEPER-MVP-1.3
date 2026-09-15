import crypto from 'crypto';
import { PayoutStatus } from '../../../src/types/index.js';
import {
  PayoutProviderAdapter,
  CreatePayoutParams,
  CreatePayoutResult,
  PayoutStatusResult,
  CancelPayoutResult,
  VerifiedPayoutWebhook,
  WebhookProcessingResult,
} from './payoutProvider.js';

export class TalentirPayoutProvider implements PayoutProviderAdapter {
  readonly providerName = 'talentir';
  private apiBaseUrl: string;
  private apiKey: string;
  private webhookSecret: string;
  private environment: string;
  private feePercentage: number;

  constructor() {
    this.apiBaseUrl = (process.env.TALENTIR_API_BASE_URL || 'https://sandbox-api.talentir.com/v1').replace(/\/$/, '');
    this.apiKey = process.env.TALENTIR_API_KEY || '';
    this.webhookSecret = process.env.TALENTIR_WEBHOOK_SECRET || 'sandbox_talentir_wh_secret';
    this.environment = process.env.TALENTIR_ENVIRONMENT || 'sandbox';
    this.feePercentage = parseFloat(process.env.TALENTIR_FEE_PERCENTAGE || '3.0');
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Helper to map Talentir status string to GateKeeper PayoutStatus enum
   */
  private mapTalentirStatus(talentirStatus?: string): PayoutStatus {
    if (!talentirStatus) return 'pending';
    const statusLower = talentirStatus.toLowerCase();
    switch (statusLower) {
      case 'created':
      case 'draft':
        return 'created';
      case 'approved':
      case 'pending_approval':
        return 'approved';
      case 'requested':
      case 'processing':
      case 'submitted':
        return 'requested';
      case 'completed':
      case 'success':
      case 'paid':
        return 'completed';
      case 'cancelled':
      case 'canceled':
        return 'cancelled';
      case 'deleted':
        return 'deleted';
      case 'expired':
        return 'expired';
      case 'failed':
      case 'error':
      case 'rejected':
        return 'failed';
      default:
        return 'pending';
    }
  }

  /**
   * Create payout instruction with Talentir
   */
  public async createPayout(params: CreatePayoutParams): Promise<CreatePayoutResult> {
    if (process.env.NODE_ENV === 'production' && !this.isConfigured()) {
      throw new Error(
        'FATAL_PRODUCTION_CONFIG_ERROR: Production mode requires valid TALENTIR_API_KEY. Mock sandbox execution is strictly disabled in production.'
      );
    }

    const providerFeeCents = Math.round((params.amountCents * this.feePercentage) / 100);

    if (this.isConfigured()) {
      try {
        const payload = {
          recipientEmail: params.recipientEmail,
          amount: (params.amountCents / 100).toFixed(2),
          currency: params.currency || 'USD',
          description: params.description || `GateKeeper Settlement for Order ${params.orderId}`,
          customId: params.customId, // Talentir Idempotency Key
          creatorId: params.creatorId,
          settlementId: params.settlementId,
        };

        const response = await fetch(`${this.apiBaseUrl}/payouts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': params.customId,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Talentir API error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        const providerPayoutId = data.id || data.payoutId || `tal_pout_${params.customId}`;
        const mappedStatus = this.mapTalentirStatus(data.status);

        return {
          success: true,
          providerPayoutId,
          customId: params.customId,
          status: mappedStatus,
          providerFeeCents,
          rawResponse: data,
        };
      } catch (err: any) {
        console.error('[Talentir Adapter] Payout creation error:', err.message);
        return {
          success: false,
          providerPayoutId: `err_${params.customId}`,
          customId: params.customId,
          status: 'failed',
          providerFeeCents,
          error: err.message,
        };
      }
    }

    // Sandbox Demonstration Mode when live API key is not present in development
    console.log(`[Talentir Adapter Sandbox] Created payout for ${params.recipientEmail} (${params.amountCents} cents). CustomId/Idempotency: ${params.customId}`);
    return {
      success: true,
      providerPayoutId: `tal_sb_${Math.random().toString(36).substring(2, 9)}`,
      customId: params.customId,
      status: 'created',
      providerFeeCents,
      rawResponse: { mode: 'talentir_sandbox_demonstration', feePercentage: this.feePercentage },
    };
  }

  /**
   * Get Payout Status from Talentir
   */
  public async getPayoutStatus(providerPayoutId: string): Promise<PayoutStatusResult> {
    if (process.env.NODE_ENV === 'production' && !this.isConfigured()) {
      throw new Error('FATAL_PRODUCTION_CONFIG_ERROR: Production mode requires valid TALENTIR_API_KEY.');
    }

    if (this.isConfigured()) {
      try {
        const response = await fetch(`${this.apiBaseUrl}/payouts/${providerPayoutId}`, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Talentir API status fetch failed: ${await response.text()}`);
        }

        const data = await response.json();
        return {
          success: true,
          providerPayoutId: data.id || providerPayoutId,
          customId: data.customId || '',
          status: this.mapTalentirStatus(data.status),
          completedAt: data.completedAt || data.updatedAt,
        };
      } catch (err: any) {
        return {
          success: false,
          providerPayoutId,
          customId: '',
          status: 'failed',
          error: err.message,
        };
      }
    }

    // Sandbox mode
    return {
      success: true,
      providerPayoutId,
      customId: `GK-ORDER-SANDBOX`,
      status: 'created',
    };
  }

  /**
   * Cancel Payout with Talentir
   */
  public async cancelPayout(providerPayoutId: string): Promise<CancelPayoutResult> {
    if (process.env.NODE_ENV === 'production' && !this.isConfigured()) {
      throw new Error('FATAL_PRODUCTION_CONFIG_ERROR: Production mode requires valid TALENTIR_API_KEY.');
    }

    if (this.isConfigured()) {
      try {
        const response = await fetch(`${this.apiBaseUrl}/payouts/${providerPayoutId}/cancel`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Talentir API cancel failed: ${await response.text()}`);
        }

        const data = await response.json();
        return {
          success: true,
          providerPayoutId,
          status: this.mapTalentirStatus(data.status || 'cancelled'),
        };
      } catch (err: any) {
        return {
          success: false,
          providerPayoutId,
          status: 'failed',
          error: err.message,
        };
      }
    }

    return {
      success: true,
      providerPayoutId,
      status: 'cancelled',
    };
  }

  /**
   * Verify HMAC SHA-256 Webhook Signature from Talentir
   */
  public async verifyWebhook(rawBody: Buffer | string, signature: string): Promise<VerifiedPayoutWebhook> {
    if (!signature) {
      return { valid: false, error: 'Missing webhook signature header' };
    }

    try {
      const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8');
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(bodyStr)
        .digest('hex');

      // Compare provided signature (support hex or t=,v1= format)
      let providedHex = signature.trim();
      if (providedHex.includes('v1=')) {
        const match = providedHex.match(/v1=([a-f0-9]+)/i);
        if (match) providedHex = match[1];
      }

      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(providedHex, 'hex')
      );

      if (!isValid) {
        return { valid: false, error: 'Invalid HMAC signature' };
      }

      const payload = JSON.parse(bodyStr);
      const payoutObj = payload.data || payload.payout || payload;

      return {
        valid: true,
        eventId: payload.id || payload.eventId || `evt_${Date.now()}`,
        eventType: payload.event || payload.type || payload.eventType || 'payout.updated',
        providerPayoutId: payoutObj.id || payoutObj.providerPayoutId || payoutObj.payoutId,
        customId: payoutObj.customId || payoutObj.clientReference,
        status: this.mapTalentirStatus(payoutObj.status || payload.status),
        amountCents: payoutObj.amountCents || (payoutObj.amount ? Math.round(parseFloat(payoutObj.amount) * 100) : undefined),
        currency: payoutObj.currency || 'USD',
        rawPayload: payload,
      };
    } catch (err: any) {
      return { valid: false, error: `Webhook parsing error: ${err.message}` };
    }
  }

  /**
   * Handle parsed webhook event
   */
  public async handleWebhook(event: VerifiedPayoutWebhook): Promise<WebhookProcessingResult> {
    if (!event.valid) {
      return { success: false, error: event.error || 'Invalid webhook event' };
    }

    return {
      success: true,
      payoutId: event.providerPayoutId,
      customId: event.customId,
      newStatus: event.status,
    };
  }
}

export const talentirProvider = new TalentirPayoutProvider();
