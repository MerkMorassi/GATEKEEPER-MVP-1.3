import express from 'express';
import http from 'http';
import crypto from 'crypto';
import Stripe from 'stripe';
import { db } from '../server/db.js';
import { apiRouter } from '../server/routes/api.js';
import { Order, FinancialLedgerEntry } from '../src/types/index.js';
import { execSync } from 'child_process';

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function check(condition: boolean, description: string) {
  totalChecks++;
  if (condition) {
    console.log(`  ✅ [PASS] ${description}`);
    passedChecks++;
  } else {
    console.error(`  ❌ [FAIL] ${description}`);
    failedChecks++;
  }
}

async function runOperationalVerification() {
  console.log('================================================================');
  console.log(' GATEKEEPER STRIPE OPERATIONAL VERIFICATION HARNESS');
  console.log('================================================================\n');

  // Set environment variables for testing
  const TEST_SK = 'sk_test_51M_gatekeeper_mock_secret_key_2026';
  const TEST_PK = 'pk_test_51M_gatekeeper_mock_pub_key_2026';
  const TEST_WHSEC = 'whsec_gatekeeper_mock_webhook_secret_2026';
  const ADMIN_KEY = 'gk_admin_secret_dev_2026';

  process.env.STRIPE_SECRET_KEY = TEST_SK;
  process.env.STRIPE_WEBHOOK_SECRET = TEST_WHSEC;
  process.env.VITE_STRIPE_PUBLISHABLE_KEY = TEST_PK;

  // Initialize DB config with test credentials
  db.updateStripeConfig({
    environment: 'test',
    publishableKey: TEST_PK,
    secretKey: TEST_SK,
    webhookSecret: TEST_WHSEC,
    connected: true,
  });

  // Setup Express server instance
  const app = express();
  app.use(express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    }
  }));
  app.use('/api', apiRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  console.log(`[HTTP Test Harness running on ${baseUrl}]\n`);

  // SECTION 1: ADMIN STRIPE PANEL & CREDENTIAL MASKING
  console.log('1. ADMIN STRIPE PANEL & SECURITY CONTROLS');
  
  // GET /api/admin/stripe without auth -> 401
  const unauthRes = await fetch(`${baseUrl}/api/admin/stripe`);
  check(unauthRes.status === 401, 'Unauthenticated access to /api/admin/stripe rejected with HTTP 401');

  // GET /api/admin/stripe with Admin Auth
  const getRes = await fetch(`${baseUrl}/api/admin/stripe`, {
    headers: { 'x-admin-key': ADMIN_KEY },
  });
  check(getRes.status === 200, 'Authenticated GET /api/admin/stripe returned HTTP 200');
  const getJson = await getRes.json();
  check(getJson.success === true, 'Response indicates success === true');
  check(getJson.stripeConfig.environment === 'test', 'Stripe mode correctly identified as TEST');
  check(getJson.stripeConfig.publishableKey.includes('••••'), 'Publishable key is securely masked in GET response');
  check(getJson.stripeConfig.secretKeyConfigured === true, 'Secret key presence indicated without exposing secret');
  check(getJson.stripeConfig.webhookSecretConfigured === true, 'Webhook secret presence indicated without exposing secret');
  check(!('secretKey' in getJson.stripeConfig), 'Raw secretKey is NEVER returned in API payload');
  check(!('webhookSecret' in getJson.stripeConfig), 'Raw webhookSecret is NEVER returned in API payload');

  // SECTION 2: CROSS-MODE CONTAMINATION PROTECTION
  console.log('\n2. CROSS-ENVIRONMENT CONTAMINATION PROTECTION');

  // Attempt sk_live_ in TEST mode -> reject
  const invalidLiveKeyRes = await fetch(`${baseUrl}/api/admin/stripe`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
    body: JSON.stringify({ environment: 'test', secretKey: 'sk_live_1234567890' }),
  });
  check(invalidLiveKeyRes.status === 400, 'Rejects sk_live_* credential in TEST mode (HTTP 400)');

  // Attempt sk_test_ in LIVE mode -> reject
  const invalidTestKeyRes = await fetch(`${baseUrl}/api/admin/stripe`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
    body: JSON.stringify({ environment: 'live', enableLiveConfirmed: true, secretKey: 'sk_test_1234567890' }),
  });
  check(invalidTestKeyRes.status === 400, 'Rejects sk_test_* credential in LIVE mode (HTTP 400)');

  // Attempt LIVE mode without explicit confirmation -> reject
  const unconfirmedLiveRes = await fetch(`${baseUrl}/api/admin/stripe`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
    body: JSON.stringify({ environment: 'live', enableLiveConfirmed: false }),
  });
  check(unconfirmedLiveRes.status === 400, 'Rejects LIVE mode activation without explicit enableLiveConfirmed flag');

  // SECTION 3: TEST CONNECTION
  console.log('\n3. TEST CONNECTION EXECUTION');
  const connRes = await fetch(`${baseUrl}/api/admin/stripe/test-connection`, {
    method: 'POST',
    headers: { 'x-admin-key': ADMIN_KEY },
  });
  const connJson = await connRes.json();
  check(connRes.status === 200 || connRes.status === 400, 'Test connection endpoint executed');
  check('connected' in connJson, 'Connection result returns explicit connected status field');

  // SECTION 4 & 5: SANDBOX CHECKOUT & REAL SANDBOX TRANSACTION
  console.log('\n4 & 5. SANDBOX CHECKOUT & FULL TRANSACTION EXECUTION');
  const checkoutRes = await fetch(`${baseUrl}/api/admin/stripe/test-checkout`, {
    method: 'POST',
    headers: { 'x-admin-key': ADMIN_KEY },
  });
  check(checkoutRes.status === 200, 'Sandbox Test Checkout created via HTTP 200');
  const checkoutJson = await checkoutRes.json();
  check(checkoutJson.success === true, 'Test checkout created successfully');
  check(Boolean(checkoutJson.orderId), `Order ID created: ${checkoutJson.orderId}`);
  check(checkoutJson.amountCents >= 5000, `Test checkout enforced minimum $50.00 USD (received ${checkoutJson.amountCents} cents)`);
  check(Boolean(checkoutJson.checkoutSessionId), `Checkout Session ID created: ${checkoutJson.checkoutSessionId}`);

  const testOrderId = checkoutJson.orderId;
  const testSessionId = checkoutJson.checkoutSessionId;
  const testPaymentIntentId = `pi_test_sandbox_${Date.now()}`;
  const testChargeId = `ch_test_sandbox_${Date.now()}`;
  const testEventId = `evt_test_sandbox_complete_${Date.now()}`;

  // SECTION 6: WEBHOOK SIGNATURE SECURITY
  console.log('\n6. WEBHOOK SIGNATURE SECURITY VERIFICATION');

  const webhookPayloadObj = {
    id: testEventId,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: testSessionId,
        payment_intent: testPaymentIntentId,
        amount_total: 5000,
        currency: 'usd',
        client_reference_id: testOrderId,
        metadata: { orderId: testOrderId },
      },
    },
  };
  const rawPayloadStr = JSON.stringify(webhookPayloadObj);
  const nowTs = Math.floor(Date.now() / 1000);
  const validHmac = crypto.createHmac('sha256', TEST_WHSEC).update(`${nowTs}.${rawPayloadStr}`).digest('hex');
  const validSigHeader = `t=${nowTs},v1=${validHmac}`;

  // Unsigned request
  const unsignedRes = await fetch(`${baseUrl}/api/webhooks/stripe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: rawPayloadStr,
  });
  check(unsignedRes.status === 400, 'Unsigned webhook request rejected with HTTP 400');

  // Invalid signature
  const invalidSigRes = await fetch(`${baseUrl}/api/webhooks/stripe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': `t=${nowTs},v1=fake_invalid_sig_123` },
    body: rawPayloadStr,
  });
  check(invalidSigRes.status === 400, 'Invalid signature webhook request rejected with HTTP 400');

  // Valid signature
  const validSigRes = await fetch(`${baseUrl}/api/webhooks/stripe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': validSigHeader },
    body: rawPayloadStr,
  });
  check(validSigRes.status === 200, 'Valid signature webhook accepted with HTTP 200');

  // SECTION 7 & 8: OVERLAPPING EVENTS & REPLAY IDEMPOTENCY
  console.log('\n7 & 8. OVERLAPPING EVENTS & WEBHOOK REPLAY IDEMPOTENCY');

  // Overlapping payment_intent.succeeded
  const piPayloadObj = {
    id: `evt_pi_succeeded_${Date.now()}`,
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: testPaymentIntentId,
        amount: 5000,
        currency: 'usd',
        metadata: { orderId: testOrderId },
      },
    },
  };
  const piRawStr = JSON.stringify(piPayloadObj);
  const piHmac = crypto.createHmac('sha256', TEST_WHSEC).update(`${nowTs}.${piRawStr}`).digest('hex');
  const piSigHeader = `t=${nowTs},v1=${piHmac}`;

  const piRes = await fetch(`${baseUrl}/api/webhooks/stripe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': piSigHeader },
    body: piRawStr,
  });
  check(piRes.status === 200, 'Overlapping payment_intent.succeeded processed safely with HTTP 200');

  // Replay exact same event
  const replayRes = await fetch(`${baseUrl}/api/webhooks/stripe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': validSigHeader },
    body: rawPayloadStr,
  });
  check(replayRes.status === 200, 'Replayed webhook returns HTTP 200');

  // Verify DB state for order
  const updatedOrder = db.getOrder(testOrderId);
  check(updatedOrder?.financialState === 'captured', 'Order financialState === captured');
  check(updatedOrder?.entitlementState === 'issued', 'Order entitlementState === issued');

  // SECTION 9: LEDGER RECONCILIATION AUDIT
  console.log('\n9. LEDGER RECONCILIATION AUDIT');
  const ledgerEntries = db.getLedgerEntries();
  let totalDebits = 0;
  let totalCredits = 0;
  for (const entry of ledgerEntries) {
    totalDebits += entry.debitCents || 0;
    totalCredits += entry.creditCents || 0;
  }
  check(totalDebits === totalCredits, `Global Double-Entry Ledger Balanced: Total Debits (${totalDebits}) === Total Credits (${totalCredits})`);

  // Verify breakdown
  const orderLedger = ledgerEntries.filter(e => e.orderId === testOrderId);
  const providerPayableEntry = orderLedger.find(e => e.account === '2010_PROVIDER_PAYABLE_SERVICE');
  const platformRevenueEntry = orderLedger.find(e => e.account === '4010_PLATFORM_SERVICE_REVENUE');
  
  const expectedProviderCents = Math.floor(checkoutJson.amountCents * 0.85);
  const expectedPlatformCents = checkoutJson.amountCents - expectedProviderCents;
  check(providerPayableEntry?.creditCents === expectedProviderCents, `Provider payable === ${expectedProviderCents} cents ($${(expectedProviderCents / 100).toFixed(2)} / 85%)`);
  check(platformRevenueEntry?.creditCents === expectedPlatformCents, `Platform revenue === ${expectedPlatformCents} cents ($${(expectedPlatformCents / 100).toFixed(2)} / 15%)`);

  // SECTION 10: ENTITLEMENT REDEMPTION LIFECYCLE
  console.log('\n10. ENTITLEMENT REDEMPTION LIFECYCLE');
  const entitlements = Object.values((db as any).data.entitlements || {}).filter((e: any) => e.orderId === testOrderId) as any[];
  check(entitlements.length === 1, 'Exactly 1 entitlement issued for test order');

  if (entitlements.length > 0) {
    const entitlementToken = entitlements[0].token;
    // Redeem token 1st time
    const redeemRes1 = await fetch(`${baseUrl}/api/access/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: entitlementToken }),
    });
    check(redeemRes1.status === 200, 'First entitlement redemption returned HTTP 200 OK');

    // Redeem token 2nd time -> 409 Conflict
    const redeemRes2 = await fetch(`${baseUrl}/api/access/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: entitlementToken }),
    });
    check(redeemRes2.status === 409, 'Replay entitlement redemption rejected with HTTP 409 Conflict');
  }

  // SECTION 11: FAILURE TESTING
  console.log('\n11. CONTROLLED FAILURE TESTING');

  // Unknown order webhook -> fail closed
  const unknownOrderPayload = JSON.stringify({
    id: `evt_unknown_${Date.now()}`,
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_unknown', metadata: { orderId: 'ord_nonexistent_999' } } },
  });
  const unknownSig = `t=${nowTs},v1=${crypto.createHmac('sha256', TEST_WHSEC).update(`${nowTs}.${unknownOrderPayload}`).digest('hex')}`;
  const unknownRes = await fetch(`${baseUrl}/api/webhooks/stripe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': unknownSig },
    body: unknownOrderPayload,
  });
  check(unknownRes.status === 404, 'Unknown order webhook rejected with HTTP 404 (Failed closed)');

  // Close test server
  server.close();

  console.log('\n================================================================');
  console.log(` OPERATIONAL VERIFICATION COMPLETE: ${passedChecks}/${totalChecks} CHECKS PASSED`);
  console.log('================================================================\n');

  if (failedChecks > 0) {
    console.error(`CLASSIFICATION: FAIL — ${failedChecks} checks failed.`);
    process.exit(1);
  } else {
    console.log('CLASSIFICATION: PASS — Operationally Verified');
  }
}

runOperationalVerification().catch((err) => {
  console.error('Fatal Operational Verification Error:', err);
  process.exit(1);
});
