/**
 * Core type definitions for the tile-based world
 */

/** Supported tile types in the world */
export type TileType = "floor" | "water";

/** Tile interface - represents a single cell in the world grid */
export interface ITile {
  x: number;
  y: number;
  type: TileType;
}

/** Map configuration and metadata */
export interface IMapData {
  width: number;
  height: number;
  tiles: ITile[];
}

/** Server configuration */
export interface IServerConfig {
  port: number;
  debug: boolean;
}
