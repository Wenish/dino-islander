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

/**
 * Represents movement metadata for a position
 */
export interface MovementMetadata {
  isWalkable: boolean;
  blocked: boolean;
  blockReason?: string;
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
    // Diagonal directions (explored if cardinal blocked)
    { dx: -1, dy: -1, isDiagonal: true }, // Up-Left
    { dx: 1, dy: -1, isDiagonal: true },  // Up-Right
    { dx: -1, dy: 1, isDiagonal: true },  // Down-Left
    { dx: 1, dy: 1, isDiagonal: true },   // Down-Right
  ];

  /**
   * Check if a position is walkable
   * Position must have a floor or bridge tile and no blocking objects
   * Supports floating-point coordinates by checking the tile at that position
   * 
   * @param state - Current game room state
   * @param x - X coordinate (can be float, will be floored for tile lookup)
   * @param y - Y coordinate (can be float, will be floored for tile lookup)
   * @returns Movement metadata indicating walkability and reason if blocked
   */
  static isPositionWalkable(
    state: GameRoomState,
    x: number,
    y: number
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
    const tile = state.tiles.find((t) => t.x === tileX && t.y === tileY);
    if (!tile) {
      return {
        isWalkable: false,
        blocked: true,
        blockReason: "Tile not found",
      };
    }

    // Check tile type - only Floor and Bridge are walkable
    if (tile.type !== TileType.Floor && tile.type !== TileType.Bridge) {
      return {
        isWalkable: false,
        blocked: true,
        blockReason: `Tile type not walkable: ${TileType[tile.type]}`,
      };
    }

    // Check for blocking objects (castles, etc.)
    // Castles occupy a tile and block movement
    const castle = state.castles.find((c) => c.x === tileX && c.y === tileY);
    if (castle) {
      return {
        isWalkable: false,
        blocked: true,
        blockReason: "Castle blocking",
      };
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
   * @returns Array of walkable neighbor positions
   */
  static getWalkableNeighbors(
    state: GameRoomState,
    x: number,
    y: number
  ): Array<{ x: number; y: number }> {
    const tileX = Math.floor(x);
    const tileY = Math.floor(y);
    
    const neighbors: Array<{ x: number; y: number }> = [];

    for (const dir of this.DIRECTIONS) {
      const nx = tileX + dir.dx;
      const ny = tileY + dir.dy;
      const metadata = this.isPositionWalkable(state, nx, ny);
      if (metadata.isWalkable) {
        neighbors.push({ x: nx, y: ny });
      }
    }

    return neighbors;
  }

  /**
   * Calculate the next step towards a target position
   * Uses greedy weighted pathfinding with diagonal movement support:
   * - Prioritizes moving diagonally when both X and Y need adjustment
   * - Falls back to cardinal moves if diagonal is blocked
   * - Handles floating-point coordinates
   * 
   * This is NOT full A*, but a fast greedy heuristic suitable for real-time AI.
   * 
   * Algorithm:
   * 1. If both dx and dy non-zero, try diagonal
   * 2. If diagonal blocked, try horizontal OR vertical
   * 3. Return first valid move found, or null if stuck
   * 
   * @param state - Current game room state
   * @param fromX - Starting X (can be float)
   * @param fromY - Starting Y (can be float)
   * @param targetX - Target X (will be floored for tile lookup)
   * @param targetY - Target Y (will be floored for tile lookup)
   * @returns Next step towards target, or null if no valid path exists
   */
  static getNextStepTowards(
    state: GameRoomState,
    fromX: number,
    fromY: number,
    targetX: number,
    targetY: number
  ): PathStep | null {
    const startTileX = Math.floor(fromX);
    const startTileY = Math.floor(fromY);
    const targetTileX = Math.floor(targetX);
    const targetTileY = Math.floor(targetY);

    // Already at target tile
    if (startTileX === targetTileX && startTileY === targetTileY) {
      return null;
    }

    // Calculate direction vectors
    const dx = targetTileX - startTileX;
    const dy = targetTileY - startTileY;

    // Normalize to movement direction
    const moveX = dx !== 0 ? Math.sign(dx) : 0;
    const moveY = dy !== 0 ? Math.sign(dy) : 0;

    // Try moves in order of priority
    const moves: Array<{ x: number; y: number }> = [];

    // Priority 1: Try diagonal if both axes differ
    if (moveX !== 0 && moveY !== 0) {
      moves.push({ x: startTileX + moveX, y: startTileY + moveY });
    }

    // Priority 2: Try cardinal directions
    if (moveX !== 0) {
      moves.push({ x: startTileX + moveX, y: startTileY });
    }
    if (moveY !== 0) {
      moves.push({ x: startTileX, y: startTileY + moveY });
    }

    // Find first valid move
    for (const move of moves) {
      if (this.isPositionWalkable(state, move.x, move.y).isWalkable) {
        return { x: move.x, y: move.y };
      }
    }

    // No valid move found
    return null;
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
