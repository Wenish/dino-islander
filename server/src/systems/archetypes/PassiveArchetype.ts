/**
 * Passive Archetype
 *
 * Behavior Profile:
 * - Peaceful, non-aggressive unit (e.g., Sheep, Villagers)
 * - Wanders randomly within a small area
 * - Flees when attacked or when enemies are nearby
 * - Does not initiate combat
 * - Returns to wandering after fleeing to safety
 *
 * States:
 * - Idle: Initial state, transitions to wandering
 * - Wandering: Random movement within area
 * - Fleeing: Running away from threats
 *
 * Design:
 * - Deterministic flee direction (away from attacker)
 * - Flee distance based on config
 * - Cooldown before returning to wander
 *
 * Performance:
 * - Minimal enemy checks (only when damaged)
 * - Reuses movement system
 * - No pathfinding (direct flee direction)
 */

import {
  UnitArchetype,
  UnitArchetypeType,
  UnitAIState,
  ArchetypeUpdateContext,
} from "./UnitArchetype";
import { UnitSchema, UnitBehaviorState } from "../../schema";
import { MovementSystem } from "../MovementSystem";
import { MovementService } from "../services/MovementService";
import { CombatSystem } from "../CombatSystem";

/**
 * Configuration for passive behavior
 */
export const PASSIVE_CONFIG = {
  wanderReplanInterval: 60, // Ticks between selecting new wander target
  maxWanderDistance: 5, // Max tiles away for wander target (smaller than generic)
  
  fleeDistance: 8, // How far to run when fleeing
  fleeCooldown: 120, // Ticks before returning to normal after fleeing
  fleeDetectionRange: 5, // Detect threats within this range
};

/**
 * Extended behavior states for passive units
 * Maps to schema behavior states
 */
const PassiveBehaviorState = {
  Idle: UnitBehaviorState.Idle,
  Wandering: UnitBehaviorState.Wandering,
  Fleeing: UnitBehaviorState.Fleeing, // Uses schema enum value
};

export class PassiveArchetype extends UnitArchetype {
  readonly type = UnitArchetypeType.Passive;

  /**
   * Initialize AI state for passive unit
   */
  initializeAIState(unit: UnitSchema): UnitAIState {
    return {
      wanderCooldown: 0,
      attackCooldown: 0,
      lastAttackTick: 0,
      fleeCooldown: 0,
      deathTick: undefined,
    };
  }

  /**
   * Main update loop for passive units
   */
  update(context: ArchetypeUpdateContext): void {
    const { unit, state, aiState } = context;

    // Check for nearby threats (even while wandering)
    if (aiState.fleeCooldown <= 0) {
      this.checkForThreats(context);
    }

    // Behavior state machine
    switch (unit.behaviorState) {
      case PassiveBehaviorState.Idle:
        this.handleIdle(context);
        break;

      case PassiveBehaviorState.Wandering:
        this.handleWandering(context);
        break;

      case PassiveBehaviorState.Fleeing:
        this.handleFleeing(context);
        break;
    }

    // Decrement cooldowns
    if (aiState.fleeCooldown > 0) {
      aiState.fleeCooldown--;
    }
    if (aiState.wanderCooldown > 0) {
      aiState.wanderCooldown--;
    }
  }

  /**
   * React to taking damage - immediately flee
   */
  onTakeDamage(
    context: ArchetypeUpdateContext,
    damage: number,
    attackerId?: string
  ): void {
    this.startFleeing(context, attackerId);
  }

  /**
   * Check for nearby threats and flee if found
   */
  private checkForThreats(context: ArchetypeUpdateContext): void {
    const { unit, state } = context;

    const enemies = CombatSystem.findNearbyEnemies(
      state,
      unit,
      PASSIVE_CONFIG.fleeDetectionRange
    );

    if (enemies.length > 0) {
      // Flee from closest enemy
      this.startFleeing(context, enemies[0].unit.id);
    }
  }

