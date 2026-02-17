import { Schema, type } from "@colyseus/schema";
import { ModifierType } from "../systems/modifiers/Modifier";

export class PlayerSchema extends Schema {
  @type("string")
  name: string = "";

  @type("string")
  id: string = "";

  @type("number")
  wood: number = 0;

  @type("uint8")
  modifierId: number = ModifierType.Fire;

  @type("boolean")
  isBot: boolean = false;
}