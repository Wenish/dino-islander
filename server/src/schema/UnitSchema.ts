import { Schema, type } from "@colyseus/schema";
import { GameObjectSchema, GameObjectType } from "./GameObjectSchema";

export enum UnitType {
  Warrior = 0,
}

export class UnitSchema extends GameObjectSchema {
  @type("uint8")
  unitType: UnitType = UnitType.Warrior;

  @type("float32")
  moveSpeed: number = 1.0; // tiles per tick

  @type("uint16")
  health: number = 10;

  @type("uint16")
  maxHealth: number = 10;

  @type("string")
  name: string = "";

  constructor() {
    super();
    this.type = GameObjectType.Unit;
  }
}