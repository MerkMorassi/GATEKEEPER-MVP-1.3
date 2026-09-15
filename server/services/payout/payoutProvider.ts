import { PayoutStatus } from '../../../src/types/index.js';

export interface CreatePayoutParams {
  payoutId: string;
  orderId: string;
  creatorId: string;
  settlementId: string;
  recipientEmail: string;
  amountCents: number;
  currency: string;
  description: string;
  customId: string; // Internal authoritative payout ID used as idempotency key
}

export interface CreatePayoutResult {
  success: boolean;
  providerPayoutId: string;
  customId: string;
  status: PayoutStatus;
  providerFeeCents?: number;
  error?: string;
  rawResponse?: any;
}

export interface PayoutStatusResult {
  success: boolean;
  providerPayoutId: string;
  customId: string;
  status: PayoutStatus;
  providerFeeCents?: number;
  completedAt?: string;
  error?: string;
}

export interface CancelPayoutResult {
  success: boolean;
  providerPayoutId: string;
  status: PayoutStatus;
  error?: string;
}

export interface VerifiedPayoutWebhook {
  valid: boolean;
  eventId?: string;
  eventType?: string;
  providerPayoutId?: string;
  customId?: string;
  status?: PayoutStatus;
  amountCents?: number;
  currency?: string;
  rawPayload?: any;
  error?: string;
}

export interface WebhookProcessingResult {
  success: boolean;
  payoutId?: string;
  customId?: string;
  previousStatus?: PayoutStatus;
  newStatus?: PayoutStatus;
  ignoredReason?: string;
  error?: string;
}

export interface PayoutProviderAdapter {
  readonly providerName: string;
  isConfigured(): boolean;
  createPayout(params: CreatePayoutParams): Promise<CreatePayoutResult>;
  getPayoutStatus(providerPayoutId: string): Promise<PayoutStatusResult>;
  cancelPayout(providerPayoutId: string): Promise<CancelPayoutResult>;
  verifyWebhook(rawBody: Buffer | string, signature: string): Promise<VerifiedPayoutWebhook>;
  handleWebhook(event: VerifiedPayoutWebhook): Promise<WebhookProcessingResult>;
}
