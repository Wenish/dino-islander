/**
 * Lobby Phase Handler
 * 
 * Responsibilities:
 * - Wait for minimum number of players (2)
 * - Start countdown when ready
 * - Transition to InGame when countdown completes
 * 
 * Design decisions:
 * - Countdown only starts when player count requirement is met
 * - Timer resets if players leave during countdown
 * - No game logic runs during lobby phase
 * 
 * Performance:
 * - Only checks player count when it changes (event-driven)
 * - Countdown is timer-based, not checked every frame
 */

import { IPhaseHandler } from "./IPhaseHandler";
import { ICommand } from "./commands/ICommand";
import { GameRoomState } from "../schema/GameRoomState";
import { StartGameCommand } from "./commands/PhaseCommands";

export class LobbyPhaseHandler implements IPhaseHandler {
  private static readonly REQUIRED_PLAYERS = 2;
  private static readonly COUNTDOWN_DURATION_MS = 3000; // 3 seconds
  
  private isCountdownActive: boolean = false;

  update(state: GameRoomState, deltaTime: number): ICommand | null {
    const currentPlayerCount = state.players.length;

    // Check if we have enough players to start countdown
    if (currentPlayerCount >= LobbyPhaseHandler.REQUIRED_PLAYERS) {
      if (!this.isCountdownActive) {
        this.startCountdown(state);
      }

      // Update countdown timer
      state.phaseTimer += deltaTime;

      // Check if countdown completed
      if (state.phaseTimer >= LobbyPhaseHandler.COUNTDOWN_DURATION_MS) {
        console.log(`✓ Countdown complete - Starting game`);
        return new StartGameCommand(state);
      }
    } else {
      // Not enough players - cancel countdown if active
      if (this.isCountdownActive) {
        this.cancelCountdown(state);
      }
    }

    return null;
  }

  onEnter(state: GameRoomState): void {
    console.log("✓ Entered Lobby Phase");
    state.phaseTimer = 0;
    this.isCountdownActive = false;
  }

  onExit(state: GameRoomState): void {
    console.log("✓ Exiting Lobby Phase");
    this.isCountdownActive = false;
  }

  private startCountdown(state: GameRoomState): void {
    this.isCountdownActive = true;
    state.phaseTimer = 0;
    console.log(`✓ Countdown started - ${LobbyPhaseHandler.COUNTDOWN_DURATION_MS / 1000}s until game start`);
  }

  private cancelCountdown(state: GameRoomState): void {
    this.isCountdownActive = false;
    state.phaseTimer = 0;
    console.log(`✗ Countdown cancelled - Not enough players`);
  }
}
