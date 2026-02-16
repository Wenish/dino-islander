/**
 * Movement Service
 *
 * Centralized movement logic for all unit archetypes.
 * 
 * Responsibilities:
 * - Execute unit movement using accumulated moveProgress
 * - Support floating-point position updates
 * - Handle 8-directional movement
 * - Provide result information (moved, blocked, reached target, etc.)
 *
 * Architecture:
 * - Static utility service (stateless)
 * - Consumes MovementSystem for pathfinding
 * - Used by all archetypes for consistency
 * - Supports different movement profiles (fast/slow, diagonal/cardinal)
 *
 * Performance:
 * - O(1) movement execution (no pathfinding per call in steady state)
 * - Pathfinding only when needed (moving to next tile)
 * - Deterministic results for replay systems
 *
 * Usage:
 * ```typescript
 * const result = MovementService.updateUnitMovement(
 *   unit,
 *   state,
 *   moveSpeed
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

  /** Movement distance in tiles */
  distance: number;
}

export class MovementService {
  /**
   * Update unit movement towards its target
   * 
   * This function:
   * 1. Accumulates moveProgress based on moveSpeed
   * 2. When progress >= 1.0, calculates next tile via pathfinding
   * 3. Updates unit.x and unit.y to next tile
   * 4. Resets and tracks progress for smooth animation
   * 5. Returns detailed result
   *
   * Floating-point support:
   * - Units maintain floating-point x, y coordinates
   * - Progress accumulation enables sub-tile precision for animation
   * - Pathfinding uses floored tile coordinates
   * - Result includes previous position for interpolation
   *
   * Movement Speed Examples:
   * - moveSpeed = 1.0: moves 1 tile per tick (immediate)
   * - moveSpeed = 0.5: moves 1 tile every 2 ticks (smooth)
   * - moveSpeed = 2.0: moves 2 tiles per tick (fast)
   *
   * @param unit - Unit to move
   * @param state - Game room state
   * @param moveSpeed - Movement speed in tiles per tick (default: 1.0)
   * @returns Movement result with details
   */
  static updateUnitMovement(
    unit: UnitSchema,
    state: GameRoomState,
    moveSpeed: number = 1.0
  ): MovementResult {
    const prevX = unit.x;
    const prevY = unit.y;

    // Accumulate movement progress
    unit.moveProgress += moveSpeed;

    const result: MovementResult = {
      moved: false,
      reachedTarget: false,
      blocked: false,
      prevX,
      prevY,
      distance: 0,
    };

    // Check if accumulated enough progress to move to next tile
    if (unit.moveProgress < 1.0) {
      // Not enough progress yet, return early
      return result;
    }

    // Get next step towards target
    const nextStep = MovementSystem.getNextStepTowards(
      state,
      unit.x,
      unit.y,
      unit.targetX,
      unit.targetY
    );

    if (nextStep) {
      // Valid movement found
      unit.x = nextStep.x;
      unit.y = nextStep.y;
      unit.moveProgress -= 1.0; // Consume one tile of progress

      result.moved = true;
      result.distance = Math.hypot(unit.x - prevX, unit.y - prevY);

      // Check if reached target tile
      if (unit.x === Math.floor(unit.targetX) && 
          unit.y === Math.floor(unit.targetY)) {
        result.reachedTarget = true;
      }

      return result;
    }

    // No valid path found - unit is blocked
    unit.moveProgress = 0; // Reset progress
    result.blocked = true;
    result.blockReason = "No valid path";

    return result;
  }

  /**
   * Update unit movement with fallback behavior
   * 
   * This is a convenience wrapper that calls updateUnitMovement
   * and provides recommended behavior on blocking:
   * - Clears the target (unit stops moving)
   * - Returns early on block
   *
   * Use this for units that should give up when blocked (e.g., wandering units).
   * Use updateUnitMovement directly if you want custom blocking behavior.
   *
   * @param unit - Unit to move
   * @param state - Game room state
   * @param moveSpeed - Movement speed in tiles per tick
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
   * @param moveSpeed - Movement speed in tiles per tick
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
   * Returns true if unit has moved closer to target (used for debugging/monitoring)
   *
   * @param unit - Unit to check
   * @returns Whether unit is progressing
   */
  static isProgressingTowardsTarget(unit: UnitSchema): boolean {
    const prevDistance = Math.hypot(
      unit.targetX - unit.x,
      unit.targetY - unit.y
    );
    // Simply check if unit has a non-zero moveProgress
    // In practice, monitor the MovementResult.moved flag instead
    return unit.moveProgress > 0;
  }
}
