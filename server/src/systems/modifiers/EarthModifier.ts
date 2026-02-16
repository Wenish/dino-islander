import { Modifier, MODIFIER_EARTH, MODIFIER_WATER, MODIFIER_FIRE } from "./Modifier";

export class EarthModifier extends Modifier {
  readonly id = MODIFIER_EARTH;
  readonly strongAgainst = [MODIFIER_WATER];
  readonly weakAgainst = [MODIFIER_FIRE];
}
