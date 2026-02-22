/**
 * Player Action Configuration
 *
 * Tunable parameters for player actions (Hammer Slam / Bonk, etc.).
 */

export const ACTION_CONFIG = {
  // Bonk (Hammer Slam)
  bonkCooldownMs: 1000, // 1 second cooldown between bonks
  bonkRadius: 3, // AoE radius in tiles
  bonkMaxHits: 4, // Maximum number of units affected per bonk
  bonkDamage: 3, // Base damage before modifier scaling
  bonkKnockbackPower: 2.5, // Knockback force applied to hit units
  bonkMaxKnockback: 3.0, // Maximum knockback distance in tiles
  bonkKnockbackStep: 0.5, // Step size for walkability fallback

  //Raptor Spawn
  raptorPlayerSpawnCooldownMs: 10000, // 10 second cooldown between raptor spawns
  amountOfRaptorsSpawned: 4, // Amount of raptors spawned when player uses the action
};

export enum PlayerActionType {
  NoAction = 0,
  BonkEnemies = 1,
  SpawnRaptor = 2,
}
