# AI Archetype System

## Overview

The AI Behavior System has been refactored to support modular unit archetypes. This allows different units to have distinct behavior patterns, making the game more dynamic and extensible.

## Architecture

### Core Components

1. **UnitArchetype (Base Class)** - Abstract base class defining the behavior contract
2. **ArchetypeRegistry** - Singleton registry managing all archetype instances
3. **AIBehaviorSystem** - Coordinates AI updates and delegates to archetypes
4. **CombatSystem** - Handles combat mechanics (damage, enemy detection, attacks)

### Design Philosophy

- **Archetypes are stateless** - All state is stored in `UnitSchema` or `UnitAIState`
- **Deterministic** - Same input always produces same output
- **Performance-optimized** - No allocations in update loops
- **Extensible** - Easy to add new archetypes

## Available Archetypes

### 1. Passive Archetype
**Use Case**: Peaceful units (e.g., Sheep, Villagers)

**Behavior**:
- Wanders randomly within a small area
- Flees when attacked or when enemies are nearby
- Does not engage in combat
- Returns to wandering after fleeing to safety

**States**:
- `Idle` → Transitions to wandering
- `Wandering` → Random movement
- `Fleeing` → Running away from threats

**Configuration** (in `PassiveArchetype.ts`):
```typescript
export const PASSIVE_CONFIG = {
  wanderReplanInterval: 60,    // Ticks between new wander targets
  maxWanderDistance: 5,        // Max tiles for wandering
  fleeDistance: 8,             // How far to run when fleeing
  fleeCooldown: 120,           // Ticks before returning to normal
  fleeDetectionRange: 5,       // Detect threats within range
};
```

### 2. Aggressive Archetype
**Use Case**: Combat units (e.g., Warriors, Spears)

**Behavior**:
- Patrols within a defined area
- Actively searches for enemies
- Chases enemies when detected
- Attacks when in range
- Returns to patrol after killing target

**States**:
- `Idle` → Transitions to patrolling
- `Patrolling` → Moving around looking for threats
- `Chasing` → Pursuing a detected enemy
- `Attacking` → In attack range, dealing damage

**Configuration** (in `AggressiveArchetype.ts`):
```typescript
export const AGGRESSIVE_CONFIG = {
  patrolReplanInterval: 90,    // Ticks between new patrol targets
  maxPatrolDistance: 12,       // Max tiles for patrol
  detectEnemyRange: 10,        // Detection range
  chaseRange: 20,              // Max chase distance
  attackRange: 1.5,            // Attack range in tiles
  attackDamage: 2,             // Damage per attack
  attackCooldown: 60,          // Ticks between attacks
  enemyScanInterval: 10,       // Ticks between enemy scans
};
```

## Adding New Archetypes

### Step 1: Create Archetype Class

Create a new file in `server/src/systems/archetypes/` (e.g., `DefensiveArchetype.ts`):

```typescript
import {
  UnitArchetype,
  UnitArchetypeType,
  UnitAIState,
  ArchetypeUpdateContext,
} from "./UnitArchetype";
import { UnitBehaviorState } from "../../schema";

// Add new archetype type to UnitArchetype.ts:
// export enum UnitArchetypeType {
//   Passive = "passive",
//   Aggressive = "aggressive",
//   Defensive = "defensive",  // New!
// }

export const DEFENSIVE_CONFIG = {
  guardRange: 5,
  // ... other config
};

export class DefensiveArchetype extends UnitArchetype {
  readonly type = UnitArchetypeType.Defensive;

  initializeAIState(unit: UnitSchema): UnitAIState {
    return {
      wanderCooldown: 0,
      attackCooldown: 0,
      lastAttackTick: 0,
      fleeCooldown: 0,
      // Custom state...
    };
  }

  update(context: ArchetypeUpdateContext): void {
    // Implement behavior...
  }

  // Optional callbacks
  onTakeDamage?(context, damage, attackerId) { }
  onKillUnit?(context, killedUnitId) { }
}
```

### Step 2: Register Archetype

In `ArchetypeRegistry.ts`:

```typescript
private registerDefaultArchetypes(): void {
  this.register(new PassiveArchetype());
  this.register(new AggressiveArchetype());
  this.register(new DefensiveArchetype());  // Add this
}
```

### Step 3: Update Schema

In `server/src/schema/UnitSchema.ts`:

```typescript
export enum UnitArchetype {
  Passive = 0,
  Aggressive = 1,
  Defensive = 2,  // Add this
}
```

### Step 4: Update Unit Stats

In `server/src/config/unitStats.ts`:

```typescript
[UnitType.Guard]: {
  health: 15,
  moveSpeed: 0.8 / GAME_CONFIG.SERVER_TICK_RATE,
  archetype: UnitArchetype.Defensive,
},
```

