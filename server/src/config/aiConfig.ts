/**
 * AI Behavior Configuration
 *
 * Tunable parameters for unit AI behavior.
 * Adjust these to change how units move and interact.
 *
 * Note: Archetype-specific configs are now in their respective archetype files:
 * - PassiveArchetype: PASSIVE_CONFIG
 * - AggressiveArchetype: AGGRESSIVE_CONFIG
 */

export const AI_CONFIG = {
  // General AI settings
  defaultMoveSpeed: 1 / 60, // tiles per tick (1 tile per second at 60Hz)
  
  // Legacy wandering behavior (for generic units without archetypes)
  wanderReplanInterval: 60,
  maxWanderDistance: 10,
};
