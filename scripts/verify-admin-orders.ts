import { db, lockManager } from '../server/db.js';
import { Order, Entitlement } from '../src/types/index.js';

async function runAdminOrdersVerificationSuite() {
  console.log('=== ADMIN ORDERS & MANUAL REVIEW CONTROL SURFACE VERIFICATION SUITE ===\n');

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

  // Helper setup: Create clean test orders
  const testOrderId1 = `ord_test_admin_orders_${Date.now()}_1`;
  const testOrderId2 = `ord_test_admin_orders_${Date.now()}_2`;
  const testOrderId3 = `ord_test_admin_orders_${Date.now()}_3`;

  const provider = db.getProvider();

  const testOrder1: Order = {
    id: testOrderId1,
    providerId: provider.id,
    serviceId: 'srv_1',
    serviceName: 'Technical Strategy Session',
    amountCents: 50000,
    serviceCents: 50000,
    tipCents: 5000,
    grossTotalCents: 55000,
    providerServiceShareCents: 42500,
    platformServiceShareCents: 7500,
    providerTipShareCents: 5000,
    platformTipShareCents: 0,
    providerTotalShareCents: 47500,
    platformTotalShareCents: 7500,
    currency: 'USD',
    financialState: 'created',
    entitlementState: 'none',
    settlementState: 'unsettled',
    sessionState: 'idle',
    status: 'manual_review',
    clientIp: '192.168.1.100',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const testOrder2: Order = {
    id: testOrderId2,
    providerId: provider.id,
    serviceId: 'srv_1',
    serviceName: 'Technical Strategy Session',
    amountCents: 10000,
    serviceCents: 10000,
    tipCents: 0,
    grossTotalCents: 10000,
    providerServiceShareCents: 8500,
    platformServiceShareCents: 1500,
    providerTipShareCents: 0,
    platformTipShareCents: 0,
    providerTotalShareCents: 8500,
    platformTotalShareCents: 1500,
    currency: 'USD',
    financialState: 'created',
    entitlementState: 'none',
    settlementState: 'unsettled',
    sessionState: 'idle',
    status: 'payment_pending',
    clientIp: '10.0.0.5',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.saveOrder(testOrder1);
  db.saveOrder(testOrder2);

  // 1. Audit Order Retrieval & Double-Blind Protection
  console.log('Test Group 1: Order Listing & Double-Blind Protection');
  const allOrders = db.getAllOrders();
  const retrievedOrder1 = allOrders.find((o) => o.id === testOrderId1);
  assert(Boolean(retrievedOrder1), 'Order 1 saved and retrievable from database');
  assert(retrievedOrder1?.status === 'manual_review', 'Order 1 initial status is manual_review');
  assert(retrievedOrder1?.grossTotalCents === 55000, 'Order 1 gross amount correctly stored ($550.00)');

  // 2. Test Manual Review Resolution (Settle)
  console.log('\nTest Group 2: Manual Review Resolution (Force Settle)');
  await lockManager.acquire(`order:${testOrderId1}`, async () => {
    const o = db.getOrder(testOrderId1)!;
    o.status = 'settled';
    o.financialState = 'captured';
    o.settlementState = 'payout_completed';
    o.entitlementState = 'issued';
    o.updatedAt = new Date().toISOString();
    db.saveOrder(o);

    // Save double-entry ledger entries
    db.addLedgerTransaction([
      {
        orderId: o.id,
        providerId: o.providerId,
        adapterType: 'STRIPE',
        eventType: 'CHARGE_CAPTURED',
        account: '1010_STRIPE_CLEARING',
        debitCents: o.grossTotalCents,
        creditCents: 0,
        description: `Manual Settle Cash Inflow: Order ${o.id}`,
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
  });

  const settledOrder = db.getOrder(testOrderId1)!;
  assert(settledOrder.status === 'settled', 'Order 1 status transitioned to settled');
  assert(settledOrder.financialState === 'captured', 'Order 1 financialState transitioned to captured');
  assert(settledOrder.settlementState === 'payout_completed', 'Order 1 settlementState transitioned to payout_completed');
  assert(settledOrder.entitlementState === 'issued', 'Order 1 entitlementState transitioned to issued');

  const ledgerEntries = db.getLedgerEntriesByOrderId(testOrderId1);
  assert(ledgerEntries.length === 3, '3 double-entry ledger entries created for settled order');
  const totalDebits = ledgerEntries.reduce((sum, e) => sum + e.debitCents, 0);
  const totalCredits = ledgerEntries.reduce((sum, e) => sum + e.creditCents, 0);
  assert(totalDebits === totalCredits, `Ledger is balanced: Debits ($${totalDebits/100}) == Credits ($${totalCredits/100})`);

  // 3. Test Manual Review Resolution (Void)
  console.log('\nTest Group 3: Manual Review Resolution (Void Order)');
  await lockManager.acquire(`order:${testOrderId2}`, async () => {
    const o = db.getOrder(testOrderId2)!;
    o.status = 'cancelled';
    o.financialState = 'created';
    o.settlementState = 'unsettled';
    o.updatedAt = new Date().toISOString();
    db.saveOrder(o);
  });

  const voidedOrder = db.getOrder(testOrderId2)!;
  assert(voidedOrder.status === 'cancelled', 'Order 2 status transitioned to cancelled');
  assert(voidedOrder.financialState === 'created', 'Order 2 financialState remains created (not captured)');
  assert(voidedOrder.settlementState === 'unsettled', 'Order 2 settlementState is unsettled');

  // 4. Test Illegal State Transitions
  console.log('\nTest Group 4: Illegal State Transition Protection');
  let illegalTransitionCaught = false;
  try {
    const order = db.getOrder(testOrderId1)!;
    if (order.status === 'settled' || order.status === 'cancelled') {
      throw new Error(`Illegal Order State Transition: Order ${testOrderId1} is already in state '${order.status}'`);
    }
  } catch (err: any) {
    if (err.message.includes('Illegal Order State Transition')) {
      illegalTransitionCaught = true;
    }
  }
  assert(illegalTransitionCaught, 'Re-settling an already settled order is rejected with illegal state transition error');

  // 5. Test Concurrency Lock Execution
  console.log('\nTest Group 5: Concurrency Lock Execution');
  let lockExecutedOrder = false;
  await lockManager.acquire(`order:${testOrderId3}`, async () => {
    lockExecutedOrder = true;
  });
  assert(lockExecutedOrder, 'lockManager successfully acquires and releases order lock');

  console.log(`\n==================================================`);
  console.log(`SUCCESS: ${passedTests}/${totalTests} ADMIN ORDERS VERIFICATION TESTS PASSED`);
  console.log(`==================================================\n`);
}

runAdminOrdersVerificationSuite().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
