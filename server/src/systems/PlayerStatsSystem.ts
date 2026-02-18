import { GameRoomState } from "../schema/GameRoomState";

/**
 * Player Stats System
 *
 * Responsibilities:
 * - Manage player combat statistics
 * - Keep stat mutations centralized and deterministic
 * - Provide explicit reset points across phase transitions
 */
export class PlayerStatsSystem {
  static incrementMinionsKilled(state: GameRoomState, playerId: string): void {
    if (!playerId) {
      return;
    }

    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      return;
    }

    player.minionsKilled += 1;
  }

  static resetMinionsKilled(state: GameRoomState): void {
    for (const player of state.players) {
      player.minionsKilled = 0;
    }
  }
}
