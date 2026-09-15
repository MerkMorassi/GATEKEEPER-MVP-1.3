# GateKeeper — Access, Entitlement & Settlement Engine

**GateKeeper v1.3**

> **GateKeeper controls admission. It does not control the encounter.**

GateKeeper is infrastructure for selling and enforcing bounded access to scarce, provider-defined experiences.

The provider defines the offer, price, availability, scope, and terms.

GateKeeper handles the commercial boundary:

**OFFER → PRICE → PAYMENT → ENTITLEMENT → TOKEN → GATE → ADMIT / DENY → SETTLEMENT**

GateKeeper does not determine what the provider's time, attention, presence, expertise, or experience is worth. The provider and the market do.

GateKeeper is **price-neutral** and **delivery-agnostic**.

---

## Core Principle

GateKeeper is the Guardian at the Threshold.

A ticket, token, QR code, or entitlement grants access to a defined experience.

It does not grant authority over the provider.

**ACCESS ≠ CONTROL**

**PROXIMITY ≠ AUTHORITY**

**ENTITLEMENT ≠ UNLIMITED DEMAND**

**TICKET ≠ PERSONAL AUTHORITY**

A provider may sell access to available time, attention, presence, expertise, or another explicitly defined experience.

The purchaser receives exactly what was purchased and nothing beyond it.

> **You can purchase someone's available time. You cannot purchase their agency, sovereignty, or autonomy.**

---

## The Deal Is the Deal

The terms of an offer are established before purchase.

Purchase creates a specific entitlement under those terms.

If something was not part of the defined entitlement, it is not part of the entitlement.

A scope change is a new deal.

**A + B + C ≠ A + B + C + D**

Adding D creates a new agreement.

A declined offer creates no reservation, future right, option, or expectation.

Providers may change availability, pricing, scope, or eligibility for future offers.

GateKeeper does not manufacture artificial scarcity.

Scarcity exists because provider attention, time, capacity, and access are finite.

---

## Three Access Tiers

### Tier 1 — Public

Discovery and audience.

Examples:

- Public websites
- Social media
- Public events
- Public content
- General audience communications

GateKeeper does not need to control ordinary public discovery.

### Tier 2 — Membership

Invitation-based or otherwise managed access to a closed community or information layer.

Membership establishes eligibility or access to the community.

Membership does **not** purchase provider time or attention.

Membership does **not** guarantee service.

### Tier 3 — VIP / Private Experience

A scarce, provider-defined experience with controlled admission.

Examples:

- Private consultation
- Workshop
- Group session
- Webinar
- Private showing
- Dinner
- Live call
- Other bounded experiences

The underlying primitive remains the same:

**Same gate. Different room.**

---

## Bounded Entitlement

A provider-defined entitlement grants access to a defined period or experience involving the provider's:

- Time
- Attention
- Presence
- Expertise
- Performance
- Consultation
- Other explicitly agreed scope

The entitlement does not grant the purchaser authority to:

- Control the provider
- Direct personal actions
- Demand additional services
- Expand the agreed scope
- Obtain private contact information
- Require anything outside the agreement

The entitlement defines the boundary.

GateKeeper enforces that boundary.

---

## Payment & Settlement

GateKeeper maintains the authoritative commercial ledger.

The basic financial sequence is:

**CUSTOMER PAYS**

→ GateKeeper / payment infrastructure records the transaction

→ **DELIVERY CONFIRMED**

→ **SETTLEMENT**

→ **PROVIDER PAID**

→ **GATEKEEPER RETAINS PLATFORM FEE**

### Platform Economics

The current platform allocation is:

- **85% provider**
- **15% GateKeeper**

The platform fee is configurable within the architecture.

Tips are intended to remain outside GateKeeper's core economics and are voluntary.

GateKeeper does not use tips to calculate its platform fee.

### Minimum Service Transaction

The current minimum service threshold is:

**$50 USD**

The provider controls the price of the underlying experience.

GateKeeper does not set the provider's market price.

---

## Stripe

Stripe is the authoritative payment rail for v1.3.

GateKeeper supports Stripe Checkout / Stripe Connect architecture for payment collection and provider settlement.

Stripe handles payment processing and the associated payment data required to execute the transaction.

GateKeeper should retain only the minimum information necessary for its own commercial, operational, accounting, dispute, fraud, and compliance functions.

Payment processor data is not the same thing as GateKeeper-controlled client identity data.

---

## Talentir

Talentir is the external payout boundary.

GateKeeper remains authoritative for:

- The commercial transaction
- The entitlement
- The ledger
- The provider payable
- The settlement decision

Talentir handles the provider payout layer, including recipient verification, payout method, currency, and associated compliance functions.

The current provider payout fee is approximately:

**3% of the provider payout**

That fee is provider-side and does not reduce GateKeeper's 15% platform allocation.

GateKeeper does not store provider banking or tax information as part of its own core data model.

---

## Double-Blind Boundary

GateKeeper is designed around a strict data-minimization principle:

**NO CLIENT PII IN.  
NO CLIENT PII STORED.  
NO CLIENT PII OUT.**

The same principle applies to protected health information:

**NO PHI IN.  
NO PHI STORED.  
NO PHI OUT.**

Payment processors may necessarily receive information required to process payments, prevent fraud, satisfy legal obligations, or resolve disputes.

GateKeeper should not unnecessarily collect, expose, or persist client identity.

Provider private contact information is likewise not exposed by the Gate.

The parties may communicate through whatever delivery mechanism the provider chooses.

---

## Delivery-Agnostic

GateKeeper owns the commercial boundary, not the encounter.

The actual experience may occur through:

- FaceTime
- Signal
- Private video
- Webinar
- Telephone
- Physical location
- Workshop
- Consultation
- Other provider-defined delivery mechanisms

The delivery mechanism is not the product primitive.

The gate is.

---

## Real-Time Access

GateKeeper can support immediate availability:

**AVAILABLE NOW**

→ **CLEAR OFFER**

→ **PAY**

→ **ENTITLEMENT**

→ **CONNECT**

The provider can announce that availability exists, define the offer, establish the price, and open the gate.

The purchaser can accept the offer and obtain the corresponding entitlement.

GateKeeper does not need to know what happens inside the room.

> **GateKeeper knows the ticket. GateKeeper doesn't need to know the show.**

---

## Privacy & Provider Sovereignty

GateKeeper does not sell the provider.

It sells access to a provider-defined experience.

The provider retains control over:

- Availability
- Capacity
- Price
- Scope
- Delivery
- Eligibility
- Terms
- Future offers

The purchaser receives the entitlement that was purchased.

Nothing more.

---

## Architecture

GateKeeper v1.3 is a full-stack TypeScript application using:

- React
- Vite
- Express
- TypeScript
- Local JSON persistence
- WebAuthn / Passkeys
- Stripe
- Talentir payout adapter
- QR / token-based access
- Provider and administrative control surfaces
- External `/v1` API

The architecture is intentionally delivery-agnostic.

GateKeeper is infrastructure at the boundary between a provider-defined offer and controlled access to that offer.

---

## Local Development

### Requirements

- Node.js v20.x or higher
- npm, bun, or pnpm

### Clone

```bash
git clone https://github.com/MerkMorassi/GATEKEEPER-MVP-1.3.git
cd GATEKEEPER-MVP-1.3
npm install
