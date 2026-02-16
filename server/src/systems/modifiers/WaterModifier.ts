import { Modifier, MODIFIER_WATER, MODIFIER_FIRE, MODIFIER_EARTH } from "./Modifier";

export class WaterModifier extends Modifier {
  readonly id = MODIFIER_WATER;
  readonly strongAgainst = [MODIFIER_FIRE];
  readonly weakAgainst = [MODIFIER_EARTH];
}
