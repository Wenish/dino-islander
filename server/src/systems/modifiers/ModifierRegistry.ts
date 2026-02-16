/**
 * Modifier Registry
 *
 * Singleton registry for modifier instances.
 * Pre-instantiates all modifiers for O(1) lookup during combat.
 */

import { Modifier } from "./Modifier";
import { FireModifier } from "./FireModifier";
import { WaterModifier } from "./WaterModifier";
import { EarthModifier } from "./EarthModifier";

export class ModifierRegistry {
  private static instance: ModifierRegistry;
  private modifiers = new Map<number, Modifier>();

  private constructor() {
    this.register(new FireModifier());
    this.register(new WaterModifier());
    this.register(new EarthModifier());
  }

  static getInstance(): ModifierRegistry {
    if (!ModifierRegistry.instance) {
      ModifierRegistry.instance = new ModifierRegistry();
    }
    return ModifierRegistry.instance;
  }

  private register(modifier: Modifier): void {
    this.modifiers.set(modifier.id, modifier);
  }

  getModifier(id: number): Modifier | null {
    return this.modifiers.get(id) ?? null;
  }
}
