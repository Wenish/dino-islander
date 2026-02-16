/**
 * MOVEMENT SYSTEM - QUICK REFERENCE
 * 
 * Fast lookup guide for developers using the movement system
 */

// ============================================================================
// IMPORTS
// ============================================================================

import { MovementSystem } from "../systems/MovementSystem";
import { MovementService } from "../systems/services/MovementService";
import { GameRoomState, UnitSchema } from "../schema";

// ============================================================================
// MOVEMENT SERVICE - FOR ARCHETYPES
// ============================================================================

/**
 * USE THIS in archetype movement methods
 */

// Basic Movement (supports retry and fallback)
const result = MovementService.updateUnitMovement(
  unit,           // UnitSchema
  state,          // GameRoomState 
  unit.moveSpeed  // number (default: 1.0)
);

// Result object:
// {
//   moved: boolean           // Did unit move this tick?
//   reachedTarget: boolean   // Is unit now at target tile?
//   blocked: boolean         // Is unit blocked (no valid path)?
//   blockReason?: string     // Why blocked (if blocked)
//   prevX: number            // Previous X position
//   prevY: number            // Previous Y position
//   distance: number         // Distance moved (0 or ~1 tile)
// }

// ============================================================================
// COMMON PATTERNS
// ============================================================================

/**
 * Pattern 1: Wandering Unit (clear target on block)
 * 
 * Use for: Passive creatures, patrol units
 * Behavior: Gives up when blocked, picks new target
 */
private moveTowardsTarget(context: ArchetypeUpdateContext): void {
  const { unit, state, aiState } = context;

  const result = MovementService.updateUnitMovementWithFallback(
    unit,
    state,
    unit.moveSpeed,
    () => {
      // Called when blocked - pick new wander target
      this.pickWanderTarget(context);
    }
  );
}

/**
 * Pattern 2: Chasing Enemy (give up if blocked)
 * 
 * Use for: Units pursuing enemies
 * Behavior: Returns to idle when blocked
 */
private moveTowardsTarget(context: ArchetypeUpdateContext): void {
  const { unit, state, aiState } = context;

  const result = MovementService.updateUnitMovementWithFallback(
    unit,
    state,
    unit.moveSpeed,
    () => {
      // Called when blocked - give up chase
      aiState.targetEnemyId = undefined;
      unit.behaviorState = AggressiveBehaviorState.Idle;
    }
  );
}

/**
 * Pattern 3: Attacking Castle (persistent retry)
 * 
 * Use for: Units attacking objectives
 * Behavior: Keeps trying even if blocked
 */
private moveTowardsTarget(context: ArchetypeUpdateContext): void {
  const { unit, state, aiState } = context;

  // Use retry version - will try again next tick if blocked
  if (aiState.targetCastleIndex !== undefined) {
    const result = MovementService.updateUnitMovementWithRetry(
      unit,
      state,
      unit.moveSpeed
    );
    return; // Will retry next tick automatically
  }
}

// ============================================================================
// MOVEMENT SYSTEM - QUERIES
// ============================================================================

/**
 * USE THESE for pathfinding, collision checks, neighbor queries
 */

// Check if a position is walkable
const metadata = MovementSystem.isPositionWalkable(state, x, y);
if (metadata.isWalkable) {
  // Can walk here
} else {
  console.log("Blocked:", metadata.blockReason);
  // "Out of bounds" | "Tile not found" | "Tile type not walkable" | "Castle blocking"
}

// Get all walkable neighbors (8 directions)
const neighbors = MovementSystem.getWalkableNeighbors(state, x, y);
for (const neighbor of neighbors) {
  console.log(`Neighbor at (${neighbor.x}, ${neighbor.y})`);
}

// Get next step towards target (pathfinding)
const nextStep = MovementSystem.getNextStepTowards(
  state,       // GameRoomState
  fromX,       // number (can be float)
  fromY,       // number (can be float)
  targetX,     // number (can be float)
  targetY      // number (can be float)
);

if (nextStep) {
  console.log(`Move towards (${nextStep.x}, ${nextStep.y})`);
} else {
  console.log("No valid path");
}

// Check if movement is valid
const canMove = MovementSystem.canMoveTo(
  state,
  fromX, fromY,
  toX, toY
);

// Check if positions are adjacent (within 1 tile, including diagonals)
const adjacent = MovementSystem.isAdjacent(
  x1, y1,
  x2, y2
);

// ============================================================================
// UNIT SETUP
// ============================================================================

/**
 * When creating/spawning a unit, make sure to set:
 */

unit.x = spawnX;           // float32
unit.y = spawnY;           // float32
unit.targetX = spawnX;     // Start at spawn point
unit.targetY = spawnY;
unit.moveSpeed = 1.0;      // Default 1 tile/tick (direct movement)

// Optional: use fractional speed for smooth animation
unit.moveSpeed = 0.5;      // Moves 1 tile every 2 ticks (smooth)
unit.moveSpeed = 1.5;      // Moves 1.5 tiles per tick (fast)

// ============================================================================
// MOVEMENT DEBUGGING
// ============================================================================

/**
 * Check if unit is stuck
 */
