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

export class GameRoom extends Room<{
  state: GameRoomState;
}> {
  private static readonly MAP_NAME = "default-map";
  private phaseManager!: PhaseManager;
  private modifierSwitchTimestamps = new Map<string, number>();
  private botAISystem: BotAISystem = new BotAISystem();
  private roomOptions: GameRoomOptions = {};
  private botIdCounter = 0;

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
  }

  /**
   * Main update loop - called every tick
   * Handles phase management and game simulation
   */
  private onUpdate(deltaTime: number): void {
    const state = this.state as GameRoomState;

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
    const castle = state.castles.find(c => c.playerId === playerId);
    const spawnX = castle
      ? castle.x + GAME_CONFIG.unitSpawnOffsetX
      : GAME_CONFIG.unitSpawnDefaultX;
    const spawnY = castle
      ? castle.y + GAME_CONFIG.unitSpawnOffsetY
      : GAME_CONFIG.unitSpawnDefaultY;

    // Create unit using factory
    const unit = UnitFactory.createUnit(
      playerId,
      unitType as UnitType,
      spawnX,
      spawnY
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
   * Called when the room is disposed
   */
  onDispose(): void {
    this.botAISystem.dispose();
    console.log("GameRoom disposed");
  }
}
