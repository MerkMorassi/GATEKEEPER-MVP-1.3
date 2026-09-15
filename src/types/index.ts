export interface Money {
  currency: string; // e.g., 'USD'
  value: string;   // formatted e.g. '150.00'
  cents: number;   // integer minor units, e.g. 15000
}

export interface ServiceDefinition {
  id: string;
  name: string;
  description: string;
  feeCents: number;
  currency: string;
  isTrial?: boolean;
  serviceType?: 'ONE_ON_ONE' | 'PPV_BROADCAST';
  defaultDurationMinutes?: number; // e.g. 15
  allowClientDurationAdjustment?: boolean; // Client can customize the duration/time slot
  allowedDurations?: number[]; // e.g. [10, 15, 20, 30]
  expirationDays?: number; // Configurable single-use pass expiration in days (e.g. 7)
  expirationDate?: string; // Optional fixed expiration date (YYYY-MM-DD)
  passType?: 'single_use' | 'multi_use';
  ppvEventDetails?: {
    eventTitle?: string;
    scheduledStartTime?: string; // e.g. "2026-09-15T19:00:00Z"
    scheduledEventDate?: string; // e.g. "2026-09-15T19:00:00Z"
    expectedDurationMinutes?: number;
    maxParticipants?: number;
    maxCapacity?: number;
    isMultiParticipant?: boolean;
    streamSource?: string;
    deliveryEngine?: string;
    playerUrl?: string;
  };
}

export interface PpvBroadcastIngestSource {
  provider: 'SWITCHER_STUDIO_PRO' | 'RTMP_CUSTOM' | string;
  serverUrl: string;       // e.g. 'rtmp://live.nanocosmos.de/live'
  streamKey: string;       // e.g. 'gk_live_prov_merk_stream_001'
  streamId?: string;       // e.g. 'str_switcher_merk_live'
  backupIngestUrl?: string;
  resolution?: string;     // e.g. '1080p60 / 4K Multi-Cam'
  audioCodec?: string;     // e.g. 'AAC Stereo 320kbps'
}

export interface PpvBroadcastDeliveryEngine {
  provider: 'NANOCOSMOS_NANOSTREAM' | 'WEBRTC_H5LIVE' | string;
  playbackUrl: string;     // e.g. 'https://demo.nanocosmos.de/nanoplayer/release/nanoplayer.html?entry.rtmp.streamname=...'
  embedPlayerUrl?: string; // Dedicated iframe/player embed
  bintuStreamId?: string;  // nanoStream Bintu Stream ID
  h5liveServer?: string;   // Sub-second WebRTC edge endpoint
  h5liveToken?: string;    // Temporary playback token
  latencyTargetMs?: number;// e.g. 800 (sub-second)
  drmEnabled?: boolean;
}

export interface PpvBroadcastConfig {
  enabled: boolean;
  eventTitle: string;
  eventDescription: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  status: 'draft' | 'scheduled' | 'standby' | 'live' | 'ended' | 'offline';
  ingestSource: PpvBroadcastIngestSource;
  deliveryEngine: PpvBroadcastDeliveryEngine;
  maxAttendees?: number;
  tokenGateRequired: boolean;
  updatedAt?: string;
}

export interface ProviderSocials {
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
  facebook?: string;
  tiktok?: string;
  github?: string;
}

export interface ProviderConfig {
  id: string;
  name: string;
  username?: string;
  email: string;
  payoutEmail: string;
  paypalMeHandle?: string;
  facetimeHandle: string;
  active: boolean;
  services: ServiceDefinition[];
  ppvBroadcast?: PpvBroadcastConfig;
  stripeAccountId?: string;
  stripeOnboardingComplete?: boolean;
  payoutsEnabled?: boolean;
  acceptedPaymentMethods?: string[];
  avatarUrl?: string;
  photoUrl?: string;
  title?: string;
  bio?: string;
  website?: string;
  location?: string;
  phone?: string;
  socials?: ProviderSocials;
}

export type CapabilityStatus = 'available' | 'enabled' | 'configured' | 'operational' | 'disabled' | 'coming_soon';

export interface PaymentMethodCapability {
  id: 'card' | 'apple_pay' | 'google_pay' | 'link' | 'cash_app' | 'paypal' | string;
  name: string;
  category: 'card' | 'digital_wallet' | 'bnpl' | 'instant_transfer';
  provider: 'STRIPE' | 'PAYPAL';
  enabled: boolean;          // Admin toggle
  configured: boolean;       // Underlying credentials present
  operational: boolean;      // Ready for active routing
  requiresDomainVerification?: boolean;
  notes?: string;
  updatedAt: string;
}

