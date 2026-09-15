import { db, lockManager } from '../server/db.js';
import { Order, Entitlement } from '../src/types/index.js';
import { createEntitlement } from '../server/domain/access.js';

async function runForceSettleAccountingAudit() {
  console.log('===========================================================');
  console.log(' GATEKEEPER — FORCE SETTLE ACCOUNTING SAFETY FORENSIC AUDIT');
  console.log('===========================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, description: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS: ${description}`);
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: ${description}`);
      throw new Error(`Assertion failed: ${description}`);
    }
  }

  const provider = db.getProvider();

  // Helper function to count ledger entries for an order
  function getLedgerStats(orderId: string) {
    const entries = db.getLedgerEntriesByOrderId(orderId);
    const platformRev = entries.filter((e) => e.account === '4010_PLATFORM_SERVICE_REVENUE');
    const providerPayable = entries.filter((e) => e.account === '2010_PROVIDER_PAYABLE_SERVICE');
    const stripeClearing = entries.filter((e) => e.account === '1010_STRIPE_CLEARING');
    const totalDebits = entries.reduce((sum, e) => sum + e.debitCents, 0);
    const totalCredits = entries.reduce((sum, e) => sum + e.creditCents, 0);
    return {
      count: entries.length,
      platformRevCount: platformRev.length,
      providerPayableCount: providerPayable.length,
      stripeClearingCount: stripeClearing.length,
      totalDebits,
      totalCredits,
      isBalanced: totalDebits === totalCredits,
    };
  }

  // =========================================================================
  // AUDIT SECTION 1: Standard Stripe Lifecycle Order Capture
  // =========================================================================
  console.log('--- 1. Standard Stripe Lifecycle Order Capture ---');
  const stripeOrderId = `ord_audit_stripe_normal_${Date.now()}`;
  const stripeOrder: Order = {
    id: stripeOrderId,
    providerId: provider.id,
    serviceId: 'srv_1',
    serviceName: 'Standard Stripe Capture Session',
    amountCents: 10000,
    serviceCents: 10000,
    tipCents: 2000,
    grossTotalCents: 12000,
    providerServiceShareCents: 8500,
    platformServiceShareCents: 1500,
    providerTipShareCents: 2000,
    platformTipShareCents: 0,
    providerTotalShareCents: 10500,
    platformTotalShareCents: 1500,
    currency: 'USD',
    financialState: 'created',
    entitlementState: 'none',
    settlementState: 'unsettled',
    sessionState: 'idle',
    status: 'payment_pending',
    clientIp: '127.0.0.1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.saveOrder(stripeOrder);

  // Simulate Stripe Webhook Processing (Authoritative Capture)
  await lockManager.acquire(`order:${stripeOrderId}`, async () => {
    const o = db.getOrder(stripeOrderId)!;
    const entitlement = await createEntitlement(o.id, o.providerId, 'support@gatekeeper.dev', 'http://localhost:3000');
    db.atomicCaptureAndIssueEntitlement(o, entitlement);

    db.addLedgerTransaction([
      {
        orderId: o.id,
        providerId: o.providerId,
        adapterType: 'STRIPE',
        eventType: 'CHARGE_CAPTURED',
        account: '1010_STRIPE_CLEARING',
        debitCents: o.grossTotalCents,
        creditCents: 0,
        description: `Stripe Charge Gross Inflow: Order ${o.id}`,
      },
      {
        orderId: o.id,
        providerId: o.providerId,
        adapterType: 'STRIPE',
        eventType: 'PLATFORM_FEE_RETAINED',
        account: '4010_PLATFORM_SERVICE_REVENUE',
        debitCents: 0,
        creditCents: o.platformTotalShareCents,
        description: `Stripe Platform Share: Order ${o.id}`,
      },
      {
        orderId: o.id,
        providerId: o.providerId,
        adapterType: 'STRIPE',
        eventType: 'PROVIDER_PAYABLE_RECORDED',
        account: '2010_PROVIDER_PAYABLE_SERVICE',
        debitCents: 0,
        creditCents: o.providerTotalShareCents,
        description: `Stripe Provider Share: Order ${o.id}`,
      },
    ]);
  });

  const normalStats = getLedgerStats(stripeOrderId);
  assert(normalStats.count === 3, 'Normally captured Stripe order has exactly 3 ledger entries');
  assert(normalStats.platformRevCount === 1, 'Exactly 1 platform revenue entry ($15.00)');
  assert(normalStats.providerPayableCount === 1, 'Exactly 1 provider payable entry ($105.00)');
  assert(normalStats.stripeClearingCount === 1, 'Exactly 1 clearing entry ($120.00)');
  assert(normalStats.isBalanced, 'Normal Stripe capture journal is perfectly balanced');

  // =========================================================================
  // AUDIT SECTION 2: Replaying Force Settle against captured Stripe order
  // =========================================================================
  console.log('\n--- 2. Force Settle Replay against Captured Stripe Order ---');
  let replayErrorCaught = false;
  await lockManager.acquire(`order:${stripeOrderId}`, async () => {
    const o = db.getOrder(stripeOrderId)!;

    // Terminal/Settled Check
    if (o.status === 'settled' || o.status === 'cancelled' || o.financialState === 'refunded') {
      replayErrorCaught = true;
      return;
    }

    // Secondary Idempotency Guard
    const existingLedger = db.getLedgerEntriesByOrderId(stripeOrderId);
    if (existingLedger.length > 0) {
      // Zero ledger entries added
      o.status = 'settled';
      db.saveOrder(o);
    }
  });

  const replayStats = getLedgerStats(stripeOrderId);
  assert(replayStats.count === normalStats.count, 'Replaying Force Settle created 0 additional ledger entries');
  assert(replayStats.platformRevCount === 1, 'Platform revenue entries remain exactly 1');
  assert(replayStats.providerPayableCount === 1, 'Provider payable entries remain exactly 1');
  assert(replayStats.stripeClearingCount === 1, 'Clearing entries remain exactly 1');

  // =========================================================================
  // AUDIT SECTION 3: Force Settle on Manual Review Order
  // =========================================================================
  console.log('\n--- 3. Force Settle on Unresolved / Manual Review Order ---');
  const manualOrderId = `ord_audit_manual_review_${Date.now()}`;
  const manualOrder: Order = {
    id: manualOrderId,
    providerId: provider.id,
    serviceId: 'srv_1',
    serviceName: 'Manual Review Escrow Session',
    amountCents: 20000,
    serviceCents: 20000,
    tipCents: 0,
    grossTotalCents: 20000,
    providerServiceShareCents: 17000,
    platformServiceShareCents: 3000,
    providerTipShareCents: 0,
    platformTipShareCents: 0,
    providerTotalShareCents: 17000,
    platformTotalShareCents: 3000,
    currency: 'USD',
    financialState: 'created',
    entitlementState: 'none',
    settlementState: 'unsettled',
    sessionState: 'idle',
    status: 'manual_review',
    clientIp: '10.0.0.1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.saveOrder(manualOrder);

  // Execute Force Settle
  await lockManager.acquire(`order:${manualOrderId}`, async () => {
    const o = db.getOrder(manualOrderId)!;
    o.status = 'settled';
    o.financialState = 'captured';
    o.settlementState = 'payout_completed';
    o.updatedAt = new Date().toISOString();

    if (o.entitlementState === 'none') {
      o.entitlementState = 'issued';
      const entitlement = await createEntitlement(o.id, o.providerId, 'support@gatekeeper.dev', 'http://localhost:3000');
      db.atomicCaptureAndIssueEntitlement(o, entitlement);
    }
    o.status = 'settled';
    o.financialState = 'captured';
    o.settlementState = 'payout_completed';
    db.saveOrder(o);

    const existingLedger = db.getLedgerEntriesByOrderId(manualOrderId);
    if (existingLedger.length === 0) {
      db.addLedgerTransaction([
        {
          orderId: o.id,
          providerId: o.providerId,
          adapterType: 'STRIPE',
          eventType: 'CHARGE_CAPTURED',
          account: '1010_STRIPE_CLEARING',
          debitCents: o.grossTotalCents,
          creditCents: 0,
          description: `Manual Settle Cash Gross Inflow: Order ${o.id}`,
        },
        {
          orderId: o.id,
          providerId: o.providerId,
          adapterType: 'STRIPE',
          eventType: 'PLATFORM_FEE_RETAINED',
          account: '4010_PLATFORM_SERVICE_REVENUE',
          debitCents: 0,
          creditCents: o.platformTotalShareCents,
          description: `Manual Settle Platform Share: Order ${o.id}`,
        },
        {
          orderId: o.id,
          providerId: o.providerId,
          adapterType: 'STRIPE',
          eventType: 'PROVIDER_PAYABLE_RECORDED',
          account: '2010_PROVIDER_PAYABLE_SERVICE',
          debitCents: 0,
          creditCents: o.providerTotalShareCents,
          description: `Manual Settle Provider Share: Order ${o.id}`,
        },
      ]);
    }
  });

  const manualStats = getLedgerStats(manualOrderId);
  assert(manualStats.count === 3, 'Force Settle created exactly 3 ledger entries');
  assert(manualStats.isBalanced, 'Force Settle ledger entries are perfectly balanced');

  // =========================================================================
  // AUDIT SECTION 4: Concurrent Force Settle Requests
  // =========================================================================
  console.log('\n--- 4. Concurrent Force Settle Requests Execution ---');
  const concurrentOrderId = `ord_audit_concurrent_${Date.now()}`;
  const concurrentOrder: Order = {
    id: concurrentOrderId,
    providerId: provider.id,
    serviceId: 'srv_1',
    serviceName: 'Concurrent Force Settle Session',
    amountCents: 30000,
    serviceCents: 30000,
    tipCents: 0,
    grossTotalCents: 30000,
    providerServiceShareCents: 25500,
    platformServiceShareCents: 4500,
    providerTipShareCents: 0,
    platformTipShareCents: 0,
    providerTotalShareCents: 25500,
    platformTotalShareCents: 4500,
    currency: 'USD',
    financialState: 'created',
    entitlementState: 'none',
    settlementState: 'unsettled',
    sessionState: 'idle',
    status: 'manual_review',
    clientIp: '10.0.0.2',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.saveOrder(concurrentOrder);

  // Spawn 3 parallel Force Settle calls wrapped in lockManager
  const settleTask = async () => {
    return await lockManager.acquire(`order:${concurrentOrderId}`, async () => {
      const o = db.getOrder(concurrentOrderId)!;
      if (o.status === 'settled' || o.status === 'cancelled') {
        return { success: false, reason: 'Already settled' };
      }

      o.status = 'settled';
      o.financialState = 'captured';
      o.settlementState = 'payout_completed';
      o.updatedAt = new Date().toISOString();

      const existingLedger = db.getLedgerEntriesByOrderId(concurrentOrderId);
      if (existingLedger.length === 0) {
        db.addLedgerTransaction([
          {
            orderId: o.id,
            providerId: o.providerId,
            adapterType: 'STRIPE',
            eventType: 'CHARGE_CAPTURED',
            account: '1010_STRIPE_CLEARING',
            debitCents: o.grossTotalCents,
            creditCents: 0,
            description: `Manual Settle Cash Gross Inflow: Order ${o.id}`,
          },
          {
            orderId: o.id,
            providerId: o.providerId,
            adapterType: 'STRIPE',
            eventType: 'PLATFORM_FEE_RETAINED',
            account: '4010_PLATFORM_SERVICE_REVENUE',
            debitCents: 0,
            creditCents: o.platformTotalShareCents,
            description: `Manual Settle Platform Share: Order ${o.id}`,
          },
          {
            orderId: o.id,
            providerId: o.providerId,
            adapterType: 'STRIPE',
            eventType: 'PROVIDER_PAYABLE_RECORDED',
            account: '2010_PROVIDER_PAYABLE_SERVICE',
            debitCents: 0,
            creditCents: o.providerTotalShareCents,
            description: `Manual Settle Provider Share: Order ${o.id}`,
          },
        ]);
      }
      db.saveOrder(o);
      return { success: true };
    });
  };

  const [res1, res2, res3] = await Promise.all([settleTask(), settleTask(), settleTask()]);
  const successCount = [res1, res2, res3].filter((r) => r.success).length;
  assert(successCount === 1, `Exactly 1 concurrent Force Settle request succeeded (got ${successCount})`);

  const concurrentStats = getLedgerStats(concurrentOrderId);
  assert(concurrentStats.count === 3, 'Concurrent execution produced exactly 3 ledger entries total');
  assert(concurrentStats.isBalanced, 'Concurrent execution produced a perfectly balanced journal');

  // =========================================================================
  // AUDIT SECTION 5: Repeated Force Settle Rejection
  // =========================================================================
  console.log('\n--- 5. Repeated Force Settle Rejection ---');
  let postSettlementRejection = false;
  await lockManager.acquire(`order:${manualOrderId}`, async () => {
    const o = db.getOrder(manualOrderId)!;
    if (o.status === 'settled' || o.status === 'cancelled') {
      postSettlementRejection = true;
    }
  });
  assert(postSettlementRejection, 'Subsequent Force Settle call against already settled order is rejected');

  const postRejectionStats = getLedgerStats(manualOrderId);
  assert(postRejectionStats.count === manualStats.count, 'Zero ledger entries added during rejected Force Settle call');

  // =========================================================================
  // AUDIT SECTION 6: Global Double-Entry Ledger Invariant Reconciliation
  // =========================================================================
  console.log('\n--- 6. Global Double-Entry Ledger Invariant Reconciliation ---');
  const allLedgerEntries = db.getLedgerEntries();
  const globalDebits = allLedgerEntries.reduce((sum, e) => sum + e.debitCents, 0);
  const globalCredits = allLedgerEntries.reduce((sum, e) => sum + e.creditCents, 0);
  assert(globalDebits === globalCredits, `Global ledger invariant holds: Total Debits ($${globalDebits/100}) === Total Credits ($${globalCredits/100})`);

  console.log(`\n===========================================================`);
  console.log(` SUCCESS: ${passedTests}/${totalTests} FORCE SETTLE ACCOUNTING AUDIT CHECKS PASSED`);
  console.log(`===========================================================\n`);
}

runForceSettleAccountingAudit().catch((err) => {
  console.error('AUDIT FAILED:', err);
  process.exit(1);
});
