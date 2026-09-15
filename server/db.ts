import fs from 'fs';
import path from 'path';
import {
  ProviderConfig,
  StripeConfig,
  Order,
  PaymentRecord,
  Settlement,
  Payout,
  Entitlement,
  AuditEvent,
  EscrowSession,
  Gate,
  AuthSession,
  SupportContext,
  FinancialLedgerEntry,
  PaymentCapabilitiesConfig,
  PaymentMethodCapability,
  PayoutProviderCapability,
  WebAuthnCredential,
  DeviceSession,
  WebAuthnChallenge,
  UserRecord,
  UserRole,
  ApiKeyRecord,
} from '../src/types/index.js';

const DATA_DIR = process.env.DATA_DIR || process.cwd();
const DATA_FILE = path.join(DATA_DIR, 'gatekeeper_db.json');
const TEMP_FILE = path.join(DATA_DIR, 'gatekeeper_db.json.tmp');

interface ProcessedWebhookRecord {
  key: string; // provider:eventId
  provider: string;
  eventId: string;
  eventType?: string;
  orderId?: string;
  status?: 'success' | 'replay_ignored' | 'failed' | 'invalid_signature';
  error?: string;
  processedAt: string;
}

interface Schema {
  provider: ProviderConfig;
  stripeConfig: StripeConfig;
  paymentCapabilities: PaymentCapabilitiesConfig;
  orders: Record<string, Order>;
  payments: Record<string, PaymentRecord>;
  settlements: Record<string, Settlement>;
  payouts: Record<string, Payout>;
  entitlements: Record<string, Entitlement>;
  auditEvents: AuditEvent[];
  escrowSessions: Record<string, EscrowSession>;
  gates: Record<string, Gate>;
  authSessions: Record<string, AuthSession>;
  supportContexts: Record<string, SupportContext>;
  processedWebhooks: Record<string, ProcessedWebhookRecord>;
  financialLedgerEntries: FinancialLedgerEntry[];
  webAuthnCredentials: Record<string, WebAuthnCredential>;
  deviceSessions: Record<string, DeviceSession>;
  webAuthnChallenges: Record<string, WebAuthnChallenge>;
  users: Record<string, UserRecord>;
  apiKeys: Record<string, ApiKeyRecord>;
}

const DEFAULT_PAYMENT_CAPABILITIES: PaymentCapabilitiesConfig = {
  paymentMethods: {
    card: {
      id: 'card',
      name: 'Credit / Debit Cards',
      category: 'card',
      provider: 'STRIPE',
      enabled: true,
      configured: true,
      operational: true,
      notes: 'Default payment method via Stripe Destination Charges.',
      updatedAt: '2026-08-19T00:00:00.000Z',
    },
    apple_pay: {
      id: 'apple_pay',
      name: 'Apple Pay',
      category: 'digital_wallet',
      provider: 'STRIPE',
      enabled: true,
      configured: true,
      operational: true,
      requiresDomainVerification: true,
      notes: 'Supported via Stripe Payment Element & Apple Merchant ID.',
      updatedAt: '2026-08-19T00:00:00.000Z',
    },
    google_pay: {
      id: 'google_pay',
      name: 'Google Pay',
      category: 'digital_wallet',
      provider: 'STRIPE',
      enabled: true,
      configured: true,
      operational: true,
      notes: 'Supported via Stripe Express Checkout / Payment Element.',
      updatedAt: '2026-08-19T00:00:00.000Z',
    },
    link: {
      id: 'link',
      name: 'Stripe Link',
      category: 'instant_transfer',
      provider: 'STRIPE',
      enabled: true,
      configured: true,
      operational: true,
      notes: '1-click checkout powered by Stripe Link.',
      updatedAt: '2026-08-19T00:00:00.000Z',
    },
    cash_app: {
      id: 'cash_app',
      name: 'Cash App Pay',
      category: 'digital_wallet',
      provider: 'STRIPE',
      enabled: false,
      configured: true,
      operational: false,
      notes: 'Supported via Stripe Payment Element (requires admin toggle).',
      updatedAt: '2026-08-19T00:00:00.000Z',
    },
    paypal: {
      id: 'paypal',
      name: 'PayPal Checkout',
      category: 'digital_wallet',
      provider: 'PAYPAL',
      enabled: true,
      configured: true,
      operational: true,
      notes: 'Direct integration via PayPal Orders API v2.',
      updatedAt: '2026-08-19T00:00:00.000Z',
    },
  },
  payoutProviders: {
    stripe_connect: {
      id: 'stripe_connect',
      name: 'Stripe Connect Custom / Express',
      type: 'DIRECT_CONNECT',
      status: 'operational',
      enabled: true,
      notes: 'Primary provider payout architecture via Destination Charges & transfers.',
      updatedAt: '2026-08-19T00:00:00.000Z',
    },
    talentir: {
      id: 'talentir',
      name: 'Talentir Creator Share Engine',
      type: 'REVENUE_SHARE',
      status: 'coming_soon',
      enabled: false,
      notes: 'COMING SOON / DISABLED — Future creator share settlement architecture.',
      updatedAt: '2026-08-19T00:00:00.000Z',
    },
    paypal_payouts: {
      id: 'paypal_payouts',
      name: 'PayPal Payouts API',
      type: 'API_PAYOUT',
      status: 'available',
      enabled: false,
      notes: 'Direct PayPal email payouts for non-Stripe providers.',
      updatedAt: '2026-08-19T00:00:00.000Z',
    },
  },
  updatedAt: '2026-08-19T00:00:00.000Z',
};

