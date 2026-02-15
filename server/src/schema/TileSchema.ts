/**
 * Colyseus Schema definition for a single tile
 * 
 * Design decisions:
 * - x, y are stored as uint16 to handle large maps (up to 65535x65535)
 * - type uses a string primitive (Colyseus handles efficient string encoding)
 * - No unnecessary fields to keep message size minimal
 * - This schema is immutable after creation (tiles don't change)
 */

import { Schema, type } from "@colyseus/schema";

export class TileSchema extends Schema {
  @type("uint16")
  x: number = 0;

  @type("uint16")
  y: number = 0;

  @type("string")
  type: string = "floor"; // "floor" | "water"
}
