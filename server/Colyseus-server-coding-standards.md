# Colyseus Server – Coding Standards & Style Guide

This document defines **professional engineering standards** for building a **production-grade, server-authoritative multiplayer backend** using **Colyseus, TypeScript, and Node.js**.

It focuses on **clarity, determinism, performance, safety, maintainability, and scalability**.

---

# 1) Core Engineering Philosophy

All server code must follow these principles:

* Deterministic
* Server-authoritative
* Scalable
* Predictable
* Maintainable
* Testable

> **The server is a simulation engine, not an application backend.**

This means:

* Logic is deterministic
* Behavior is reproducible
* Systems are pure and isolated
* State transitions are explicit

---

# 2) Project Structure Standards

### Required Layout

```
src/
 ├── rooms/
 ├── schema/
 ├── systems/
 ├── utils/
 ├── config/
 ├── bootstrap/
 └── index.ts
```

### Folder Responsibilities

| Folder    | Responsibility                             |
| --------- | ------------------------------------------ |
| rooms     | Networking, orchestration, simulation loop |
| schema    | Network-synced state only                  |
| systems   | All simulation logic                       |
| utils     | Math, pooling, helpers, utilities          |
| config    | Environment-based configuration            |
| bootstrap | Server startup, logging, dependency wiring |

---

# 3) TypeScript Standards

### Compiler Settings

Strict mode is **mandatory**:

* `strict: true`
* `noImplicitAny: true`
* `strictNullChecks: true`
* `noUncheckedIndexedAccess: true`

### Typing Rules

* Never use `any`
* Avoid `unknown` unless boundary crossing
* All public APIs must be fully typed

---

# 4) Naming Conventions

### Files

```
kebab-case.ts
```

Examples:

* `combat-system.ts`
* `pathfinding-system.ts`
* `simulation-loop.ts`

---

### Classes

```
PascalCase
```

Examples:

* `CombatSystem`
* `MovementSystem`
* `GameRoom`

---

### Variables & Functions

```
camelCase
```

Examples:

* `updateUnits()`
* `processInput()`

---

### Constants & Enums

```
SCREAMING_SNAKE_CASE
```

Examples:

* `TICK_RATE`
* `MAX_PLAYERS`

---

# 5) Code Style Rules

### Function Size

* Max 30–40 lines per function
* Split logic aggressively

---

### File Size

* Max 300 lines
* If exceeded → split into submodules

---

### Cyclomatic Complexity

* Maximum complexity: **8**

---

### No Magic Numbers

Replace:

```
if (hp < 37)
```

With:

```
if (hp < LOW_HP_THRESHOLD)
```

---

# 6) Simulation Code Standards

### Absolute Rules

Inside the tick loop:

* ❌ No allocations
* ❌ No async
* ❌ No logging
* ❌ No random
* ❌ No Date / time calls

---

### Simulation Function Pattern

```
update(world: WorldState, tick: number): void
```

---

### Update Order Consistency

All systems must update in **fixed order**:

1. Input
2. AI
3. Movement
4. Interaction
5. Combat
6. Economy
7. Resolution

Never change ordering dynamically.

---

# 7) Determinism Standards

### RNG

* Use seeded PRNG
* Never use `Math.random()` inside simulation

---

### Floating Point

* Prefer integer math
* Quantize floats
* Use fixed precision

---

### Time

* Only fixed ticks
* No wall clock usage

---

# 8) Memory & GC Standards

### Allocation Policy

* Zero allocations inside update loops
* Reuse arrays
* Use object pooling

---

### Pooling Pattern

```
class Pool<T> {
  acquire(): T
  release(obj: T): void
}
```

---

# 9) Networking & Schema Standards

### Schema Design Rules

* Minimal
* Flat
* No deep nesting
* Only long-lived state

---

### Sync Frequency Rules

| Data Type  | Sync Method |
| ---------- | ----------- |
| Persistent | Schema      |
| Frequent   | Messages    |
| Transient  | Messages    |

---

# 10) System Design Standards

### System Interface

```
interface System {
  init(world: WorldState): void
  update(world: WorldState, tick: number): void
  reset(): void
}
```

---

### System Rules

* No cross-system state mutation
* No system dependencies
* Systems communicate only via world state

---

# 11) Error Handling Standards

### Tick Loop Protection

```
try {
  simulateTick()
} catch (err) {
  logCritical(err)
}
```

---

### Input Validation

All client inputs must:

* Be schema validated
* Be bounds checked
* Be sanity checked

---

# 12) Logging Standards

### Log Levels

| Level | Usage                     |
| ----- | ------------------------- |
| info  | Startup, shutdown         |
| warn  | Recoverable issues        |
| error | Unexpected failures       |
| fatal | Simulation integrity loss |

---

### Structured Logging Only

```
logger.error({ roomId, tick, err }, "simulation_error")
```

---

# 13) Configuration Standards

* Environment-driven config
* No hardcoded values
* Strict validation at startup

---

# 14) Testing Standards

### Required Test Types

* System unit tests
* Deterministic replay tests
* Snapshot consistency tests
* Long-duration soak tests

---

# 15) Documentation Standards

### Inline Comments

* Explain **why**, not **what**
* Avoid trivial comments

---

### File Headers

Each system file should contain:

```
/**
 * Purpose:
 * Determinism guarantees:
 * Performance assumptions:
 */
```

---

# 16) Performance Review Checklist

Before merging:

* [ ] No allocations inside tick
* [ ] Deterministic behavior verified
* [ ] No blocking calls
* [ ] No logging inside simulation
* [ ] No async inside systems

---

# 17) Professional Quality Bar

Every system must be:

* Deterministic
* Testable
* Readable
* Optimized
* Predictable

---

# Summary

This style guide ensures:

* Deterministic gameplay
* Stable performance
* Low GC pressure
* Scalable architecture
* Clean engineering standards

Following these rules will produce **enterprise-grade multiplayer simulation servers**.
