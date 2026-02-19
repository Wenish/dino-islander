import { PlayerActionType } from "../../schema/ActionSchema";
import { GameRoomState } from "../../schema";

export { PlayerActionType };

export interface PlayerActionMessage<T = unknown> {
  actionId: PlayerActionType;
  data: T;
}

export interface BonkActionData {
  x: number;
  y: number;
}

export interface IPlayerAction<T = unknown> {
  execute(playerId: string, data: T, state: GameRoomState): boolean;
}
