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
import { GameRoomState } from "../schema";
import { MapLoader } from "../systems/MapLoader";
import { config } from "../config";

export class GameRoom extends Room<{
  state: GameRoomState;
}> {
  private static readonly MAP_NAME = "default-map";
  /**
   * Initialize the room on creation
   * Called once when the room is first instantiated
   */
  async onCreate(): Promise<void> {
    this.maxClients = config.gameRoom.maxPlayers;
    console.log("GameRoom created");

    // Initialize room state
    this.state = new GameRoomState();
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

    this.setSimulationInterval((deltaTime) => this.onUpdate(deltaTime));
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
  }

  /**
   * Called when a client leaves the room
   */
  onLeave(client: Client): void {
    console.log(
      `✗ Client left: ${client.sessionId} - Total players: ${Object.keys(this.clients).length}`
    );
  }

  private phaseCycleTime: number = 0;

  onUpdate(deltaTime: number): void {
    if (this.phaseCycleTime > 5000) {
      const state = this.state as GameRoomState;
      state.gamePhase = state.gamePhase === 0 ? 1 : state.gamePhase === 1 ? 2 : 0;
      this.phaseCycleTime = 0;
      console.log(`Game phase changed to: ${state.gamePhase}`);
    }

    this.phaseCycleTime += deltaTime;
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
