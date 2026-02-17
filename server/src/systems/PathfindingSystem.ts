/**
 * Pathfinding System with A* Algorithm
 *
 * Responsibilities:
 * - Find optimal paths between two points on the map
 * - Navigate around obstacles (water, buildings)
 * - Support 8-directional movement (cardinal + diagonal)
 * - Cache paths to avoid recalculation
 * - Deterministic pathfinding for replay systems
 *
 * Algorithm:
 * - A* pathfinding with Manhattan distance heuristic
 * - Diagonal movement costs sqrt(2) ≈ 1.414
 * - Cardinal movement costs 1.0
 * - Water tiles are not walkable
 * - Buildings block movement
 *
 * Performance:
 * - Path caching reduces redundant calculations
 * - Early termination when target is unreachable
 * - Configurable max search iterations to prevent hangs
 * - Spatial grid for efficient neighbor lookups
 *
 * Usage:
 * ```typescript
 * const path = PathfindingSystem.findPath(state, fromX, fromY, toX, toY);
 * if (path) {
 *   const nextStep = path[0]; // First step in path
 * }
 * ```
 */

import { GameRoomState } from "../schema";
import { MovementSystem } from "./MovementSystem";
import { UnitSchema } from "../schema/UnitSchema";

/**
 * A single node in the pathfinding graph
 */
interface PathNode {
  x: number;
  y: number;
  g: number; // Cost from start to this node
  h: number; // Heuristic cost to target
  f: number; // Total cost (g + h)
  parent: PathNode | null;
}

/**
 * Path result - array of positions from start to end
 */
export interface PathResult {
  x: number;
  y: number;
}

/**
 * Pathfinding configuration
 */
const PATHFINDING_CONFIG = {
  maxIterations: 1000, // Max nodes to explore before giving up
  diagonalCost: 1.414, // sqrt(2)
  cardinalCost: 1.0,
  cacheEnabled: true,
  cacheMaxSize: 500,
  cacheTTLTicks: 60, // Cache paths for 60 ticks (1 second at 60 fps)
};

/**
 * Cache entry for pathfinding results
 */
interface CacheEntry {
  path: PathResult[] | null;
  createdTick: number;
}

export class PathfindingSystem {
  private static pathCache = new Map<string, CacheEntry>();
  private static currentTick = 0;

  /**
   * Find a path from start to target using A* algorithm
   * Considers unit size for collision detection
   * 
   * @param state - Current game room state
   * @param startX - Starting X coordinate
   * @param startY - Starting Y coordinate
   * @param targetX - Target X coordinate
   * @param targetY - Target Y coordinate
   * @param unitRadius - Radius of the unit (for collision detection)
   * @param useCache - Whether to use path caching (default: true)
   * @returns Array of path steps from start to target, or null if no path exists
   */
  static findPath(
    state: GameRoomState,
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    unitRadius: number = 0.3,
    useCache: boolean = true
  ): PathResult[] | null {
    // Convert to tile coordinates
    const startTileX = Math.floor(startX);
    const startTileY = Math.floor(startY);
    const targetTileX = Math.floor(targetX);
    const targetTileY = Math.floor(targetY);

    // Check if already at target
    if (startTileX === targetTileX && startTileY === targetTileY) {
      return null;
    }

    // Check if target is walkable
    const targetWalkable = MovementSystem.isPositionWalkable(
      state,
      targetTileX,
      targetTileY,
      { unitRadius }
    );
    if (!targetWalkable.isWalkable) {
      // Target is not walkable - try to find closest walkable tile near target
      const closestWalkable = this.findClosestWalkableTile(state, targetTileX, targetTileY, 3, unitRadius);
      if (!closestWalkable) {
        return null; // No walkable tile near target
      }
      // Update target to closest walkable tile - recursively call findPath
      return this.findPath(state, startX, startY, closestWalkable.x, closestWalkable.y, unitRadius, useCache);
    }

    // Check cache
    if (useCache && PATHFINDING_CONFIG.cacheEnabled) {
      const cacheKey = this.getCacheKey(startTileX, startTileY, targetTileX, targetTileY, unitRadius);
      const cached = this.pathCache.get(cacheKey);
      
      if (cached && (this.currentTick - cached.createdTick) < PATHFINDING_CONFIG.cacheTTLTicks) {
        return cached.path ? [...cached.path] : null; // Return copy
      }
    }

    // Run A* pathfinding
    const path = this.astar(state, startTileX, startTileY, targetTileX, targetTileY, unitRadius);

    // Cache result
    if (useCache && PATHFINDING_CONFIG.cacheEnabled) {
      this.cachePathResult(startTileX, startTileY, targetTileX, targetTileY, unitRadius, path);
    }

    return path;
  }

