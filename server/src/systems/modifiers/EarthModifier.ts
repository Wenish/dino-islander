import { Modifier, ModifierType } from "./Modifier";

export class EarthModifier extends Modifier {
  readonly id = ModifierType.Earth;
  readonly strongAgainst = [ModifierType.Water];
  readonly weakAgainst = [ModifierType.Fire];
}
