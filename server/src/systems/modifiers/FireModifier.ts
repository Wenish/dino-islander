import { Modifier, ModifierType } from "./Modifier";

export class FireModifier extends Modifier {
  readonly id = ModifierType.Fire;
  readonly strongAgainst = [ModifierType.Earth];
  readonly weakAgainst = [ModifierType.Water];
}
