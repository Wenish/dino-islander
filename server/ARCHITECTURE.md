# Architecture Reference

## Server-Authoritative Design

### Principle: Single Source of Truth

The server is the **only** component that:
- Owns the tile map state
- Creates/modifies/validates tiles
- Decides what clients see

Clients:
- Receive state from server
- Display state visually
- Cannot modify map state
- Send only UI commands (which server ignores in MVP)

```
┌─────────────────┐
│   Server        │
│  (Single Truth) │
│   - Map State   │
│   - Validation  │
└────────┬────────┘
         │
         │ (Binary Schema Sync)
         │
    ┌────┴─────────┬──────────┐
    │              │          │
┌───▼──┐       ┌───▼──┐  ┌───▼──┐
│Client│       │Client│  │Client│
│  1   │       │  2   │  │  N   │
└──────┘       └──────┘  └──────┘

Each client sees the same map state
```

## Schema Architecture

### Immutable by Design

```
GameRoomState (Root)
├─ width: uint16
├─ height: uint16
└─ tiles: ArraySchema<TileSchema>
   ├─ Tile[0]
   │  ├─ x: uint16
   │  ├─ y: uint16
   │  └─ type: string ("floor" | "water")
   ├─ Tile[1]
   └─ Tile[N]
```

### Memory Efficiency

| Codec | Size | Usage |
|-------|------|-------|
| `uint16` | 2 bytes | x, y, width, height |
| `string` | 1+ bytes | type (interned by Colyseus) |
| `ArraySchema` | Var | Tiles with delta-only sync |

**Example message:**
- 16x16 map = 256 tiles
- Per tile: 2 + 2 + 1 = 5 bytes
- Total first sync: ~1.3 KB
- Subsequent syncs: 0 bytes (no changes)

## State Synchronization Flow

### 1. Server Startup

```
index.ts
  ├─ Colyseus Server created
  ├─ GameRoom registered
  └─ Ready for connections
```

### 2. Client Joins

```
Client                          Server
  │                               │
  ├─► joinOrCreate("game")  ───►  │
  │                               │
  │                           GameRoom.onCreate()
  │                               │
  │                           Load map.json
  │                               │
  │                           Create schema objects
  │                               │
  │                           Set room state
  │                               │
  │◄─ Full state sync ───────────┤
  │                               │
  │                           GameRoom.onJoin(client)
```

### 3. Runtime

```
No changes to tiles:
  ├─ No state mutations
  └─ No messages sent

(If tiles changed in future):
  ├─ Server modifies state
  ├─ Colyseus detects change
  └─ Send delta to clients
```

## Room Lifecycle

### Create

```typescript
async onCreate(options) {
  // Load map from JSON
  // Initialize schema objects
  // Set this.setState()
}
```

### Join

```typescript
onJoin(client) {
  // Client receives full state automatically
  // Log connection
}
```

### Message (Unused in MVP)

```typescript
this.onMessage(type, (client, message) => {
  // Validate client command
  // Apply to server state
  // Colyseus syncs changes to all clients
});
```

### Leave

```typescript
onLeave(client) {
  // Clean up client-specific data
  // (MVP: No player state yet)
}
```

### Dispose

```typescript
onDispose() {
  // Room cleanup before destruction
}
```

## Data Flow Example

### Initial Connection

```
Step 1: Client sends joinOrCreate("game")
Step 2: Server onCreate() loads map
Step 3: Server creates GameRoomState with 256 tile objects
Step 4: Colyseus encodes state to binary
Step 5: Client receives full state
Step 6: Client deserializes state
Step 7: Client can access state.width, state.height, state.tiles[]
```

### Rendering (Client-side pseudo-code)

```typescript
room.onStateChange.once(() => {
  // Map bounds
  const width = room.state.width;
  const height = room.state.height;

  // Iterate tiles
  for (let tile of room.state.tiles) {
    if (tile.type === "floor") {
      renderer.drawFloor(tile.x, tile.y);
    } else if (tile.type === "water") {
      renderer.drawWater(tile.x, tile.y);
    }
  }
});
```

## File Responsibilities

| File | Responsibility |
|------|-----------------|
| `index.ts` | HTTP + WebSocket server, room registration |
| `GameRoom.ts` | Room lifecycle, map loading orchestration |
| `MapLoader.ts` | File I/O, validation, schema conversion |
| `TileSchema.ts` | Single tile schema definition |
| `GameRoomState.ts` | Complete room state schema |
| `types.ts` | TypeScript interfaces (no duplicates) |
| `default-map.json` | Hardcoded tile data |

