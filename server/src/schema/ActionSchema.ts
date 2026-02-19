import { Schema, type } from "@colyseus/schema";

export enum PlayerActionType {
  NoAction = 0,
  BonkEnemies = 1,
}

export class ActionSchema extends Schema {
  @type("uint8")
  actionId: number = PlayerActionType.NoAction;

  @type("float32")
  cooldownProgress: number = 1; // 0 = just used, 1 = ready
}
