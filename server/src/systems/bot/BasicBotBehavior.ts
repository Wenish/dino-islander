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
  // How often to evaluate decisions (ms)
  actionCheckInterval: 1000,
  
  // Spawn timing
  minSpawnDelay: 2200,
  maxSpawnDelay: 4800,
  
  // Modifier switching
  modifierSwitchChance: 0.15,
  urgentCounterSwitchChance: 0.75,
  modifierSwitchCooldown: 12000,
  outnumberedUnitThreshold: 3,
  
  // Unit spawn weights (higher = more likely)
  spawnWeights: {
    [UnitType.Warrior]: 100,  // Prioritize warriors
    [UnitType.Sheep]: 0,    // Some defensive units
    [UnitType.Raptor]: 0,   // Occasional raptors
  } as Partial<Record<UnitType, number>>
};

export class BasicBotBehavior implements IBotBehavior {
  private timeSinceLastDecision: number = 0;
  private timeSinceLastSpawn: number = 0;
  private nextSpawnDelay: number = 0;
  private lastModifierSwitch: number = 0;
  private totalElapsedTime: number = 0;

  constructor() {
    this.reset();
  }

  /**
   * Reset bot state
   */
  reset(): void {
    this.timeSinceLastDecision = 0;
    this.timeSinceLastSpawn = 0;
    this.nextSpawnDelay = this.getRandomSpawnDelay();
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
    this.timeSinceLastDecision += deltaTime;
    this.timeSinceLastSpawn += deltaTime;
    this.totalElapsedTime += deltaTime;

    if (this.timeSinceLastDecision < BOT_CONFIG.actionCheckInterval) {
      return null;
    }
    this.timeSinceLastDecision = 0;

    const primaryEnemy = this.findPrimaryEnemy(botPlayer, state);

    if (this.shouldSwitchModifier(botPlayer, primaryEnemy)) {
      return this.decideSwitchModifier(botPlayer, primaryEnemy);
    }

    if (this.timeSinceLastSpawn < this.nextSpawnDelay) {
      return null;
    }

    this.timeSinceLastSpawn = 0;
    this.nextSpawnDelay = this.getRandomSpawnDelay();
    return this.decideSpawnUnit(botPlayer, state, primaryEnemy);
  }

  /**
   * Check if bot should switch modifiers
   */
  private shouldSwitchModifier(botPlayer: PlayerSchema, enemy: PlayerSchema | null): boolean {
    if (!enemy) {
      return false;
    }

    const timeSinceSwitch = this.totalElapsedTime - this.lastModifierSwitch;
    if (timeSinceSwitch < BOT_CONFIG.modifierSwitchCooldown) {
      return false;
    }

    const desiredCounter = this.getCounterModifier(enemy.modifierId as ModifierType);
    if (botPlayer.modifierId === desiredCounter) {
      return false;
    }

    if (this.isModifierCounteredByEnemy(botPlayer.modifierId as ModifierType, enemy.modifierId as ModifierType)) {
      return Math.random() < BOT_CONFIG.urgentCounterSwitchChance;
    }

    return Math.random() < BOT_CONFIG.modifierSwitchChance;
  }

  /**
   * Decide which modifier to switch to
   */
  private decideSwitchModifier(botPlayer: PlayerSchema, enemy: PlayerSchema | null): BotDecision {
    this.lastModifierSwitch = this.totalElapsedTime;

    const counterModifier = enemy
      ? this.getCounterModifier(enemy.modifierId as ModifierType)
      : this.getCounterModifier(botPlayer.modifierId as ModifierType);

    return {
      type: 'switchModifier',
      modifierId: counterModifier
    };
  }

  /**
   * Decide which unit to spawn based on weights
   */
  private decideSpawnUnit(
    botPlayer: PlayerSchema,
    state: GameRoomState,
    enemy: PlayerSchema | null
  ): BotDecision {
    const { botUnitCount, enemyUnitCount } = this.getUnitPressure(botPlayer, enemy, state);
    const unitType = this.selectWeightedUnitType(botPlayer, enemy, botUnitCount, enemyUnitCount);

    return {
      type: 'spawnUnit',
      unitType
    };
  }