const DEFAULT_STRIPE_CONFIG: StripeConfig = {
  environment: 'test',
  publishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  connected: false,
  accountId: undefined,
  configuredAt: '2026-08-16T00:00:00.000Z',
  updatedAt: '2026-08-16T00:00:00.000Z',
};

const DEFAULT_GATE: Gate = {
  id: 'gate_default_001',
  providerId: 'prov_merk_001',
  name: 'Primary Consultation Gate',
  token: 'merk_consultation_gate',
  active: true,
  createdAt: '2026-08-16T00:00:00.000Z',
};

const DEFAULT_PROVIDER: ProviderConfig = {
  id: 'prov_merk_001',
  name: 'Merk Morassi',
  email: 'merk@merkmorassi.com',
  payoutEmail: 'merk.payouts@merkmorassi.com',
  facetimeHandle: 'https://facetime.apple.com/join#v=1&p=1z501Y06EfGVyAKrTEhpjw&k=WHqbRARgturVWBiqJXvErxiSLSIRd6-GyoXhqvN6Sfs&l=MERK%20MORASSI',
  active: true,
  title: 'Principal Strategic Advisor & Founder',
  bio: 'Executive advisory, confidential 1-on-1 strategy sessions, and venture architecture. Direct, uncompromised access.',
  website: 'https://merkmorassi.com',
  location: 'Los Angeles, CA',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  socials: {
    instagram: 'merkmorassi',
    twitter: 'merkmorassi',
    linkedin: 'merkmorassi',
    youtube: 'merkmorassi',
  },
  ppvBroadcast: {
    enabled: true,
    eventTitle: 'Exclusive Executive Live Multi-Camera Broadcast & Q&A',
    eventDescription: 'Special Live Member-Only PPV Multi-Participant Broadcast. Main source production fed via Switcher Studio Pro, delivered with sub-second ultra-low latency through nanoCosmos / nanoStream Cloud WebRTC.',
    scheduledStartTime: '2026-09-15T19:00:00.000Z',
    scheduledEndTime: '2026-09-15T20:30:00.000Z',
    status: 'scheduled',
    ingestSource: {
      provider: 'SWITCHER_STUDIO_PRO',
      serverUrl: 'rtmp://live.nanocosmos.de/live',
      streamKey: 'gk_live_prov_merk_stream_001',
      streamId: 'str_switcher_merk_001',
      backupIngestUrl: 'rtmp://backup.nanocosmos.de/live',
      resolution: '1080p60 Multi-Camera Studio Master',
      audioCodec: 'AAC 320kbps Studio',
    },
    deliveryEngine: {
      provider: 'NANOCOSMOS_NANOSTREAM',
      playbackUrl: 'https://demo.nanocosmos.de/nanoplayer/release/nanoplayer.html?entry.rtmp.streamname=str_switcher_merk_001',
      embedPlayerUrl: 'https://demo.nanocosmos.de/nanoplayer/release/nanoplayer.html?entry.rtmp.streamname=str_switcher_merk_001',
      bintuStreamId: 'bintu_stream_merk_live_001',
      h5liveServer: 'https://bintu-s2.nanocosmos.de/h5live/http/stream.mp4',
      h5liveToken: 'h5live_sec_token_merk_demo',
      latencyTargetMs: 800,
      drmEnabled: true,
    },
    maxAttendees: 500,
    tokenGateRequired: true,
    updatedAt: '2026-08-30T00:00:00.000Z',
  },
  services: [
    {
      id: 'srv_free',
      name: 'The 15 Minute Free Consultation',
      description: 'Complimentary 15-Minute 1-on-1 Discovery & Alignment Consultation Session. Direct Video Call Access with instant single-use pass.',
      feeCents: 0,
      currency: 'USD',
      isTrial: true,
      serviceType: 'ONE_ON_ONE',
      defaultDurationMinutes: 15,
      allowClientDurationAdjustment: true,
      allowedDurations: [10, 15, 20, 30],
      expirationDays: 7,
      passType: 'single_use'
    },
    {
      id: 'srv_1',
      name: '1-on-1 Confidential Consultation',
      description: '30 Minutes Direct 1-on-1 Confidential Consultation Session with Merk Morassi.',
      feeCents: 15000,
      currency: 'USD',
      isTrial: false,
      serviceType: 'ONE_ON_ONE',
      defaultDurationMinutes: 30,
      allowClientDurationAdjustment: true,
      allowedDurations: [30, 45, 60],
      expirationDays: 14,
      passType: 'single_use'
    },
    {
      id: 'srv_ppv_event',
      name: 'PPV Live Multi-Viewer Event Broadcast Pass',
      description: 'Live admission pass to the upcoming member-only multi-participant broadcast. Main feed powered by Switcher Studio Pro, low-latency delivery by nanoCosmos.',
      feeCents: 4900,
      currency: 'USD',
      isTrial: false,
      serviceType: 'PPV_BROADCAST',
      defaultDurationMinutes: 90,
      allowClientDurationAdjustment: false,
      allowedDurations: [90],
      expirationDays: 30,
      passType: 'single_use',
      ppvEventDetails: {
        scheduledEventDate: '2026-09-15T19:00:00.000Z',
        expectedDurationMinutes: 90,
        maxParticipants: 500,
        isMultiParticipant: true,
      }
    }
  ]
};

