import { Schema, type } from "@colyseus/schema";

export class PlayerSchema extends Schema {
  @type("string")
  name: string = "";

  @type("string")
  id: string = "";

  @type("number")
  wood: number = 0;
}