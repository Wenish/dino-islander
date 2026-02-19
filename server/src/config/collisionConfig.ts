/**
 * Collision Configuration
 *
 * Defines spatial dimensions for all game objects.
 * All sizes are in tile units where 1.0 = one full tile.
 * 
 * Position System:
 * - x, y coordinates represent the CENTER of objects
 * - This makes rotation and collision detection simpler
 * 
 * Shape Types:
 * - Circular: Good for units (rotation-independent, simpler math)
 * - Rectangular: Good for buildings (more accurate space usage)
 * 
 * Design Philosophy:
 * - Units use circles for simplicity
 * - Buildings use rectangles for tile alignment
 * - Smaller objects leave more navigable space
 * - Larger objects provide better visual blocking
 */

import { UnitType } from "../schema/UnitSchema";
import { BuildingType } from "../schema/BuildingSchema";
import { CollisionShape } from "../schema/GameObjectSchema";

/**
 * Collision bounds specification
 */
export interface CollisionBounds {
  shape: CollisionShape;
  radius?: number;    // For circular shapes (in tiles)
  width?: number;     // For rectangular shapes (in tiles)
  height?: number;    // For rectangular shapes (in tiles)
}

/**
 * Unit collision sizes
 * All units use circular bounds for simplicity
 */
export const UNIT_COLLISION: Record<UnitType, CollisionBounds> = {
  [UnitType.Warrior]: {
    shape: CollisionShape.Circle,
    radius: 0.35, // Slightly larger for combat units
  },
  [UnitType.Sheep]: {
    shape: CollisionShape.Circle,
    radius: 0.15, // Smaller passive unit
  },
  [UnitType.Raptor]: {
    shape: CollisionShape.Circle,
    radius: 0.15, // Larger predator
  },
};

/**
 * Building collision sizes
 * Buildings use rectangular bounds for better tile alignment
 */
export const BUILDING_COLLISION: Record<BuildingType, CollisionBounds> = {
  [BuildingType.Castle]: {
    shape: CollisionShape.Rectangle,
    width: 1.2,  // Slightly larger than a tile
    height: 1.2,
  },
  [BuildingType.Tower]: {
    shape: CollisionShape.Rectangle,
    width: 0.8,  // Most of a tile
    height: 0.8,
  },
  [BuildingType.Tree]: {
    shape: CollisionShape.Circle,
    radius: 0.4, // Medium obstacle
  },
  [BuildingType.Bush]: {
    shape: CollisionShape.Circle,
    radius: 0.3, // Small obstacle
  },
  [BuildingType.Rock]: {
    shape: CollisionShape.Circle,
    radius: 0.4, // Medium obstacle
  },
};

/**
 * General collision settings
 */
export const COLLISION_SETTINGS = {
  /** Safety distance (in tiles) added to unit collision checks against obstacles */
  safetyMargin: 0.1,
};

/**
 * Get collision bounds for a unit type
 */
export function getUnitCollision(unitType: UnitType): CollisionBounds {
  return UNIT_COLLISION[unitType];
}

/**
 * Get collision bounds for a building type
 */
export function getBuildingCollision(buildingType: BuildingType): CollisionBounds {
  return BUILDING_COLLISION[buildingType];
}
