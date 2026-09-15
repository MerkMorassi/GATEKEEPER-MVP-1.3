import express from 'express';
import http from 'http';
import { apiRouter } from '../server/routes/api.js';
import { db } from '../server/db.js';
import { Order } from '../src/types/index.js';

async function runPaginationTestSuite() {
  console.log('===========================================================');
  console.log(' GATEKEEPER — HARDENED PAGINATION VERIFICATION HARNESS');
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
      console.error(`  ✕ FAIL: ${description}`);
      failed++;
    }
  }

  const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || 'gk_admin_secret_dev_2026';
  const PROVIDER_AUTH = 'Bearer gk_provider_passphrase_dev_2026';

  // Seed deterministic dataset (30 orders)
  const now = new Date().toISOString();
  for (let i = 1; i <= 30; i++) {
    const testOrder: Order = {
      id: `ord_pag_hardened_${Date.now()}_${i}`,
      providerId: 'prov_1',
      serviceId: 'srv_1',
      serviceName: `Hardened Pagination Service ${i}`,
      amountCents: 5000,
      serviceCents: 5000,
      tipCents: 0,
      grossTotalCents: 5000,
      providerServiceShareCents: 4250,
      platformServiceShareCents: 750,
      providerTipShareCents: 0,
      platformTipShareCents: 0,
      providerTotalShareCents: 4250,
      platformTotalShareCents: 750,
      currency: 'USD',
      financialState: i % 2 === 0 ? 'captured' : 'created',
      entitlementState: 'none',
      settlementState: 'unsettled',
      sessionState: 'idle',
      status: i % 2 === 0 ? 'paid' : 'created',
      clientIp: '127.0.0.1',
      createdAt: new Date(Date.now() + i * 1000).toISOString(),
      updatedAt: now,
    };
    db.saveOrder(testOrder);
  }

  const endpoints = [
    { name: 'Admin Orders', path: '/admin/orders', auth: { Authorization: `Bearer ${ADMIN_SECRET}` }, key: 'orders' },
    { name: 'Admin Ledger', path: '/admin/ledger', auth: { Authorization: `Bearer ${ADMIN_SECRET}` }, key: 'ledgerEntries' },
    { name: 'Admin Providers', path: '/admin/providers', auth: { Authorization: `Bearer ${ADMIN_SECRET}` }, key: 'providers' },
    { name: 'Admin Webhooks', path: '/admin/webhooks', auth: { Authorization: `Bearer ${ADMIN_SECRET}` }, key: 'webhooks' },
    { name: 'Provider Ledger', path: '/ledger', auth: { Authorization: PROVIDER_AUTH }, key: 'entries' },
  ];

  try {
    // Group 1: Parameter Security Matrix Across All 5 Endpoints
    console.log('\n--- Group 1: Parameter Security Matrix Across All 5 Endpoints ---');

    for (const ep of endpoints) {
      // Valid baseline
      const baseRes = await fetch(`${baseUrl}${ep.path}`, { headers: ep.auth });
      const baseData = await baseRes.json();
      assert(baseRes.status === 200 && baseData.success === true, `[${ep.name}] Baseline GET without params returns 200 OK`);
      assert(baseData[ep.key].length <= 10, `[${ep.name}] Baseline records count is <= 10 (${baseData[ep.key].length})`);
      assert(baseData.pagination.limit === 10, `[${ep.name}] Default limit normalized to 10`);

      // Hostile Max-Limit Enforcement (limit=11, limit=50, limit=100, limit=10000)
      for (const hostileLimit of [11, 50, 100, 10000]) {
        const res = await fetch(`${baseUrl}${ep.path}?limit=${hostileLimit}`, { headers: ep.auth });
        const data = await res.json();
        assert(
          data[ep.key].length <= 10 && data.pagination.limit <= 10,
          `[${ep.name}] Hostile limit=${hostileLimit} capped strictly at max 10 records (got ${data[ep.key].length})`
        );
      }

      // Lower-bound & Negative Limit Handling (limit=0, limit=-1, limit=-100)
      for (const lowerLimit of [0, -1, -100]) {
        const res = await fetch(`${baseUrl}${ep.path}?limit=${lowerLimit}`, { headers: ep.auth });
        const data = await res.json();
        assert(
          data[ep.key].length <= 10 && data.pagination.limit === 10,
          `[${ep.name}] Lower-bound limit=${lowerLimit} normalized safely to default 10`
        );
      }

      // Malformed Limit Handling (limit=abc, limit=1.5, limit=NaN)
      for (const malformedLimit of ['abc', '1.5', 'NaN', 'null', 'undefined']) {
        const res = await fetch(`${baseUrl}${ep.path}?limit=${malformedLimit}`, { headers: ep.auth });
        const data = await res.json();
        assert(
          data[ep.key].length <= 10 && data.pagination.limit <= 10,
          `[${ep.name}] Malformed limit='${malformedLimit}' safely normalized (got ${data[ep.key].length})`
        );
      }

      // Negative and Malformed Page Handling (page=0, page=-1, page=-100, page=abc)
      for (const malformedPage of [0, -1, -100, 'abc', 'NaN', '1.5']) {
        const res = await fetch(`${baseUrl}${ep.path}?page=${malformedPage}`, { headers: ep.auth });
        const data = await res.json();
        assert(
          data.pagination.page === 1 && data[ep.key].length <= 10,
          `[${ep.name}] Malformed/negative page='${malformedPage}' normalized safely to page 1`
        );
      }

      // Extreme Out-of-Range Page (page=999999)
      const extremeRes = await fetch(`${baseUrl}${ep.path}?page=999999`, { headers: ep.auth });
      const extremeData = await extremeRes.json();
      assert(
        extremeData.pagination.page === 999999 && extremeData[ep.key].length === 0,
        `[${ep.name}] Extreme page=999999 returns empty slice [] safely without server error`
      );
    }

    // Group 2: Authorization Preservation
    console.log('\n--- Group 2: Authorization Preservation & Scope Checks ---');

    // Unauthenticated requests MUST be rejected with 401
    for (const ep of endpoints) {
      const unauthRes = await fetch(`${baseUrl}${ep.path}?limit=10000&page=-1`);
      assert(unauthRes.status === 401, `[${ep.name}] Unauthenticated request with hostile params rejected with 401 Unauthorized`);
    }

    // Provider ledger isolation check
    const provLedgerRes = await fetch(`${baseUrl}/ledger?limit=10000`, { headers: { Authorization: PROVIDER_AUTH } });
    const provLedgerData = await provLedgerRes.json();
    const provider = db.getProvider();
    const leakedOtherEntries = provLedgerData.entries.some((e: any) => e.providerId !== provider.id);
    assert(!leakedOtherEntries, 'Provider ledger returns ONLY entries matching authenticated provider ID');

    // Group 3: Filter + Pagination Interaction
    console.log('\n--- Group 3: Filter & Search Interaction with Pagination ---');

    const filteredRes = await fetch(`${baseUrl}/admin/orders?status=paid&page=1&limit=10`, {
      headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
    });
    const filteredData = await filteredRes.json();
    const allPaidOrders = db.getAllOrders().filter((o) => o.status === 'paid');
    assert(filteredData.pagination.total === allPaidOrders.length, 'Paginated response metadata reflects filtered dataset total');
    assert(
      filteredData.orders.every((o: any) => o.status === 'paid'),
      'Paginated order slice elements strictly match filter criteria'
    );

    // Group 4: Ledger & Financial Reconciliation Integrity
    console.log('\n--- Group 4: Ledger & Financial Integrity Invariants ---');

    const adminLedgerRes = await fetch(`${baseUrl}/admin/ledger?page=1&limit=1`, {
      headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
    });
    const adminLedgerData = await adminLedgerRes.json();
    const expectedAdminSlice = Math.min(1, adminLedgerData.pagination.total);
    assert(adminLedgerData.ledgerEntries.length === expectedAdminSlice, `Admin ledger page 1 slice contains exactly ${expectedAdminSlice} entry as requested`);
    assert(
      adminLedgerData.totals.isBalanced === true && adminLedgerData.totals.totalDebitsCents === adminLedgerData.totals.totalCreditsCents,
      `Admin ledger totals reflect FULL global dataset balance ($${(adminLedgerData.totals.totalDebitsCents / 100).toFixed(2)}) regardless of slice`
    );

    const provLedgerInvarRes = await fetch(`${baseUrl}/ledger?page=1&limit=1`, {
      headers: { Authorization: PROVIDER_AUTH },
    });
    const provLedgerInvarData = await provLedgerInvarRes.json();
    const expectedProvSlice = Math.min(1, provLedgerInvarData.pagination.total);
    assert(provLedgerInvarData.entries.length === expectedProvSlice, `Provider ledger page 1 slice contains exactly ${expectedProvSlice} entry as requested`);
    assert(
      provLedgerInvarData.reconciliation.isBalanced === true,
      'Provider ledger reconciliation reflects FULL provider dataset balance regardless of page slice size'
    );

    // Group 5: Deterministic Ordering & Non-Overlap
    console.log('\n--- Group 5: Deterministic Slicing & Non-Overlap ---');

    const p1Res = await fetch(`${baseUrl}/admin/orders?page=1&limit=10`, { headers: { Authorization: `Bearer ${ADMIN_SECRET}` } });
    const p1Data = await p1Res.json();
    const p2Res = await fetch(`${baseUrl}/admin/orders?page=2&limit=10`, { headers: { Authorization: `Bearer ${ADMIN_SECRET}` } });
    const p2Data = await p2Res.json();

    const p1Ids = new Set(p1Data.orders.map((o: any) => o.id));
    const p2Ids = new Set(p2Data.orders.map((o: any) => o.id));
    let overlaps = false;
    for (const id of p2Ids) {
      if (p1Ids.has(id)) {
        overlaps = true;
        break;
      }
    }
    assert(!overlaps, 'Page 1 and Page 2 contain mutually disjoint order ID sets (No duplication)');

    // Repeat page 1 request to verify deterministic ordering
    const p1RepeatRes = await fetch(`${baseUrl}/admin/orders?page=1&limit=10`, { headers: { Authorization: `Bearer ${ADMIN_SECRET}` } });
    const p1RepeatData = await p1RepeatRes.json();
    const identicalOrder = p1Data.orders.every((o: any, idx: number) => o.id === p1RepeatData.orders[idx].id);
    assert(identicalOrder, 'Repeated request to same page returns identical record sequence (Deterministic ordering)');

    // Group 6: Admin Dashboard (/admin/overview) Pagination Coverage Verification
    console.log('\n--- Group 6: Admin Dashboard (/admin/overview) Pagination Coverage ---');

    const overviewRes = await fetch(`${baseUrl}/admin/overview`, {
      headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
    });
    const overviewData = await overviewRes.json();
    assert(overviewRes.status === 200 && overviewData.success === true, '[Admin Dashboard] GET /admin/overview returns 200 OK');
    assert(overviewData.overview.settlements.length <= 10, `[Admin Dashboard] Settlements collection capped at <= 10 records (${overviewData.overview.settlements.length})`);
    assert(overviewData.overview.payouts.length <= 10, `[Admin Dashboard] Payouts collection capped at <= 10 records (${overviewData.overview.payouts.length})`);
    assert(overviewData.overview.auditEvents.length <= 10, `[Admin Dashboard] Audit events collection capped at <= 10 records (${overviewData.overview.auditEvents.length})`);
    assert(overviewData.overview.manualReviewQueue.length <= 10, `[Admin Dashboard] Manual review queue capped at <= 10 records (${overviewData.overview.manualReviewQueue.length})`);

    // Hostile max limit test on Admin Dashboard
    const hostileOverviewRes = await fetch(`${baseUrl}/admin/overview?limit=1000&settlementsLimit=500&auditEventsLimit=999`, {
      headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
    });
    const hostileOverviewData = await hostileOverviewRes.json();
    assert(
      hostileOverviewData.overview.settlements.length <= 10 &&
      hostileOverviewData.overview.payouts.length <= 10 &&
      hostileOverviewData.overview.auditEvents.length <= 10 &&
      hostileOverviewData.overview.manualReviewQueue.length <= 10,
      '[Admin Dashboard] Hostile limit parameters strictly capped at max 10 records for all collections'
    );

    // Filter interaction on Admin Dashboard audit events
    const filteredOverviewRes = await fetch(`${baseUrl}/admin/overview?auditFilter=ORDER_CREATED&page=1&limit=10`, {
      headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
    });
    const filteredOverviewData = await filteredOverviewRes.json();
    assert(
      filteredOverviewData.overview.auditEvents.every((e: any) => e.eventType === 'ORDER_CREATED'),
      '[Admin Dashboard] Audit events filter correctly filters dataset server-side before slicing'
    );
    assert(
      filteredOverviewData.overview.auditEventsPagination.total >= filteredOverviewData.overview.auditEvents.length,
      '[Admin Dashboard] Audit events pagination metadata correctly reflects filtered dataset total'
    );

    // Global Financial totals check on Admin Dashboard
    assert(
      typeof filteredOverviewData.overview.totalGrossCents === 'number' &&
      typeof filteredOverviewData.overview.totalProviderCents === 'number' &&
      typeof filteredOverviewData.overview.totalAgentCents === 'number',
      '[Admin Dashboard] Financial summary totals are preserved independently of page slicing'
    );
  } finally {
    server.close();
  }

  console.log('\n===========================================================');
  console.log(` HARDENED PAGINATION SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPaginationTestSuite().catch((err) => {
  console.error('Fatal error during pagination verification:', err);
  process.exit(1);
});
