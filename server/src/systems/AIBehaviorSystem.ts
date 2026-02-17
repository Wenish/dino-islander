/**
 * AI Behavior System
 *
 * Responsibilities:
 * - Coordinate AI updates for all units
 * - Delegate behavior to archetype-specific handlers
 * - Manage per-unit AI state data
 * - Track unit tick count for cooldowns
 * 
 * Design:
 * - Archetype-based behavior delegation (modular, extensible)
 * - Each unit has an assigned archetype (Passive, Aggressive, etc.)
 * - Archetypes are stateless handlers
 * - AI state is stored separately from schema (network optimization)
 * - Tick-based: AI updates occur once per game tick
 * 
 * Performance notes:
 * - Uses archetype registry for O(1) lookup
 * - Minimal per-tick overhead
 * - AI state stored in Map for fast access
 * - No allocations in hot path
 */

import { GameRoomState, UnitSchema, UnitBehaviorState } from "../schema";
import {
  getArchetypeRegistry,
  UnitAIState,
  ArchetypeUpdateContext,
  UnitArchetypeType,
} from "./archetypes";
import { GAME_CONFIG } from "../config/gameConfig";
import { CombatSystem } from "./CombatSystem";

export class AIBehaviorSystem {
  /**
   * Internal state tracking for units
   * Stores per-unit AI metadata (not synced to clients)
   */
  private static unitAIState = new Map<string, UnitAIState>();

  /**
   * Current game tick counter (for cooldown calculations)
   */
  private static currentTick: number = 0;

  /**
   * Update AI for a single unit
   * Called once per tick
   * 
   * @param unit - The unit to update
   * @param state - Current game room state
   */
  static updateUnitAI(unit: UnitSchema, state: GameRoomState): void {
    // Initialize AI state if not yet created
    if (!this.unitAIState.has(unit.id)) {
      this.initializeUnitAI(unit);
    }

    const aiState = this.unitAIState.get(unit.id)!;

    // Get archetype handler
    const archetypeType = this.mapSchemaArchetypeToArchetypeType(unit.archetype);
    const archetype = getArchetypeRegistry().getArchetype(archetypeType);

    if (!archetype) {
      console.warn(
        `No archetype handler found for unit ${unit.id} with archetype ${archetypeType}`
      );
      return;
    }

    // Create update context
    const context: ArchetypeUpdateContext = {
      unit,
      state,
      aiState,
      deltaTime: 1, // Always 1 tick
    };

    // Delegate to archetype
    if (this.currentTick % 180 === 0) {
      console.log(`[Unit ${unit.id}] state=${UnitBehaviorState[unit.behaviorState]} pos=(${unit.x.toFixed(1)}, ${unit.y.toFixed(1)})`);
    }
    
    archetype.update(context);
  }

  /**
   * Initialize AI state for a new unit
   * 
   * @param unit - The unit to initialize
   */
  private static initializeUnitAI(unit: UnitSchema): void {
    const archetypeType = this.mapSchemaArchetypeToArchetypeType(unit.archetype);
    const archetype = getArchetypeRegistry().getArchetype(archetypeType);

    if (!archetype) {
      console.warn(
        `Cannot initialize AI for unit ${unit.id}: archetype ${archetypeType} not found`
      );
      // Create default state
      this.unitAIState.set(unit.id, {
        wanderCooldown: 0,
        attackCooldown: 0,
        lastAttackTick: 0,
        fleeCooldown: 0,
        deathTick: undefined,
      });
      return;
    }

    // Use archetype's initialization
    const aiState = archetype.initializeAIState(unit);
    this.unitAIState.set(unit.id, aiState);
  }

  /**
   * Update AI for all units in the game state
   * Called once per game tick
   * 
   * @param state - Current game room state
   */
  static updateAllUnitsAI(state: GameRoomState): void {
    this.currentTick++;
    CombatSystem.beginTick(state, this.currentTick);

    for (const unit of state.units) {
      // Handle dead units
      if (unit.health <= 0) {
        const aiState = this.unitAIState.get(unit.id);
        
        // Mark death time if not already marked
        if (aiState && aiState.deathTick === undefined) {
          aiState.deathTick = this.currentTick;
        }
        
        // Skip AI updates for dead units
        continue;
      }

      this.updateUnitAI(unit, state);
    }

    // Clean up dead units after delay
    this.cleanupDeadUnits(state);
  }

