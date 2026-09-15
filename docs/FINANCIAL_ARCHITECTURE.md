# GateKeeper Financial Architecture & Settlement Engine

## 1. System Overview & Flow Diagram

```text
Collection Provider (e.g., PayPal / Customer Commerce)
        │
        ▼
GateKeeper Financial Ledger (`Order`, `PaymentRecord`)
        │
        ▼
Settlement Engine (Deterministic 85/15 Zero-Cent Drift Calculation)
        │
        ▼
PayoutProviderAdapter (`server/services/payout/payoutProvider.ts`)
        │
        ▼
Disbursement Rail (Talentir Sandbox / Production API)
```

---

## 2. Core Financial Invariants

1. **85/15 Deterministic Settlement**:
   - Provider Share = `Math.floor(grossCents * 0.85)`
   - Agent/Platform Share = `grossCents - providerCents` (Guarantees zero-cent rounding drift).

2. **Server-Authoritative Pricing**:
   - Order fee and payout amounts originate from database `ProviderConfig` / `ServiceDefinition`.
   - Client payload amount injections are strictly ignored.

3. **Payout Invariants**:
   - **Server-Authoritative Creator**: `creatorId` comes from settlement/order.
   - **Server-Authoritative Amount**: `payoutAmount <= creatorSettlementAmount`.
   - **No Duplicate Payouts**: Payout ID (`GK-{orderId}-PROVIDER`) acts as custom idempotency key.
   - **Ledger Invariance**: Provider payout status tracks disbursement delivery but does not alter contractual settlement obligations.
   - **Tenant Isolation**: Creator financials isolated by `creatorId === session.providerId`.
   - **Immutable Completed Payouts**: Completed payouts cannot be edited or rolled back without new explicit audit events.
