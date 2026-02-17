/**
 * Phase Transition Commands
 * 
 * Each command encapsulates a state transition between game phases.
 * Commands are responsible for:
 * - Transitioning to the next phase
 * - Initializing phase-specific state
 * - Cleaning up previous phase state
 * - Triggering necessary resets
 * 
 * Design decisions:
 * - Commands modify the game state directly
 * - Each command is single-purpose and reusable
 * - Commands can be logged for debugging and replay systems
 */

import { ICommand } from "./ICommand";
import { GameRoomState, GamePhase } from "../../schema/GameRoomState";

/**
 * Transition from Lobby to InGame phase
 * Resets game state and starts the match
 */
export class StartGameCommand implements ICommand {
  constructor(private state: GameRoomState) {}

  execute(): boolean {
    if (this.state.gamePhase !== GamePhase.Lobby) {
      console.warn("Cannot start game: not in lobby phase");
      return false;
    }

    // Reset game state
    this.state.gamePhase = GamePhase.InGame;
    this.state.phaseTimer = 0;
    this.state.winnerId = "";

    console.log("✓ Game started - Phase: InGame");
    return true;
  }
}

/**
 * Transition from InGame to GameOver phase
 * Records the winner and prepares for end-game display
 */
export class EndGameCommand implements ICommand {
  constructor(
    private state: GameRoomState,
    private winnerId: string
  ) {}

  execute(): boolean {
    if (this.state.gamePhase !== GamePhase.InGame) {
      console.warn("Cannot end game: not in game phase");
      return false;
    }

    this.state.gamePhase = GamePhase.GameOver;
    this.state.phaseTimer = 0;
    this.state.winnerId = this.winnerId;

    console.log(`✓ Game ended - Winner: ${this.winnerId}`);
    return true;
  }
}

/**
 * Transition from GameOver to Lobby phase
 * Resets all game state and prepares for a new match
 */
export class ResetToLobbyCommand implements ICommand {
  constructor(private state: GameRoomState) {}

  execute(): boolean {
    if (this.state.gamePhase !== GamePhase.GameOver) {
      console.warn("Cannot reset to lobby: not in game over phase");
      return false;
    }

    // Clear all game entities
    this.state.units.clear();
    this.state.phaseTimer = 0;
    this.state.winnerId = "";

    // Reset all buildings
    for (const building of this.state.buildings) {
      building.health = building.maxHealth;
    }

    // Reset players
    for (const player of this.state.players) {
      player.wood = 0;
    }

    // Transition to lobby
    this.state.gamePhase = GamePhase.Lobby;

    console.log("✓ Game reset - Phase: Lobby");
    return true;
  }
}
