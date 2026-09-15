import crypto from 'crypto';
import { db } from '../server/db.js';
import { calculateSettlement } from '../server/domain/money.js';
import { payoutService } from '../server/services/payout/payoutService.js';
import { talentirProvider, TalentirPayoutProvider } from '../server/services/payout/talentirProvider.js';
import { Order, Settlement } from '../src/types/index.js';

function pass(msg: string) {
  console.log(`  ✅ [PASS] ${msg}`);
}

function fail(msg: string) {
  console.error(`  ❌ [FAIL] ${msg}`);
  process.exit(1);
}

async function runTalentirPayoutTestSuite() {
  console.log('====================================================');
  console.log(' GATEKEEPER PHASE 6B — TALENTIR PAYOUT ADAPTER SUITE');
  console.log('====================================================\n');

  // --- SECTION 1: ADAPTER LOADING & PRODUCTION SECURITY ---
  console.log('--- SECTION 1: ADAPTER LOADING & PRODUCTION SECURITY ---');
  
  const adapter = payoutService.getAdapter();
  if (adapter.providerName === 'talentir') {
    pass('Talentir adapter loaded as primary payout provider');
  } else {
    fail('Talentir adapter is not registered as primary payout provider');
  }

  // Test production fail-closed invariant
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const unconfiguredProvider = new TalentirPayoutProvider();
  
  try {
    await unconfiguredProvider.createPayout({
      payoutId: 'test_prod_fail',
      orderId: 'ord_prod',
      creatorId: 'prov_merk_001',
      settlementId: 'ord_prod',
      recipientEmail: 'test@example.com',
      amountCents: 10000,
      currency: 'USD',
      description: 'Test',
      customId: 'test_prod_fail',
    });
    fail('Unconfigured production provider failed to fail closed');
  } catch (err: any) {
    if (err.message.includes('FATAL_PRODUCTION_CONFIG_ERROR')) {
      pass('Production mode without API credentials FAILS CLOSED safely');
    } else {
      fail(`Unexpected error during production fail-closed check: ${err.message}`);
    }
  } finally {
    process.env.NODE_ENV = originalEnv;
  }

  // --- SECTION 2: PAYOUT CREATION & INVARIANTS ---
  console.log('\n--- SECTION 2: PAYOUT CREATION & INVARIANTS ---');

  const testOrderId = `ord_talentir_test_${Date.now()}`;
  const testOrder: Order = {
    id: testOrderId,
    providerId: 'prov_merk_001',
    serviceId: 'srv_1',
    serviceName: 'Confidential Session',
    amountCents: 15000,
    currency: 'USD',
    status: 'paid',

    financialState: 'captured',
    entitlementState: 'issued',
    settlementState: 'unsettled',
    sessionState: 'idle',

    serviceCents: 15000,
    tipCents: 0,
    grossTotalCents: 15000,
    providerServiceShareCents: 12750,
    platformServiceShareCents: 2250,
    providerTipShareCents: 0,
    platformTipShareCents: 0,
    providerTotalShareCents: 12750,
    platformTotalShareCents: 2250,

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.saveOrder(testOrder);

  const settlement = calculateSettlement(testOrderId, 15000, 'USD');
  db.saveSettlement(settlement);

  const payout = await payoutService.executePayoutFromSettlement(
    testOrder,
    settlement,
    'merk.payouts@merkmorassi@gmail.com',
    'prov_merk_001'
  );

  if (payout.payoutId === `GK-${testOrderId}-PROVIDER`) {
    pass('Authoritative payoutId format is GK-{orderId}-PROVIDER');
  } else {
    fail(`Invalid payoutId format: ${payout.payoutId}`);
  }

  if (payout.customId === payout.payoutId) {
    pass('CustomId matches payoutId for Talentir idempotency');
  } else {
    fail(`CustomId mismatch: ${payout.customId} vs ${payout.payoutId}`);
  }

  if (payout.amountCents === settlement.providerCents) {
    pass(`Payout amount (${payout.amountCents}) strictly matches 85% settlement share (${settlement.providerCents})`);
  } else {
    fail(`Payout amount drift: ${payout.amountCents} vs ${settlement.providerCents}`);
  }

  if (payout.providerFeeCents === 382 || payout.providerFeeCents === 383) { // 3% of 12750 = 382.5 cents -> 383
    pass(`Talentir provider fee calculated correctly (${payout.providerFeeCents} cents = 3%)`);
  } else {
    fail(`Unexpected provider fee: ${payout.providerFeeCents}`);
  }

  // --- SECTION 3: IDEMPOTENCY & DUPLICATE PAYOUT PREVENTION ---
  console.log('\n--- SECTION 3: IDEMPOTENCY & DUPLICATE PAYOUT PREVENTION ---');

  const duplicatePayout = await payoutService.executePayoutFromSettlement(
    testOrder,
    settlement,
    'merk.payouts@merkmorassi@gmail.com',
    'prov_merk_001'
  );

  if (duplicatePayout.payoutId === payout.payoutId) {
    pass('Duplicate payout request returns identical payout ID');
  } else {
    fail('Duplicate payout request created a second payout entry');
  }

  const allPayouts = db.getAllPayouts().filter(p => p.orderId === testOrderId);
  if (allPayouts.length === 1) {
    pass('Database contains exactly ONE payout record for the order (Zero duplicate creation)');
  } else {
    fail(`Found ${allPayouts.length} payout records for order ${testOrderId}`);
  }

  // --- SECTION 4: WEBHOOK HMAC SIGNATURE & STATE MACHINE ---
  console.log('\n--- SECTION 4: WEBHOOK HMAC SIGNATURE & STATE MACHINE ---');

  const webhookSecret = process.env.TALENTIR_WEBHOOK_SECRET || 'sandbox_talentir_wh_secret';
  const customId = payout.customId!;

  // 1. Invalid signature check
  const badResult = await payoutService.processWebhook(
    JSON.stringify({ customId, status: 'completed' }),
    'invalid_signature_hex'
  );
  if (!badResult.success && badResult.httpStatus === 401) {
    pass('Webhook with invalid HMAC signature rejected with HTTP 401');
  } else {
    fail(`Invalid webhook signature returned: ${JSON.stringify(badResult)}`);
  }

  // 2. Valid signature check -> 'completed' status transition
  const validBody = JSON.stringify({
    id: `evt_${Date.now()}`,
    type: 'payout.completed',
    data: {
      id: payout.providerPayoutId,
      customId,
      status: 'completed',
      amountCents: settlement.providerCents,
    },
  });

  const validSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(validBody)
    .digest('hex');

  const validResult = await payoutService.processWebhook(validBody, validSignature);
  if (validResult.success && validResult.httpStatus === 200 && validResult.newStatus === 'completed') {
    pass('Valid HMAC webhook processed successfully and updated status to completed');
  } else {
    fail(`Valid webhook processing failed: ${JSON.stringify(validResult)}`);
  }

  // 3. Persistent Webhook idempotency (duplicate event check)
  const isRecordedInDb = db.isWebhookProcessed('talentir', JSON.parse(validBody).id);
  if (isRecordedInDb) {
    pass('Webhook event ID recorded in persistent database idempotency store');
  } else {
    fail('Webhook event ID was NOT recorded in database idempotency store');
  }

  const dupWebhookResult = await payoutService.processWebhook(validBody, validSignature);
  if (dupWebhookResult.success && dupWebhookResult.message?.includes('Persistent Idempotency')) {
    pass('Duplicate webhook event detected persistently and handled idempotently');
  } else {
    fail(`Duplicate webhook processing failed: ${JSON.stringify(dupWebhookResult)}`);
  }

  // 4. Immutable completed payout check
  const regressedBody = JSON.stringify({
    id: `evt_regress_${Date.now()}`,
    type: 'payout.updated',
    data: {
      id: payout.providerPayoutId,
      customId,
      status: 'created',
    },
  });
  const regressedSig = crypto.createHmac('sha256', webhookSecret).update(regressedBody).digest('hex');
  const regressedResult = await payoutService.processWebhook(regressedBody, regressedSig);

  const currentPayoutInDb = db.getPayout(payout.payoutId);
  if (currentPayoutInDb?.status === 'completed') {
    pass('Immutable completed payout status preserved against state regression attempt');
  } else {
    fail(`Payout status regressed to ${currentPayoutInDb?.status}`);
  }

  // --- SECTION 5: TENANT ISOLATION & CREATOR FINANCIALS ---
  console.log('\n--- SECTION 5: TENANT ISOLATION & CREATOR FINANCIALS ---');

  const financials = payoutService.getCreatorFinancials('prov_merk_001');
  if (financials.creatorId === 'prov_merk_001' && financials.settlementCents >= 12750) {
    pass('Creator financials calculated accurately for authorized provider');
  } else {
    fail(`Creator financials calculation error: ${JSON.stringify(financials)}`);
  }

  try {
    payoutService.getCreatorFinancials('prov_other_creator');
    fail('Tenant isolation failed to reject unauthorized creator financials request');
  } catch (err: any) {
    if (err.message.includes('TENANT_ISOLATION_VIOLATION')) {
      pass('Tenant isolation rejected cross-creator financials request');
    } else {
      fail(`Unexpected error during tenant isolation check: ${err.message}`);
    }
  }

  console.log('\n====================================================');
  console.log(' ALL PHASE 6B TALENTIR ADAPTER TESTS PASSED (12/12)');
  console.log('====================================================\n');
}

runTalentirPayoutTestSuite().catch((err) => {
  console.error('Fatal error in Talentir test suite:', err);
  process.exit(1);
});
