# THE MYTHOS MANIFESTO

## How We Build

**Version 1.1 — Living Document**

> **ALL SIGNAL. NO NOISE.**

This document defines how we build software, systems, tools, and agentic infrastructure.

**Important terminology:** Mythos is a brand asset. It is not an operating system, technical platform, runtime, or architectural dependency. Product architecture is defined by the product's own specification.

---

## Preamble

We build systems to solve real problems.

We do not build systems to demonstrate that we can build systems.

The human establishes intent, constraints, architecture, priorities, judgment, and acceptance. Agentic intelligence assists with inspection, implementation, testing, iteration, and execution.

This is **human-directed agentic engineering**.

The codebase is a shared workspace with explicit boundaries. The agent may inspect, implement, test, iterate, and execute within the authorized scope. The agent must not silently redefine requirements, architecture, or acceptance criteria.

The human remains the decision maker.

**Delegating execution is acceptable. Delegating judgment is not.**

---

## I. Modular Systems

Build systems as understandable modules with clear responsibilities and boundaries.

A module should do one thing well and be independently understandable.

Modularity exists to preserve clarity, replaceability, testability, interoperability, and reuse.

Do not create artificial modularity merely to satisfy a pattern.

---

## II. Same Language. Same Tech Stack.

Use the existing language and technology stack when it is fit for purpose.

Do not introduce a new framework, runtime, language, database, or dependency merely because it is fashionable or technically interesting.

The objective is not to use every technology available.

The objective is to reduce friction between components and reduce the cognitive load required to understand the whole system.

---

## III. Interoperability

Components must communicate through explicit, stable contracts.

A component should not need another component's internal secrets to use its interface.

Define:

- inputs;
- outputs;
- guarantees;
- errors;
- state transitions;
- ownership.

The seam is part of the system.

---

## IV. Portability

Build so that the system can move.

Avoid unnecessary dependence on one vendor, platform, machine, or environment.

Portable data and explicit interfaces preserve future choices.

---

## V. Preserve What Works

Existing working functionality is an asset.

Inspect first.

Identify what works.

Identify what must not break.

Preserve compliant components.

Change only what needs to change.

---

## VI. Don't Build the Same Thing Twice

Reuse working components before creating replacements.

If two systems need the same capability, determine whether a shared module or contract is appropriate.

Do not create parallel implementations merely because they are convenient.

---

## VII. Native Before Novel

Use the existing language, platform, libraries, and tooling before inventing new infrastructure.

A new abstraction must earn its existence by solving a demonstrated problem that the existing stack cannot reasonably solve.

---

## VIII. Restraint

Complexity is a cost.

Every additional layer, dependency, service, abstraction, data store, workflow, and operational surface creates another place where the system can fail.

Do not add complexity because it is interesting.

Do not build for imaginary scale.

Do not build for hypothetical users.

Do not build infrastructure before the problem exists.

**Earn the complexity.**

---

## IX. Separation of Concerns

Keep domains separate.

A presentation change should not unnecessarily alter core business logic.

Payment is not entitlement.

Entitlement is not admission.

Admission is not delivery.

Delivery is not settlement.

Administration is not the product.

Clean boundaries reduce unintended coupling.

---

## X. Single Source of Truth

Every important fact should have one authoritative owner.

Avoid competing copies of state.

Avoid scattered implicit state.

When two systems need the same information, define which system owns it and how the other system receives it.

If nobody knows which copy is authoritative, the system is not finished.

---

## XI. Clarity Over Cleverness

Prefer code and architecture that another engineer or agent can understand quickly.

Do not optimize for cleverness.

Do not hide important behavior behind unnecessary abstraction.

Readable systems are easier to verify and safer to change.

---

## XII. Comments Explain Why

Comments explain decisions, constraints, assumptions, and non-obvious reasons.

Do not write comments that merely repeat what the code says.

---

## XIII. Additive Engineering

Prefer small, reversible changes.

The preferred model is:

**EXISTING SYSTEM + NEW CAPABILITY = EXISTING SYSTEM + NEW CAPABILITY**

Not:

**EXISTING SYSTEM → REWRITE EVERYTHING → HOPE NOTHING BROKE**

New functionality should be additive whenever practical.

---

## XIV. Show, Don't Tell

A system is not correct because documentation says it is correct.

Build it.

Run it.

Test it.

Observe it.

Demonstrate it.

**SHOW, DON'T TELL.**

There is a critical difference between **implemented** and **verified**.

Evidence beats assertion.

---

## XV. No Delusional Optimism

Do not confuse:

- compiles with works;
- starts with works;
- tests with correctness;
- mock success with production success;
- architectural claims with architectural proof;
- plausible results with evidence;
- activity with traction;
- test volume with verification.

Report failures plainly.

Report uncertainty plainly.

---

## XVI. Test the Module and the Seam

