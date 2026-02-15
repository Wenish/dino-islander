import { Schema, type } from "@colyseus/schema";

export class PlayerSchema extends Schema {
  @type("string")
  name: string = "";

  id: string = ""; // Not synced, server-only identifier
}