### Step 5: Export Archetype

In `server/src/systems/archetypes/index.ts`:

```typescript
export * from "./DefensiveArchetype";
```

## AI State Management

### UnitAIState Interface

```typescript
export interface UnitAIState {
  // Wander behavior
  wanderCooldown: number;

  // Combat behavior
  targetEnemyId?: string;
  attackCooldown: number;
  lastAttackTick: number;

  // Flee behavior
  fleeCooldown: number;
  fleeTargetX?: number;
  fleeTargetY?: number;

  // Add custom state fields as needed
}
```

**Note**: AI state is NOT synced to clients (performance optimization). Only `UnitSchema` fields are synced.

## Combat System

### Key Functions

```typescript
// Find nearby enemies
CombatSystem.findNearbyEnemies(state, unit, range);

// Find closest enemy
CombatSystem.findClosestEnemy(state, unit, range);

// Check attack range
CombatSystem.isInAttackRange(x1, y1, x2, y2, range);

// Attack target
CombatSystem.attackUnit(attacker, target, damage);

// Check cooldown
CombatSystem.canAttack(currentTick, lastAttackTick, cooldown);
```

### Attack Flow

1. Detect enemy (within detection range)
2. Chase enemy (move towards target)
3. Check if in attack range
4. Check attack cooldown
5. Apply damage with `attackUnit()`
6. Reset cooldown

## Performance Considerations

### Memory Optimization
- Archetypes are **stateless singletons** (no per-unit allocation)
- AI state stored in `Map<string, UnitAIState>` (fast lookups)
- No object allocations in update loops

### CPU Optimization
- Enemy detection throttled by config intervals
- BFS for pathfinding uses early termination
- State machines avoid unnecessary processing
- Uses existing MovementSystem queries

### Network Optimization
- AI state NOT synced to clients
- Only essential `UnitSchema` fields synced
- Minimizes bandwidth usage

## Testing New Archetypes

### 1. Create Test Unit

```typescript
const testUnit = UnitFactory.createUnit(
  playerId,
  UnitType.TestUnit,
  x,
  y
);
state.units.push(testUnit);
```

### 2. Observe Behavior

Watch the unit in-game and verify:
- State transitions work correctly
- Movement is smooth and deterministic
- Combat mechanics function as expected
- No performance issues

### 3. Tune Configuration

Adjust archetype config values:
- Detection ranges
- Movement speeds
- Cooldowns
- Damage values

## Example: Simple Gatherer Archetype

```typescript
export class GathererArchetype extends UnitArchetype {
  readonly type = UnitArchetypeType.Gatherer;

  initializeAIState(unit: UnitSchema): UnitAIState {
    return {
      wanderCooldown: 0,
      attackCooldown: 0,
      lastAttackTick: 0,
      fleeCooldown: 0,
      gatherTargetId: undefined,
      isCarryingResource: false,
    };
  }

  update(context: ArchetypeUpdateContext): void {
    const { unit, state, aiState } = context;

    if (aiState.isCarryingResource) {
      this.returnToCastle(context);
    } else {
      this.findResource(context);
    }
  }

  private findResource(context: ArchetypeUpdateContext): void {
    // Search for trees/resources
    // Move towards nearest resource
  }

  private returnToCastle(context: ArchetypeUpdateContext): void {
    // Find castle
    // Move towards castle
    // Deposit resource when reached
  }
}
```

## FAQ

**Q: How do I change a unit's archetype at runtime?**
```typescript
unit.archetype = UnitArchetype.Aggressive;
// AI system will automatically use new archetype on next tick
```

**Q: Can I have multiple archetypes for one unit type?**
Yes! Assign different archetypes in `UNIT_STATS` or dynamically:
```typescript
const variation = Math.random() > 0.5 ? UnitArchetype.Passive : UnitArchetype.Aggressive;
unit.archetype = variation;
```

**Q: How do I add custom AI state?**
Extend `UnitAIState` with custom fields and initialize them in `initializeAIState()`.

**Q: How do I debug archetype behavior?**
```typescript
const aiState = AIBehaviorSystem.getUnitAIState(unit.id);
console.log(unit.behaviorState, aiState);
```

## Summary

The refactored AI system provides:
- ✅ Modular, extensible architecture
- ✅ Clean separation of concerns
- ✅ Performance-optimized (no allocations)
- ✅ Easy to add new unit behaviors
- ✅ Professional game dev patterns (state machines, archetypes)
- ✅ Fully deterministic and server-authoritative

The archetype system makes it trivial to add new unit types with unique behaviors, supporting the game's evolution and complexity.
