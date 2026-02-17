import { Schema, type } from "@colyseus/schema";

export enum GameObjectType {
  Castle = 0,
  Unit = 1,
  Building = 2,
}

/**
 * Shape type for collision bounds
 */
export enum CollisionShape {
  Circle = 0,    // Uses radius
  Rectangle = 1, // Uses width and height
}

/**
 * Base GameObject schema - all objects inherit from this
 * Stores common properties (position, type, spatial bounds)
 * 
 * Spatial System:
 * - x, y represent the CENTER of the object
 * - Objects can be circular (radius) or rectangular (width x height)
 * - All sizes are in tile units (1.0 = one tile)
 * - Buildings typically use rectangular bounds
 * - Units typically use circular bounds
 * - Pathfinding considers object sizes and checks if units can fit through spaces
 * 
 * Metadata is type-specific and stored separately
 */
export class GameObjectSchema extends Schema {
  @type("uint8")
  type: GameObjectType = GameObjectType.Castle;

  @type("float32")
  x: number = 0;

  @type("float32")
  y: number = 0;

  @type("string")
  id: string = "";

  @type("string")
  playerId: string = "";

  // Spatial collision properties
  @type("uint8")
  collisionShape: CollisionShape = CollisionShape.Circle;

  @type("float32")
  radius: number = 0.3; // For circular bounds (in tile units)

  @type("float32")
  width: number = 1.0; // For rectangular bounds (in tile units)

  @type("float32")
  height: number = 1.0; // For rectangular bounds (in tile units)
}