# GATEKEEPER v1.3
# BUILD PLAN

**Status:** Executable MVP Build Plan  
**Version:** 1.3  
**Primary Ethos:** LEANSTACK

---

## 0. Governing Hierarchy

Read these documents in order:

1. **01-MYTHOS-MANIFESTO-v1.1.md** — HOW we build.
2. **02-GATEKEEPER-v1.3-ARCHITECTURE.md** — WHAT GateKeeper is.
3. **03-GATEKEEPER-v1.3-BUILD-PLAN.md** — WHAT WORK is authorized next.
4. Repository — starting material to inspect.

The Architecture is normative.

The Build Plan is executable.

Do not reinterpret the Architecture.

---

# PRIMARY RULE

## PROVE TRACTION FIRST.

Build the smallest system capable of producing real-world evidence.

> **No cattle. No hat.**

No data → no dashboard.

No work → no administrative machinery.

No demonstrated problem → no feature.

No demonstrated scale → no scale infrastructure.

If automation can perform a task safely, do not create a human workflow for it.

> **If Merk does his fucking job, there should be very little to administer.**

The goal is not to create an impressive control panel.

The goal is to create a system that requires almost no control.

---

# MVP SURFACES

The MVP uses:

1. Provider PWA
2. Client PWA
3. Minimal Admin workstation

There are no native iOS applications in MVP.

Native iOS becomes a future productization decision after actual traction.

---

# MVP COMMERCIAL LOOP

The system must prove:

**CLEAR OFFER → PAYMENT → ENTITLEMENT → TOKEN/QR → GATE → EXPERIENCE → SETTLEMENT → PAYOUT**

Real-time target:

**AVAILABLE NOW → CLEAR OFFER → PAY → ENTITLEMENT → CONNECT**

---

# PHASE 0 — STOP AND INSPECT

**No code changes.**

Inspect the complete repository.

Inventory:

- entry points;
- routes;
- domain models;
- payment;
- Stripe;
- legacy PayPal;
- payout;
- Talentir;
- entitlement;
- gate;
- token/QR;
- Placement ID;
- persistence;
- authentication;
- PWA/mobile responsiveness;
- provider surface;
- client surface;
- admin surface;
- tests;
- build;
- environment;
- secrets;
- obsolete functionality.

Produce a gap matrix:

**PASS / PARTIAL / FAIL / MISSING / UNVERIFIED**

Do not refactor during reconnaissance.

---

# PHASE 1 — ESTABLISH BASELINE

Run:

- dependency installation;
- build;
- type-check;
- existing tests;
- relevant integration tests.

Record actual results.

Do not treat startup as proof of correctness.

Do not treat green tests as proof of the complete system.

---

# PHASE 2 — CORE COMMERCIAL DOMAIN

Verify:

**Provider → Offer → Price → Payment → Entitlement → Gate → Settlement → Payout**

Verify offer, price, scope, availability, capacity where applicable, material conditions, expiration where applicable, delivery context, and purchased terms.

Do not expand the ontology.

---

# PHASE 3 — PROVIDER PWA

Build or adapt only what is necessary.

Required:

1. availability;
2. clear offer creation/activation;
3. price and scope;
4. active entitlement visibility;
5. gate operation;
6. QR/token validation;
7. essential transaction state;
8. experience initiation/connection where required.

Do not build CRM, analytics, provider social features, elaborate scheduling, or speculative management tools.

---

# PHASE 4 — CLIENT PWA

Build or adapt only what is necessary.

Required:

1. see a clear offer;
2. purchase;
3. receive entitlement;
4. receive/store credential;
5. view essential entitlement state;
6. present credential;
7. reach provider-defined delivery environment.

Minimize identity collection, account creation, profile creation, data retention, and unnecessary steps.

---

# PHASE 5 — GATE / ADMISSION

Implement deterministic admission.

Input:

- credential;
- entitlement;
- conditions;
- placement/context.

Output:

**ADMIT / DENY**

