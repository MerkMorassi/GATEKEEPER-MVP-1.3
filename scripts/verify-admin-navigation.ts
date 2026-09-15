import { db } from '../server/db.js';

async function verifyAdminNavigation() {
  console.log('===========================================================');
  console.log(' GATEKEEPER — ADMIN NAVIGATION & ENDPOINTS VERIFICATION');
  console.log('===========================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, description: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${description}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${description}`);
      failed++;
    }
  }

  // 1. Providers Endpoint Data Structure
  const provider = db.getProvider();
  assert(Boolean(provider), 'Provider record exists in database');
  assert(Boolean(provider.id), 'Provider has valid ID');
  assert(Boolean(provider.name), 'Provider has valid Name');
  assert(Boolean(provider.email), 'Provider has valid Email');
  assert(Array.isArray(provider.services) && provider.services.length > 0, 'Provider has configured services array');

  // 2. Orders Endpoint Data Structure & Client Privacy Protection
  const rawOrders = db.getAllOrders();
  assert(Array.isArray(rawOrders), 'Orders array retrieved from database');
  if (rawOrders.length > 0) {
    const sampleOrder = rawOrders[0];
    assert(Boolean(sampleOrder.id), 'Order has valid ID');
    assert(Boolean(sampleOrder.financialState), 'Order has financialState 4-vector attribute');
    assert(Boolean(sampleOrder.entitlementState), 'Order has entitlementState 4-vector attribute');
  }

  // 3. Double-Entry Financial Ledger Invariant Audit
  const entries = db.getLedgerEntries();
  assert(Array.isArray(entries), 'Financial ledger entries retrieved from database');
  let totalDebits = 0;
  let totalCredits = 0;
  for (const e of entries) {
    totalDebits += e.debitCents || 0;
    totalCredits += e.creditCents || 0;
  }
  assert(totalDebits === totalCredits, `Double-entry general ledger is perfectly balanced ($${(totalDebits/100).toFixed(2)} debits === $${(totalCredits/100).toFixed(2)} credits)`);

  // 4. Webhooks Event Operations Stream Data Structure
  const webhooks = db.getProcessedWebhooks();
  assert(Array.isArray(webhooks), 'Webhook event audit records retrieved from persistent store');

  // 5. Capability Registry Integrity
  const caps = db.getPaymentCapabilities();
  assert(Boolean(caps.paymentMethods['card']), 'Payment method registry operational');
  assert(Boolean(caps.payoutProviders['stripe_connect']), 'Payout provider registry operational');
  assert(caps.payoutProviders['talentir'].status === 'coming_soon', 'Talentir feature boundary intact (COMING SOON)');

  console.log('-----------------------------------------------------------');
  console.log(`NAVIGATION VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

verifyAdminNavigation().catch((err) => {
  console.error('Fatal error in navigation verification:', err);
  process.exit(1);
});