Test the component itself.

Then test the boundary between components.

A collection of individually functioning modules is not necessarily a functioning system.

Integration is a first-class requirement.

---

## XVII. Don't Build a System to Prove the System

The objective is meaningful evidence of correctness, not maximum test volume.

Do not generate thousands of meaningless tests merely to produce green check marks.

Do not build dashboards merely to display activity.

Do not build verification infrastructure merely to validate the verification infrastructure.

Use the smallest credible test that answers the real question.

---

## XVIII. Integration Is a First-Class Requirement

A component is incomplete if it cannot participate correctly in the larger system.

Verify:

- real contracts;
- real state transitions;
- real errors;
- real boundaries;
- failure modes.

---

## XIX. No Opportunistic Refactoring

Do not turn a focused task into a cleanup expedition.

Do not reorganize unrelated files.

Do not redesign working architecture merely because another pattern appears preferable.

**Solve the requested problem. Then stop.**

Unrelated technical debt may be recorded, but it is not automatically authorized for repair.

---

## XX. Human + Agentic Intelligence

The human provides:

- intent;
- constraints;
- architecture;
- priorities;
- judgment;
- acceptance.

The agent provides:

- inspection;
- implementation;
- testing;
- iteration;
- execution;
- evidence gathering.

The agent is an implementation partner.

The human remains the decision maker.

The agent must not silently redefine requirements or architecture.

If the agent encounters a conflict, ambiguity, or architectural roadblock, it stops and reports the conflict rather than inventing a new requirement.

---

## XXI. Proportional Architecture

Architecture must be proportional to demonstrated need.

Do not build a million-user system for ten users.

Do not build a cloud infrastructure layer when a local file is sufficient.

Do not build a management system before management work exists.

Do not build analytics before meaningful data exists.

Do not build administration for work that automation should eliminate.

---

## XXII. Verifiable Change

Every meaningful change must be verifiable.

The sequence is:

1. Stop.
2. Read the governing specification.
3. Inspect the system.
4. Understand what already exists.
5. Identify what must not break.
6. Define the smallest appropriate change.
7. Build a bounded module or change.
8. Define the seam.
9. Preserve existing function.
10. Build and type-check.
11. Test the result.
12. Test the seam.
13. Show the evidence.
14. Ship only when the change is verified.

---

## XXIII. Be Less Wrong Most of the Time

We do not need perfect prediction.

We need disciplined correction.

Make the best decision supported by available evidence.

When evidence changes, change the decision.

**BE LESS WRONG MOST OF THE TIME.**

---

## XXIV. The Architectural Test

Before adding a feature, ask:

1. What real problem does this solve?
2. Who has the problem?
3. What evidence demonstrates it?
4. Why can't the existing system solve it?
5. What is the smallest implementation that solves it?
6. Can the problem be solved through existing capabilities?
7. Can it be automated?
8. What complexity does it introduce?
9. Can it be removed cleanly if the hypothesis is wrong?

If those questions cannot be answered, the feature probably does not belong yet.

---

## THE LEANSTACK ETHOS

**LEANSTACK is the primary product-development ethos.**

Build the minimum system capable of producing real-world evidence.

The system must earn its complexity.

### No cattle. No hat.

If there is no data, we do not need a dashboard.

If there is no activity to manage, we do not need an administrative system.

If there is no demonstrated operational problem, we do not build operational machinery for it.

If automation can perform the task safely and deterministically, do not create a human workflow around it.

> **If Merk has nothing to administer, there's nothing to visualize.**

And more importantly:

> **If Merk does his fucking job, there should be very little to administer.**

The objective is not to create a beautiful control panel for an imaginary business.

The objective is to make the business require as little control as possible.

**Prove traction first. Then build the machinery justified by the evidence.**

---

## MYTHOS AS BRAND ASSET

Mythos is a brand asset.

It may identify a body of work, intellectual property, product family, or related creative asset.

It is not an operating system.

It is not a runtime.

It is not a technical platform.

It is not a dependency of GateKeeper.

Product architecture is defined by the product's own architecture specification.

---

## THE STANDARD

We build systems that are:

- clear;
- bounded;
- modular;
- interoperable;
- portable;
- proportional;
- testable;
- verifiable;
- automated where appropriate;
- minimally complex;
- honest about uncertainty;
- proven by evidence.

---

## FINAL DIRECTIVE

**STOP.**

Read the governing specification.

Inspect the system.

Understand what already exists.

Identify what must not break.

Define the smallest appropriate change.

Build the module.

Define the seam.

Preserve existing function.

Test the result.

Show the evidence.

Then, and only then, ship it.

**ALL SIGNAL. NO NOISE.**

**SHOW, DON'T TELL.**

**BE LESS WRONG MOST OF THE TIME.**

**PROVE TRACTION FIRST.**
