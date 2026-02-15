/**
 * Colyseus Schema definition for the complete GameRoom state
 * 
 * Design decisions:
 * - Tiles are stored in an ArraySchema for efficient syncing (only changed tiles delta)
 * - width/height allow clients to know map bounds without iterating tiles
 * - Server-authoritative: clients never modify this state
 * - All spatial data is stored on the server and replicated to clients
 * 
 * Memory efficiency:
 * - uint16 for dimensions (supports up to 65,535x65,535 maps)
 * - ArraySchema only sends deltas, not full state each frame
 * - TileSchema uses primitive types (minimal overhead)
 */

import { Schema, ArraySchema, type } from "@colyseus/schema";
import { TileSchema } from "./TileSchema";

export class GameRoomState extends Schema {
  @type("uint16")
  width: number = 0;

  @type("uint16")
  height: number = 0;

  @type([TileSchema])
  tiles = new ArraySchema<TileSchema>();


  hiddenCards = new ArraySchema<TileSchema>();
}
