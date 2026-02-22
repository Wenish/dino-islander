/**
 * Core type definitions for the tile-based world
 */

import { TileType } from "../schema/TileSchema";

export { TileType };

/** Tile interface - represents a single cell in the world grid (from JSON) */
export interface ITile {
  x: number;
  y: number;
  type: string; // "floor" | "water" - converted to TileType enum by MapLoader
}

/** Castle interface - represents a castle on the map (from JSON) */
export interface ICastleData {
  x: number;
  y: number;
  ownerId: string; // Player ID of the castle owner, empty if unowned
}

/** Building interface - represents a building on the map (from JSON) */
export interface IBuildingData {
  x: number;
  y: number;
  buildingType: number; // BuildingType enum value
  playerId: string; // "" = neutral building
}

/** Unit interface - represents a unit on the map (from JSON) */
export interface IUnitData {
  x: number;
  y: number;
  unitType: number; // 0 = Warrior, 1 = Sheep
  playerId: string; // "" = neutral unit
}

/** Map configuration and metadata */
export interface IMapData {
  width: number;
  height: number;
  tiles: ITile[];
  castles?: ICastleData[];
  buildings?: IBuildingData[];
  units?: IUnitData[]; // Optional list of units to spawn on map load
}

/** Game room configuration */
export interface IGameRoomConfig {
  maxPlayers: number;
}

/** Server configuration */
export interface IServerConfig {
  port: number;
  debug: boolean;
  gameRoom: IGameRoomConfig;
}
