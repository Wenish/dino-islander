# Movement System - Test Plan

## Overview

Comprehensive test plan for validating the floating-point 8-directional movement system.

## Test Categories

### 1. Unit Tests - MovementSystem

#### Test Suite: Walkability Checks

```typescript
describe("MovementSystem.isPositionWalkable", () => {
  test("should return true for floor tile", () => {
    const result = MovementSystem.isPositionWalkable(state, 5, 5);
    expect(result.isWalkable).toBe(true);
  });

  test("should return false for water tile", () => {
    const result = MovementSystem.isPositionWalkable(state, 5, 6);
    expect(result.isWalkable).toBe(false);
    expect(result.blockReason).toContain("not walkable");
  });

  test("should return false for out of bounds", () => {
    const result = MovementSystem.isPositionWalkable(state, -1, 5);
    expect(result.isWalkable).toBe(false);
    expect(result.blockReason).toBe("Out of bounds");
  });

  test("should return false when castle blocks", () => {
    // Place castle at (5, 5)
    const result = MovementSystem.isPositionWalkable(state, 5, 5);
    expect(result.isWalkable).toBe(false);
    expect(result.blockReason).toBe("Castle blocking");
  });

  test("should support floating-point coordinates", () => {
    // (5.7, 5.3) should check tile (5, 5)
    const result = MovementSystem.isPositionWalkable(state, 5.7, 5.3);
    expect(result.isWalkable).toBe(true);
  });
});
```

#### Test Suite: Neighbor Queries

```typescript
describe("MovementSystem.getWalkableNeighbors", () => {
  test("should return 4 cardinal neighbors in open field", () => {
    // Create 5x5 field of floor tiles (5 cardinal + 4 diagonal = 8 walkable)
    const neighbors = MovementSystem.getWalkableNeighbors(state, 2, 2);
    expect(neighbors.length).toBe(8);
  });

  test("should exclude non-walkable neighbors", () => {
    // Create field with water to the right
    // Should return only 7 neighbors (right blocked)
    const neighbors = MovementSystem.getWalkableNeighbors(state, 2, 2);
    expect(neighbors.length).toBe(7);
  });

  test("should include diagonal neighbors", () => {
    const neighbors = MovementSystem.getWalkableNeighbors(state, 5, 5);
    const diagonals = neighbors.filter(n => 
      (n.x !== 5 && n.y !== 5) // Not cardinal
    );
    expect(diagonals.length).toBeGreaterThan(0); // Has diagonals
  });

  test("should support floating-point coordinates", () => {
    // (5.7, 5.3) should be treated as tile (5, 5)
    const neighbors1 = MovementSystem.getWalkableNeighbors(state, 5.7, 5.3);
    const neighbors2 = MovementSystem.getWalkableNeighbors(state, 5.0, 5.0);
    expect(neighbors1.length).toBe(neighbors2.length);
  });
});
```

#### Test Suite: Pathfinding

```typescript
describe("MovementSystem.getNextStepTowards", () => {
  test("should move towards target in cardinal direction", () => {
    const nextStep = MovementSystem.getNextStepTowards(state, 5, 5, 8, 5);
    expect(nextStep).toEqual({ x: 6, y: 5 }); // Right
  });

  test("should move diagonally when both axes differ", () => {
    const nextStep = MovementSystem.getNextStepTowards(state, 5, 5, 8, 8);
    expect(nextStep).toEqual({ x: 6, y: 6 }); // Up-Right
  });

  test("should fall back to cardinal if diagonal blocked", () => {
    // Block (6, 6) with obstacle
    const nextStep = MovementSystem.getNextStepTowards(state, 5, 5, 8, 8);
    // Should try horizontal or vertical instead
    expect(
      (nextStep?.x === 6 && nextStep?.y === 5) || // Right
      (nextStep?.x === 5 && nextStep?.y === 6)    // Down
    ).toBe(true);
  });

  test("should return null when stuck", () => {
    // Surround position with obstacles
    const nextStep = MovementSystem.getNextStepTowards(state, 5, 5, 10, 10);
    expect(nextStep).toBeNull();
  });

  test("should return null when already at target", () => {
    const nextStep = MovementSystem.getNextStepTowards(state, 5, 5, 5, 5);
    expect(nextStep).toBeNull();
  });

  test("should handle floating-point coordinates", () => {
    // Float coordinates should be floored for pathfinding
    const nextStep1 = MovementSystem.getNextStepTowards(state, 5.7, 5.3, 8.9, 8.1);
    const nextStep2 = MovementSystem.getNextStepTowards(state, 5.0, 5.0, 8.0, 8.0);
    expect(nextStep1).toEqual(nextStep2);
  });
});
```