  /**
   * Start fleeing behavior
   */
  private startFleeing(
    context: ArchetypeUpdateContext,
    threatId?: string
  ): void {
    const { unit, state, aiState } = context;

    // Set fleeing state
    unit.behaviorState = PassiveBehaviorState.Fleeing;
    aiState.fleeCooldown = PASSIVE_CONFIG.fleeCooldown;

    // Calculate flee direction (away from threat)
    let fleeX = unit.x;
    let fleeY = unit.y;

    if (threatId) {
      const threat = CombatSystem.getUnitById(state, threatId);
      if (threat) {
        // Flee in opposite direction
        const dx = unit.x - threat.x;
        const dy = unit.y - threat.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
          // Normalize and scale
          fleeX = unit.x + Math.round((dx / distance) * PASSIVE_CONFIG.fleeDistance);
          fleeY = unit.y + Math.round((dy / distance) * PASSIVE_CONFIG.fleeDistance);
        }
      }
    }

    // Clamp to map bounds
    fleeX = Math.max(0, Math.min(state.width - 1, fleeX));
    fleeY = Math.max(0, Math.min(state.height - 1, fleeY));

    aiState.fleeTargetX = fleeX;
    aiState.fleeTargetY = fleeY;
    unit.targetX = fleeX;
    unit.targetY = fleeY;
    unit.moveProgress = 0;
  }

  /**
   * Handle idle state - transition to wandering
   */
  private handleIdle(context: ArchetypeUpdateContext): void {
    const { unit, state } = context;

    const neighbors = MovementSystem.getWalkableNeighbors(
      state,
      unit.x,
      unit.y
    );

    if (neighbors.length > 0) {
      unit.behaviorState = PassiveBehaviorState.Wandering;
      this.pickWanderTarget(context);
    }
  }

  /**
   * Handle wandering state - random movement
   */
  private handleWandering(context: ArchetypeUpdateContext): void {
    const { unit, state, aiState } = context;

    // Check if reached target
    const tolerance = 0.01;
    if (
      Math.abs(unit.x - unit.targetX) < tolerance &&
      Math.abs(unit.y - unit.targetY) < tolerance
    ) {
      unit.moveProgress = 0;
      this.pickWanderTarget(context);
      return;
    }

    // Move towards target
    this.moveTowardsTarget(context);
  }

  /**
   * Handle fleeing state - run away from threat
   */
  private handleFleeing(context: ArchetypeUpdateContext): void {
    const { unit, aiState } = context;

    // Check if reached flee target or cooldown expired
    const tolerance = 0.01;
    const reachedTarget =
      Math.abs(unit.x - unit.targetX) < tolerance &&
      Math.abs(unit.y - unit.targetY) < tolerance;

    if (reachedTarget || aiState.fleeCooldown <= 0) {
      // Return to wandering
      unit.behaviorState = PassiveBehaviorState.Wandering;
      aiState.fleeCooldown = 0;
      unit.moveProgress = 0;
      this.pickWanderTarget(context);
      return;
    }

    // Continue fleeing
    this.moveTowardsTarget(context);
  }

  /**
   * Move unit towards its target position using consolidated MovementService
   * 
   * On blocking, clears target and picks new wander target (gives up)
   */
  private moveTowardsTarget(context: ArchetypeUpdateContext): void {
    const { unit, state } = context;

    // Use centralized movement service with fallback behavior
    const result = MovementService.updateUnitMovementWithFallback(
      unit,
      state,
      unit.moveSpeed,
      () => {
        // Called when blocked - pick new wander target
        this.pickWanderTarget(context);
      }
    );

    // Movement details available in result if needed for monitoring/debugging
    // result.moved, result.blocked, result.reachedTarget, etc.
  }

  /**
   * Pick a random wander target using BFS
   */
  private pickWanderTarget(context: ArchetypeUpdateContext): void {
    const { unit, state, aiState } = context;

    const maxDistance = PASSIVE_CONFIG.maxWanderDistance;
    const candidates: Array<{ x: number; y: number }> = [];

    // BFS to find walkable positions within range
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

    // Pick random candidate
    if (candidates.length > 0) {
      const randomTarget =
        candidates[Math.floor(Math.random() * candidates.length)];
      unit.targetX = randomTarget.x;
      unit.targetY = randomTarget.y;
    } else {
      unit.targetX = unit.x;
      unit.targetY = unit.y;
    }

    aiState.wanderCooldown = PASSIVE_CONFIG.wanderReplanInterval;
  }
}
