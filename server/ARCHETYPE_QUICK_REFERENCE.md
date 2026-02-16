# Archetype System - Quick Reference

## System Flow

```
Game Tick
    ↓
GameRoom.simulationLoop()
    ↓
AIBehaviorSystem.updateAllUnitsAI(state)
    ↓
For each unit:
    ↓
    AIBehaviorSystem.updateUnitAI(unit, state)
        ↓
        Get archetype from registry
        ↓
        Create ArchetypeUpdateContext
        ↓
        Archetype.update(context)
            ↓
            [Archetype-specific behavior]
            ↓
            - Passive: Wander → Detect Threat → Flee
            - Aggressive: Patrol → Detect Enemy → Chase → Attack
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                       Game Room State                        │
│  (Synced to Clients)                                        │
│                                                              │
│  UnitSchema {                                               │
│    id, x, y, health                                         │
│    unitType: Warrior | Sheep                                │
│    archetype: Passive | Aggressive  ← Determines behavior   │
│    behaviorState: Idle | Wandering | Moving | Fleeing...   │
│    targetX, targetY, moveProgress, moveSpeed                │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    Read by archetypes
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    AIBehaviorSystem                          │
│  (Server-only, not synced)                                  │
│                                                              │
│  UnitAIState Map {                                          │
│    unitId → {                                               │
│      wanderCooldown                                         │
│      attackCooldown                                         │
│      targetEnemyId                                          │
│      fleeTargetX, fleeTargetY                               │
│      ...                                                    │
│    }                                                        │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    Used by archetypes
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Archetype Registry                        │
│                                                              │
│  Map {                                                      │
│    "passive" → PassiveArchetype instance                    │
│    "aggressive" → AggressiveArchetype instance              │
│  }                                                          │
│                                                              │
│  All archetypes implement:                                  │
│    - update(context)                                        │
│    - initializeAIState(unit)                                │
│    - onTakeDamage?(context, damage, attackerId)             │
│    - onKillUnit?(context, killedUnitId)                     │
└─────────────────────────────────────────────────────────────┘
```

## Archetype State Machines

### Passive (Sheep)
```
┌──────┐
│ Idle │
└──┬───┘
   │ Start
   ↓
┌───────────┐     Enemy Detected     ┌──────────┐
│ Wandering │ ────────────────────→  │ Fleeing  │
└─────┬─────┘                        └────┬─────┘
      ↑                                    │
      │         Flee Cooldown Expired     │
      └────────────────────────────────────┘
```

### Aggressive (Warrior)
```
┌──────┐
│ Idle │
└──┬───┘
   │ Start
   ↓
┌────────────┐   Enemy Detected    ┌──────────┐
│ Patrolling │ ──────────────────→ │ Chasing  │
└──────┬─────┘                     └────┬─────┘
       ↑                                 │
       │ Enemy Lost/Too Far              │ In Attack Range
       │                                 ↓
       │                          ┌────────────┐
       │                          │ Attacking  │
       │                          └──────┬─────┘
       │                                 │
       │        Enemy Killed/Lost       │
       └─────────────────────────────────┘
```

## Key Classes

### UnitArchetype (Abstract)
```typescript
abstract class UnitArchetype {
  abstract readonly type: UnitArchetypeType;
  abstract update(context: ArchetypeUpdateContext): void;
  abstract initializeAIState(unit: UnitSchema): UnitAIState;
  onTakeDamage?(context, damage, attackerId): void;
  onKillUnit?(context, killedUnitId): void;
}
```

### PassiveArchetype
```typescript
class PassiveArchetype extends UnitArchetype {
  type = UnitArchetypeType.Passive;
  
  update(context) {
    - checkForThreats()
    - handleIdle() | handleWandering() | handleFleeing()
  }
  
  onTakeDamage(context, damage, attackerId) {
    startFleeing(context, attackerId);
  }
}
```

### AggressiveArchetype
```typescript
class AggressiveArchetype extends UnitArchetype {
  type = UnitArchetypeType.Aggressive;
  
  update(context) {
    - handleIdle() | handlePatrolling() | 
      handleChasing() | handleAttacking()
  }
  
  onKillUnit(context, killedUnitId) {
    returnToPatrol();
  }
}
```

