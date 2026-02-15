import { CastleSchema } from "../schema/CastleSchema";
import { v4 as uuidv4 } from "uuid";

/**
 * Factory for creating castle instances
 * Each player has exactly one castle
 * Initializes castle with default stats and position
 */

export class CastleFactory {
  /**
   * Create a castle for a player
   */
  static createCastle(playerId: string, x: number, y: number): CastleSchema {
    const castle = new CastleSchema();
    castle.id = uuidv4();
    castle.playerId = playerId;
    castle.x = x;
    castle.y = y;
    castle.health = this.CASTLE_MAX_HEALTH;
    castle.maxHealth = this.CASTLE_MAX_HEALTH;

    return castle;
  }

  /**
   * Reset a castle to full health
   * Used for testing or game restart scenarios
   */
  static resetCastle(castle: CastleSchema): void {
    castle.health = this.CASTLE_MAX_HEALTH;
  }

  // ===== BALANCE CONSTANTS =====
  // Centralized for easy tuning
  private static readonly CASTLE_MAX_HEALTH = 100;
}