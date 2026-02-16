/**
 * AI Behavior System
 *
 * Responsibilities:
 * - Implement AI logic for units (state machines)
 * - Default behavior: wandering around
 * - Deterministic AI decisions
 * - Minimal per-tick overhead
 * 
 * Design:
 * - Each unit has a behavior state (Idle, Wandering, Moving)
 * - Wandering: picks a random walkable tile and moves towards it
 * - When target reached, picks a new random target
 * - Tick-based: AI updates occur once per game tick
 * 
 * Performance notes:
 * - Uses state machine pattern (efficient, no unnecessary processing)
 * - Random neighbor selection is O(4) at most (4-directional)
 * - Reuses MovementSystem queries
 */

import { GameRoomState, UnitSchema, UnitBehaviorState } from "../schema";
import { MovementSystem } from "./MovementSystem";

/**
 * Configuration for unit behaviors
 */
const BEHAVIOR_CONFIG = {
  wanderReplanInterval: 30, // Ticks between selecting new wander target
  moveSpeed: 1.5, // Tiles per tick (can vary by unit type)
};

export class AIBehaviorSystem {
  /**
   * Internal state tracking for units
   * Stores per-unit AI metadata
   */
  private static unitAIState = new Map<
    string,
    {
      wanderCooldown: number;
    }
  >();

  /**
   * Update AI for a single unit
   * Called once per tick
   * 
   * @param unit - The unit to update
   * @param state - Current game room state
   */
  static updateUnitAI(unit: UnitSchema, state: GameRoomState): void {
    // Initialize AI state if not yet created
    if (!this.unitAIState.has(unit.id)) {
      this.unitAIState.set(unit.id, {
        wanderCooldown: 0,
      });
    }

    const aiState = this.unitAIState.get(unit.id)!;

    // Behavior state machine
    switch (unit.behaviorState) {
      case UnitBehaviorState.Idle:
        this.handleIdleBehavior(unit, state, aiState);
        break;

      case UnitBehaviorState.Wandering:
        this.handleWanderingBehavior(unit, state, aiState);
        break;

      case UnitBehaviorState.Moving:
        this.handleMovingBehavior(unit, state, aiState);
        break;
    }
  }

  /**
   * Handle idle behavior
   * Transition to wandering immediately
   */
  private static handleIdleBehavior(
    unit: UnitSchema,
    state: GameRoomState,
    aiState: any
  ): void {
    // Pick a random wander target
    const neighbors = MovementSystem.getWalkableNeighbors(
      state,
      unit.x,
      unit.y
    );

    if (neighbors.length > 0) {
      unit.behaviorState = UnitBehaviorState.Wandering;
      aiState.wanderCooldown = BEHAVIOR_CONFIG.wanderReplanInterval;
      this.pickRandomWanderTarget(unit, state);
    }
  }

  /**
   * Handle wandering behavior
   * Move towards target or pick new one
   */
  private static handleWanderingBehavior(
    unit: UnitSchema,
    state: GameRoomState,
    aiState: any
  ): void {
    // Check if we've reached the target
    if (unit.x === unit.targetX && unit.y === unit.targetY) {
      // Pick a new target
      this.pickRandomWanderTarget(unit, state);
      return;
    }

    // Move towards target
    const nextStep = MovementSystem.getNextStepTowards(
      state,
      unit.x,
      unit.y,
      unit.targetX,
      unit.targetY
    );

    if (nextStep) {
      unit.x = nextStep.x;
      unit.y = nextStep.y;
      unit.moveProgress = 1.0; // Discrete movement, so full progress
    } else {
      // No valid path, pick new target
      this.pickRandomWanderTarget(unit, state);
    }
  }

  /**
   * Handle moving behavior
   * (Currently unused, but kept for future expansion)
   */
  private static handleMovingBehavior(
    unit: UnitSchema,
    state: GameRoomState,
    aiState: any
  ): void {
    // Placeholder for targeted movement
    // Could be used for chasing, fleeing, etc.
    unit.behaviorState = UnitBehaviorState.Wandering;
  }

  /**
   * Pick a random wander target for a unit
   * Uses breadth-first search to find a target at a certain distance
   * 
   * @param unit - The unit
   * @param state - Current game room state
   */
  private static pickRandomWanderTarget(
    unit: UnitSchema,
    state: GameRoomState
  ): void {
    const maxDistance = 10; // Max tiles away from current position
    const candidates: Array<{ x: number; y: number }> = [];

    // BFS to find all walkable positions within range
    const visited = new Set<string>();
    const queue: Array<{ x: number; y: number; dist: number }> = [
      { x: unit.x, y: unit.y, dist: 0 },
    ];
    visited.add(`${unit.x},${unit.y}`);

    while (queue.length > 0 && candidates.length < 20) {
      const current = queue.shift()!;

      if (current.dist > 0 && current.dist <= maxDistance) {
        candidates.push({ x: current.x, y: current.y });
      }

      if (current.dist < maxDistance) {
        const neighbors = MovementSystem.getWalkableNeighbors(
          state,
          current.x,
          current.y
        );

        for (const neighbor of neighbors) {
          const key = `${neighbor.x},${neighbor.y}`;
          if (!visited.has(key)) {
            visited.add(key);
            queue.push({
              x: neighbor.x,
              y: neighbor.y,
              dist: current.dist + 1,
            });
          }
        }
      }
    }

    // Pick a random candidate, or stay in place if none available
    if (candidates.length > 0) {
      const randomTarget =
        candidates[Math.floor(Math.random() * candidates.length)];
      unit.targetX = randomTarget.x;
      unit.targetY = randomTarget.y;
    } else {
      unit.targetX = unit.x;
      unit.targetY = unit.y;
    }
  }

  /**
   * Update AI for all units in the game state
   * Called once per game tick
   * 
   * @param state - Current game room state
   */
  static updateAllUnitsAI(state: GameRoomState): void {
    for (const unit of state.units) {
      this.updateUnitAI(unit, state);
    }
  }

  /**
   * Clean up AI state for removed units
   * (Prevents memory leaks)
   */
  static cleanupUnitState(unitId: string): void {
    this.unitAIState.delete(unitId);
  }
}
