import { Schema, type } from "@colyseus/schema";
import { GameObjectSchema, GameObjectType } from "./GameObjectSchema";

export enum BuildingType {
    Castle = 0,
    Tree = 1,
    Bush = 2,
    Rock = 3,
    Tower = 4
}


export class BuildingSchema extends GameObjectSchema {
  @type("uint8")
  buildingType: BuildingType = BuildingType.Tree;

  @type("uint16")
  health: number = 100;

  @type("uint16")
  maxHealth: number = 100;

  constructor() {
    super();
    this.type = GameObjectType.Building;
  }
}