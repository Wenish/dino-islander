/**
 * Unit Archetype Interface
 *
 * Defines the behavior contract for different unit AI archetypes.
 * Each archetype implements distinct behavior patterns (passive, aggressive, etc.)
 *
 * Design Philosophy:
 * - Archetypes are stateless behavior handlers
 * - All state is stored in UnitSchema or AIBehaviorSystem
 * - Archetypes receive context and mutate unit state accordingly
 * - Each archetype is deterministic and performance-optimized
 *
 * Performance:
 * - No allocations in update methods
 * - Reuses MovementSystem queries
 * - State machine approach for efficient branching
 */

import { UnitSchema, GameRoomState } from "../../schema";

/**
 * Unit Archetype Type
 * Defines available behavior archetypes
 */
export enum UnitArchetypeType {
  Passive = "passive",
  Aggressive = "aggressive",
  WildAnimal = "wild_animal",
  Warrior = "warrior",
  // Future: Builder, Gatherer, Defensive, etc.
}

/**
 * Additional AI state data per unit
 * Stored separately from schema to avoid network sync overhead
 */
export interface UnitAIState {
  // Wander behavior
  wanderCooldown: number;

  // Combat behavior
  targetEnemyId?: string;
  targetCastleIndex?: number; // Index of target castle in state.buildings array (filtered for BuildingType.Castle)
  attackCooldown: number;
  lastAttackTick: number;

  // Flee behavior
  fleeCooldown: number;
  fleeTargetX?: number;
  fleeTargetY?: number;

  // Patrol behavior
  patrolTargetX?: number;
  patrolTargetY?: number;

  // Death behavior
  deathTick?: number; // Tick when unit died (health reached 0)
}

/**
 * Update context passed to archetype update methods
 * Contains all necessary information for decision making
 */
export interface ArchetypeUpdateContext {
  unit: UnitSchema;
  state: GameRoomState;
  aiState: UnitAIState;
  deltaTime: number; // Ticks since last update (usually 1)
}

/**
 * Abstract base class for unit archetypes
 * Provides common utility methods and defines behavior contract
 */
export abstract class UnitArchetype {
  /**
   * Unique identifier for this archetype
   */
  abstract readonly type: UnitArchetypeType;

  /**
   * Main update method - called once per tick for each unit
   * Implement unit behavior logic here
   *
   * @param context - Update context with unit, state, and AI state
   */
  abstract update(context: ArchetypeUpdateContext): void;

  /**
   * Initialize AI state for a new unit
   * Called when a unit is first spawned
   *
   * @param unit - The unit being initialized
   * @returns Initial AI state object
   */
  abstract initializeAIState(unit: UnitSchema): UnitAIState;

  /**
   * Called when unit takes damage
   * Allows archetypes to react to damage (e.g., flee, become aggressive)
   *
   * @param context - Update context
   * @param damage - Amount of damage taken
   * @param attackerId - ID of attacker (if known)
   */
  onTakeDamage?(
    context: ArchetypeUpdateContext,
    damage: number,
    attackerId?: string
  ): void;

  /**
   * Called when unit kills another unit
   * Allows archetypes to react to kills (e.g., victory stance, search for next target)
   *
   * @param context - Update context
   * @param killedUnitId - ID of killed unit
   */
  onKillUnit?(context: ArchetypeUpdateContext, killedUnitId: string): void;
}
