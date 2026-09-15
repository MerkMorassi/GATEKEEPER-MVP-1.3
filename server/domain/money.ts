import { Settlement } from '../../src/types/index.js';

export const MINIMUM_SERVICE_FEE_CENTS = 5000; // $50 USD Minimum Service Fee

export interface FinancialBreakdown {
  serviceCents: number;
  tipCents: number;
  grossTotalCents: number;
  providerServiceShareCents: number;
  platformServiceShareCents: number;
  providerTipShareCents: number;
  platformTipShareCents: number;
  providerTotalShareCents: number;
  platformTotalShareCents: number;
}

/**
 * Calculates deterministic 85/15 service fee split and 100% tip allocation.
 * Enforces $50 minimum service fee ($50.00 USD / 5000 cents).
 */
export function calculateServiceAndTipBreakdown(
  serviceCents: number,
  tipCents = 0
): FinancialBreakdown {
  if (serviceCents < MINIMUM_SERVICE_FEE_CENTS) {
    throw new Error(
      `Service fee of ${serviceCents} cents violates minimum service fee requirement of ${MINIMUM_SERVICE_FEE_CENTS} cents ($50.00 USD).`
    );
  }

  if (tipCents < 0) {
    throw new Error('Tip amount cannot be negative');
  }

  // Integer cents floor calculation for 85% Provider service share
  const providerServiceShareCents = Math.floor(serviceCents * 0.85);

  // Platform receives exact remainder of service fee
  const platformServiceShareCents =
    serviceCents - providerServiceShareCents;

  // 100% of tip belongs to Provider
  const providerTipShareCents = tipCents;
  const platformTipShareCents = 0;

  const grossTotalCents = serviceCents + tipCents;

  const providerTotalShareCents =
    providerServiceShareCents + providerTipShareCents;

  const platformTotalShareCents =
    platformServiceShareCents + platformTipShareCents;

  return {
    serviceCents,
    tipCents,
    grossTotalCents,
    providerServiceShareCents,
    platformServiceShareCents,
    providerTipShareCents,
    platformTipShareCents,
    providerTotalShareCents,
    platformTotalShareCents,
  };
}

/**
 * Creates a settlement from the already-calculated financial breakdown.
 *
 * Service revenue is split 85/15.
 * Tips are 100% Provider.
 *
 * Therefore:
 * Provider = provider service share + 100% of tips
 * GateKeeper = platform service share
 */
export function calculateSettlement(
  orderId: string,
  breakdown: FinancialBreakdown,
  currency = 'USD'
): Settlement {
  if (breakdown.grossTotalCents < 0) {
    throw new Error('Gross amount cannot be negative');
  }

  const providerCents = breakdown.providerTotalShareCents;
  const agentCents = breakdown.platformTotalShareCents;

  return {
    orderId,
    grossCents: breakdown.grossTotalCents,
    providerCents,
    agentCents,
    currency,
    status: 'settled',
    timestamp: new Date().toISOString(),
  };
}

export function formatCents(cents: number, currency = 'USD'): string {
  const dollars = (cents / 100).toFixed(2);
  return `${currency === 'USD' ? '$' : currency + ' '}${dollars}`;
}

export interface RefundBreakdown {
  refundedPlatformRevenueCents: number;
  refundedProviderServicePayableCents: number;
  refundedProviderTipPayableCents: number;
  totalRefundCents: number;
}

/**
 * Calculates exact economic component reversals for refunds.
 * Preserves 100% provider tip allocation on tip refunds and
 * 85/15 service split on service refunds.
 */
export function calculateRefundBreakdown(params: {
  order: {
    serviceCents: number;
    tipCents: number;
    grossTotalCents: number;
    providerServiceShareCents: number;
    platformServiceShareCents: number;
    providerTipShareCents: number;
    platformTipShareCents: number;
  };
  refundAmountCents: number;
  isTipRefund?: boolean;
  isServiceRefund?: boolean;
}): RefundBreakdown {
  const {
    order,
    refundAmountCents,
    isTipRefund,
    isServiceRefund,
  } = params;

  if (refundAmountCents <= 0) {
    return {
      refundedPlatformRevenueCents: 0,
      refundedProviderServicePayableCents: 0,
      refundedProviderTipPayableCents: 0,
      totalRefundCents: 0,
    };
  }

  const isFullRefund =
    refundAmountCents === order.grossTotalCents;

  if (isFullRefund) {
    return {
      refundedPlatformRevenueCents:
        order.platformServiceShareCents,
      refundedProviderServicePayableCents:
        order.providerServiceShareCents,
      refundedProviderTipPayableCents:
        order.providerTipShareCents,
      totalRefundCents: order.grossTotalCents,
    };
  }

  if (isTipRefund && !isServiceRefund) {
    const tipRefund = Math.min(
      refundAmountCents,
      order.providerTipShareCents
    );

    return {
      refundedPlatformRevenueCents: 0,
      refundedProviderServicePayableCents: 0,
      refundedProviderTipPayableCents: tipRefund,
      totalRefundCents: tipRefund,
    };
  }

  if (isServiceRefund && !isTipRefund) {
    const serviceCents =
      order.serviceCents ||
      (order.providerServiceShareCents +
        order.platformServiceShareCents);

    const provRatio =
      serviceCents > 0
        ? order.providerServiceShareCents / serviceCents
        : 0.85;

    const provShare = Math.floor(
      refundAmountCents * provRatio
    );

    const platShare = refundAmountCents - provShare;

    return {
      refundedPlatformRevenueCents: platShare,
      refundedProviderServicePayableCents: provShare,
      refundedProviderTipPayableCents: 0,
      totalRefundCents: refundAmountCents,
    };
  }

  // Generic partial refund
  let tipPart = 0;
  let servicePart = refundAmountCents;

  if (
    order.providerTipShareCents > 0 &&
    refundAmountCents > order.serviceCents
  ) {
    servicePart = order.serviceCents;
    tipPart = refundAmountCents - servicePart;
  }

  const serviceCents =
    order.serviceCents ||
    (order.providerServiceShareCents +
      order.platformServiceShareCents);

  const provRatio =
    serviceCents > 0
      ? order.providerServiceShareCents / serviceCents
      : 0.85;

  const provServiceShare = Math.floor(
    servicePart * provRatio
  );

  const platServiceShare =
    servicePart - provServiceShare;

  return {
    refundedPlatformRevenueCents: platServiceShare,
    refundedProviderServicePayableCents:
      provServiceShare,
    refundedProviderTipPayableCents: tipPart,
    totalRefundCents: refundAmountCents,
  };
}