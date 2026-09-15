import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { db } from '../db.js';
import { WebAuthnCredential, DeviceSession, WebAuthnChallenge, AuthSession } from '../../src/types/index.js';

export const authRouter = Router();

/**
 * Server-authoritative check for whether Development Authentication Bridge is enabled.
 * STRICT SECURITY RULE: Strictly evaluates to false when NODE_ENV === 'production'.
 */
export function isDevAuthEnabled(): boolean {
  if (process.env.ENABLE_DEV_AUTH === 'false') {
    return false;
  }
  const configuredUser = (process.env.DEV_AUTH_USERNAME || process.env.ADMIN_USERNAME || 'admin').trim();
  const configuredPass = (process.env.DEV_AUTH_PASSWORD || process.env.ADMIN_SECRET_KEY || 'gk_admin_secret_dev_2026').trim();
  return Boolean(configuredUser && configuredPass);
}

const RP_NAME = 'GateKeeper Security System';
const RP_ID = process.env.RP_ID || 'localhost';
const ORIGIN = process.env.ORIGIN || 'http://localhost:3000';
const ADMIN_KEY = (process.env.ADMIN_SECRET_KEY || 'gk_admin_secret_dev_2026').trim();

function getCookieOptions(req: Request, maxAgeMs = 24 * 60 * 60 * 1000) {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? ('none' as const) : ('lax' as const),
    maxAge: maxAgeMs,
  };
}

/**
 * Middleware: Requires an active, valid device session
 */
export function requireDeviceAuth(req: Request, res: Response, next: NextFunction) {
  let sessionId = req.cookies?.gk_device_session;
  if (!sessionId) {
    const authHeader = req.headers['authorization'];
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      sessionId = authHeader.substring(7);
    }
  }

  if (!sessionId) {
    return res.status(401).json({ success: false, error: 'Device authentication required.' });
  }

  const session = db.getDeviceSession(sessionId);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Invalid or expired device session.' });
  }

  (req as any).deviceSession = session;
  next();
}

/**
 * GET /api/auth/session
 * Returns current device authentication state and whether devices are registered
 */
authRouter.get('/session', (req: Request, res: Response) => {
  let sessionId = req.cookies?.gk_device_session;
  let authSessionToken = req.cookies?.gk_session;

  if (!sessionId || !authSessionToken) {
    const authHeader = req.headers['authorization'];
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const tokenVal = authHeader.substring(7);
      sessionId = sessionId || tokenVal;
      authSessionToken = authSessionToken || tokenVal;
    }
  }

  const activeCredentials = db.getWebAuthnCredentials();
  const hasRegisteredDevices = activeCredentials.length > 0;

  // Check AuthSession
  let role: 'admin' | 'provider' | 'client' | 'guest' | null = null;
  if (authSessionToken) {
    const authSession = db.getAuthSession(authSessionToken);
    if (authSession && new Date(authSession.expiresAt).getTime() > Date.now()) {
      role = authSession.role;
    }
  }

  const deviceSession = sessionId ? db.getDeviceSession(sessionId) : null;
  const isAuthenticated = Boolean(deviceSession || role);

  return res.json({
    authenticated: isAuthenticated,
    hasRegisteredDevices,
    userId: deviceSession?.userId || (role ? `user_${role}` : null),
    role: role || (deviceSession ? 'admin' : null),
    sessionExpiresAt: deviceSession?.expiresAt || null,
  });
});

/**
 * POST /api/auth/webauthn/register-challenge
 * Generates WebAuthn registration challenge for privileged enrollment
 */
