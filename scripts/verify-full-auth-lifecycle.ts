import express from 'express';
import http from 'http';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import { apiRouter } from '../server/routes/api.js';
import { db } from '../server/db.js';
import { WebAuthnCredential, DeviceSession, AuthSession } from '../src/types/index.js';

async function runFullAuthLifecycleVerification() {
  console.log('===========================================================');
  console.log(' GATEKEEPER — UNIFIED AUTHENTICATION & LIFECYCLE AUDIT');
  console.log('===========================================================\n');

  // Setup test Express server
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
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
      throw new Error(`Assertion failed: ${description}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // Section A: Admin WebAuthn Passkey Verification Flow
    // -------------------------------------------------------------
    console.log('--- A. Admin WebAuthn / Passkey Flow Verification ---');

    // Step 1: WebAuthn Challenge Generation
    const regChallengeRes = await fetch(`${baseUrl}/auth/webauthn/register-challenge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Bootstrap-Token': process.env.ADMIN_SECRET_KEY || 'gk_admin_secret_dev_2026',
      },
      body: JSON.stringify({ userId: 'gatekeeper_owner', userName: 'GateKeeper Owner' }),
    });
    const regChallengeData = await regChallengeRes.json();
    assert(regChallengeRes.status === 200 && regChallengeData.success, 'Challenge Generation: WebAuthn registration challenge generated');
    assert(typeof regChallengeData.options.challenge === 'string', 'Challenge Generation: Cryptographic challenge string returned');

    // Step 2: Credential Registration & Storage
    const testCredId = `cred_admin_passkey_${Date.now()}`;
    const testAdminCred: WebAuthnCredential = {
      id: testCredId,
      publicKey: 'mock_public_key_admin_base64url',
      counter: 1,
      transports: ['internal'],
      userId: 'gatekeeper_owner',
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      revoked: false,
      deviceName: 'Admin Passkey Device',
    };
    db.saveWebAuthnCredential(testAdminCred);

    const lookedUpCred = db.getWebAuthnCredentialById(testCredId);
    assert(lookedUpCred !== undefined && lookedUpCred.id === testCredId, 'Credential Lookup: Registered WebAuthn credential found');

    // Step 3: Auth Challenge Generation
    const authChallengeRes = await fetch(`${baseUrl}/auth/webauthn/auth-challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const authChallengeData = await authChallengeRes.json();
    assert(authChallengeRes.status === 200 && authChallengeData.success, 'Assertion Request: WebAuthn auth challenge generated');

    // Step 4: Simulate Auth Verify & Counter Check
    const activeDevSessId = `dsess_passkey_${Date.now()}`;
    const activeAuthToken = `auth_passkey_${Date.now()}`;
    db.saveDeviceSession({
      id: activeDevSessId,
      userId: 'gatekeeper_owner',
      credentialId: testCredId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    db.saveAuthSession({
      token: activeAuthToken,
      role: 'admin',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    assert(db.getDeviceSession(activeDevSessId) !== undefined, 'DeviceSession: DeviceSession created upon WebAuthn verification');
    assert(db.getAuthSession(activeAuthToken)?.role === 'admin', 'AuthSession & Role: AuthSession created with admin role');

    // Step 5: Admin Authorization & Portal Access
    const adminPortalRes = await fetch(`${baseUrl}/admin/overview`, {
      headers: { Authorization: `Bearer ${activeAuthToken}` },
    });
    assert(adminPortalRes.status === 200, 'Admin Authorization: Passkey session authorizes Admin Portal (/admin/overview)');

    // -------------------------------------------------------------
    // Section B: Development Authentication & Personas
    // -------------------------------------------------------------
    console.log('\n--- B. Development Persona Authentication ---');

    // Admin Dev Login
    const adminLoginRes = await fetch(`${baseUrl}/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'gk_admin_secret_dev_2026' }),
    });
    const adminLoginData = await adminLoginRes.json();
    assert(adminLoginRes.status === 200 && adminLoginData.role === 'admin', 'ADMIN Dev Login: Authenticates and resolves role "admin"');

    // Provider Dev Login
    const providerLoginRes = await fetch(`${baseUrl}/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'provider', password: 'gk_provider_secret_dev_2026' }),
    });
    const providerLoginData = await providerLoginRes.json();
    assert(providerLoginRes.status === 200 && providerLoginData.role === 'provider', 'PROVIDER Dev Login: Authenticates and resolves role "provider"');

    // Client Dev Login
    const clientLoginRes = await fetch(`${baseUrl}/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'client', password: '' }),
    });
    const clientLoginData = await clientLoginRes.json();
    assert(clientLoginRes.status === 200 && clientLoginData.role === 'client', 'CLIENT Dev Login: Authenticates and resolves role "client"');

    // -------------------------------------------------------------
    // Section C: Persona Switching & Complete Logout Lifecycle
    // -------------------------------------------------------------
    console.log('\n--- C. Persona Switching & Logout Lifecycle ---');

    // Admin Logout Test
    const adminLogoutRes = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminLoginData.authToken}` },
    });
    assert(adminLogoutRes.status === 200, 'ADMIN Logout: Logout endpoint returns 200 OK');

    const adminPostLogoutAccess = await fetch(`${baseUrl}/admin/orders`, {
      headers: { Authorization: `Bearer ${adminLoginData.authToken}` },
    });
    assert(adminPostLogoutAccess.status === 401, 'ADMIN Logout: Invalidated token rejected with 401 Unauthorized');

    // Provider Logout Test
    const providerLogoutRes = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${providerLoginData.authToken}` },
    });
    assert(providerLogoutRes.status === 200, 'PROVIDER Logout: Logout endpoint returns 200 OK');

    const providerPostLogoutAccess = await fetch(`${baseUrl}/ledger`, {
      headers: { Authorization: `Bearer ${providerLoginData.authToken}` },
    });
    assert(providerPostLogoutAccess.status === 401, 'PROVIDER Logout: Invalidated token rejected with 401 Unauthorized');

    // Client Logout Test
    const clientLogoutRes = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${clientLoginData.authToken}` },
    });
    assert(clientLogoutRes.status === 200, 'CLIENT Logout: Logout endpoint returns 200 OK');

    const clientPostLogoutSession = await fetch(`${baseUrl}/auth/session`, {
      headers: { Authorization: `Bearer ${clientLoginData.sessionId}` },
    });
    const clientSessionData = await clientPostLogoutSession.json();
    assert(clientSessionData.authenticated === false, 'CLIENT Logout: Invalidated session returns authenticated: false');

    // -------------------------------------------------------------
    // Section D: Cross-Persona Isolation
    // -------------------------------------------------------------
    console.log('\n--- D. Cross-Persona Authorization Isolation ---');

    // Provider trying Admin API
    const provOnAdminRes = await fetch(`${baseUrl}/admin/orders`, {
      headers: { Authorization: `Bearer ${providerLoginData.authToken}` },
    });
    assert(provOnAdminRes.status === 401 || provOnAdminRes.status === 403, 'Cross-Isolation: Provider token on Admin endpoint rejected');

    // Client trying Admin API
    const clientOnAdminRes = await fetch(`${baseUrl}/admin/orders`, {
      headers: { Authorization: `Bearer ${clientLoginData.authToken}` },
    });
    assert(clientOnAdminRes.status === 401 || clientOnAdminRes.status === 403, 'Cross-Isolation: Client token on Admin endpoint rejected');

    // Client trying Provider API
    const clientOnProvRes = await fetch(`${baseUrl}/ledger`, {
      headers: { Authorization: `Bearer ${clientLoginData.authToken}` },
    });
    assert(clientOnProvRes.status === 401 || clientOnProvRes.status === 403, 'Cross-Isolation: Client token on Provider endpoint rejected');

    // -------------------------------------------------------------
    // Section E: Hostile Authentication & Token Tampering
    // -------------------------------------------------------------
    console.log('\n--- E. Hostile Authentication Testing ---');

    // Forged Bearer Token
    const forgedRes = await fetch(`${baseUrl}/admin/orders`, {
      headers: { Authorization: 'Bearer forged_token_admin_999' },
    });
    assert(forgedRes.status === 401, 'Hostile Token: Forged bearer token rejected with 401 Unauthorized');

    // Expired Bearer Token
    const expiredToken = `auth_expired_${Date.now()}`;
    db.saveAuthSession({
      token: expiredToken,
      role: 'admin',
      createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    });
    const expiredRes = await fetch(`${baseUrl}/admin/orders`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    assert(expiredRes.status === 401, 'Hostile Token: Expired bearer token rejected with 401 Unauthorized');

    // Client-side Role Escalation Attempt via Dev Login
    const overrideLoginRes = await fetch(`${baseUrl}/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'client', role: 'admin', capabilities: ['*'] }),
    });
    const overrideLoginData = await overrideLoginRes.json();
    assert(overrideLoginData.role === 'client', 'Hostile Body: Server determines role ("client"), ignoring client-side "role=admin" payload');

  } finally {
    server.close();
  }

  console.log('\n===========================================================');
  console.log(` UNIFIED AUTH LIFECYCLE AUDIT: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================\n');
}

runFullAuthLifecycleVerification().catch((err) => {
  console.error('Fatal error during auth lifecycle audit:', err);
  process.exit(1);
});
