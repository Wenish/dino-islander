/**
 * Archetype Registry
 *
 * Responsibilities:
 * - Manage all unit archetype instances
 * - Provide archetype lookup by type
 * - Factory pattern for archetype creation
 * - Singleton registry for performance
 *
 * Design:
 * - Pre-instantiated archetype instances (no per-unit allocation)
 * - Map-based lookup for O(1) access
 * - Type-safe archetype retrieval
 *
 * Performance:
 * - Archetypes are stateless and reusable
 * - No object creation during gameplay
 * - Simple map lookup
 */

import { UnitArchetype, UnitArchetypeType } from "./UnitArchetype";
import { PassiveArchetype } from "./PassiveArchetype";
import { AggressiveArchetype } from "./AggressiveArchetype";
import { WildAnimalArchetype } from "./WildAnimalArchetype";

/**
 * Archetype Registry
 * Singleton pattern for managing all archetype instances
 */
export class ArchetypeRegistry {
  private static instance: ArchetypeRegistry;
  private archetypes: Map<UnitArchetypeType, UnitArchetype>;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.archetypes = new Map();
    this.registerDefaultArchetypes();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): ArchetypeRegistry {
    if (!ArchetypeRegistry.instance) {
      ArchetypeRegistry.instance = new ArchetypeRegistry();
    }
    return ArchetypeRegistry.instance;
  }

  /**
   * Register all default archetypes
   */
  private registerDefaultArchetypes(): void {
    this.register(new PassiveArchetype());
    this.register(new AggressiveArchetype());
    this.register(new WildAnimalArchetype());
    
    // Future archetypes:
    // this.register(new DefensiveArchetype());
    // this.register(new GathererArchetype());
    // this.register(new BuilderArchetype());
  }

  /**
   * Register a new archetype
   *
   * @param archetype - Archetype instance to register
   */
  register(archetype: UnitArchetype): void {
    if (this.archetypes.has(archetype.type)) {
      console.warn(
        `Archetype ${archetype.type} is already registered. Overwriting.`
      );
    }
    this.archetypes.set(archetype.type, archetype);
  }

  /**
   * Get archetype by type
   *
   * @param type - Archetype type to retrieve
   * @returns Archetype instance or null if not found
   */
  getArchetype(type: UnitArchetypeType): UnitArchetype | null {
    return this.archetypes.get(type) || null;
  }

  /**
   * Check if archetype is registered
   *
   * @param type - Archetype type to check
   * @returns Whether archetype exists
   */
  hasArchetype(type: UnitArchetypeType): boolean {
    return this.archetypes.has(type);
  }

  /**
   * Get all registered archetype types
   *
   * @returns Array of registered archetype types
   */
  getRegisteredTypes(): UnitArchetypeType[] {
    return Array.from(this.archetypes.keys());
  }

  /**
   * Unregister an archetype (for testing or dynamic archetypes)
   *
   * @param type - Archetype type to unregister
   */
  unregister(type: UnitArchetypeType): void {
    this.archetypes.delete(type);
  }

  /**
   * Clear all archetypes (for testing)
   */
  clear(): void {
    this.archetypes.clear();
  }
}

/**
 * Convenience function to get archetype registry instance
 */
export function getArchetypeRegistry(): ArchetypeRegistry {
  return ArchetypeRegistry.getInstance();
}
