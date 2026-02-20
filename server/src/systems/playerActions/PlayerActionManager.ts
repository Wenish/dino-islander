import { GameRoomState } from "../../schema";
import { PlayerActionType } from "../../config/actionConfig";
import { PlayerActionMessage, IPlayerAction } from "./PlayerActionTypes";
import { BonkAction } from "./actions/BonkAction";
import { RaptorSpawnAction } from "./actions/RaptorSpawnAction";

/**
 * PlayerActionManager
 *
 * Orchestrates player actions:
 * - Resolves incoming action messages to the correct handler via ACTION_REGISTRY
 * - Delegates execution to the resolved action
 */
export class PlayerActionManager {
  private readonly actions: Partial<Record<PlayerActionType, IPlayerAction>>;

  constructor(broadcast: (event: string, data: unknown) => void) {
    this.actions = {
      [PlayerActionType.BonkEnemies]: new BonkAction(broadcast),
      [PlayerActionType.SpawnRaptor]: new RaptorSpawnAction(),
    };
  }

  handleAction(playerId: string, message: PlayerActionMessage, state: GameRoomState): boolean {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return false;

    const action = this.actions[message.actionId as PlayerActionType];
    if (!action) {
      console.warn(`Unknown player action: ${message.actionId}`);
      return false;
    }

    return action.execute(playerId, message, state);
  }
}
