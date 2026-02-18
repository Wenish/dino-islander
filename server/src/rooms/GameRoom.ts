/**
 * GameRoom - The main multiplayer room
 * 
 * Responsibilities:
 * - Load authoritative tile map on creation
 * - Accept client connections
 * - Send full map state to newly connected clients
 * - Ensure server is the single source of truth for world state
 * 
 * Design decisions:
 * - Single room instance (not dynamic room creation per game)
 * - Map is loaded once at server startup and never changes
 * - Clients receive the full state on join via Colyseus schema syncing
 * - No client input affects the tile map (MVP constraint)
 */

import { Room, Client } from "colyseus";
import { GameRoomState, GamePhase } from "../schema";
import { MapLoader } from "../systems/MapLoader";
import { AIBehaviorSystem } from "../systems/AIBehaviorSystem";
import { PhaseManager } from "../systems/PhaseManager";
import { EndGameCommand } from "../systems/commands/PhaseCommands";
import { config } from "../config";
import { GAME_CONFIG } from "../config/gameConfig";
import { UnitFactory } from "../factories/unitFactory";
import { UnitType } from "../schema/UnitSchema";
import { ModifierType } from "../systems/modifiers/Modifier";
import { BotAISystem, BotDecision } from "../systems/bot";
import { BuildingType } from "../schema/BuildingSchema";

export interface SpawnUnitMessage {
  unitType: number;
}

export interface SwitchModifierMessage {
  modifierId: number;
}

export interface GameRoomOptions {
  fillWithBots?: boolean;      // Auto-fill empty slots with bots
  botBehavior?: string;        // Bot difficulty/behavior ('basic', 'aggressive', etc.)
  maxPlayers?: number;         // Override max players
}

const VALID_MODIFIER_IDS = new Set([ModifierType.Fire, ModifierType.Water, ModifierType.Earth]);
const MODIFIER_CYCLE = [ModifierType.Fire, ModifierType.Water, ModifierType.Earth];

