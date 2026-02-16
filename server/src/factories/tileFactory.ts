import { TileSchema, TileType } from "../schema/TileSchema";

/**
 * Factory for creating tile instances
 * Centralizes tile creation to keep server logic consistent
 * Tiles are immutable after creation (no setters beyond init)
 */
export class TileFactory {
  /**
   * Create a single tile
   */
  static createTile(x: number, y: number, type: TileType): TileSchema {
    const tile = new TileSchema();
    tile.x = x;
    tile.y = y;
    tile.type = type;
    return tile;
  }

  /**
   * Batch create tiles efficiently
   */
  static createTiles(
    tiles: Array<{ x: number; y: number; type: TileType }>
  ): TileSchema[] {
    return tiles.map((t) => this.createTile(t.x, t.y, t.type));
  }
}
