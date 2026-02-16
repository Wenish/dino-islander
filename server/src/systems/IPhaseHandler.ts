/**
 * Phase Handler Interface
 * 
 * Each game phase has its own handler that manages:
 * - Phase-specific update logic
 * - Transition conditions
 * - State initialization/cleanup
 * 
 * Design decisions:
 * - Separate handlers for each phase (Single Responsibility Principle)
 * - Handlers return commands for state transitions (Command Pattern)
 * - Handlers are stateless and receive all necessary data as parameters
 * 
 * Performance:
 * - Handlers should avoid unnecessary checks
 * - Use event-driven transitions when possible
 * - Cache expensive calculations
 */

import { ICommand } from "./commands/ICommand";
import { GameRoomState } from "../schema/GameRoomState";

export interface IPhaseHandler {
  /**
   * Update the phase logic
   * @param state Current game state
   * @param deltaTime Time since last update in milliseconds
   * @returns Command to execute for phase transition, or null if no transition
   */
  update(state: GameRoomState, deltaTime: number): ICommand | null;

  /**
   * Called when entering this phase
   * @param state Current game state
   */
  onEnter(state: GameRoomState): void;

  /**
   * Called when exiting this phase
   * @param state Current game state
   */
  onExit(state: GameRoomState): void;
}
