import { Schema, type } from "@colyseus/schema";
import { GameObjectSchema, GameObjectType } from "./GameObjectSchema";

export enum UnitType {
  Warrior = 0,
  Sheep = 1,
}

/**
 * AI behavior state for units
 * Tracks what the unit is currently doing
 */
export enum UnitBehaviorState {
  Idle = 0,
  Wandering = 1,
  Moving = 2,
}

export class UnitSchema extends GameObjectSchema {
  @type("uint8")
  unitType: UnitType = UnitType.Warrior;

  @type("uint8")
  behaviorState: UnitBehaviorState = UnitBehaviorState.Idle;

  @type("float32")
  targetX: number = 0; // Target position for wandering

  @type("float32")
  targetY: number = 0;

  @type("float32")
  moveSpeed: number = 1.0; // tiles per tick

  moveProgress: number = 0.0; // 0.0 to 1.0, how far along the current movement

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