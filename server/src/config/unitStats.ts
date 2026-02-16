/**
 * Unit Stats Configuration
 *
 * Centralized balance tuning for all unit types.
 * Modify these values to adjust unit characteristics.
 */

import { UnitType } from "../schema/UnitSchema";

export interface UnitStats {
  health: number;
  moveSpeed: number;
}

export const UNIT_STATS: Record<UnitType, UnitStats> = {
  [UnitType.Warrior]: {
    health: 12,
    moveSpeed: 1.5, // tiles per tick
  },
  [UnitType.Sheep]: {
    health: 6,
    moveSpeed: 0.8, // tiles per tick
  },
};