### 2. Unit Tests - MovementService

#### Test Suite: Movement Execution

```typescript
describe("MovementService.updateUnitMovement", () => {
  test("should move unit towards target", () => {
    const unit = createTestUnit({ x: 5, y: 5, targetX: 8, targetY: 5 });
    unit.moveSpeed = 1.0;
    
    const result = MovementService.updateUnitMovement(unit, state, 1.0);
    expect(result.moved).toBe(true);
    expect(unit.x).toBeCloseTo(6); // Moved right by moveSpeed distance
  });

  test("should move by moveSpeed distance per tick", () => {
    const unit = createTestUnit({ x: 5, y: 5, targetX: 8, targetY: 5 });
    
    const result = MovementService.updateUnitMovement(unit, state, 0.5);
    expect(result.moved).toBe(true);
    expect(result.distance).toBeCloseTo(0.5); // Moved by moveSpeed amount
  });

  test("should set reachedTarget when at destination", () => {
    const unit = createTestUnit({ x: 7.7, y: 5, targetX: 8, targetY: 5 });
    
    const result = MovementService.updateUnitMovement(unit, state, 0.5);
    expect(result.reachedTarget).toBe(true);
  });

  test("should return blocked when no path exists", () => {
    const unit = createTestUnit({ x: 5, y: 5 }); // Surrounded
    
    const result = MovementService.updateUnitMovement(unit, state, 0.5);
    expect(result.blocked).toBe(true);
  });

  test("should support fractional move speeds (0.3 tiles/tick)", () => {
    const unit = createTestUnit({ x: 0, y: 0, targetX: 10, targetY: 0 });
    
    // Slow speed: 0.3 tiles per tick
    const result = MovementService.updateUnitMovement(unit, state, 0.3);
    expect(result.distance).toBeCloseTo(0.3);
  });

  test("should return previous position in result", () => {
    const unit = createTestUnit({ x: 5, y: 5, targetX: 8, targetY: 5 });
    
    const result = MovementService.updateUnitMovement(unit, state, 0.5);
    expect(result.prevX).toBe(5);
    expect(result.prevY).toBe(5);
  });
  });
});
```

#### Test Suite: Retry Strategies

```typescript
describe("MovementService retry strategies", () => {
  test("updateUnitMovementWithFallback should clear target on block", () => {
    const unit = createTestUnit({ x: 5, y: 5 }); // Surrounded
    let blockCalled = false;
    
    const result = MovementService.updateUnitMovementWithFallback(
      unit, state, 0.5,
      () => { blockCalled = true; }
    );
    
    expect(result.blocked).toBe(true);
    expect(blockCalled).toBe(true);
    expect(unit.targetX).toBe(unit.x);
    expect(unit.targetY).toBe(unit.y);
  });

  test("updateUnitMovementWithRetry should NOT clear target on block", () => {
    const unit = createTestUnit({ x: 5, y: 5, targetX: 10, targetY: 10 }); // Surrounded
    
    const result = MovementService.updateUnitMovementWithRetry(unit, state, 0.5);
    
    expect(result.blocked).toBe(true);
    // Target should remain unchanged for retry next tick
    expect(unit.targetX).toBe(10);
    expect(unit.targetY).toBe(10);
  });
});
```

### 3. Integration Tests - Archetypes

#### Test Suite: PassiveArchetype Movement

