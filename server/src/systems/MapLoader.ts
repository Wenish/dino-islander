/**
 * MapLoader System
 * 
 * Responsibilities:
 * - Load map JSON from disk
 * - Validate map data integrity
 * - Convert raw map data into GameRoomState schema objects
 * 
 * This is the only system responsible for reading persistent map data.
 * All tiles are deterministic and identical on every server restart.
 */

import * as fs from "fs";
import * as path from "path";
import { IMapData, ITile } from "../utils/types";
import { GameRoomState, TileSchema } from "../schema";

export class MapLoader {
  /**
   * Load a map from JSON file
   * @param mapFileName - Name of the JSON file (without .json extension)
   * @returns Parsed map data
   */
  static loadMapFromFile(mapFileName: string): IMapData {
    const mapPath = path.join(__dirname, "../maps", `${mapFileName}.json`);

    if (!fs.existsSync(mapPath)) {
      throw new Error(`Map file not found: ${mapPath}`);
    }

    const rawContent = fs.readFileSync(mapPath, "utf-8");
    const mapData = JSON.parse(rawContent) as IMapData;

    // Validate map structure
    this.validateMapData(mapData);

    return mapData;
  }

  /**
   * Convert raw map data into a properly initialized GameRoomState
   * @param mapData - Parsed map data from JSON
   * @returns Initialized GameRoomState ready for clients
   */
  static createStateFromMap(mapData: IMapData): GameRoomState {
    const state = new GameRoomState();

    state.width = mapData.width;
    state.height = mapData.height;

    // Convert each tile into a TileSchema object
    mapData.tiles.forEach((tile: ITile) => {
      const tileSchema = new TileSchema();
      tileSchema.x = tile.x;
      tileSchema.y = tile.y;
      tileSchema.type = tile.type;

      state.tiles.push(tileSchema);
    });

    return state;
  }

  /**
   * Validate map data integrity
   * @param mapData - Map data to validate
   * @throws Error if validation fails
   */
  private static validateMapData(mapData: IMapData): void {
    if (!mapData.width || mapData.width <= 0) {
      throw new Error("Invalid map width");
    }
    if (!mapData.height || mapData.height <= 0) {
      throw new Error("Invalid map height");
    }
    if (!Array.isArray(mapData.tiles)) {
      throw new Error("Map tiles must be an array");
    }

    // Validate each tile
    mapData.tiles.forEach((tile, index) => {
      if (typeof tile.x !== "number" || typeof tile.y !== "number") {
        throw new Error(`Tile ${index} has invalid coordinates`);
      }
      if (!["floor", "water"].includes(tile.type)) {
        throw new Error(
          `Tile ${index} has invalid type: ${tile.type}. Must be 'floor' or 'water'`
        );
      }
      if (tile.x < 0 || tile.x >= mapData.width) {
        throw new Error(
          `Tile ${index} x coordinate ${tile.x} out of bounds [0, ${mapData.width})`
        );
      }
      if (tile.y < 0 || tile.y >= mapData.height) {
        throw new Error(
          `Tile ${index} y coordinate ${tile.y} out of bounds [0, ${mapData.height})`
        );
      }
    });

    console.log(
      `✓ Map validation passed: ${mapData.width}x${mapData.height}, ${mapData.tiles.length} tiles`
    );
  }
}
