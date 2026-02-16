/**
 * Movement System
 *
 * Responsibilities:
 * - Validate if a position is walkable (tile-based)
 * - Check for obstacles (castles, trees, rocks, etc.)
 * - Units DO NOT collide with each other
 * - Only floor and bridge tiles are walkable
 * - Water is NOT walkable
 * 
 * Performance notes:
 * - Uses spatial lookup via state arrays (O(n) currently, could be optimized with spatial grid)
 * - Validates walkability before movement
 * - Deterministic: same input always produces same output
 */

import { GameRoomState } from "../schema";
import { TileType } from "../schema/TileSchema";

/**
 * Represents movement metadata
 */
export interface MovementMetadata {
  isWalkable: boolean;
  blocked: boolean;
  blockReason?: string;
}

export class MovementSystem {
  /**
   * Check if a position is walkable
   * Position must have a floor or bridge tile and no blocking objects
   * 
   * @param state - Current game room state
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Movement metadata
   */
  static isPositionWalkable(
    state: GameRoomState,
    x: number,
    y: number
  ): MovementMetadata {
    // Bounds check
    if (x < 0 || x >= state.width || y < 0 || y >= state.height) {
      return {
        isWalkable: false,
        blocked: true,
        blockReason: "Out of bounds",
      };
    }

    // Find tile at position
    const tile = state.tiles.find((t) => t.x === x && t.y === y);
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
    // Castles block movement
    const castle = state.castles.find((c) => c.x === x && c.y === y);
    if (castle) {
      return {
        isWalkable: false,
        blocked: true,
        blockReason: "Castle blocking",
      };
    }

    // Units DO NOT block each other (as per requirements)
    return {
      isWalkable: true,
      blocked: false,
    };
  }

  /**
   * Get walkable neighbors for a position (4-directional: up, down, left, right)
   * Used for pathfinding and random wandering
   * 
   * @param state - Current game room state
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Array of walkable neighbor positions
   */
  static getWalkableNeighbors(
    state: GameRoomState,
    x: number,
    y: number
  ): Array<{ x: number; y: number }> {
    const neighbors: Array<{ x: number; y: number }> = [];
    const directions = [
      { dx: 0, dy: -1 }, // Up
      { dx: 0, dy: 1 },  // Down
      { dx: -1, dy: 0 }, // Left
      { dx: 1, dy: 0 },  // Right
    ];

    for (const dir of directions) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      const metadata = this.isPositionWalkable(state, nx, ny);
      if (metadata.isWalkable) {
        neighbors.push({ x: nx, y: ny });
      }
    }

    return neighbors;
  }

  /**
   * Check if movement from one position to another is valid
   * 
   * @param state - Current game room state
   * @param fromX - Starting X
   * @param fromY - Starting Y
   * @param toX - Target X
   * @param toY - Target Y
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

    // Check if it's an adjacent tile (4-directional movement only)
    const dx = Math.abs(toX - fromX);
    const dy = Math.abs(toY - fromY);
    if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
      return true;
    }

    return false;
  }

  /**
   * Calculate the next step towards a target position
   * Uses simple greedy pathfinding (A* could be added later for optimization)
   * Currently assumes next tile towards target
   * 
   * @param state - Current game room state
   * @param fromX - Starting X
   * @param fromY - Starting Y
   * @param targetX - Target X
   * @param targetY - Target Y
   * @returns Next position or null if no valid move exists
   */
  static getNextStepTowards(
    state: GameRoomState,
    fromX: number,
    fromY: number,
    targetX: number,
    targetY: number
  ): { x: number; y: number } | null {
    // Simple greedy approach: move towards target
    let nextX = fromX;
    let nextY = fromY;

    // Try to move horizontally first
    if (fromX < targetX) {
      nextX = fromX + 1;
    } else if (fromX > targetX) {
      nextX = fromX - 1;
    }
    // Try to move vertically if X is aligned
    else if (fromY < targetY) {
      nextY = fromY + 1;
    } else if (fromY > targetY) {
      nextY = fromY - 1;
    }

    // Check if this movement is valid
    if (this.canMoveTo(state, fromX, fromY, nextX, nextY)) {
      return { x: nextX, y: nextY };
    }

    // If horizontal move failed, try vertical
    if (nextX !== fromX) {
      nextX = fromX;
      if (fromY < targetY) {
        nextY = fromY + 1;
      } else if (fromY > targetY) {
        nextY = fromY - 1;
      }
      if (
        nextY !== fromY &&
        this.canMoveTo(state, fromX, fromY, nextX, nextY)
      ) {
        return { x: nextX, y: nextY };
      }
    }

    // No valid move found
    return null;
  }
}
