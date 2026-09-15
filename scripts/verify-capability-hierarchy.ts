import express from 'express';
import http from 'http';
import { apiRouter } from '../server/routes/api.js';
import { db } from '../server/db.js';

async function runCapabilityHierarchyVerification() {
  console.log('===========================================================');
  console.log(' GATEKEEPER — CAPABILITY HIERARCHY ACCEPTANCE HARNESS');
  console.log('===========================================================');

  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}/api`;

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

  const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || 'gk_admin_secret_dev_2026';
  const provider = db.getProvider();

  try {
    // Record baseline ledger count and order count to verify ZERO financial side effects
    const initialLedgerCount = db.getLedgerEntries().length;
    const initialOrderCount = db.getAllOrders().length;

    // STEP 1: Establish Initial State — Platform Enable All Methods
    console.log('\n--- 1. Initial State Setup ---');
    ['card', 'apple_pay', 'google_pay', 'link', 'cash_app', 'paypal'].forEach((m) => {
      db.togglePaymentMethodCapability(m, true);
    });

    // Configure Provider to accept subset: ['card', 'apple_pay']
    const initProvRes = await fetch(`${baseUrl}/admin/providers/${provider.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_SECRET}`,
      },
      body: JSON.stringify({
        acceptedPaymentMethods: ['card', 'apple_pay'],
      }),
    });
    assert(initProvRes.status === 200, 'Configured Provider accepted payment methods to ["card", "apple_pay"]');

    // Query Public Capabilities
    const pubRes1 = await fetch(`${baseUrl}/capabilities/public`);
    const pubData1 = await pubRes1.json();
    assert(pubRes1.status === 200, 'GET /api/capabilities/public returned 200 OK');

    const effectiveMethods1 = pubData1.enabledPaymentMethods.map((m: any) => m.id);
    const providerAccepted1 = pubData1.providerAcceptedMethods;

    // Effective intersection: Platform Enabled AND Provider Accepted
    const effectiveIntersection1 = effectiveMethods1.filter((id: string) => providerAccepted1.includes(id));
    assert(
      effectiveIntersection1.includes('card') &&
        effectiveIntersection1.includes('apple_pay') &&
        !effectiveIntersection1.includes('google_pay') &&
        !effectiveIntersection1.includes('paypal'),
      'Effective capabilities === ["card", "apple_pay"] (Provider subset enforced)'
    );

    // STEP 2: Platform Disable Cascade (Disable apple_pay at Platform level)
    console.log('\n--- 2. Platform Disable Cascade Test ---');
    db.togglePaymentMethodCapability('apple_pay', false);

    const pubRes2 = await fetch(`${baseUrl}/capabilities/public`);
    const pubData2 = await pubRes2.json();
    const effectiveMethods2 = pubData2.enabledPaymentMethods.map((m: any) => m.id);
    const providerAccepted2 = pubData2.providerAcceptedMethods;

    assert(
      providerAccepted2.includes('apple_pay'),
      'Provider stored preference retains "apple_pay" in configuration state'
    );
    assert(
      !effectiveMethods2.includes('apple_pay'),
      'Platform capability for "apple_pay" is DISABLED'
    );

    const effectiveIntersection2 = effectiveMethods2.filter((id: string) => providerAccepted2.includes(id));
    assert(
      effectiveIntersection2.includes('card') && !effectiveIntersection2.includes('apple_pay'),
      'Effective capability immediately cascades to ["card"] (apple_pay blocked by Platform)'
    );

    // STEP 3: Re-Enable Cascade Test (Re-enable apple_pay at Platform level)
    console.log('\n--- 3. Platform Re-Enable Cascade Test ---');
    db.togglePaymentMethodCapability('apple_pay', true);

    const pubRes3 = await fetch(`${baseUrl}/capabilities/public`);
    const pubData3 = await pubRes3.json();
    const effectiveMethods3 = pubData3.enabledPaymentMethods.map((m: any) => m.id);
    const providerAccepted3 = pubData3.providerAcceptedMethods;

    const effectiveIntersection3 = effectiveMethods3.filter((id: string) => providerAccepted3.includes(id));
    assert(
      effectiveIntersection3.includes('card') && effectiveIntersection3.includes('apple_pay'),
      'Effective capability automatically restores to ["card", "apple_pay"] upon Platform re-enablement'
    );

    // STEP 4: Escalation Rejection Test (Provider attempts to enable platform-disabled method)
    console.log('\n--- 4. Escalation Rejection Test ---');
    db.togglePaymentMethodCapability('cash_app', false); // Disable at platform level

    const escalationRes = await fetch(`${baseUrl}/admin/providers/${provider.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_SECRET}`,
      },
      body: JSON.stringify({
        acceptedPaymentMethods: ['card', 'cash_app'], // Attempting escalation
      }),
    });
    const escalationData = await escalationRes.json();
    assert(escalationRes.status === 400, 'Escalation attempt rejected with HTTP 400 Bad Request');
    assert(
      escalationData.error && escalationData.error.includes('PROVIDER_CAPABILITY_DISALLOWED'),
      'Error code PROVIDER_CAPABILITY_DISALLOWED returned'
    );

    // Verify Provider stored config was NOT mutated
    const provCheck = db.getProvider();
    assert(
      !provCheck.acceptedPaymentMethods?.includes('cash_app'),
      'Provider stored configuration was NOT partially persisted'
    );

    // Restore cash_app platform state
    db.togglePaymentMethodCapability('cash_app', true);

    // STEP 5: Talentir Boundary Test
    console.log('\n--- 5. Talentir Boundary Test ---');
    const talentirRes = await fetch(`${baseUrl}/admin/providers/${provider.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_SECRET}`,
      },
      body: JSON.stringify({
        payoutProvider: 'talentir',
        enableTalentir: true,
      }),
    });
    const talentirData = await talentirRes.json();
    assert(talentirRes.status === 400, 'Talentir enablement attempt rejected with HTTP 400 Bad Request');
    assert(
      talentirData.error && talentirData.error.includes('TALENTIR_FEATURE_BOUNDARY'),
      'Error code TALENTIR_FEATURE_BOUNDARY returned'
    );

    const caps = db.getPaymentCapabilities();
    assert(
      caps.payoutProviders['talentir'].status === 'coming_soon' && caps.payoutProviders['talentir'].enabled === false,
      'Talentir status remains explicitly "coming_soon" / disabled'
    );

    // STEP 6: Public Capability Endpoint Safety Audit
    console.log('\n--- 6. Public Capability Endpoint Safety Audit ---');
    const safeRes = await fetch(`${baseUrl}/capabilities/public`);
    const safeData = await safeRes.json();
    const str = JSON.stringify(safeData);

    assert(!str.includes('secretKey'), 'Public capability endpoint does NOT expose secretKey');
    assert(!str.includes('webhookSecret'), 'Public capability endpoint does NOT expose webhookSecret');
    assert(!str.includes('ADMIN_SECRET_KEY'), 'Public capability endpoint does NOT expose admin secret keys');
    assert(!safeData.enabledPayoutProviders.some((p: any) => p.id === 'talentir' && p.status === 'operational'), 'Talentir is NOT exposed as an operational payout method');

    // STEP 7: Verify Zero Financial Side Effects
    console.log('\n--- 7. Zero Financial Side Effects Audit ---');
    const finalLedgerCount = db.getLedgerEntries().length;
    const finalOrderCount = db.getAllOrders().length;

    assert(finalLedgerCount === initialLedgerCount, 'Zero ledger entries created during capability updates');
    assert(finalOrderCount === initialOrderCount, 'Zero orders created during capability updates');

    // Restore provider default accepted methods
    db.updateProvider({
      acceptedPaymentMethods: ['card', 'apple_pay', 'google_pay', 'link', 'cash_app', 'paypal'],
    });

  } finally {
    server.close();
  }

  console.log('-----------------------------------------------------------');
  console.log(`CAPABILITY HIERARCHY VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runCapabilityHierarchyVerification().catch((err) => {
  console.error('Fatal error in Capability Hierarchy verification:', err);
  process.exit(1);
});