/**
 * Event-loop & process-level async lock manager for atomic operations
 */
export class AsyncLockManager {
  private locks = new Map<string, Promise<void>>();

  async acquire<T>(key: string, fn: () => Promise<T> | T): Promise<T> {
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }

    let resolver: () => void;
    const promise = new Promise<void>((res) => {
      resolver = res;
    });
    this.locks.set(key, promise);

    try {
      return await fn();
    } finally {
      this.locks.delete(key);
      resolver!();
    }
  }
}

export const lockManager = new AsyncLockManager();

class Database {
  private data: Schema;

  constructor() {
    this.data = this.load();
  }

  private load(): Schema {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      try {
        const parsed = JSON.parse(raw);
        const mergedProvider = {
          ...DEFAULT_PROVIDER,
          ...(parsed.provider || {}),
          ppvBroadcast: {
            ...DEFAULT_PROVIDER.ppvBroadcast,
            ...(parsed.provider?.ppvBroadcast || {}),
            ingestSource: {
              ...DEFAULT_PROVIDER.ppvBroadcast?.ingestSource,
              ...(parsed.provider?.ppvBroadcast?.ingestSource || {}),
            },
            deliveryEngine: {
              ...DEFAULT_PROVIDER.ppvBroadcast?.deliveryEngine,
              ...(parsed.provider?.ppvBroadcast?.deliveryEngine || {}),
            },
          },
        };
        // Ensure services array exists for backward compatibility
        if (!mergedProvider.services || !Array.isArray(mergedProvider.services)) {
          mergedProvider.services = DEFAULT_PROVIDER.services;
        }

        const gates = parsed.gates || {};
        if (Object.keys(gates).length === 0) {
          gates[DEFAULT_GATE.id] = DEFAULT_GATE;
        }

        const stripeConfig: StripeConfig = {
          ...DEFAULT_STRIPE_CONFIG,
          ...(parsed.stripeConfig || {}),
        };

        const paymentCapabilities: PaymentCapabilitiesConfig = {
          ...DEFAULT_PAYMENT_CAPABILITIES,
          ...(parsed.paymentCapabilities || {}),
          paymentMethods: {
            ...DEFAULT_PAYMENT_CAPABILITIES.paymentMethods,
            ...(parsed.paymentCapabilities?.paymentMethods || {}),
          },
          payoutProviders: {
            ...DEFAULT_PAYMENT_CAPABILITIES.payoutProviders,
            ...(parsed.paymentCapabilities?.payoutProviders || {}),
          },
        };

        // Seed default users if empty
        const users: Record<string, UserRecord> = parsed.users || {};
        if (Object.keys(users).length === 0) {
          users['usr_adm_001'] = {
            id: 'usr_adm_001',
            role: 'ADMIN',
            email: 'admin@gatekeeper.local',
            displayName: 'System Administrator',
            passcode: 'gk_admin_secret_dev_2026',
            createdAt: '2026-08-16T00:00:00.000Z',
            lastActiveAt: new Date().toISOString(),
            status: 'active',
            metadata: { source: 'system_seed' },
          };
          users['usr_prov_merk_001'] = {
            id: 'usr_prov_merk_001',
            role: 'PROVIDER',
            email: mergedProvider.email || 'merk@merkmorassi.com',
            displayName: mergedProvider.name || 'Merk Morassi',
            passcode: 'gk_provider_passphrase_dev_2026',
            createdAt: '2026-08-16T00:00:00.000Z',
            lastActiveAt: new Date().toISOString(),
            status: 'active',
            metadata: { providerId: mergedProvider.id, source: 'system_seed' },
          };
          users['usr_clnt_demo_001'] = {
            id: 'usr_clnt_demo_001',
            role: 'CLIENT',
            email: 'client@gatekeeper.local',
            displayName: 'VIP Client',
            passcode: 'client',
            createdAt: '2026-08-16T00:00:00.000Z',
            lastActiveAt: new Date().toISOString(),
            status: 'active',
            metadata: { totalBookings: 1, source: 'system_seed' },
          };
        }

        return {
          provider: mergedProvider,
          stripeConfig,
          paymentCapabilities,
          orders: parsed.orders || {},
          payments: parsed.payments || {},
          settlements: parsed.settlements || {},
          payouts: parsed.payouts || {},
          entitlements: parsed.entitlements || {},
          auditEvents: parsed.auditEvents || [],
          escrowSessions: parsed.escrowSessions || {},
          gates,
          authSessions: parsed.authSessions || {},
          supportContexts: parsed.supportContexts || {},
          processedWebhooks: parsed.processedWebhooks || {},
          financialLedgerEntries: parsed.financialLedgerEntries || [],
          webAuthnCredentials: parsed.webAuthnCredentials || {},
          deviceSessions: parsed.deviceSessions || {},
          webAuthnChallenges: parsed.webAuthnChallenges || {},
          users,
          apiKeys: (() => {
            const keys: Record<string, ApiKeyRecord> = parsed.apiKeys || {};
            if (Object.keys(keys).length === 0) {
              keys['key_live_demo_01'] = {
                id: 'key_live_demo_01',
                name: 'Main Website Production Checkout',
                key: 'gk_live_8f9a2b4c6e1d3e5f7a9b_prod',
                prefix: 'gk_live_8f9a...',
                environment: 'live',
                role: 'TENANT_ADMIN',
                allowedDomains: ['*'],
                rateLimitPerMinute: 120,
                createdAt: '2026-08-16T00:00:00.000Z',
                lastUsedAt: new Date().toISOString(),
                status: 'active',
                metadata: { channel: 'primary_web' },
              };
              keys['key_test_sandbox_01'] = {
                id: 'key_test_sandbox_01',
                name: 'Development Sandbox & QA Key',
                key: 'gk_test_1a3c5e7f9b2d4f6a8c0e_dev',
                prefix: 'gk_test_1a3c...',
                environment: 'test',
                role: 'READ_WRITE',
                allowedDomains: ['*'],
                rateLimitPerMinute: 600,
                createdAt: '2026-08-16T00:00:00.000Z',
                lastUsedAt: new Date().toISOString(),
                status: 'active',
                metadata: { channel: 'sandbox_dev' },
              };
            }
            return keys;
          })(),
        };
      } catch (e: any) {
        // If repair succeeds, return it
        console.warn('WARNING: Initial JSON parse failed for gatekeeper_db.json. Attempting auto-recovery for truncated payload:', e.message);
        try {
          // Try multiple repair strategies
          let idx = raw.lastIndexOf('}');
          while (idx > 0) {
            const candidate = raw.substring(0, idx + 1) + '\n}';
            try {
              const repaired = JSON.parse(candidate);
              console.log('[GateKeeper DB] Successfully recovered database JSON file via structural repair!');
              fs.writeFileSync(DATA_FILE, JSON.stringify(repaired, null, 2), 'utf-8');
              return this.load();
            } catch {
              idx = raw.lastIndexOf('}', idx - 1);
            }
          }
        } catch (repairError) {
          console.error('Auto-repair failed:', repairError);
        }

        console.error('CRITICAL: Database recovery fallback engaged for gatekeeper_db.json:', e.message);
        // Backup corrupt file to prevent complete loss
        try {
          fs.writeFileSync(`${DATA_FILE}.corrupt.${Date.now()}`, raw, 'utf-8');
        } catch (_) {}
      }
    }

