/**
 * GateKeeper Stripe Architecture Adversarial Verification Test Suite
 * Validates all core architectural invariants, webhook security, state machines,
 * idempotency, overlapping events, entitlement redemption lifecycle, and double-entry ledger balance.
 */

import express from 'express';
import http from 'http';
import Stripe from 'stripe';
import { calculateServiceAndTipBreakdown, calculateRefundBreakdown, MINIMUM_SERVICE_FEE_CENTS } from '../server/domain/money.js';
import { canTransitionFinancial, canTransitionEntitlement, canTransitionSettlement, canTransitionSession } from '../server/domain/stateMachine.js';
import { db } from '../server/db.js';
import { createEntitlement } from '../server/domain/access.js';
import { apiRouter } from '../server/routes/api.js';
import { FinancialLedgerEntry, Order } from '../src/types/index.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${description}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${description}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log(' GATEKEEPER STRIPE ARCHITECTURE ADVERSARIAL VERIFICATION SUITE');
  console.log('================================================================\n');

  // --- UNIT TESTS ---

  // TEST 1: Minimum Service Fee Enforcement ($50 USD / 5000 cents)
  console.log('Test 1: Minimum Service Fee Enforcement ($50.00 USD)');
  try {
    calculateServiceAndTipBreakdown(4999, 0); // $49.99 should fail
    assert(false, 'Should throw error for service fee below $50.00 (4999 cents)');
  } catch (err: any) {
    assert(err.message.includes('violates minimum service fee requirement'), 'Rejects service fees < 5000 cents ($50.00 USD)');
  }

  try {
    const valid = calculateServiceAndTipBreakdown(5000, 0); // $50.00 exact
    assert(valid.serviceCents === 5000, 'Accepts minimum $50.00 service fee');
  } catch (err: any) {
    assert(false, 'Failed on exact $50.00 service fee');
  }

  // TEST 2: Financial Economics (85/15 Service Split + 100% Tip)
  console.log('\nTest 2: Financial Economics (85/15 Service Split + 100% Gratuity)');
  const ex1 = calculateServiceAndTipBreakdown(10000, 2000); // $100 service + $20 tip
  assert(ex1.serviceCents === 10000, 'Service fee = 10000 cents ($100.00)');
  assert(ex1.tipCents === 2000, 'Tip fee = 2000 cents ($20.00)');
  assert(ex1.providerServiceShareCents === 8500, 'Provider service share = 8500 cents ($85.00)');
  assert(ex1.platformServiceShareCents === 1500, 'Platform service share = 1500 cents ($15.00)');
  assert(ex1.providerTipShareCents === 2000, 'Provider tip share = 2000 cents ($20.00 / 100%)');
  assert(ex1.platformTipShareCents === 0, 'Platform tip share = 0 cents (0%)');
  assert(ex1.providerTotalShareCents === 10500, 'Provider total share = 10500 cents ($105.00)');
  assert(ex1.platformTotalShareCents === 1500, 'Platform total share = 1500 cents ($15.00)');
  assert(ex1.grossTotalCents === 12000, 'Gross total = 12000 cents ($120.00)');

  // Sub-cent floor rounding check: $50.01 service fee (5001 cents)
  const ex2 = calculateServiceAndTipBreakdown(5001, 0);
  assert(ex2.providerServiceShareCents === Math.floor(5001 * 0.85), 'Provider 85% uses floor math (4250 cents)');
  assert(ex2.platformServiceShareCents === 5001 - 4250, 'Platform receives exact remainder (751 cents)');
  assert(ex2.providerServiceShareCents + ex2.platformServiceShareCents === 5001, 'Zero cent drift in split sum');

  // TEST 3: Double-Entry Ledger Invariant (Sum(Debits) === Sum(Credits))
  console.log('\nTest 3: Double-Entry Financial Ledger Invariant');
  const balancedTransaction: Omit<FinancialLedgerEntry, 'id' | 'createdAt'>[] = [
    {
      orderId: 'test_ord_001',
      providerId: 'prov_merk_001',
      adapterType: 'STRIPE',
      eventType: 'CHARGE_CREATED',
      account: '1010_STRIPE_CLEARING',
      debitCents: 12000,
      creditCents: 0,
      description: 'Debit Stripe Clearing $120.00',
    },
    {
      orderId: 'test_ord_001',
      providerId: 'prov_merk_001',
      adapterType: 'STRIPE',
      eventType: 'PLATFORM_FEE_RETAINED',
      account: '4010_PLATFORM_SERVICE_REVENUE',
      debitCents: 0,
      creditCents: 1500,
      description: 'Credit Platform Revenue $15.00',
    },
    {
      orderId: 'test_ord_001',
      providerId: 'prov_merk_001',
      adapterType: 'STRIPE',
      eventType: 'PROVIDER_PAYABLE_RECORDED',
      account: '2010_PROVIDER_PAYABLE_SERVICE',
      debitCents: 0,
      creditCents: 8500,
      description: 'Credit Provider Service Payable $85.00',
    },
    {
      orderId: 'test_ord_001',
      providerId: 'prov_merk_001',
      adapterType: 'STRIPE',
      eventType: 'TIP_PAYABLE_RECORDED',
      account: '2015_PROVIDER_PAYABLE_TIP',
      debitCents: 0,
      creditCents: 2000,
      description: 'Credit Provider Tip Payable $20.00',
    },
  ];

  try {
    const ledgerResult = db.addLedgerTransaction(balancedTransaction);
    assert(ledgerResult.length === 4, 'Balanced double-entry journal accepted');
  } catch (err: any) {
    assert(false, `Balanced transaction failed unexpectedly: ${err.message}`);
  }

  const unbalancedTransaction: Omit<FinancialLedgerEntry, 'id' | 'createdAt'>[] = [
    {
      orderId: 'test_ord_002',
      providerId: 'prov_merk_001',
      adapterType: 'STRIPE',
      eventType: 'CHARGE_CREATED',
      account: '1010_STRIPE_CLEARING',
      debitCents: 10000,
      creditCents: 0,
      description: 'Unbalanced Debit $100.00',
    },
    {
      orderId: 'test_ord_002',
      providerId: 'prov_merk_001',
      adapterType: 'STRIPE',
      eventType: 'PLATFORM_FEE_RETAINED',
      account: '4010_PLATFORM_SERVICE_REVENUE',
      debitCents: 0,
      creditCents: 1500,
      description: 'Unbalanced Credit $15.00',
    },
  ];

  try {
    db.addLedgerTransaction(unbalancedTransaction);
    assert(false, 'Should throw error for unbalanced transaction');
  } catch (err: any) {
    assert(err.message.includes('UNBALANCED_LEDGER_TRANSACTION'), 'Rejects unbalanced double-entry transaction');
  }

  // TEST 4: State Machine Transition Guards
  console.log('\nTest 4: 4-Vector State Machine Guards');
  assert(canTransitionFinancial('created', 'captured'), 'Financial: created -> captured allowed');
  assert(canTransitionFinancial('captured', 'refunded'), 'Financial: captured -> refunded allowed');
  assert(!canTransitionFinancial('refunded', 'captured'), 'Financial: refunded -> captured rejected');
  assert(!canTransitionFinancial('captured', 'captured'), 'Financial: captured -> captured rejected (from === to returns false)');

  assert(canTransitionEntitlement('none', 'issued'), 'Entitlement: none -> issued allowed');
  assert(canTransitionEntitlement('issued', 'redeemed'), 'Entitlement: issued -> redeemed allowed');
  assert(canTransitionEntitlement('issued', 'revoked'), 'Entitlement: issued -> revoked allowed');
  assert(!canTransitionEntitlement('issued', 'issued'), 'Entitlement: issued -> issued rejected');

  assert(canTransitionSettlement('unsettled', 'pending_payout'), 'Settlement: unsettled -> pending_payout allowed');
  assert(canTransitionSettlement('payout_completed', 'clawed_back'), 'Settlement: payout_completed -> clawed_back allowed');

  // TEST 5: Refund Calculation Math
  console.log('\nTest 5: Component-Based Refund Calculation Math');
  const sampleOrderBreakdown = calculateServiceAndTipBreakdown(10000, 2000); // $100 service, $20 tip
  const sampleOrder = {
    serviceCents: 10000,
    tipCents: 2000,
    grossTotalCents: 12000,
    providerServiceShareCents: sampleOrderBreakdown.providerServiceShareCents,
    platformServiceShareCents: sampleOrderBreakdown.platformServiceShareCents,
    providerTipShareCents: sampleOrderBreakdown.providerTipShareCents,
    platformTipShareCents: 0,
  };

  const tipRefundBreakdown = calculateRefundBreakdown({
    order: sampleOrder,
    refundAmountCents: 2000,
    isTipRefund: true,
    isServiceRefund: false,
  });
  assert(tipRefundBreakdown.refundedProviderTipPayableCents === 2000, 'Tip refund reverses 100% provider tip ($20.00)');
  assert(tipRefundBreakdown.refundedPlatformRevenueCents === 0, 'Tip refund reverses $0 platform revenue');
  assert(tipRefundBreakdown.refundedProviderServicePayableCents === 0, 'Tip refund reverses $0 provider service share');

  const fullRefundBreakdown = calculateRefundBreakdown({
    order: sampleOrder,
    refundAmountCents: 12000,
  });
  assert(fullRefundBreakdown.refundedPlatformRevenueCents === 1500, 'Full refund reverses $15.00 platform revenue');
  assert(fullRefundBreakdown.refundedProviderServicePayableCents === 8500, 'Full refund reverses $85.00 provider service share');
  assert(fullRefundBreakdown.refundedProviderTipPayableCents === 2000, 'Full refund reverses $20.00 provider tip');

  // --- HTTP INTEGRATION TESTS ---
  console.log('\n----------------------------------------------------------------');
  console.log(' STARTING HTTP INTEGRATION TEST HARNESS');
  console.log('----------------------------------------------------------------\n');

  const TEST_SECRET = 'whsec_test_secret_for_suite_1234567890';
  process.env.STRIPE_WEBHOOK_SECRET = TEST_SECRET;
  process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key_for_signature_gen';

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const app = express();
  app.use(express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    }
  }));
  app.use('/api', apiRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  function generateSignature(payloadString: string): string {
    return stripe.webhooks.generateTestHeaderString({
      payload: payloadString,
      secret: TEST_SECRET,
    });
  }

  try {
    // TEST 6: HTTP Webhook Security (Unsigned & Malformed Requests)
    console.log('Test 6: HTTP Webhook Security - Unsigned & Malformed Requests');
    const unsignedRes = await fetch(`${baseUrl}/webhooks/stripe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'checkout.session.completed' }),
    });
    assert(unsignedRes.status === 400, 'Unsigned webhook request rejected with HTTP 400');

    const invalidSigRes = await fetch(`${baseUrl}/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-stripe-signature': 't=123,v1=invalid_fake_signature_hash',
      },
      body: JSON.stringify({ type: 'checkout.session.completed' }),
    });
    assert(invalidSigRes.status === 400, 'Invalid signature webhook request rejected with HTTP 400');

    // TEST 7: Valid Signature Webhook & Entitlement Issuance
    console.log('\nTest 7: Valid Signature Webhook Execution & Entitlement Issuance');
    const provider = db.getProvider();
    const order1: Order = {
      id: `ord_http_capture_${Date.now()}`,
      providerId: provider.id,
      serviceId: 'srv_1',
      gateId: 'gate_1',
      serviceName: '1-on-1 Consultation',
      amountCents: 12000,
      currency: 'USD',
      status: 'created',
      financialState: 'created',
      entitlementState: 'none',
      settlementState: 'unsettled',
      sessionState: 'idle',
      serviceCents: 10000,
      tipCents: 2000,
      grossTotalCents: 12000,
      providerServiceShareCents: 8500,
      platformServiceShareCents: 1500,
      providerTipShareCents: 2000,
      platformTipShareCents: 0,
      providerTotalShareCents: 10500,
      platformTotalShareCents: 1500,
      payoutAdapter: 'STRIPE',
      stripeAccountId: provider.stripeAccountId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.saveOrder(order1);

    const checkoutEventPayload = JSON.stringify({
      id: `evt_cs_${Date.now()}`,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          payment_status: 'paid',
          payment_intent: 'pi_test_123',
          metadata: { orderId: order1.id, providerId: provider.id },
        },
      },
    });

    const validSig = generateSignature(checkoutEventPayload);
    const validRes = await fetch(`${baseUrl}/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-stripe-signature': validSig,
      },
      body: checkoutEventPayload,
    });

    assert(validRes.status === 200, 'Valid webhook processed with HTTP 200');
    const updatedOrder1 = db.getOrder(order1.id);
    assert(updatedOrder1?.financialState === 'captured', 'Order financial state updated to captured');
    assert(updatedOrder1?.entitlementState === 'issued', 'Order entitlement state updated to issued');

    const entitlementsOrder1 = db.getAllEntitlements().filter((e) => e.orderId === order1.id);
    assert(entitlementsOrder1.length === 1, 'Exactly 1 entitlement issued');

    // TEST 8: Webhook Event Idempotency (Duplicate Event Replay)
    console.log('\nTest 8: Webhook Idempotency - Duplicate Event Replay');
    const replayRes = await fetch(`${baseUrl}/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-stripe-signature': validSig,
      },
      body: checkoutEventPayload,
    });

    assert(replayRes.status === 200, 'Replayed webhook returns HTTP 200 idempotent response');
    const replayEntitlements = db.getAllEntitlements().filter((e) => e.orderId === order1.id);
    assert(replayEntitlements.length === 1, 'Zero duplicate entitlement tokens created on replay');

    // TEST 9: Overlapping Webhook Events (payment_intent.succeeded after checkout.session.completed)
    console.log('\nTest 9: Overlapping Webhook Side Effects Defense');
    const paymentIntentPayload = JSON.stringify({
      id: `evt_pi_${Date.now()}`,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_123',
          metadata: { orderId: order1.id, providerId: provider.id },
        },
      },
    });

    const piSig = generateSignature(paymentIntentPayload);
    const piRes = await fetch(`${baseUrl}/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-stripe-signature': piSig,
      },
      body: paymentIntentPayload,
    });

    assert(piRes.status === 200, 'Overlapping payment_intent.succeeded returns HTTP 200');
    const piEntitlements = db.getAllEntitlements().filter((e) => e.orderId === order1.id);
    assert(piEntitlements.length === 1, 'Zero duplicate entitlement tokens created on overlapping event');

    // TEST 10: Reverse Webhook Sequence (payment_intent.succeeded FIRST, checkout.session.completed SECOND)
    console.log('\nTest 10: Reverse Webhook Sequence');
    const order2: Order = {
      ...order1,
      id: `ord_http_reverse_${Date.now()}`,
      status: 'created',
      financialState: 'created',
      entitlementState: 'none',
    };
    db.saveOrder(order2);

    const firstPIPayload = JSON.stringify({
      id: `evt_pi_first_${Date.now()}`,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_reverse_123',
          metadata: { orderId: order2.id, providerId: provider.id },
        },
      },
    });
    const firstPISig = generateSignature(firstPIPayload);
    const firstPIRes = await fetch(`${baseUrl}/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-stripe-signature': firstPISig,
      },
      body: firstPIPayload,
    });
    assert(firstPIRes.status === 200, 'First payment_intent.succeeded processed with HTTP 200');
    assert(db.getOrder(order2.id)?.financialState === 'captured', 'Order captured on first event');

    const secondCSPayload = JSON.stringify({
      id: `evt_cs_second_${Date.now()}`,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_reverse_123',
          payment_status: 'paid',
          metadata: { orderId: order2.id, providerId: provider.id },
        },
      },
    });
    const secondCSSig = generateSignature(secondCSPayload);
    const secondCSRes = await fetch(`${baseUrl}/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-stripe-signature': secondCSSig,
      },
      body: secondCSPayload,
    });
    assert(secondCSRes.status === 200, 'Second checkout.session.completed returns HTTP 200');
    const order2Entitlements = db.getAllEntitlements().filter((e) => e.orderId === order2.id);
    assert(order2Entitlements.length === 1, 'Exactly 1 entitlement issued for reverse sequence');

    // TEST 11: HTTP Entitlement Token Redemption Lifecycle
    console.log('\nTest 11: HTTP Entitlement Token Redemption Lifecycle (Replay, Revoked, Expired)');
    const tokenToRedeem = entitlementsOrder1[0].token;

    // 1. First redemption -> 200 OK
    const redeemRes1 = await fetch(`${baseUrl}/access/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenToRedeem }),
    });
    assert(redeemRes1.status === 200, 'First token redemption returns HTTP 200 OK');

    // 2. Replay redemption -> 409 Conflict
    const redeemRes2 = await fetch(`${baseUrl}/access/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenToRedeem }),
    });
    assert(redeemRes2.status === 409, 'Replay token redemption rejected with HTTP 409 Conflict');

    // 3. Revoked entitlement -> 403 Forbidden
    const order3: Order = {
      ...order1,
      id: `ord_http_revoked_${Date.now()}`,
      financialState: 'captured',
      entitlementState: 'revoked',
    };
    db.saveOrder(order3);

    const revokedEntitlement = await createEntitlement(order3.id, provider.id, provider.facetimeHandle, 'http://localhost:3000');
    db.saveEntitlement(revokedEntitlement);

    const redeemRevokedRes = await fetch(`${baseUrl}/access/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: revokedEntitlement.token }),
    });
    assert(redeemRevokedRes.status === 403, 'Revoked entitlement redemption rejected with HTTP 403 Forbidden');

    // 4. Expired entitlement -> 410 Expired
    const expiredEntitlement = await createEntitlement(order1.id, provider.id, provider.facetimeHandle, 'http://localhost:3000');
    expiredEntitlement.expiresAt = new Date(Date.now() - 60000).toISOString();
    db.saveEntitlement(expiredEntitlement);

    const redeemExpiredRes = await fetch(`${baseUrl}/access/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: expiredEntitlement.token }),
    });
    assert(redeemExpiredRes.status === 410, 'Expired entitlement redemption rejected with HTTP 410 Expired');

    // TEST 12: Tip-Only Refund Accounting Allocation
    console.log('\nTest 12: Tip-Only Refund Accounting Allocation');
    const tipRefundPayload = JSON.stringify({
      id: `evt_tip_ref_${Date.now()}`,
      type: 'charge.refunded',
      data: {
        object: {
          amount_refunded: 2000,
          metadata: {
            orderId: order1.id,
            providerId: provider.id,
            isTipRefund: 'true',
            isServiceRefund: 'false',
          },
        },
      },
    });
    const tipRefundSig = generateSignature(tipRefundPayload);
    const tipRefundRes = await fetch(`${baseUrl}/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-stripe-signature': tipRefundSig,
      },
      body: tipRefundPayload,
    });
    assert(tipRefundRes.status === 200, 'Tip refund webhook processed with HTTP 200');

    const tipRefundLedgerEntries = db.getLedgerEntries().filter((e) => e.orderId === order1.id && e.eventType === 'TRANSFER_REVERSED');
    const tipReversedEntry = tipRefundLedgerEntries.find((e) => e.account === '2015_PROVIDER_PAYABLE_TIP');
    assert(tipReversedEntry?.debitCents === 2000, 'Tip-only refund debited $20.00 from 2015_PROVIDER_PAYABLE_TIP');

    const platformReversedEntry = db.getLedgerEntries().filter((e) => e.orderId === order1.id && e.account === '4010_PLATFORM_SERVICE_REVENUE' && e.debitCents > 0);
    assert(platformReversedEntry.length === 0, 'Tip-only refund reversed $0 from platform revenue');

    // TEST 13: Finalized Lost Dispute Accounting
    console.log('\nTest 13: Finalized Lost Dispute Accounting');
    const orderDispute: Order = {
      ...order1,
      id: `ord_dispute_${Date.now()}`,
      financialState: 'captured',
    };
    db.saveOrder(orderDispute);

    // 1. Charge dispute created
    const disputeCreatedPayload = JSON.stringify({
      id: `evt_disp_created_${Date.now()}`,
      type: 'charge.dispute.created',
      data: {
        object: {
          metadata: { orderId: orderDispute.id, providerId: provider.id },
        },
      },
    });
    const dispCreatedSig = generateSignature(disputeCreatedPayload);
    await fetch(`${baseUrl}/webhooks/stripe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-stripe-signature': dispCreatedSig },
      body: disputeCreatedPayload,
    });

    // 2. Charge dispute closed (lost)
    const disputeClosedPayload = JSON.stringify({
      id: `evt_disp_closed_${Date.now()}`,
      type: 'charge.dispute.closed',
      data: {
        object: {
          status: 'lost',
          metadata: { orderId: orderDispute.id, providerId: provider.id },
        },
      },
    });
    const dispClosedSig = generateSignature(disputeClosedPayload);
    const disputeClosedRes = await fetch(`${baseUrl}/webhooks/stripe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-stripe-signature': dispClosedSig },
      body: disputeClosedPayload,
    });
    assert(disputeClosedRes.status === 200, 'Dispute closed (lost) webhook processed with HTTP 200');

    const disputeEntries = db.getLedgerEntries().filter((e) => e.orderId === orderDispute.id);
    const processorLossEntry = disputeEntries.find((e) => e.account === '5010_PROCESSOR_FEE_EXPENSE');
    assert(processorLossEntry?.debitCents === 12000, 'Lost dispute debited $120.00 to 5010_PROCESSOR_FEE_EXPENSE');

    let escrowDebits = 0;
    let escrowCredits = 0;
    for (const entry of disputeEntries.filter((e) => e.account === '1020_DISPUTE_ESCROW_CONTRA')) {
      escrowDebits += entry.debitCents;
      escrowCredits += entry.creditCents;
    }
    assert(escrowDebits === escrowCredits, 'Dispute Escrow Contra account balance is exactly $0 after finalized loss');

    // TEST 14: Final Full Ledger Reconciliation Audit across all recorded transactions
    console.log('\nTest 14: Global Double-Entry Ledger Reconciliation Audit');
    const allEntries = db.getLedgerEntries();
    let totalGlobalDebits = 0;
    let totalGlobalCredits = 0;
    for (const entry of allEntries) {
      totalGlobalDebits += entry.debitCents;
      totalGlobalCredits += entry.creditCents;
    }
    assert(totalGlobalDebits === totalGlobalCredits, `Global ledger is perfectly balanced: Total Debits (${totalGlobalDebits} cents) === Total Credits (${totalGlobalCredits} cents)`);
  } finally {
    server.close();
  }

  console.log('\n================================================================');
  console.log(` FINAL RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test Suite Exception:', err);
  process.exit(1);
});
