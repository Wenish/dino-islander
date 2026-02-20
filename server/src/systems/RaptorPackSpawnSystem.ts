import { GameRoomState, UnitBehaviorState } from "../schema";
import { UnitType } from "../schema/UnitSchema";
import { TileType } from "../schema/TileSchema";
import { GAME_CONFIG } from "../config/gameConfig";
import { UnitFactory } from "../factories/unitFactory";
import { MovementSystem } from "./MovementSystem";
import { getUnitCollision } from "../config/collisionConfig";

interface SpawnPoint {
  x: number;
  y: number;
}

export class RaptorPackSpawnSystem {
  private static readonly WILDLIFE_PLAYER_ID = "wildlife";
  private static readonly CLUSTER_SEARCH_RADIUS = 2;
  private static readonly MAX_ANCHOR_ATTEMPTS = 80;
  private static readonly CLUSTER_OFFSETS: Array<{ x: number; y: number }> = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 1, y: 1 },
    { x: 1, y: -1 },
    { x: -1, y: 1 },
    { x: -1, y: -1 },
    { x: 2, y: 0 },
    { x: -2, y: 0 },
    { x: 0, y: 2 },
    { x: 0, y: -2 },
  ];

  private tickCounter = 0;
  private nextSpawnTick = 0;

  reset(): void {
    this.tickCounter = 0;
    this.nextSpawnTick = this.getSpawnIntervalTicks();
  }

  update(state: GameRoomState): void {
    if (state.players.length === 0) {
      return;
    }

    this.tickCounter += 1;
    if (this.tickCounter < this.nextSpawnTick) {
      return;
    }

    this.spawnRaptorPack(state);
    this.nextSpawnTick += this.getSpawnIntervalTicks();
  }

  private getSpawnIntervalTicks(): number {
    const ticks = Math.round(
      (GAME_CONFIG.raptorPackSpawnIntervalMs * GAME_CONFIG.SERVER_TICK_RATE) / 1000
    );
    return Math.max(1, ticks);
  }

  private spawnRaptorPack(state: GameRoomState): void {
    const packSize = Math.max(1, GAME_CONFIG.raptorPackSize);
    const anchor = this.findRandomSpawnAnchor(state);

    if (!anchor) {
      return;
    }

    const spawnPoints = this.findClusterSpawnPoints(state, anchor, packSize);
    if (spawnPoints.length === 0) {
      return;
    }

    const usedUnitIds = new Set(state.units.map((unit) => unit.id));

    for (const spawnPoint of spawnPoints) {
      const raptor = UnitFactory.createUnit(
        RaptorPackSpawnSystem.WILDLIFE_PLAYER_ID,
        UnitType.Raptor,
        spawnPoint.x,
        spawnPoint.y,
        usedUnitIds
      );

      raptor.behaviorState = UnitBehaviorState.Wandering;
      raptor.targetX = anchor.x;
      raptor.targetY = anchor.y;
      state.units.push(raptor);
    }
  }

  private findRandomSpawnAnchor(state: GameRoomState): SpawnPoint | null {
    if (state.tiles.length === 0) {
      return null;
    }

    for (let attempt = 0; attempt < RaptorPackSpawnSystem.MAX_ANCHOR_ATTEMPTS; attempt += 1) {
      const randomTileIndex = Math.floor(Math.random() * state.tiles.length);
      const tile = state.tiles[randomTileIndex];
      if (!tile) {
        continue;
      }

      if (tile.type !== TileType.Floor && tile.type !== TileType.Bridge) {
        continue;
      }

      const centerX = tile.x + 0.5;
      const centerY = tile.y + 0.5;

      if (this.canSpawnRaptorAt(state, centerX, centerY)) {
        return { x: centerX, y: centerY };
      }
    }

    return null;
  }

  private findClusterSpawnPoints(
    state: GameRoomState,
    anchor: SpawnPoint,
    desiredCount: number
  ): SpawnPoint[] {
    const anchorTileX = Math.floor(anchor.x);
    const anchorTileY = Math.floor(anchor.y);
    const points: SpawnPoint[] = [];
    const usedTiles = new Set<string>();

    for (const offset of RaptorPackSpawnSystem.CLUSTER_OFFSETS) {
      if (points.length >= desiredCount) {
        return points;
      }

      const candidateX = anchorTileX + offset.x + 0.5;
      const candidateY = anchorTileY + offset.y + 0.5;
      const tileKey = `${Math.floor(candidateX)},${Math.floor(candidateY)}`;

      if (usedTiles.has(tileKey)) {
        continue;
      }

      if (!this.canSpawnRaptorAt(state, candidateX, candidateY)) {
        continue;
      }

      usedTiles.add(tileKey);
      points.push({ x: candidateX, y: candidateY });
    }

    for (let radius = 1; radius <= RaptorPackSpawnSystem.CLUSTER_SEARCH_RADIUS; radius += 1) {
      for (let x = anchorTileX - radius; x <= anchorTileX + radius; x += 1) {
        for (let y = anchorTileY - radius; y <= anchorTileY + radius; y += 1) {
          if (Math.abs(x - anchorTileX) !== radius && Math.abs(y - anchorTileY) !== radius) {
            continue;
          }

          if (points.length >= desiredCount) {
            return points;
          }

          const tileKey = `${x},${y}`;
          if (usedTiles.has(tileKey)) {
            continue;
          }

          const centerX = x + 0.5;
          const centerY = y + 0.5;

          if (!this.canSpawnRaptorAt(state, centerX, centerY)) {
            continue;
          }

          usedTiles.add(tileKey);
          points.push({ x: centerX, y: centerY });
        }
      }
    }

    return points;
  }

  private canSpawnRaptorAt(state: GameRoomState, x: number, y: number): boolean {
    const unitRadius = getUnitCollision(UnitType.Raptor).radius ?? 0.15;
    const walkability = MovementSystem.isPositionWalkable(state, x, y, { unitRadius });
    return walkability.isWalkable;
  }
}
