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
import { IMapData, ITile, IUnitData } from "../utils/types";
import { GameRoomState, TileType, UnitBehaviorState } from "../schema";
import { CastleFactory } from "../factories/castleFactory";
import { TileFactory } from "../factories/tileFactory";
import { UnitFactory } from "../factories/unitFactory";

export class MapLoader {
  /**
   * Load a map from JSON file
   * @param mapFileName - Name of the JSON file (without .json extension)
   * @returns Parsed map data
   */
  static loadMapFromFile(mapFileName: string): IMapData {
    const mapPath = path.join(__dirname, "../../data/maps", `${mapFileName}.json`);

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

    // Convert each tile using TileFactory
    mapData.tiles.forEach((tile: ITile) => {
      const tileSchema = TileFactory.createTile(
        tile.x,
        tile.y,
        this.stringToTileType(tile.type)
      );
      state.tiles.push(tileSchema);
    });

    // Convert each castle into a CastleSchema object
    if (mapData.castles) {
      mapData.castles.forEach((castle) => {
        const castleSchema = CastleFactory.createCastle(
          castle.ownerId,
          castle.x,
          castle.y
        );
        state.castles.push(castleSchema);
      });
    }

    // Convert each unit into a UnitSchema object
    if (mapData.units) {
      mapData.units.forEach((unitData: IUnitData) => {
        return;
        const unitSchema = UnitFactory.createUnit(
          unitData.playerId,
          unitData.unitType,
          unitData.x,
          unitData.y
        );
        // Set initial behavior state to wandering
        unitSchema.behaviorState = UnitBehaviorState.Wandering;
        state.units.push(unitSchema);
      });
    }

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
      if (!["floor", "water", "bridge"].includes(tile.type)) {
        throw new Error(
          `Tile ${index} has invalid type: ${tile.type}. Must be 'floor', 'water', or 'bridge'`
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

    // validate castles if present
    if (mapData.castles) {
      mapData.castles.forEach((castle, index) => {
      if (typeof castle.x !== "number" || typeof castle.y !== "number") {
        throw new Error(`Castle ${index} has invalid coordinates`);
      }
      if (castle.x < 0 || castle.x >= mapData.width) {
        throw new Error(
          `Castle ${index} x coordinate ${castle.x} out of bounds [0, ${mapData.width})`
        );
    }
    if (castle.y < 0 || castle.y >= mapData.height) {
      throw new Error(
        `Castle ${index} y coordinate ${castle.y} out of bounds [0, ${mapData.height})`
      );
    }
    });
    }

    // Validate units if present
    if (mapData.units) {
      mapData.units.forEach((unit, index) => {
        if (typeof unit.x !== "number" || typeof unit.y !== "number") {
          throw new Error(`Unit ${index} has invalid coordinates`);
        }
        if (unit.x < 0 || unit.x >= mapData.width) {
          throw new Error(
            `Unit ${index} x coordinate ${unit.x} out of bounds [0, ${mapData.width})`
          );
        }
        if (unit.y < 0 || unit.y >= mapData.height) {
          throw new Error(
            `Unit ${index} y coordinate ${unit.y} out of bounds [0, ${mapData.height})`
          );
        }
        if (typeof unit.unitType !== "number" || unit.unitType < 0 || unit.unitType > 2) {
          throw new Error(`Unit ${index} has invalid unitType: ${unit.unitType}`);
        }
      });
    }

    console.log(
      `✓ Map validation passed: ${mapData.width}x${mapData.height}, ${mapData.tiles.length} tiles, ${mapData.castles ? mapData.castles.length : 0} castles, ${mapData.units ? mapData.units.length : 0} units`
    );
  }

  /**
   * Convert string tile type from JSON to TileType enum
   * @param type - String representation of tile type
   * @returns TileType enum value
   */
  private static stringToTileType(type: string): TileType {
    switch (type) {
      case "floor":
        return TileType.Floor;
      case "water":
        return TileType.Water;
      case "bridge":
        return TileType.Bridge;
      default:
        throw new Error(`Unknown tile type: ${type}`);
    }
  }
}
