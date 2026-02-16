/**
 * Modifier System Configuration
 *
 * Tuning values for the rock-paper-scissors modifier system.
 */
export const MODIFIER_CONFIG = {
  /** Damage multiplier when attacker has a type advantage */
  strongMultiplier: 1.5,
  /** Damage multiplier when attacker has a type disadvantage */
  weakMultiplier: 0.5,
  /** Damage multiplier for neutral matchups (same type or None involved) */
  neutralMultiplier: 1.0,
};