### CombatSystem (Utilities)
```typescript
class CombatSystem {
  static findNearbyEnemies(state, unit, range): NearbyEnemy[]
  static findClosestEnemy(state, unit, range): UnitSchema | null
  static isInAttackRange(x1, y1, x2, y2, range): boolean
  static attackUnit(attacker, target, damage): AttackResult
  static canAttack(currentTick, lastAttackTick, cooldown): boolean
  static getUnitById(state, unitId): UnitSchema | null
}
```

## Configuration Overview

| Archetype   | Config File              | Key Settings                        |
|-------------|--------------------------|-------------------------------------|
| Passive     | PassiveArchetype.ts      | wander distance, flee range         |
| Aggressive  | AggressiveArchetype.ts   | patrol distance, attack range       |
| General     | aiConfig.ts              | default move speed                  |
| Unit Stats  | unitStats.ts             | health, moveSpeed, archetype        |
| Combat      | CombatSystem.ts          | attack damage, cooldown, ranges     |

## Adding a New Archetype Checklist

- [ ] Create archetype class in `src/systems/archetypes/`
- [ ] Extend `UnitArchetype` base class
- [ ] Implement `update()` and `initializeAIState()`
- [ ] Add to `UnitArchetypeType` enum
- [ ] Register in `ArchetypeRegistry.registerDefaultArchetypes()`
- [ ] Add to `UnitArchetype` enum in `UnitSchema.ts`
- [ ] Map to unit type in `unitStats.ts`
- [ ] Export from `systems/archetypes/index.ts`
- [ ] Test in-game
- [ ] Tune configuration values

## Common Patterns

### Finding Enemies
```typescript
const enemies = CombatSystem.findNearbyEnemies(state, unit, range);
if (enemies.length > 0) {
  startChasing(context, enemies[0].unit);
}
```

### Movement
```typescript
unit.moveProgress += unit.moveSpeed;
if (unit.moveProgress >= 1.0) {
  const nextStep = MovementSystem.getNextStepTowards(
    state, unit.x, unit.y, unit.targetX, unit.targetY
  );
  if (nextStep) {
    unit.x = nextStep.x;
    unit.y = nextStep.y;
    unit.moveProgress -= 1.0;
  }
}
```

### Attacking
```typescript
if (CombatSystem.isInAttackRange(unit.x, unit.y, target.x, target.y, range)) {
  if (aiState.attackCooldown <= 0) {
    const result = CombatSystem.attackUnit(unit, target, damage);
    if (result.success) {
      aiState.attackCooldown = ATTACK_COOLDOWN;
      if (result.targetKilled) {
        onKillUnit?.(context, target.id);
      }
    }
  }
}
```

### Pathfinding (BFS)
```typescript
const candidates = [];
const visited = new Set();
const queue = [{ x: unit.x, y: unit.y, dist: 0 }];

while (queue.length > 0 && candidates.length < 20) {
  const current = queue.shift()!;
  if (current.dist > 0 && current.dist <= maxDistance) {
    candidates.push({ x: current.x, y: current.y });
  }
  
  if (current.dist < maxDistance) {
    const neighbors = MovementSystem.getWalkableNeighbors(state, current.x, current.y);
    for (const neighbor of neighbors) {
      const key = `${neighbor.x},${neighbor.y}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ ...neighbor, dist: current.dist + 1 });
      }
    }
  }
}

// Pick random candidate
const target = candidates[Math.floor(Math.random() * candidates.length)];
```

## Performance Tips

1. **Throttle expensive operations** - Don't scan for enemies every tick
2. **Early termination** - Stop BFS after finding enough candidates
3. **Reuse queries** - Use MovementSystem and CombatSystem utilities
4. **Avoid allocations** - Reuse objects, don't create new ones in update()
5. **Keep AI state minimal** - Only store what's necessary

## Debugging

```typescript
// Log AI state
const aiState = AIBehaviorSystem.getUnitAIState(unit.id);
console.log(`Unit ${unit.id}: state=${unit.behaviorState}, aiState=`, aiState);

// Log archetype
const archetype = getArchetypeRegistry().getArchetype(unit.archetype);
console.log(`Using archetype: ${archetype?.type}`);
```

## Summary

The archetype system provides:
- **Modularity** - Each behavior is isolated and testable
- **Extensibility** - Easy to add new unit types
- **Performance** - Optimized for hundreds of units
- **Maintainability** - Clear separation of concerns
- **Professional** - Industry-standard patterns

Built to scale with your game's complexity! 🎮
