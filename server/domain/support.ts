import { db } from '../db.js';
import { SupportContext } from '../../src/types/index.js';

export interface CreateSupportContextParams {
  reasonCode: string;
  sessionId: string;
  paymentId?: string;
  recommendedAction: string;
  details?: Record<string, any>;
}

/**
 * Server-Side Handler for System-Defined Exceptions
 *
 * Constructs and persists a structured SupportContext object.
 * HARD INVARIANTS:
 * 1. identityAccessRequired MUST BE false (Does NOT grant unmasked access to protected identity data).
 * 2. refundAuthorized MUST BE false (Does NOT execute automatic financial refunds or payouts).
 */
export function generateSupportContext(params: CreateSupportContextParams): SupportContext {
  const supportContext: SupportContext = {
    id: `supp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    reasonCode: params.reasonCode,
    sessionId: params.sessionId,
    paymentId: params.paymentId,
    recommendedAction: params.recommendedAction,
    // Invariants enforced at construction time
    identityAccessRequired: false,
    refundAuthorized: false,
    createdAt: new Date().toISOString(),
  };

  db.saveSupportContext(supportContext);

  db.logAuditEvent('SUPPORT_CONTEXT_CREATED', 'system', {
    supportContextId: supportContext.id,
    reasonCode: supportContext.reasonCode,
    sessionId: supportContext.sessionId,
    paymentId: supportContext.paymentId,
    identityAccessRequired: false,
    refundAuthorized: false,
    details: params.details || {},
  });

  return supportContext;
}
