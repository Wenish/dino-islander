/**
 * BasicBotBehavior - Simple AI opponent implementation
 * 
 * Strategy:
 * - Spawns units on a timer
 * - Prioritizes warriors for combat
 * - Spawns support units (sheep) occasionally
 * - Switches modifiers periodically for variety
 * 
 * Design principles:
 * - Deterministic decision-making based on timers
 * - No complex state tracking for simplicity
 * - Easy to tune via constants
 * - Provides reasonable challenge without being unbeatable
 * 
 * Extension points:
 * - Override decideAction() for different strategies
 * - Adjust timing constants for difficulty
 * - Extend with more complex decision trees
 */

import { IBotBehavior, BotDecision } from "./IBotBehavior";
import { GameRoomState } from "../../schema/GameRoomState";
import { PlayerSchema } from "../../schema/PlayerSchema";
import { UnitType } from "../../schema/UnitSchema";
import { ModifierType } from "../modifiers/Modifier";

/**
 * Configuration for bot behavior timing
 */
const BOT_CONFIG = {
  // How often to check for actions (ms)
  actionCheckInterval: 2000,
  
  // Spawn timing
  minSpawnDelay: 3000,
  maxSpawnDelay: 6000,
  
  // Modifier switching
  modifierSwitchChance: 0.15, // 15% chance to switch modifier when considering action
  modifierSwitchCooldown: 10000, // Don't switch modifiers more than once per 10s
  
  // Unit spawn weights (higher = more likely)
  spawnWeights: {
    [UnitType.Warrior]: 70,  // Prioritize warriors
    [UnitType.Sheep]: 20,    // Some defensive units
    [UnitType.Raptor]: 10,   // Occasional raptors
  }
};

export class BasicBotBehavior implements IBotBehavior {
  private timeSinceLastAction: number = 0;
  private nextActionDelay: number = 0;
  private lastModifierSwitch: number = 0;
  private totalElapsedTime: number = 0;

  constructor() {
    this.reset();
  }

  /**
   * Reset bot state
   */
  reset(): void {
    this.timeSinceLastAction = 0;
    this.nextActionDelay = this.getRandomSpawnDelay();
    this.lastModifierSwitch = 0;
    this.totalElapsedTime = 0;
  }

  /**
   * Get behavior name
   */
  getName(): string {
    return "Basic Bot";
  }

  /**
   * Main decision-making logic
   */
  decideAction(
    botPlayer: PlayerSchema,
    state: GameRoomState,
    deltaTime: number
  ): BotDecision | null {
    this.timeSinceLastAction += deltaTime;
    this.totalElapsedTime += deltaTime;

    // Wait until next action interval
    if (this.timeSinceLastAction < this.nextActionDelay) {
      return null;
    }

    // Reset timer for next action
    this.timeSinceLastAction = 0;
    this.nextActionDelay = this.getRandomSpawnDelay();

    // Decide whether to switch modifier (occasionally)
    if (this.shouldSwitchModifier()) {
      return this.decideSwitchModifier(botPlayer);
    }

    // Default: spawn a unit
    return this.decideSpawnUnit(botPlayer, state);
  }

  /**
   * Check if bot should switch modifiers
   */
  private shouldSwitchModifier(): boolean {
    // Check cooldown
    const timeSinceSwitch = this.totalElapsedTime - this.lastModifierSwitch;
    if (timeSinceSwitch < BOT_CONFIG.modifierSwitchCooldown) {
      return false;
    }

    // Random chance to switch
    return Math.random() < BOT_CONFIG.modifierSwitchChance;
  }

  /**
   * Decide which modifier to switch to
   */
  private decideSwitchModifier(botPlayer: PlayerSchema): BotDecision {
    this.lastModifierSwitch = this.totalElapsedTime;

    // Switch to a different modifier
    const modifiers = [ModifierType.Fire, ModifierType.Water, ModifierType.Earth];
    const availableModifiers = modifiers.filter((m: ModifierType) => m !== botPlayer.modifierId);
    const newModifier = availableModifiers[Math.floor(Math.random() * availableModifiers.length)];

    return {
      type: 'switchModifier',
      modifierId: newModifier
    };
  }

  /**
   * Decide which unit to spawn based on weights
   */
  private decideSpawnUnit(botPlayer: PlayerSchema, state: GameRoomState): BotDecision {
    const unitType = this.selectWeightedUnitType();

    return {
      type: 'spawnUnit',
      unitType
    };
  }

  /**
   * Select a unit type based on configured weights
   */
  private selectWeightedUnitType(): UnitType {
    const weights = BOT_CONFIG.spawnWeights;
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (const [unitType, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) {
        return parseInt(unitType) as UnitType;
      }
    }

    // Fallback
    return UnitType.Warrior;
  }

  /**
   * Generate a random delay for next spawn
   */
  private getRandomSpawnDelay(): number {
    const min = BOT_CONFIG.minSpawnDelay;
    const max = BOT_CONFIG.maxSpawnDelay;
    return min + Math.random() * (max - min);
  }
}
