/**
 * Movement Service
 *
 * Centralized movement logic for all unit archetypes.
 * 
 * Responsibilities:
 * - Execute unit movement directly each tick based on moveSpeed
 * - Support floating-point position updates for smooth animation
 * - Handle 8-directional movement with tile-based pathfinding
 * - Provide result information (moved, blocked, reached target, etc.)
 *
 * Movement Model:
 * - Units move directly towards target each tick
 * - Distance moved per tick = moveSpeed (can be fractional)
 * - Respects tile walkability via pathfinding to next adjacent tile
 * - Floating-point coordinates enable smooth sub-tile animation
 *
 * Architecture:
 * - Static utility service (stateless)
 * - Consumes MovementSystem for pathfinding
 * - Used by all archetypes for consistency
 *
 * Performance:
 * - O(1) movement execution per tick
 * - Pathfinding only when needed (to next adjacent tile)
 * - Deterministic results for replay systems
 *
 * Usage:
 * ```typescript
 * const result = MovementService.updateUnitMovement(
 *   unit,
 *   state,
 *   unit.moveSpeed  // Direct distance per tick
 * );
 *
 * if (result.reachedTarget) {
 *   // Unit arrived at target
 * }
 * ```
 */

import { GameRoomState, UnitSchema } from "../../schema";
import { MovementSystem } from "../MovementSystem";

/**
 * Result of a movement update
 */
export interface MovementResult {
  /** Whether any movement occurred this tick */
  moved: boolean;

  /** Whether unit reached its target tile */
  reachedTarget: boolean;

  /** Whether unit is blocked (no valid path) */
  blocked: boolean;

  /** Reason for blocking, if blocked */
  blockReason?: string;

  /** Previous position before movement */
  prevX: number;
  prevY: number;

  /** Actual distance moved in tiles */
  distance: number;
}

export class MovementService {
  private static movementCache: WeakMap<
    UnitSchema,
    {
      targetTileX: number;
      targetTileY: number;
      nextStepX: number;
      nextStepY: number;
    }
  > = new WeakMap();

  /**
   * Update unit movement towards its target
   * 
   * This function:
   * 1. Gets next pathfinding step (adjacent walkable tile)
   * 2. Calculates movement vector towards that tile
   * 3. Moves unit by min(moveSpeed, distanceToTarget) each tick
   * 4. Uses floating-point coordinates for smooth animation
   * 5. Returns detailed result
   *
   * Direct Movement Model:
   * - Each tick, unit moves moveSpeed distance towards next tile
   * - No accumulation buffer needed
   * - Floating-point positions enable sub-tile precision
   * - Pathfinding ensures only walkable tiles are used
   *
   * Movement Speed Examples:
   * - moveSpeed = 1.0: moves 1 tile per tick (reaches next tile in 1 tick)
   * - moveSpeed = 0.5: moves 0.5 tiles per tick (reaches next tile in 2 ticks)
   * - moveSpeed = 0.25: moves 0.25 tiles per tick (smooth 4-tick movement)
   * - moveSpeed = 2.0: moves 2 tiles per tick (moves 2 tiles instantly)
   *
   * @param unit - Unit to move
   * @param state - Game room state
   * @param moveSpeed - Movement distance per tick in tiles (default: 1.0)
   * @returns Movement result with details
   */
  static updateUnitMovement(
    unit: UnitSchema,
    state: GameRoomState,
    moveSpeed: number = 1.0
  ): MovementResult {
    const prevX = unit.x;
    const prevY = unit.y;

    // Get target tile and its center point
    const targetTileX = Math.floor(unit.targetX);
    const targetTileY = Math.floor(unit.targetY);
    const targetCenterX = targetTileX + 0.5;
    const targetCenterY = targetTileY + 0.5;

    // Initialize result
    const result: MovementResult = {
      moved: false,
      reachedTarget: false,
      blocked: false,
      prevX,
      prevY,
      distance: 0,
    };

    // If unit is already in the target tile, move directly to its center.
    // This ensures units always come to rest at tile centers rather than
    // stopping anywhere inside the tile when they first cross its boundary.
    const currentTileX = Math.floor(unit.x);
    const currentTileY = Math.floor(unit.y);
    if (currentTileX === targetTileX && currentTileY === targetTileY) {
      const dx = targetCenterX - unit.x;
      const dy = targetCenterY - unit.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.001) {
        result.reachedTarget = true;
        return result;
      }
      const moveAmount = Math.min(moveSpeed, dist);
      unit.x += (dx / dist) * moveAmount;
      unit.y += (dy / dist) * moveAmount;
      result.moved = true;
      result.distance = moveAmount;
      if (Math.hypot(targetCenterX - unit.x, targetCenterY - unit.y) < 0.001) {
        result.reachedTarget = true;
      }
      return result;
    }

