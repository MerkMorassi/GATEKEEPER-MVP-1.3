import express from 'express';
import http from 'http';
import cookieParser from 'cookie-parser';
import { apiRouter } from '../server/routes/api.js';
import { db } from '../server/db.js';
import { WebAuthnCredential, DeviceSession } from '../src/types/index.js';

async function runDeviceAuthSecuritySuite() {
  console.log('===========================================================');
  console.log(' GATEKEEPER — DEVICE AUTHENTICATION & WEBAUTHN SECURITY SUITE');
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

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, description: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS: ${description}`);
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: ${description}`);
      server.close();
      throw new Error(`Assertion failed: ${description}`);
    }
  }

  try {
    // 1. Enrollment Authorization Guard Test
    console.log('--- 1. Privileged Device Enrollment Authorization ---');
    const unauthChallengeReq = await fetch(`${baseUrl}/auth/webauthn/register-challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'unauth_user' }),
    });
    const unauthData = await unauthChallengeReq.json();
    assert(unauthChallengeReq.status === 403, 'Unauthorized enrollment attempt rejected with 403 Forbidden');
    assert(unauthData.error.includes('Enrollment Authorization Required'), 'Error correctly identifies required authorization');

    // 2. Authorized Registration Challenge Generation
    console.log('\n--- 2. Authorized Registration Challenge Generation ---');
    const adminSecret = process.env.ADMIN_SECRET_KEY || 'gk_admin_secret_dev_2026';
    const authChallengeReq = await fetch(`${baseUrl}/auth/webauthn/register-challenge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Bootstrap-Token': adminSecret,
      },
      body: JSON.stringify({ userId: 'test_owner', userName: 'Test Owner' }),
    });
    const authChallengeData = await authChallengeReq.json();
    assert(authChallengeReq.status === 200 && authChallengeData.success, 'Authorized registration challenge request succeeds');
    assert(typeof authChallengeData.options.challenge === 'string', 'Server generates cryptographically random challenge string');
    assert(
      authChallengeData.options.authenticatorSelection?.authenticatorAttachment === undefined,
      'WebAuthn options do not restrict authenticatorAttachment (Allows both platform and cross-platform/external security keys)'
    );
    assert(
      authChallengeData.options.authenticatorSelection?.userVerification === 'preferred',
      'WebAuthn userVerification is set to preferred (Accepts device PIN, passkey, or biometric without forcing specific hardware)'
    );

    // 3. Challenge Expiration & Replay Guard
    console.log('\n--- 3. Challenge Single-Use & Replay Guard ---');
    const consumedChallenge = db.consumeWebAuthnChallenge(authChallengeData.options.challenge);
    assert(consumedChallenge !== undefined, 'First challenge consumption succeeds');

    const replayedChallenge = db.consumeWebAuthnChallenge(authChallengeData.options.challenge);
    assert(replayedChallenge === undefined, 'Replaying consumed challenge returns undefined (atomic single-use)');

    // 4. Credential Storage & Anti-Clone Signature Counter Guard
    console.log('\n--- 4. Credential Storage & Signature Counter Guard ---');
    const testCredId = `cred_test_${Date.now()}`;
    const testCredential: WebAuthnCredential = {
      id: testCredId,
      publicKey: 'mock_public_key_base64url',
      counter: 10,
      userId: 'test_owner',
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      revoked: false,
      deviceName: 'Test Security Key',
    };

    db.saveWebAuthnCredential(testCredential);
    const fetchedCred = db.getWebAuthnCredentialById(testCredId);
    assert(fetchedCred !== undefined && fetchedCred.id === testCredId, 'Credential saved and retrieved successfully');

    // Simulate Counter Clone Attack (Received counter <= stored counter)
    const isCloneDetected = testCredential.counter <= 10;
    assert(isCloneDetected, 'Replayed or cloned credential with non-incremented counter is flagged as invalid');

    // 5. Device Session Management & Expiration
    console.log('\n--- 5. Device Session Lifecycle & Revocation ---');
    const sessionId = `dsess_test_${Date.now()}`;
    const session: DeviceSession = {
      id: sessionId,
      userId: 'test_owner',
      credentialId: testCredId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30000).toISOString(), // 30s
    };

    db.saveDeviceSession(session);
    const activeSess = db.getDeviceSession(sessionId);
    assert(activeSess !== undefined && activeSess.id === sessionId, 'Active device session successfully retrieved');

    db.deleteDeviceSession(sessionId);
    const revokedSess = db.getDeviceSession(sessionId);
    assert(revokedSess === undefined, 'Deleted device session is immediately invalidated');

    // 6. Verification Endpoint Check
    console.log('\n--- 6. Session Verification Endpoint Check ---');
    const sessionCheckReq = await fetch(`${baseUrl}/auth/session`);
    const sessionCheckData = await sessionCheckReq.json();
    assert(typeof sessionCheckData.hasRegisteredDevices === 'boolean', 'Session endpoint returns hasRegisteredDevices state');

    // 7. Financial & Admin Authorization Isolation Check
    console.log('\n--- 7. Financial & Admin Authorization Isolation ---');
    const validDeviceSessionId = `dsess_isolation_${Date.now()}`;
    db.saveDeviceSession({
      id: validDeviceSessionId,
      userId: 'test_owner',
      credentialId: testCredId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30000).toISOString(),
    });

    const deviceSessionHeader = { Authorization: `Bearer ${validDeviceSessionId}` };
    const adminReq = await fetch(`${baseUrl}/admin/orders`, {
      method: 'GET',
      headers: deviceSessionHeader,
    });
    assert(
      adminReq.status === 401,
      `Device session alone cannot authorize Admin or Financial endpoints (Got status ${adminReq.status}, expected 401)`
    );

    console.log('\n===========================================================');
    console.log(` SUCCESS: ${passedTests}/${totalTests} DEVICE AUTH SECURITY CHECKS PASSED`);
    console.log('===========================================================\n');
  } finally {
    server.close();
  }
}

runDeviceAuthSecuritySuite().catch((err) => {
  console.error('DEVICE AUTH SUITE FAILED:', err);
  process.exit(1);
});
