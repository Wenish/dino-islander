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

export class GameRoom extends Room<GameRoomState> {
  private static readonly MAP_NAME = "default-map";

  /**
   * Initialize the room on creation
   * Called once when the room is first instantiated
   */
  async onCreate(): Promise<void> {
    console.log("🎮 GameRoom created");

    // Initialize room state
    this.setState(new GameRoomState());

    // Load map and populate state
    try {
      const mapData = MapLoader.loadMapFromFile(GameRoom.MAP_NAME);
      const state = MapLoader.createStateFromMap(mapData);
      this.setState(state);

      console.log(
        `✓ Map loaded: ${state.width}x${state.height} with ${state.tiles.length} tiles`
      );
    } catch (error) {
      console.error("✗ Failed to load map:", error);
      throw error;
    }
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
  }

  /**
   * Called when a client leaves the room
   */
  onLeave(client: Client): void {
    console.log(
      `✗ Client left: ${client.sessionId} - Total players: ${Object.keys(this.clients).length}`
    );
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
    console.log("🗑️  GameRoom disposed");
  }
}
