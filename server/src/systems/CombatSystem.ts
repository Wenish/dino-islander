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
import { MovementSystem } from "./MovementSystem";

/**
 * Combat configuration
 * These values can be moved to a config file if needed
 */
export const COMBAT_CONFIG = {
  defaultAttackRange: 1.5, // Tiles - Manhattan or Euclidean distance
  defaultAttackDamage: 1,
  defaultAttackCooldown: 60, // Ticks between attacks (1 second at 60 tick/s)
  detectEnemyRange: 10, // Tiles - how far a unit can detect enemies
  spatialCellSize: 4, // Tiles per spatial bucket for enemy queries
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
  private static spatialBuckets: Map<string, UnitSchema[]> = new Map();
  private static bucketPool: UnitSchema[][] = [];
  private static spatialTick: number = -1;

  /**
   * Build spatial index for the current tick to speed up enemy queries.
   */
  static beginTick(state: GameRoomState, tick: number): void {
    this.spatialTick = tick;

    for (const bucket of this.spatialBuckets.values()) {
      bucket.length = 0;
      this.bucketPool.push(bucket);
    }
    this.spatialBuckets.clear();

    const cellSize = COMBAT_CONFIG.spatialCellSize;
    for (const unit of state.units) {
      if (unit.health <= 0) {
        continue;
      }
      const cellX = Math.floor(unit.x / cellSize);
      const cellY = Math.floor(unit.y / cellSize);
      const key = this.getCellKey(cellX, cellY);

      let bucket = this.spatialBuckets.get(key);
      if (!bucket) {
        bucket = this.bucketPool.pop() ?? [];
        this.spatialBuckets.set(key, bucket);
      }
      bucket.push(unit);
    }
  }

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
    const candidates = this.getCandidatesInRange(state, unit.x, unit.y, range);

    for (const otherUnit of candidates) {
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
    let closest: UnitSchema | null = null;
    let closestDistance = range;
    const candidates = this.getCandidatesInRange(state, unit.x, unit.y, range);

    for (const otherUnit of candidates) {
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

        if (distance <= range && distance < closestDistance) {
          closestDistance = distance;
          closest = otherUnit;
        }
      }
    }

    return closest;
  }

  static queryUnitsInRange(
    state: GameRoomState,
    x: number,
    y: number,
    range: number,
    out: UnitSchema[] = []
  ): UnitSchema[] {
    out.length = 0;
    const candidates = this.getCandidatesInRange(state, x, y, range);
    for (const unit of candidates) {
      const distance = this.getDistance(x, y, unit.x, unit.y);
      if (distance <= range) {
        out.push(unit);
      }
    }
    return out;
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

    // Prevent friendly fire - don't attack units owned by the same player
    if (attacker.playerId && target.playerId && attacker.playerId === target.playerId) {
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
   * Apply knockback to a target unit, pushing it away from the attacker.
   * The knockback distance is calculated as: attacker.power / target.weight
   * If the landing position is not walkable, steps back incrementally until a valid position is found.
   *
   * @param attacker - The attacking unit (determines direction and power)
   * @param target - The target unit to push back (uses weight for resistance)
   * @param state - Current game state (for walkability checks)
   */
  static applyKnockback(
    attacker: UnitSchema,
    target: UnitSchema,
    state: GameRoomState
  ): void {
    if (attacker.power <= 0 || target.weight <= 0) {
      return;
    }

    // Direction from attacker to target
    const dx = target.x - attacker.x;
    const dy = target.y - attacker.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) {
      return;
    }

    // Normalize direction
    const dirX = dx / dist;
    const dirY = dy / dist;

    // Calculate knockback distance: power / weight, clamped to max 3 tiles
    const maxKnockback = 2.0;
    const knockbackDist = Math.min(attacker.power / target.weight, maxKnockback);

    // Try the full distance first, then step back in 0.5 increments
    const step = 0.5;
    for (let d = knockbackDist; d > 0; d -= step) {
      const newX = target.x + dirX * d;
      const newY = target.y + dirY * d;

      const metadata = MovementSystem.isPositionWalkable(state, newX, newY);
      if (metadata.isWalkable) {
        target.x = newX;
        target.y = newY;
        return;
      }
    }

    // No valid position found — don't move the unit
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

  private static getCandidatesInRange(
    state: GameRoomState,
    x: number,
    y: number,
    range: number
  ): UnitSchema[] {
    if (this.spatialTick < 0) {
      return state.units as unknown as UnitSchema[];
    }

    const cellSize = COMBAT_CONFIG.spatialCellSize;
    const minCellX = Math.floor((x - range) / cellSize);
    const maxCellX = Math.floor((x + range) / cellSize);
    const minCellY = Math.floor((y - range) / cellSize);
    const maxCellY = Math.floor((y + range) / cellSize);

    const results: UnitSchema[] = [];

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        const bucket = this.spatialBuckets.get(this.getCellKey(cx, cy));
        if (!bucket) {
          continue;
        }
        for (const unit of bucket) {
          results.push(unit);
        }
      }
    }

    return results;
  }

  private static getCellKey(x: number, y: number): string {
    return `${x},${y}`;
  }
}