Test valid credential, invalid credential, expired entitlement, already-used entitlement, wrong placement, wrong scope, revoked entitlement, duplicate presentation, and concurrent presentation.

Target handheld flow:

**CAMERA → QR/TOKEN → VALIDATE → ADMIT/DENY**

---

# PHASE 6 — STRIPE

Stripe is authoritative for customer payment.

Verify:

- stated price is charged;
- webhook is authoritative;
- payment maps to correct order;
- purchased terms are preserved;
- 85/15 economics are correct;
- Stripe processing cost is absorbed by GateKeeper;
- $50 minimum is enforced;
- platform fee is configurable.

Do not use client-supplied payment confirmation as authoritative.

Do not reintroduce PayPal as the v1.3 collection rail.

---

# PHASE 7 — LEDGER / SETTLEMENT

Verify:

**PAYMENT → DELIVERY CONFIRMED → SETTLEMENT → PAYOUT**

Verify provider payable, platform revenue, processor fee expense, refunds, reversals, disputes, failed delivery, duplicate settlement, duplicate payout, idempotency, and webhook reconciliation.

> **Did all parties satisfy the deal? Then payout. Not before.**

---

# PHASE 8 — TALENTIR

Verify:

- provider payable amount;
- stable payout reference;
- idempotency;
- minimum necessary recipient identifier;
- Talentir-owned onboarding;
- Talentir-owned payout compliance;
- provider-side payout fee;
- payout status reconciliation.

Do not move provider bank/tax/payout credentials into GateKeeper.

---

# PHASE 9 — PLACEMENT ID

Implement only the minimum Placement ID capability required by the Architecture.

It must provide stable association among the relevant offer, entitlement, gate, delivery context, and audit/reconciliation records.

Do not over-design it.

---

# PHASE 10 — PRIVACY / DATA MINIMIZATION

Audit for:

- client names;
- client email;
- client phone;
- client address;
- client profiles;
- PHI;
- provider private contact information;
- provider bank information;
- provider tax information;
- payout credentials;
- CRM-like behavior.

Remove unnecessary data.

Retain only what is necessary for payment, fraud/dispute/compliance, commercial ledger, entitlement, admission, settlement, payout instruction, security, and audit.

---

# PHASE 11 — LEGACY PAYPAL REMOVAL

Remove obsolete PayPal dependencies from running v1.3 code.

Inspect imports, services, routes, configuration, capability registry, tests, fixtures, environment examples, and product documentation.

Do not blindly erase historical migration evidence.

The running v1.3 product must not depend on PayPal for collection.

---

# PHASE 12 — AUTOMATION / FRICTION AUDIT

For every human step ask:

> **Why is a human doing this?**

If the system can perform it safely and deterministically, automate it.

Target:

**PAY → ENTITLEMENT → TOKEN → GATE → SETTLEMENT → PAYOUT**

with minimal intervention.

Eliminate unnecessary confirmation, negotiation, invoice chasing, data entry, approval, private contact exchange, and manual reconciliation.

---

# PHASE 13 — MINIMAL ADMIN

Only build operational controls that cannot reasonably be automated.

Admin exists for exceptions, configuration, security, reconciliation, and authorized intervention.

It is not a dashboard by default.

Do not build vanity metrics, empty dashboards, analytics suites, reporting suites, CRM features, or management theater.

> **If Merk has nothing to administer, there's nothing to visualize.**

---

# PHASE 14 — REAL-WORLD MVP TEST

Put the system in front of actual people.

### Provider

Can make a clear offer.

### Client

Can understand and purchase it.

### Gate

Can deterministically admit or deny.

### Experience

Actually occurs in the provider-selected environment.

### Settlement

Recognizes completion.

### Payout

Pays the provider.

This is the first meaningful proof.

---

# PHASE 15 — TRACTION OBSERVATION

Do not build a sophisticated analytics system.

Collect only enough evidence to answer:

