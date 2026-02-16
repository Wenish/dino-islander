/**
 * General Game Configuration
 *
 * Tunable parameters for game mechanics and balance.
 */

export const GAME_CONFIG = {
  // Server tick rate
  SERVER_TICK_RATE: 60, // Hz (ticks per second) - Colyseus default

  // Spawn configuration
  unitSpawnOffsetX: 1, // Tiles offset from castle for spawning
  unitSpawnOffsetY: 0, // Tiles offset from castle for spawning
  unitSpawnDefaultX: 10, // Default X if no castle found
  unitSpawnDefaultY: 10, // Default Y if no castle found

  // Future: Economy tuning
  // woodPerTree: 10,
  // woodGatherRate: 5,

  // Future: Combat tuning
  // unitDamage: 1,
  // attackCooldown: 5,
};
