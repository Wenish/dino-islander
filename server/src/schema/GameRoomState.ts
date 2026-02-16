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
import { PlayerSchema } from "./PlayerSchema";
import { Client } from "colyseus";
import { generateName } from "../utils/nameGenerator";
import { CastleSchema } from "./CastleSchema";
import { UnitSchema } from "./UnitSchema";

export enum GamePhase {
  Lobby = 0,
  InGame = 1,
  GameOver = 2,
}

export class GameRoomState extends Schema {

  @type("uint16")
  width: number = 0;

  @type("uint16")
  height: number = 0;

  @type([TileSchema])
  tiles = new ArraySchema<TileSchema>();

  @type([CastleSchema])
  castles = new ArraySchema<CastleSchema>();

  @type([UnitSchema])
  units = new ArraySchema<UnitSchema>();

  @type("uint8")
  gamePhase: GamePhase = GamePhase.Lobby;

  @type("number")
  phaseTimer: number = 0;

  @type("string")
  winnerId: string = "";

  @type([PlayerSchema])
  players: ArraySchema<PlayerSchema> = new ArraySchema<PlayerSchema>();

  createPlayer(client: Client) {
      const player = new PlayerSchema();
      player.name = generateName();
      player.id = client.sessionId;
      this.players.push(player);
  }

  setCastleOwner(ownerId: string) {
    const castle = this.castles.find((c: { playerId: string | undefined; }) => c.playerId === "" || c.playerId === undefined);
    if (castle) {
      castle.playerId = ownerId;
    }
  }
}
