/**
 * Combat System
 *
 * Responsibilities:
 * - Handle unit-to-unit combat
 * - Apply damage deterministically
 * - Manage attack cooldowns
 * - Query nearby enemies
 * - Check attack range
 *
 * Design Philosophy:
 * - Server-authoritative combat resolution
 * - Tick-based cooldown system
 * - Deterministic damage calculation
 * - No collision detection (units don't collide)
 * - Spatial queries for enemy detection
 *
 * Performance:
 * - O(n) enemy search (can be optimized with spatial grid)
 * - Minimal allocations
 * - Reuses existing arrays where possible
 */

import { GameRoomState, UnitSchema } from "../schema";
import { ModifierSystem } from "./modifiers";

/**
 * Combat configuration
 * These values can be moved to a config file if needed
 */
export const COMBAT_CONFIG = {
  defaultAttackRange: 1.5, // Tiles - Manhattan or Euclidean distance
  defaultAttackDamage: 1,
  defaultAttackCooldown: 60, // Ticks between attacks (1 second at 60 tick/s)
  detectEnemyRange: 10, // Tiles - how far a unit can detect enemies
};

/**
 * Result of an attack attempt
 */
export interface AttackResult {
  success: boolean;
  damage: number;
  targetKilled: boolean;
  targetId?: string;
}

/**
 * Query result for nearby enemies
 */
export interface NearbyEnemy {
  unit: UnitSchema;
  distance: number;
}

export class CombatSystem {
  /**
   * Find all enemy units within detection range
   * Uses player ownership to determine enemies
   *
   * @param state - Current game state
   * @param unit - The searching unit
   * @param range - Detection range in tiles
   * @returns Array of nearby enemies sorted by distance
   */
  static findNearbyEnemies(
    state: GameRoomState,
    unit: UnitSchema,
    range: number = COMBAT_CONFIG.detectEnemyRange
  ): NearbyEnemy[] {
    const enemies: NearbyEnemy[] = [];

    for (const otherUnit of state.units) {
      // Skip self
      if (otherUnit.id === unit.id) {
        continue;
      }

      // Skip dead units
      if (otherUnit.health <= 0) {
        continue;
      }

      // Only consider units owned by different players (enemies)
      if (otherUnit.playerId !== unit.playerId) {
        const distance = this.getDistance(
          unit.x,
          unit.y,
          otherUnit.x,
          otherUnit.y
        );

        if (distance <= range) {
          enemies.push({ unit: otherUnit, distance });
        }
      }
    }

    // Sort by distance (closest first)
    enemies.sort((a, b) => a.distance - b.distance);
    return enemies;
  }

  /**
   * Find the closest enemy unit
   *
   * @param state - Current game state
   * @param unit - The searching unit
   * @param range - Detection range in tiles
   * @returns Closest enemy or null
   */
  static findClosestEnemy(
    state: GameRoomState,
    unit: UnitSchema,
    range: number = COMBAT_CONFIG.detectEnemyRange
  ): UnitSchema | null {
    const enemies = this.findNearbyEnemies(state, unit, range);
    return enemies.length > 0 ? enemies[0].unit : null;
  }

  /**
   * Check if a target is within attack range
   *
   * @param attackerX - Attacker X position
   * @param attackerY - Attacker Y position
   * @param targetX - Target X position
   * @param targetY - Target Y position
   * @param attackRange - Attack range in tiles
   * @returns Whether target is in range
   */
  static isInAttackRange(
    attackerX: number,
    attackerY: number,
    targetX: number,
    targetY: number,
    attackRange: number = COMBAT_CONFIG.defaultAttackRange
  ): boolean {
    const distance = this.getDistance(attackerX, attackerY, targetX, targetY);
    return distance <= attackRange;
  }

  /**
   * Attempt to attack a target unit
   * Handles damage application and death
   *
   * @param attacker - The attacking unit
   * @param target - The target unit
   * @param damage - Amount of damage to deal
   * @returns Attack result
   */
  static attackUnit(
    attacker: UnitSchema,
    target: UnitSchema,
    damage: number = COMBAT_CONFIG.defaultAttackDamage
  ): AttackResult {
    // Validate target
    if (!target || target.health <= 0) {
      return {
        success: false,
        damage: 0,
        targetKilled: false,
      };
    }

    // Apply modifier-adjusted damage
    const finalDamage = ModifierSystem.calculateModifiedDamage(
      damage,
      attacker,
      target
    );
    target.health = Math.max(0, target.health - finalDamage);

    const targetKilled = target.health <= 0;

    return {
      success: true,
      damage: finalDamage,
      targetKilled,
      targetId: target.id,
    };
  }

  /**
   * Check if attacker can attack (cooldown check)
   * This is a helper - actual cooldown tracking is in AI state
   *
   * @param currentTick - Current game tick
   * @param lastAttackTick - Tick of last attack
   * @param cooldown - Cooldown duration in ticks
   * @returns Whether unit can attack
   */
  static canAttack(
    currentTick: number,
    lastAttackTick: number,
    cooldown: number = COMBAT_CONFIG.defaultAttackCooldown
  ): boolean {
    return currentTick - lastAttackTick >= cooldown;
  }

  /**
   * Get unit by ID from state
   * Helper for finding targets
   *
   * @param state - Current game state
   * @param unitId - Unit ID to find
   * @returns Unit or null
   */
  static getUnitById(state: GameRoomState, unitId: string): UnitSchema | null {
    return state.units.find((u) => u.id === unitId) || null;
  }

  /**
   * Calculate Euclidean distance between two points
   *
   * @param x1 - First point X
   * @param y1 - First point Y
   * @param x2 - Second point X
   * @param y2 - Second point Y
   * @returns Distance in tiles
   */
  private static getDistance(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate Manhattan distance between two points
   * Useful for grid-based games
   *
   * @param x1 - First point X
   * @param y1 - First point Y
   * @param x2 - Second point X
   * @param y2 - Second point Y
   * @returns Manhattan distance
   */
  static getManhattanDistance(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    return Math.abs(x2 - x1) + Math.abs(y2 - y1);
  }
}
