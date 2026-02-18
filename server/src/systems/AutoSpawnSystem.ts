import { GameRoomState } from "../schema/GameRoomState";
import { UnitFactory } from "../factories/unitFactory";
import { UnitType } from "../schema/UnitSchema";
import { GAME_CONFIG } from "../config/gameConfig";
import { BuildingType } from "../schema/BuildingSchema";

export class AutoSpawnSystem {
  private elapsedMs = 0;

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
    const usedUnitIds = new Set(state.units.map((unit) => unit.id));

    for (const player of state.players) {
      const spawn = this.getSpawnPosition(state, player.id);
      const unit = UnitFactory.createUnit(
        player.id,
        UnitType.Warrior,
        spawn.x,
        spawn.y,
        usedUnitIds
      );
      unit.modifierId = player.modifierId;
      state.units.push(unit);
    }
  }

  private getSpawnPosition(
    state: GameRoomState,
    playerId: string
  ): { x: number; y: number } {
    const castle = state.buildings.find((b) => 
      b.buildingType === BuildingType.Castle && b.playerId === playerId
    );
    const spawnX = castle
      ? castle.x + GAME_CONFIG.unitSpawnOffsetX
      : GAME_CONFIG.unitSpawnDefaultX;
    const spawnY = castle
      ? castle.y + GAME_CONFIG.unitSpawnOffsetY
      : GAME_CONFIG.unitSpawnDefaultY;

    return { x: spawnX, y: spawnY };
  }
}
