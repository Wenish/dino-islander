/**
 * MOVEMENT SYSTEM ARCHITECTURE
 * 
 * Comprehensive guide to the floating-point movement system
 * with 8-directional pathfinding and consolidated movement logic.
 */

// ============================================================================
// OVERVIEW
// ============================================================================

The movement system is designed with clean architecture principles:

1. **StatelessUtility Services**: Functions that don't maintain state
2. **Single Responsibility**: Each class has one reason to change
3. **Deterministic**: Same inputs always produce same outputs (replay-safe)
4. **Performance-Optimized**: Minimal allocations, efficient pathfinding
5. **Production-Ready**: Comprehensive error handling and edge cases

// ============================================================================
// ARCHITECTURE LAYERS
// ============================================================================

┌─────────────────────────────────────────────────────────────┐
│                    ARCHETYPE LAYER                         │
│   (PassiveArchetype, AggressiveArchetype, WildAnimalA...)   │
│                                                              │
│   Responsibilities:                                          │
│   - Behavior state machines (Idle, Moving, Attacking, etc.) │
│   - AI decision making (what to do next?)                   │
│   - Calls MovementService for movement execution            │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│               MOVEMENT SERVICE LAYER                        │
│         (src/systems/services/MovementService.ts)           │
│                                                              │
│   Responsibilities:                                          │
│   - Execute unit movement (tile-by-tile)                    │
│   - Manage movement progress accumulation                   │
│   - Provide movement results (details about what happened)  │
│   - Support different retry strategies                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              MOVEMENT SYSTEM LAYER                          │
│         (src/systems/MovementSystem.ts)                     │
│                                                              │
│   Responsibilities:                                          │
│   - Validate walkability of positions                       │
│   - Pathfinding with 8-directional support                  │
│   - Query neighbors (cardinal + diagonal)                   │
│   - Check tile-level collision                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                 GAME STATE                                  │
│        (GameRoomState: Tiles, Castles, Units)               │
│                                                              │
│   Provides:                                                  │
│   - Tile map for walkability checks                         │
│   - Castle positions for collision                          │
│   - Unit database for distance checks                       │
└─────────────────────────────────────────────────────────────┘

// ============================================================================
// KEY FEATURES
// ============================================================================

1. **FLOATING-POINT COORDINATES**
   ✓ Units maintain float32 x, y coordinates (not integers)
   ✓ Supports smooth sub-tile animation
   ✓ moveProgress accumulates fractional movement
   ✓ Enables 0.5 tiles/tick speeds (smooth animation)

2. **8-DIRECTIONAL PATHFINDING**
   ✓ Supports cardinal moves (Up, Down, Left, Right)
   ✓ Supports diagonal moves (Up-Left, Up-Right, Down-Left, Down-Right)
   ✓ Greedy A* with preference for diagonals
   ✓ Falls back to cardinal if diagonal blocked

3. **MOVEMENT ACCUMULATION**
   ✓ moveProgress tracks fractional tile progress
   ✓ Each tick: moveProgress += moveSpeed
   ✓ When moveProgress >= 1.0, unit moves to next tile
   ✓ Remaining progress carries over (enables smooth animation)

   Example:
   - moveSpeed = 0.5 tiles/tick
   - Tick 1: moveProgress = 0.5 (no move yet)
   - Tick 2: moveProgress = 1.0 (move to next tile, reset to 0.0)
   - Tick 3: moveProgress = 0.5 (no move yet)

4. **CONSOLIDATED MOVEMENT LOGIC**
   ✓ All archetype movement uses MovementService
   ✓ Eliminates code duplication
   ✓ Consistent behavior across AI types
   ✓ Easy to maintain and modify

// ============================================================================
// MOVEMENT SERVICE API
// ============================================================================

// Basic movement (automatic retry)
MovementService.updateUnitMovement(unit, state, moveSpeed)
  → Returns: { moved, reachedTarget, blocked, distance, prevX, prevY }

// Movement with fallback on blocking (gives up)
MovementService.updateUnitMovementWithFallback(
  unit, state, moveSpeed, 
  onBlocked: () => void  // Clear target, return to idle
)
  → Use for: Wandering units, enemies that lose chase