  /**
   * Get the next step towards target
   * Convenience method that returns only the first step of the path
   * 
   * @param unitRadius - Radius of the unit (for collision detection)
   * @returns Next step towards target, or null if no path exists
   */
  static getNextStep(
    state: GameRoomState,
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    unitRadius: number = 0.3
  ): PathResult | null {
    const path = this.findPath(state, startX, startY, targetX, targetY, unitRadius);
    return path && path.length > 0 ? path[0] : null;
  }

  /**
   * Get the next step towards target for a specific unit
   * Convenience method that extracts unit radius automatically
   * 
   * @param state - Current game room state
   * @param unit - The unit to pathfind for
   * @param targetX - Target X coordinate
   * @param targetY - Target Y coordinate
   * @returns Next step towards target, or null if no path exists
   */
  static getNextStepForUnit(
    state: GameRoomState,
    unit: UnitSchema,
    targetX: number,
    targetY: number
  ): PathResult | null {
    return this.getNextStep(state, unit.x, unit.y, targetX, targetY, unit.radius);
  }

  /**
   * A* pathfinding implementation
   * 
   * @param state - Current game room state
   * @param startX - Starting X tile coordinate
   * @param startY - Starting Y tile coordinate
   * @param targetX - Target X tile coordinate
   * @param targetY - Target Y tile coordinate
   * @param unitRadius - Radius of the unit (for collision detection)
   * @returns Array of path steps, or null if no path exists
   */
  private static astar(
    state: GameRoomState,
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    unitRadius: number
  ): PathResult[] | null {
    const openSet: PathNode[] = [];
    const closedSet = new Set<string>();

    // Create start node
    const startNode: PathNode = {
      x: startX,
      y: startY,
      g: 0,
      h: this.heuristic(startX, startY, targetX, targetY),
      f: 0,
      parent: null,
    };
    startNode.f = startNode.g + startNode.h;

    openSet.push(startNode);

    let iterations = 0;

    while (openSet.length > 0 && iterations < PATHFINDING_CONFIG.maxIterations) {
      iterations++;

      // Get node with lowest f score
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;

      // Check if reached target
      if (current.x === targetX && current.y === targetY) {
        return this.reconstructPath(current);
      }

      // Add to closed set
      const currentKey = this.getNodeKey(current.x, current.y);
      closedSet.add(currentKey);

      // Get walkable neighbors
      const neighbors = MovementSystem.getWalkableNeighbors(state, current.x, current.y, unitRadius);

      for (const neighbor of neighbors) {
        const neighborKey = this.getNodeKey(neighbor.x, neighbor.y);

        // Skip if already evaluated
        if (closedSet.has(neighborKey)) {
          continue;
        }

        // Calculate cost to neighbor
        const isDiagonal = Math.abs(neighbor.x - current.x) === 1 && Math.abs(neighbor.y - current.y) === 1;
        const moveCost = isDiagonal ? PATHFINDING_CONFIG.diagonalCost : PATHFINDING_CONFIG.cardinalCost;
        const gScore = current.g + moveCost;

        // Check if neighbor is in open set
        const existingNode = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);

        if (!existingNode) {
          // Add new node to open set
          const newNode: PathNode = {
            x: neighbor.x,
            y: neighbor.y,
            g: gScore,
            h: this.heuristic(neighbor.x, neighbor.y, targetX, targetY),
            f: 0,
            parent: current,
          };
          newNode.f = newNode.g + newNode.h;
          openSet.push(newNode);
        } else if (gScore < existingNode.g) {
          // Found better path to existing node
          existingNode.g = gScore;
          existingNode.f = existingNode.g + existingNode.h;
          existingNode.parent = current;
        }
      }
    }

