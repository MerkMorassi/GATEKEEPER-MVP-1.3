import express from 'express';
import http from 'http';
import { apiRouter } from '../server/routes/api.js';
import { db } from '../server/db.js';

async function runAdminProvidersVerification() {
  console.log('===========================================================');
  console.log(' GATEKEEPER — ADMIN PROVIDERS ACCEPTANCE TEST HARNESS');
  console.log('===========================================================');

  // Setup local express server for HTTP endpoint tests
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
    // 1. Provider List Retrieval
    const listRes = await fetch(`${baseUrl}/admin/providers`, {
      headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
    });
    const listData = await listRes.json();
    assert(listRes.status === 200 && listData.success === true, 'Provider list retrieval returns 200 OK');
    assert(Array.isArray(listData.providers) && listData.providers.length > 0, 'Provider list contains registered providers');
    assert(listData.providers[0].id === provider.id, 'Provider list contains correct provider ID');

    // 2. Provider Configuration Retrieval by ID
    const getRes = await fetch(`${baseUrl}/admin/providers/${provider.id}`, {
      headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
    });
    const getData = await getRes.json();
    assert(getRes.status === 200 && getData.success === true, 'Provider configuration retrieval by ID returns 200 OK');
    assert(getData.provider.id === provider.id, 'Retrieved provider configuration matches provider ID');

    // 3. Valid Provider Configuration Update
    const updateRes = await fetch(`${baseUrl}/admin/providers/${provider.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_SECRET}`,
      },
      body: JSON.stringify({
        name: 'Merk Morassi LLC (Updated)',
        payoutEmail: 'merk.payouts@merkmorassi.com',
        acceptedPaymentMethods: ['card', 'apple_pay', 'google_pay'],
      }),
    });
    const updateData = await updateRes.json();
    assert(updateRes.status === 200 && updateData.success === true, 'Valid provider configuration update returns 200 OK');
    assert(updateData.provider.name === 'Merk Morassi LLC (Updated)', 'Provider name updated in database');

    // Restore provider name
    db.updateProvider({ name: provider.name });

    // 4. Unknown Provider Rejection
    const unknownRes = await fetch(`${baseUrl}/admin/providers/non_existent_provider_999`, {
      headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
    });
    assert(unknownRes.status === 404, 'Unknown provider GET request rejected with 404 Not Found');

    const unknownPutRes = await fetch(`${baseUrl}/admin/providers/non_existent_provider_999`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_SECRET}`,
      },
      body: JSON.stringify({ name: 'Hacker Entity' }),
    });
    assert(unknownPutRes.status === 404, 'Unknown provider PUT request rejected with 404 Not Found');

    // 5. Unauthorized Admin Request Rejection
    const unauthRes = await fetch(`${baseUrl}/admin/providers`, {
      headers: { Authorization: `Bearer INVALID_TOKEN` },
    });
    assert(unauthRes.status === 401, 'Unauthorized request without valid admin token rejected with 401 Unauthorized');

    // 6. Provider Cannot Enable a Platform-Disabled Payment Capability
    // Step 6a: Disable 'cash_app' at the platform level
    db.togglePaymentMethodCapability('cash_app', false);

    // Step 6b: Attempt to enable 'cash_app' on provider
    const capDisallowedRes = await fetch(`${baseUrl}/admin/providers/${provider.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_SECRET}`,
      },
      body: JSON.stringify({
        acceptedPaymentMethods: ['card', 'cash_app'], // cash_app is disabled at platform level!
      }),
    });
    const capDisallowedData = await capDisallowedRes.json();
    assert(capDisallowedRes.status === 400, 'Provider enabling platform-disabled payment capability rejected with 400 Bad Request');
    assert(
      capDisallowedData.error && capDisallowedData.error.includes('PROVIDER_CAPABILITY_DISALLOWED'),
      'Error message correctly identifies PROVIDER_CAPABILITY_DISALLOWED'
    );

    // Step 6c: Re-enable 'cash_app' at platform level
    db.togglePaymentMethodCapability('cash_app', true);

    // 7. Talentir Cannot Be Enabled via Provider Configuration
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
    assert(talentirRes.status === 400, 'Talentir enablement attempt rejected with 400 Bad Request');
    assert(
      talentirData.error && talentirData.error.includes('TALENTIR_FEATURE_BOUNDARY'),
      'Error message correctly identifies TALENTIR_FEATURE_BOUNDARY'
    );

    // 8. Existing Provider Isolation Rules Remain Intact
    const currentProv = db.getProvider();
    assert(Boolean(currentProv.id), 'Provider maintains persistent ID after security checks');
    assert(currentProv.active === true, 'Provider active status remains intact');

  } finally {
    server.close();
  }

  console.log('-----------------------------------------------------------');
  console.log(`ADMIN PROVIDERS VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAdminProvidersVerification().catch((err) => {
  console.error('Fatal error in Admin Providers verification:', err);
  process.exit(1);
});
