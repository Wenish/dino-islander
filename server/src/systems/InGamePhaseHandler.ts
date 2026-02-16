/**
 * InGame Phase Handler
 * 
 * Responsibilities:
 * - Monitor castle health
 * - Detect win condition (enemy castle destroyed)
 * - Transition to GameOver when someone wins
 * 
 * Design decisions:
 * - Castle health is checked only when damage events occur (event-driven)
 * - First castle to reach 0 health triggers game over
 * - Winner is the player whose castle is still standing
 * 
 * Performance optimizations:
 * - Avoid checking all castles every frame
 * - Use event subscription pattern (future enhancement)
 * - For now: check only when castles array changes
 */

import { IPhaseHandler } from "./IPhaseHandler";
import { ICommand } from "./commands/ICommand";
import { GameRoomState } from "../schema/GameRoomState";
import { EndGameCommand } from "./commands/PhaseCommands";
import { CastleSchema } from "../schema/CastleSchema";
import { AutoSpawnSystem } from "./AutoSpawnSystem";

export class InGamePhaseHandler implements IPhaseHandler {
  private lastCastleHealthCheck: Map<string, number> = new Map();
  private autoSpawnSystem = new AutoSpawnSystem();

  update(state: GameRoomState, deltaTime: number): ICommand | null {
    this.autoSpawnSystem.update(state, deltaTime);

    // Check for castle destruction
    // Performance: Only check castles that have taken damage since last check
    const destroyedCastle = this.checkForDestroyedCastle(state);

    if (destroyedCastle) {
      // Find the winner (player whose castle is NOT destroyed)
      const winner = this.findWinner(state, destroyedCastle);
      
      if (winner) {
        console.log(`✓ Castle destroyed - Winner: ${winner}`);
        return new EndGameCommand(state, winner);
      }
    }

    return null;
  }

  onEnter(state: GameRoomState): void {
    console.log("✓ Entered InGame Phase");
    state.phaseTimer = 0;
    this.autoSpawnSystem.reset();
    
    // Initialize health tracking
    this.lastCastleHealthCheck.clear();
    for (const castle of state.castles) {
      this.lastCastleHealthCheck.set(castle.playerId, castle.health);
    }
  }

  onExit(state: GameRoomState): void {
    console.log("✓ Exiting InGame Phase");
    this.lastCastleHealthCheck.clear();
    this.autoSpawnSystem.reset();
  }

  /**
   * Check if any castle has been destroyed
   * Performance: Only check castles whose health has changed
   */
  private checkForDestroyedCastle(state: GameRoomState): CastleSchema | null {
    for (const castle of state.castles) {
      const lastHealth = this.lastCastleHealthCheck.get(castle.playerId);
      
      // Performance optimization: Only check if health changed
      if (lastHealth !== castle.health) {
        this.lastCastleHealthCheck.set(castle.playerId, castle.health);
        
        if (castle.health <= 0) {
          return castle;
        }
      }
    }
    
    return null;
  }

  /**
   * Find the winning player
   * Winner is the player whose castle is still alive
   */
  private findWinner(state: GameRoomState, destroyedCastle: CastleSchema): string | null {
    for (const castle of state.castles) {
      if (castle.playerId !== destroyedCastle.playerId && castle.health > 0) {
        return castle.playerId;
      }
    }
    
    return null;
  }
}