## Future Expansion Points

### Minimal Changes Required

**To add entities:**
```typescript
// Add new schema:
class EntitySchema extends Schema { /* ... */ }

// Add to GameRoomState:
entities: ArraySchema<EntitySchema>;

// Clients automatically receive updates
```

**To add simulation:**
```typescript
// Tick loop:
setInterval(() => {
  // Update entity positions
  // Validate vs. tilemap
  // Send deltas to clients
}, TICK_INTERVAL);
```

**To add input handling:**
```typescript
// In GameRoom:
this.onMessage("move", (client, direction) => {
  // Validate move vs. tilemap
  // Update entity state
  // Colyseus syncs to all clients
});
```

## Performance Characteristics

| Metric | Value |
|--------|-------|
| First sync (16x16) | ~1-2 KB |
| Subsequent syncs | 0 B (no changes) |
| Connection latency | <50 ms (local) |
| Schema encode/decode | <1 ms |
| Max players per room | ~50 (before optimization needed) |
| Max tile size | 65,535 x 65,535 (uint16 limit) |

## Movement System Architecture

### Overview

The movement system enables:
- **Floating-point coordinates** for smooth animation
- **8-directional pathfinding** (cardinal + diagonal)
- **Centralized movement logic** across all archetypes
- **Deterministic replays** via greedy pathfinding

### Layers

```
┌──────────────────────────────────────────────────┐
│   Archetypes                                     │
│ (PassiveArchetype, AggressiveArchetype, etc.)    │
│                                                  │
│   - Behavior state machines                      │
│   - AI decision making                           │
│   - Calls MovementService                        │
└────────────────────┬─────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────┐
│   MovementService (services/MovementService.ts)  │
│                                                  │
│   - Execute direct unit movement each tick       │
│   - Calculate direction vectors to next step     │
│   - Provide movement results                     │
│   - Support retry vs fallback strategies         │
└────────────────────┬─────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────┐
│   MovementSystem (systems/MovementSystem.ts)     │
│                                                  │
│   - Pathfinding with 8-directional support      │
│   - Walkability validation                       │
│   - Neighbor queries                             │
│   - Tile collision detection                     │
└──────────────────────────────────────────────────┘
```

### Key Components

#### 1. MovementSystem (Stateless Utility)
**File**: `src/systems/MovementSystem.ts`

Provides:
- `isPositionWalkable(state, x, y)` - Tile-level collision check
- `getWalkableNeighbors(state, x, y)` - 8-directional neighbor query
- `getNextStepTowards(state, fromX, fromY, targetX, targetY)` - Greedy pathfinding
- `canMoveTo(state, fromX, fromY, toX, toY)` - Movement validation
- `isAdjacent(x1, y1, x2, y2)` - Distance check

**Features**:
- Supports floating-point coordinates
- 8 directions (4 cardinal + 4 diagonal)
- Deterministic greedy A*
- Prefers diagonals, falls back to cardinal moves

#### 2. MovementService (Business Logic)
**File**: `src/systems/services/MovementService.ts`

Provides:
- `updateUnitMovement(unit, state, moveSpeed)` - Basic movement
- `updateUnitMovementWithFallback(...)` - Movement with "give up" on block
- `updateUnitMovementWithRetry(...)` - Movement with persistent retry

**Features**:
- Direct movement by moveSpeed distance each tick
- Floating-point coordinates for smooth sub-tile animation
- Calculates direction to next pathfinding step
- Moves unit directly: `min(moveSpeed, distanceToNextTile)`
- Returns detailed movement results
- Two retry strategies for different AI behaviors

#### 3. UnitSchema (Data Model)
**File**: `src/schema/UnitSchema.ts`

Movement fields:
- `x: float32` - Current X position (floating-point, updated each tick)
- `y: float32` - Current Y position (floating-point, updated each tick)
- `targetX: float32` - Target X for pathfinding
- `targetY: float32` - Target Y for pathfinding
- `moveSpeed: float32` - Speed in tiles/tick (can be fractional, e.g., 0.5)

### Movement Flow

```
Each Tick:
1. Archetype.update(context) calls
2. specific handler (handleWandering, handleChasing, etc.)
3. handler calls moveTowardsTarget()
4. moveTowardsTarget() calls MovementService.updateUnitMovement*()
5. MovementService:
   a. Gets next pathfinding step via MovementSystem
   b. Calculates direction vector to next step
   c. Moves unit directly by moveSpeed distance
   d. Updates unit.x, unit.y
6. Returns MovementResult { moved, blocked, reachedTarget, distance, ... }
```

