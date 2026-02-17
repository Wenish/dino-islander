import { BuildingSchema, BuildingType } from "../schema/BuildingSchema";
import { v4 as uuidv4 } from "uuid";

/**
 * Factory for creating building instances
 * Handles all building types including castles
 * Each player has exactly one castle
 * Initializes buildings with default stats and position
 */

export class BuildingFactory {
  /**
   * Create a castle building for a player
   */
  static createCastle(playerId: string, x: number, y: number): BuildingSchema {
    const castle = new BuildingSchema();
    castle.id = uuidv4();
    castle.playerId = playerId;
    castle.x = x;
    castle.y = y;
    castle.buildingType = BuildingType.Castle;
    castle.health = this.CASTLE_MAX_HEALTH;
    castle.maxHealth = this.CASTLE_MAX_HEALTH;

    return castle;
  }

  /**
   * Create a generic building
   */
  static createBuilding(buildingType: BuildingType, playerId: string, x: number, y: number): BuildingSchema {
    const building = new BuildingSchema();
    building.id = uuidv4();
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