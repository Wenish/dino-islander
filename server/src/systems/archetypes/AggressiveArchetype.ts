/**
 * Aggressive Archetype
 *
 * Behavior Profile:
 * - Combat-oriented unit (e.g., Warriors, Spears)
 * - Patrols within a defined area
 * - Actively searches for enemies
 * - Chases enemies when detected
 * - Attacks when in range
 * - Returns to patrol after killing target
 *
 * States:
 * - Idle: Initial state, transitions to patrolling
 * - Wandering/Patrolling: Moving around looking for threats
 * - Chasing: Pursuing a detected enemy
 * - Attacking: In attack range, dealing damage
 *
 * Design:
 * - Target prioritization: closest enemy first
 * - Chase timeout to prevent infinite pursuit
 * - Attack cooldown for balanced combat
 * - Deterministic state transitions
 *
 * Performance:
 * - Enemy detection throttled by state
 * - Caches current target
 * - Minimal pathfinding recalculation
 */

import {
  UnitArchetype,
  UnitArchetypeType,
  UnitAIState,
  ArchetypeUpdateContext,
} from "./UnitArchetype";
import { UnitSchema, UnitBehaviorState } from "../../schema";
import { MovementSystem } from "../MovementSystem";
import { CombatSystem, COMBAT_CONFIG } from "../CombatSystem";

/**
 * Configuration for aggressive behavior
 */
export const AGGRESSIVE_CONFIG = {
  patrolReplanInterval: 90, // Ticks between selecting new patrol target
  maxPatrolDistance: 12, // Max tiles away for patrol target
  
  detectEnemyRange: 10, // Detection range for enemies
  chaseRange: 20, // Max chase distance before giving up
  attackRange: 1.5, // Attack range in tiles
  
  attackDamage: 2, // Damage per attack
  attackCooldown: 60, // Ticks between attacks (1 second at 60 tick/s)
  
  enemyScanInterval: 10, // Ticks between enemy scans while patrolling
};

/**
 * Extended behavior states for aggressive units
 * Maps to schema behavior states
 */
const AggressiveBehaviorState = {
  Idle: UnitBehaviorState.Idle,
  Patrolling: UnitBehaviorState.Wandering,
  Chasing: UnitBehaviorState.Moving,
  Attacking: UnitBehaviorState.Attacking, // Uses schema enum value
};

export class AggressiveArchetype extends UnitArchetype {
  readonly type = UnitArchetypeType.Aggressive;

  /**
   * Initialize AI state for aggressive unit
   */
  initializeAIState(unit: UnitSchema): UnitAIState {
    return {
      wanderCooldown: 0,
      attackCooldown: 0,
      lastAttackTick: 0,
      fleeCooldown: 0,
    };
  }

  /**
   * Main update loop for aggressive units
   */
  update(context: ArchetypeUpdateContext): void {
    const { unit, aiState } = context;

    // Behavior state machine
    switch (unit.behaviorState) {
      case AggressiveBehaviorState.Idle:
        this.handleIdle(context);
        break;

      case AggressiveBehaviorState.Patrolling:
        this.handlePatrolling(context);
        break;

      case AggressiveBehaviorState.Chasing:
        this.handleChasing(context);
        break;

      case AggressiveBehaviorState.Attacking:
        this.handleAttacking(context);
        break;
    }

    // Decrement cooldowns
    if (aiState.wanderCooldown > 0) {
      aiState.wanderCooldown--;
    }
    if (aiState.attackCooldown > 0) {
      aiState.attackCooldown--;
    }
  }

  /**
   * React to killing a unit - search for next target
   */
  onKillUnit(context: ArchetypeUpdateContext, killedUnitId: string): void {
    const { unit, aiState } = context;
    
    // Clear current target
    aiState.targetEnemyId = undefined;
    
    // Return to patrolling (will search for new target)
    unit.behaviorState = AggressiveBehaviorState.Patrolling;
  }

  /**
   * Handle idle state - start patrolling
   */
  private handleIdle(context: ArchetypeUpdateContext): void {
    const { unit, state } = context;

    const neighbors = MovementSystem.getWalkableNeighbors(
      state,
      unit.x,
      unit.y
    );

    if (neighbors.length > 0) {
      unit.behaviorState = AggressiveBehaviorState.Patrolling;
      this.pickPatrolTarget(context);
    }
  }

  /**
   * Handle patrolling state - move around and search for enemies
   */
  private handlePatrolling(context: ArchetypeUpdateContext): void {
    const { unit, aiState } = context;

    // Scan for enemies periodically
    if (aiState.wanderCooldown % AGGRESSIVE_CONFIG.enemyScanInterval === 0) {
      const enemy = this.findNearestEnemy(context);
      if (enemy) {
        this.startChasing(context, enemy);
        return;
      }
    }

    // Check if reached patrol target
    const tolerance = 0.01;
    if (
      Math.abs(unit.x - unit.targetX) < tolerance &&
      Math.abs(unit.y - unit.targetY) < tolerance
    ) {
      unit.moveProgress = 0;
      this.pickPatrolTarget(context);
      return;
    }

    // Move towards patrol target
    this.moveTowardsTarget(context);
  }

