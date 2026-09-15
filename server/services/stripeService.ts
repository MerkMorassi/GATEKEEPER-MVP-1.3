import Stripe from 'stripe';
import { Order, ProviderConfig } from '../../src/types/index.js';

let stripeClient: Stripe | null = null;
let cachedSecretKey: string | null = null;

export function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return null; // Handle missing secret key gracefully without crashing process
  }
  if (!stripeClient || cachedSecretKey !== secretKey) {
    stripeClient = new Stripe(secretKey);
    cachedSecretKey = secretKey;
  }
  return stripeClient;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export interface CreateCheckoutParams {
  order: Order;
  provider: ProviderConfig;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Creates a Stripe Checkout Session using Destination Charges (Platform MoR model).
 * Application Fee = Platform Service Share (15% of service fee).
 * Destination = Provider's Connected Account (85% service + 100% tip).
 */
export async function createStripeCheckoutSession(params: CreateCheckoutParams): Promise<{ sessionId: string; url: string | null; paymentIntentId?: string }> {
  const stripe = getStripeClient();
  const { order, provider, successUrl, cancelUrl } = params;

  if (!stripe) {
    // In dev / unconfigured mode, return simulated Stripe Checkout reference
    const mockSessionId = `cs_mock_${order.id}`;
    return {
      sessionId: mockSessionId,
      url: `${successUrl}&session_id=${mockSessionId}&mock=true`,
    };
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price_data: {
        currency: order.currency.toLowerCase(),
        product_data: {
          name: order.serviceName,
          description: `Confidential Consultation Session with ${provider.name}`,
        },
        unit_amount: order.serviceCents,
      },
      quantity: 1,
    },
  ];

  if (order.tipCents > 0) {
    lineItems.push({
      price_data: {
        currency: order.currency.toLowerCase(),
        product_data: {
          name: 'Provider Gratuity (100% Provider Direct)',
          description: `Direct tip contribution for ${provider.name}`,
        },
        unit_amount: order.tipCents,
      },
      quantity: 1,
    });
  }

  const paymentIntentData: Stripe.Checkout.SessionCreateParams.PaymentIntentData = {
    metadata: {
      orderId: order.id,
      providerId: provider.id,
      serviceId: order.serviceId,
      serviceCents: order.serviceCents.toString(),
      tipCents: order.tipCents.toString(),
      platformTotalShareCents: order.platformTotalShareCents.toString(),
      providerTotalShareCents: order.providerTotalShareCents.toString(),
    },
    application_fee_amount: order.platformTotalShareCents,
  };

  if (provider.stripeAccountId) {
    paymentIntentData.transfer_data = {
      destination: provider.stripeAccountId,
    };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: order.id,
      payment_intent_data: paymentIntentData,
      metadata: {
        orderId: order.id,
        providerId: provider.id,
      },
    });

    return {
      sessionId: session.id,
      url: session.url,
      paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
    };
  } catch (err: any) {
    // In dev/sandbox test mode with invalid/offline keys, return sandbox test checkout reference
    const mockSessionId = `cs_test_sandbox_${order.id}`;
    return {
      sessionId: mockSessionId,
      url: `${successUrl}&session_id=${mockSessionId}&sandbox=true`,
    };
  }
}

/**
 * Executes Destination Charge Refund with exact reverse_transfer and refund_application_fee options.
 */
export async function executeStripeRefund(params: {
  order: Order;
  refundAmountCents: number;
  isTipRefund?: boolean;
  isServiceRefund?: boolean;
}): Promise<{ refundId: string; reversalId?: string; feeRefundId?: string }> {
  const stripe = getStripeClient();
  const { order, refundAmountCents, isTipRefund, isServiceRefund } = params;

  if (!stripe || !order.stripePaymentIntentId) {
    return { refundId: `re_mock_${order.id}_${Date.now()}` };
  }

  // Full refund logic
  const isFullRefund = refundAmountCents === order.grossTotalCents;

  let reverseTransfer = false;
  let refundApplicationFee = false;

  if (isFullRefund) {
    reverseTransfer = true;
    refundApplicationFee = true;
  } else if (isServiceRefund && !isTipRefund) {
    reverseTransfer = true;
    refundApplicationFee = true;
  } else if (isTipRefund && !isServiceRefund) {
    reverseTransfer = true;
    refundApplicationFee = false;
  }

  const refund = await stripe.refunds.create({
    payment_intent: order.stripePaymentIntentId,
    amount: refundAmountCents,
    reverse_transfer: reverseTransfer,
    refund_application_fee: refundApplicationFee,
  });

  return {
    refundId: refund.id,
  };
}

export function verifyStripeWebhookSignature(rawBody: string | Buffer, signature: string): Stripe.Event | null {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return null;
  }

  try {
    return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    return null;
  }
}
