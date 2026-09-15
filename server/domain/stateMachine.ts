import {
  OrderStatus,
  EntitlementStatus,
  FinancialState,
  EntitlementState,
  SettlementState,
  SessionState,
} from '../../src/types/index.js';

export const ALLOWED_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  created: ['payment_pending', 'paid', 'confirmed', 'cancelled'],
  payment_pending: ['paid', 'confirmed', 'manual_review', 'cancelled'],
  paid: ['confirmed', 'settlement_pending', 'settled', 'manual_review'],
  confirmed: ['settlement_pending', 'settled', 'manual_review', 'cancelled'],
  settlement_pending: ['settled', 'manual_review'],
  settled: [],
  manual_review: ['paid', 'confirmed', 'settled', 'cancelled'],
  cancelled: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return false;
  return ALLOWED_ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

export const ALLOWED_FINANCIAL_TRANSITIONS: Record<FinancialState, FinancialState[]> = {
  created: ['pending', 'failed', 'authorized', 'captured'],
  pending: ['authorized', 'captured', 'failed'],
  authorized: ['captured', 'failed'],
  captured: ['refunded', 'partially_refunded', 'disputed'],
  failed: [],
  refunded: [],
  partially_refunded: ['refunded', 'disputed'],
  disputed: ['captured', 'refunded'], // May be restored if dispute won
};

export function canTransitionFinancial(from: FinancialState, to: FinancialState): boolean {
  if (from === to) return false;
  return ALLOWED_FINANCIAL_TRANSITIONS[from]?.includes(to) ?? false;
}

export const ALLOWED_ENTITLEMENT_TRANSITIONS: Record<EntitlementState, EntitlementState[]> = {
  none: ['issued'],
  issued: ['active', 'revoked', 'expired', 'redeemed'],
  active: ['redeemed', 'expired', 'revoked'],
  redeemed: ['revoked'], // Revoked if refunded/disputed post-session
  expired: [],
  revoked: ['issued'], // Restored if dispute won & unexpired
};

export function canTransitionEntitlement(from: EntitlementState, to: EntitlementState): boolean {
  if (from === to) return false;
  return ALLOWED_ENTITLEMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export const ALLOWED_SETTLEMENT_TRANSITIONS: Record<SettlementState, SettlementState[]> = {
  unsettled: ['pending_payout', 'payout_completed', 'clawed_back', 'settlement_failed'],
  pending_payout: ['payout_completed', 'settlement_failed', 'clawed_back'],
  payout_completed: ['clawed_back'],
  clawed_back: ['pending_payout'], // If dispute won, re-eligible for payout
  settlement_failed: ['pending_payout'],
};

export function canTransitionSettlement(from: SettlementState, to: SettlementState): boolean {
  if (from === to) return false;
  return ALLOWED_SETTLEMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export const ALLOWED_SESSION_TRANSITIONS: Record<SessionState, SessionState[]> = {
  idle: ['waiting_room', 'in_call', 'completed', 'abandoned'],
  waiting_room: ['in_call', 'abandoned'],
  in_call: ['completed', 'abandoned'],
  completed: [],
  abandoned: [],
};

export function canTransitionSession(from: SessionState, to: SessionState): boolean {
  if (from === to) return false;
  return ALLOWED_SESSION_TRANSITIONS[from]?.includes(to) ?? false;
}