  /**
   * Handle chasing state - pursue enemy
   */
  private handleChasing(context: ArchetypeUpdateContext): void {
    const { unit, state, aiState } = context;

    // Verify target still exists and is alive
    const target = aiState.targetEnemyId
      ? CombatSystem.getUnitById(state, aiState.targetEnemyId)
      : null;

    if (!target || target.health <= 0) {
      // Target lost or dead, return to patrol
      aiState.targetEnemyId = undefined;
      unit.behaviorState = AggressiveBehaviorState.Patrolling;
      this.pickPatrolTarget(context);
      return;
    }

    // Check if in attack range
    if (
      CombatSystem.isInAttackRange(
        unit.x,
        unit.y,
        target.x,
        target.y,
        AGGRESSIVE_CONFIG.attackRange
      )
    ) {
      // Transition to attacking
      unit.behaviorState = AggressiveBehaviorState.Attacking;
      return;
    }

    // Check if target is too far (chase timeout)
    const distance = CombatSystem.getManhattanDistance(
      unit.x,
      unit.y,
      target.x,
      target.y
    );
    if (distance > AGGRESSIVE_CONFIG.chaseRange) {
      // Give up chase
      aiState.targetEnemyId = undefined;
      unit.behaviorState = AggressiveBehaviorState.Patrolling;
      this.pickPatrolTarget(context);
      return;
    }

    // Update target position and chase
    unit.targetX = target.x;
    unit.targetY = target.y;
    this.moveTowardsTarget(context);
  }

  /**
   * Handle attacking state - deal damage when ready
   */
  private handleAttacking(context: ArchetypeUpdateContext): void {
    const { unit, state, aiState } = context;

    // Verify target still exists and is alive
    const target = aiState.targetEnemyId
      ? CombatSystem.getUnitById(state, aiState.targetEnemyId)
      : null;

    if (!target || target.health <= 0) {
      // Target dead, return to patrol
      aiState.targetEnemyId = undefined;
      unit.behaviorState = AggressiveBehaviorState.Patrolling;
      this.pickPatrolTarget(context);
      return;
    }

    // Check if still in range
    if (
      !CombatSystem.isInAttackRange(
        unit.x,
        unit.y,
        target.x,
        target.y,
        AGGRESSIVE_CONFIG.attackRange
      )
    ) {
      // Out of range, resume chase
      unit.behaviorState = AggressiveBehaviorState.Chasing;
      return;
    }

    // Attack if cooldown ready
    if (aiState.attackCooldown <= 0) {
      const result = CombatSystem.attackUnit(
        unit,
        target,
        AGGRESSIVE_CONFIG.attackDamage
      );

      if (result.success) {
        // Reset cooldown
        aiState.attackCooldown = AGGRESSIVE_CONFIG.attackCooldown;
        aiState.lastAttackTick = 0; // Not tracking global tick, just use cooldown

        // Check if target died
        if (result.targetKilled) {
          this.onKillUnit?.(context, target.id);
        }
      }
    }
  }

  /**
   * Find the nearest enemy within detection range
   */
  private findNearestEnemy(
    context: ArchetypeUpdateContext
  ): UnitSchema | null {
    const { unit, state } = context;
    return CombatSystem.findClosestEnemy(
      state,
      unit,
      AGGRESSIVE_CONFIG.detectEnemyRange
    );
  }

  /**
   * Start chasing an enemy
   */
  private startChasing(context: ArchetypeUpdateContext, enemy: UnitSchema): void {
    const { unit, aiState } = context;

    unit.behaviorState = AggressiveBehaviorState.Chasing;
    aiState.targetEnemyId = enemy.id;
    unit.targetX = enemy.x;
    unit.targetY = enemy.y;
    unit.moveProgress = 0;
  }

  /**
   * Move unit towards its target position
   */
  private moveTowardsTarget(context: ArchetypeUpdateContext): void {
    const { unit, state } = context;

    // Accumulate movement progress
    unit.moveProgress += unit.moveSpeed;

    // Move if accumulated enough progress
    if (unit.moveProgress >= 1.0) {
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
        unit.moveProgress -= 1.0;
      } else {
        // No valid path
        unit.moveProgress = 0;
        
        // If chasing, give up and return to patrol
        if (unit.behaviorState === AggressiveBehaviorState.Chasing) {
          const { aiState } = context;
          aiState.targetEnemyId = undefined;
          unit.behaviorState = AggressiveBehaviorState.Patrolling;
          this.pickPatrolTarget(context);
        } else {
          // If patrolling, pick new target
          this.pickPatrolTarget(context);
        }
      }
    }
  }

  /**
   * Pick a random patrol target using BFS
   */
  private pickPatrolTarget(context: ArchetypeUpdateContext): void {
    const { unit, state, aiState } = context;

    const maxDistance = AGGRESSIVE_CONFIG.maxPatrolDistance;
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

    aiState.wanderCooldown = AGGRESSIVE_CONFIG.patrolReplanInterval;
  }
}
