/**
 * Player Action Configuration
 *
 * Tunable parameters for player actions (Hammer Slam / Bonk, etc.).
 */

export const ACTION_CONFIG = {
  // Bonk (Hammer Slam)
  bonkCooldownMs: 3000, // 3 second cooldown between bonks
  bonkRadius: 3, // AoE radius in tiles
  bonkDamage: 5, // Base damage before modifier scaling
  bonkKnockbackPower: 2.5, // Knockback force applied to hit units
  bonkMaxKnockback: 3.0, // Maximum knockback distance in tiles
  bonkKnockbackStep: 0.5, // Step size for walkability fallback
};
