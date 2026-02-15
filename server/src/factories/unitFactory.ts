import { UnitSchema, UnitType } from "../schema/UnitSchema";
import { v4 as uuidv4 } from "uuid";

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
    y: number
  ): UnitSchema {
    const unit = new UnitSchema();
    unit.id = uuidv4();
    unit.playerId = playerId;
    unit.unitType = unitType;
    unit.x = x;
    unit.y = y;

    // Set type-specific stats
    const stats = this.getUnitStats(unitType);
    unit.health = stats.health;
    unit.maxHealth = stats.health;
    unit.moveSpeed = stats.moveSpeed;

    return unit;
  }

  /**
   * Get default stats for a unit type
   * Centralized for balance tuning
   */
  private static getUnitStats(unitType: UnitType): {
    health: number;
    moveSpeed: number;
  } {
    switch (unitType) {
      case UnitType.Warrior:
        return {
          health: 12,
          moveSpeed: 1.5,
        };
      default:
        return {
          health: 10,
          moveSpeed: 1.0,
        };
    }
  }

  /**
   * Batch create multiple units efficiently
   * Used when spawning a card that creates multiple units
   */
  static createUnits(
    playerId: string,
    unitType: UnitType,
    positions: Array<{ x: number; y: number }>,
    count: number = positions.length
  ): UnitSchema[] {
    const units: UnitSchema[] = [];
    for (let i = 0; i < count && i < positions.length; i++) {
      const pos = positions[i];
      units.push(this.createUnit(playerId, unitType, pos.x, pos.y));
    }
    return units;
  }
}