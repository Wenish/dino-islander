import { ICommand } from "./ICommand";
import { GameRoomState, GamePhase } from "../../schema";
import { UnitType } from "../../schema/UnitSchema";
import { UnitFactory } from "../../factories/unitFactory";
import { GAME_CONFIG } from "../../config/gameConfig";
import { MovementSystem } from "../MovementSystem";
import { getUnitCollision } from "../../config/collisionConfig";

export class RequestSpawnRaptorCommand implements ICommand {
  private static readonly SEARCH_MAX_DISTANCE_TILES = 25;
  private static readonly NEIGHBOR_DIRECTIONS = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  constructor(
    private readonly state: GameRoomState,
    private readonly playerId: string,
    private readonly x: number,
    private readonly y: number
  ) {}

  execute(): boolean {
    if (this.state.gamePhase !== GamePhase.InGame) {
      return false;
    }

    const player = this.state.players.find((p) => p.id === this.playerId);
    if (!player) {
      return false;
    }

    if (!Number.isFinite(this.x) || !Number.isFinite(this.y)) {
      return false;
    }

    const currentPhaseTimeMs = this.state.timePastInThePhase;
    const phaseTimeWentBackwards = currentPhaseTimeMs < player.lastRaptorSpawnTimeInPhaseMs;
    if (phaseTimeWentBackwards) {
      player.lastRaptorSpawnTimeInPhaseMs = -GAME_CONFIG.raptorPlayerSpawnCooldownMs;
    }

    const elapsedSinceLastRaptorSpawnMs =
      currentPhaseTimeMs - player.lastRaptorSpawnTimeInPhaseMs;
    const isRaptorSpawnOnCooldown =
      elapsedSinceLastRaptorSpawnMs < GAME_CONFIG.raptorPlayerSpawnCooldownMs;

    if (isRaptorSpawnOnCooldown) {
      return false;
    }

    const spawnPosition = this.findNearestWalkableRaptorSpawnPosition(this.x, this.y);
    if (!spawnPosition) {
      return false;
    }

    const usedUnitIds = new Set(this.state.units.map((existingUnit) => existingUnit.id));
    const raptor = UnitFactory.createUnit(
      this.playerId,
      UnitType.Raptor,
      spawnPosition.x,
      spawnPosition.y,
      usedUnitIds
    );

    this.state.units.push(raptor);
    player.lastRaptorSpawnTimeInPhaseMs = currentPhaseTimeMs;
    return true;
  }

  private findNearestWalkableRaptorSpawnPosition(
    x: number,
    y: number
  ): { x: number; y: number } | null {
    if (this.state.width <= 0 || this.state.height <= 0) {
      return null;
    }

    const startTileX = Math.max(0, Math.min(this.state.width - 1, Math.floor(x)));
    const startTileY = Math.max(0, Math.min(this.state.height - 1, Math.floor(y)));
    const unitRadius = getUnitCollision(UnitType.Raptor).radius ?? 0.15;

    const queue: Array<{ x: number; y: number; dist: number }> = [
      { x: startTileX, y: startTileY, dist: 0 },
    ];
    const visited = new Set<string>([`${startTileX},${startTileY}`]);

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }

      if (this.canRaptorSpawnAndMoveAtTile(current.x, current.y, unitRadius)) {
        return { x: current.x + 0.5, y: current.y + 0.5 };
      }

      if (current.dist >= RequestSpawnRaptorCommand.SEARCH_MAX_DISTANCE_TILES) {
        continue;
      }

      for (const direction of RequestSpawnRaptorCommand.NEIGHBOR_DIRECTIONS) {
        const nextX = current.x + direction.dx;
        const nextY = current.y + direction.dy;

        if (nextX < 0 || nextX >= this.state.width || nextY < 0 || nextY >= this.state.height) {
          continue;
        }

        const key = `${nextX},${nextY}`;
        if (visited.has(key)) {
          continue;
        }

        visited.add(key);
        queue.push({ x: nextX, y: nextY, dist: current.dist + 1 });
      }
    }

    return null;
  }

  private canRaptorSpawnAndMoveAtTile(tileX: number, tileY: number, unitRadius: number): boolean {
    const centerX = tileX + 0.5;
    const centerY = tileY + 0.5;
    const walkability = MovementSystem.isPositionWalkable(this.state, centerX, centerY, {
      unitRadius,
    });

    if (!walkability.isWalkable) {
      return false;
    }

    const walkableNeighbors = MovementSystem.getWalkableNeighbors(
      this.state,
      centerX,
      centerY,
      unitRadius
    );
    return walkableNeighbors.length > 0;
  }
}