- Did people buy?
- Did providers make offers?
- Did transactions complete?
- Did providers get paid?
- Did clients return?
- Where did the real workflow fail?
- Where did humans have to intervene?
- What did users actually ask for?
- What did users ignore?

Do not invent metrics because they are easy to count.

**Behavior earns the next feature.**

---

# PHASE 16 — SEAM / REGRESSION TESTING

Test:

**Provider PWA → API**  
**Client PWA → API**  
**API → Domain**  
**Domain → Stripe**  
**Stripe → Webhook**  
**Payment → Entitlement**  
**Entitlement → Gate**  
**Gate → Experience**  
**Experience → Settlement**  
**Settlement → Talentir**  
**Talentir → Payout State**

Test failure modes, not only happy paths.

---

# PHASE 17 — FINAL ARCHITECTURE AUDIT

For every Architecture requirement report:

**PASS / FAIL / BLOCKED**

Provide evidence.

Audit:

- clear offer;
- bounded entitlement;
- deal integrity;
- provider sovereignty;
- privacy;
- Stripe;
- 85/15;
- Stripe fee absorption;
- $50 minimum;
- configurable platform fee;
- Talentir;
- provider-side payout fee;
- tips;
- Placement ID;
- deterministic gate;
- real-time mode;
- settlement;
- idempotency;
- webhook reconciliation;
- PayPal removal;
- PWA provider workflow;
- PWA client workflow;
- automation;
- minimal administration.

No feature expansion during the final audit.

---

# CHANGE CONTROL

Before adding anything:

1. What real problem has been observed?
2. What evidence demonstrates it?
3. Who experiences it?
4. Why does the existing system fail?
5. What is the smallest solution?
6. Can the existing system solve it?
7. Can it be automated?
8. What complexity does it add?
9. What happens if the hypothesis is wrong?

If the problem is hypothetical, defer it.

---

# PROHIBITED MVP EXPANSION

Unless demonstrated need and Architecture explicitly justify it, do not add:

- native iOS;
- native Android;
- CRM;
- social network;
- general marketplace;
- event-management platform;
- elaborate scheduling;
- analytics suite;
- BI dashboards;
- recommendation engine;
- loyalty system;
- advertising system;
- speculative AI;
- unnecessary server infrastructure;
- unnecessary database infrastructure.

---

# NATIVE APP GATE

Native iOS development is not an MVP deliverable.

It becomes eligible only when actual usage demonstrates that the PWA is no longer sufficient and the investment solves a demonstrated problem.

The evidence must answer:

- Who needs native?
- What workflow cannot be served adequately by the PWA?
- What measurable friction exists?
- What native capability removes it?
- Is that friction large enough to justify a separate application?

Until then:

**PWA.**

---

# DEFINITION OF DONE

The GateKeeper v1.3 MVP is done when:

1. A provider can make a clear offer.
2. A client can understand and purchase it.
3. Stripe processes payment.
4. Purchase becomes a bounded entitlement.
5. Client receives a deterministic credential.
6. Gate admits or denies.
7. Provider conducts the defined experience.
8. Settlement occurs only when the deal is satisfied.
9. Talentir can disburse provider payable.
10. Financial state is auditable and idempotent.
11. Client data is minimized.
12. Provider private data remains protected.
13. Provider and client handheld workflows operate through PWAs.
14. Transaction friction is low.
15. Routine operation requires little human intervention.
16. The system remains small.
17. Real users demonstrate traction.

**The system does not need to be impressive.**

**It needs to work.**

Then watch what happens.

**DATA EARNS THE NEXT FEATURE.**

---

# FINAL DIRECTIVE

Build the smallest GateKeeper that can make the deal real.

Automate it.

Put it in the hands of a provider and a client.

Watch what happens.

Fix what actually breaks.

Measure what actually matters.

Let evidence determine what comes next.

**ALL SIGNAL. NO NOISE.**

**SHOW, DON'T TELL.**

**PROVE TRACTION FIRST.**
