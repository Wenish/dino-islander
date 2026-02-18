import { BuildingSchema, BuildingType } from "../schema/BuildingSchema";
import { v4 as uuidv4 } from "uuid";
import { getBuildingCollision } from "../config/collisionConfig";
import { CollisionShape } from "../schema/GameObjectSchema";

/**
 * Factory for creating building instances
 * Handles all building types including castles
 * Each player has exactly one castle
 * Initializes buildings with default stats and position
 */

export class BuildingFactory {
  private static generateUniqueBuildingId(usedIds?: Set<string>): string {
    const reservedIds = usedIds ?? new Set<string>();
    let buildingId = uuidv4();
    while (reservedIds.has(buildingId)) {
      buildingId = uuidv4();
    }
    reservedIds.add(buildingId);
    return buildingId;
  }

  /**
   * Create a castle building for a player
   */
  static createCastle(playerId: string, x: number, y: number, usedIds?: Set<string>): BuildingSchema {
    const castle = new BuildingSchema();
    castle.id = this.generateUniqueBuildingId(usedIds);
    castle.playerId = playerId;
    castle.x = x;
    castle.y = y;
    castle.buildingType = BuildingType.Castle;
    castle.health = this.CASTLE_MAX_HEALTH;
    castle.maxHealth = this.CASTLE_MAX_HEALTH;

    // Set collision bounds
    const collision = getBuildingCollision(BuildingType.Castle);
    castle.collisionShape = collision.shape;
    if (collision.shape === CollisionShape.Circle && collision.radius !== undefined) {
      castle.radius = collision.radius;
    } else if (collision.shape === CollisionShape.Rectangle) {
      castle.width = collision.width || 1.0;
      castle.height = collision.height || 1.0;
    }

    return castle;
  }

  /**
   * Create a generic building
   */
  static createBuilding(buildingType: BuildingType, playerId: string, x: number, y: number, usedIds?: Set<string>): BuildingSchema {
    const building = new BuildingSchema();
    building.id = this.generateUniqueBuildingId(usedIds);
    building.playerId = playerId;
    building.x = x;
    building.y = y;
    building.buildingType = buildingType;
    
    // Set health based on building type
    switch (buildingType) {
      case BuildingType.Castle:
        building.health = this.CASTLE_MAX_HEALTH;
        building.maxHealth = this.CASTLE_MAX_HEALTH;
        break;
      case BuildingType.Tower:
        building.health = 50;
        building.maxHealth = 50;
        break;
      default:
        building.health = 10;
        building.maxHealth = 10;
    }

    // Set collision bounds
    const collision = getBuildingCollision(buildingType);
    building.collisionShape = collision.shape;
    if (collision.shape === CollisionShape.Circle && collision.radius !== undefined) {
      building.radius = collision.radius;
    } else if (collision.shape === CollisionShape.Rectangle) {
      building.width = collision.width || 1.0;
      building.height = collision.height || 1.0;
    }

    return building;
  }

  /**
   * Reset a building to full health
   * Used for testing or game restart scenarios
   */
  static resetBuilding(building: BuildingSchema): void {
    building.health = building.maxHealth;
  }

  // ===== BALANCE CONSTANTS =====
  // Centralized for easy tuning
  private static readonly CASTLE_MAX_HEALTH = 100;
}

// Export both new and old names for backward compatibility during refactoring
export { BuildingFactory as CastleFactory };