function isUnitStuck(unit: UnitSchema, state: GameRoomState): boolean {
  const neighbors = MovementSystem.getWalkableNeighbors(
    state,
    unit.targetX,
    unit.targetY
  );
  return neighbors.length === 0;
}

/**
 * Check remaining distance to target
 */
function distanceToTarget(unit: UnitSchema): number {
  const dx = unit.targetX - unit.x;
  const dy = unit.targetY - unit.y;
  return Math.hypot(dx, dy);
}

/**
 * Check if path exists to target
 */
function pathExists(
  state: GameRoomState,
  fromX: number,
  fromY: number,
  targetX: number,
  targetY: number
): boolean {
  let current = { x: Math.floor(fromX), y: Math.floor(fromY) };
  const target = { x: Math.floor(targetX), y: Math.floor(targetY) };
  const visited = new Set<string>();
  
  const queue = [current];
  visited.add(`${current.x},${current.y}`);

  while (queue.length > 0) {
    current = queue.shift()!;
    
    if (current.x === target.x && current.y === target.y) {
      return true; // Path found
    }

    const neighbors = MovementSystem.getWalkableNeighbors(state, current.x, current.y);
    for (const neighbor of neighbors) {
      const key = `${neighbor.x},${neighbor.y}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push(neighbor);
      }
    }
  }

  return false; // No path
}

// ============================================================================
// PERFORMANCE TIPS
// ============================================================================

/**
 * 1. Use the service layer, not MovementSystem directly
 *    ✓ MovementService handles progress accumulation
 *    ✓ Automatically optimizes when to call pathfinding
 *    
 * 2. Set reasonable move speeds
 *    ✓ 1.0 = 1 tile/tick (immediate)
 *    ✓ 0.5 = 1 tile/2 ticks (smooth)
 *    ✓ 2.0 = 2 tiles/tick (fast, rare)
 *    
 * 3. Don't call pathfinding every tick
 *    ✓ MovementService already caches between tiles
 *    ✓ Only recalculates when target changes
 *    
 * 4. Batch pathfinding queries when possible
 *    ✓ Group similar units
 *    ✓ Defer expensive queries to next frame
 *    
 * 5. Leverage fallback/retry strategies
 *    ✓ Wandering: use fallback (simple)
 *    ✓ Attacking: use retry (persistent)
 *    ✓ Different behaviors for different scenarios
 *
 * 6. Use neighbor queries for local decisions
 *    ✓ Don't scan full map
 *    ✓ Use getWalkableNeighbors() for local decisions
 */

// ============================================================================
// COMMON ISSUES & SOLUTIONS
// ============================================================================

/**
 * Issue 1: Unit not moving
 * 
 * Causes:
 * - moveProgress might not be accumulating
 * - target might not be set
 * - moveSpeed might be 0
 * - target unreachable (blocked by obstacle)
 * 
 * Fix:
 * - Check: unit.moveSpeed > 0
 * - Check: unit.targetX !== undefined && unit.targetY !== undefined
 * - Check: MovementSystem.isPositionWalkable(state, unit.targetX, unit.targetY)
 * - Use pathExists() helper to verify path
 */

/**
 * Issue 2: Unit gets stuck
 * 
 * Causes:
 * - Target is unreachable (surrounded by obstacles)
 * - Pathfinding fails (rare - usually indicates map issue)
 * - Unit moving into dead-end
 * 
 * Fix:
 * - Validate target is walkable: isPositionWalkable()
 * - Use pathExists() to verify path before setting target
 * - Check neighbor count: getWalkableNeighbors().length
 * - Debug: log pathfinding results
 */

/**
 * Issue 3: Erratic movement (zigzagging)
 * 
 * Causes:
 * - Target changing every tick (unstable AI)
 * - Pathfinding oscillating between options
 * - moveProgress not resetting properly
 * 
 * Fix:
 * - Stabilize target (don't change constantly)
 * - Target is automatically used by pathfinding each tick
 * - Review archetype state machine logic
 */

/**
 * Issue 4: Movement not synchronized to clients
 * 
 * Causes:
 * - Only x, y synced (not moveProgress - correct!)
 * - Client must interpolate locally
 * - moveProgress is server-only for perf
 * 
 * Fix:
 * - Client: interpolate between tiles using moveProgress
 * - Only sync x, y as integer (tile) coordinates
 * - moveProgress is calculated locally on client
 */

// ============================================================================
// INTEGRATION CHECKLIST
// ============================================================================

// When adding new archetype:
// [ ] Import MovementService
// [ ] Update import in archetype file
// [ ] Replace moveTowardsTarget() with service call
// [ ] Choose fallback or retry strategy
// [ ] Set meaningful moveSpeed in config
// [ ] Test pathfinding with obstacles
// [ ] Test blocking behavior
// [ ] Test movement at different speeds
// [ ] Verify no compile errors

// When modifying movement:
// [ ] Run: npm run build (compile check)
// [ ] Consider 8-directional movement (new!)
// [ ] Consider floating-point precision
// [ ] Review change in MOVEMENT_SYSTEM.md
// [ ] Test with different moveSpeed values

// ============================================================================
