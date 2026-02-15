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

/** Map configuration and metadata */
export interface IMapData {
  width: number;
  height: number;
  tiles: ITile[];
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