### Direct Movement Model

Units move directly each tick by their moveSpeed distance:

```
moveSpeed = 1.0 tiles/tick (direct, no accumulation)
x = 5.0, y = 5.0, targetX = 8.0, targetY = 8.0

Tick 1: direction = (8-5, 8-5) / distance
        unit.x = 5.0 + direction.x * 1.0
        unit.y = 5.0 + direction.y * 1.0
        → Result: x ≈ 5.7, y ≈ 5.7 (moved ~1.0 tiles towards target)

Tick 2: direction = (8-5.7, 8-5.7) / distance
        unit.x = 5.7 + direction.x * 1.0
        unit.y = 5.7 + direction.y * 1.0
        → Result: x ≈ 6.4, y ≈ 6.4 (moved another ~1.0 tiles)

Tick 3: Similar - continued smooth movement
```

**Benefits**:
- ✓ Smooth sub-tile animation via floating-point coordinates
- ✓ Direct movement calculation - no buffering needed
- ✓ Supports fractional speeds (0.5, 1.5 tiles/tick)
- ✓ Simpler code - no accumulation logic
- ✓ Network efficient - only x, y synced (no moveProgress field)

### Pathfinding Strategy

**Algorithm**: Greedy A* (fast, deterministic, sufficient for real-time AI)

**Priority**:
1. Try diagonal move if both X and Y differ
2. If diagonal blocked, try horizontal move
3. If horizontal blocked, try vertical move
4. Return first valid move, or null if stuck

**Example**:
```
Current: (5, 5), Target: (8, 8)
dx = 3, dy = 3
→ Try diagonal (6, 6) ✓ Success, return (6, 6)

Current: (5, 5), Target: (8, 4)
dx = 3, dy = -1
→ Try diagonal (6, 4) ✗ Blocked (castle)
→ Try horizontal (6, 5) ✓ Success, return (6, 5)

Current: (5, 5), Target: (8, 4), but (6, 5) blocked
→ Try diagonal (6, 4) ✗ Blocked
→ Try horizontal (6, 5) ✗ Blocked
→ Try vertical (5, 4) ✓ Success, return (5, 4)
```

### Movement Strategies by Archetype

#### Passive Archetype
- **Movement Type**: Fallback (gives up if blocked)
- **Behavior**: When path blocked, picks new random wander target
- **Use Case**: Sheep, villagers

#### Aggressive Archetype
- **Movement Type A**: Fallback (chasing enemies)
  - If blocked while chasing, returns to idle
- **Movement Type B**: Retry (attacking castles)
  - If blocked while attacking, keeps retrying next tick
- **Use Case**: Warriors

#### Wild Animal Archetype
- **Movement Type**: Fallback (gives up if blocked)
- **Behavior**: When blocked, forces replanning of patrol
- **Use Case**: Raptors, predators

### Performance Characteristics

| Operation | Complexity | Frequency | Notes |
|-----------|-----------|-----------|-------|
| Movement execution | O(1) | Every tick | Simple variable update |
| Walkability check | O(n) | When moving | n = number of tiles |
| Pathfinding | O(8) | When moving | Fixed 8-direction check |
| Neighbor query | O(8) | On demand | Fixed loop |

**Optimization Roadmap**:
- [ ] Spatial grid for tile lookup (O(1) average)
- [ ] Path caching for static targets
- [ ] Cached navigation mesh

### Determinism & Debugging

The movement system is fully deterministic:

✓ Same input always produces same pathfinding result
✓ Direction priority is fixed (Up, Down, Left, Right, then diagonals)
✓ No randomness in movement calculation
✓ Suitable for replay recording and debugging

Enables:
- Game state snapshots
- Deterministic replays
- Debug visualization
- Test automation

---

## Security Model

### MVP (No Authentication)

- All players see all state
- No login required
- Single room for all players

### Production (Future)

- Room-per-game-instance
- Token-based auth
- Encrypted state for spectators
- Anti-cheat validation on server

## Testing Checklist

- [ ] Server starts without errors
- [ ] Health endpoint responds
- [ ] Client can join "game" room
- [ ] Client receives full map state
- [ ] state.width = 16
- [ ] state.height = 16
- [ ] state.tiles.length = 256
- [ ] No tile array mutations from client side
- [ ] Server validates all tile coordinates

---

**Documentation Version:** 2.0  
**Last Updated:** February 16, 2026
