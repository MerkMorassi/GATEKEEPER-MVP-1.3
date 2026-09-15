# GateKeeper Financial Architecture & Settlement Engine

## 1. System Overview & Flow Diagram

```text
Provider-Configured Payment Method
(Credit/Debit / Apple Pay / Google Pay / Stripe Link / Cash App Pay)
        │
        ▼
Payment Collection Processor
(Stripe — default)
        │
        ▼
GateKeeper Financial Ledger
(Order, PaymentRecord)
        │
        ▼
Settlement Engine
(Deterministic 85/15 Split)
        │
        ▼
PayoutProviderAdapter
        │
        ▼
Talentir
(Provider Disbursement)
```

### 1.1 Architectural Roles & Wording
GateKeeper's core financial architecture is conceptually decoupled from any single collection processor or payment rail. The canonical transaction lifecycle follows:
`Payment method → collection processor → GateKeeper financial authority → settlement → provider disbursement`.

*   **Provider-Configured Payment Method**: GateKeeper dynamic registries support configuring multiple user-facing payment methods. Currently supported methods verified in the v1.3 codebase are Credit/Debit Cards, Apple Pay, Google Pay, Stripe Link, and Cash App Pay. Cash App Pay is supported through Stripe and requires appropriate administrator/platform capability configurations to be enabled. PayPal is explicitly unsupported and remains disabled across all production configurations.
*   **Payment Collection Processor**: Stripe is configured as the default and current authoritative payment collection processor. Stripe executes the collection of authorized funds on behalf of GateKeeper.
*   **GateKeeper Financial Ledger**: Regardless of the collection method or processor configured, GateKeeper owns the final, authoritative transaction state and database models (`Order` and `PaymentRecord`). It controls the order workflow, ledger, entitlement, and double-entry settlements.
*   **Settlement Engine**: Processes payment notifications captured at the collection boundary, automatically executing the deterministic 85/15 financial splits to separate platform fees from creator earnings.
*   **PayoutProviderAdapter**: The abstraction layer managing disbursement execution via downstream interfaces.
*   **Talentir**: The external payout and disbursement rail handling creator settlement distributions.

### 1.2 Schema Compatibility Notes
`PaymentRecord` is a valid, active GateKeeper v1.3 ledger object. Its `paypalOrderId` and `paypalCaptureId` property names are legacy database schema terminology retained solely for backward compatibility.

During Stripe payment fulfillment, Stripe checkout transaction and payment intent identifiers are stored within these legacy-named database properties. This is a database schema naming issue and does not indicate that PayPal remains an active collection provider or payment option.

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
