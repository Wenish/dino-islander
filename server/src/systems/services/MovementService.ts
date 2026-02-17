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

    // Get target tile
    const targetTileX = Math.floor(unit.targetX);
    const targetTileY = Math.floor(unit.targetY);

    // Get current tile
    const currentTileX = Math.floor(unit.x);
    const currentTileY = Math.floor(unit.y);

    // Initialize result
    const result: MovementResult = {
      moved: false,
      reachedTarget: false,
      blocked: false,
      prevX,
      prevY,
      distance: 0,
    };

    // Already at target tile
    if (currentTileX === targetTileX && currentTileY === targetTileY) {
      result.reachedTarget = true;
      return result;
    }

    // Get next step via pathfinding (considers unit size)
    const nextStep = MovementSystem.getNextStepTowards(
      state,
      unit.x,
      unit.y,
      unit.targetX,
      unit.targetY,
      unit.radius
    );

    if (!nextStep) {
      // No valid path found
      result.blocked = true;
      result.blockReason = "No valid path";
      return result;
    }

    // Calculate direction to next tile
    const dx = nextStep.x - unit.x;
    const dy = nextStep.y - unit.y;
    const distToNextTile = Math.hypot(dx, dy);

    if (distToNextTile === 0) {
      // Already at next step (shouldn't happen, but handle it)
      result.blocked = true;
      result.blockReason = "Already at next step";
      return result;
    }

    // Move towards next tile
    // Distance to move = min(moveSpeed, distanceToNextTile)
    const moveAmount = Math.min(moveSpeed, distToNextTile);

    // Update position with normalized movement
    unit.x += (dx / distToNextTile) * moveAmount;
    unit.y += (dy / distToNextTile) * moveAmount;

    result.moved = true;
    result.distance = moveAmount;

    // Check if reached target tile
    const newTileX = Math.floor(unit.x);
    const newTileY = Math.floor(unit.y);
    if (newTileX === targetTileX && newTileY === targetTileY) {
      result.reachedTarget = true;
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
