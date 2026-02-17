# Spatial Collision System Implementation

## Overview

The spatial collision system adds size-aware collision detection for all game objects, replacing simple tile-based occupation with proper collision shapes and bounds checking.

## Design Decisions

### Collision Shapes
- **Units**: Circular bounds (radius-based)
  - Warrior: radius = 0.35
  - Sheep: radius = 0.3
  - Raptor: radius = 0.4
  
- **Buildings**: Rectangular bounds (width × height)
  - Castle: 1.2 × 1.2
  - Tower: 0.8 × 0.8
  - Tree: 0.4 × 0.4
  - Rock: 0.4 × 0.4

### Position System
- All objects use **center-point positioning**
- Coordinates (x, y) represent the center of the object
- Collision detection calculates from center positions

### Custom Sizes
- Each object type has custom collision bounds defined in `collisionConfig.ts`
- Size values are balanced for gameplay (not photorealistic proportions)
- Easy to tweak values without modifying game logic

### Pathfinding Integration
- Unit size matters for pathfinding
- A* algorithm considers unit radius when checking walkability
- Large units may not fit through gaps that small units can traverse
- Path caching includes unit radius for size-specific paths

## File Structure

### New Files

#### `src/systems/CollisionSystem.ts`
Provides collision detection utilities:
- `checkCollision(obj1, obj2)` - Generic collision check between any two objects
- `checkUnitCollision(x, y, radius, building)` - Check if unit collides with building
- `canUnitFitAt(state, x, y, radius)` - Check if unit can fit at position

```typescript
// Example usage
if (checkUnitCollision(unit.x, unit.y, unit.radius, building)) {
  // Unit collides with building
}
```

#### `src/config/collisionConfig.ts`
Centralized collision size configuration:
- `getUnitCollision(archetype)` - Get collision bounds for unit type
- `getBuildingCollision(buildingType)` - Get collision bounds for building type

```typescript
// Example usage
const collision = getUnitCollision('Warrior');
// Returns: { shape: CollisionShape.Circle, radius: 0.35 }
```

### Modified Files

#### `src/schema/GameObjectSchema.ts`
Added spatial properties:
```typescript
@type("uint8") collisionShape: number = 0; // 0=Circle, 1=Rectangle
@type("float32") radius: number = 0;       // For circles
@type("float32") width: number = 0;        // For rectangles
@type("float32") height: number = 0;       // For rectangles
```

#### `src/systems/PathfindingSystem.ts`
- All methods now accept `unitRadius` parameter
- `findPath()` considers unit size when checking walkability
- Path caching includes unit radius in cache key
- `getNextStepForUnit()` automatically extracts unit radius

```typescript
// New signature
static findPath(
  state: GameRoomState,
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  unitRadius: number = 0.3,  // <-- NEW
  useCache: boolean = true
): PathResult[] | null
```

#### `src/systems/MovementSystem.ts`
- `isPositionWalkable()` now accepts `WalkabilityOptions`
- Checks collision using unit radius vs. legacy tile-based check
- Backward compatible with old code (unitRadius = undefined falls back to tile check)

```typescript
// New signature
static isPositionWalkable(
  state: GameRoomState,
  x: number,
  y: number,
  options: WalkabilityOptions = {}  // <-- NEW
): MovementMetadata

// New interface
interface WalkabilityOptions {
  unitRadius?: number;      // Radius of unit checking
  ignoreUnitId?: string;    // Unit ID to ignore (for self-checks)
}
```

#### `src/factories/unitFactory.ts`
- Initializes collision bounds when creating units
- Uses `getUnitCollision()` to fetch size from config

```typescript
// Sets collision properties
const collision = getUnitCollision(archetype);
unit.collisionShape = collision.shape;
unit.radius = collision.radius || 0;
unit.width = collision.width || 0;
unit.height = collision.height || 0;
```

#### `src/factories/castleFactory.ts`
- Initializes collision bounds for buildings
- Uses `getBuildingCollision()` to fetch size from config

```typescript
// Sets collision properties
const collision = getBuildingCollision('Castle');
castle.collisionShape = collision.shape;
castle.width = collision.width;
castle.height = collision.height;
```

#### `src/services/MovementService.ts`
- Passes `unit.radius` to pathfinding calls
- Size-aware movement updates

```typescript
// Now passes unit radius
MovementSystem.getNextStepTowards(
  state,
  unit.x,
  unit.y,
  targetX,
  targetY,
  unit.radius  // <-- NEW
);
```

