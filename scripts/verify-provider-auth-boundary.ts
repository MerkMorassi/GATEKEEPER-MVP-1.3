import express from 'express';
import http from 'http';
import { apiRouter } from '../server/routes/api.js';
import { db } from '../server/db.js';

async function runProviderAuthBoundaryAudit() {
  console.log('===========================================================');
  console.log(' GATEKEEPER — PROVIDER AUTHORIZATION BOUNDARY AUDIT');
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
      console.error(`  ✕ FAIL: ${description}`);
      failed++;
    }
  }

  const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || 'gk_admin_secret_dev_2026';
  const PROVIDER_SECRET = process.env.PROVIDER_PASSPHRASE || 'gk_provider_passphrase_dev_2026';

  try {
    // 1. Unauthenticated Requests to Provider Endpoint
    console.log('\n--- 1. Unauthenticated Requests to Provider Endpoint ---');
    const noAuthRes = await fetch(`${baseUrl}/ledger`);
    assert(noAuthRes.status === 401, 'Request with no auth credentials rejected with 401 Unauthorized');
    const noAuthData = await noAuthRes.json();
    assert(noAuthData.success === false, 'Response payload contains success: false');

    // 2. Invalid or Malformed Credentials
    console.log('\n--- 2. Invalid or Malformed Authorization Header Handling ---');
    const invalidHeaders = [
      { Authorization: 'Bearer wrong_token_123' },
      { 'x-provider-key': 'wrong_key_456' },
      { Authorization: 'Basic dXNlcjpwYXNz' },
      { Authorization: 'Bearer ' },
      { Authorization: 'Bearer null' },
      { Authorization: 'Bearer undefined' },
    ];

    for (const hdr of invalidHeaders) {
      const res = await fetch(`${baseUrl}/ledger`, { headers: hdr as any });
      assert(res.status === 401, `Invalid auth header (${JSON.stringify(hdr)}) rejected with 401 Unauthorized`);
    }

    // 3. Valid Provider Credentials
    console.log('\n--- 3. Valid Provider Credential Authentication ---');
    const validBearerRes = await fetch(`${baseUrl}/ledger`, {
      headers: { Authorization: `Bearer ${PROVIDER_SECRET}` },
    });
    assert(validBearerRes.status === 200, 'Valid Bearer provider passphrase accepted with 200 OK');

    const validHeaderRes = await fetch(`${baseUrl}/ledger`, {
      headers: { 'x-provider-key': PROVIDER_SECRET },
    });
    assert(validHeaderRes.status === 200, 'Valid X-Provider-Key accepted with 200 OK');

    // 4. Provider -> Admin Privilege Escalation Prevention
    console.log('\n--- 4. Provider -> Admin Privilege Escalation Protection ---');
    const adminEndpoints = ['/admin/orders', '/admin/ledger', '/admin/providers', '/admin/webhooks'];

    for (const ep of adminEndpoints) {
      const escalationRes = await fetch(`${baseUrl}${ep}`, {
        headers: { Authorization: `Bearer ${PROVIDER_SECRET}` },
      });
      assert(
        escalationRes.status === 401,
        `Provider credential on Admin endpoint [${ep}] rejected with 401 Unauthorized (Escalation blocked)`
      );

      const headerEscalationRes = await fetch(`${baseUrl}${ep}`, {
        headers: { 'x-provider-key': PROVIDER_SECRET },
      });
      assert(
        headerEscalationRes.status === 401,
        `Provider X-Header credential on Admin endpoint [${ep}] rejected with 401 Unauthorized (Escalation blocked)`
      );
    }

    // 5. Cross-Provider Data Isolation
    console.log('\n--- 5. Cross-Provider Data Isolation ---');
    const currentProvider = db.getProvider();
    const ledgerRes = await fetch(`${baseUrl}/ledger`, {
      headers: { Authorization: `Bearer ${PROVIDER_SECRET}` },
    });
    const ledgerData = await ledgerRes.json();
    assert(ledgerData.success === true, 'Provider ledger fetch succeeded');

    const foreignEntries = ledgerData.entries.filter((e: any) => e.providerId !== currentProvider.id);
    assert(foreignEntries.length === 0, 'Zero ledger entries belong to other providers (Strict provider scoping)');

    // 6. Admin -> Provider Access
    console.log('\n--- 6. Admin Secret on Provider Endpoints ---');
    const adminOnProvRes = await fetch(`${baseUrl}/ledger`, {
      headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
    });
    assert(
      adminOnProvRes.status === 401,
      'Admin secret key on Provider-only endpoint rejected with 401 Unauthorized (Strict role segregation)'
    );

  } finally {
    server.close();
  }

  console.log('\n===========================================================');
  console.log(` PROVIDER AUTH AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runProviderAuthBoundaryAudit().catch((err) => {
  console.error('Fatal error during provider auth audit:', err);
  process.exit(1);
});