export class GameRoom extends Room<{
  state: GameRoomState;
}> {
  private static readonly MAP_NAME = "default-map";
  private static readonly UPDATE_PERF_LOG_INTERVAL = 600;
  private phaseManager!: PhaseManager;
  private modifierSwitchTimestamps = new Map<string, number>();
  /** Maps castleId → timestamp of last modifier switch (for per-castle cooldown) */
  private castleModifierSwitchTimestamps = new Map<string, number>();
  private botAISystem: BotAISystem = new BotAISystem();
  private roomOptions: GameRoomOptions = {};
  private botIdCounter = 0;
  private updateLoopCount = 0;
  private updateLoopAccumulatedMs = 0;

  /**
   * Initialize the room on creation
   * Called once when the room is first instantiated
   */
  async onCreate(options: GameRoomOptions = {}): Promise<void> {
    this.roomOptions = options;
    this.maxClients = options.maxPlayers || config.gameRoom.maxPlayers;
    console.log("GameRoom created with options:", options);
    
    // Load map and populate state
    try {
      const mapData = MapLoader.loadMapFromFile(GameRoom.MAP_NAME);
      const state = MapLoader.createStateFromMap(mapData);
      this.state = state;

      console.log(
        `✓ Map loaded: ${state.width}x${state.height} with ${state.tiles.length} tiles`
      );
    } catch (error) {
      console.error("✗ Failed to load map:", error);
      throw error;
    }

    // Initialize phase manager
    this.phaseManager = new PhaseManager();
    this.phaseManager.initialize(this.state);

    // Set simulation tick rate based on server configuration
    const tickRateMs = 1000 / GAME_CONFIG.SERVER_TICK_RATE;
    this.setSimulationInterval((deltaTime) => this.onUpdate(deltaTime), tickRateMs);

    this.onMessage('spawnUnit', (client: Client, message: SpawnUnitMessage) => {
      this.spawnUnitForPlayer(client.sessionId, message.unitType);
    });

    this.onMessage('switchModifier', (client: Client, message: SwitchModifierMessage) => {
      this.switchModifierForPlayer(client.sessionId, message.modifierId);
    });

    this.onMessage('switchCastleModifier', (client: Client) => {
      this.switchCastleModifier(client.sessionId);
    });
  }

  /**
   * Called when a client joins the room
   * The room automatically sends the full state to the client
   * via Colyseus schema serialization
   */
  onJoin(client: Client): void {
    const state = this.state as GameRoomState;
    console.log(
      `✓ Client joined: ${client.sessionId} - Total players: ${Object.keys(this.clients).length}`
    );
    console.log(
      `  Sending map state: ${state.width}x${state.height}, ${state.tiles.length} tiles`
    );

    state.createPlayer(client);
    state.setCastleOwner(client.sessionId);

    // Notify phase manager about player join
    this.phaseManager.onPlayerJoin(state);

    // Check if we should spawn a bot to fill the second slot
    this.checkAndSpawnBot(state);
  }

  /**
   * Called when a client leaves the room
   */
  onLeave(client: Client): void {
    const state = this.state as GameRoomState;
    console.log(
      `✗ Client left: ${client.sessionId} - Total players: ${Object.keys(this.clients).length}`
    );

    // Remove player from state
    this.modifierSwitchTimestamps.delete(client.sessionId);
    const playerIndex = state.players.findIndex(p => p.id === client.sessionId);
    if (playerIndex !== -1) {
      const leavingPlayer = state.players[playerIndex];
      
      // If bot, unregister from bot system
      if (leavingPlayer.isBot) {
        this.botAISystem.unregisterBot(client.sessionId);
      }
      
      state.players.splice(playerIndex, 1);
    }

    // Check if player left during InGame phase
    if (state.gamePhase === GamePhase.InGame && state.players.length === 1) {
      // Only 1 player left - they win by forfeit
      const remainingPlayer = state.players[0];
      console.log(`✓ Player left during game - ${remainingPlayer.id} wins by forfeit`);
      
      // Use PhaseManager to properly handle transition with lifecycle callbacks
      const endGameCommand = new EndGameCommand(state, remainingPlayer.id);
      this.phaseManager.executeCommand(state, endGameCommand);
    }

    // Notify phase manager about player leave
    this.phaseManager.onPlayerLeave(state);

    // Re-open room if bot autofill is enabled and there are free slots again
    if (this.roomOptions.fillWithBots && state.players.length < this.maxClients) {
      this.unlock();
    }
  }

  /**
   * Main update loop - called every tick
   * Handles phase management and game simulation
   */
  private onUpdate(deltaTime: number): void {
    this.updateLoopCount += 1;
    this.updateLoopAccumulatedMs += deltaTime;

    if (this.updateLoopCount >= GameRoom.UPDATE_PERF_LOG_INTERVAL) {
      const averageDeltaMs = this.updateLoopAccumulatedMs / this.updateLoopCount;
      console.log(
        `✓ GameRoom update average (${GameRoom.UPDATE_PERF_LOG_INTERVAL} frames): ${averageDeltaMs.toFixed(2)} ms`
      );
      this.updateLoopCount = 0;
      this.updateLoopAccumulatedMs = 0;
    }
    
    const state = this.state as GameRoomState;

    // Update pathfinding cache tick counter
    const { PathfindingSystem } = require("../systems/PathfindingSystem");
    PathfindingSystem.tick();

    // Continuously refresh castle modifier switch cooldown progress for all castles
    const now = Date.now();
    state.buildings.forEach(building => {
      if (building.buildingType === BuildingType.Castle) {
        const lastSwitch = this.castleModifierSwitchTimestamps.get(building.id) ?? 0;
        building.modifierSwitchDelayProgress = Math.min(
          1,
          (now - lastSwitch) / GAME_CONFIG.modifierSwitchCooldownMs
        );
      }
    });

    // Update game phase logic (uses command pattern + phase handlers)
    this.phaseManager.update(state, deltaTime);

    // Only run game simulation during InGame phase
    AIBehaviorSystem.updateAllUnitsAI(state);

    // Update bot AI (only during InGame phase)
    if (state.gamePhase === GamePhase.InGame) {
      this.botAISystem.update(state, deltaTime, (botId, decision) => {
        this.executeBotAction(botId, decision);
      });
    }
  }

  /**
   * Setup message handlers
   * 
   * MVP constraint: Clients are not allowed to modify world state
   * This is purely server-authoritative
   */
  setupMessageHandlers(): void {
    // Currently unused in MVP - clients cannot modify tiles
    this.onMessage("*", (client: Client, type: string | number, message: any) => {
      console.log(`Message from ${client.sessionId}: ${type}`, message);
    });
  }

  /**
   * Check if we should spawn a bot to fill empty player slots
   * Called after a player joins
   */
  private checkAndSpawnBot(state: GameRoomState): void {
    // Only spawn bot if:
    // 1. fillWithBots option is enabled
    // 2. We have less than maxClients players
    // 3. We don't already have a bot
    if (!this.roomOptions.fillWithBots) {
      return;
    }

    const humanPlayers = state.players.filter(p => !p.isBot).length;
    const botPlayers = state.players.filter(p => p.isBot).length;
    const totalPlayers = state.players.length;

    // If we have space and no bot yet, spawn one
    if (totalPlayers < this.maxClients && botPlayers === 0) {
      this.spawnBot(state);
    }

    // Lock room once bot autofill has completed and room is full
    if (state.players.length >= this.maxClients) {
      this.lock();
    }
  }

  /**
   * Spawn a bot player
   */
  private spawnBot(state: GameRoomState): void {
    const botId = `bot_${this.botIdCounter++}`;
    const botBehavior = this.roomOptions.botBehavior || 'basic';
    
    // Create bot player in state
    const botPlayer = state.createBotPlayer(botId, `Bot ${this.botIdCounter}`);
    state.setCastleOwner(botId);

    // Register bot with AI system
    this.botAISystem.registerBot(botId, botBehavior);

    console.log(`✓ Bot spawned: ${botId} with behavior '${botBehavior}'`);

    // Notify phase manager about bot join (treated like a player join)
    this.phaseManager.onPlayerJoin(state);
  }

  /**
   * Execute a bot's action decision
   */
  private executeBotAction(botId: string, decision: BotDecision): void {
    const state = this.state as GameRoomState;

    try {
      switch (decision.type) {
        case 'spawnUnit':
          if (decision.unitType !== undefined) {
            this.spawnUnitForPlayer(botId, decision.unitType);
          }
          break;

        case 'switchModifier':
          if (decision.modifierId !== undefined) {
            this.switchModifierForPlayer(botId, decision.modifierId);
          }
          break;

        case 'wait':
          // Bot decided to wait - do nothing
          break;

        default:
          console.warn(`Unknown bot action type: ${(decision as any).type}`);
      }
    } catch (error) {
      console.error(`Error executing bot action for ${botId}:`, error);
    }
  }

  /**
   * Spawn a unit for a player (human or bot)
   * Extracted from onMessage handler for reuse
   */
  private spawnUnitForPlayer(playerId: string, unitType: number): void {
    const state = this.state as GameRoomState;
    const player = state.players.find(p => p.id === playerId);

    if (!player) {
      console.warn(`Player not found: ${playerId}`);
      return;
    }

    // Find player's castle and spawn nearby
    const castle = state.buildings.find(b => 
      b.buildingType === BuildingType.Castle && b.playerId === playerId
    );
    const spawnX = castle
      ? castle.x + GAME_CONFIG.unitSpawnOffsetX + 0.5
      : GAME_CONFIG.unitSpawnDefaultX + 0.5;
    const spawnY = castle
      ? castle.y + GAME_CONFIG.unitSpawnOffsetY + 0.5
      : GAME_CONFIG.unitSpawnDefaultY + 0.5;

    const usedUnitIds = new Set(state.units.map((existingUnit) => existingUnit.id));

    // Create unit using factory
    const unit = UnitFactory.createUnit(
      playerId,
      unitType as UnitType,
      spawnX,
      spawnY,
      usedUnitIds
    );

    unit.modifierId = player.modifierId;
    state.units.push(unit);
    console.log(`✓ Unit spawned for ${playerId}: type=${unitType}, modifier=${unit.modifierId}, pos=(${unit.x},${unit.y})`);
  }

  /**
   * Switch modifier for a player (human or bot)
   * Extracted from onMessage handler for reuse
   */
  private switchModifierForPlayer(playerId: string, modifierId: number): void {
    const state = this.state as GameRoomState;
    const player = state.players.find(p => p.id === playerId);

    if (!player) {
      return;
    }

    if (!VALID_MODIFIER_IDS.has(modifierId)) {
      console.warn(`Invalid modifier ID ${modifierId} for ${playerId}`);
      return;
    }

    if (modifierId === player.modifierId) {
      return;
    }

    // Enforce cooldown
    const now = Date.now();
    const lastSwitch = this.modifierSwitchTimestamps.get(playerId) ?? 0;
    const remainingMs = GAME_CONFIG.modifierSwitchCooldownMs - (now - lastSwitch);
    if (remainingMs > 0) {
      // For bots, silently skip (no need to send message)
      if (!player.isBot) {
        // Find client and send cooldown message
        const client = Array.from(this.clients.values()).find(c => c.sessionId === playerId);
        if (client) {
          client.send('modifierCooldown', { remainingMs });
        }
      }
      return;
    }

    player.modifierId = modifierId;
    this.modifierSwitchTimestamps.set(playerId, now);

    // Keep castle modifier in sync
    const castle = state.buildings.find(
      b => b.buildingType === BuildingType.Castle && b.playerId === playerId
    );
    if (castle) {
      castle.modifierId = modifierId;
      castle.modifierSwitchDelayProgress = 0;
      this.castleModifierSwitchTimestamps.set(castle.id, now);
    }

    // Send cooldown to human players only
    if (!player.isBot) {
      const client = Array.from(this.clients.values()).find(c => c.sessionId === playerId);
      if (client) {
        client.send('modifierCooldown', { remainingMs: GAME_CONFIG.modifierSwitchCooldownMs });
      }
    }

    console.log(`✓ ${playerId} switched modifier to ${modifierId}`);
  }

  /**
   * Cycle the castle's modifier to the next in the Fire→Water→Earth→Fire sequence.
   * Only the castle's owner can trigger this, and only when the cooldown is fully recharged.
   */
  private switchCastleModifier(playerId: string): void {
    const state = this.state as GameRoomState;

    if (state.gamePhase !== GamePhase.InGame) return;

    const castle = state.buildings.find(
      b => b.buildingType === BuildingType.Castle && b.playerId === playerId
    );
    if (!castle) return;

    // Enforce per-castle cooldown (must be fully recharged)
    if (castle.modifierSwitchDelayProgress < 1) return;

    // Cycle to the next modifier in the sequence
    const currentIndex = MODIFIER_CYCLE.indexOf(castle.modifierId as ModifierType);
    const nextModifier = MODIFIER_CYCLE[(currentIndex + 1) % MODIFIER_CYCLE.length];

    castle.modifierId = nextModifier;
    castle.modifierSwitchDelayProgress = 0;
    this.castleModifierSwitchTimestamps.set(castle.id, Date.now());

    // Keep player modifier in sync so newly spawned units inherit it
    const player = state.players.find(p => p.id === playerId);
    if (player) {
      player.modifierId = nextModifier;
    }

    console.log(`✓ ${playerId} cycled castle modifier to ${nextModifier}`);
  }

  /**
   * Called when the room is disposed
   */
  onDispose(): void {
    this.botAISystem.dispose();
    console.log("GameRoom disposed");
  }
}