// Movement with retry on blocking (keeps trying)
MovementService.updateUnitMovementWithRetry(unit, state, moveSpeed)
  → Use for: Units attacking castles (don't give up)

// ============================================================================
// MOVEMENT SYSTEM API
// ============================================================================

// Check if position is walkable
MovementSystem.isPositionWalkable(state, x, y)
  → Returns: { isWalkable, blocked, blockReason }

// Get neighbors (4 cardinal + 4 diagonal)
MovementSystem.getWalkableNeighbors(state, x, y)
  → Returns: Array<{ x, y }>

// Pathfinding: next step towards target
MovementSystem.getNextStepTowards(state, fromX, fromY, targetX, targetY)
  → Returns: { x, y } | null

// Check if movement is valid
MovementSystem.canMoveTo(state, fromX, fromY, toX, toY)
  → Returns: boolean

// Check if positions are adjacent (8 directions)
MovementSystem.isAdjacent(x1, y1, x2, y2)
  → Returns: boolean

// ============================================================================
// IMPLEMENTATION PATTERNS
// ============================================================================

// Pattern 1: Wandering Unit (Passive Archetype)
private moveTowardsTarget(context: ArchetypeUpdateContext): void {
  const result = MovementService.updateUnitMovementWithFallback(
    unit, state, unit.moveSpeed,
    () => {
      // When blocked, pick new wander target
      this.pickWanderTarget(context);
    }
  );
}

// Pattern 2: Chasing Enemy (Aggressive Archetype)
private moveTowardsTarget(context: ArchetypeUpdateContext): void {
  // Same as Pattern 1 - gives up if blocked
  const result = MovementService.updateUnitMovementWithFallback(
    unit, state, unit.moveSpeed,
    () => {
      aiState.targetEnemyId = undefined;
      unit.behaviorState = AggressiveBehaviorState.Idle;
    }
  );
}

// Pattern 3: Attacking Castle (Aggressive Archetype)
private moveTowardsTarget(context: ArchetypeUpdateContext): void {
  // Different handling: persistent retry
  if (aiState.targetCastleIndex !== undefined) {
    const result = MovementService.updateUnitMovementWithRetry(
      unit, state, unit.moveSpeed
    );
    // Unit keeps retrying (will try again next tick if blocked)
    return;
  }
}

// ============================================================================
// PERFORMANCE CONSIDERATIONS
// ============================================================================

1. **Tile Lookup Performance**
   - Current: O(n) array search for each tile lookup
   - Future Optimization: Spatial grid (O(1) average case)
   - Current code is production-ready at moderate unit counts

2. **Pathfinding Performance**
   - Current: Greedy algorithm (not full A*)
   - Complexity: O(8) neighbor checks per pathfinding call
   - Occurs only when: unit.moveProgress >= 1.0 (infrequent)
   - Cached target means pathfinding happens only between tiles

3. **Memory Optimization**
   - No object allocations in movement loop (uses in-place updates)
   - No closures captured in hot path
   - moveProgress is a simple number (no GC pressure)

4. **Network Optimization**
   - moveProgress is NOT synced (local-only, server-side)
   - Only x, y, targetX, targetY synced to clients
   - Clients interpolate movement locally for smooth animation

// ============================================================================
// DETERMINISM & REPLAYS
// ============================================================================

The movement system is fully deterministic:

1. **Pathfinding**: Greedy algorithm always picks same next tile
2. **Direction Priority**: Fixed order (Up, Down, Left, Right, diagonals)
3. **Randomness**: Only in wander target selection (not movement calculation)
4. **No Floating-Point Issues**: Uses Math.floor() for tile lookup consistency

This enables:
- Deterministic replays (same input = same movement)
- Game state snapshots
- Debug visualization

// ============================================================================
// VISUAL ANIMATION (Client-Side)
// ============================================================================

The floating-point coordinates enable smooth client-side animation:

```typescript
// Client-side: interpolate between tiles
function interpolateUnitPosition(unit, moveProgress):
  const currentTile = { x: floor(unit.x), y: floor(unit.y) }
  const nextTile = /* pathfinding result or held target */
  
  // If moving to next tile, interpolate
  alpha = moveProgress / 1.0  // 0.0 to 1.0
  displayX = lerp(currentTile.x, nextTile.x, alpha)
  displayY = lerp(currentTile.y, nextTile.y, alpha)
```

// ============================================================================
// TESTING GUIDELINES
// ============================================================================

Test Movement System:
□ Walkable vs walkable validation
□ Cardinal movement in all 4 directions
□ Diagonal movement in all 4 diagonals
□ Obstacle avoidance (castles, water)
□ Bounds checking
□ Fallback pathfinding (diagonal → cardinal)

Test Movement Service:
□ Progress accumulation with different move speeds
□ Tile transitions when progress >= 1.0
□ Fallback behavior on blocking
□ Retry behavior on blocking
□ Movement results are correct

Test Archetypes:
□ Passive: gives up when blocked, picks new wander target
□ Aggressive chasing: gives up when blocked, returns to idle
□ Aggressive castle: retries when blocked, keeps target
□ Wild animal: gives up when blocked

// ============================================================================
// MIGRATION NOTES (FROM OLD SYSTEM)
// ============================================================================

If upgrading from the old 4-directional system:

1. Old: moveTowardsTarget() in each archetype
   New: Use MovementService.updateUnitMovement*() in all archetypes

2. Old: Integer coordinates (unit.x, unit.y were int)
   New: Float32 coordinates (smooth animation support)

3. Old: 4 directions only
   New: 8 directions (diagonals now supported)

4. Old: moveProgress was 0..1 scale
   New: moveProgress is accumulator (can exceed 1.0 before reset)
   
   Migration: No changes needed - same semantics

// ============================================================================