```typescript
describe("PassiveArchetype movement", () => {
  test("should give up and pick new target when blocked", () => {
    const archetype = new PassiveArchetype();
    const unit = createTestUnit({
      archetype: UnitArchetype.Passive,
      x: 5, y: 5, 
      targetX: 100, targetY: 100 // Unreachable
    });
    
    // Mock surrounded area so pathfinding returns null
    const context = createTestContext(unit, [...]);
    
    archetype.update(context);
    
    // Should have picked new target after blocking
    expect(unit.targetX !== 100 || unit.targetY !== 100).toBe(true);
  });

  test("should continue wandering at fractional speed", () => {
    const archetype = new PassiveArchetype();
    const unit = createTestUnit({
      archetype: UnitArchetype.Passive,
      moveSpeed: 0.5 // 0.5 tiles/tick
    });
    
    const context = createTestContext(unit);
    
    // Run 20 ticks (should move ~10 tiles)
    let tiles_moved = 0;
    for (let i = 0; i < 20; i++) {
      const prevX = unit.x, prevY = unit.y;
      archetype.update(context);
      if (unit.x !== prevX || unit.y !== prevY) {
        tiles_moved++;
      }
    }
    
    expect(Math.abs(tiles_moved - 10)).toBeLessThan(2); // ~10 ±2
  });
});
```

#### Test Suite: AggressiveArchetype Movement

```typescript
describe("AggressiveArchetype movement", () => {
  test("should use fallback strategy when chasing (gives up if blocked)", () => {
    const archetype = new AggressiveArchetype();
    const unit = createTestUnit({
      archetype: UnitArchetype.Aggressive,
      x: 5, y: 5
    });
    
    const aiState = { targetEnemyId: "enemy1", targetCastleIndex: undefined };
    const context = createTestContext(unit, [...], aiState);
    
    // Surround unit so pathfinding fails
    archetype.update(context);
    
    // Should return to idle (not retry)
    expect(unit.behaviorState).toBe(UnitBehaviorState.Idle);
    expect(aiState.targetEnemyId).toBeUndefined();
  });

  test("should use retry strategy when attacking castle (keeps trying)", () => {
    const archetype = new AggressiveArchetype();
    const unit = createTestUnit({
      archetype: UnitArchetype.Aggressive,
      x: 5, y: 5,
      targetX: 100, targetY: 100 // Unreachable castle
    });

    
    const aiState = { targetCastleIndex: 0, targetEnemyId: undefined };
    const context = createTestContext(unit, [...], aiState);
    
    archetype.update(context);
    
    // Should keep retrying (target not cleared)
    expect(unit.targetX).toBe(100);
    expect(unit.targetY).toBe(100);
    expect(aiState.targetCastleIndex).toBe(0);
  });
});
```

### 4. Behavioral Tests - Movement Scenarios

#### Scenario 1: Smooth Wander Movement

```typescript
test(\"unit should move at consistent speed: 0.5 tiles/tick\", () => {
  const unit = createTestUnit({
    moveSpeed: 0.5,
    x: 0, y: 0,
    targetX: 100, targetY: 100
  });
  const state = createTestGameState();
  
  const movement_per_tick = [];
  for (let tick = 0; tick < 100; tick++) {
    const prevPos = { x: unit.x, y: unit.y };
    MovementService.updateUnitMovement(unit, state, 0.5);
    const dist = Math.hypot(unit.x - prevPos.x, unit.y - prevPos.y);
    if (dist > 0) movement_per_tick.push(dist);
  }
  
  // Each move should be approximately 0.5 tiles (moveSpeed)
  const avgDist = movement_per_tick.reduce((a, b) => a + b) / movement_per_tick.length;
  expect(avgDist).toBeCloseTo(0.5, 1); // ~0.5 ±0.1
});
```

#### Scenario 2: Diagonal Pathfinding

```typescript
test("unit should prefer diagonal movement toward target", () => {
  const unit = createTestUnit({
    x: 0, y: 0,
    targetX: 5, targetY: 5
  });
  const state = createTestGameState(); // 8x8 open floor
  
  let diagonal_move_count = 0;
  let total_move_count = 0;
  
  while (Math.abs(unit.x - 5) > 0.1 || Math.abs(unit.y - 5) > 0.1) {
    const prevPos = { x: unit.x, y: unit.y };
    
    // Move towards target with 1.0 tile/tick speed
    MovementService.updateUnitMovement(unit, state, 1.0);
    
    const dx = Math.abs(unit.x - prevPos.x);
    const dy = Math.abs(unit.y - prevPos.y);
    
    if (dx > 0.1 && dy > 0.1) { // Diagonal move
      diagonal_move_count++;
    }
    total_move_count++;
    
    if (total_move_count > 20) break; // Safety limit
  }
  
  // Units moving towards 5,5 from 0,0 should make many diagonal moves
  expect(diagonal_move_count).toBeGreaterThan(0);
});
```

