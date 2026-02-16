# Dino Islander - Multiplayer Server

## Overview

This is a production-ready, **server-authoritative** Colyseus backend for the Dino Islander multiplayer game. The MVP focuses exclusively on:

✅ **Server startup**  
✅ **Client connection**  
✅ **Authoritative tile map state synchronization**

❌ **NOT implemented** (future): Units, AI, combat, resources, cards, pathfinding

---

## Architecture

### Clean Structure

```
src/
├── index.ts                 # Server bootstrap & Colyseus setup
├── rooms/
│   └── GameRoom.ts          # Main game room (single room, multi-client)
├── schema/
│   ├── TileSchema.ts        # Individual tile schema
│   ├── GameRoomState.ts     # Complete room state schema
│   └── index.ts             # Schema exports
├── systems/
│   └── MapLoader.ts         # Map loading & parsing system
├── utils/
    └── types.ts             # TypeScript type definitions
data/                        # Datafiles for game
└── maps/
    └── default-map.json     # Hardcoded world map
```

### Key Design Principles

#### 1. **Server-Authoritative**

- All world state lives exclusively on the server
- Tiles are never modified by clients
- Server is the single source of truth
- Clients receive state updates via Colyseus schema syncing

#### 2. **Deterministic Map Loading**

- Map is loaded from `default-map.json` on every server start
- Same map state guaranteed every time
- Supports large tile counts (16-bit coordinates: up to 65,535×65,535)

#### 3. **Efficient State Syncing**

- Uses `@colyseus/schema` for binary encoding
- Only changed tiles are synced to clients (delta sync)
- Message size is minimal (no unnecessary nesting)

#### 4. **Single Game Room**

- One `GameRoom` instance serves all clients
- Room name: `"game"`
- Clients join this room to receive the tile map
- Scales via Colyseus room clustering (future feature)

---

## Schema Design

### TileSchema

Represents a single tile in the world:

```typescript
class TileSchema {
  x: uint16           // X coordinate (0 to 65535)
  y: uint16           // Y coordinate (0 to 65535)
  type: string        // "floor" | "water"
}
```

### GameRoomState

The complete room state (root schema sent to clients):

```typescript
class GameRoomState {
  width: uint16                 // Map width
  height: uint16                // Map height
  tiles: ArraySchema<TileSchema> // All tiles
}
```

**Memory efficiency:**
- `uint16` used for coordinates (2 bytes each instead of 4)
- `ArraySchema` only sends deltas on change
- No unnecessary nesting or extra fields

---

## Map Data Format

The tile map is stored as JSON and loaded on server startup:

```json
{
  "width": 16,
  "height": 16,
  "tiles": [
    { "x": 0, "y": 0, "type": "floor" },
    { "x": 1, "y": 0, "type": "floor" },
    { "x": 2, "y": 0, "type": "water" },
    ...
  ]
}
```

**Validation:**
- Coordinates must be within bounds
- Tile types must be `"floor"` or `"water"`
- Map dimensions must be positive integers

---

## Getting Started

### Installation

```bash
cd server
npm install
```

### Development

```bash
npm run dev
```

Starts with TypeScript transpilation and `ts-node`.

### Production Build

```bash
npm run build
npm start
```

---

## Server Startup

The server:

1. **Initializes Express** for basic HTTP routing
2. **Creates Colyseus Server** listening on port 3000 (configurable)
3. **Registers GameRoom** under room name `"game"`
4. **Loads default map** from `src/maps/default-map.json`
5. **Validates map data** (dimensions, tile types, coordinates)
6. **Waits for clients** to connect

### Output

```
🚀 Starting Dino Islander Server (MVP)
📍 Port: 3000
🔧 Debug: false
📋 Room registered: 'game' (GameRoom)
✅ Server listening on ws://localhost:3000
💚 API health check: http://localhost:3000/health
```

### Configuration

#### Environment Variables

```bash
PORT=3000           # Server port (default: 3000)
DEBUG=false         # Colyseus debug mode (default: false)
```

#### Example

```bash
DEBUG=true npm run dev
```

---

## Client Connection Flow

### 1. Client Connects to Room

```typescript
// Client-side (pseudo-code)
const room = await client.joinOrCreate("game");
```

### 2. Server Processes Join

```
GameRoom.onJoin(client)
↓
Server sends full GameRoomState via Colyseus schema
↓
Client receives state update
```

### 3. Client Receives Full Map

The client automatically receives:
- `width` and `height` (map dimensions)
- All `tiles` (complete tile array)

### 4. Client Renders Map

The client iterates the tile array and renders based on tile type.

---

## API Endpoints

### Health Check

```
GET http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-15T10:30:00.000Z"
}
```

Used for load balancer health checks and server verification.

---

## Map System

### MapLoader

Handles:
- Loading JSON from disk
- Validating structure
- Converting raw data to schema objects

### Methods

#### `loadMapFromFile(mapFileName: string): IMapData`

Loads a map JSON file from `src/maps/`.

**Example:**
```typescript
const mapData = MapLoader.loadMapFromFile("default-map");
```

#### `createStateFromMap(mapData: IMapData): GameRoomState`

Converts parsed JSON into schema objects ready for clients.

```typescript
const state = MapLoader.createStateFromMap(mapData);
```

### Validation Rules

- **Width/Height:** Must be > 0
- **Tiles:** Must be an array
- **Coordinates:** Must be within bounds (0 to width-1, 0 to height-1)
- **Types:** Must be `"floor"` or `"water"`

---

## Next Steps (Post-MVP)

Once this foundation is stable, you can build:

1. **Entity System** - Units, NPCs, players
2. **Game Simulation** - Tick-based state updates
3. **Input Handling** - Client commands (move, attack, etc.)
4. **Pathing** - A* or similar pathfinding on tiles
5. **Combat** - Damage, resource management
6. **Cards** - Card-based abilities and mechanics

All will layer on top of this tile foundation.

---

## Production Deployment

### Prerequisites

- Node.js 18+
- Port 3000 available (or configure via `PORT` env var)

### Docker (Example)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY lib ./lib
COPY src/maps ./src/maps
EXPOSE 3000
CMD ["node", "lib/index.js"]
```

### Scaling

For multiple players:
- Use Colyseus Room Clustering (Redis adapter)
- Horizontal scaling via load balancer
- Each server instance runs independent room instances

---

## Debugging

### Enable Colyseus Debug Logs

```bash
DEBUG=true npm run dev
```

### Check Room State

Access the Colyseus development tools (if enabled):
```
http://localhost:3000/colyseus
```

### Verify Map Loading

The console will show:
```
✓ Map validation passed: 16x16, 256 tiles
✓ Map loaded: 16x16 with 256 tiles
```

---

## Code Quality

- **TypeScript:** Strict mode enabled
- **Architecture:** Clean separation of concerns
- **Comments:** Key design decisions documented
- **Deterministic:** Same map every server restart

---

## File Manifest

| File | Purpose |
|------|---------|
| `src/index.ts` | Server bootstrap |
| `src/rooms/GameRoom.ts` | Main game room logic |
| `src/schema/TileSchema.ts` | Tile schema definition |
| `src/schema/GameRoomState.ts` | Room state schema |
| `src/systems/MapLoader.ts` | Map loading & validation |
| `src/utils/types.ts` | TypeScript types |
| `src/maps/default-map.json` | Hardcoded tile map |
| `package.json` | Dependencies & scripts |
| `tsconfig.json` | TypeScript configuration |

---

## License

MIT

---

**Version:** 0.1.0 (MVP)  
**Last Updated:** February 15, 2026