export interface PayoutProviderCapability {
  id: 'stripe_connect' | 'talentir' | 'paypal_payouts' | string;
  name: string;
  type: 'DIRECT_CONNECT' | 'REVENUE_SHARE' | 'API_PAYOUT';
  status: CapabilityStatus;
  enabled: boolean;
  notes?: string;
  updatedAt: string;
}

export interface PaymentCapabilitiesConfig {
  paymentMethods: Record<string, PaymentMethodCapability>;
  payoutProviders: Record<string, PayoutProviderCapability>;
  updatedAt: string;
}

export interface StripeConfig {
  environment: 'test' | 'live';
  publishableKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  configuredAt?: string;
  updatedAt?: string;
  accountId?: string;
  connected?: boolean;
  lastConnectionTest?: string;
  lastSandboxTest?: string;
}

export interface StripeConfigResponse {
  configured: boolean;
  environment: 'test' | 'live';
  publishableKey: string;
  secretKeyConfigured: boolean;
  webhookSecretConfigured: boolean;
  accountId: string | null;
  connected: boolean;
  lastConnectionTest: string | null;
  lastSandboxTest: string | null;
}

export interface Gate {
  id: string;
  providerId: string;
  name?: string;
  customName?: string;
  token: string;
  active: boolean;
  createdAt: string;
  targetServiceId?: string;
  serviceDescription?: string;
  expiryDate?: string;
  promotionType?: string;
  customGreeting?: string;
}

export interface AuthSession {
  token: string;
  role: 'admin' | 'provider' | 'client' | 'guest';
  providerId?: string;
  clientId?: string;
  createdAt: string;
  expiresAt: string;
}

export type OrderStatus =
  | 'created'
  | 'payment_pending'
  | 'paid'
  | 'confirmed'
  | 'settlement_pending'
  | 'settled'
  | 'manual_review'
  | 'cancelled';

export type PaymentStatus =
  | 'created'
  | 'pending'
  | 'approved'
  | 'captured'
  | 'failed'
  | 'refunded';

export type FinancialState =
  | 'created'
  | 'pending'
  | 'authorized'
  | 'captured'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'disputed';

export type EntitlementState =
  | 'none'
  | 'issued'
  | 'active'
  | 'redeemed'
  | 'expired'
  | 'revoked';

export type SettlementState =
  | 'unsettled'
  | 'pending_payout'
  | 'payout_completed'
  | 'clawed_back'
  | 'settlement_failed';

export type SessionState =
  | 'idle'
  | 'waiting_room'
  | 'in_call'
  | 'completed'
  | 'abandoned';

export interface Order {
  id: string;
  providerId: string;
  serviceId: string;
  gateId?: string;
  serviceName: string;
  amountCents: number;
  currency: string;
  status: OrderStatus;
  
  // 4-Dimensional State Machine Vectors
  financialState: FinancialState;
  entitlementState: EntitlementState;
  settlementState: SettlementState;
  sessionState: SessionState;

  // Breakdown Amounts (Integer Cents)
  serviceCents: number;
  tipCents: number;
  grossTotalCents: number;
  providerServiceShareCents: number;
  platformServiceShareCents: number;
  providerTipShareCents: number;
  platformTipShareCents: number;
  providerTotalShareCents: number;
  platformTotalShareCents: number;

  // Payment Execution & Stripe References
  payoutAdapter?: 'STRIPE' | 'TALENTIR' | 'PAYPAL';
  stripeAccountId?: string;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  stripeTransferId?: string;
  stripeApplicationFeeId?: string;

