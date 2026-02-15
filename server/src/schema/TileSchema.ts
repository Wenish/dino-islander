/**
 * Colyseus Schema definition for a single tile
 *
 * Design decisions:
 * - x, y are stored as uint16 to handle large maps (up to 65535x65535)
 * - type uses uint8 enum (more efficient than strings, only 1 byte)
 * - No unnecessary fields to keep message size minimal
 * - This schema is immutable after creation (tiles don't change)
 */

import { Schema, type } from "@colyseus/schema";

export enum TileType {
  Water = 0,
  Floor = 1,
  Bridge = 2,
}

export class TileSchema extends Schema {
  @type("uint16")
  x: number = 0;

  @type("uint16")
  y: number = 0;

  @type("uint8")
  type: TileType = TileType.Floor;
}
