import { GameRoomState } from "../../../schema";
import { UnitType } from "../../../schema/UnitSchema";
import { UnitFactory } from "../../../factories/unitFactory";
import { ACTION_CONFIG } from "../../../config/actionConfig";
import { MovementSystem } from "../../MovementSystem";
import { getUnitCollision } from "../../../config/collisionConfig";
import { IPlayerAction, PlayerActionMessage } from "../PlayerActionTypes";

/**
 * RaptorSpawnAction — Spawn Raptor
 *
 * The player spawns a raptor at or near a target coordinate,
 * finding the nearest walkable tile via BFS.
 */
export class RaptorSpawnAction implements IPlayerAction {
  readonly cooldownMs = ACTION_CONFIG.raptorPlayerSpawnCooldownMs;

  private static readonly SEARCH_MAX_DISTANCE_TILES = 25;
  private static readonly NEIGHBOR_DIRECTIONS = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  execute(playerId: string, data: PlayerActionMessage, state: GameRoomState): boolean {
    const { x, y } = data;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;

    const player = state.players.find(p => p.id === playerId);
    if (!player) return false;

    const currentPhaseTimeMs = state.timePastInThePhase;
    const phaseTimeWentBackwards = currentPhaseTimeMs < player.lastRaptorSpawnTimeInPhaseMs;
    if (phaseTimeWentBackwards) {
      player.lastRaptorSpawnTimeInPhaseMs = -ACTION_CONFIG.raptorPlayerSpawnCooldownMs;
    }

    const elapsedSinceLastRaptorSpawnMs = currentPhaseTimeMs - player.lastRaptorSpawnTimeInPhaseMs;
    if (elapsedSinceLastRaptorSpawnMs < ACTION_CONFIG.raptorPlayerSpawnCooldownMs) {
      return false;
    }

    const spawnPosition = this.findNearestWalkableRaptorSpawnPosition(x, y, state);
    if (!spawnPosition) return false;

    const usedUnitIds = new Set(state.units.map(u => u.id));
    const raptor = UnitFactory.createUnit(
      playerId,
      UnitType.Raptor,
      spawnPosition.x,
      spawnPosition.y,
      usedUnitIds
    );

    state.units.push(raptor);
    player.lastRaptorSpawnTimeInPhaseMs = currentPhaseTimeMs;
    return true;
  }

  private findNearestWalkableRaptorSpawnPosition(
    x: number,
    y: number,
    state: GameRoomState
  ): { x: number; y: number } | null {
    if (state.width <= 0 || state.height <= 0) return null;

    const startTileX = Math.max(0, Math.min(state.width - 1, Math.floor(x)));
    const startTileY = Math.max(0, Math.min(state.height - 1, Math.floor(y)));
    const unitRadius = getUnitCollision(UnitType.Raptor).radius ?? 0.15;

    const queue: Array<{ x: number; y: number; dist: number }> = [
      { x: startTileX, y: startTileY, dist: 0 },
    ];
    const visited = new Set<string>([`${startTileX},${startTileY}`]);

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (this.canRaptorSpawnAndMoveAtTile(current.x, current.y, unitRadius, state)) {
        return { x: current.x + 0.5, y: current.y + 0.5 };
      }

      if (current.dist >= RaptorSpawnAction.SEARCH_MAX_DISTANCE_TILES) continue;

      for (const direction of RaptorSpawnAction.NEIGHBOR_DIRECTIONS) {
        const nextX = current.x + direction.dx;
        const nextY = current.y + direction.dy;

        if (nextX < 0 || nextX >= state.width || nextY < 0 || nextY >= state.height) continue;

        const key = `${nextX},${nextY}`;
        if (visited.has(key)) continue;

        visited.add(key);
        queue.push({ x: nextX, y: nextY, dist: current.dist + 1 });
      }
    }

    return null;
  }

  private canRaptorSpawnAndMoveAtTile(
    tileX: number,
    tileY: number,
    unitRadius: number,
    state: GameRoomState
  ): boolean {
    const centerX = tileX + 0.5;
    const centerY = tileY + 0.5;
    const walkability = MovementSystem.isPositionWalkable(state, centerX, centerY, { unitRadius });

    if (!walkability.isWalkable) return false;

    const walkableNeighbors = MovementSystem.getWalkableNeighbors(state, centerX, centerY, unitRadius);
    return walkableNeighbors.length > 0;
  }
}