#### Scenario 3: Obstacle Avoidance

```typescript
test("unit should avoid obstacles and find alternate path", () => {
  // Create maze: direct path blocked, alternate path available
  const state = createTestGameState();
  // Add wall of obstacles at x=3, y=1..4
  
  const unit = createTestUnit({
    x: 0, y: 2,
    targetX: 6, targetY: 2
  });
  
  let tick = 0;
  let path_found = false;
  
  while (tick < 100) {
    const nextStep = MovementSystem.getNextStepTowards(
      state, unit.x, unit.y, unit.targetX, unit.targetY
    );
    
    if (nextStep) {
      unit.x = nextStep.x;
      unit.y = nextStep.y;
      if (unit.x === 6 && unit.y === 2) {
        path_found = true;
        break;
      }
    }
    tick++;
  }
  
  // Should find path around obstacle
  expect(path_found).toBe(true);
  expect(tick).toBeLessThan(50);
});
```

### 5. Performance Tests

```typescript
describe("Performance benchmarks", () => {
  test("pathfinding should be fast (< 100μs per call)", () => {
    const iterations = 1000;
    const state = createTestGameState();
    
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      MovementSystem.getNextStepTowards(state, 5, 5, 10, 10);
    }
    const elapsed = performance.now() - start;
    const avg_time = elapsed / iterations * 1000; // Convert to microseconds
    
    expect(avg_time).toBeLessThan(100); // < 100μs
  });

  test("movement service should handle 100 units (< 1ms)", () => {
    const units = Array.from({ length: 100 }, () =>
      createTestUnit()
    );
    const state = createTestGameState();
    
    const start = performance.now();
    for (const unit of units) {
      MovementService.updateUnitMovement(unit, state, 0.5);
    }
    const elapsed = performance.now() - start;
    
    expect(elapsed).toBeLessThan(1); // < 1ms for all 100
  });
});
```

## Test Execution Guide

### Setup

```typescript
// Test utilities
function createTestUnit(overrides?: any): UnitSchema {
  const unit = new UnitSchema();
  unit.id = "test-unit-" + Math.random();
  unit.x = 0;
  unit.y = 0;
  unit.targetX = 0;
  unit.targetY = 0;
  unit.moveSpeed = 1.0;
  unit.archetype = UnitArchetype.Aggressive;
  unit.behaviorState = UnitBehaviorState.Idle;
  return Object.assign(unit, overrides);
}

function createTestGameState(): GameRoomState {
  const state = new GameRoomState();
  state.width = 16;
  state.height = 16;
  
  // Fill with floor tiles
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const tile = new TileSchema();
      tile.x = x;
      tile.y = y;
      tile.type = TileType.Floor;
      state.tiles.push(tile);
    }
  }
  
  return state;
}

function createTestContext(
  unit: UnitSchema,
  state?: GameRoomState,
  aiState?: UnitAIState
) {
  return {
    unit,
    state: state || createTestGameState(),
    aiState: aiState || {
      wanderCooldown: 0,
      attackCooldown: 0,
      lastAttackTick: 0,
      fleeCooldown: 0,
      deathTick: undefined
    }
  };
}
```

### Run Tests

```bash
# Run all movement tests
npm test -- --testPathPattern="movement"

# Run specific test file
npm test -- src/systems/services/MovementService.test.ts

# Run with coverage
npm test -- --coverage

# Run benchmarks
npm test -- --testNamePattern="benchmark|Performance"
```

## Expected Results

- ✅ All pathfinding tests should pass
- ✅ All movement service tests should pass
- ✅ All archetype integration tests should pass
- ✅ Performance tests should show < 1ms for 100 units
- ✅ Floating-point coordinate tests should verify precision
- ✅ 8-directional tests should confirm diagonal support

## Success Criteria

| Criteria | Metric | Target |
|----------|--------|--------|
| Test Coverage | Statements | > 90% |
| Performance | Pathfinding | < 100μs |
| Performance | 100 units | < 1ms |
| Correctness | Pathfinding | 100% |
| Correctness | Movement | 100% |
| Determinism | Same seed → same path | 100% |

---

**Last Updated**: February 16, 2026
