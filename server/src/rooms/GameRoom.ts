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

export interface SpawnUnitMessage {
  unitType: number;
}

export interface SwitchModifierMessage {
  modifierId: number;
}

const VALID_MODIFIER_IDS = new Set([ModifierType.Fire, ModifierType.Water, ModifierType.Earth]);

export class GameRoom extends Room<{
  state: GameRoomState;
}> {
  private static readonly MAP_NAME = "default-map";
  private phaseManager!: PhaseManager;
  private modifierSwitchTimestamps = new Map<string, number>();

  /**
   * Initialize the room on creation
   * Called once when the room is first instantiated
   */
  async onCreate(): Promise<void> {
    this.maxClients = config.gameRoom.maxPlayers;
    console.log("GameRoom created");
    
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
      const state = this.state as GameRoomState;
      const player = state.players.find(p => p.id === client.sessionId);
      
      if (!player) {
        console.warn(`Player not found for client ${client.sessionId}`);
        return;
      }

      // Find player's castle and spawn nearby
      const castle = state.castles.find(c => c.playerId === client.sessionId);
      const spawnX = castle
        ? castle.x + GAME_CONFIG.unitSpawnOffsetX
        : GAME_CONFIG.unitSpawnDefaultX;
      const spawnY = castle
        ? castle.y + GAME_CONFIG.unitSpawnOffsetY
        : GAME_CONFIG.unitSpawnDefaultY;

      // Create unit using factory
      const unit = UnitFactory.createUnit(
        client.sessionId,
        message.unitType as UnitType,
        spawnX,
        spawnY
      );

      unit.modifierId = player.modifierId;
      state.units.push(unit);
      console.log(`✓ Unit spawned for ${client.sessionId}: type=${message.unitType}, modifier=${unit.modifierId}, pos=(${unit.x},${unit.y})`);
    });

    this.onMessage('switchModifier', (client: Client, message: SwitchModifierMessage) => {
      const state = this.state as GameRoomState;
      const player = state.players.find(p => p.id === client.sessionId);

      if (!player) return;

      if (!VALID_MODIFIER_IDS.has(message.modifierId)) {
        console.warn(`Invalid modifier ID ${message.modifierId} from ${client.sessionId}`);
        return;
      }

      if (message.modifierId === player.modifierId) return;

      // Enforce cooldown
      const now = Date.now();
      const lastSwitch = this.modifierSwitchTimestamps.get(client.sessionId) ?? 0;
      const remainingMs = GAME_CONFIG.modifierSwitchCooldownMs - (now - lastSwitch);
      if (remainingMs > 0) {
        client.send('modifierCooldown', { remainingMs });
        return;
      }

      player.modifierId = message.modifierId;
      this.modifierSwitchTimestamps.set(client.sessionId, now);
      client.send('modifierCooldown', { remainingMs: GAME_CONFIG.modifierSwitchCooldownMs });
      console.log(`✓ ${client.sessionId} switched modifier to ${message.modifierId}`);
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
   * Called when the room is disposed
   */
  onDispose(): void {
    console.log("GameRoom disposed");
  }
}
