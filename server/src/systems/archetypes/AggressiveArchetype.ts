/**
 * Aggressive Archetype
 *
 * Behavior Profile:
 * - Combat-oriented unit (e.g., Warriors, Spears)
 * - Prioritizes finding and attacking enemy units
 * - If no enemies nearby, searches entire map for enemy castles
 * - Attacks castle until destroyed
 * - Returns to searching after killing target
 *
 * States:
 * - Idle: Searches for nearby enemies first, then looks for castles on map
 * - Chasing: Pursuing a detected enemy
 * - Attacking: In attack range of enemy or castle, dealing damage
 *
 * Priorities:
 * 1. Nearby enemy units (detectEnemyRange)
 * 2. Enemy castles (entire map)
 * 3. Idle while waiting for targets
 *
 * Design:
 * - Target prioritization: closest enemy units first
 * - Castle detection searches entire map
 * - Chase timeout to prevent infinite pursuit
 * - Attack cooldown for balanced combat
 * - Deterministic state transitions
 *
 * Performance:
 * - Enemy detection limited by range
 * - Castle detection across all castles
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
import { MovementService } from "../services/MovementService";
import { CombatSystem } from "../CombatSystem";
import { BuildingType } from "../../schema/BuildingSchema";
import { PlayerStatsSystem } from "../PlayerStatsSystem";

/**
 * Configuration for aggressive behavior
 */
export const AGGRESSIVE_CONFIG = {
  detectEnemyRange: 10, // Detection range for nearby enemies
  chaseRange: 20, // Max chase distance before giving up
  attackRange: 1.5, // Attack range in tiles
  
  attackDamage: 2, // Damage per attack on unit
  castleDamage: 2, // Damage per attack on castle
  attackCooldown: 60, // Ticks between attacks (1 second at 60 tick/s)
};

/**
 * Behavior state mappings for aggressive units
 * Maps to schema behavior states
 */