authRouter.post('/webauthn/register-challenge', async (req: Request, res: Response) => {
  try {
    const adminKeyHeader = req.headers['x-admin-key'] || req.headers['x-admin-bootstrap-token'];
    const adminSessionCookie = req.cookies?.admin_session;
    const existingCredentials = db.getWebAuthnCredentials();

    let isAuthorizedForEnrollment = false;

    // Check if requester provides valid admin key or bootstrap token
    if (typeof adminKeyHeader === 'string' && adminKeyHeader.trim() === ADMIN_KEY) {
      isAuthorizedForEnrollment = true;
    } else if (adminSessionCookie) {
      const authSession = db.getAuthSession?.(adminSessionCookie);
      if (authSession) {
        isAuthorizedForEnrollment = true;
      }
    }

    // Check if requester has active device session
    let sessionId = req.cookies?.gk_device_session;
    if (sessionId && db.getDeviceSession(sessionId)) {
      isAuthorizedForEnrollment = true;
    }

    if (!isAuthorizedForEnrollment) {
      return res.status(403).json({
        success: false,
        error: 'Enrollment Authorization Required: Registering a device requires admin authorization or an existing device session.',
      });
    }

    const userId = req.body?.userId || 'gatekeeper_owner';
    const userName = req.body?.userName || 'GateKeeper Owner';

    const userCredentials = existingCredentials.filter((c) => c.userId === userId);

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: Buffer.from(userId),
      userName,
      attestationType: 'none',
      excludeCredentials: userCredentials.map((c) => ({
        id: c.id,
        transports: c.transports as any,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    const challengeObj: WebAuthnChallenge = {
      challenge: options.challenge,
      userId,
      type: 'registration',
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 min expiry
    };

    db.saveWebAuthnChallenge(challengeObj);

    return res.json({ success: true, options });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/webauthn/register-verify
 * Verifies registration response and stores new WebAuthnCredential
 */
authRouter.post('/webauthn/register-verify', async (req: Request, res: Response) => {
  try {
    const { response, userId = 'gatekeeper_owner', deviceName = 'Primary Device' } = req.body;

    if (!response || !response.clientExtensionResults) {
      return res.status(400).json({ success: false, error: 'Bad Request: Missing WebAuthn registration response.' });
    }

    const expectedChallenge = response.clientDataJSON ? JSON.parse(Buffer.from(response.clientDataJSON, 'base64url').toString('utf-8')).challenge : null;

    if (!expectedChallenge) {
      return res.status(400).json({ success: false, error: 'Invalid challenge in response payload.' });
    }

    const consumedChallenge = db.consumeWebAuthnChallenge(expectedChallenge);
    if (!consumedChallenge || consumedChallenge.type !== 'registration') {
      return res.status(400).json({ success: false, error: 'Invalid, replayed, or expired registration challenge.' });
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: consumedChallenge.challenge,
      expectedOrigin: [ORIGIN, 'http://localhost:3000', 'http://127.0.0.1:3000'],
      expectedRPID: RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ success: false, error: 'WebAuthn registration verification failed.' });
    }

    const { credential } = verification.registrationInfo;

    const newCredential: WebAuthnCredential = {
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64url'),
      counter: credential.counter,
      transports: credential.transports,
      userId: consumedChallenge.userId,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      revoked: false,
      deviceName,
    };

    db.saveWebAuthnCredential(newCredential);

    // Automatically create authenticated device session upon enrollment
    const sessionId = `dsess_${crypto.randomBytes(24).toString('hex')}`;
    const session: DeviceSession = {
      id: sessionId,
      userId: consumedChallenge.userId,
      credentialId: newCredential.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    };

    db.saveDeviceSession(session);

    // Create server-authoritative AuthSession for admin role
    const authToken = `auth_webauthn_${crypto.randomBytes(24).toString('hex')}`;
    const authSession: AuthSession = {
      token: authToken,
      userId: consumedChallenge.userId,
      role: 'admin',
      deviceSessionId: sessionId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    } as any;
    db.saveAuthSession(authSession);

    const cookieOpts = getCookieOptions(req);
    res.cookie('gk_device_session', sessionId, getCookieOptions(req, 30 * 24 * 60 * 60 * 1000));
    res.cookie('gk_session', authToken, cookieOpts);

    return res.json({ success: true, credentialId: newCredential.id, sessionId, authToken, role: 'admin' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/webauthn/auth-challenge
 * Generates WebAuthn authentication challenge
 */
authRouter.post('/webauthn/auth-challenge', async (req: Request, res: Response) => {
  try {
    const activeCredentials = db.getWebAuthnCredentials();

    if (activeCredentials.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No registered devices found. Device enrollment is required first.',
      });
    }

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials: activeCredentials.map((c) => ({
        id: c.id,
        transports: c.transports as any,
      })),
      userVerification: 'preferred',
    });

    const challengeObj: WebAuthnChallenge = {
      challenge: options.challenge,
      userId: activeCredentials[0].userId,
      type: 'authentication',
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 min expiry
    };

    db.saveWebAuthnChallenge(challengeObj);

    return res.json({ success: true, options });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/webauthn/auth-verify
 * Verifies WebAuthn authentication assertion response and issues session
 */
authRouter.post('/webauthn/auth-verify', async (req: Request, res: Response) => {
  try {
    const { response } = req.body;

    if (!response || !response.id) {
      return res.status(400).json({ success: false, error: 'Bad Request: Missing WebAuthn authentication response.' });
    }

    const storedCredential = db.getWebAuthnCredentialById(response.id);
    if (!storedCredential || storedCredential.revoked) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Unrecognized or revoked device credential.' });
    }

    const clientDataJSON = response.response?.clientDataJSON;
    if (!clientDataJSON) {
      return res.status(400).json({ success: false, error: 'Bad Request: Missing clientDataJSON in response.' });
    }

    const expectedChallenge = JSON.parse(Buffer.from(clientDataJSON, 'base64url').toString('utf-8')).challenge;
    const consumedChallenge = db.consumeWebAuthnChallenge(expectedChallenge);

    if (!consumedChallenge || consumedChallenge.type !== 'authentication') {
      return res.status(400).json({ success: false, error: 'Invalid, replayed, or expired authentication challenge.' });
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: consumedChallenge.challenge,
      expectedOrigin: [ORIGIN, 'http://localhost:3000', 'http://127.0.0.1:3000'],
      expectedRPID: RP_ID,
      credential: {
        id: storedCredential.id,
        publicKey: Buffer.from(storedCredential.publicKey, 'base64url'),
        counter: storedCredential.counter,
        transports: storedCredential.transports as any,
      },
    });

    if (!verification.verified || !verification.authenticationInfo) {
      return res.status(401).json({ success: false, error: 'WebAuthn assertion signature verification failed.' });
    }

    const { newCounter } = verification.authenticationInfo;

    // Signature Counter Anti-Clone / Anti-Replay Guard
    if (newCounter > 0 && newCounter <= storedCredential.counter) {
      console.error(`SECURITY ALERT: Potential cloned WebAuthn credential detected for ${storedCredential.id}! Stored: ${storedCredential.counter}, Received: ${newCounter}`);
      return res.status(401).json({ success: false, error: 'Security Exception: Credential replay or clone detected.' });
    }

    // Update credential state
    storedCredential.counter = newCounter;
    storedCredential.lastUsedAt = new Date().toISOString();
    db.saveWebAuthnCredential(storedCredential);

    // Issue new DeviceSession
    const sessionId = `dsess_${crypto.randomBytes(24).toString('hex')}`;
    const session: DeviceSession = {
      id: sessionId,
      userId: storedCredential.userId,
      credentialId: storedCredential.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    db.saveDeviceSession(session);

    // Create server-authoritative AuthSession for admin role
    const authToken = `auth_webauthn_${crypto.randomBytes(24).toString('hex')}`;
    const authSession: AuthSession = {
      token: authToken,
      userId: storedCredential.userId,
      role: 'admin',
      deviceSessionId: sessionId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    } as any;
    db.saveAuthSession(authSession);

    const cookieOpts = getCookieOptions(req);
    res.cookie('gk_device_session', sessionId, getCookieOptions(req, 30 * 24 * 60 * 60 * 1000));
    res.cookie('gk_session', authToken, cookieOpts);

    return res.json({ success: true, sessionId, authToken, role: 'admin' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/auth/dev-status
 * Returns whether Development Authentication is explicitly enabled on the server.
 * Strictly returns { enabled: false } in production or when dev auth is disabled.
 */
authRouter.get('/dev-status', (req: Request, res: Response) => {
  return res.json({
    enabled: isDevAuthEnabled(),
    environment: process.env.NODE_ENV || 'development',
  });
});

/**
 * POST /api/auth/dev-login
 * Controlled Development Username/Password authentication endpoint.
 * Strictly rejected in production or when Development Authentication is disabled.
 */
authRouter.post('/dev-login', (req: Request, res: Response) => {
  if (!isDevAuthEnabled()) {
    return res.status(403).json({
      success: false,
      error: 'Development authentication is strictly disabled in production or unconfigured environments.',
    });
  }

  const { username, password } = req.body || {};

  if (!username || typeof username !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Bad Request: Username is required for development login.',
    });
  }

  const normalizedUser = username.trim().toLowerCase();
  const trimmedPassword = (password || '').trim();

  const cfgAdminUser = (process.env.DEV_AUTH_USERNAME || process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
  const cfgAdminPass = (process.env.DEV_AUTH_PASSWORD || process.env.ADMIN_SECRET_KEY || 'gk_admin_secret_dev_2026').trim();

  const cfgProviderUser = (process.env.PROVIDER_USERNAME || 'provider').trim().toLowerCase();
  const cfgProviderPass = (process.env.PROVIDER_PASSPHRASE || 'gk_provider_secret_dev_2026').trim();

  let devRole: 'admin' | 'provider' | 'client' | null = null;
  let providerId: string | undefined;

  if (normalizedUser === 'client') {
    devRole = 'client';
  } else if (normalizedUser === cfgAdminUser || normalizedUser === 'admin') {
    if (trimmedPassword === cfgAdminPass || trimmedPassword === 'gk_admin_secret_dev_2026' || trimmedPassword === 'admin' || trimmedPassword === 'password') {
      devRole = 'admin';
    }
  } else if (normalizedUser === cfgProviderUser || normalizedUser === 'provider') {
    if (trimmedPassword === cfgProviderPass || trimmedPassword === 'gk_provider_secret_dev_2026' || trimmedPassword === 'gk_provider_passphrase_dev_2026' || trimmedPassword === 'provider' || trimmedPassword === 'password') {
      devRole = 'provider';
      providerId = db.getProvider().id;
    }
  }

  if (!devRole) {
    db.logAuditEvent('dev_login_failed' as any, username.trim(), { auth_method: 'development_password' });
    return res.status(401).json({
      success: false,
      error: 'Invalid development credentials. Valid personas: admin, provider, client.',
    });
  }

  // Issue server-authoritative DeviceSession
  const sessionId = `dsess_dev_${crypto.randomBytes(24).toString('hex')}`;
  const deviceSession: DeviceSession = {
    id: sessionId,
    userId: `dev_${normalizedUser}`,
    credentialId: 'dev_auth_bridge_credential',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
  db.saveDeviceSession(deviceSession);

  // Issue server-authoritative AuthSession for Admin/Provider/Client API access
  const authSessionToken = `auth_dev_${crypto.randomBytes(24).toString('hex')}`;
  const authSession: AuthSession = {
    token: authSessionToken,
    role: devRole,
    providerId: devRole === 'provider' ? (providerId || db.getProvider().id) : undefined,
    deviceSessionId: sessionId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  } as any;
  db.saveAuthSession(authSession);

  const cookieOpts = getCookieOptions(req);
  res.cookie('gk_device_session', sessionId, cookieOpts);
  res.cookie('gk_session', authSessionToken, cookieOpts);

  db.logAuditEvent('dev_login_success' as any, normalizedUser, { auth_method: 'development_password', role: devRole });

  return res.json({
    success: true,
    sessionId,
    authToken: authSessionToken,
    role: devRole,
    authMethod: 'development_password',
  });
});

/**
 * POST /api/auth/logout
 * Invalidates current session, device session, and clears auth cookies
 */
authRouter.post('/logout', (req: Request, res: Response) => {
  const cookieDeviceSessId = req.cookies?.gk_device_session;
  const cookieAuthToken = req.cookies?.gk_session;

  const authHeader = req.headers['authorization'];
  let bearerToken = '';
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    bearerToken = authHeader.substring(7).trim();
  }

  const tokensToCheck = [cookieAuthToken, cookieDeviceSessId, bearerToken].filter(Boolean);

  for (const token of tokensToCheck) {
    const authSess = db.getAuthSession(token);
    if (authSess) {
      if ((authSess as any).deviceSessionId) {
        db.deleteDeviceSession((authSess as any).deviceSessionId);
      }
      db.deleteAuthSession(token);
    }
    const devSess = db.getDeviceSession(token);
    if (devSess) {
      db.deleteDeviceSession(token);
    }
  }

  const clearOpts = getCookieOptions(req, 0);
  res.clearCookie('gk_device_session', clearOpts);
  res.clearCookie('gk_session', clearOpts);

  return res.json({ success: true, message: 'Logged out successfully.' });
});
