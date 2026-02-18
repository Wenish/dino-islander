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
 * - A* pathfinding with octile distance heuristic (admissible for 8-directional movement)
 * - Diagonal movement costs sqrt(2) ≈ 1.4142
 * - Cardinal movement costs 1.0
 * - Water tiles are not walkable
 * - Buildings block movement
 *
 * Heuristic:
 * - Octile distance: h = (dx + dy) + (√2 − 2) × min(dx, dy)
 * - Admissible: never overestimates actual cost → guarantees shortest path
 * - Tighter than Manhattan (which overestimates diagonal movement by 41%)
 *
 * Performance:
 * - Path caching reduces redundant calculations
 * - Numeric node keys (instead of strings) avoid string allocation per expansion
 * - Lazy-deletion open set avoids expensive decrease-key operations
 * - Early termination when target is unreachable
 * - Configurable max search iterations to prevent hangs
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

class MinHeap<T> {
  private items: T[] = [];
  private readonly compare: (a: T, b: T) => number;

  constructor(compare: (a: T, b: T) => number) {
    this.compare = compare;
  }

  size(): number {
    return this.items.length;
  }

  push(item: T): void {
    this.items.push(item);
    this.bubbleUp(this.items.length - 1);
  }

  pop(): T | undefined {
    if (this.items.length === 0) {
      return undefined;
    }

    const root = this.items[0];
    const last = this.items.pop();
    if (last && this.items.length > 0) {
      this.items[0] = last;
      this.bubbleDown(0);
    }

    return root;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.compare(this.items[index], this.items[parentIndex]) >= 0) {
        break;
      }
      this.swap(index, parentIndex);
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    const length = this.items.length;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;

      if (left < length && this.compare(this.items[left], this.items[smallest]) < 0) {
        smallest = left;
      }

      if (right < length && this.compare(this.items[right], this.items[smallest]) < 0) {
        smallest = right;
      }

      if (smallest === index) {
        break;
      }

      this.swap(index, smallest);
      index = smallest;
    }
  }

  private swap(i: number, j: number): void {
    const temp = this.items[i];
    this.items[i] = this.items[j];
    this.items[j] = temp;
  }
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
  maxIterations: 2000, // Max nodes to explore before giving up
  diagonalCost: Math.SQRT2, // sqrt(2) — exact value, not the 1.414 approximation
  cardinalCost: 1.0,
  // Precomputed octile heuristic weight: (√2 − 2), always negative
  // h = (dx + dy) + DIAGONAL_HEURISTIC_WEIGHT * min(dx, dy)
  diagonalHeuristicWeight: Math.SQRT2 - 2,
  cacheEnabled: true,
  cacheMaxSize: 500,
  cacheTTLTicks: 60, // Cache paths for 60 ticks (1 second at 60 fps)
};

/**
 * Max map dimension used for numeric node-key encoding.
 * Encode: key = x * MAX_MAP_DIM + y
 * Supports maps up to 4096 × 4096 tiles — well beyond any expected size.
 */
const MAX_MAP_DIM = 4096;

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

    // Check if target is walkable (use tile center for consistency with getWalkableNeighbors)
    const targetWalkable = MovementSystem.isPositionWalkable(
      state,
      targetTileX + 0.5,
      targetTileY + 0.5,
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
   * Uses octile distance as the heuristic — admissible for 8-directional movement.
   * Node lookup uses numeric keys (x * MAX_MAP_DIM + y) instead of strings to
   * avoid per-expansion string allocation and GC pressure.
   * Open set uses lazy deletion: stale entries are skipped on pop rather than
   * removed, avoiding costly decrease-key operations.
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
    const openSet = new MinHeap<PathNode>((a, b) => a.f - b.f);
    const closedSet = new Set<number>();
    const bestGScore = new Map<number, number>();

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
    bestGScore.set(this.nodeKey(startX, startY), 0);

    let iterations = 0;

    while (openSet.size() > 0 && iterations < PATHFINDING_CONFIG.maxIterations) {
      iterations++;

      // Get node with lowest f score
      const current = openSet.pop()!;
      const currentKey = this.nodeKey(current.x, current.y);

      // Lazy deletion: skip if a better path to this node was already found
      const bestG = bestGScore.get(currentKey);
      if (bestG === undefined || current.g !== bestG) {
        continue;
      }

      // Check if reached target
      if (current.x === targetX && current.y === targetY) {
        return this.reconstructPath(current);
      }

      // Mark as expanded
      closedSet.add(currentKey);

      // Get walkable neighbors
      const neighbors = MovementSystem.getWalkableNeighbors(state, current.x, current.y, unitRadius);

      for (const neighbor of neighbors) {
        const neighborKey = this.nodeKey(neighbor.x, neighbor.y);

        // Skip already-expanded nodes
        if (closedSet.has(neighborKey)) {
          continue;
        }

        // Calculate edge cost
        const isDiagonal =
          Math.abs(neighbor.x - current.x) === 1 &&
          Math.abs(neighbor.y - current.y) === 1;
        const moveCost = isDiagonal
          ? PATHFINDING_CONFIG.diagonalCost
          : PATHFINDING_CONFIG.cardinalCost;
        const gScore = current.g + moveCost;

        const existingBest = bestGScore.get(neighborKey);

        if (existingBest === undefined || gScore < existingBest) {
          const h = this.heuristic(neighbor.x, neighbor.y, targetX, targetY);
          const newNode: PathNode = {
            x: neighbor.x,
            y: neighbor.y,
            g: gScore,
            h,
            f: gScore + h,
            parent: current,
          };
          bestGScore.set(neighborKey, gScore);
          openSet.push(newNode);
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
   * Octile distance heuristic — admissible for 8-directional movement.
   *
   * For movement with cardinal cost D=1 and diagonal cost D2=√2:
   *   h = D*(dx+dy) + (D2-2*D)*min(dx,dy)
   *     = (dx+dy) + (√2-2)*min(dx,dy)
   *
   * This is always ≤ the actual path cost, so A* finds the optimal path.
   * Manhattan distance (the previous heuristic) overestimates diagonal moves
   * by up to 41%, making A* inadmissible and less efficient.
   */
  private static heuristic(x1: number, y1: number, x2: number, y2: number): number {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    return (dx + dy) + PATHFINDING_CONFIG.diagonalHeuristicWeight * Math.min(dx, dy);
  }

  /**
   * Encode a tile position as a single number for use as a Map/Set key.
   * Avoids string allocation per node expansion.
   * Encoding: x * MAX_MAP_DIM + y  (supports maps up to 4096 × 4096)
   */
  private static nodeKey(x: number, y: number): number {
    return x * MAX_MAP_DIM + y;
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

          const walkable = MovementSystem.isPositionWalkable(state, checkX + 0.5, checkY + 0.5, { unitRadius });
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