    // Get next step via pathfinding.
    // The cache remains valid as long as the target is unchanged AND the unit
    // has not yet reached the center of the cached next-step tile.  This
    // prevents the step from updating the moment the unit crosses a tile
    // boundary, which would skip the intermediate tile's center.
    let nextStep = null as { x: number; y: number } | null;
    const cached = this.movementCache.get(unit);
    if (cached && cached.targetTileX === targetTileX && cached.targetTileY === targetTileY) {
      const distToNextCenter = Math.hypot(
        (cached.nextStepX + 0.5) - unit.x,
        (cached.nextStepY + 0.5) - unit.y
      );
      if (distToNextCenter >= 0.001) {
        nextStep = { x: cached.nextStepX, y: cached.nextStepY };
      }
    }

    if (!nextStep) {
      nextStep = MovementSystem.getNextStepTowards(
        state,
        unit.x,
        unit.y,
        unit.targetX,
        unit.targetY,
        unit.radius
      );

      if (nextStep) {
        this.movementCache.set(unit, {
          targetTileX,
          targetTileY,
          nextStepX: nextStep.x,
          nextStepY: nextStep.y,
        });
      } else {
        this.movementCache.delete(unit);
      }
    }

    if (!nextStep) {
      result.blocked = true;
      result.blockReason = "No valid path";
      return result;
    }

    // Move toward the center of the next step tile
    const dx = (nextStep.x + 0.5) - unit.x;
    const dy = (nextStep.y + 0.5) - unit.y;
    const distToNext = Math.hypot(dx, dy);

    if (distToNext < 0.001) {
      result.blocked = true;
      result.blockReason = "Already at next step";
      return result;
    }

    const moveAmount = Math.min(moveSpeed, distToNext);
    unit.x += (dx / distToNext) * moveAmount;
    unit.y += (dy / distToNext) * moveAmount;

    result.moved = true;
    result.distance = moveAmount;

    // Check if reached target tile center after moving
    if (Math.hypot(targetCenterX - unit.x, targetCenterY - unit.y) < 0.001) {
      result.reachedTarget = true;
      this.movementCache.delete(unit);
    }

    return result;
  }

  /**
   * Update unit movement with fallback behavior
   * 
   * This is a convenience wrapper that calls updateUnitMovement
   * and provides recommended behavior on blocking:
   * - Clears the target (unit stops moving)
   * - Calls onBlocked callback
   *
   * Use this for units that should give up when blocked (e.g., wandering units).
   * Use updateUnitMovement directly if you want custom blocking behavior.
   *
   * @param unit - Unit to move
   * @param state - Game room state
   * @param moveSpeed - Movement speed (tiles per tick)
   * @param onBlocked - Callback when unit is blocked (optional)
   * @returns Movement result
   */
  static updateUnitMovementWithFallback(
    unit: UnitSchema,
    state: GameRoomState,
    moveSpeed: number = 1.0,
    onBlocked?: () => void
  ): MovementResult {
    const result = this.updateUnitMovement(unit, state, moveSpeed);

    if (result.blocked) {
      // Clear target to stop movement
      unit.targetX = unit.x;
      unit.targetY = unit.y;

      if (onBlocked) {
        onBlocked();
      }
    }

    return result;
  }

  /**
   * Update unit movement with persistent retry behavior
   * 
   * This is a convenience wrapper for units that should keep
   * trying to reach their target even when blocked (e.g., attacking castle).
   * 
   * Does NOT clear target on block - unit will retry next tick.
   *
   * @param unit - Unit to move
   * @param state - Game room state
   * @param moveSpeed - Movement speed (tiles per tick)
   * @returns Movement result
   */
  static updateUnitMovementWithRetry(
    unit: UnitSchema,
    state: GameRoomState,
    moveSpeed: number = 1.0
  ): MovementResult {
    // Use base updateUnitMovement - will retry next tick automatically
    return this.updateUnitMovement(unit, state, moveSpeed);
  }

  /**
   * Check if unit is making progress towards target
   * Returns true if unit has a valid target set
   *
   * @param unit - Unit to check
   * @returns Whether unit is progressing
   */
  static isProgressingTowardsTarget(unit: UnitSchema): boolean {
    // Check if unit has a target different from current position
    const currentTileX = Math.floor(unit.x);
    const currentTileY = Math.floor(unit.y);
    const targetTileX = Math.floor(unit.targetX);
    const targetTileY = Math.floor(unit.targetY);
    
    return !(currentTileX === targetTileX && currentTileY === targetTileY);
  }
}
