# Dino Islander - Multiplayer Game

[![Build Unity Project](https://github.com/Wenish/dino-islander/actions/workflows/unity-build.yml/badge.svg)](https://github.com/Wenish/dino-islander/actions/workflows/unity-build.yml)

[![Server Build](https://github.com/Wenish/dino-islander/actions/workflows/server-build.yml/badge.svg)](https://github.com/Wenish/dino-islander/actions/workflows/server-build.yml)

A production-ready, **server-authoritative** multiplayer game built with Colyseus (TypeScript, Node.js) and rendering clients.

## 🎮 Project Status: Fully Functional Multiplayer Game

**Current Focus:** Client polish and feature expansion

✅ **Server (Complete):**
- Server-authoritative architecture with single source of truth
- Full game loop with 3 phases (Lobby → InGame → GameOver)
- Tile-based world with deterministic map loading
- Real-time state synchronization via Colyseus (binary delta-only encoding)
- Complete unit system (4 types: Warrior, Sheep, Raptor, Brachiosaurus)
- Advanced AI behavior system (4 archetypes: Passive, Aggressive, WildAnimal, Warrior)
- 8-directional pathfinding with A* algorithm and path caching
- Complete combat system with damage multipliers and cooldowns
- Type modifier system with advantages (Fire, Water, Earth)
- Automatic unit spawning and wild enemy spawning
- Player action framework with Bonk and RaptorSpawn actions
- Building/Castle system with health and ownership
- Win conditions and game over detection
- Highly configurable game balance system

✅ **Client (Functional):**
- Colyseus WebSocket connection and schema synchronization
- Tilemap rendering with 3-layer system (water, buildings, units)
- Dynamic unit and building spawning from prefabs
- Health bar UI with real-time updates
- Input handling for player actions (Bonk and RaptorSpawn)
- Lobby, InGame, and GameOver UI scenes
- Sound integration and playback system
- Entity lifecycle management and tracking

⚠️ **Client (Partial):**
- Animation system (basic, needs expansion)
- VFX and particle effects (limited to some actions)
- Floating damage text (partial implementation)

❌ **Not Yet Implemented:**
- Data persistence/database
- Advanced economy system
- Card systems
- Additional gameplay features

## 📁 Project Structure

```
dino-islander/
├── server/                    # Multiplayer backend (Colyseus)
│   ├── src/
│   │   ├── index.ts          # Server entry point
│   │   ├── rooms/GameRoom.ts # Main game room
│   │   ├── schema/           # Colyseus schema definitions
│   │   ├── systems/          # Systems (map loading, etc)
│   │   ├── utils/            # TypeScript types
│   │   └── maps/             # Hardcoded map JSON
│   ├── package.json
│   ├── tsconfig.json
│   ├── QUICKSTART.md         # Get running in 2 minutes
│   ├── SERVER.md             # Full server documentation
│   ├── ARCHITECTURE.md       # System design & data flow
│   ├── CLIENT_EXAMPLE.md     # Client connection examples
│   └── CLIENT_TYPES.ts       # TypeScript types for clients
│
└── client/                    # Game client (Unity, Godot, Web)
    └── [to be populated]
```

## 🚀 Quick Start

### Server Setup

```bash
cd server
npm install
npm run build
npm start
```

You should see:
```
✅ Server listening on ws://localhost:3000
```

See [QUICKSTART.md](server/QUICKSTART.md) for detailed setup.

### Client Setup

```bash
cd client/dino-islander
# Open in Unity 6.3 LTS
# Open Scenes/GameScene.unity

# Configure server connection:
# - GameBootstrap prefab in Managers/ folder
# - Set server URL (default: ws://localhost:3000)
```

**Playing Locally:**
1. Start the server (see Server Setup above)
2. Open the client in Unity
3. Run the GameScene
4. Open a second client or web client to play multiplayer

## 🎮 Gameplay Overview

Dino Islander is a real-time multiplayer strategy game where players control dinosaur units to destroy their opponent's castle.

### Core Gameplay
- **Objective:** Destroy the enemy castle before yours is destroyed
- **Unit Control:** AI-controlled units spawn automatically at your castle every 3 seconds
- **Combat:** Units attack enemies within range; damage varies based on type advantages
- **Modifiers:** Switch between Fire, Water, and Earth types (3-second cooldown) to gain advantages:
  - Fire beats Water
  - Water beats Earth
  - Earth beats Fire

### Unit Types
- **Warrior:** Aggressive unit that patrols and attacks enemies
- **Sheep:** Passive unit that wanders and flees from threats
- **Raptor:** Wild enemy packs that spawn randomly and attack everything
- **Brachiosaurus:** Passive large unit

### Game Flow
1. **Lobby:** Players join and prepare
2. **Countdown:** Game begins in ~10 seconds
3. **InGame:** Real-time combat until one castle is destroyed
4. **GameOver:** Victory/defeat screen

## 🎨 Client Architecture (Unity)

The client is built with clean separation of concerns:

```
GameBootstrap (Entry Point)
├── Application/         (Input controllers)
│   ├── BonkController      (Hammer slam action)
│   └── RaptorSpawnController (Deploy raptors action)
├── Domain/              (Game entities)
│   ├── Unit              (Unit wrapper with reactive pattern)
│   ├── Building          (Castle/building entities)
│   └── Map               (Tile world representation)
├── Infrastructure/      (Networking & schema)
│   ├── Colyseus connection
│   └── Schema synchronization
└── Presentation/        (Rendering & UI)
    ├── MapView           (Tilemap rendering - 3 layers)
    ├── UnitSpawner       (Dynamic unit instantiation)
    ├── UIManager         (Game UI & HUD)
    ├── HealthBar         (Enemy/building health display)
    └── SoundManager      (Audio playback)
```

### Client Features

**Networking:**
- Real-time connection to Colyseus server
- Schema-based state synchronization
- Automatic reconnection on disconnect

**Rendering:**
- Tilemap-based 2D rendering with 3 layers
- Dynamic sprite rendering for units and buildings
- Neighbor-based edge masking for visual polish
- Universal Render Pipeline (URP) integration

**UI:**
- Lobby scene with player join status
- InGame HUD showing player health, modifiers, action cooldowns
- GameOver scene with victory/defeat messaging
- Health bars for units and buildings

**Input:**
- Click-to-cast Bonk action (3-tile AoE hammer slam)
- Click-to-place RaptorSpawn action (deploy 3 raptors)
- Action cooldown indicators
- Visual feedback on interactions

**Audio:**
- Background music with soundtrack manager
- Sound effects for actions and impacts
- Volume management

### Server Configuration
- **Port:** 3000 (configurable via `PORT` env var)
- **Room:** `"game"` - single multiplayer room
- **Map:** 16x16 tile-based world
- **Tick Rate:** 60 Hz (60 ticks per second)
- **Max Players:** ~50 per room
- **Health Check:** `http://localhost:3000/health` for monitoring

## 🏗️ Architecture

### Server-Authoritative Design

```
Server (Single Source of Truth)
   ↓ (Binary Schema Sync @ 60Hz)
┌──┴──┬──────┬──────┐
│     │      │      │
v     v      v      v
Client Client Client Client
```

**Principles:**
- Server owns all game state and logic
- Clients receive state updates via Colyseus (delta-only, ~1-2 KB initial, 0 B with no changes)
- Clients cannot modify server state
- Deterministic game loop: all player units move and attack on server
- Spatial bucketing for efficient entity queries

### Core Systems

**PhaseManager:** Controls game flow (Lobby → InGame → GameOver)  
**AIBehaviorSystem:** Coordinates all unit AI updates each tick  
**MovementSystem:** Pathfinding with A* and collision detection  
**CombatSystem:** Unit attacks, damage calculation, cooldowns  
**SpawningSystem:** Automatic unit and enemy spawning  
**ModifierSystem:** Type advantages and player modifier switching  

### Data Flow

```
GameRoom.onUpdate() [60 times/second]
├─ PhaseManager.update() → handle game phases
├─ MovementSystem.update() → pathfind and move units
├─ CombatSystem.update() → resolve attacks
├─ SpawningSystem.update() → spawn new units
└─ State sync → send delta to all clients
    ↓ (WebSocket)
    └─ Client receives updates
       ├─ Update entity positions
       ├─ Render changes
       ├─ Play animations
       └─ Update UI
```

### Tile Map System

Tile types: `"floor"` | `"water"`

```json
{
  "width": 16,
  "height": 16,
  "tiles": [
    {"x": 0, "y": 0, "type": "floor"},
    ...
  ]
}
```

## ✨ What Makes This Game Special

**Server-Side:**
- **Truly Server-Authoritative**: No game logic on client. AI, pathfinding, combat all happen on server.
- **Deterministic**: Same game state every time on restart (same map, same seed if needed)
- **Efficient Networking**: Only deltas are sent (typically 0B when nothing changes)
- **Extensible Architecture**: Add new unit types, AI behaviors, player actions without core changes

**Client-Side:**
- **Responsive UI**: Real-time updates from server every 16ms (60 Hz)
- **Visual Polish**: Layered rendering with neighbor masking for natural-looking tiles
- **Integrated Actions**: Click-based targeting for intuitive player actions
- **Audio Feedback**: Sound effects and music enhance immersion

**Game Design:**
- **Asymmetric Units**: Each type has unique stats and behaviors creating varied tactics
- **Type Advantages**: Rock-paper-scissors modifier system adds strategic depth
- **AI Variety**: Different archetypes create dynamic opposing forces
- **Automatic Progression**: Player units spawn automatically, reducing micromanagement

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| [QUICKSTART.md](server/QUICKSTART.md) | Get running in 2 minutes |
| [SERVER.md](server/SERVER.md) | Full server documentation |
| [ARCHITECTURE.md](server/ARCHITECTURE.md) | System design & data flow |
| [MOVEMENT_SYSTEM.md](server/MOVEMENT_SYSTEM.md) | Pathfinding and movement mechanics |
| [BOT_SYSTEM.md](server/BOT_SYSTEM.md) | AI behavior system documentation |
| [SPATIAL_COLLISION_SYSTEM.md](server/SPATIAL_COLLISION_SYSTEM.md) | Collision detection details |
| [CLIENT_EXAMPLE.md](server/CLIENT_EXAMPLE.md) | Client connection code |
| [CLIENT_TYPES.ts](server/CLIENT_TYPES.ts) | TypeScript types for clients |

## 🔧 Technology Stack

### Server
- **Framework:** Colyseus
- **Language:** TypeScript (strict mode)
- **Runtime:** Node.js 18+
- **Schema:** @colyseus/schema (binary encoding)
- **Protocol:** WebSocket
- **Features:** A* pathfinding, spatial bucketing, configuration system

### Client
- **Engine:** Unity 6.3 LTS
- **Language:** C#
- **Rendering:** Universal Render Pipeline (URP)
- **UI:** TextMesh Pro, UI Toolkit
- **Networking:** Colyseus SDK
- **Audio:** Unity Audio System with Soundtrack Manager
- **Pattern:** MVVM-inspired architecture with reactive updates

## 🧪 Testing & Connectivity

### Health Check

```bash
curl http://localhost:3000/health
```

### Connect with Web Client (Node.js)

```javascript
const { Client } = require("colyseus.js");

(async () => {
  const client = new Client("ws://localhost:3000");
  const room = await client.joinOrCreate("game");
  
  console.log(`Map: ${room.state.width}x${room.state.height}`);
  console.log(`Players: ${room.state.players.length}`);
  console.log(`Units: ${room.state.units.length}`);
  
  room.onStateChange.once(() => {
    console.log("Game started!");
  });
  
  room.leave();
})();
```

### Playing Multiplayer

**Option 1: Two Unity Clients**
- Start server
- Run client in Unity (Play mode)
- Build and run second client instance
- Both connect automatically to server

**Option 2: Unity + Web Client**
- Start server
- Run Unity client
- Use web client code above to connect programmatically

See [CLIENT_EXAMPLE.md](server/CLIENT_EXAMPLE.md) for more examples.

## 🎯 Key Features

### ✅ Tile-Based World
- Supports up to 65,535 × 65,535 tiles
- Deterministic map loading
- Collision detection with buildings and units

### ✅ Unit System
- 4 unit types with distinct behaviors: Warrior, Sheep, Raptor, Brachiosaurus
- Configurable per-unit stats: health, move speed, power, weight
- Unit factory for consistent creation with collision bounds

### ✅ Advanced AI Behavior
- 4 behavior archetypes: Passive (wander/flee), Aggressive (patrol/chase/attack), WildAnimal (attack all except own type), Warrior (specialized combat)
- Stateless archetype handlers for memory efficiency
- AI-controlled players with complete unit autonomy

### ✅ Movement & Pathfinding
- 8-directional A* pathfinding with greedy optimization
- Float32 coordinates for smooth animation (not grid-locked)
- Movement service with fallback and retry strategies
- Collision detection with terrain and buildings

### ✅ Combat System
- Unit-to-unit damage with type-based multipliers
- Configurable attack range (default 1.5 tiles)
- Tick-based attack cooldowns (60 ticks @ 60Hz = 1 second)
- Spatial bucketing for efficient enemy detection
- Attack success tracking and death handling

### ✅ Modifier System (Type Advantages)
- 3 modifiers: Fire, Water, Earth
- Type matchups: Fire beats Water, Water beats Earth, Earth beats Fire
- Player modifier switching with cooldown
- Per-unit modifier synchronization

### ✅ Spawning Systems
- Auto-spawn warriors at player castles every 3 seconds
- Wild raptor pack spawning every 35 seconds
- Configurable spawn mechanics

### ✅ Real-Time Synchronization
- Delta-only message encoding
- <50 ms latency (local)
- Handles ~50+ players per room

### ✅ Production Quality
- TypeScript strict mode
- Clean architecture (separation of concerns)
- Comprehensive error handling
- Highly configurable game balance system
- Full documentation

### ✅ Server-Authoritative
- No client-side simulation
- Single source of truth
- Prevents cheating/desync
- Game phase management with state transitions

## 📊 Performance

| Metric | Value |
|--------|-------|
| Server tick rate | 60 Hz (16.67 ms per tick) |
| Initial map sync (16×16) | ~1-2 KB |
| Subsequent syncs | 0 B (no changes) |
| Unit state update | ~50-100 B per unit per tick |
| Connection latency | <50 ms (local) |
| Schema decode time | <1 ms |
| Max players per room | ~50 |
| Max units per room | Thousands (depends on logic complexity)

## 🔜 Roadmap

### Phase 1: Client Polish (Current)
- Complete animation system for all unit types
- Expand VFX for combat and actions (impacts, explosions, effects)
- Add floating damage text for all damage events
- Improve sound design and add more SFX

### Phase 2: Enhanced Gameplay
- Additional unit types and behaviors
- More player actions with strategic depth
- Visual feedback improvements (highlights, ranges, targeting)
- Mobile input support

### Phase 3: Advanced Features
- Economy system (resource gathering/management)
- Card systems for special abilities
- Advanced graphics and effects
- Replay/spectator system

### Phase 4: Production & Scaling
- Data persistence (match history, player stats)
- Matchmaking system
- Server clustering for scalability
- Dedicated hosting
- Public release

## 📝 Development

### Development Mode

```bash
cd server
npm run dev
```

Auto-rebuilds on file changes.

### Production Build

```bash
npm run build
npm start
```

### Environment Variables

```bash
PORT=3000                    # Server port
DEBUG=true                   # Colyseus debug logging
```

## 🤝 Contributing

1. Follow TypeScript strict mode
2. Maintain clean architecture
3. Document design decisions
4. Keep MVP scope tight

## 📄 License

MIT

## 👨‍💻 Author

Dino Islander Team

---

**Version:** 0.3.0 (Server Complete, Client Functional)  
**Last Updated:** June 24, 2026  
**Status:** Active Development
