/**
 * Command Pattern Interface
 * 
 * Commands encapsulate actions as objects, allowing for:
 * - Delayed execution
 * - Queueing
 * - Undo/redo (if needed)
 * - Logging and debugging
 * - Separation of concerns
 * 
 * Performance: Commands should be lightweight and reusable where possible
 */

export interface ICommand {
  /**
   * Execute the command
   * @returns true if the command succeeded, false otherwise
   */
  execute(): boolean;
}