  paypalOrderId?: string;
  paypalCaptureId?: string;
  durationMinutes?: number;
  scheduledTimeSlot?: string;
  isTrial?: boolean;
  expiresAt?: string;
  clientIp?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialLedgerEntry {
  id: string; // 'ledg_...'
  orderId: string;
  providerId: string;
  adapterType: 'STRIPE' | 'TALENTIR' | 'PAYPAL';
  eventType:
    | 'CHARGE_CREATED'
    | 'CHARGE_CAPTURED'
    | 'PLATFORM_FEE_RETAINED'
    | 'PROVIDER_PAYABLE_RECORDED'
    | 'TIP_PAYABLE_RECORDED'
    | 'PROCESSOR_FEE_ABSORBED'
    | 'REFUND_EXECUTED'
    | 'TRANSFER_REVERSED'
    | 'APP_FEE_REFUNDED'
    | 'DISPUTE_CREATED'
    | 'DISPUTE_WON'
    | 'DISPUTE_LOST'
    | 'DEBT_RECORDED';
  account:
    | '1010_STRIPE_CLEARING'
    | '1020_DISPUTE_ESCROW_CONTRA'
    | '2010_PROVIDER_PAYABLE_SERVICE'
    | '2015_PROVIDER_PAYABLE_TIP'
    | '2020_PROVIDER_DEBT_RECOVERY'
    | '4010_PLATFORM_SERVICE_REVENUE'
    | '5010_PROCESSOR_FEE_EXPENSE'
    | '5020_DISPUTE_FEE_EXPENSE';
  debitCents: number;
  creditCents: number;
  externalReferenceId?: string;
  createdAt: string;
  description: string;
}

export interface PaymentRecord {
  orderId: string;
  paypalOrderId: string;
  paypalCaptureId?: string;
  payerEmail?: string;
  payerName?: string;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  timestamp: string;
  verifiedServerSide: boolean;
}

export interface Settlement {
  orderId: string;
  grossCents: number;
  providerCents: number; // 85%
  agentCents: number;    // 15% (remainder, 0-drift)
  currency: string;
  status: 'pending' | 'settled' | 'hold_for_review';
  timestamp: string;
}

export type PayoutStatus =
  | 'pending'
  | 'created'
  | 'approved'
  | 'requested'
  | 'completed'
  | 'cancelled'
  | 'deleted'
  | 'expired'
  | 'failed'
  | 'submitted';

export interface Payout {
  payoutId: string; // e.g., GK-{orderId}-PROVIDER
  orderId: string;
  creatorId?: string; // e.g. prov_merk_001
  settlementId?: string; // orderId or settlementId
  recipientEmail: string;
  amountCents: number;
  currency: string;
  status: PayoutStatus;
  provider?: string; // e.g. 'talentir' | 'paypal_sandbox'
  providerPayoutId?: string;
  customId?: string; // Authoritative payout ID used for idempotency
  providerFeeCents?: number;
  paypalBatchId?: string;
  timestamp: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
}

export type EntitlementStatus =
  | 'issued'
  | 'active'
  | 'redeemed'
  | 'expired'
  | 'revoked';

export interface Entitlement {
  token: string;
  orderId: string;
  providerId: string;
  status: EntitlementStatus;
  createdAt: string;
  expiresAt: string;
  redeemedAt?: string;
  revokedAt?: string;
  facetimeDeliveryInstruction: string;
  qrDataUrl?: string;
  durationMinutes?: number;
  isTrial?: boolean;
  serviceName?: string;
}

export type AuditEventType =
  | 'BOOKING_CREATED'
  | 'ORDER_CREATED'
  | 'PAYMENT_AUTHORIZATION_REQUESTED'
  | 'PAYMENT_AUTHORIZED'
  | 'PAYMENT_CAPTURE_REQUESTED'
  | 'PAYMENT_CAPTURED'
  | 'PAYMENT_CREATED'
  | 'PAYMENT_VERIFIED'
  | 'PAYMENT_FAILED'
  | 'REFUND_REQUESTED'
  | 'REFUND_COMPLETED'
  | 'SETTLEMENT_CREATED'
  | 'SETTLEMENT_COMPLETED'
  | 'PAYOUT_REQUESTED'
  | 'PAYOUT_SUCCEEDED'
  | 'PAYOUT_FAILED'
  | 'ENTITLEMENT_CREATED'
  | 'ENTITLEMENT_REDEEMED'
  | 'ENTITLEMENT_REVOKED'
  | 'ENTITLEMENT_EXPIRED'
  | 'HANDOFF_PREPARED'
  | 'HANDOFF_EXECUTED'
  | 'HANDOFF_COMPLETED'
  | 'SUPPORT_CONTEXT_CREATED'
  | 'MANUAL_REVIEW_OPENED'
  | 'ESCROW_ACCESSED'
  | 'ESCROW_EXPIRED'
  | 'GATE_UPDATED'
  | 'GATE_DELETED'
  | 'DISPUTE_CREATED'
  | 'DISPUTE_WON'
  | 'DISPUTE_LOST';

export interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  operator: string;
  details: Record<string, any>;
  ticketCode?: string;
}

