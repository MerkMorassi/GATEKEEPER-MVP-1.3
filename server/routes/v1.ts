import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from '../db.js';
import { ApiKeyRecord, Order, Entitlement } from '../../src/types/index.js';
import { createEntitlement } from '../domain/access.js';

export const v1Router = Router();

// Extend Express Request to attach apiKey
export interface AuthenticatedApiRequest extends Request {
  apiKey?: ApiKeyRecord;
}

/**
 * Standardized API Key Authentication Middleware
 * Supports:
 * - Header: X-API-Key: gk_live_...
 * - Header: Authorization: Bearer gk_live_...
 * - Query parameter: ?api_key=gk_live_...
 */
export function requireApiKey(req: AuthenticatedApiRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  let keyString: string | undefined;

  if (req.headers['x-api-key']) {
    keyString = String(req.headers['x-api-key']).trim();
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    keyString = authHeader.substring(7).trim();
  } else if (req.query.api_key) {
    keyString = String(req.query.api_key).trim();
  }

  if (!keyString) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing API Key. Provide via X-API-Key header or Authorization: Bearer gk_...',
      docsUrl: '/#admin/api',
    });
  }

  const origin = req.headers['origin'] || req.headers['referer'] ? String(req.headers['origin'] || req.headers['referer']) : undefined;
  const validation = db.validateApiKey(keyString, origin);

  if (!validation.valid || !validation.keyRecord) {
    return res.status(403).json({
      success: false,
      error: validation.error || 'Forbidden: Invalid or inactive API key.',
    });
  }

  req.apiKey = validation.keyRecord;
  next();
}

// 1. Health & Protocol Status
v1Router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    protocol: 'GateKeeper REST v1',
    status: 'operational',
    timestamp: new Date().toISOString(),
    capabilities: ['checkout_sessions', 'pass_verification', 'pass_inspection', 'escrow_release', 'embed_widget'],
  });
});

