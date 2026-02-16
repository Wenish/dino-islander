/**
 * Unit Modifier System
 *
 * Delegates damage calculation to individual Modifier classes via the registry.
 * Each unit carries a Modifier instance (server-only) and a synced modifierId (uint8).
 */

import { UnitSchema } from "../../schema";
import { Modifier, ModifierType } from "./Modifier";
import { ModifierRegistry } from "./ModifierRegistry";

export class ModifierSystem {
  /**
   * Look up a Modifier instance by its numeric ID.
   */
  static getModifierById(id: number): Modifier | null {
    return ModifierRegistry.getInstance().getModifier(id);
  }

  /**
   * Set a modifier on a unit, replacing any existing modifier.
   */
  static setModifier(unit: UnitSchema, modifier: Modifier): void {
    unit.modifierId = modifier.id;
  }

  /**
   * Remove the modifier from a unit.
   */
  static clearModifier(unit: UnitSchema): void {
    unit.modifierId = ModifierType.None;
  }

  /**
   * Calculate modified damage for an attack.
   * Delegates to the attacker's Modifier class for evaluation.
   * Returns the final damage value (always at least 1 if base damage > 0).
   */
  static calculateModifiedDamage(
    baseDamage: number,
    attacker: UnitSchema,
    target: UnitSchema
  ): number {
    if (attacker.modifierId === ModifierType.None || target.modifierId === ModifierType.None) {
      return baseDamage;
    }

    const attackerModifier = this.getModifierById(attacker.modifierId);
    if (!attackerModifier) {
      return baseDamage;
    }

    const multiplier = attackerModifier.calculateMultiplier(target.modifierId);
    const modified = Math.round(baseDamage * multiplier);
    return baseDamage > 0 ? Math.max(1, modified) : 0;
  }
}
