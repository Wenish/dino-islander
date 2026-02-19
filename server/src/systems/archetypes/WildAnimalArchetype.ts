/**
 * Wild Animal Archetype
 *
 * Behavior Profile:
 * - Predatory unit (e.g., Raptors, Wolves)
 * - Attacks ALL other units except its own species (unitType)
 * - Patrols within a defined area
 * - Actively searches for prey
 * - Chases and attacks anything that isn't the same type
 * - Returns to patrol after killing target or losing prey
 *
 * Key Difference from Aggressive:
 * - Aggressive archetype: Only attacks units from different players (allied with faction)
 * - WildAnimal archetype: Attacks any different species (true predator)
 *
 * States:
 * - Idle: Initial state, transitions to patrolling
 * - Patrolling: Moving around looking for prey
 * - Chasing: Pursuing a detected prey
 * - Attacking: In attack range, dealing damage
 *
 * Design:
 * - Prey prioritization: closest target first
 * - Chase timeout to prevent infinite pursuit
 * - Attack cooldown for balanced combat
 * - Deterministic state transitions
 *
 * Performance:
 * - Prey detection throttled by state
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
import { MovementService } from "../services/MovementService";
import { CombatSystem } from "../CombatSystem";
import { PlayerStatsSystem } from "../PlayerStatsSystem";

/**
 * Configuration for wild animal behavior
 */
export const WILD_ANIMAL_CONFIG = {
  patrolReplanInterval: 80, // Ticks between selecting new patrol target
  maxPatrolDistance: 15, // Max tiles away for patrol target (roaming predator)

  preyDetectRange: 12, // Detection range for any non-species prey
  chaseRange: 25, // Max chase distance before giving up

  attackRange: 0.5, // Attack range in tiles
  attackDamage: 3, // Damage per attack (predator)
  attackCooldown: 50, // Ticks between attacks (faster than warrior)

  preySearchInterval: 8, // Ticks between prey scans while patrolling
};

/**
 * Behavior state mappings for wild animals
 */
const WildAnimalBehaviorState = {
  Idle: UnitBehaviorState.Idle,
  Patrolling: UnitBehaviorState.Wandering,
  Chasing: UnitBehaviorState.Moving,
  Attacking: UnitBehaviorState.Attacking,
};

export class WildAnimalArchetype extends UnitArchetype {
  readonly type = UnitArchetypeType.WildAnimal;