#### `src/rooms/GameRoom.ts`
- Calls `PathfindingSystem.tick()` each fixedUpdate for cache management

```typescript
fixedUpdate(deltaTimeMs: number): void {
  // Update tick counter for pathfinding cache
  PathfindingSystem.tick();
  // ... rest of update logic
}
```

## Collision Detection Algorithm

### Circle-Circle Collision
```
distance = sqrt((x1-x2)² + (y1-y2)²)
collision = distance < (radius1 + radius2)
```

### Circle-Rectangle Collision
```
1. Find closest point on rectangle to circle center
2. Calculate distance from circle center to closest point
3. collision = distance < circle_radius
```

### Rectangle-Rectangle Collision (AABB)
```
collision = 
  (x1 - width1/2 < x2 + width2/2) &&
  (x1 + width1/2 > x2 - width2/2) &&
  (y1 - height1/2 < y2 + height2/2) &&
  (y1 + height1/2 > y2 - height2/2)
```

## Integration Flow

```
1. Unit Factory creates unit
   └─> Sets collision bounds from collisionConfig

2. Unit needs to move
   └─> MovementService calls MovementSystem.getNextStepTowards(unit.radius)
       └─> PathfindingSystem.findPath(unitRadius)
           └─> PathfindingSystem.astar(unitRadius)
               └─> MovementSystem.getWalkableNeighbors(unitRadius)
                   └─> MovementSystem.isPositionWalkable({ unitRadius })
                       └─> CollisionSystem.checkUnitCollision()
                           └─> Returns whether unit collides with building
```

## Testing Recommendations

### Size-Aware Pathfinding
- [ ] Warriors can navigate through narrow gaps
- [ ] Raptors (larger) cannot fit through same gaps
- [ ] Units path around buildings based on collision bounds
- [ ] Path caching works correctly for different unit sizes

### Building Placement
- [ ] Buildings with rectangular bounds are positioned correctly
- [ ] Units cannot walk through buildings
- [ ] Collision detection works at building edges

### Edge Cases
- [ ] Units at map boundaries don't collide incorrectly
- [ ] Very small and very large units both work
- [ ] Diagonal movement respects collision bounds

## Future Enhancements

### Potential Improvements
1. **Spatial Grid**: Replace O(n) building search with spatial hash grid for O(1) lookups
2. **Unit-Unit Collision**: Currently units don't collide - could add soft collision/pushback
3. **Dynamic Sizes**: Abilities that temporarily change unit size (growth, shrink)
4. **Collision Layers**: Different collision layers for flying units, underground units
5. **Collision Events**: Trigger events when objects collide (contact damage, etc.)

### Performance Optimizations
- Spatial partitioning for large maps with many objects
- Only check nearby objects based on spatial proximity
- Batch collision checks for groups of units

## Constants Reference

All collision sizes are defined in `src/config/collisionConfig.ts`:

```typescript
const UNIT_COLLISION: Record<string, CollisionBounds> = {
  Warrior: { shape: CollisionShape.Circle, radius: 0.35 },
  Sheep: { shape: CollisionShape.Circle, radius: 0.3 },
  Raptor: { shape: CollisionShape.Circle, radius: 0.4 }
};

const BUILDING_COLLISION: Record<string, CollisionBounds> = {
  Castle: { shape: CollisionShape.Rectangle, width: 1.2, height: 1.2 },
  Tower: { shape: CollisionShape.Rectangle, width: 0.8, height: 0.8 },
  Tree: { shape: CollisionShape.Rectangle, width: 0.4, height: 0.4 },
  Rock: { shape: CollisionShape.Rectangle, width: 0.4, height: 0.4 }
};
```

## Notes

- **Backward Compatibility**: Old code without `unitRadius` still works (falls back to tile-based check)
- **Default Radius**: Unit radius defaults to 0.3 in pathfinding methods
- **Center Positioning**: All coordinates are center points, not top-left corners
- **Cache Keys**: Path cache includes unit radius to avoid sharing paths between different-sized units

## Verification Status

✅ All TypeScript compilation errors fixed  
✅ PathfindingSystem fully integrated with unit sizes  
✅ MovementSystem uses collision detection  
✅ Factories initialize collision bounds  
✅ MovementService passes unit radius to pathfinding  
✅ GameRoom ticks pathfinding cache

Ready for gameplay testing!