const AggressiveBehaviorState = {
  Idle: UnitBehaviorState.Idle,
  Chasing: UnitBehaviorState.Moving,
  Attacking: UnitBehaviorState.Attacking,
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
      deathTick: undefined,
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

      case AggressiveBehaviorState.Chasing:
        this.handleChasing(context);
        break;

      case AggressiveBehaviorState.Attacking:
        // Differentiate between attacking unit and attacking castle using aiState
        if (aiState.targetEnemyId) {
          this.handleAttacking(context);
        } else if (aiState.targetCastleIndex !== undefined) {
          this.handleAttackingCastle(context);
        } else {
          // Neither target set, return to idle
          unit.behaviorState = AggressiveBehaviorState.Idle;
        }
        break;
    }

    // Decrement cooldowns
    if (aiState.attackCooldown > 0) {
      aiState.attackCooldown--;
    }
  }

  /**
   * React to killing a unit - search for next target
   */
  onKillUnit(context: ArchetypeUpdateContext): void {
    const { unit, aiState } = context;
    
    // Clear current target
    aiState.targetEnemyId = undefined;
    
    // Return to idle to search for next target
    unit.behaviorState = AggressiveBehaviorState.Idle;
  }

  /**
   * Handle idle state - search for enemies or castles
   * Priority 1: Look for nearby enemy units
   * Priority 2: Look for enemy castles on the map
   */
  private handleIdle(context: ArchetypeUpdateContext): void {
    const { unit } = context;

    // First priority: scan for nearby enemies
    const enemy = this.findNearestEnemy(context);
    if (enemy) {
      this.startChasing(context, enemy);
      return;
    }

    // Second priority: scan entire map for enemy castles
    const targetCastleIndex = this.findNearestEnemyCastle(context);
    if (targetCastleIndex !== null) {
      this.startAttackingCastle(context, targetCastleIndex);
      return;
    }

    // No enemies or castles found - stay idle (will check again next tick)
    unit.behaviorState = AggressiveBehaviorState.Idle;
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
      // Target lost or dead, return to idle to find new target
      aiState.targetEnemyId = undefined;
      unit.behaviorState = AggressiveBehaviorState.Idle;
      return;
    }

    // Check if in attack range (surface-to-surface)
    if (CombatSystem.isInAttackRangeOf(unit, target, AGGRESSIVE_CONFIG.attackRange)) {
      // Transition to attacking state (unit target)
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
      unit.behaviorState = AggressiveBehaviorState.Idle;
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
      // Target dead, return to idle
      aiState.targetEnemyId = undefined;
      unit.behaviorState = AggressiveBehaviorState.Idle;
      return;
    }

    // Check if still in range (surface-to-surface)
    if (!CombatSystem.isInAttackRangeOf(unit, target, AGGRESSIVE_CONFIG.attackRange)) {
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

        // Apply knockback to surviving targets
        if (!result.targetKilled) {
          CombatSystem.applyKnockback(unit, target, state);
        }

        // Check if target died
        if (result.targetKilled) {
          if (result.attackerPlayerId) {
            PlayerStatsSystem.incrementMinionsKilled(state, result.attackerPlayerId);
          }
          this.onKillUnit?.(context);
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
  }

  /**
   * Move unit towards its target position using consolidated MovementService
   * 
   * Behavior:
   * - When attacking castle: keeps retrying (persistent movement)
   * - When chasing enemy: returns to idle if blocked
   */
  private moveTowardsTarget(context: ArchetypeUpdateContext): void {
    const { unit, state, aiState } = context;

    // For castle attacks, use retry behavior (keeps trying)
    if (aiState.targetCastleIndex !== undefined) {
      const result = MovementService.updateUnitMovementWithRetry(
        unit,
        state,
        unit.moveSpeed
      );
      // Unit will automatically retry next tick if blocked
      return;
    }

    // For chasing enemies, use fallback behavior (gives up if blocked)
    const result = MovementService.updateUnitMovementWithFallback(
      unit,
      state,
      unit.moveSpeed,
      () => {
        // Called when blocked while chasing
        aiState.targetEnemyId = undefined;
        unit.behaviorState = AggressiveBehaviorState.Idle;
      }
    );
  }

  /**
   * Pick a random patrol target using BFS
   * REMOVED - No longer used, units now go directly from Idle to Chasing or Attacking
   */

  /**
   * Find the nearest enemy castle on the entire map
   */
  private findNearestEnemyCastle(
    context: ArchetypeUpdateContext
  ): number | null {
    const { unit, state } = context;

    let closestIndex: number | null = null;
    let closestDistance = Infinity;

    for (let i = 0; i < state.buildings.length; i++) {
      const building = state.buildings[i];

      // Only check castle buildings
      if (building.buildingType !== BuildingType.Castle) {
        continue;
      }

      // Skip dead castles first
      if (building.health <= 0) {
        continue;
      }

      // Only skip if castle is explicitly owned by this same player
      // Target all other castles (owned by enemies or unowned)
      if (building.playerId && building.playerId !== "" && building.playerId === unit.playerId) {
        continue;
      }

      // Calculate distance
      const distance = CombatSystem.getManhattanDistance(
        unit.x,
        unit.y,
        building.x,
        building.y
      );

      // Check if closer than current closest
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    }

    return closestIndex;
  }

  /**
   * Start attacking a castle
   */
  private startAttackingCastle(
    context: ArchetypeUpdateContext,
    castleIndex: number
  ): void {
    const { unit, state, aiState } = context;

    const targetCastle = state.buildings[castleIndex];
    aiState.targetCastleIndex = castleIndex;
    unit.targetX = targetCastle.x;
    unit.targetY = targetCastle.y;
    unit.behaviorState = AggressiveBehaviorState.Attacking;
  }

  /**
   * Handle attacking castle state - move to castle and deal damage
   */
  private handleAttackingCastle(context: ArchetypeUpdateContext): void {
    const { unit, state, aiState } = context;

    // Verify castle still exists
    if (
      aiState.targetCastleIndex === undefined ||
      aiState.targetCastleIndex >= state.buildings.length
    ) {
      // Castle gone, return to idle to search for new target
      aiState.targetCastleIndex = undefined;
      unit.behaviorState = AggressiveBehaviorState.Idle;
      return;
    }

    const targetCastle = state.buildings[aiState.targetCastleIndex];

    // Verify it's still a castle building
    if (targetCastle.buildingType !== BuildingType.Castle) {
      aiState.targetCastleIndex = undefined;
      unit.behaviorState = AggressiveBehaviorState.Idle;
      return;
    }

    // Verify castle is still alive
    if (targetCastle.health <= 0) {
      aiState.targetCastleIndex = undefined;
      unit.behaviorState = AggressiveBehaviorState.Idle;
      return;
    }

    // Verify castle is still owned by an enemy (not owned by us)
    // Skip attacking if it's explicitly our own castle
    if (targetCastle.playerId && targetCastle.playerId !== "" && targetCastle.playerId === unit.playerId) {
      aiState.targetCastleIndex = undefined;
      unit.behaviorState = AggressiveBehaviorState.Idle;
      return;
    }

    // Always set target for pathfinding
    unit.targetX = targetCastle.x;
    unit.targetY = targetCastle.y;

    // Check if in attack range (surface-to-surface, accounts for castle's rectangle shape)
    if (CombatSystem.isInAttackRangeOf(unit, targetCastle, AGGRESSIVE_CONFIG.attackRange)) {
      // In range - try to attack if cooldown ready
      if (aiState.attackCooldown <= 0) {
        // Apply damage to castle
        targetCastle.health = Math.max(0, targetCastle.health - AGGRESSIVE_CONFIG.castleDamage);
        aiState.attackCooldown = AGGRESSIVE_CONFIG.attackCooldown;

        // Check if castle destroyed
        if (targetCastle.health <= 0) {
          aiState.targetCastleIndex = undefined;
          unit.behaviorState = AggressiveBehaviorState.Idle;
        }
      }
      return;
    }

    // Out of range - move towards castle
    this.moveTowardsTarget(context);
  }
}
