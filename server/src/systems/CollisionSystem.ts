/**
 * Collision System
 *
 * Provides utilities for spatial collision detection.
 * Handles both circular and rectangular collision shapes.
 * 
 * Design:
 * - All positions are center points
 * - All sizes are in tile units
 * - Supports circle-circle, rect-rect, and circle-rect collisions
 * - Used by pathfinding to check if units can fit through spaces
 * 
 * Performance:
 * - Static utility methods (no instantiation)
 * - Uses simple geometric tests (fast)
 * - AABB for rectangles, distance check for circles
 */

import { GameObjectSchema, CollisionShape } from "../schema/GameObjectSchema";
import { COLLISION_SETTINGS } from "../config/collisionConfig";

/**
 * Check if two game objects overlap spatially
 * 
 * @param obj1 - First game object
 * @param obj2 - Second game object
 * @returns True if objects overlap
 */
export function checkCollision(obj1: GameObjectSchema, obj2: GameObjectSchema): boolean {
  // Both circles
  if (obj1.collisionShape === CollisionShape.Circle && obj2.collisionShape === CollisionShape.Circle) {
    return checkCircleCircleCollision(
      obj1.x, obj1.y, obj1.radius,
      obj2.x, obj2.y, obj2.radius
    );
  }

  // Both rectangles
  if (obj1.collisionShape === CollisionShape.Rectangle && obj2.collisionShape === CollisionShape.Rectangle) {
    return checkRectRectCollision(
      obj1.x, obj1.y, obj1.width, obj1.height,
      obj2.x, obj2.y, obj2.width, obj2.height
    );
  }

  // Mixed: circle and rectangle
  const circle = obj1.collisionShape === CollisionShape.Circle ? obj1 : obj2;
  const rect = obj1.collisionShape === CollisionShape.Rectangle ? obj1 : obj2;
  
  return checkCircleRectCollision(
    circle.x, circle.y, circle.radius,
    rect.x, rect.y, rect.width, rect.height
  );
}

/**
 * Check if a circular unit at a position would collide with an object
 * Used for pathfinding checks
 * 
 * @param unitX - Unit center X
 * @param unitY - Unit center Y
 * @param unitRadius - Unit radius
 * @param obj - Object to check against
 * @returns True if collision would occur
 */
export function checkUnitCollision(
  unitX: number,
  unitY: number,
  unitRadius: number,
  obj: GameObjectSchema,
  margin: number = COLLISION_SETTINGS.safetyMargin
): boolean {
  const paddedRadius = unitRadius + margin;
  if (obj.collisionShape === CollisionShape.Circle) {
    return checkCircleCircleCollision(
      unitX, unitY, paddedRadius,
      obj.x, obj.y, obj.radius
    );
  } else {
    return checkCircleRectCollision(
      unitX, unitY, paddedRadius,
      obj.x, obj.y, obj.width, obj.height
    );
  }
}

/**
 * Check circle-circle collision
 * Two circles collide if distance between centers < sum of radii
 */
function checkCircleCircleCollision(
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distanceSquared = dx * dx + dy * dy;
  const radiusSum = r1 + r2;
  return distanceSquared < radiusSum * radiusSum;
}

/**
 * Check rectangle-rectangle collision (AABB)
 * Rectangles are defined by center point and dimensions
 */
function checkRectRectCollision(
  x1: number, y1: number, w1: number, h1: number,
  x2: number, y2: number, w2: number, h2: number
): boolean {
  // Convert center + size to AABB bounds
  const left1 = x1 - w1 / 2;
  const right1 = x1 + w1 / 2;
  const top1 = y1 - h1 / 2;
  const bottom1 = y1 + h1 / 2;

  const left2 = x2 - w2 / 2;
  const right2 = x2 + w2 / 2;
  const top2 = y2 - h2 / 2;
  const bottom2 = y2 + h2 / 2;

  // AABB collision test
  return !(right1 < left2 || left1 > right2 || bottom1 < top2 || top1 > bottom2);
}

/**
 * Check circle-rectangle collision
 * Uses closest point on rectangle to circle center
 */
function checkCircleRectCollision(
  cx: number, cy: number, radius: number,
  rx: number, ry: number, rw: number, rh: number
): boolean {
  // Convert rect center to bounds
  const left = rx - rw / 2;
  const right = rx + rw / 2;
  const top = ry - rh / 2;
  const bottom = ry + rh / 2;

  // Find closest point on rectangle to circle center
  const closestX = Math.max(left, Math.min(cx, right));
  const closestY = Math.max(top, Math.min(cy, bottom));

  // Check distance from closest point to circle center
  const dx = cx - closestX;
  const dy = cy - closestY;
  const distanceSquared = dx * dx + dy * dy;

  return distanceSquared < radius * radius;
}

/**
 * Get the effective collision radius for an object
 * For rectangles, uses the diagonal half-length as approximate radius
 * 
 * @param obj - Game object
 * @returns Approximate collision radius
 */
export function getEffectiveRadius(obj: GameObjectSchema): number {
  if (obj.collisionShape === CollisionShape.Circle) {
    return obj.radius;
  } else {
    // For rectangle, return half the diagonal
    return Math.sqrt(obj.width * obj.width + obj.height * obj.height) / 2;
  }
}

/**
 * Check if a unit of given size can fit at a position without colliding with any objects
 * 
 * @param unitX - Unit center X
 * @param unitY - Unit center Y
 * @param unitRadius - Unit collision radius
 * @param objects - Array of objects to check against
 * @param ignoreObjectId - Optional object ID to ignore (e.g., the unit itself)
 * @returns True if unit can fit, false if collision detected
 */
export function canUnitFitAt(
  unitX: number,
  unitY: number,
  unitRadius: number,
  objects: GameObjectSchema[],
  ignoreObjectId?: string,
  margin: number = COLLISION_SETTINGS.safetyMargin
): boolean {
  for (const obj of objects) {
    // Skip ignored object
    if (ignoreObjectId && obj.id === ignoreObjectId) {
      continue;
    }

    // Check collision
    if (checkUnitCollision(unitX, unitY, unitRadius, obj, margin)) {
      return false;
    }
  }
  return true;
}
