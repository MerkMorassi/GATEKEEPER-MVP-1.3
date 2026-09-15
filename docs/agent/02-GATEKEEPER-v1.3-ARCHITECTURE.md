# GATEKEEPER v1.3
# ARCHITECTURE

**Status:** Normative Product Architecture  
**Version:** 1.3  
**Product:** GateKeeper  
**Primary Product-Development Ethos:** LEANSTACK  
**Primary Payment Rail:** Stripe  
**Provider Payout Boundary:** Talentir

---

## 1. Product Definition

GateKeeper is infrastructure for selling and enforcing bounded access to scarce, provider-defined experiences.

> **GateKeeper controls admission. It does not control the encounter.**

The provider defines what is offered. The customer decides whether to accept. GateKeeper enforces the resulting entitlement.

The provider retains control over the actual experience and delivery environment.

---

## 2. Core Primitive

**OFFER → PRICE → PAYMENT → ENTITLEMENT → TOKEN/QR → GATE → ADMIT/DENY → EXPERIENCE → SETTLEMENT → PAYOUT**

Real-time target:

**AVAILABLE NOW → CLEAR OFFER → PAY → ENTITLEMENT → CONNECT**

---

## 3. What GateKeeper Is Not

GateKeeper is not:

- a CRM;
- a social network;
- a dating application;
- a general marketplace;
- a content platform;
- a service-appointment platform;
- a general event-management platform;
- a provider-management bureaucracy;
- a surveillance/dossier system;
- a replacement for the provider's delivery environment.

---

## 4. Provider Sovereignty

The provider controls:

- offer;
- scope;
- price;
- availability;
- capacity;
- material conditions;
- delivery environment.

The customer purchases the defined entitlement. The customer does not purchase authority over the provider.

> **You can purchase someone's available time. You cannot purchase their agency, sovereignty, or autonomy.**

**ACCESS ≠ CONTROL**  
**PROXIMITY ≠ AUTHORITY**  
**ENTITLEMENT ≠ UNLIMITED DEMAND**  
**TICKET ≠ PERSONAL AUTHORITY**

---

## 5. Bounded Entitlement

A provider-defined entitlement grants access to a defined period, experience, service, time, attention, presence, expertise, environment, or other explicitly agreed component.

It does not grant authority outside the defined scope.

If it is not part of the defined entitlement, it is not part of the entitlement.

A scope change is a new agreement and a new entitlement.

---

## 6. The Deal Is the Deal

Material terms are explicit before purchase. Purchase constitutes acceptance of those terms.

> **THE DEAL IS THE DEAL.**

**A + B + C ≠ A + B + C + D**  
**A + B + C + D = NEW DEAL**

A declined offer creates no future entitlement, reservation, option, or expectation.

The provider may change price, scope, availability, conditions, or whether the offer is made again.

No obligation exists to preserve yesterday's opportunity at yesterday's price.

---

## 7. Access Tiers

### Tier 1 — Public

Public discovery and audience: websites, social channels, public events, public content. GateKeeper need not control this tier.

### Tier 2 — Membership

Invitation-based managed community/list.

Membership provides **eligibility / information**.

Membership does not itself purchase provider time or guarantee service.

### Tier 3 — VIP / Private Experience

Provider-defined scarce controlled access. It may be one-to-one or one-to-small-group/private group.

The defining property is scarcity and controlled access, not participant count.

---

## 8. Scarcity

GateKeeper represents real scarcity created by provider-defined limits such as hours, attention, seats, physical capacity, production capacity, or participant limits.

GateKeeper does not manufacture scarcity as a psychological trick.

The provider and market determine value.

GateKeeper is price-neutral.

---

## 9. Financial Model

v1.3 defaults:

- Stripe is the authoritative customer payment rail.
- GateKeeper platform share: **15%**.
- Provider share: **85% of gross service value** before provider-selected payout costs.
- GateKeeper absorbs Stripe processing costs.
- Minimum transaction/service amount: **$50**.
- Talentir is the default provider payout boundary.
- Talentir payout cost is provider-side.
- Tips are outside GateKeeper settlement economics.

### Example

For a $100 service:

- customer pays: $100;
- GateKeeper: $15;
- provider: $85;
- Talentir at 3% payout fee: $2.55;
- provider receives: **$82.45** before taxes and provider expenses.

Platform fee must remain configurable for future authorized commercial changes.

---

## 10. Tips

Tips belong to the provider.

Tips are not part of GateKeeper's platform-fee calculation.

If a processor includes a tip in a transaction, accounting must preserve the rule that GateKeeper does not take its platform percentage from the tip.

---

## 11. Settlement

Commercial sequence:

**CUSTOMER PAYS → GATEKEEPER HOLDS/POOLS → DELIVERY CONFIRMED → SETTLEMENT → PROVIDER PAID**

> **Did all parties satisfy the deal? Then payout. Not before.**

GateKeeper owns the authoritative commercial ledger and settlement state.

Talentir performs last-mile provider disbursement.

Financial operations require idempotency and webhook reconciliation.

---

## 12. Talentir Boundary

GateKeeper:

- determines provider payable;
- records the commercial transaction;
- authorizes payout;
- provides the minimum payout identifier;
- initiates the payout.

Talentir:

- handles recipient onboarding;
- verifies the recipient;
- handles payout method and currency;
- handles payout compliance;
- disburses funds;
- owns its applicable legal/compliance layer.

