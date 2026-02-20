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
  autoSpawnIntervalMs: 3000, // Spawn a warrior for each player every 3 seconds
  raptorPackSpawnIntervalMs: 35000, // Spawn a wild raptor pack every 35 seconds during InGame
  raptorPackSize: 3, // Number of raptors per spawn wave

  // Modifier switching
  modifierSwitchCooldownMs: 1000, // 1 second cooldown between modifier switches

  // Death cleanup
  unitDeathCleanupDelay: 1, // Ticks before removing dead units (3 seconds at 60Hz)

  // Future: Economy tuning
  // woodPerTree: 10,
  // woodGatherRate: 5,

  // Future: Combat tuning
  // unitDamage: 1,
  // attackCooldown: 5,
};