    // No path found
    return null;
  }

  /**
   * Reconstruct path from target node back to start
   * 
   * @param node - Target node
   * @returns Array of path steps from start to target (excluding start)
   */
  private static reconstructPath(node: PathNode): PathResult[] {
    const path: PathResult[] = [];
    let current: PathNode | null = node;

    while (current && current.parent) {
      path.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }

    return path;
  }

  /**
   * Calculate heuristic distance (Manhattan distance)
   * 
   * @param x1 - Start X
   * @param y1 - Start Y
   * @param x2 - Target X
   * @param y2 - Target Y
   * @returns Heuristic cost
   */
  private static heuristic(x1: number, y1: number, x2: number, y2: number): number {
    // Manhattan distance
    return Math.abs(x2 - x1) + Math.abs(y2 - y1);
  }

  /**
   * Get unique key for a node position
   */
  private static getNodeKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  /**
   * Get cache key for a path query
   * Includes unit radius for size-specific caching
   */
  private static getCacheKey(
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    unitRadius: number
  ): string {
    return `${startX},${startY}->${targetX},${targetY}@${unitRadius.toFixed(2)}`;
  }

  /**
   * Cache a pathfinding result
   * Stores path with current tick for expiration
   */
  private static cachePathResult(
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    unitRadius: number,
    path: PathResult[] | null
  ): void {
    const key = this.getCacheKey(startX, startY, targetX, targetY, unitRadius);
    
    this.pathCache.set(key, {
      path: path ? [...path] : null,
      createdTick: this.currentTick,
    });

    // Evict old entries if cache too large
    if (this.pathCache.size > PATHFINDING_CONFIG.cacheMaxSize) {
      const iterator = this.pathCache.keys();
      const oldestKey = iterator.next().value;
      if (oldestKey !== undefined) {
        this.pathCache.delete(oldestKey);
      }
    }
  }

  /**
   * Find closest walkable tile near a target position
   * Used when target itself is not walkable
   * 
   * @param state - Current game room state
   * @param targetX - Target X coordinate
   * @param targetY - Target Y coordinate
   * @param unitRadius - Radius of the unit (for collision detection)
   * @returns Closest walkable tile, or null if none found
   */
  private static findClosestWalkableTile(
    state: GameRoomState,
    targetX: number,
    targetY: number,
    maxRadius: number,
    unitRadius: number
  ): PathResult | null {
    // Search in expanding radius
    for (let radius = 1; radius <= maxRadius; radius++) {
      // Check tiles at this radius
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          // Only check tiles at exactly this radius (perimeter)
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) {
            continue;
          }

          const checkX = targetX + dx;
          const checkY = targetY + dy;

          const walkable = MovementSystem.isPositionWalkable(state, checkX, checkY, { unitRadius });
          if (walkable.isWalkable) {
            return { x: checkX, y: checkY };
          }
        }
      }
    }

    return null;
  }

  /**
   * Update current tick (for cache expiration)
   * Should be called once per game tick
   */
  static tick(): void {
    this.currentTick++;
  }

  /**
   * Clear the path cache
   * Useful when map changes (e.g., buildings placed/destroyed)
   */
  static clearCache(): void {
    this.pathCache.clear();
  }

  /**
   * Get cache statistics (for debugging)
   */
  static getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.pathCache.size,
      maxSize: PATHFINDING_CONFIG.cacheMaxSize,
      hitRate: 0, // TODO: Track hit rate if needed
    };
  }
}
