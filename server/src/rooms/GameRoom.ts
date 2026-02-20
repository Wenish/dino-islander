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
import { PlayerActionManager, PlayerActionMessage } from "../systems/playerActions";
import { BuildingType } from "../schema/BuildingSchema";
import { findSafeSpawnPosition } from "../utils/spawnUtils";
import { generateName } from "../utils/nameGenerator";
import { CombatSystem } from "../systems/CombatSystem";
import { RequestSpawnRaptorCommand } from "../systems/commands/RaptorSpawnCommands";

export interface SpawnUnitMessage {
  unitType: number;
}

export interface RequestHammerHitMessage {
  x: number;
  y: number;
}

export interface HammerHitMessage {
  x: number;
  y: number;
  playerId: string;
}

export interface RequestSpawnRaptorMessage {
  x: number;
  y: number;
}

export interface GameRoomOptions {
  name?: string;                // Player's name
  fillWithBots?: boolean;      // Auto-fill empty slots with bots
  botBehavior?: string;        // Bot difficulty/behavior ('basic', 'aggressive', etc.)
  maxPlayers?: number;         // Override max players
}

const MODIFIER_CYCLE = [ModifierType.Fire, ModifierType.Water, ModifierType.Earth];

export class GameRoom extends Room<{
  state: GameRoomState;
}> {
  private static readonly MAP_NAME = "default-map";
  private static readonly UPDATE_PERF_LOG_INTERVAL = 600;
  private static readonly HAMMER_HIT_RADIUS = 1.5;
  private static readonly HAMMER_HIT_DAMAGE = 1;
  private static readonly HAMMER_HIT_COOLDOWN_MS = 1000;
  private phaseManager!: PhaseManager;
  private botAISystem: BotAISystem = new BotAISystem();
  private playerActionManager: PlayerActionManager = new PlayerActionManager();
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
      state.setInitialMapUnits(mapData.units ?? []);
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

    this.onMessage('switchModifier', (client: Client) => {
      this.switchModifierForPlayer(client.sessionId);
    });

    this.onMessage('requestSpawnRaptor', (client: Client, message: RequestSpawnRaptorMessage) => {
      this.requestSpawnRaptorForPlayer(client.sessionId, message);
    });

    this.onMessage('playerAction', (client: Client, message: PlayerActionMessage) => {
      const currentState = this.state as GameRoomState;
      if (currentState.gamePhase !== GamePhase.InGame) return;
      this.playerActionManager.handleAction(client.sessionId, message, currentState);
    });
    this.onMessage('requestHammerHit', (client: Client, message: RequestHammerHitMessage) => {
      // validate request and apply hammer hit if valid (not on cooldown, etc.)
      
      const currentState = this.state as GameRoomState;
      if (currentState.gamePhase !== GamePhase.InGame) return;

      const player = currentState.players.find((p) => p.id === client.sessionId);
      if (!player) return;

      const currentPhaseTimeMs = currentState.timePastInThePhase;
      const phaseTimeWentBackwards = currentPhaseTimeMs < player.lastHammerHitTimeInPhaseMs;
      if (phaseTimeWentBackwards) {
        player.lastHammerHitTimeInPhaseMs = -GameRoom.HAMMER_HIT_COOLDOWN_MS;
      }

      const elapsedSinceLastHammerHitMs = currentPhaseTimeMs - player.lastHammerHitTimeInPhaseMs;

      const isHammerHitOnCooldown = elapsedSinceLastHammerHitMs < GameRoom.HAMMER_HIT_COOLDOWN_MS;
      if (isHammerHitOnCooldown) return;

      player.lastHammerHitTimeInPhaseMs = currentPhaseTimeMs;

      this.applyHammerHitDamage(currentState, message.x, message.y, client.sessionId);
      
      const hammerHit: HammerHitMessage = {
        x: message.x,
        y: message.y,
        playerId: client.sessionId,
      };
      this.broadcast('hammerHit', hammerHit);
    });
  }

  private applyHammerHitDamage(
    state: GameRoomState,
    hitX: number,
    hitY: number,
    attackerId: string
  ): void {
    const unitsInRange = CombatSystem.queryUnitsInRange(
      state,
      hitX,
      hitY,
      GameRoom.HAMMER_HIT_RADIUS
    );

    for (const unit of unitsInRange) {
      if (unit.health <= 0) {
        continue;
      }

      unit.health = Math.max(0, unit.health - GameRoom.HAMMER_HIT_DAMAGE);
      AIBehaviorSystem.notifyUnitDamaged(unit, state, GameRoom.HAMMER_HIT_DAMAGE, attackerId);
    }
  }

  /**
   * Called when a client joins the room
   * The room automatically sends the full state to the client
   * via Colyseus schema serialization
   */
  onJoin(client: Client, options: GameRoomOptions): void {
    if (options?.name) {
      console.log(`Player name: ${options.name}`);
    }
    const sanitizedName = options?.name?.replace(/[^a-zA-Z0-9]/g, "")?.trim();
    const playerName = sanitizedName || `Player ${Object.keys(this.clients).length} ${generateName()}`;
    const state = this.state as GameRoomState;
    console.log(
      `✓ Client joined: ${client.sessionId} - Total players: ${Object.keys(this.clients).length}`
    );
    console.log(
      `  Sending map state: ${state.width}x${state.height}, ${state.tiles.length} tiles`
    );

    state.createPlayer(client, playerName);
    state.setCastleOwner(client.sessionId);

    // Notify phase manager about player join
    this.phaseManager.onPlayerJoin(state);

    // Check if we should spawn a bot to fill the second slot
    this.checkAndSpawnBot(state);

    this.broadcast('hammerHit', { x: 10, y: 10, playerId: client.sessionId });
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
    this.playerActionManager.removePlayer(client.sessionId);
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

    // Update game phase logic (uses command pattern + phase handlers)
    this.phaseManager.update(state, deltaTime);

    // Only run game simulation during InGame phase
    AIBehaviorSystem.updateAllUnitsAI(state);

    // Update player action cooldowns
    if (state.gamePhase === GamePhase.InGame) {
      this.playerActionManager.update(state, deltaTime);
    }

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
          this.switchModifierForPlayer(botId);
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
    const baseSpawnX = castle
      ? castle.x + GAME_CONFIG.unitSpawnOffsetX + 0.5
      : GAME_CONFIG.unitSpawnDefaultX + 0.5;
    const baseSpawnY = castle
      ? castle.y + GAME_CONFIG.unitSpawnOffsetY + 0.5
      : GAME_CONFIG.unitSpawnDefaultY + 0.5;

    const safe = findSafeSpawnPosition(baseSpawnX, baseSpawnY, unitType as UnitType, state.buildings);

    const usedUnitIds = new Set(state.units.map((existingUnit) => existingUnit.id));

    // Create unit using factory
    const unit = UnitFactory.createUnit(
      playerId,
      unitType as UnitType,
      safe.x,
      safe.y,
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
  private switchModifierForPlayer(playerId: string): void {
    const state = this.state as GameRoomState;
    const player = state.players.find(p => p.id === playerId);

    if (!player) {
      return;
    }

    const currentPhaseTimeMs = state.timePastInThePhase;
    const phaseTimeWentBackwards = currentPhaseTimeMs < player.lastModifierSwitchTimeInPhaseMs;
    if (phaseTimeWentBackwards) {
      player.lastModifierSwitchTimeInPhaseMs = -GAME_CONFIG.modifierSwitchCooldownMs;
    }

    const elapsedSinceLastModifierSwitchMs =
      currentPhaseTimeMs - player.lastModifierSwitchTimeInPhaseMs;
    const isModifierSwitchOnCooldown =
      elapsedSinceLastModifierSwitchMs < GAME_CONFIG.modifierSwitchCooldownMs;

    if (isModifierSwitchOnCooldown) {
      return;
    }

    const currentIndex = MODIFIER_CYCLE.indexOf(player.modifierId as ModifierType);
    const nextModifier = MODIFIER_CYCLE[(currentIndex + 1) % MODIFIER_CYCLE.length];

    player.modifierId = nextModifier;
    player.lastModifierSwitchTimeInPhaseMs = currentPhaseTimeMs;

    console.log(`✓ ${playerId} cycled modifier to ${nextModifier}`);
  }

  private requestSpawnRaptorForPlayer(playerId: string, message: RequestSpawnRaptorMessage): void {
    if (!Number.isFinite(message?.x) || !Number.isFinite(message?.y)) {
      return;
    }

    const state = this.state as GameRoomState;
    const command = new RequestSpawnRaptorCommand(state, playerId, message.x, message.y);
    command.execute();
  }

  /**
   * Called when the room is disposed
   */
  onDispose(): void {
    this.botAISystem.dispose();
    console.log("GameRoom disposed");
  }
}
