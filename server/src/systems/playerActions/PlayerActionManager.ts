import { GameRoomState } from "../../schema";
import { ACTION_CONFIG } from "../../config/actionConfig";
import { PlayerActionType, PlayerActionMessage, IPlayerAction } from "./PlayerActionTypes";
import { BonkAction } from "./actions/BonkAction";

/**
 * PlayerActionManager
 *
 * Orchestrates player actions (bonk, etc.):
 * - Routes incoming action messages to the correct handler
 * - Tracks per-player cooldowns server-side
 * - Syncs cooldown progress to ActionSchema for client display
 */
export class PlayerActionManager {
  private actions = new Map<PlayerActionType, IPlayerAction>();
  /** Tracks elapsed ms since last action use, per player */
  private cooldownTimers = new Map<string, number>();

  constructor() {
    this.actions.set(PlayerActionType.BonkEnemies, new BonkAction());
  }

  /**
   * Handle an incoming player action message.
   * Validates cooldown, delegates to the correct action handler, and resets cooldown on success.
   */
  handleAction(playerId: string, message: PlayerActionMessage, state: GameRoomState): void {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return;

    // Check cooldown
    if (player.action.cooldownProgress < 1) {
      return;
    }

    const action = this.actions.get(message.actionId);
    if (!action) {
      console.warn(`Unknown player action: ${message.actionId}`);
      return;
    }

    const success = action.execute(playerId, message.data, state);
    if (success) {
      // Reset cooldown
      this.cooldownTimers.set(playerId, 0);
      player.action.actionId = message.actionId;
      player.action.cooldownProgress = 0;
    }
  }

  /**
   * Tick cooldown progress for all players.
   * Called every frame from the game update loop.
   */
  update(state: GameRoomState, deltaTime: number): void {
    for (const player of state.players) {
      if (player.action.cooldownProgress >= 1) continue;

      const elapsed = (this.cooldownTimers.get(player.id) ?? 0) + deltaTime;
      this.cooldownTimers.set(player.id, elapsed);

      player.action.cooldownProgress = Math.min(1, elapsed / ACTION_CONFIG.bonkCooldownMs);
    }
  }

  /**
   * Clean up cooldown state for a player that left.
   */
  removePlayer(playerId: string): void {
    this.cooldownTimers.delete(playerId);
  }
}
