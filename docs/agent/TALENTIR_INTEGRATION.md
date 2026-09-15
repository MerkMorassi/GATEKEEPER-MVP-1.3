# Talentir Payout Adapter Integration Guide — GateKeeper Phase 6B

## 1. Architectural Role

Talentir serves exclusively as the **Payout Provider / Disbursement Rail** for GateKeeper. Talentir is **NOT** the customer-facing payment processor, merchant-of-record, or customer checkout system.

```text
CUSTOMER
   │
   ▼
OUR CUSTOMER-FACING COMMERCE / PAYMENT SYSTEM
   │
   ▼
OUR AUTHORITATIVE FINANCIAL LEDGER (GateKeeper)
   │
   ▼
CREATOR SETTLEMENT ENGINE (85/15 Split)
   │
   ▼
TALENTIR PAYOUT ADAPTER (`PayoutProviderAdapter`)
   │
   ▼
TALENTIR WALLET
   │
   ▼
CREATOR / SERVICE PROVIDER
```

GateKeeper owns the financial truth (who is owed what). Talentir owns last-mile recipient onboarding, tax collection, and payout disbursement execution.

---

## 2. API Boundary & Provider Abstraction

All payout logic depends on the abstract `PayoutProviderAdapter` interface defined in `/server/services/payout/payoutProvider.ts`:

```typescript
export interface PayoutProviderAdapter {
  readonly providerName: string;
  isConfigured(): boolean;
  createPayout(params: CreatePayoutParams): Promise<CreatePayoutResult>;
  getPayoutStatus(providerPayoutId: string): Promise<PayoutStatusResult>;
  cancelPayout(providerPayoutId: string): Promise<CancelPayoutResult>;
  verifyWebhook(rawBody: Buffer | string, signature: string): Promise<VerifiedPayoutWebhook>;
  handleWebhook(event: VerifiedPayoutWebhook): Promise<WebhookProcessingResult>;
}
```

The concrete Talentir adapter (`TalentirPayoutProvider`) resides in `/server/services/payout/talentirProvider.ts`.

---

## 3. Configuration & Environment Variables

Credentials and runtime parameters are managed via environment variables declared in `.env.example`:

| Variable | Description | Sandbox Default | Production |
|---|---|---|---|
| `TALENTIR_API_BASE_URL` | Base API endpoint | `https://sandbox-api.talentir.com/v1` | `https://api.talentir.com/v1` |
| `TALENTIR_API_KEY` | Bearer API Key | Required in prod | Required |
| `TALENTIR_WEBHOOK_SECRET` | HMAC SHA-256 Webhook Secret | `sandbox_talentir_wh_secret` | Required |
| `TALENTIR_ENVIRONMENT` | Runtime environment | `sandbox` | `production` |
| `TALENTIR_FEE_PERCENTAGE` | Configurable payout fee rate | `3.0` (3.0%) | Configurable |

---

## 4. Idempotency & Custom Reference (`customId`)

Talentir supports the `customId` parameter for idempotency:

1. GateKeeper generates an internal authoritative payout ID: `GK-{orderId}-PROVIDER`.
2. This `payoutId` is passed to Talentir as `customId`.
3. Retrying a payout request or receiving duplicate webhooks references `customId` and resolves cleanly without duplicating payouts or ledger mutations.

---

## 5. Payout Lifecycle State Machine

```text
pending
   ↓
created
   ↓
approved
   ↓
requested
   ↓
completed (Terminal / Immutable)
```

**Exception / Terminal States**:
- `cancelled`
- `deleted`
- `expired`
- `failed` (allows explicit retry)

---

## 6. Webhook Processing & HMAC Security

Webhooks are posted to `POST /api/webhooks/payouts/talentir`.

**Processing Sequence**:
1. Incoming raw body and `x-talentir-signature` header extracted.
2. HMAC SHA-256 signature calculated over raw body using `TALENTIR_WEBHOOK_SECRET`.
3. Invalid signatures rejected immediately with `HTTP 401 Unauthorized`.
4. Event ID checked against in-memory/database deduplication set.
5. Internal `payout` record resolved via `customId`.
6. Legal state transition validated against state machine.
7. Audit event logged and payout status updated in authoritative database.

---

## 7. Privacy Boundary

GateKeeper does **NOT** capture, process, or store:
- Recipient bank account numbers
- PayPal credentials
- Crypto wallet addresses
- Tax forms (W-9 / W-8BEN)
- Payout passwords or credentials

Talentir collects these directly from the recipient on hosted white-label claim pages. GateKeeper retains only the `creatorId`, `settlementId`, `payoutId`, and `status`.

---

## 8. Financial Ledger & Creator Dashboard

The `GET /api/creator/financials` endpoint delivers creator financial metrics with strict tenant isolation:

- **Gross Earnings**: Total volume of settled sessions.
- **Platform Fee**: GateKeeper 15% share.
- **Settlement Amount**: 85% creator share.
- **Payout Fee**: Talentir 3% payout rate.
- **Net Delivered**: Net funds transferred to creator.
