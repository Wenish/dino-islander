# Multiplayer Game Server – Implementation Instructions

This document defines **how the server code should be written and structured**, without describing any specific gameplay features or mechanics. It serves as a **technical and architectural guideline** for building a production-grade, deterministic, server-authoritative multiplayer game backend using **Colyseus + TypeScript + Node.js**.

---

## Core Engineering Principles

* Server-authoritative architecture
* Deterministic simulation
* Fixed-tick simulation loop
* Predictable memory usage
* Modular, testable system design
* Production-grade performance & scalability

The server must be designed as the **single source of truth**. Clients only submit *player intent*. All simulation, validation, AI, movement, combat, economy, and victory logic must be fully server-driven.

---

## High-Level Architecture

### Domain-Driven Modular Structure

Organize the project into clearly isolated domains:

```
src/
 ├── rooms/
 ├── schema/
 ├── systems/
 ├── utils/
 ├── config/
 └── index.ts
```

Each domain must:

* Have a single responsibility
* Avoid cross-domain coupling
* Be independently testable
* Be reusable across rooms

---

## Colyseus Design Principles

### Room Responsibilities

Room classes should:

* Handle client connections
* Validate all incoming messages
* Dispatch commands into systems
* Orchestrate the simulation loop
* Maintain authoritative game state

Rooms **must not** contain heavy logic. They should coordinate systems, not implement gameplay rules.

### Schema Design

* Keep schemas minimal
* Sync only essential state
* Avoid deep nesting
* Prefer flat data structures
* Avoid frequent allocations
* Minimize high-frequency mutation

All synced data must be:

* Serializable
* Deterministic
* Order-stable

---

## Deterministic Simulation

### Fixed Tick Loop

* Use a fixed timestep simulation
* Never use real-time deltas
* Simulation must advance in discrete ticks

Example approach:

* 5–10 ticks per second
* Fixed delta per tick
* No async logic inside simulation

### Determinism Rules

* No random without seeded RNG
* No system time inside simulation
* No floating-point instability
* No async callbacks inside tick

---

## System-Based Architecture

All game logic must live inside isolated **systems**.

### System Responsibilities

Each system:

* Owns its own state
* Exposes only explicit APIs
* Does not access other system internals
* Receives world context as arguments

Example:

```
System.update(world, delta)
```

### System Execution Order

Use deterministic update phases:

1. Input processing
2. AI
3. Movement
4. Interaction / Combat
5. Resource / Economy
6. State resolution

This ordering must remain fixed.

---

## Memory & GC Optimization

### Allocation Rules

* Zero allocations inside tick loops
* Reuse arrays
* Reuse objects
* Use pooling for entities

### Data Structures

* Prefer simple arrays
* Avoid map churn
* Preallocate buffers
* Avoid closures inside loops

---

## Tick Loop Performance Design

### Core Rules

* Never block inside tick
* Never allocate memory inside tick
* Never await inside tick
* No logging inside tick

### Loop Pattern

```
try {
  processInput()
  updateAI()
  updateMovement()
  resolveCombat()
  updateEconomy()
} catch (e) {
  logCritical()
}
```

---

## Network Optimization Strategy

### Schema Sync Strategy

* Sync only long-lived state
* Use messages for short-lived events
* Avoid sending per-tick data

### Bandwidth Minimization

* No per-frame movement sync
* No per-tick combat sync
* Sync only snapshots & key transitions

---

## Pathing & Navigation Architecture

* Precompute navigation graphs
* Cache paths aggressively
* Rebuild graphs only on topology changes
* Never pathfind every tick

---

## AI Architecture

### State Machine Design

All AI must:

* Be explicit state machines
* Never scan full world
* Use spatial indexing
* Use cached queries

### Update Phases

* Perception
* Decision
* Execution

---

## Input Validation & Security

All client inputs must:

* Be validated
* Be clamped
* Be sanity-checked
* Never directly modify state

Clients only express **intent**, never outcome.

---

## Crash Safety & Stability

* Wrap simulation loop in try/catch
* Guard all external inputs
* Fail gracefully
* Log structured errors

---

## Logging & Production Readiness

### Logging

* Structured logs only
* No console spam
* Log only:

  * Startup
  * Errors
  * Critical lifecycle events

### Configuration

* Environment-driven config
* No hardcoded ports
* No hardcoded secrets

---

## Replay, Snapshot & Debug Architecture

The server must support:

* Full deterministic replay
* Snapshot saving
* Match recording
* Debug inspection hooks

Design systems so they can:

* Serialize state snapshots
* Re-run simulation deterministically

---

## Testing Strategy

* Unit-test all systems
* Deterministic simulation tests
* Tick-step replay tests
* Snapshot consistency tests

---

## Engineering Quality Standards

Code must be:

* Idiomatic TypeScript
* Fully typed
* Cleanly structured
* Strict linting compliant
* Modular
* Testable

---

## Summary

This document defines **how the server must be engineered**, not what the gameplay is.

Follow these principles to build:

* Deterministic
* Scalable
* Cheat-resistant
* Production-grade
* Long-term maintainable

multiplayer game server architectures.
