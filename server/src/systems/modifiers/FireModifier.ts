import { Modifier, MODIFIER_FIRE, MODIFIER_EARTH, MODIFIER_WATER } from "./Modifier";

export class FireModifier extends Modifier {
  readonly id = MODIFIER_FIRE;
  readonly strongAgainst = [MODIFIER_EARTH];
  readonly weakAgainst = [MODIFIER_WATER];
}
