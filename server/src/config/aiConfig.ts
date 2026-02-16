/**
 * AI Behavior Configuration
 *
 * Tunable parameters for unit AI behavior.
 * Adjust these to change how units move and interact.
 */

export const AI_CONFIG = {
  // Wandering behavior
  wanderReplanInterval: 30, // Ticks between selecting new wander target
  maxWanderDistance: 10, // Max tiles away from current position for wander target

  // Future: Combat AI tuning
  // searchEnemyRadius: 15,
  // chaseTimeout: 100,
};
