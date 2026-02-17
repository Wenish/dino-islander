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
    // Bounds check (convert to tile coordinates)
    const tileX = Math.floor(x);
    const tileY = Math.floor(y);
    
    if (tileX < 0 || tileX >= state.width || tileY < 0 || tileY >= state.height) {
      return {
        isWalkable: false,
        blocked: true,
        blockReason: "Out of bounds",
      };
    }

    // Find tile at position
    const tileIndex = this.getTileIndex(state);
    const tile = tileIndex.get(this.getTileKey(tileX, tileY));
    if (!tile) {
      return {
        isWalkable: false,
        blocked: true,
        blockReason: "Tile not found",
      };
    }

    // Check tile type - only Floor and Bridge are walkable
    // Water tiles (TileType.Water = 0) are explicitly NOT walkable
    const isWalkableTile = (tile.type === TileType.Floor || tile.type === TileType.Bridge);
    
    if (!isWalkableTile) {
      return {
        isWalkable: false,
        blocked: true,
        blockReason: `Tile type ${tile.type} not walkable`,
      };
    }

    // Check for blocking objects using collision detection
    // If unit size is provided, check if unit can fit at position
    // Otherwise, use legacy tile-based check
    if (options.unitRadius !== undefined && options.unitRadius > 0) {
      // New collision-based check
      for (const building of state.buildings) {
        // Skip the unit itself if checking its own position
        if (options.ignoreUnitId && building.id === options.ignoreUnitId) {
          continue;
        }

        // Check if unit would collide with this building
        if (checkUnitCollision(x, y, options.unitRadius, building)) {
          return {
            isWalkable: false,
            blocked: true,
            blockReason: `Collides with building at (${building.x}, ${building.y})`,
          };
        }
      }
    } else {
      // Legacy tile-based check (for backward compatibility)
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
      const metadata = this.isPositionWalkable(state, nx, ny, { unitRadius });
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
