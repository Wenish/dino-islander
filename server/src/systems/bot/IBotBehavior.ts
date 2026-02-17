/**
 * IBotBehavior - Interface for bot decision-making strategies
 * 
 * Design principles:
 * - Easily extensible for different bot difficulty levels
 * - Decouples bot logic from game room
 * - Supports multiple bot implementations (easy, medium, hard AI)
 * - Each behavior can implement different strategies
 * 
 * Usage:
 * - Implement this interface to create new bot behaviors
 * - Register behaviors in BotAISystem
 * - Room options can specify which behavior to use
 */

import { GameRoomState } from "../../schema/GameRoomState";
import { PlayerSchema } from "../../schema/PlayerSchema";

export interface BotDecision {
  type: 'spawnUnit' | 'switchModifier' | 'wait';
  unitType?: number;         // For spawnUnit
  modifierId?: number;       // For switchModifier
}

/**
 * Interface for bot behavior strategies
 */
export interface IBotBehavior {
  /**
   * Called every tick to decide bot's next action
   * 
   * @param botPlayer - The bot player schema
   * @param state - The current game state
   * @param deltaTime - Time since last update (ms)
   * @returns BotDecision for the next action or null to wait
   */
  decideAction(
    botPlayer: PlayerSchema,
    state: GameRoomState,
    deltaTime: number
  ): BotDecision | null;

  /**
   * Reset the behavior state (called when game starts)
   */
  reset(): void;

  /**
   * Get the name/difficulty level of this behavior
   */
  getName(): string;
}
