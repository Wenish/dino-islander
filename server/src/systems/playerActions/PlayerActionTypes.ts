
import { PlayerActionType } from "../../config/actionConfig";
import { GameRoomState } from "../../schema";

export { PlayerActionType };

export interface PlayerActionMessage {
  actionId: number;
  // coordinates for actions that target a location (e.g. bonk)
  x: number;
  y: number;
}

export interface IPlayerAction {
  cooldownMs: number;
  execute(playerId: string, message: PlayerActionMessage, state: GameRoomState): boolean;
}