export interface SupportContext {
  id: string;
  reasonCode: string;
  sessionId: string; // opaque internal orderId / session ID
  paymentId?: string;
  recommendedAction: string;
  identityAccessRequired: boolean;
  refundAuthorized: boolean;
  createdAt: string;
}

export type FrontendSessionState =
  | 'BOOKING'
  | 'PAYMENT_AUTHORIZING'
  | 'PAYMENT_AUTHORIZED'
  | 'ACCESS_READY'
  | 'HANDOFF_READY'
  | 'HANDOFF_IN_PROGRESS'
  | 'HANDOFF_COMPLETE'
  | 'EXCEPTION'
  | 'SUPPORT_REQUIRED';

export interface EscrowSession {
  ticketCode: string;
  operator: string;
  reason: string;
  issuedAt: string;
  expiresAt: string;
  active: boolean;
  orderId: string;
  maskedClientEmail: string;
  unmaskedClientEmail?: string;
  providerEmail: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SystemOverview {
  provider: ProviderConfig;
  orders: Order[];
  ordersCount?: number;
  settlements: Settlement[];
  payouts: Payout[];
  auditEvents: AuditEvent[];
  manualReviewQueue: Order[];
  totalGrossCents: number;
  totalProviderCents: number;
  totalAgentCents: number;
  manualReviewPagination?: PaginationMeta;
  settlementsPagination?: PaginationMeta;
  payoutsPagination?: PaginationMeta;
  auditEventsPagination?: PaginationMeta;
}

export interface WebAuthnCredential {
  id: string; // Base64URL credential ID
  publicKey: string; // Base64URL or hex string
  counter: number;
  transports?: string[];
  userId: string;
  createdAt: string;
  lastUsedAt: string;
  revoked: boolean;
  deviceName?: string;
}

export interface DeviceSession {
  id: string;
  userId: string;
  credentialId: string;
  createdAt: string;
  expiresAt: string;
}

export interface WebAuthnChallenge {
  challenge: string;
  userId: string;
  type: 'registration' | 'authentication';
  createdAt: number;
  expiresAt: number;
}

export type UserRole = 'ADMIN' | 'CLIENT' | 'PROVIDER';

export interface UserRecord {
  id: string; // e.g. "usr_adm_001", "usr_prov_merk_001", "usr_clnt_8f92a"
  role: UserRole; // 'ADMIN' | 'CLIENT' | 'PROVIDER'
  email: string; // unique identifier / login handle
  displayName?: string;
  passcode?: string; // encrypted or hashed/salted light credential for quick access
  createdAt: string; // ISO string
  lastActiveAt?: string; // ISO string
  status: 'active' | 'suspended';
  metadata?: {
    providerId?: string;
    clientId?: string;
    totalBookings?: number;
    phone?: string;
    source?: 'auto_provision_checkout' | 'system_seed' | 'manual_admin' | 'portal_registration';
    [key: string]: any;
  };
}

export interface UserLookupResponse {
  success: boolean;
  user?: UserRecord;
  token?: string;
  error?: string;
}

export type ApiKeyRole = 'TENANT_ADMIN' | 'READ_WRITE' | 'SCANNER_ONLY' | 'READ_ONLY';

export interface ApiKeyRecord {
  id: string; // e.g. "key_live_01"
  name: string; // e.g. "Production Website Checkout"
  key: string; // e.g. "gk_live_8f7b3a9c2..."
  prefix: string; // e.g. "gk_live_8f7b..."
  environment: 'live' | 'test';
  role: ApiKeyRole;
  allowedDomains: string[]; // e.g. ["https://mywebsite.com", "http://localhost:3000"]
  rateLimitPerMinute: number; // e.g. 120
  createdAt: string;
  lastUsedAt?: string;
  status: 'active' | 'revoked';
  revokedAt?: string;
  metadata?: Record<string, any>;
}

export interface V1CheckoutSessionRequest {
  serviceId?: string;
  amountCents?: number;
  currency?: string;
  title?: string;
  clientEmail?: string;
  clientName?: string;
  clientNotes?: string;
  customDurationMinutes?: number;
  redirectUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, any>;
}

export interface V1PassVerifyRequest {
  passToken: string; // token or ticketCode
  serviceId?: string;
  operator?: string;
}

export interface V1EscrowReleaseRequest {
  orderId?: string;
  passToken?: string;
  reason?: string;
}

