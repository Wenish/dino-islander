import { Schema, type } from "@colyseus/schema";
import { GameObjectSchema, GameObjectType } from "./GameObjectSchema";
import { ModifierType } from "../systems/modifiers/Modifier";

export enum UnitType {
  Warrior = 0,
  Sheep = 1,
  Raptor = 2,
}

/**
 * AI behavior state for units
 * Tracks what the unit is currently doing
 */
export enum UnitBehaviorState {
  Idle = 0,
  Wandering = 1,
  Moving = 2,
  Fleeing = 3,
  Attacking = 4,
}

/**
 * Unit Archetype
 * Determines AI behavior pattern
 */
export enum UnitArchetype {
  Passive = 0,      // Wanders, flees when threatened (e.g., Sheep)
  Aggressive = 1,   // Patrols, chases, attacks enemies (e.g., Warrior)
  WildAnimal = 2,   // Attacks all units except its own type (e.g., Raptor)
}

export class UnitSchema extends GameObjectSchema {
  @type("uint8")
  unitType: UnitType = UnitType.Warrior;

  @type("uint8")
  archetype: UnitArchetype = UnitArchetype.Aggressive;

  @type("uint8")
  behaviorState: UnitBehaviorState = UnitBehaviorState.Idle;

  @type("float32")
  targetX: number = 0; // Target position for pathfinding (tile-based, can be float)

  @type("float32")
  targetY: number = 0;

  @type("float32")
  moveSpeed: number = 1.0; // tiles per tick (can be fractional for smooth smooth movement)

  @type("uint16")
  health: number = 10;

  @type("uint16")
  maxHealth: number = 10;

  @type("string")
  name: string = "";

  @type("uint8")
  modifierId: number = ModifierType.Fire;

  constructor() {
    super();
    this.type = GameObjectType.Unit;
  }
}