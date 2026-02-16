import { GameRoomState } from "../schema/GameRoomState";
import { UnitFactory } from "../factories/unitFactory";
import { UnitType } from "../schema/UnitSchema";
import { GAME_CONFIG } from "../config/gameConfig";
import {
  MODIFIER_EARTH,
  MODIFIER_FIRE,
  MODIFIER_WATER,
} from "./modifiers/Modifier";

export class AutoSpawnSystem {
  private elapsedMs = 0;
  private static readonly modifierIds = [
    MODIFIER_FIRE,
    MODIFIER_EARTH,
    MODIFIER_WATER,
  ];

  reset(): void {
    this.elapsedMs = 0;
  }

  update(state: GameRoomState, deltaTimeMs: number): void {
    if (state.players.length === 0) {
      return;
    }

    this.elapsedMs += deltaTimeMs;
    const intervalMs = GAME_CONFIG.autoSpawnIntervalMs;

    while (this.elapsedMs >= intervalMs) {
      this.elapsedMs -= intervalMs;
      this.spawnForAllPlayers(state);
    }
  }

  private spawnForAllPlayers(state: GameRoomState): void {
    for (const player of state.players) {
      const spawn = this.getSpawnPosition(state, player.id);
      const unit = UnitFactory.createUnit(
        player.id,
        UnitType.Warrior,
        spawn.x,
        spawn.y
      );
      unit.modifierId = this.getRandomModifierId();
      state.units.push(unit);
    }
  }

  private getSpawnPosition(
    state: GameRoomState,
    playerId: string
  ): { x: number; y: number } {
    const castle = state.castles.find((c) => c.playerId === playerId);
    const spawnX = castle
      ? castle.x + GAME_CONFIG.unitSpawnOffsetX
      : GAME_CONFIG.unitSpawnDefaultX;
    const spawnY = castle
      ? castle.y + GAME_CONFIG.unitSpawnOffsetY
      : GAME_CONFIG.unitSpawnDefaultY;

    return { x: spawnX, y: spawnY };
  }

  private getRandomModifierId(): number {
    const ids = AutoSpawnSystem.modifierIds;
    return ids[(Math.random() * ids.length) | 0];
  }
}