    const initial: Schema = {
      provider: DEFAULT_PROVIDER,
      stripeConfig: DEFAULT_STRIPE_CONFIG,
      paymentCapabilities: DEFAULT_PAYMENT_CAPABILITIES,
      orders: {},
      payments: {},
      settlements: {},
      payouts: {},
      entitlements: {},
      auditEvents: [],
      escrowSessions: {},
      gates: {
        [DEFAULT_GATE.id]: DEFAULT_GATE,
      },
      authSessions: {},
      supportContexts: {},
      processedWebhooks: {},
      financialLedgerEntries: [],
      webAuthnCredentials: {},
      deviceSessions: {},
      webAuthnChallenges: {},
      users: {
        usr_adm_001: {
          id: 'usr_adm_001',
          role: 'ADMIN',
          email: 'admin@gatekeeper.local',
          displayName: 'System Administrator',
          passcode: 'gk_admin_secret_dev_2026',
          createdAt: '2026-08-16T00:00:00.000Z',
          lastActiveAt: new Date().toISOString(),
          status: 'active',
          metadata: { source: 'system_seed' },
        },
        usr_prov_merk_001: {
          id: 'usr_prov_merk_001',
          role: 'PROVIDER',
          email: DEFAULT_PROVIDER.email,
          displayName: DEFAULT_PROVIDER.name,
          passcode: 'gk_provider_passphrase_dev_2026',
          createdAt: '2026-08-16T00:00:00.000Z',
          lastActiveAt: new Date().toISOString(),
          status: 'active',
          metadata: { providerId: DEFAULT_PROVIDER.id, source: 'system_seed' },
        },
        usr_clnt_demo_001: {
          id: 'usr_clnt_demo_001',
          role: 'CLIENT',
          email: 'client@gatekeeper.local',
          displayName: 'VIP Client',
          passcode: 'client',
          createdAt: '2026-08-16T00:00:00.000Z',
          lastActiveAt: new Date().toISOString(),
          status: 'active',
          metadata: { totalBookings: 1, source: 'system_seed' },
        },
      },
      apiKeys: {
        key_live_demo_01: {
          id: 'key_live_demo_01',
          name: 'Main Website Production Checkout',
          key: 'gk_live_8f9a2b4c6e1d3e5f7a9b_prod',
          prefix: 'gk_live_8f9a...',
          environment: 'live',
          role: 'TENANT_ADMIN',
          allowedDomains: ['*'],
          rateLimitPerMinute: 120,
          createdAt: '2026-08-16T00:00:00.000Z',
          lastUsedAt: new Date().toISOString(),
          status: 'active',
          metadata: { channel: 'primary_web' },
        },
        key_test_sandbox_01: {
          id: 'key_test_sandbox_01',
          name: 'Development Sandbox & QA Key',
          key: 'gk_test_1a3c5e7f9b2d4f6a8c0e_dev',
          prefix: 'gk_test_1a3c...',
          environment: 'test',
          role: 'READ_WRITE',
          allowedDomains: ['*'],
          rateLimitPerMinute: 600,
          createdAt: '2026-08-16T00:00:00.000Z',
          lastUsedAt: new Date().toISOString(),
          status: 'active',
          metadata: { channel: 'sandbox_dev' },
        },
      },
    };
    this.saveData(initial);
    return initial;
  }

  private saveData(data: Schema = this.data): void {
    try {
      // G8: Atomic file write using temp file and atomic rename
      const payload = JSON.stringify(data, null, 2);
      fs.writeFileSync(TEMP_FILE, payload, 'utf-8');
      fs.renameSync(TEMP_FILE, DATA_FILE);
    } catch (e) {
      console.error('Failed to write db file atomically:', e);
      throw e;
    }
  }

  // Provider
  getProvider(): ProviderConfig {
    return { ...this.data.provider };
  }

  updateProvider(updates: Partial<ProviderConfig>): ProviderConfig {
    this.data.provider = { ...this.data.provider, ...updates };
    this.saveData();
    return this.getProvider();
  }

  // Stripe Configuration
  getStripeConfig(): StripeConfig {
    return { ...this.data.stripeConfig };
  }

  updateStripeConfig(updates: Partial<StripeConfig>): StripeConfig {
    this.data.stripeConfig = {
      ...this.data.stripeConfig,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveData();
    return this.getStripeConfig();
  }

  // Orders
  saveOrder(order: Order): Order {
    this.data.orders[order.id] = order;
    this.saveData();
    return order;
  }

  getOrder(id: string): Order | undefined {
    return this.data.orders[id];
  }

  getAllOrders(): Order[] {
    return Object.values(this.data.orders).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // Payments
  savePayment(payment: PaymentRecord): PaymentRecord {
    this.data.payments[payment.orderId] = payment;
    this.saveData();
    return payment;
  }

  getPayment(orderId: string): PaymentRecord | undefined {
    return this.data.payments[orderId];
  }

  // Settlements
  saveSettlement(settlement: Settlement): Settlement {
    this.data.settlements[settlement.orderId] = settlement;
    this.saveData();
    return settlement;
  }

  getSettlement(orderId: string): Settlement | undefined {
    return this.data.settlements[orderId];
  }

  getAllSettlements(): Settlement[] {
    return Object.values(this.data.settlements).sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  // Payouts
  savePayout(payout: Payout): Payout {
    this.data.payouts[payout.payoutId] = payout;
    this.saveData();
    return payout;
  }

  getPayout(payoutId: string): Payout | undefined {
    return this.data.payouts[payoutId];
  }

  getAllPayouts(): Payout[] {
    return Object.values(this.data.payouts).sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  // Entitlements
  saveEntitlement(entitlement: Entitlement): Entitlement {
    this.data.entitlements[entitlement.token] = entitlement;
    this.saveData();
    return entitlement;
  }

  getEntitlement(token: string): Entitlement | undefined {
    return this.data.entitlements[token];
  }

  getEntitlementByOrderId(orderId: string): Entitlement | undefined {
    return Object.values(this.data.entitlements).find((e) => e.orderId === orderId);
  }

  getAllEntitlements(): Entitlement[] {
    return Object.values(this.data.entitlements);
  }

  // Audit Events
  logAuditEvent(eventType: AuditEvent['eventType'], operator: string, details: Record<string, any>, ticketCode?: string): AuditEvent {
    const event: AuditEvent = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      eventType,
      operator,
      details,
      ticketCode,
    };
    this.data.auditEvents.unshift(event);
    this.saveData();
    return event;
  }

  getAuditEvents(): AuditEvent[] {
    return [...this.data.auditEvents];
  }

  // Escrow Sessions
  saveEscrowSession(session: EscrowSession): EscrowSession {
    this.data.escrowSessions[session.ticketCode] = session;
    this.saveData();
    return session;
  }

  getEscrowSession(ticketCode: string): EscrowSession | undefined {
    return this.data.escrowSessions[ticketCode];
  }

  // Gates
  saveGate(gate: Gate): Gate {
    this.data.gates[gate.id] = gate;
    this.saveData();
    return gate;
  }

  getGate(id: string): Gate | undefined {
    return this.data.gates[id];
  }

  getGateByToken(token: string): Gate | undefined {
    return Object.values(this.data.gates).find(g => g.token === token);
  }

  getAllGates(): Gate[] {
    return Object.values(this.data.gates).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  deleteGate(id: string): boolean {
    if (this.data.gates[id]) {
      delete this.data.gates[id];
      this.saveData();
      return true;
    }
    return false;
  }

  // Auth Sessions
  saveAuthSession(session: AuthSession): AuthSession {
    this.data.authSessions[session.token] = session;
    this.saveData();
    return session;
  }

  getAuthSession(token: string): AuthSession | undefined {
    return this.data.authSessions[token];
  }

  deleteAuthSession(token: string): void {
    if (this.data.authSessions[token]) {
      delete this.data.authSessions[token];
      this.saveData();
    }
  }

  // Support Contexts
  saveSupportContext(context: SupportContext): SupportContext {
    this.data.supportContexts[context.id] = context;
    this.saveData();
    return context;
  }

  getSupportContext(id: string): SupportContext | undefined {
    return this.data.supportContexts[id];
  }

  getAllSupportContexts(): SupportContext[] {
    return Object.values(this.data.supportContexts).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // Webhook Persistent Idempotency Store
  isWebhookProcessed(provider: string, eventId: string): boolean {
    const key = `${provider}:${eventId}`;
    return Boolean(this.data.processedWebhooks[key]);
  }

  recordProcessedWebhook(
    provider: string,
    eventId: string,
    eventType?: string,
    orderId?: string,
    status: 'success' | 'replay_ignored' | 'failed' | 'invalid_signature' = 'success',
    error?: string
  ): void {
    const key = `${provider}:${eventId}`;
    this.data.processedWebhooks[key] = {
      key,
      provider,
      eventId,
      eventType: eventType || 'checkout.session.completed',
      orderId,
      status,
      error,
      processedAt: new Date().toISOString(),
    };
    this.saveData();
  }

  getProcessedWebhooks(): ProcessedWebhookRecord[] {
    return Object.values(this.data.processedWebhooks).sort((a, b) =>
      new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime()
    );
  }

  // Double-Entry Financial Ledger
  addLedgerTransaction(rawEntries: Omit<FinancialLedgerEntry, 'id' | 'createdAt'>[]): FinancialLedgerEntry[] {
    let totalDebits = 0;
    let totalCredits = 0;

    for (const e of rawEntries) {
      if (e.debitCents < 0 || e.creditCents < 0) {
        throw new Error('Ledger entry debit or credit amounts cannot be negative.');
      }
      totalDebits += e.debitCents;
      totalCredits += e.creditCents;
    }

    // MANDATORY DOUBLE-ENTRY INVARIANT: Sum(Debits) === Sum(Credits)
    if (totalDebits !== totalCredits) {
      throw new Error(`UNBALANCED_LEDGER_TRANSACTION: Sum of debits (${totalDebits}) does not equal sum of credits (${totalCredits}).`);
    }

    const now = new Date().toISOString();
    const createdEntries: FinancialLedgerEntry[] = rawEntries.map((e, idx) => ({
      ...e,
      id: `ledg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${idx}`,
      createdAt: now,
    }));

    this.data.financialLedgerEntries.push(...createdEntries);
    this.saveData();
    return createdEntries;
  }

  getLedgerEntries(): FinancialLedgerEntry[] {
    return [...this.data.financialLedgerEntries];
  }

  getLedgerEntriesByOrderId(orderId: string): FinancialLedgerEntry[] {
    return this.data.financialLedgerEntries.filter((e) => e.orderId === orderId);
  }

  /**
   * Atomic commit of order capture and entitlement issuance.
   * Guarantees that [captured, none] is never persisted to storage.
   */
  atomicCaptureAndIssueEntitlement(order: Order, entitlement: Entitlement): { order: Order; entitlement: Entitlement } {
    order.financialState = 'captured';
    order.entitlementState = 'issued';
    order.status = 'paid';
    order.updatedAt = new Date().toISOString();

    this.data.orders[order.id] = order;
    this.data.entitlements[entitlement.token] = entitlement;
    this.saveData();

    return { order, entitlement };
  }

  // Payment Capabilities Registry Methods
  getPaymentCapabilities(): PaymentCapabilitiesConfig {
    return { ...this.data.paymentCapabilities };
  }

  updatePaymentCapabilities(patch: Partial<PaymentCapabilitiesConfig>): PaymentCapabilitiesConfig {
    this.data.paymentCapabilities = {
      ...this.data.paymentCapabilities,
      ...patch,
      paymentMethods: {
        ...this.data.paymentCapabilities.paymentMethods,
        ...(patch.paymentMethods || {}),
      },
      payoutProviders: {
        ...this.data.paymentCapabilities.payoutProviders,
        ...(patch.payoutProviders || {}),
      },
      updatedAt: new Date().toISOString(),
    };
    this.saveData();
    return this.data.paymentCapabilities;
  }

  togglePaymentMethodCapability(id: string, enabled: boolean): PaymentCapabilitiesConfig {
    if (this.data.paymentCapabilities.paymentMethods[id]) {
      const current = this.data.paymentCapabilities.paymentMethods[id];
      this.data.paymentCapabilities.paymentMethods[id] = {
        ...current,
        enabled,
        operational: enabled && current.configured,
        updatedAt: new Date().toISOString(),
      };
      this.data.paymentCapabilities.updatedAt = new Date().toISOString();
      this.saveData();
    }
    return this.data.paymentCapabilities;
  }

  togglePayoutProviderCapability(id: string, enabled: boolean): PaymentCapabilitiesConfig {
    if (id === 'talentir' && enabled) {
      throw new Error('TALENTIR_FEATURE_BOUNDARY: Talentir creator share engine is COMING SOON and cannot be enabled in this release.');
    }
    if (this.data.paymentCapabilities.payoutProviders[id]) {
      const current = this.data.paymentCapabilities.payoutProviders[id];
      this.data.paymentCapabilities.payoutProviders[id] = {
        ...current,
        enabled,
        status: enabled ? 'operational' : (current.id === 'talentir' ? 'coming_soon' : 'disabled'),
        updatedAt: new Date().toISOString(),
      };
      this.data.paymentCapabilities.updatedAt = new Date().toISOString();
      this.saveData();
    }
    return this.data.paymentCapabilities;
  }

  // WebAuthn Credentials & Device Sessions Methods
  getWebAuthnCredentials(): WebAuthnCredential[] {
    return Object.values(this.data.webAuthnCredentials || {}).filter((c) => !c.revoked);
  }

  getWebAuthnCredentialById(id: string): WebAuthnCredential | undefined {
    return this.data.webAuthnCredentials?.[id];
  }

  saveWebAuthnCredential(credential: WebAuthnCredential): WebAuthnCredential {
    if (!this.data.webAuthnCredentials) {
      this.data.webAuthnCredentials = {};
    }
    this.data.webAuthnCredentials[credential.id] = credential;
    this.saveData();
    return credential;
  }

  revokeWebAuthnCredential(id: string): boolean {
    if (this.data.webAuthnCredentials?.[id]) {
      this.data.webAuthnCredentials[id].revoked = true;
      this.saveData();
      return true;
    }
    return false;
  }

  saveDeviceSession(session: DeviceSession): DeviceSession {
    if (!this.data.deviceSessions) {
      this.data.deviceSessions = {};
    }
    this.data.deviceSessions[session.id] = session;
    this.saveData();
    return session;
  }

  getDeviceSession(id: string): DeviceSession | undefined {
    const session = this.data.deviceSessions?.[id];
    if (!session) return undefined;
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      delete this.data.deviceSessions[id];
      this.saveData();
      return undefined;
    }
    return session;
  }

  deleteDeviceSession(id: string): void {
    if (this.data.deviceSessions?.[id]) {
      delete this.data.deviceSessions[id];
      this.saveData();
    }
  }

  saveWebAuthnChallenge(challenge: WebAuthnChallenge): WebAuthnChallenge {
    if (!this.data.webAuthnChallenges) {
      this.data.webAuthnChallenges = {};
    }
    this.data.webAuthnChallenges[challenge.challenge] = challenge;
    this.saveData();
    return challenge;
  }

  consumeWebAuthnChallenge(challengeStr: string): WebAuthnChallenge | undefined {
    const challenge = this.data.webAuthnChallenges?.[challengeStr];
    if (!challenge) return undefined;

    // Single-use: delete immediately
    delete this.data.webAuthnChallenges[challengeStr];
    this.saveData();

    // Check expiration (challenges valid for 5 minutes)
    if (challenge.expiresAt < Date.now()) {
      return undefined;
    }

    return challenge;
  }

  // --- Lightweight User Model & Classification (ADMIN, CLIENT, PROVIDER) ---

  getUsers(): UserRecord[] {
    if (!this.data.users) this.data.users = {};
    return Object.values(this.data.users);
  }

  getUserById(id: string): UserRecord | undefined {
    if (!this.data.users) this.data.users = {};
    return this.data.users[id];
  }

  getUserByEmail(email: string): UserRecord | undefined {
    if (!this.data.users) this.data.users = {};
    const normalized = email.trim().toLowerCase();
    return Object.values(this.data.users).find(
      (u) => u.email.trim().toLowerCase() === normalized
    );
  }

  saveUser(user: UserRecord): UserRecord {
    if (!this.data.users) this.data.users = {};
    this.data.users[user.id] = {
      ...user,
      lastActiveAt: new Date().toISOString(),
    };
    this.saveData();
    return this.data.users[user.id];
  }

  deleteUser(id: string): boolean {
    if (this.data.users && this.data.users[id]) {
      delete this.data.users[id];
      this.saveData();
      return true;
    }
    return false;
  }

  /**
   * Lightweight Auto-Provisioning helper:
   * When a client books or checks out with an email, auto-creates or updates their CLIENT user record.
   */
  autoProvisionClientUser(email: string, displayName?: string, metadata?: Record<string, any>): UserRecord {
    if (!this.data.users) this.data.users = {};
    const existing = this.getUserByEmail(email);
    if (existing) {
      existing.lastActiveAt = new Date().toISOString();
      if (displayName && (!existing.displayName || existing.displayName === 'Guest Client')) {
        existing.displayName = displayName;
      }
      if (metadata) {
        existing.metadata = {
          ...(existing.metadata || {}),
          ...metadata,
          totalBookings: (existing.metadata?.totalBookings || 0) + 1,
        };
      }
      this.data.users[existing.id] = existing;
      this.saveData();
      return existing;
    }

    const shortHash = Buffer.from(email.trim().toLowerCase()).toString('hex').substring(0, 8);
    const newId = `usr_clnt_${shortHash}`;
    const newUser: UserRecord = {
      id: newId,
      role: 'CLIENT',
      email: email.trim().toLowerCase(),
      displayName: displayName || (email.split('@')[0] ? email.split('@')[0] : 'Client'),
      passcode: 'client', // Default easy client passcode for direct session lookups
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      status: 'active',
      metadata: {
        source: 'auto_provision_checkout',
        totalBookings: 1,
        ...(metadata || {}),
      },
    };

    this.data.users[newId] = newUser;
    this.saveData();
    return newUser;
  }

  // API Keys (Developer & External Service Protocol)
  getApiKeys(): ApiKeyRecord[] {
    if (!this.data.apiKeys) this.data.apiKeys = {};
    return Object.values(this.data.apiKeys).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getApiKey(keyString: string): ApiKeyRecord | undefined {
    if (!this.data.apiKeys || !keyString) return undefined;
    const cleanKey = keyString.trim();
    return Object.values(this.data.apiKeys).find((k) => k.key === cleanKey);
  }

  getApiKeyById(id: string): ApiKeyRecord | undefined {
    if (!this.data.apiKeys) return undefined;
    return this.data.apiKeys[id];
  }

  saveApiKey(apiKey: ApiKeyRecord): ApiKeyRecord {
    if (!this.data.apiKeys) this.data.apiKeys = {};
    this.data.apiKeys[apiKey.id] = {
      ...apiKey,
    };
    this.saveData();
    return this.data.apiKeys[apiKey.id];
  }

  revokeApiKey(id: string): boolean {
    if (this.data.apiKeys && this.data.apiKeys[id]) {
      this.data.apiKeys[id].status = 'revoked';
      this.data.apiKeys[id].revokedAt = new Date().toISOString();
      this.saveData();
      return true;
    }
    return false;
  }

  deleteApiKey(id: string): boolean {
    if (this.data.apiKeys && this.data.apiKeys[id]) {
      delete this.data.apiKeys[id];
      this.saveData();
      return true;
    }
    return false;
  }

  validateApiKey(
    keyString: string,
    originDomain?: string
  ): { valid: boolean; keyRecord?: ApiKeyRecord; error?: string } {
    if (!keyString || typeof keyString !== 'string') {
      return { valid: false, error: 'Missing API key. Provide via X-API-Key header or Bearer token.' };
    }

    const keyRecord = this.getApiKey(keyString);
    if (!keyRecord) {
      return { valid: false, error: 'Invalid API key.' };
    }

    if (keyRecord.status !== 'active') {
      return { valid: false, error: 'API key has been revoked or deactivated.' };
    }

    // Check origin domain if restricted
    if (
      originDomain &&
      keyRecord.allowedDomains &&
      keyRecord.allowedDomains.length > 0 &&
      !keyRecord.allowedDomains.includes('*')
    ) {
      const normalizedOrigin = originDomain.toLowerCase().replace(/\/$/, '');
      const match = keyRecord.allowedDomains.some((d) => {
        const norm = d.toLowerCase().replace(/\/$/, '');
        return norm === normalizedOrigin || norm === '*' || normalizedOrigin.endsWith(norm.replace(/^\*?\./, ''));
      });
      if (!match) {
        return {
          valid: false,
          error: `Domain ${originDomain} is not authorized for this API key.`,
        };
      }
    }

    // Touch lastUsedAt
    keyRecord.lastUsedAt = new Date().toISOString();
    this.data.apiKeys[keyRecord.id] = keyRecord;
    this.saveData();

    return { valid: true, keyRecord };
  }
}

export const db = new Database();
