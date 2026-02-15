/**
 * SCHEMA TYPE DEFINITIONS - Client-Side Reference
 * 
 * Use these types in your client code to get proper TypeScript support
 * when connecting to the Dino Islander server.
 */

/**
 * Represents a single tile in the world
 */
export interface IClientTile {
  x: number;                    // 0 to width-1
  y: number;                    // 0 to height-1
  type: "floor" | "water";      // Tile type
}

/**
 * The complete room state that clients receive
 */
export interface IClientGameRoomState {
  width: number;                // Map width (0 to 65535)
  height: number;               // Map height (0 to 65535)
  tiles: IClientTile[];          // Array of all tiles
}

/**
 * Helper functions for working with map data
 */
export class TileMapHelper {
  /**
   * Convert 2D coordinates to 1D array index
   */
  static coordToIndex(x: number, y: number, width: number): number {
    return y * width + x;
  }

  /**
   * Convert 1D array index to 2D coordinates
   */
  static indexToCoord(index: number, width: number): { x: number; y: number } {
    return {
      x: index % width,
      y: Math.floor(index / width),
    };
  }

  /**
   * Check if coordinates are within bounds
   */
  static isInBounds(
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    return x >= 0 && x < width && y >= 0 && y < height;
  }

  /**
   * Find tile at specific coordinates
   */
  static getTileAt(
    x: number,
    y: number,
    state: IClientGameRoomState
  ): IClientTile | undefined {
    if (!this.isInBounds(x, y, state.width, state.height)) {
      return undefined;
    }
    const index = this.coordToIndex(x, y, state.width);
    return state.tiles[index];
  }

  /**
   * Count tiles by type
   */
  static countByType(state: IClientGameRoomState): Record<string, number> {
    const counts: Record<string, number> = {};
    state.tiles.forEach((tile) => {
      counts[tile.type] = (counts[tile.type] || 0) + 1;
    });
    return counts;
  }

  /**
   * Check if a tile is walkable (floor only)
   * (Future: Can be extended for pathfinding)
   */
  static isWalkable(tile: IClientTile): boolean {
    return tile.type === "floor";
  }

  /**
   * Validate server state integrity
   */
  static validate(state: IClientGameRoomState): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!state.width || state.width <= 0) {
      errors.push("Invalid width");
    }
    if (!state.height || state.height <= 0) {
      errors.push("Invalid height");
    }
    if (!Array.isArray(state.tiles)) {
      errors.push("Tiles is not an array");
    }

    const expectedTileCount = state.width * state.height;
    if (state.tiles.length !== expectedTileCount) {
      errors.push(
        `Expected ${expectedTileCount} tiles but got ${state.tiles.length}`
      );
    }

    state.tiles.forEach((tile, index) => {
      if (tile.x < 0 || tile.x >= state.width) {
        errors.push(`Tile ${index}: x out of bounds (${tile.x})`);
      }
      if (tile.y < 0 || tile.y >= state.height) {
        errors.push(`Tile ${index}: y out of bounds (${tile.y})`);
      }
      if (!["floor", "water"].includes(tile.type)) {
        errors.push(`Tile ${index}: invalid type (${tile.type})`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * UNITY C# EQUIVALENT
 * 
 * [System.Serializable]
 * public class ClientTile
 * {
 *     public ushort x;
 *     public ushort y;
 *     public string type; // "floor" or "water"
 * }
 * 
 * [System.Serializable]
 * public class ClientGameRoomState
 * {
 *     public ushort width;
 *     public ushort height;
 *     public ClientTile[] tiles;
 * }
 */

/**
 * USAGE EXAMPLE
 * 
 * // Connect to room
 * const room = await client.joinOrCreate("game");
 * 
 * // Cast to typed interface
 * const state = room.state as IClientGameRoomState;
 * 
 * // Get tile at position
 * const tile = TileMapHelper.getTileAt(5, 5, state);
 * if (tile && TileMapHelper.isWalkable(tile)) {
 *   console.log("Can walk here!");
 * }
 * 
 * // Validate received state
 * const validation = TileMapHelper.validate(state);
 * if (!validation.valid) {
 *   console.error("State errors:", validation.errors);
 * }
 * 
 * // Count tile types
 * const counts = TileMapHelper.countByType(state);
 * console.log(`Floor: ${counts.floor}, Water: ${counts.water}`);
 */
