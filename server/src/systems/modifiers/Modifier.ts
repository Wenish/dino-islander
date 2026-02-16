/**
 * Base Modifier
 *
 * Abstract class defining the contract for all unit modifiers.
 * Each modifier declares its own numeric ID, strengths/weaknesses,
 * and provides a calculate method for damage scaling.
 *
 * All modifier IDs are defined here to avoid circular imports.
 */

import { MODIFIER_CONFIG } from "./ModifierConfig";

/** Modifier type enum (stored on UnitSchema as uint8) */
export enum ModifierType {
  None = 0,
  Fire = 1,
  Water = 2,
  Earth = 3,
}

export abstract class Modifier {
  /** Unique numeric ID for this modifier */
  abstract readonly id: number;

  /** Modifier IDs this modifier is strong against (bonus damage) */
  abstract readonly strongAgainst: number[];

  /** Modifier IDs this modifier is weak against (reduced damage) */
  abstract readonly weakAgainst: number[];

  /**
   * Calculate the damage multiplier when attacking a target with the given modifier.
   */
  calculateMultiplier(targetModifierId: number): number {
    if (targetModifierId === ModifierType.None || targetModifierId === this.id) {
      return MODIFIER_CONFIG.neutralMultiplier;
    }

    if (this.strongAgainst.includes(targetModifierId)) {
      return MODIFIER_CONFIG.strongMultiplier;
    }

    if (this.weakAgainst.includes(targetModifierId)) {
      return MODIFIER_CONFIG.weakMultiplier;
    }

    return MODIFIER_CONFIG.neutralMultiplier;
  }
}
