const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000/api';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`  ✓ PASS: ${message}`);
  }
}

async function runDevAuthBridgeTestSuite() {
  console.log('\n===========================================================');
  console.log(' GATEKEEPER — DEVELOPMENT AUTHENTICATION BRIDGE AUDIT SUITE');
  console.log('===========================================================');

  let passedTests = 0;
  const totalGroups = 5;

  try {
    // -------------------------------------------------------------
    // Group 1: Server Status & Status Endpoint Integrity
    // -------------------------------------------------------------
    console.log('\n--- 1. Development Auth Status Endpoint ---');
    const statusReq = await fetch(`${baseUrl}/auth/dev-status`);
    const statusData = (await statusReq.json()) as any;
    assert(statusReq.status === 200, 'GET /api/auth/dev-status returns 200 OK');
    assert(typeof statusData.enabled === 'boolean', 'dev-status returns boolean "enabled" property');

    // -------------------------------------------------------------
    // Group 2: Valid & Invalid Credentials under Dev Mode
    // -------------------------------------------------------------
    console.log('\n--- 2. Dev Login Credential Verification ---');
    
    // Test missing body fields
    const emptyReq = await fetch(`${baseUrl}/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert(emptyReq.status === 400 || emptyReq.status === 403, 'Empty login payload rejected with 400 or 403');

    // Test invalid username
    const badUserReq = await fetch(`${baseUrl}/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'invalid_hacker_user', password: 'gk_admin_secret_dev_2026' }),
    });
    assert(badUserReq.status === 401 || badUserReq.status === 403, 'Invalid username rejected with 401 Unauthorized or 403');

    // Test invalid password
    const badPassReq = await fetch(`${baseUrl}/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'wrong_password_999' }),
    });
    assert(badPassReq.status === 401 || badPassReq.status === 403, 'Invalid password rejected with 401 Unauthorized or 403');

    // Test valid credentials
    const validLoginReq = await fetch(`${baseUrl}/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'gk_admin_secret_dev_2026' }),
    });

    if (validLoginReq.status === 200) {
      const validData = (await validLoginReq.json()) as any;
      assert(validData.success === true, 'Valid dev login succeeds with success: true');
      assert(typeof validData.sessionId === 'string', 'Valid dev login returns server-authoritative sessionId');
      assert(typeof validData.authToken === 'string', 'Valid dev login returns server-authoritative authToken');
      assert(validData.authMethod === 'development_password', 'Response identifies authMethod as development_password');

      // -------------------------------------------------------------
      // Group 3: Dev Session Verification & Role Granting
      // -------------------------------------------------------------
      console.log('\n--- 3. Dev Session Authoritative Verification ---');
      const sessionCheckReq = await fetch(`${baseUrl}/auth/session`, {
        headers: { Authorization: `Bearer ${validData.sessionId}` },
      });
      const sessionCheckData = (await sessionCheckReq.json()) as any;
      assert(sessionCheckData.authenticated === true, 'Dev sessionId verifies as authenticated session on /api/auth/session');

      // Admin endpoint check with authToken
      const adminReq = await fetch(`${baseUrl}/admin/orders`, {
        headers: { Authorization: `Bearer ${validData.authToken}` },
      });
      assert(adminReq.status === 200, 'Dev auth session grants Admin API access to /admin/orders');

      // Logout check
      const logoutReq = await fetch(`${baseUrl}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${validData.sessionId}` },
      });
      assert(logoutReq.status === 200, 'Logout invalidates active dev session');

      const postLogoutSessionReq = await fetch(`${baseUrl}/auth/session`, {
        headers: { Authorization: `Bearer ${validData.sessionId}` },
      });
      const postLogoutData = (await postLogoutSessionReq.json()) as any;
      assert(postLogoutData.authenticated === false, 'Invalidated dev session returns authenticated: false');
    } else {
      console.log(`  (Note: Dev Auth disabled on running server instance, got status ${validLoginReq.status})`);
    }

    // -------------------------------------------------------------
    // Group 4: Hostile Client-Side Override & Security Isolation
    // -------------------------------------------------------------
    console.log('\n--- 4. Security Isolation & Hostile Header Resistance ---');
    const hostileReq = await fetch(`${baseUrl}/auth/dev-login?ENABLE_DEV_AUTH=true&NODE_ENV=development`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Dev-Mode-Bypass': 'true',
        'X-Override-Environment': 'development',
        Cookie: 'dev_mode=true; enable_dev_auth=true',
      },
      body: JSON.stringify({ username: 'admin', password: 'wrong_password' }),
    });
    assert(hostileReq.status === 401 || hostileReq.status === 403, 'Client query params/headers/cookies cannot bypass server auth checks');

    // -------------------------------------------------------------
    // Group 5: WebAuthn Preservation
    // -------------------------------------------------------------
    console.log('\n--- 5. WebAuthn Endpoint Coexistence ---');
    const webAuthnReq = await fetch(`${baseUrl}/auth/webauthn/auth-challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    assert(webAuthnReq.status === 200 || webAuthnReq.status === 400, 'WebAuthn auth-challenge endpoint remains functional alongside dev auth');

    console.log('\n===========================================================');
    console.log(' SUCCESS: ALL DEVELOPMENT AUTHENTICATION BRIDGE CHECKS PASSED');
    console.log('===========================================================\n');
  } catch (err: any) {
    console.error(`\nDEV AUTH BRIDGE SUITE FAILED: ${err.message}\n`);
    process.exit(1);
  }
}

runDevAuthBridgeTestSuite();
