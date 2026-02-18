/**
 * Movement System
 *
 * Core Responsibilities:
 * - Validate if a position is walkable (tile-based collision)
 * - Check for obstacles (castles, trees, rocks, etc.)
 * - Units DO NOT collide with each other
 * - Only floor and bridge tiles are walkable
 * - Provide centralized pathfinding with 8-directional support (diagonal + cardinal)
 * - Support floating-point coordinates for smooth animation
 * 
 * Architecture:
 * - Static utility functions for stateless queries
 * - Deterministic: same input always produces same output
 * - No caching (cache handled in PathfindingService if needed)
 * - Works with both integer and floating-point coordinates
 *
 * Performance notes:
 * - Tile lookups: O(n) for array search (can be optimized with spatial grid)
 * - Neighbor queries: O(8) fixed iterations
 * - Pathfinding uses greedy A* with diagonal support
 * - Validates walkability before movement
 */

import { GameRoomState } from "../schema";
import { TileType } from "../schema/TileSchema";
import { TileSchema } from "../schema/TileSchema";
import { BuildingSchema } from "../schema/BuildingSchema";
import { checkUnitCollision } from "./CollisionSystem";

/**
 * Represents movement metadata for a position
 */
export interface MovementMetadata {
  isWalkable: boolean;
  blocked: boolean;
  blockReason?: string;
}

/**
 * Options for walkability checks
 */
export interface WalkabilityOptions {
  unitRadius?: number;    // Radius of the unit checking (for collision detection)
  ignoreUnitId?: string;  // Unit ID to ignore (for checking own position)
}

/**
 * Result of a pathfinding query
 */
export interface PathStep {
  x: number; // Next tile X coordinate
  y: number; // Next tile Y coordinate
}

/**
 * Direction vector for 8-directional movement
 */
interface Direction {
  dx: number;
  dy: number;
  isDiagonal: boolean;
}

export class MovementSystem {
  private static tileIndexByState: WeakMap<GameRoomState, Map<string, TileSchema>> = new WeakMap();
  private static buildingIndexByState: WeakMap<
    GameRoomState,
    { index: Map<string, BuildingSchema>; count: number }
  > = new WeakMap();

  /**
   * 8 directions ordered by preference:
   * 1. Cardinal directions (4)
   * 2. Diagonal directions (4)
   */
  private static readonly DIRECTIONS: Direction[] = [
    // Cardinal directions (preferred for initial pathfinding)
    { dx: 0, dy: -1, isDiagonal: false }, // Up
    { dx: 0, dy: 1, isDiagonal: false },  // Down
    { dx: -1, dy: 0, isDiagonal: false }, // Left
    { dx: 1, dy: 0, isDiagonal: false },  // Right
    // Diagonal directions
    { dx: -1, dy: -1, isDiagonal: true }, // Up-Left
    { dx: 1, dy: -1, isDiagonal: true },  // Up-Right
    { dx: -1, dy: 1, isDiagonal: true },  // Down-Left
    { dx: 1, dy: 1, isDiagonal: true },   // Down-Right
  ];

