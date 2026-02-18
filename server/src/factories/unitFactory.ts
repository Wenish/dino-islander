import { UnitSchema, UnitType } from "../schema/UnitSchema";
import { v4 as uuidv4 } from "uuid";
import { generateName } from "../utils/nameGenerator";
import { UNIT_STATS } from "../config/unitStats";
import { getUnitCollision } from "../config/collisionConfig";
import { CollisionShape } from "../schema/GameObjectSchema";

/**
 * Factory for creating unit instances
 * Centralizes unit creation logic and ensures consistent initialization
 * 
 * Performance note:
 * - Objects are created fresh (not pooled here)
 * - Pooling can be added to this factory later if needed
 */

export class UnitFactory {
  /**
   * Create a unit of a specific type
   * Sets default stats based on unit type
   */
  static createUnit(
    playerId: string,
    unitType: UnitType,
    x: number,
    y: number,
    usedIds?: Set<string>
  ): UnitSchema {
    const unit = new UnitSchema();
    const reservedIds = usedIds ?? new Set<string>();
    let unitId = uuidv4();
    while (reservedIds.has(unitId)) {
      unitId = uuidv4();
    }
    reservedIds.add(unitId);
    unit.id = unitId;
    unit.playerId = playerId;
    unit.unitType = unitType;
    unit.x = x;
    unit.y = y;

    // Get stats from config
    const stats = UNIT_STATS[unitType];
    unit.health = stats.health;
    unit.maxHealth = stats.health;
    unit.moveSpeed = stats.moveSpeed;
    unit.archetype = stats.archetype;
    unit.power = stats.power;
    unit.weight = stats.weight;
    unit.name = generateName(unitType);

    // Set collision bounds
    const collision = getUnitCollision(unitType);
    unit.collisionShape = collision.shape;
    if (collision.shape === CollisionShape.Circle && collision.radius !== undefined) {
      unit.radius = collision.radius;
    } else if (collision.shape === CollisionShape.Rectangle) {
      unit.width = collision.width || 1.0;
      unit.height = collision.height || 1.0;
    }

    return unit;
  }

  /**
   * Batch create multiple units efficiently
   * Used when spawning a card that creates multiple units
   */
  static createUnits(
    playerId: string,
    unitType: UnitType,
    positions: Array<{ x: number; y: number }>,
    count: number = positions.length,
    usedIds?: Set<string>
  ): UnitSchema[] {
    const units: UnitSchema[] = [];
    const reservedIds = usedIds ?? new Set<string>();
    for (let i = 0; i < count && i < positions.length; i++) {
      const pos = positions[i];
      units.push(this.createUnit(playerId, unitType, pos.x, pos.y, reservedIds));
    }
    return units;
  }
}