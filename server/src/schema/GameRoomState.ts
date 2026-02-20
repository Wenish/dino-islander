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
import { BuildingSchema, BuildingType } from "./BuildingSchema";
import { UnitSchema } from "./UnitSchema";
import { ModifierType } from "../systems/modifiers/Modifier";
import { IUnitData } from "../utils/types";

const MODIFIER_IDS = [ModifierType.Fire, ModifierType.Water, ModifierType.Earth];

export enum GamePhase {
  Lobby = 0,
  InGame = 1,
  GameOver = 2,
}

export class GameRoomState extends Schema {

  /**
   * Snapshot of map-authored units loaded at room startup.
   * Not schema-synced; used server-side to restore map units between matches.
   */
  initialMapUnits: IUnitData[] = [];

  @type("uint16")
  width: number = 0;

  @type("uint16")
  height: number = 0;

  @type([TileSchema])
  tiles = new ArraySchema<TileSchema>();

  @type([BuildingSchema])
  buildings = new ArraySchema<BuildingSchema>();

  @type([UnitSchema])
  units = new ArraySchema<UnitSchema>();

  @type("uint8")
  gamePhase: GamePhase = GamePhase.Lobby;

  @type("number")
  timePastInThePhase: number = 0;

  @type("number")
  phaseTimer: number = 0;

  @type("string")
  winnerId: string = "";

  @type([PlayerSchema])
  players: ArraySchema<PlayerSchema> = new ArraySchema<PlayerSchema>();

  setInitialMapUnits(units: IUnitData[] = []): void {
    this.initialMapUnits = units.map((unit) => ({ ...unit }));
  }

  createPlayer(client: Client, playerName?: string) {
      const player = new PlayerSchema();
      player.name = playerName || generateName();
      player.id = client.sessionId;
      player.modifierId = MODIFIER_IDS[(Math.random() * MODIFIER_IDS.length) | 0];
      player.isBot = false;
      this.players.push(player);
  }

  createBotPlayer(botId: string, botName: string = "Bot") {
      const player = new PlayerSchema();
      player.name = botName;
      player.id = botId;
      player.modifierId = MODIFIER_IDS[(Math.random() * MODIFIER_IDS.length) | 0];
      player.isBot = true;
      this.players.push(player);
      return player;
  }

  setCastleOwner(ownerId: string) {
    const castle = this.buildings.find((b: { buildingType: BuildingType; playerId: string | undefined; }) => 
      b.buildingType === BuildingType.Castle && (b.playerId === "" || b.playerId === undefined));
    if (castle) {
      castle.playerId = ownerId;
    }
  }
}
