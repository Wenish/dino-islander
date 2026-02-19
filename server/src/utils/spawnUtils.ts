import { GameObjectSchema } from "../schema/GameObjectSchema";
import { getUnitCollision } from "../config/collisionConfig";
import { canUnitFitAt } from "../systems/CollisionSystem";
import { UnitType } from "../schema/UnitSchema";

const SEARCH_STEP = 0.5;
const MAX_SEARCH_RADIUS = 3;

/**
 * Find a spawn position that doesn't overlap with any buildings.
 * Starts at the desired position and spirals outward if needed.
 */
export function findSafeSpawnPosition(
  x: number,
  y: number,
  unitType: UnitType,
  buildings: Iterable<GameObjectSchema>
): { x: number; y: number } {
  const collision = getUnitCollision(unitType);
  const unitRadius = collision.radius ?? 0.35;

  const buildingArray = Array.from(buildings);

  if (canUnitFitAt(x, y, unitRadius, buildingArray)) {
    return { x, y };
  }

  // Spiral outward to find a free spot
  for (let dist = SEARCH_STEP; dist <= MAX_SEARCH_RADIUS; dist += SEARCH_STEP) {
    for (let dx = -dist; dx <= dist; dx += SEARCH_STEP) {
      for (let dy = -dist; dy <= dist; dy += SEARCH_STEP) {
        if (Math.abs(dx) !== dist && Math.abs(dy) !== dist) continue; // only check perimeter
        const cx = x + dx;
        const cy = y + dy;
        if (canUnitFitAt(cx, cy, unitRadius, buildingArray)) {
          return { x: cx, y: cy };
        }
      }
    }
  }

  // Fallback: return original position if nothing found
  return { x, y };
}
