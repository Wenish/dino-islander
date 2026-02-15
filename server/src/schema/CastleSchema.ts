import { Schema, type } from "@colyseus/schema";
import { GameObjectSchema, GameObjectType } from "./GameObjectSchema";

export class CastleSchema extends GameObjectSchema {
  @type("uint16")
  health: number = 100;

  @type("uint16")
  maxHealth: number = 100;

  constructor() {
    super();
    this.type = GameObjectType.Castle;
  }
}