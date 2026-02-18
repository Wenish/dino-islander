/**
 * Phase Manager System
 * 
 * Orchestrates game phase transitions and delegates update logic to phase handlers.
 * 
 * Responsibilities:
 * - Manage current phase handler
 * - Execute phase transitions via commands
 * - Coordinate phase lifecycle (onEnter/onExit)
 * - Provide single entry point for phase management
 * 
 * Design decisions:
 * - Uses Strategy Pattern (different handlers for different phases)
 * - Uses Command Pattern for state transitions
 * - Stateless - all state is in GameRoomState
 * - Thread-safe (no shared mutable state)
 * 
 * Performance:
 * - Phase handlers are instantiated once and reused
 * - No allocations during update loop
 * - Commands are lightweight objects
 */

import { GameRoomState, GamePhase } from "../schema/GameRoomState";
import { IPhaseHandler } from "./IPhaseHandler";
import { LobbyPhaseHandler } from "./LobbyPhaseHandler";
import { InGamePhaseHandler } from "./InGamePhaseHandler";
import { GameOverPhaseHandler } from "./GameOverPhaseHandler";

export class PhaseManager {
  private phaseHandlers: Map<GamePhase, IPhaseHandler>;
  private currentHandler: IPhaseHandler;

  constructor() {
    // Initialize all phase handlers (reused throughout game lifecycle)
    this.phaseHandlers = new Map([
      [GamePhase.Lobby, new LobbyPhaseHandler()],
      [GamePhase.InGame, new InGamePhaseHandler()],
      [GamePhase.GameOver, new GameOverPhaseHandler()],
    ]);

    // Start in lobby phase
    this.currentHandler = this.phaseHandlers.get(GamePhase.Lobby)!;
  }

  /**
   * Initialize the phase manager with a game state
   * Must be called after GameRoomState is created
   */
  initialize(state: GameRoomState): void {
    this.currentHandler = this.phaseHandlers.get(state.gamePhase)!;
    state.timePastInThePhase = 0;
    this.currentHandler.onEnter(state);
  }

  /**
   * Update the current phase
   * Executes phase-specific logic and handles transitions
   * 
   * Performance: Only executes logic for current phase
   */
  update(state: GameRoomState, deltaTime: number): void {
    // Get the current phase handler
    const handler = this.phaseHandlers.get(state.gamePhase);
    
    if (!handler) {
      console.error(`No handler found for phase: ${state.gamePhase}`);
      return;
    }

    // Update current phase and check for transition command
    const command = handler.update(state, deltaTime);

    // Execute transition if command was returned
    if (command) {
      this.executePhaseTransition(state, handler, command);
    }

    // Update phase timer
    state.timePastInThePhase += deltaTime;
  }

  /**
   * Execute a phase transition command
   * Handles phase lifecycle callbacks (onExit/onEnter)
   */
  private executePhaseTransition(
    state: GameRoomState,
    currentHandler: IPhaseHandler,
    command: any
  ): void {
    const previousPhase = state.gamePhase;

    // Exit current phase
    currentHandler.onExit(state);

    // Execute the transition command
    const success = command.execute();

    if (!success) {
      console.error("Phase transition command failed");
      return;
    }

    // Enter new phase
    const newHandler = this.phaseHandlers.get(state.gamePhase);
    if (newHandler) {
      state.timePastInThePhase = 0;
      newHandler.onEnter(state);
      this.currentHandler = newHandler;
    } else {
      console.error(`No handler found for new phase: ${state.gamePhase}`);
    }

    console.log(`✓ Phase transition: ${GamePhase[previousPhase]} → ${GamePhase[state.gamePhase]}`);
  }

  /**
   * Manually execute a phase transition command
   * Used for external events (e.g., player disconnect during game)
   * Properly handles phase lifecycle callbacks
   */
  executeCommand(state: GameRoomState, command: any): void {
    const currentHandler = this.phaseHandlers.get(state.gamePhase);
    if (!currentHandler) {
      console.error(`No handler found for current phase: ${state.gamePhase}`);
      return;
    }
    this.executePhaseTransition(state, currentHandler, command);
  }

  /**
   * Handle player join event
   * Notifies the current phase handler if needed
   */
  onPlayerJoin(state: GameRoomState): void {
    // Lobby phase needs to know about player joins for countdown
    if (state.gamePhase === GamePhase.Lobby) {
      console.log(`✓ Player joined - Total players: ${state.players.length}`);
    }
  }

  /**
   * Handle player leave event
   * May trigger phase transitions (e.g., cancel lobby countdown)
   */
  onPlayerLeave(state: GameRoomState): void {
    console.log(`✗ Player left - Total players: ${state.players.length}`);
    
    // If in-game and a player leaves, could end the game
    // For now, we'll let the game continue
    // Future: Could add forfeit logic here
  }
}
