import { Modifier, ModifierType } from "./Modifier";

export class WaterModifier extends Modifier {
  readonly id = ModifierType.Water;
  readonly strongAgainst = [ModifierType.Fire];
  readonly weakAgainst = [ModifierType.Earth];
}
