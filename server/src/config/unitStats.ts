/**
 * Unit Stats Configuration
 *
 * Centralized balance tuning for all unit types.
 * Modify these values to adjust unit characteristics.
 * 
 * Movement:
 * - moveSpeed is in tiles per tick
 * - Server runs at SERVER_TICK_RATE (default 60 ticks/second)
 * - A warrior with moveSpeed=1/SERVER_TICK_RATE moves 1 tile per second
 * - Calculate: desired_tiles_per_second / SERVER_TICK_RATE = moveSpeed
 */

import { UnitType, UnitArchetype } from "../schema/UnitSchema";
import { GAME_CONFIG } from "./gameConfig";

export interface UnitStats {
  health: number;
  moveSpeed: number;
  archetype: UnitArchetype;
}

export const UNIT_STATS: Record<UnitType, UnitStats> = {
  [UnitType.Warrior]: {
    health: 12,
    moveSpeed: 2.5 / GAME_CONFIG.SERVER_TICK_RATE, // 2.5 tiles per second
    archetype: UnitArchetype.Warrior,
  },
  [UnitType.Sheep]: {
    health: 6,
    moveSpeed: 0.25 / GAME_CONFIG.SERVER_TICK_RATE, // 0.25 tiles per second
    archetype: UnitArchetype.Passive,
  },
  [UnitType.Raptor]: {
    health: 10,
    moveSpeed: 0.6 / GAME_CONFIG.SERVER_TICK_RATE, // 0.6 tiles per second
    archetype: UnitArchetype.WildAnimal,
  },
};