GateKeeper should not store provider bank/tax/payout credentials when Talentir can own that relationship.

---

## 13. Double-Blind Privacy

> **NO CLIENT PII IN. NO CLIENT PII STORED. NO CLIENT PII OUT.**

> **NO CLIENT PHI IN. NO CLIENT PHI STORED. NO CLIENT PHI OUT.**

GateKeeper is not a client CRM.

Payment processors necessarily handle information required for payment, fraud, dispute, accounting, and compliance. GateKeeper should not unnecessarily request, persist, or expose that information.

Provider private contact information should not be exposed merely because a customer purchased an entitlement.

Delivery communication may occur outside GateKeeper.

---

## 14. Delivery-Agnostic

GateKeeper does not own the encounter.

The experience may use a video service, phone/video call, private webinar, physical room, workshop, consultation, or another provider-selected environment.

Do not hard-code the product around a particular delivery platform.

---

## 15. Gate / Admission

The gate is a deterministic boundary.

Input includes:

- admission credential;
- entitlement;
- applicable conditions;
- placement/context.

Output:

**ADMIT** or **DENY**

The gate does not renegotiate the deal, reinterpret provider scope, or grant authority beyond the entitlement.

Preferred real-world handheld flow:

**CAMERA → QR/TOKEN → VALIDATE → ADMIT/DENY**

---

## 16. Placement ID

Placement ID is a required architectural concept.

It identifies the specific placement/context where a gate or entitlement is being used.

It must eventually support stable identity, lifecycle, persistence, references, audit, reconciliation, and deterministic association among offer, entitlement, gate, and delivery context.

Implementation must be derived from repository inspection and actual system needs rather than invented prematurely.

---

## 17. Handheld Strategy

The MVP uses responsive PWAs.

### Provider PWA

Only the minimum workflows required to operate the commercial loop:

- availability;
- offer creation/activation;
- price and scope;
- active entitlements;
- gate operation;
- QR/token validation;
- essential transaction/settlement state;
- experience initiation/connection where required.

### Client PWA

Only the minimum workflows required to complete the commercial loop:

- view clear offer;
- purchase;
- receive entitlement;
- receive/store QR/token;
- view essential entitlement state;
- present credential;
- reach provider-defined delivery environment.

### Admin Workstation

The admin surface exists only for exceptions, configuration, security, reconciliation, and authorized intervention.

It is not a dashboard by default.

> **If Merk has nothing to administer, there's nothing to visualize.**

Native iOS applications are explicitly deferred until demonstrated traction justifies native productization.

---

## 18. LeanStack Constraint

**LEANSTACK is primary.**

The MVP must prove the smallest useful transaction before building secondary features.

### No cattle. No hat.

No data → no dashboard.

No meaningful activity → no analytics suite.

No demonstrated administrative burden → no elaborate admin system.

No demonstrated mobile need beyond the core workflows → no native mobile application.

No demonstrated scale problem → no scale infrastructure.

If automation can safely perform the task, automate it.

> **If Merk does his fucking job, there should be very little to administer.**

The goal is not a sophisticated management interface.

The goal is a system that manages itself.

**Prove traction first. Then build what the evidence earns.**

---

## 19. Technology Baseline

Known v1.3 baseline:

- React;
- Vite;
- Express;
- TypeScript;
- local JSON persistence for MVP;
- WebAuthn / Passkeys where already implemented;
- Stripe;
- Talentir payout adapter;
- token/QR admission;
- provider/admin web surfaces;
- `/v1` API.

Do not introduce new infrastructure unless the architecture and evidence justify it.

---

## 20. Architectural Invariants

1. GateKeeper controls admission, not the encounter.
2. Provider defines offer, scope, price, availability, capacity, and delivery.
3. Customer purchases a bounded entitlement.
4. Entitlement does not create authority over the provider.
5. The deal is fixed at purchase.
6. Scarcity is real.
7. GateKeeper is price-neutral.
8. Stripe is authoritative for v1.3 customer payment.
9. GateKeeper absorbs Stripe processing costs.
10. Provider receives 85% of gross service value before provider-selected payout costs.
11. GateKeeper receives 15% by default.
12. $50 is the minimum transaction/service amount.
13. Talentir is the provider payout boundary.
14. Talentir payout fees are provider-side.
15. Tips remain outside GateKeeper platform economics.
16. Client PII/PHI is minimized to the unavoidable payment/compliance boundary.
17. Provider private information remains protected.
18. Delivery is platform-agnostic.
19. Gate admission is deterministic.
20. Settlement occurs only when the deal's conditions are satisfied.
21. Payment and payout operations are idempotent and reconciled.
22. Provider and client handheld MVP workflows are PWAs.
23. Native iOS is deferred until traction justifies it.
24. Administration remains minimal because automation is the objective.
25. Architecture remains proportional to demonstrated need.

---

## 21. Acceptance Standard

GateKeeper v1.3 is architecturally proven when the implementation demonstrates:

- clear offer;
- understandable purchase;
- Stripe payment;
- bounded entitlement;
- deterministic credential;
- deterministic gate;
- provider-defined experience;
- correct settlement;
- correct provider payout;
- financial auditability;
- privacy minimization;
- provider sovereignty;
- PWA provider workflow;
- PWA client workflow;
- minimal administrative intervention;
- real-world transaction completion.

The application starting is not proof.

A green build is not proof.

A passing unit test is not proof of the whole system.

**Real transaction evidence is proof.**
