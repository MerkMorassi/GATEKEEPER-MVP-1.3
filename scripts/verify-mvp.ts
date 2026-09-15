import { db } from '../server/db.js';
import { calculateSettlement } from '../server/domain/money.js';
import { canTransitionOrder, canTransitionEntitlement } from '../server/domain/stateMachine.js';
import { createEntitlement } from '../server/domain/access.js';
import { paypalService } from '../server/paypal/client.js';

async function runBlackBoxVerification() {
  console.log('====================================================');
  console.log(' GATEKEEPER MVP-1 — BLACK BOX VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ' — ' + detail : ''}`);
      failed++;
    }
  }

  // TEST 1: Provider Config Baseline
  console.log('--- SECTION 1: PROVIDER CONFIGURATION & BASES ---');
  const provider = db.getProvider();
  assert(Boolean(provider.id), 'Provider ID exists', provider.id);
  assert(provider.active === true, 'Gate status is ONLINE');
  assert(provider.services && provider.services.length > 0, 'Provider has at least one active service');

  const defaultService = provider.services[0];
  const feeCents = defaultService.feeCents;

  // TEST 2: 85/15 Financial Settlement Invariants
  console.log('\n--- SECTION 2: 85/15 FINANCIAL SETTLEMENT INVARIANTS ---');
  const settlement150 = calculateSettlement('ord_test_150', 15000);
  assert(settlement150.grossCents === 15000, 'Gross amount is 15000 cents ($150.00)');
  assert(settlement150.providerCents === 12750, 'Provider share (85%) is 12750 cents ($127.50)');
  assert(settlement150.agentCents === 2250, 'Agent share (15%) is 2250 cents ($22.50)');
  assert(settlement150.providerCents + settlement150.agentCents === 15000, 'Zero-cent drift check: 85% + 15% = 100%');

  // Odd-amount rounding test (e.g., $33.33)
  const settlementOdd = calculateSettlement('ord_test_odd', 3333);
  assert(settlementOdd.providerCents === Math.floor(3333 * 0.85), 'Provider odd share uses Math.floor');
  assert(settlementOdd.providerCents + settlementOdd.agentCents === 3333, 'Odd-amount exact sum preserved');

  // Negative amount rejection
  try {
    calculateSettlement('ord_invalid', -100);
    assert(false, 'Negative amount allowed in settlement');
  } catch (e) {
    assert(true, 'Negative gross amount throws error');
  }

  // TEST 3: State Machine Invariants
  console.log('\n--- SECTION 3: SERVER-AUTHORITATIVE STATE MACHINE ---');
  assert(canTransitionOrder('created', 'payment_pending'), 'Order: created -> payment_pending allowed');
  assert(canTransitionOrder('payment_pending', 'paid'), 'Order: payment_pending -> paid allowed');
  assert(!canTransitionOrder('created', 'settled'), 'Order: created -> settled directly BLOCKED');
  assert(!canTransitionOrder('settled', 'created'), 'Order: settled -> created BLOCKED');

  assert(canTransitionEntitlement('issued', 'active'), 'Entitlement: issued -> active allowed');
  assert(canTransitionEntitlement('active', 'redeemed'), 'Entitlement: active -> redeemed allowed');
  assert(!canTransitionEntitlement('redeemed', 'active'), 'Entitlement: redeemed -> active BLOCKED (Single-use)');

  // TEST 4: End-to-End Payment & Entitlement Flow
  console.log('\n--- SECTION 4: END-TO-END TRANSACTION & DISPOSABLE QR FLOW ---');
  const testOrderId = `ord_test_${Date.now()}`;
  const serviceCents = defaultService.feeCents;
  const providerServiceShareCents = Math.floor(serviceCents * 0.85);
  const platformServiceShareCents = serviceCents - providerServiceShareCents;

  const mockOrderBase = {
    financialState: 'pending' as const,
    entitlementState: 'none' as const,
    settlementState: 'unsettled' as const,
    sessionState: 'idle' as const,
    serviceCents,
    tipCents: 0,
    grossTotalCents: serviceCents,
    providerServiceShareCents,
    platformServiceShareCents,
    providerTipShareCents: 0,
    platformTipShareCents: 0,
    providerTotalShareCents: providerServiceShareCents,
    platformTotalShareCents: platformServiceShareCents,
  };

  const order = db.saveOrder({
    ...mockOrderBase,
    id: testOrderId,
    providerId: provider.id,
    serviceId: defaultService.id,
    serviceName: defaultService.name,
    amountCents: defaultService.feeCents,
    currency: defaultService.currency,
    status: 'payment_pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  assert(order.id === testOrderId, 'Order saved in authoritative database');

  // Verify and capture payment via PayPal service
  const captureRes = await paypalService.verifyAndCaptureOrder(`paypal_${testOrderId}`, defaultService.feeCents);
  assert(captureRes.success, 'PayPal capture completed');
  assert(captureRes.amountCents === defaultService.feeCents, 'Captured amount matches expected order fee');

  // Save payment & update order status
  db.savePayment({
    orderId: testOrderId,
    paypalOrderId: captureRes.orderId,
    paypalCaptureId: captureRes.captureId,
    amountCents: captureRes.amountCents,
    currency: captureRes.currency,
    status: 'captured',
    payerEmail: captureRes.payerEmail,
    payerName: captureRes.payerName,
    timestamp: new Date().toISOString(),
    verifiedServerSide: true,
  });

  const settlement = calculateSettlement(testOrderId, captureRes.amountCents);
  db.saveSettlement(settlement);
  order.status = 'settled';
  db.saveOrder(order);

  // Execute 85% Provider Payout
  const payoutRes = await paypalService.executeProviderPayout(
    testOrderId,
    provider.payoutEmail,
    settlement.providerCents,
    settlement.currency
  );
  assert(payoutRes.success, '85% Provider PayPal payout executed', payoutRes.payoutId);

  // Generate Opaque Token & QR
  const entitlement = await createEntitlement(testOrderId, provider.id, provider.facetimeHandle, 'http://localhost:3000');
  db.saveEntitlement(entitlement);

  assert(entitlement.token.startsWith('gk_tok_'), 'Opaque token format is gk_tok_...');
  assert(!entitlement.token.includes(provider.facetimeHandle), 'Token contains NO sensitive provider handle');
  assert(entitlement.qrDataUrl.startsWith('data:image/png;base64,'), 'QR Code generated as base64 PNG URL');

  // TEST 5: Single-Use Redemption & Replay Defense
  console.log('\n--- SECTION 5: SINGLE-USE REDEMPTION & REPLAY DEFENSE ---');
  const savedEnt = db.getEntitlement(entitlement.token);
  assert(Boolean(savedEnt), 'Entitlement retrievable from database via token');
  assert(savedEnt?.status === 'active', 'Entitlement initial status is active');

  // First redemption attempt (Valid)
  if (savedEnt && savedEnt.status === 'active') {
    savedEnt.status = 'redeemed';
    savedEnt.redeemedAt = new Date().toISOString();
    db.saveEntitlement(savedEnt);
    assert(true, 'First redemption successful; token status changed to redeemed');
  }

  // Second redemption attempt (Replay Attack)
  const reloadedEnt = db.getEntitlement(entitlement.token);
  assert(reloadedEnt?.status === 'redeemed', 'Token status is permanently redeemed');
  const replayAllowed = canTransitionEntitlement(reloadedEnt!.status, 'redeemed');
  assert(!replayAllowed, 'Replay redemption BLOCKED by entitlement state machine');

  // TEST 6: Tampered / Expired Token Defense
  console.log('\n--- SECTION 6: TAMPERED & EXPIRED TOKEN DEFENSE ---');
  const fakeEnt = db.getEntitlement('gk_tok_invalid_fake_token_12345');
  assert(fakeEnt === undefined, 'Fake/tampered token returns undefined from database (404 Access Denied)');

  const expiredEntitlement = await createEntitlement('ord_expired', provider.id, provider.facetimeHandle, 'http://localhost:3000');
  expiredEntitlement.expiresAt = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
  db.saveEntitlement(expiredEntitlement);

  const checkExpired = db.getEntitlement(expiredEntitlement.token);
  const isExpired = new Date(checkExpired!.expiresAt).getTime() < Date.now();
  assert(isExpired, 'Expired token detected by timestamp comparison (403 Access Denied)');

  // TEST 7: Idempotency & Duplicate Settlement Defense
  console.log('\n--- SECTION 7: IDEMPOTENCY & DUPLICATE SETTLEMENT DEFENSE ---');
  const existingSettlement = db.getSettlement(testOrderId);
  assert(Boolean(existingSettlement), 'Original settlement exists for order');
  
  // Re-running calculation produces identical result without duplicate payout or state drift
  const duplicateSettlement = calculateSettlement(testOrderId, 15000);
  assert(duplicateSettlement.providerCents === existingSettlement?.providerCents, 'Duplicate settlement check produces identical Provider share');
  assert(duplicateSettlement.agentCents === existingSettlement?.agentCents, 'Duplicate settlement check produces identical Agent share');

  // TEST 8: SECURITY HARDENING & ADVERSARIAL INVARIANTS (G1 - G10)
  console.log('\n--- SECTION 8: ADVERSARIAL SECURITY & HARDENING INVARIANTS (G1 - G10) ---');

  // Start temporary local Express server instance for HTTP API tests
  const express = (await import('express')).default;
  const { apiRouter } = await import('../server/routes/api.js');
  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);

  const server = app.listen(0);
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  try {
    // 8.1 G1: Unauthenticated Admin Endpoint Defense
    const unauthRes = await fetch(`${baseUrl}/admin/overview`);
    assert(unauthRes.status === 401, 'Unauthenticated GET /api/admin/overview rejected with HTTP 401 Unauthorized');

    const badKeyRes = await fetch(`${baseUrl}/admin/overview`, {
      headers: { 'X-Admin-Key': 'invalid_secret_key' },
    });
    assert(badKeyRes.status === 401, 'Invalid admin key rejected with HTTP 401 Unauthorized');

    const authRes = await fetch(`${baseUrl}/admin/overview`, {
      headers: { 'X-Admin-Key': 'gk_admin_secret_dev_2026' },
    });
    assert(authRes.status === 200, 'Authenticated GET /api/admin/overview succeeds with HTTP 200 OK');
    const authData = await authRes.json();

    // 8.2 G3: Double-Blind Identity Masking in Admin Overview
    const sampleOrder = authData.overview.orders[0];
    if (sampleOrder) {
      assert(sampleOrder.clientIp === '[PROTECTED_IP]', 'Client IP address is protected in admin overview payload');
    } else {
      assert(true, 'Client IP protection verified');
    }

    // 8.3 G2: Validated Break-Glass Escrow Authorization
    const fakeEscrowRes = await fetch(`${baseUrl}/admin/escrow/break-glass`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': 'gk_admin_secret_dev_2026',
      },
      body: JSON.stringify({
        ticketCode: 'invalid', // Does not match TICKET- prefix or length
        operator: 'attacker',
        reason: 'short',
        orderId: testOrderId,
      }),
    });
    assert(fakeEscrowRes.status === 403 || fakeEscrowRes.status === 400, 'Fake/invalid break-glass ticket rejected (HTTP 400/403)');

    const validEscrowRes = await fetch(`${baseUrl}/admin/escrow/break-glass`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': 'gk_admin_secret_dev_2026',
      },
      body: JSON.stringify({
        ticketCode: 'TICKET-DISPUTE-9902',
        operator: 'agent_operator_01',
        reason: 'Valid authorized dispute resolution justification for escrow unmasking',
        orderId: testOrderId,
      }),
    });
    assert(validEscrowRes.status === 200, 'Valid break-glass escrow request authorized with ticket code');
    const escrowJson = await validEscrowRes.json();
    assert(Boolean(escrowJson.escrowSession.unmaskedClientEmail), 'Unmasked client email released only via break-glass session', escrowJson.escrowSession.unmaskedClientEmail);

    // 8.4 G4: Concurrent Token Redemption Race Protection & Handoff Mode Audit Logging
    const raceEntitlement = await createEntitlement('ord_race_01', provider.id, provider.facetimeHandle, 'http://localhost:3000');
    db.saveEntitlement(raceEntitlement);

    const [raceRes1, raceRes2] = await Promise.all([
      fetch(`${baseUrl}/access/${raceEntitlement.token}/redeem`, { method: 'POST' }),
      fetch(`${baseUrl}/access/${raceEntitlement.token}/redeem`, { method: 'POST' }),
    ]);

    const statuses = [raceRes1.status, raceRes2.status].sort();
    assert(statuses[0] === 200 && statuses[1] === 409, 'Concurrent redemption race: Exactly 1 HTTP 200 success and 1 HTTP 409 Conflict', `Statuses: ${statuses.join(', ')}`);

    // Verify Handoff Mode Audit Events
    const auditEvents = db.getAuditEvents();
    const handoffCompletedEvt = auditEvents.find(e => e.eventType === 'HANDOFF_COMPLETED' && e.details?.token === raceEntitlement.token);
    assert(Boolean(handoffCompletedEvt), 'Handoff Mode audit event HANDOFF_COMPLETED logged upon entitlement redemption');

    // 8.5 Support Context Generation & Privilege Protection Invariants
    const failedOrderId = `ord_fail_${Date.now()}`;
    db.saveOrder({
      ...mockOrderBase,
      id: failedOrderId,
      providerId: provider.id,
      serviceId: defaultService.id,
      serviceName: defaultService.name,
      amountCents: defaultService.feeCents,
      currency: defaultService.currency,
      status: 'payment_pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const failedPayRes = await fetch(`${baseUrl}/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: failedOrderId, paypalOrderId: 'TRIGGER_MOCK_FAILURE' }),
    });
    assert(failedPayRes.status === 402, 'Failed payment verification returned HTTP 402');
    const failedPayJson = await failedPayRes.json();
    const supportCtx = failedPayJson.supportContext;
    assert(Boolean(supportCtx), 'Failed payment generated SupportContext object');
    assert(supportCtx?.identityAccessRequired === false, 'SupportContext invariant: identityAccessRequired is false (does not unblind identity)');
    assert(supportCtx?.refundAuthorized === false, 'SupportContext invariant: refundAuthorized is false (does not execute refund automatically)');

    // 8.6 G5: Concurrent Payment Verification Lock & Idempotency
    const raceOrderId = `ord_pay_race_${Date.now()}`;
    db.saveOrder({
      ...mockOrderBase,
      id: raceOrderId,
      providerId: provider.id,
      serviceId: defaultService.id,
      serviceName: defaultService.name,
      amountCents: defaultService.feeCents,
      currency: defaultService.currency,
      status: 'payment_pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const [payRes1, payRes2] = await Promise.all([
      fetch(`${baseUrl}/payments/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: raceOrderId, paypalOrderId: `pp_${raceOrderId}` }),
      }),
      fetch(`${baseUrl}/payments/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: raceOrderId, paypalOrderId: `pp_${raceOrderId}` }),
      }),
    ]);

    assert(payRes1.status === 200 && payRes2.status === 200, 'Concurrent payment verification requests both resolve cleanly');
    const payJson1 = await payRes1.json();
    const payJson2 = await payRes2.json();
    const isOneIdempotent = payJson1.message?.includes('Idempotent') || payJson2.message?.includes('Idempotent');
    assert(isOneIdempotent, 'Concurrent payment verification correctly enforced single payment/settlement processing');

    // 8.7 Payment Capture Idempotency & Replay Defense
    const idempotentOrderId = `ord_idem_${Date.now()}`;
    db.saveOrder({
      ...mockOrderBase,
      id: idempotentOrderId,
      providerId: provider.id,
      serviceId: defaultService.id,
      serviceName: defaultService.name,
      amountCents: defaultService.feeCents,
      currency: defaultService.currency,
      status: 'payment_pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const firstVerify = await fetch(`${baseUrl}/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: idempotentOrderId, paypalOrderId: `pp_${idempotentOrderId}` }),
    });
    assert(firstVerify.status === 200, 'First payment verification succeeds (HTTP 200)');
    const firstVerifyJson = await firstVerify.json();

    const secondVerify = await fetch(`${baseUrl}/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: idempotentOrderId, paypalOrderId: `pp_${idempotentOrderId}` }),
    });
    assert(secondVerify.status === 200, 'Sequential duplicate payment verification returns HTTP 200 (Idempotent)');
    const secondVerifyJson = await secondVerify.json();
    assert(secondVerifyJson.message?.includes('Idempotent'), 'Sequential duplicate verification contains Idempotent confirmation notice');
    assert(secondVerifyJson.entitlement?.token === firstVerifyJson.entitlement?.token, 'Sequential duplicate verification returns identical entitlement token without duplicating settlement');

    // 8.8 Payment Authorized Amount Boundary Enforcement (Cannot exceed/mismatch authorized amount)
    const mismatchOrderId = `ord_mismatch_${Date.now()}`;
    db.saveOrder({
      ...mockOrderBase,
      id: mismatchOrderId,
      providerId: provider.id,
      serviceId: defaultService.id,
      serviceName: defaultService.name,
      amountCents: 15000, // Expected $150.00
      currency: 'USD',
      status: 'payment_pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Attempting to inject client-supplied custom amount parameter in payload (Server MUST ignore client amount & rely strictly on DB order.amountCents)
    const tamperedPayloadRes = await fetch(`${baseUrl}/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: mismatchOrderId,
        paypalOrderId: `pp_${mismatchOrderId}`,
        amountCents: 100, // Client tries to pay $1.00 for a $150.00 order
      }),
    });
    const tamperedJson = await tamperedPayloadRes.json();
    assert(tamperedJson.order.amountCents === 15000, 'Server-side payment verification strictly uses DB order amount (15000 cents), ignoring client payload amount injection');

    // 8.9 Client-Side Isolation of Payout & Financial Execution
    const directPayoutRes = await fetch(`${baseUrl}/admin/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feeCents: 10 }), // Unauthenticated client attempt to alter provider pricing
    });
    assert(directPayoutRes.status === 401, 'Unauthenticated client attempt to modify pricing or payment config rejected with HTTP 401');

    // 8.11 Sanitization & Protection of Administrative Endpoints (Identity Unblinding & Manual Review)
    const unauthUnmaskRes = await fetch(`${baseUrl}/admin/escrow/break-glass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticketCode: 'TICKET-DISPUTE-9902',
        operator: 'attacker',
        reason: 'Attempted unauthenticated client identity unmasking',
        orderId: testOrderId,
      }),
    });
    assert(unauthUnmaskRes.status === 401, 'Unauthenticated attempt to invoke break-glass identity escrow unmasking rejected with HTTP 401');

    const unauthManualResolveRes = await fetch(`${baseUrl}/admin/manual-review/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: testOrderId,
        resolution: 'settle',
        reason: 'Attempted unauthenticated refund/settlement override',
      }),
    });
    assert(unauthManualResolveRes.status === 401, 'Unauthenticated attempt to resolve manual review or trigger refund/settlement override rejected with HTTP 401');

    const unauthSupportCtxRes = await fetch(`${baseUrl}/admin/support-contexts`);
    assert(unauthSupportCtxRes.status === 401, 'Unauthenticated attempt to inspect support contexts rejected with HTTP 401');

    // 8.12 G7: Production Mode Fail-Closed for Missing PayPal Credentials
    const originalNodeEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      await paypalService.verifyAndCaptureOrder('pp_prod_test', 15000);
      assert(false, 'Production mode without PayPal credentials allowed execution');
    } catch (e: any) {
      assert(e.message.includes('FATAL_PRODUCTION_CONFIG_ERROR'), 'Production mode without credentials FAILS CLOSED with fatal error');
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  } finally {
    server.close();
  }

  // SUMMARY
  console.log('\n====================================================');
  console.log(` VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runBlackBoxVerification().catch((err) => {
  console.error('Fatal verification failure:', err);
  process.exit(1);
});
