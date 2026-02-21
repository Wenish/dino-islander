/**
 * GameOver Phase Handler
 * 
 * Responsibilities:
 * - Display game over state for fixed duration
 * - Reset game state after timeout
 * - Transition back to Lobby
 * 
 * Design decisions:
 * - Fixed 10-second display duration
 * - Automatic transition to lobby (no manual restart needed)
 * - Winner information is preserved during this phase
 * 
 * Performance:
 * - Simple timer-based logic
 * - No game simulation during this phase
 */

import { IPhaseHandler } from "./IPhaseHandler";
import { ICommand } from "./commands/ICommand";
import { GameRoomState } from "../schema/GameRoomState";
import { ResetToLobbyCommand } from "./commands/PhaseCommands";

export class GameOverPhaseHandler implements IPhaseHandler {
  private static readonly GAMEOVER_DURATION_MS = 20000; // 20 seconds

  update(state: GameRoomState, deltaTime: number): ICommand | null {
    state.phaseTimer += deltaTime;

    // Check if game over display period has elapsed
    if (state.phaseTimer >= GameOverPhaseHandler.GAMEOVER_DURATION_MS) {
      console.log(`✓ GameOver timeout reached - Returning to lobby`);
      return new ResetToLobbyCommand(state);
    }

    return null;
  }

  onEnter(state: GameRoomState): void {
    console.log(`✓ Entered GameOver Phase - Winner: ${state.winnerId}`);
    state.phaseTimer = 0;
  }

  onExit(state: GameRoomState): void {
    console.log("✓ Exiting GameOver Phase");
  }
}
