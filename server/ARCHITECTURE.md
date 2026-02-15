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

**Documentation Version:** 1.0  
**Last Updated:** February 15, 2026