  /**
   * Remove units that have been dead for longer than the cleanup delay
   * Called once per tick
   * 
   * @param state - Current game room state
   */
  private static cleanupDeadUnits(state: GameRoomState): void {
    const unitsToRemove: string[] = [];

    // Find units ready for removal
    for (let i = state.units.length - 1; i >= 0; i--) {
      const unit = state.units[i];
      
      if (unit.health <= 0) {
        const aiState = this.unitAIState.get(unit.id);
        
        if (aiState?.deathTick !== undefined) {
          const ticksSinceDeath = this.currentTick - aiState.deathTick;
          
          if (ticksSinceDeath >= GAME_CONFIG.unitDeathCleanupDelay) {
            unitsToRemove.push(unit.id);
            state.units.splice(i, 1);
          }
        }
      }
    }

    // Clean up AI state for removed units
    for (const unitId of unitsToRemove) {
      this.cleanupUnitState(unitId);
    }

    if (unitsToRemove.length > 0) {
      console.log(`✓ Cleaned up ${unitsToRemove.length} dead unit(s)`);
    }
  }

  /**
   * Notify AI system that a unit took damage
   * Allows archetypes to react (e.g., flee)
   * 
   * @param unit - The damaged unit
   * @param state - Current game state
   * @param damage - Amount of damage taken
   * @param attackerId - ID of attacker (if known)
   */
  static notifyUnitDamaged(
    unit: UnitSchema,
    state: GameRoomState,
    damage: number,
    attackerId?: string
  ): void {
    const aiState = this.unitAIState.get(unit.id);
    if (!aiState) {
      return;
    }

    const archetypeType = this.mapSchemaArchetypeToArchetypeType(unit.archetype);
    const archetype = getArchetypeRegistry().getArchetype(archetypeType);

    if (archetype && archetype.onTakeDamage) {
      const context: ArchetypeUpdateContext = {
        unit,
        state,
        aiState,
        deltaTime: 1,
      };
      archetype.onTakeDamage(context, damage, attackerId);
    }
  }

  /**
   * Notify AI system that a unit killed another unit
   * Allows archetypes to react (e.g., search for next target)
   * 
   * @param killerUnit - The unit that got the kill
   * @param state - Current game state
   * @param killedUnitId - ID of killed unit
   */
  static notifyUnitKilled(
    killerUnit: UnitSchema,
    state: GameRoomState,
    killedUnitId: string
  ): void {
    const aiState = this.unitAIState.get(killerUnit.id);
    if (!aiState) {
      return;
    }

    const archetypeType = this.mapSchemaArchetypeToArchetypeType(killerUnit.archetype);
    const archetype = getArchetypeRegistry().getArchetype(archetypeType);

    if (archetype && archetype.onKillUnit) {
      const context: ArchetypeUpdateContext = {
        unit: killerUnit,
        state,
        aiState,
        deltaTime: 1,
      };
      archetype.onKillUnit(context, killedUnitId);
    }
  }

  /**
   * Clean up AI state for removed units
   * (Prevents memory leaks)
   */
  static cleanupUnitState(unitId: string): void {
    this.unitAIState.delete(unitId);
  }

  /**
   * Get current tick count
   */
  static getCurrentTick(): number {
    return this.currentTick;
  }

  /**
   * Get AI state for a unit (for debugging)
   */
  static getUnitAIState(unitId: string): UnitAIState | undefined {
    return this.unitAIState.get(unitId);
  }

  /**
   * Map schema archetype enum to archetype type string
   * This allows decoupling schema from archetype implementation
   */
  private static mapSchemaArchetypeToArchetypeType(
    schemaArchetype: number
  ): UnitArchetypeType {
    // Import UnitArchetype enum from schema
    const { UnitArchetype } = require("../schema/UnitSchema");
    
    switch (schemaArchetype) {
      case UnitArchetype.Passive:
        return UnitArchetypeType.Passive;
      case UnitArchetype.Aggressive:
        return UnitArchetypeType.Aggressive;
      case UnitArchetype.WildAnimal:
        return UnitArchetypeType.WildAnimal;
      case UnitArchetype.Warrior:
        return UnitArchetypeType.Warrior;
      default:
        console.warn(`Unknown archetype: ${schemaArchetype}, defaulting to Passive`);
        return UnitArchetypeType.Passive;
    }
  }
}