  /**
   * Initialize AI state for wild animal
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
   * Main update loop for wild animals
   */
  update(context: ArchetypeUpdateContext): void {
    const { unit, aiState } = context;

    // Behavior state machine
    switch (unit.behaviorState) {
      case WildAnimalBehaviorState.Idle:
        this.handleIdle(context);
        break;

      case WildAnimalBehaviorState.Patrolling:
        this.handlePatrolling(context);
        break;

      case WildAnimalBehaviorState.Chasing:
        this.handleChasing(context);
        break;

      case WildAnimalBehaviorState.Attacking:
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
   * React to killing a unit - search for next prey
   */
  onKillUnit(context: ArchetypeUpdateContext, killedUnitId: string): void {
    const { unit, aiState } = context;

    // Clear current target
    aiState.targetEnemyId = undefined;

    // Return to patrolling (will search for new prey)
    unit.behaviorState = WildAnimalBehaviorState.Patrolling;
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
      unit.behaviorState = WildAnimalBehaviorState.Patrolling;
      this.pickPatrolTarget(context);
    }
  }

  /**
   * Handle patrolling state - move around and search for prey
   */
  private handlePatrolling(context: ArchetypeUpdateContext): void {
    const { unit, aiState } = context;

    // Scan for prey periodically
    if (aiState.wanderCooldown % WILD_ANIMAL_CONFIG.preySearchInterval === 0) {
      const prey = this.findNearestPrey(context);
      if (prey) {
        this.startChasing(context, prey);
        return;
      }
    }

    // Check if reached patrol target
    const tolerance = 0.01;
    if (
      Math.abs(unit.x - unit.targetX) < tolerance &&
      Math.abs(unit.y - unit.targetY) < tolerance
    ) {
      this.pickPatrolTarget(context);
      return;
    }

    // Move towards patrol target
    this.moveTowardsTarget(context);
  }

  /**
   * Handle chasing state - pursue prey
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
      unit.behaviorState = WildAnimalBehaviorState.Patrolling;
      this.pickPatrolTarget(context);
      return;
    }

    // Verify target is still a valid prey (not same species)
    if (target.unitType === unit.unitType) {
      aiState.targetEnemyId = undefined;
      unit.behaviorState = WildAnimalBehaviorState.Patrolling;
      this.pickPatrolTarget(context);
      return;
    }

    // Check if in attack range (surface-to-surface)
    if (CombatSystem.isInAttackRangeOf(unit, target, WILD_ANIMAL_CONFIG.attackRange)) {
      // Transition to attacking
      unit.behaviorState = WildAnimalBehaviorState.Attacking;
      return;
    }

    // Check if target is too far (chase timeout)
    const distance = CombatSystem.getManhattanDistance(
      unit.x,
      unit.y,
      target.x,
      target.y
    );
    if (distance > WILD_ANIMAL_CONFIG.chaseRange) {
      // Give up chase
      aiState.targetEnemyId = undefined;
      unit.behaviorState = WildAnimalBehaviorState.Patrolling;
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
      unit.behaviorState = WildAnimalBehaviorState.Patrolling;
      this.pickPatrolTarget(context);
      return;
    }

    // Check if still in range (surface-to-surface)
    if (!CombatSystem.isInAttackRangeOf(unit, target, WILD_ANIMAL_CONFIG.attackRange)) {
      // Out of range, resume chase
      unit.behaviorState = WildAnimalBehaviorState.Chasing;
      return;
    }

    // Attack if cooldown ready
    if (aiState.attackCooldown <= 0) {
      const result = CombatSystem.attackUnit(
        unit,
        target,
        WILD_ANIMAL_CONFIG.attackDamage
      );

      if (result.success) {
        // Reset cooldown
        aiState.attackCooldown = WILD_ANIMAL_CONFIG.attackCooldown;
        aiState.lastAttackTick = 0;

        // Apply knockback to surviving targets
        if (!result.targetKilled) {
          CombatSystem.applyKnockback(unit, target, state);
        }

        // Check if target died
        if (result.targetKilled) {
          if (result.attackerPlayerId) {
            PlayerStatsSystem.incrementMinionsKilled(state, result.attackerPlayerId);
          }
          this.onKillUnit?.(context, target.id);
        }
      }
    }
  }

  /**
   * Find the nearest prey within detection range
   * Prey is defined as any unit that is NOT the same species (unitType)
   *
   * Unlike aggressive archetype which targets different players,
   * wild animals target different species
   */
  private findNearestPrey(
    context: ArchetypeUpdateContext
  ): UnitSchema | null {
    const { unit, state } = context;

    let closest: UnitSchema | null = null;
    let closestDistance = WILD_ANIMAL_CONFIG.preyDetectRange;
    const candidates = CombatSystem.queryUnitsInRange(
      state,
      unit.x,
      unit.y,
      WILD_ANIMAL_CONFIG.preyDetectRange
    );

    for (const otherUnit of candidates) {
      // Skip self
      if (otherUnit.id === unit.id) {
        continue;
      }

      // Skip dead units
      if (otherUnit.health <= 0) {
        continue;
      }

      // Only target different species (unitType)
      if (otherUnit.unitType === unit.unitType) {
        continue;
      }

      // Calculate distance using Manhattan distance
      const distance = CombatSystem.getManhattanDistance(
        unit.x,
        unit.y,
        otherUnit.x,
        otherUnit.y
      );

      // Check if within range and closer than current closest
      if (distance <= WILD_ANIMAL_CONFIG.preyDetectRange && distance < closestDistance) {
        closestDistance = distance;
        closest = otherUnit;
      }
    }

    return closest;
  }

  /**
   * Start chasing a prey
   */
  private startChasing(context: ArchetypeUpdateContext, prey: UnitSchema): void {
    const { unit, aiState } = context;

    aiState.targetEnemyId = prey.id;
    unit.targetX = prey.x;
    unit.targetY = prey.y;
    unit.behaviorState = WildAnimalBehaviorState.Chasing;
  }

  /**
   * Pick a random patrol target within maxPatrolDistance
   */
  private pickPatrolTarget(context: ArchetypeUpdateContext): void {
    const { unit, state, aiState } = context;

    aiState.wanderCooldown = WILD_ANIMAL_CONFIG.patrolReplanInterval;

    // Use BFS to find walkable tiles within range
    const candidates: { x: number; y: number }[] = [];
    const visited = new Set<string>();
    const queue = [{ x: unit.x, y: unit.y, dist: 0 }];

    while (queue.length > 0 && candidates.length < 30) {
      const current = queue.shift()!;

      // Add tile as candidate if within range but not at start
      if (current.dist > 0 && current.dist <= WILD_ANIMAL_CONFIG.maxPatrolDistance) {
        candidates.push({ x: current.x, y: current.y });
      }

      // Continue expanding search if not at max distance
      if (current.dist < WILD_ANIMAL_CONFIG.maxPatrolDistance) {
        const neighbors = MovementSystem.getWalkableNeighbors(
          state,
          current.x,
          current.y
        );

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
    if (candidates.length > 0) {
      const target =
        candidates[Math.floor(Math.random() * candidates.length)];
      unit.targetX = target.x;
      unit.targetY = target.y;
    }
  }

  /**
   * Move unit towards its target using consolidated MovementService
   * 
   * Uses fallback behavior: gives up if blocked and returns to idle
   */
  private moveTowardsTarget(context: ArchetypeUpdateContext): void {
    const { unit, state, aiState } = context;

    // Use fallback behavior - gives up if blocked
    MovementService.updateUnitMovementWithFallback(
      unit,
      state,
      unit.moveSpeed,
      () => {
        // Called when blocked - return to patrol planning
        aiState.wanderCooldown = 0; // Force replanning
      }
    );
  }
}
