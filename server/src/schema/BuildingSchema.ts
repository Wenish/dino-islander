import { Schema, type } from "@colyseus/schema";
import { GameObjectSchema, GameObjectType } from "./GameObjectSchema";
import { ModifierType } from "../systems/modifiers/Modifier";

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

  /** Current modifier for castle buildings (Fire/Water/Earth cycle) */
  @type("uint8")
  modifierId: number = ModifierType.Fire;

  /** Cooldown progress for castle modifier switch [0-1], 1 = ready to switch */
  @type("float32")
  modifierSwitchDelayProgress: number = 1;

  constructor() {
    super();
    this.type = GameObjectType.Building;
  }
}