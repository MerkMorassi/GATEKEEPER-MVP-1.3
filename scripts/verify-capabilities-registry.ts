import { db } from '../server/db.js';

async function runCapabilitiesVerification() {
  console.log('===========================================================');
  console.log(' GATEKEEPER — PAYMENT CAPABILITY CONFIGURATION VERIFICATION');
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

  // Test 1: Retrieve default capabilities from DB
  const initialCaps = db.getPaymentCapabilities();
  assert(Boolean(initialCaps), 'Database returns initial PaymentCapabilitiesConfig');
  assert(Boolean(initialCaps.paymentMethods['card']), 'Payment method "card" exists in registry');
  assert(Boolean(initialCaps.paymentMethods['apple_pay']), 'Payment method "apple_pay" exists in registry');
  assert(Boolean(initialCaps.paymentMethods['google_pay']), 'Payment method "google_pay" exists in registry');
  assert(Boolean(initialCaps.paymentMethods['cash_app']), 'Payment method "cash_app" exists in registry');
  assert(Boolean(initialCaps.paymentMethods['paypal']), 'Payment method "paypal" exists in registry');

  // Test 2: Payout providers registry
  assert(Boolean(initialCaps.payoutProviders['stripe_connect']), 'Payout provider "stripe_connect" exists in registry');
  assert(Boolean(initialCaps.payoutProviders['talentir']), 'Payout provider "talentir" exists in registry');
  assert(initialCaps.payoutProviders['talentir'].status === 'coming_soon', 'Talentir status is explicitly "coming_soon"');
  assert(initialCaps.payoutProviders['talentir'].enabled === false, 'Talentir is explicitly disabled');

  // Test 3: Admin toggle payment method (Cash App Pay)
  const toggledCashApp = db.togglePaymentMethodCapability('cash_app', true);
  assert(toggledCashApp.paymentMethods['cash_app'].enabled === true, 'Cash App Pay successfully enabled via DB toggle');

  const revertedCashApp = db.togglePaymentMethodCapability('cash_app', false);
  assert(revertedCashApp.paymentMethods['cash_app'].enabled === false, 'Cash App Pay successfully reverted to disabled');

  // Test 4: Talentir feature boundary enforcement
  let talentirRejected = false;
  try {
    db.togglePayoutProviderCapability('talentir', true);
  } catch (err: any) {
    if (err.message.includes('TALENTIR_FEATURE_BOUNDARY')) {
      talentirRejected = true;
    }
  }
  assert(talentirRejected, 'Attempting to enable Talentir payout provider is rejected with TALENTIR_FEATURE_BOUNDARY exception');

  // Test 5: Standard payout provider toggle (PayPal Payouts)
  const toggledPaypal = db.togglePayoutProviderCapability('paypal_payouts', true);
  assert(toggledPaypal.payoutProviders['paypal_payouts'].enabled === true, 'PayPal Payouts provider enabled');
  db.togglePayoutProviderCapability('paypal_payouts', false);

  console.log('-----------------------------------------------------------');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runCapabilitiesVerification().catch((err) => {
  console.error('Fatal error in capabilities verification:', err);
  process.exit(1);
});