  /**
   * Select a unit type based on configured weights
   */
  private selectWeightedUnitType(
    botPlayer: PlayerSchema,
    enemy: PlayerSchema | null,
    botUnitCount: number,
    enemyUnitCount: number
  ): UnitType {
    const weights: Partial<Record<UnitType, number>> = {
      ...BOT_CONFIG.spawnWeights,
    };

    if (enemy) {
      const botModifier = botPlayer.modifierId as ModifierType;
      const enemyModifier = enemy.modifierId as ModifierType;

      if (this.getCounterModifier(enemyModifier) === botModifier) {
        weights[UnitType.Warrior] = (weights[UnitType.Warrior] ?? 0) + 20;
        weights[UnitType.Raptor] = (weights[UnitType.Raptor] ?? 0) + 10;
        weights[UnitType.Sheep] = Math.max(5, (weights[UnitType.Sheep] ?? 0) - 10);
      } else if (this.getCounterModifier(botModifier) === enemyModifier) {
        weights[UnitType.Sheep] = (weights[UnitType.Sheep] ?? 0) + 15;
        weights[UnitType.Warrior] = Math.max(20, (weights[UnitType.Warrior] ?? 0) - 10);
      }
    }

    const unitDelta = enemyUnitCount - botUnitCount;
    if (unitDelta >= BOT_CONFIG.outnumberedUnitThreshold) {
      weights[UnitType.Warrior] = (weights[UnitType.Warrior] ?? 0) + 25;
      weights[UnitType.Sheep] = (weights[UnitType.Sheep] ?? 0) + 10;
      weights[UnitType.Raptor] = Math.max(5, (weights[UnitType.Raptor] ?? 0) - 10);
    } else if (unitDelta <= -BOT_CONFIG.outnumberedUnitThreshold) {
      weights[UnitType.Raptor] = (weights[UnitType.Raptor] ?? 0) + 15;
    }

    const sanitizedWeights: Partial<Record<UnitType, number>> = {
      [UnitType.Warrior]: Math.max(1, weights[UnitType.Warrior] ?? 1),
      [UnitType.Sheep]: Math.max(1, weights[UnitType.Sheep] ?? 1),
      [UnitType.Raptor]: Math.max(1, weights[UnitType.Raptor] ?? 1),
    };

    const totalWeight = Object.values(sanitizedWeights).reduce((sum, weight) => sum + (weight ?? 0), 0);
    if (totalWeight <= 0) {
      return UnitType.Warrior;
    }
    let random = Math.random() * totalWeight;

    for (const [unitType, weight] of Object.entries(sanitizedWeights)) {
      random -= weight ?? 0;
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

  private findPrimaryEnemy(botPlayer: PlayerSchema, state: GameRoomState): PlayerSchema | null {
    const enemies = state.players.filter((player) => player.id !== botPlayer.id);
    if (enemies.length === 0) {
      return null;
    }

    let primaryEnemy = enemies[0];
    let highestEnemyUnitCount = -1;
    for (const enemy of enemies) {
      const enemyUnitCount = state.units.reduce((count, unit) => {
        return unit.playerId === enemy.id ? count + 1 : count;
      }, 0);

      if (enemyUnitCount > highestEnemyUnitCount) {
        highestEnemyUnitCount = enemyUnitCount;
        primaryEnemy = enemy;
      }
    }

    return primaryEnemy;
  }

  private getUnitPressure(
    botPlayer: PlayerSchema,
    enemy: PlayerSchema | null,
    state: GameRoomState
  ): { botUnitCount: number; enemyUnitCount: number } {
    let botUnitCount = 0;
    let enemyUnitCount = 0;

    for (const unit of state.units) {
      if (unit.playerId === botPlayer.id) {
        botUnitCount += 1;
      } else if (enemy && unit.playerId === enemy.id) {
        enemyUnitCount += 1;
      }
    }

    return { botUnitCount, enemyUnitCount };
  }

  private isModifierCounteredByEnemy(
    botModifier: ModifierType,
    enemyModifier: ModifierType
  ): boolean {
    return this.getCounterModifier(botModifier) === enemyModifier;
  }

  private getCounterModifier(enemyModifier: ModifierType): ModifierType {
    switch (enemyModifier) {
      case ModifierType.Fire:
        return ModifierType.Water;
      case ModifierType.Water:
        return ModifierType.Earth;
      case ModifierType.Earth:
      default:
        return ModifierType.Fire;
    }
  }
}
