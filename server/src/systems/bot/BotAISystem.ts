/**
 * BotAISystem - Central controller for bot players
 * 
 * Responsibilities:
 * - Manage bot behaviors and decision-making
 * - Execute bot actions via callbacks
 * - Support multiple bot behaviors (extensible)
 * - Coordinate bot actions with game state
 * 
 * Design principles:
 * - Decoupled from GameRoom via callbacks
 * - Supports multiple bots simultaneously
 * - Hot-swappable behaviors for different difficulties
 * - Minimal performance overhead (cache bot lookups)
 * 
 * Performance considerations:
 * - Bot players are cached to avoid repeated array scans
 * - Behavior instances are reused across ticks
 * - Decision-making is rate-limited via behavior timers
 * 
 * Usage:
 * ```typescript
 * const botSystem = new BotAISystem();
 * 
 * // Register a bot with a behavior
 * botSystem.registerBot(botPlayerId, new BasicBotBehavior());
 * 
 * // In game loop
 * botSystem.update(state, deltaTime, (botId, decision) => {
 *   // Execute bot decision (spawn unit, switch modifier, etc.)
 * });
 * ```
 */

import { GameRoomState } from "../../schema/GameRoomState";
import { PlayerSchema } from "../../schema/PlayerSchema";
import { IBotBehavior, BotDecision } from "./IBotBehavior";
import { BasicBotBehavior } from "./BasicBotBehavior";

/**
 * Callback type for executing bot decisions
 */
export type BotActionCallback = (botPlayerId: string, decision: BotDecision) => void;

/**
 * Bot registration entry
 */
interface BotEntry {
  playerId: string;
  behavior: IBotBehavior;
}

/**
 * Main bot AI system controller
 */
export class BotAISystem {
  private bots: Map<string, IBotBehavior> = new Map();
  private behaviorRegistry: Map<string, () => IBotBehavior> = new Map();

  constructor() {
    // Register default behaviors
    this.registerBehavior('basic', () => new BasicBotBehavior());
    // Easy to extend with more behaviors:
    // this.registerBehavior('aggressive', () => new AggressiveBotBehavior());
    // this.registerBehavior('defensive', () => new DefensiveBotBehavior());
  }

  /**
   * Register a new bot behavior type
   * Allows runtime addition of new AI strategies
   */
  registerBehavior(name: string, factory: () => IBotBehavior): void {
    this.behaviorRegistry.set(name, factory);
  }

  /**
   * Register a bot player with a specific behavior
   */
  registerBot(playerId: string, behaviorName: string = 'basic'): void {
    const factory = this.behaviorRegistry.get(behaviorName);
    if (!factory) {
      console.warn(`Bot behavior '${behaviorName}' not found, using 'basic'`);
      const basicFactory = this.behaviorRegistry.get('basic')!;
      this.bots.set(playerId, basicFactory());
      return;
    }

    const behavior = factory();
    behavior.reset();
    this.bots.set(playerId, behavior);
    console.log(`✓ Bot registered: ${playerId} with behavior '${behaviorName}'`);
  }

  /**
   * Unregister a bot player
   */
  unregisterBot(playerId: string): void {
    if (this.bots.delete(playerId)) {
      console.log(`✓ Bot unregistered: ${playerId}`);
    }
  }

  /**
   * Check if a player is managed by the bot system
   */
  isBot(playerId: string): boolean {
    return this.bots.has(playerId);
  }

  /**
   * Get number of active bots
   */
  getBotCount(): number {
    return this.bots.size;
  }

  /**
   * Reset all bots (called when game starts)
   */
  resetAllBots(): void {
    for (const behavior of this.bots.values()) {
      behavior.reset();
    }
  }

  /**
   * Main update loop - processes all bots
   * Called every game tick
   */
  update(
    state: GameRoomState,
    deltaTime: number,
    onBotAction: BotActionCallback
  ): void {
    // Early exit if no bots
    if (this.bots.size === 0) {
      return;
    }

    // Process each bot
    for (const [botId, behavior] of this.bots.entries()) {
      // Find bot player in state
      const botPlayer = state.players.find(p => p.id === botId && p.isBot);
      if (!botPlayer) {
        // Bot player not found - might have been removed
        continue;
      }

      try {
        // Ask behavior for a decision
        const decision = behavior.decideAction(botPlayer, state, deltaTime);

        // Execute decision if one was made
        if (decision) {
          onBotAction(botId, decision);
        }
      } catch (error) {
        console.error(`✗ Error processing bot ${botId}:`, error);
        // Continue processing other bots even if one fails
      }
    }
  }

  /**
   * Cleanup - remove all bots
   */
  dispose(): void {
    this.bots.clear();
    console.log("BotAISystem disposed");
  }
}
