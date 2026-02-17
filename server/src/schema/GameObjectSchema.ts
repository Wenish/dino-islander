import { Schema, type } from "@colyseus/schema";

export enum GameObjectType {
  Castle = 0,
  Unit = 1,
  Building = 2,
}

/**
 * Base GameObject schema - all objects inherit from this
 * Stores common properties (position, type)
 * Metadata is type-specific and stored separately
 */
export class GameObjectSchema extends Schema {
  @type("uint8")
  type: GameObjectType = GameObjectType.Castle;

  @type("float32")
  x: number = 0;

  @type("float32")
  y: number = 0;

  @type("string")
  id: string = "";

  @type("string")
  playerId: string = "";
}