// 2. Services & Pricing Tiers Catalog
v1Router.get('/services', requireApiKey, (_req: AuthenticatedApiRequest, res: Response) => {
  try {
    const provider = db.getProvider();
    const services = (provider.services || []).map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      feeCents: s.feeCents,
      currency: s.currency || 'USD',
      isTrial: !!s.isTrial,
      serviceType: s.serviceType || 'ONE_ON_ONE',
      durationMinutes: s.defaultDurationMinutes || 15,
      allowedDurations: s.allowedDurations || [s.defaultDurationMinutes || 15],
      passType: s.passType || 'single_use',
      expirationDays: s.expirationDays || 7,
    }));

    return res.json({
      success: true,
      providerId: provider.id,
      providerName: provider.name,
      currency: 'USD',
      services,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Create Checkout & Paywalled Booking Session
v1Router.post('/checkout/sessions', requireApiKey, async (req: AuthenticatedApiRequest, res: Response) => {
  try {
    const {
      serviceId,
      amountCents,
      currency = 'USD',
      title,
      clientEmail,
      clientName,
      clientNotes,
      customDurationMinutes,
      redirectUrl,
      cancelUrl,
      metadata,
    } = req.body || {};

    const provider = db.getProvider();
    const availableServices = provider.services || [];

    // Resolve service or create custom dynamic session
    const selectedService = serviceId ? availableServices.find((s) => s.id === serviceId) : availableServices[0];
    const finalFeeCents = amountCents !== undefined && Number.isInteger(amountCents) && amountCents >= 0
      ? amountCents
      : selectedService?.feeCents ?? 15000;
    
    const finalDurationMinutes = customDurationMinutes || selectedService?.defaultDurationMinutes || 15;
    const finalServiceName = title || selectedService?.name || 'GateKeeper Paywalled Access';

    const orderId = `ord_v1_${crypto.randomBytes(6).toString('hex')}`;
    const cleanClientEmail = clientEmail ? String(clientEmail).trim().toLowerCase() : 'guest@gatekeeper.local';
    const cleanClientName = clientName ? String(clientName).trim() : 'Guest Client';

    // Auto-provision or update Client User
    if (clientEmail && String(clientEmail).includes('@')) {
      db.autoProvisionClientUser(cleanClientEmail, cleanClientName, {
        source: 'api_v1_checkout',
        apiKeyId: req.apiKey?.id,
        orderId,
      });
    }

    const isTrial = finalFeeCents === 0;
    const providerShareCents = Math.floor(finalFeeCents * 0.85);
    const platformShareCents = finalFeeCents - providerShareCents;

    const order: Order = {
      id: orderId,
      providerId: provider.id,
      serviceId: selectedService?.id || 'srv_custom',
      serviceName: finalServiceName,
      amountCents: finalFeeCents,
      currency: currency.toUpperCase(),
      status: isTrial ? 'confirmed' : 'payment_pending',
      financialState: isTrial ? 'captured' : 'pending',
      entitlementState: isTrial ? 'issued' : 'none',
      settlementState: isTrial ? 'payout_completed' : 'unsettled',
      sessionState: 'idle',
      serviceCents: finalFeeCents,
      tipCents: 0,
      grossTotalCents: finalFeeCents,
      providerServiceShareCents: providerShareCents,
      platformServiceShareCents: platformShareCents,
      providerTipShareCents: 0,
      platformTipShareCents: 0,
      providerTotalShareCents: providerShareCents,
      platformTotalShareCents: platformShareCents,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.saveOrder(order);

    // Resolve base application URL
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    // If zero fee (trial/free), generate entitlement immediately
    let passData: Entitlement | undefined;
    if (isTrial) {
      passData = await createEntitlement(
        order.id,
        provider.id,
        provider.facetimeHandle || 'Video Call Consultation',
        baseUrl,
        {
          durationMinutes: finalDurationMinutes,
          isTrial: true,
          serviceName: finalServiceName,
        }
      );
      db.saveEntitlement(passData);
    }

    const checkoutUrl = `${baseUrl}/#gate=${order.id}`;

    db.logAuditEvent('ORDER_CREATED', 'api_v1', {
      orderId: order.id,
      apiKeyId: req.apiKey?.id,
      amountCents: finalFeeCents,
      clientEmail: cleanClientEmail,
      redirectUrl,
      cancelUrl,
      metadata,
    });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return res.json({
      success: true,
      sessionId: order.id,
      orderId: order.id,
      status: order.status,
      checkoutUrl,
      amountCents: finalFeeCents,
      currency: order.currency,
      durationMinutes: finalDurationMinutes,
      serviceName: finalServiceName,
      expiresAt,
      pass: passData
        ? {
            token: passData.token,
            status: passData.status,
            expiresAt: passData.expiresAt,
            facetimeInstruction: passData.facetimeDeliveryInstruction,
          }
        : undefined,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Atomically Verify and Consume Single-Use Pass / Ticket Token
v1Router.post('/passes/verify', requireApiKey, (req: AuthenticatedApiRequest, res: Response) => {
  try {
    const { passToken, serviceId, operator = 'api_verifier' } = req.body || {};

    if (!passToken || typeof passToken !== 'string') {
      return res.status(400).json({
        success: false,
        valid: false,
        error: 'Missing required parameter: passToken.',
      });
    }

    const cleanToken = passToken.trim();
    const allEntitlements = db.getAllEntitlements();

    // Match by exact token or prefix
    const entitlement = allEntitlements.find(
      (e) => e.token === cleanToken || e.token.includes(cleanToken)
    );

    if (!entitlement) {
      return res.status(404).json({
        success: false,
        valid: false,
        error: 'Pass token not found.',
      });
    }

    const now = new Date();
    const expiresAt = new Date(entitlement.expiresAt);
    const isExpired = now.getTime() > expiresAt.getTime();

    if (isExpired || entitlement.status === 'expired') {
      return res.status(410).json({
        success: false,
        valid: false,
        error: 'Pass has expired.',
        pass: {
          token: entitlement.token,
          expiresAt: entitlement.expiresAt,
          isExpired: true,
          status: entitlement.status,
        },
      });
    }

    if (entitlement.status === 'redeemed' || entitlement.redeemedAt) {
      return res.status(409).json({
        success: false,
        valid: false,
        error: 'Pass has already been consumed and cannot be reused.',
        pass: {
          token: entitlement.token,
          status: entitlement.status,
          redeemedAt: entitlement.redeemedAt,
          expiresAt: entitlement.expiresAt,
        },
      });
    }

    if (entitlement.status === 'revoked') {
      return res.status(403).json({
        success: false,
        valid: false,
        error: 'Pass has been revoked.',
        pass: {
          token: entitlement.token,
          status: entitlement.status,
        },
      });
    }

    // Validate service if requested
    const order = db.getOrder(entitlement.orderId);
    if (serviceId && order && order.serviceId !== serviceId) {
      return res.status(403).json({
        success: false,
        valid: false,
        error: `Pass is valid for service ${order.serviceId}, not ${serviceId}.`,
      });
    }

    // Atomically consume pass
    entitlement.status = 'redeemed';
    entitlement.redeemedAt = now.toISOString();
    db.saveEntitlement(entitlement);

    // Update order status if applicable
    if (order && order.status !== 'cancelled') {
      order.entitlementState = 'redeemed';
      order.sessionState = 'completed';
      order.status = 'settled';
      order.updatedAt = now.toISOString();
      db.saveOrder(order);
    }

    db.logAuditEvent('SESSION_VERIFIED_AND_CONSUMED' as any, 'api_v1', {
      token: entitlement.token,
      orderId: entitlement.orderId,
      apiKeyId: req.apiKey?.id,
      operator,
    });

    const provider = db.getProvider();
    const service = provider.services?.find((s) => s.id === order?.serviceId);

    return res.json({
      success: true,
      valid: true,
      message: 'Access granted. Pass successfully verified and consumed.',
      pass: {
        token: entitlement.token,
        orderId: entitlement.orderId,
        serviceId: order?.serviceId || 'srv_custom',
        serviceName: service?.name || entitlement.serviceName || 'GateKeeper Paywalled Consultation',
        durationMinutes: entitlement.durationMinutes || 15,
        status: entitlement.status,
        redeemedAt: entitlement.redeemedAt,
        expiresAt: entitlement.expiresAt,
        facetimeInstruction: entitlement.facetimeDeliveryInstruction,
        verifiedBy: operator,
        apiKey: req.apiKey?.name,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Read-Only Pass Inspection (Without Consuming)
v1Router.get('/passes/:token', requireApiKey, (req: AuthenticatedApiRequest, res: Response) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token parameter is required.' });
    }

    const cleanToken = token.trim();
    const allEntitlements = db.getAllEntitlements();
    const entitlement = allEntitlements.find(
      (e) => e.token === cleanToken || e.token.includes(cleanToken)
    );

    if (!entitlement) {
      return res.status(404).json({ success: false, error: 'Pass token not found.' });
    }

    const now = new Date();
    const expiresAt = new Date(entitlement.expiresAt);
    const isExpired = now.getTime() > expiresAt.getTime();
    const isValid = !isExpired && entitlement.status === 'active' && !entitlement.redeemedAt;

    const order = db.getOrder(entitlement.orderId);
    const provider = db.getProvider();
    const service = provider.services?.find((s) => s.id === order?.serviceId);

    return res.json({
      success: true,
      pass: {
        token: entitlement.token,
        orderId: entitlement.orderId,
        serviceId: order?.serviceId,
        serviceName: service?.name || entitlement.serviceName || 'GateKeeper Paywalled Access',
        durationMinutes: entitlement.durationMinutes || 15,
        status: isValid ? 'active' : entitlement.status,
        isValid,
        isExpired,
        redeemedAt: entitlement.redeemedAt,
        expiresAt: entitlement.expiresAt,
        issuedAt: entitlement.createdAt,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Revoke Pass / Invalidate Access Token
v1Router.post('/passes/revoke', requireApiKey, (req: AuthenticatedApiRequest, res: Response) => {
  try {
    const { passToken, reason = 'Admin or API client revocation' } = req.body || {};
    if (!passToken || typeof passToken !== 'string') {
      return res.status(400).json({ success: false, error: 'passToken is required.' });
    }

    const cleanToken = passToken.trim();
    const allEntitlements = db.getAllEntitlements();
    const entitlement = allEntitlements.find(
      (e) => e.token === cleanToken || e.token.includes(cleanToken)
    );

    if (!entitlement) {
      return res.status(404).json({ success: false, error: 'Pass token not found.' });
    }

    // Invalidate entitlement
    entitlement.status = 'revoked';
    entitlement.revokedAt = new Date().toISOString();
    db.saveEntitlement(entitlement);

    db.logAuditEvent('SESSION_CANCELLED' as any, 'api_v1', {
      token: entitlement.token,
      orderId: entitlement.orderId,
      apiKeyId: req.apiKey?.id,
      reason,
    });

    return res.json({
      success: true,
      message: `Pass ${entitlement.token} has been revoked successfully.`,
      token: entitlement.token,
      status: entitlement.status,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Authorize Escrow Release
v1Router.post('/escrow/release', requireApiKey, (req: AuthenticatedApiRequest, res: Response) => {
  try {
    const { orderId, reason = 'Service delivery confirmed via API' } = req.body || {};
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'orderId parameter is required.' });
    }

    const order = db.getOrder(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    order.sessionState = 'completed';
    order.settlementState = 'payout_completed';
    order.status = 'settled';
    order.updatedAt = new Date().toISOString();
    db.saveOrder(order);

    db.logAuditEvent('ESCROW_RELEASE_APPROVED' as any, 'api_v1', {
      orderId,
      apiKeyId: req.apiKey?.id,
      reason,
    });

    return res.json({
      success: true,
      message: `Escrow funds for order ${orderId} marked released to provider.`,
      orderId: order.id,
      status: order.status,
      sessionState: order.sessionState,
      settlementState: order.settlementState,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
