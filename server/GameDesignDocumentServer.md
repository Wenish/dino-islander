You are a senior multiplayer backend engineer and game server architect.

I am building a real-time multiplayer strategy game using Colyseus (TypeScript, Node.js).
You must design and implement a fully server-authoritative game server architecture.

This server must be production-ready, deterministic, scalable, cheat-resistant, and cleanly structured.

================================
GAME CONCEPT
================================

The game is a multiplayer island strategy game:

- Two players each have a castle on separate islands.
- Islands are separated by water.
- Players build floor tiles across water to connect islands.
- Units are NOT directly controlled by players.
- Units act autonomously based on AI behaviors.
- Players influence the game only via:
  - Playing cards
  - Building paths
  - Managing resources

Goal:
- Destroy the enemy castle.

================================
CORE GAME SYSTEMS
================================

1) TILE SYSTEM

Tile types:
- Floor: walkable
- Water: not walkable
- Tree: resource node (can be cut)

Rules:
- Units can only walk on floor.
- Builders can place floor tiles.
- Woodcutters cut trees which disappear.
- Floor placement dynamically changes the navigable map.

Tiles must be server authoritative.

================================

2) RESOURCE SYSTEM

Resource:
- Wood

Sources:
- Trees → harvested by woodcutters.

Flow:
Tree → Woodcutter → Castle → Storage → Used by Builders / Card costs

================================

3) UNIT TYPES

Units act autonomously using AI logic.

Units:
- Woodcutter
- Builder
- Spear

--------------------
WOODCUTTER AI:
--------------------
1) Find nearest tree
2) Walk to tree
3) Cut tree (tree removed)
4) Carry wood
5) Return to castle
6) Deposit wood
7) Repeat

--------------------
BUILDER AI:
--------------------
1) Detect pending floor construction jobs
2) Walk to castle
3) Pickup wood
4) Walk to build location
5) Place floor tile
6) Repeat

--------------------
SPEAR AI:
--------------------
1) Move along built floor path
2) If enemy spear encountered → fight
3) If no enemy blocks → continue forward
4) When reaching enemy castle → deal damage

Spears always prioritize killing enemy spears before attacking castles.

================================

4) CARD SYSTEM

Players do NOT directly control units.

Players play cards which:
- Spawn units
- Queue floor construction jobs

Card types:
- Woodcutter
- Builder
- Spear
- Floor tile

Cards:
- Are drawn automatically every few seconds
- Players have hand limit
- Cards have wood cost

================================

5) PATH SYSTEM

- Floor tiles dynamically form traversable paths.
- Builders build paths gradually.
- Spears follow path index positions.
- Combat happens along this path.

Pathing must be deterministic and server driven.

================================

6) COMBAT SYSTEM

- Spear vs spear combat happens automatically.
- Tick-based deterministic combat resolution.
- Only when no enemy spears block → castle can be attacked.

================================

7) GAME LOOP

Server uses a fixed tick simulation:
- 5–10 ticks per second
- AI logic runs inside simulation loop
- All game logic is server authoritative

================================
ARCHITECTURE REQUIREMENTS
================================

- Use Colyseus Rooms + Schema properly
- Use deterministic simulation
- Fully server authoritative
- Clean folder structure
- Modular design:
  - Schema
  - Systems (AI, Combat, Pathing, Resources)
  - Room orchestration

================================
REQUIRED OUTPUT
================================

Generate a complete production-ready Colyseus server project:

- Full folder structure
- All schema files
- Game room implementation
- Unit AI systems
- Pathfinding system
- Combat resolution
- Resource gathering
- Builder construction system
- Card system
- Tick-based simulation loop

The code must:
- Be idiomatic TypeScript
- Use @colyseus/schema properly
- Be clean, readable, scalable
- Include comments explaining key logic

Do NOT write client code.
Focus ONLY on server-side logic.

================================
IMPORTANT DESIGN RULE
================================

The server must be the single source of truth.
Clients only send:
- Card plays
- Placement positions

All movement, combat, AI, economy, and victory logic must be server-controlled.

================================

Produce full working server code.

Structure the server in a clean domain-driven design style:
- rooms/
- schema/
- systems/
- utils/

Each system should be isolated and testable.

================================
SERVER PERFORMANCE & SCALABILITY REQUIREMENTS
================================

The server must be optimized for performance, scalability, and long-term stability.

Apply the following performance principles throughout the implementation:

--------------------------------
1) MEMORY & GC OPTIMIZATION
--------------------------------

- Avoid unnecessary object allocations inside tick loops.
- Reuse objects where possible.
- Use object pooling for frequently spawned entities (units, commands).
- Avoid frequent array reallocations.
- Avoid closures inside simulation loops.
- Prefer simple loops over functional constructs.

--------------------------------
2) TICK LOOP OPTIMIZATION
--------------------------------

- The simulation loop must be deterministic and stable.
- Use fixed time step simulation.
- Avoid blocking operations inside the tick loop.
- Decouple:
  - Simulation
  - Networking
  - Event dispatch

--------------------------------
3) NETWORK BANDWIDTH OPTIMIZATION
--------------------------------

- Minimize schema update spam.
- Only sync essential fields.
- Avoid large nested schemas.
- Flatten frequently changing state.
- Use message-based updates for high-frequency events when appropriate.

--------------------------------
4) CPU PERFORMANCE
--------------------------------

- Avoid pathfinding recalculation every tick.
- Cache navigational paths.
- Rebuild navigation graph only when floor tiles change.
- Precompute path indexes.
- Use spatial partitioning for unit queries.

--------------------------------
5) AI SYSTEM OPTIMIZATION
--------------------------------

- AI must operate using state machines.
- Avoid full world scans.
- Use spatial lookup grids.
- Batch AI processing.
- Process AI in phases.

--------------------------------
6) SCALABILITY DESIGN
--------------------------------

- Architecture must support:
  - Hundreds of concurrent rooms
  - Thousands of connected clients

- Design systems to:
  - Scale horizontally
  - Avoid global state
  - Avoid shared memory across rooms

--------------------------------
7) CRASH SAFETY & STABILITY
--------------------------------

- Add robust error handling inside tick loop.
- Prevent unhandled promise rejections.
- Guard all player inputs.
- Validate all client messages.
- Use try/catch around simulation logic.

--------------------------------
8) DEPLOYMENT & PRODUCTION READINESS
--------------------------------

- Provide clear server startup script.
- Provide configuration support via env variables.
- Use production logging practices.
- Avoid debug spam.
- Use structured logs.

--------------------------------

Apply these performance principles explicitly in the server architecture and implementation.
Explain design decisions where performance optimizations are applied.

Design the server so that it can support:
- Deterministic replays
- Game state snapshots
- Match recording
- Debug visualization hooks