  /**
   * Check if a position is walkable for a unit of given size
   * Position must have a floor or bridge tile and no blocking objects
   * Supports floating-point coordinates by checking the tile at that position
   * 
   * NEW: Now considers unit size and object collision bounds
   * Instead of simple tile occupation, checks if unit can fit at position
   * 
   * @param state - Current game room state
   * @param x - X coordinate (can be float, will be floored for tile lookup)
   * @param y - Y coordinate (can be float, will be floored for tile lookup)
   * @param options - Optional parameters (unit size, ignore ID)
   * @returns Movement metadata indicating walkability and reason if blocked
   */
  static isPositionWalkable(
    state: GameRoomState,
    x: number,
    y: number,
    options: WalkabilityOptions = {}
  ): MovementMetadata {
    const unitRadius = options.unitRadius ?? 0;
    const tileIndex = this.getTileIndex(state);

    // Check every tile within the unit's bounding box for tile-type walkability.
    // A unit with radius > 0 can overlap tiles adjacent to its center tile, so
    // checking only Math.floor(x/y) misses clips into water/non-walkable tiles
    // near tile boundaries. The bounding box [floor(x-r)..floor(x+r)] covers all
    // tiles the unit circle could touch. When radius = 0, min === max === floor(x/y),
    // so this degenerates to the original single-tile check.
    const minTileX = Math.floor(x - unitRadius);
    const maxTileX = Math.floor(x + unitRadius);
    const minTileY = Math.floor(y - unitRadius);
    const maxTileY = Math.floor(y + unitRadius);

    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        if (tx < 0 || tx >= state.width || ty < 0 || ty >= state.height) {
          return {
            isWalkable: false,
            blocked: true,
            blockReason: "Out of bounds",
          };
        }

        const tile = tileIndex.get(this.getTileKey(tx, ty));
        if (!tile || !(tile.type === TileType.Floor || tile.type === TileType.Bridge)) {
          return {
            isWalkable: false,
            blocked: true,
            blockReason: `Tile type not walkable at (${tx},${ty})`,
          };
        }
      }
    }

    // Check for blocking objects using collision detection
    if (unitRadius > 0) {
      // Radius-aware building collision check (circle vs. building shape + safety margin)
      for (const building of state.buildings) {
        if (options.ignoreUnitId && building.id === options.ignoreUnitId) {
          continue;
        }
        if (checkUnitCollision(x, y, unitRadius, building)) {
          return {
            isWalkable: false,
            blocked: true,
            blockReason: `Collides with building at (${building.x}, ${building.y})`,
          };
        }
      }
    } else {
      // Legacy tile-based check (for callers that don't supply a radius)
      const tileX = Math.floor(x);
      const tileY = Math.floor(y);
      const buildingIndex = this.getBuildingIndex(state);
      const building = buildingIndex.get(this.getTileKey(tileX, tileY));
      if (building) {
        return {
          isWalkable: false,
          blocked: true,
          blockReason: "Building blocking",
        };
      }
    }

    // Units DO NOT block each other (as per game requirements)
    return {
      isWalkable: true,
      blocked: false,
    };
  }

  /**
   * Get all walkable neighbors for a position (8-directional: 4 cardinal + 4 diagonal)
   * Used for pathfinding and random wandering
   * 
   * Performance: O(8) fixed iterations
   * 
   * @param state - Current game room state
   * @param x - X coordinate (can be float, will be floored for tile lookup)
   * @param y - Y coordinate (can be float, will be floored for tile lookup)
   * @param unitRadius - Optional unit radius for collision detection
   * @returns Array of walkable neighbor positions
   */
  static getWalkableNeighbors(
    state: GameRoomState,
    x: number,
    y: number,
    unitRadius?: number
  ): Array<{ x: number; y: number }> {
    const tileX = Math.floor(x);
    const tileY = Math.floor(y);
    
    const neighbors: Array<{ x: number; y: number }> = [];

    for (const dir of this.DIRECTIONS) {
      const nx = tileX + dir.dx;
      const ny = tileY + dir.dy;

      // For diagonals, both adjacent cardinal tiles must be walkable
      // to prevent corner-cutting over water/obstacles
      if (dir.isDiagonal) {
        const cardinalA = this.isPositionWalkable(state, tileX + dir.dx + 0.5, tileY + 0.5, { unitRadius });
        const cardinalB = this.isPositionWalkable(state, tileX + 0.5, tileY + dir.dy + 0.5, { unitRadius });
        if (!cardinalA.isWalkable || !cardinalB.isWalkable) {
          continue;
        }
      }

      // Check walkability at tile center (+0.5) so the bounding box check in
      // isPositionWalkable uses the true center of the tile rather than its
      // integer index (which is its left/bottom edge). Without this offset, a
      // unit with radius 0.35 at integer position 5 would also check tile 4
      // (floor(5 - 0.35) = 4), incorrectly marking valid floor tiles as
      // blocked when tile 4 is water.
      const metadata = this.isPositionWalkable(state, nx + 0.5, ny + 0.5, { unitRadius });
      if (metadata.isWalkable) {
        neighbors.push({ x: nx, y: ny });
      }
    }

    return neighbors;
  }

  private static getTileIndex(state: GameRoomState): Map<string, TileSchema> {
    let index = this.tileIndexByState.get(state);
    if (!index) {
      index = new Map<string, TileSchema>();
      for (const tile of state.tiles) {
        index.set(this.getTileKey(tile.x, tile.y), tile);
      }
      this.tileIndexByState.set(state, index);
    }
    return index;
  }

  private static getBuildingIndex(state: GameRoomState): Map<string, BuildingSchema> {
    const cached = this.buildingIndexByState.get(state);
    if (!cached || cached.count !== state.buildings.length) {
      const index = new Map<string, BuildingSchema>();
      for (const building of state.buildings) {
        index.set(this.getTileKey(building.x, building.y), building);
      }
      this.buildingIndexByState.set(state, { index, count: state.buildings.length });
      return index;
    }
    return cached.index;
  }

  private static getTileKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  /**
   * Calculate the next step towards a target position
   * Uses A* pathfinding to navigate around obstacles intelligently
   * 
   * This uses the PathfindingSystem which implements full A* algorithm:
   * - Finds optimal paths around water and obstacles
   * - Supports 8-directional movement (cardinal + diagonal)
   * - Caches paths to avoid recalculation
   * - Returns only the first step for smooth movement
   * - Considers unit size for collision detection
   * 
   * @param state - Current game room state
   * @param fromX - Starting X (can be float)
   * @param fromY - Starting Y (can be float)
   * @param targetX - Target X (will be floored for tile lookup)
   * @param targetY - Target Y (will be floored for tile lookup)
   * @param unitRadius - Optional unit radius for collision detection
   * @returns Next step towards target, or null if no valid path exists
   */
  static getNextStepTowards(
    state: GameRoomState,
    fromX: number,
    fromY: number,
    targetX: number,
    targetY: number,
    unitRadius: number = 0.3
  ): PathStep | null {
    const startTileX = Math.floor(fromX);
    const startTileY = Math.floor(fromY);
    const targetTileX = Math.floor(targetX);
    const targetTileY = Math.floor(targetY);

    // Already at target tile
    if (startTileX === targetTileX && startTileY === targetTileY) {
      return null;
    }

    // Use PathfindingSystem to get next step
    // Import is done at runtime to avoid circular dependency
    const { PathfindingSystem } = require("./PathfindingSystem");
    const nextStep = PathfindingSystem.getNextStep(state, fromX, fromY, targetX, targetY, unitRadius);
    
    return nextStep;
  }

  /**
   * Check if movement from one position to another is valid
   * Validates that destination is walkable and adjacent (8 directions)
   * 
   * @param state - Current game room state
   * @param fromX - Starting X (can be float)
   * @param fromY - Starting Y (can be float)
   * @param toX - Target X (can be float)
   * @param toY - Target Y (can be float)
   * @returns Whether the movement is valid
   */
  static canMoveTo(
    state: GameRoomState,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): boolean {
    // Check if destination is walkable
    const metadata = this.isPositionWalkable(state, toX, toY);
    if (!metadata.isWalkable) {
      return false;
    }

    // Check if it's an adjacent tile (8 directions including diagonals)
    const fromTileX = Math.floor(fromX);
    const fromTileY = Math.floor(fromY);
    const toTileX = Math.floor(toX);
    const toTileY = Math.floor(toY);

    const dx = Math.abs(toTileX - fromTileX);
    const dy = Math.abs(toTileY - fromTileY);

    // Adjacent means max 1 tile away in any direction (including diagonals)
    if (dx <= 1 && dy <= 1 && (dx > 0 || dy > 0)) {
      return true;
    }

    return false;
  }

  /**
   * Check if two positions are adjacent (within 1 tile in any direction)
   * Includes diagonals
   * 
   * @param x1 - First X (can be float)
   * @param y1 - First Y (can be float)
   * @param x2 - Second X (can be float)
   * @param y2 - Second Y (can be float)
   * @returns Whether positions are adjacent
   */
  static isAdjacent(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): boolean {
    const tileX1 = Math.floor(x1);
    const tileY1 = Math.floor(y1);
    const tileX2 = Math.floor(x2);
    const tileY2 = Math.floor(y2);

    const dx = Math.abs(tileX2 - tileX1);
    const dy = Math.abs(tileY2 - tileY1);

    return dx <= 1 && dy <= 1 && (dx > 0 || dy > 0);
  }
}
