import { Schema, type } from "@colyseus/schema";
import { ModifierType } from "../systems/modifiers/Modifier";

export class PlayerSchema extends Schema {
  @type("string")
  name: string = "";

  @type("string")
  id: string = "";

  @type("number")
  wood: number = 0;

  @type("uint16")
  minionsKilled: number = 0;

  @type("uint8")
  modifierId: number = ModifierType.Fire;

  /** Last successful modifier switch timestamp within current phase (ms). */
  @type("number")
  lastModifierSwitchTimeInPhaseMs: number = -1000;

  @type("boolean")
  isBot: boolean = false;

  @type("number")
  lastHammerHitTimeInPhaseMs: number = -1000;

  @type("number")
  lastRaptorSpawnTimeInPhaseMs: number = -10000;
}