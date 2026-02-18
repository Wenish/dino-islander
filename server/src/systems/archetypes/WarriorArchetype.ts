/**
 * Warrior Archetype
 *
 * Behavior Profile:
 * - Combat-oriented unit (e.g., Warriors, Spears)
 * - Spawns and immediately seeks the nearest enemy castle
 * - Pre-computes a collision-avoiding path to the castle (A* with unit radius as margin)
 * - Detects nearby enemies while moving and chases them before attacking
 * - After combat, returns to castle objective
 *
 * States:
 * - Spawning:  Initial state — find castle and begin moving
 * - Idle:      No castle found, waiting
 * - Moving:    Walking toward castle along pre-computed path
 * - Chasing:   Enemy detected — moving toward target; transitions to Attacking when in range
 * - Attacking: In attack range of a unit or castle, dealing damage
 *
 * Flow:
 *   Spawn → find castle → compute path → Moving
 *     → enemy unit detected within detectEnemyRange → Chasing
 *       → target in attack range → Attacking → target dead/invalid → Idle
 *       → target invalid → Idle
 *     → castle enters attack range → Attacking → dead/invalid → Idle
 *
 * Movement:
 * - Castle path computed once when entering Moving via startMovingToCastle()
 * - Followed step-by-step until state changes (recomputed on next Moving entry)
 * - Chase uses direct movement toward the enemy (short range, target moves)
 */

import {
  UnitArchetype,
  UnitArchetypeType,
  UnitAIState,
  ArchetypeUpdateContext,
} from "./UnitArchetype";
import { UnitSchema, UnitBehaviorState } from "../../schema";
import { MovementService } from "../services/MovementService";
import { CombatSystem } from "../CombatSystem";
import { BuildingType } from "../../schema/BuildingSchema";
import { PlayerStatsSystem } from "../PlayerStatsSystem";
import { PathfindingSystem, PathResult } from "../PathfindingSystem";

/**
 * Configuration for warrior behavior
 */
export const WARRIOR_CONFIG = {
  detectEnemyRange: 3.0, // Detection range for nearby enemies
  attackRange: 0.3,      // Attack range in tiles
  attackDamage: 2,       // Damage per attack on unit
  castleDamage: 2,       // Damage per attack on castle
  attackCooldown: 60,    // Ticks between attacks (1 second at 60 tick/s)
};

/**
 * Behavior state mappings for warrior units
 */
const WarriorBehaviorState = {
  Spawning:  UnitBehaviorState.Spawning,
  Idle:      UnitBehaviorState.Idle,
  Moving:    UnitBehaviorState.Moving,
  Chasing:   UnitBehaviorState.Chasing,
  Attacking: UnitBehaviorState.Attacking,
};

export class WarriorArchetype extends UnitArchetype {
  readonly type = UnitArchetypeType.Warrior;

  /**
   * Pre-computed A* paths per unit.
   * Stored as { steps, cursor } so path following is O(1) per tick
   * (cursor advances rather than shift()-ing the array).
   * Cleared and recomputed each time Moving is re-entered.
   */
  private readonly unitPaths = new WeakMap<UnitSchema, { steps: PathResult[]; cursor: number }>();

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  initializeAIState(unit: UnitSchema): UnitAIState {
    return {
      wanderCooldown: 0,
      attackCooldown: 0,
      lastAttackTick: 0,
      fleeCooldown: 0,
      deathTick: undefined,
    };
  }

  update(context: ArchetypeUpdateContext): void {
    const { unit, aiState } = context;

    switch (unit.behaviorState) {
      case WarriorBehaviorState.Spawning:
        this.handleSpawning(context);
        break;

      case WarriorBehaviorState.Idle:
        this.handleIdle(context);
        break;

      case WarriorBehaviorState.Moving:
        this.handleMoving(context);
        break;

      case WarriorBehaviorState.Chasing:
        this.handleChasing(context);
        break;

      case WarriorBehaviorState.Attacking:
        if (aiState.targetEnemyId) {
          this.handleAttacking(context);
        } else if (aiState.targetCastleIndex !== undefined) {
          this.handleAttackingCastle(context);
        } else {
          unit.behaviorState = WarriorBehaviorState.Idle;
        }
        break;
    }

    if (aiState.attackCooldown > 0) {
      aiState.attackCooldown--;
    }
  }

  // ─── State Handlers ──────────────────────────────────────────────────────────

  /**
   * Spawning: find the nearest enemy castle and begin moving.
   */
  handleSpawning(context: ArchetypeUpdateContext): void {
    const { unit } = context;
    const castleIndex = this.findNearestEnemyCastle(context);
    if (castleIndex !== null) {
      this.startMovingToCastle(context, castleIndex);
      return;
    }
    unit.behaviorState = WarriorBehaviorState.Idle;
  }

  /**
   * Idle: re-scan for a castle and resume moving, or stay idle.
   */
  private handleIdle(context: ArchetypeUpdateContext): void {
    const { unit } = context;
    const castleIndex = this.findNearestEnemyCastle(context);
    if (castleIndex !== null) {
      this.startMovingToCastle(context, castleIndex);
      return;
    }
    unit.behaviorState = WarriorBehaviorState.Idle;
  }

  /**
   * Moving:
   *   1. Validate castle target is still alive.
   *   2. If an enemy unit is detected within detectEnemyRange → chase it.
   *   3. If the castle target is within attack range → attack it directly.
   *   4. Otherwise follow the pre-computed path toward the castle.
   */
  private handleMoving(context: ArchetypeUpdateContext): void {
    const { unit, state, aiState } = context;

    // Validate castle target
    if (aiState.targetCastleIndex !== undefined) {
      const targetCastle = state.buildings[aiState.targetCastleIndex];
      if (!targetCastle || targetCastle.health <= 0) {
        aiState.targetCastleIndex = undefined;
        this.unitPaths.delete(unit);
        unit.behaviorState = WarriorBehaviorState.Idle;
        return;
      }
    }

    // Enemy unit detected — begin chasing
    const enemy = this.findNearestEnemy(context);
    if (enemy) {
      aiState.targetEnemyId = enemy.id;
      unit.behaviorState = WarriorBehaviorState.Chasing;
      return;
    }

    // Castle within attack range — attack directly (castles don't move)
    if (aiState.targetCastleIndex !== undefined) {
      const castle = state.buildings[aiState.targetCastleIndex];
      if (castle && castle.health > 0) {
        if (CombatSystem.isInAttackRangeOf(unit, castle, WARRIOR_CONFIG.attackRange)) {
          unit.behaviorState = WarriorBehaviorState.Attacking;
          return;
        }
      }
    }

    // Nothing to engage — continue along the pre-computed path
    this.moveAlongPath(context);
  }

  /**
   * Chasing:
   *   - Moves toward the target enemy each tick.
   *   - Transitions to Attacking when within attack range.
   *   - Transitions to Idle if the target becomes invalid (dead or gone).
   */
  private handleChasing(context: ArchetypeUpdateContext): void {
    const { unit, state, aiState } = context;

    const target = aiState.targetEnemyId
      ? CombatSystem.getUnitById(state, aiState.targetEnemyId)
      : null;

    if (!target || target.health <= 0) {
      aiState.targetEnemyId = undefined;
      unit.behaviorState = WarriorBehaviorState.Idle;
      return;
    }

    if (CombatSystem.isInAttackRangeOf(unit, target, WARRIOR_CONFIG.attackRange)) {
      unit.behaviorState = WarriorBehaviorState.Attacking;
      return;
    }

    // Move directly toward the target (short range, target moves each tick)
    unit.targetX = target.x;
    unit.targetY = target.y;
    MovementService.updateUnitMovementWithRetry(unit, state, unit.moveSpeed);
  }

  /**
   * Attacking (unit target):
   *   - Verify target is alive and still in range.
   *   - If not: give up and return to Idle (re-finds castle).
   *   - Otherwise attack on cooldown.
   */
  private handleAttacking(context: ArchetypeUpdateContext): void {
    const { unit, state, aiState } = context;

    const target = aiState.targetEnemyId
      ? CombatSystem.getUnitById(state, aiState.targetEnemyId)
      : null;

    if (!target || target.health <= 0) {
      aiState.targetEnemyId = undefined;
      unit.behaviorState = WarriorBehaviorState.Idle;
      return;
    }

    // Out of range — no chasing, return to castle objective
    if (!CombatSystem.isInAttackRangeOf(unit, target, WARRIOR_CONFIG.attackRange)) {
      aiState.targetEnemyId = undefined;
      unit.behaviorState = WarriorBehaviorState.Idle;
      return;
    }

    if (aiState.attackCooldown <= 0) {
      const result = CombatSystem.attackUnit(unit, target, WARRIOR_CONFIG.attackDamage);
      if (result.success) {
        aiState.attackCooldown = WARRIOR_CONFIG.attackCooldown;

        if (!result.targetKilled) {
          CombatSystem.applyKnockback(unit, target, state);
        }

        if (result.targetKilled) {
          if (result.attackerPlayerId) {
            PlayerStatsSystem.incrementMinionsKilled(state, result.attackerPlayerId);
          }
          this.onKillUnit?.(context);
        }
      }
    }
  }

  /**
   * Attacking (castle target):
   *   - Verify castle is still a valid target.
   *   - If in attack range: deal damage.
   *   - If out of range (e.g., knocked back): recompute path and re-enter Moving.
   */
  private handleAttackingCastle(context: ArchetypeUpdateContext): void {
    const { unit, state, aiState } = context;

    if (
      aiState.targetCastleIndex === undefined ||
      aiState.targetCastleIndex >= state.buildings.length
    ) {
      aiState.targetCastleIndex = undefined;
      unit.behaviorState = WarriorBehaviorState.Idle;
      return;
    }

    const targetCastle = state.buildings[aiState.targetCastleIndex];

    if (targetCastle.buildingType !== BuildingType.Castle) {
      aiState.targetCastleIndex = undefined;
      unit.behaviorState = WarriorBehaviorState.Idle;
      return;
    }

    if (targetCastle.health <= 0) {
      aiState.targetCastleIndex = undefined;
      unit.behaviorState = WarriorBehaviorState.Idle;
      return;
    }

    if (
      targetCastle.playerId &&
      targetCastle.playerId !== "" &&
      targetCastle.playerId === unit.playerId
    ) {
      aiState.targetCastleIndex = undefined;
      unit.behaviorState = WarriorBehaviorState.Idle;
      return;
    }

    if (CombatSystem.isInAttackRangeOf(unit, targetCastle, WARRIOR_CONFIG.attackRange)) {
      // In range — attack on cooldown
      if (aiState.attackCooldown <= 0) {
        targetCastle.health = Math.max(0, targetCastle.health - WARRIOR_CONFIG.castleDamage);
        aiState.attackCooldown = WARRIOR_CONFIG.attackCooldown;

        if (targetCastle.health <= 0) {
          aiState.targetCastleIndex = undefined;
          unit.behaviorState = WarriorBehaviorState.Idle;
        }
      }
      return;
    }

    // Out of range (e.g., knocked back) — recompute path and resume moving
    this.startMovingToCastle(context, aiState.targetCastleIndex);
  }

  // ─── Kill Callback ───────────────────────────────────────────────────────────

  onKillUnit(context: ArchetypeUpdateContext): void {
    const { unit, aiState } = context;
    aiState.targetEnemyId = undefined;
    unit.behaviorState = WarriorBehaviorState.Idle;
  }

  // ─── Movement ────────────────────────────────────────────────────────────────

  /**
   * Begin moving toward a castle:
   *   1. Locate the castle position.
   *   2. Compute a full A* path from the unit's current position,
   *      using unit.radius as the collision margin.
   *   3. Store the path — it is followed until the state changes again.
   *   4. Transition to Moving.
   */
  private startMovingToCastle(context: ArchetypeUpdateContext, targetCastleIndex: number): void {
    const { unit, state, aiState } = context;
    const targetCastle = state.buildings[targetCastleIndex];

    aiState.targetCastleIndex = targetCastleIndex;
    unit.targetX = targetCastle.x;
    unit.targetY = targetCastle.y;

    // Pre-compute collision-avoiding path (unit.radius = margin around obstacles)
    const path = PathfindingSystem.findPath(
      state,
      unit.x,
      unit.y,
      targetCastle.x,
      targetCastle.y,
      unit.radius
    );

    // Store path (empty steps = no path found, falls back to direct movement)
    this.unitPaths.set(unit, { steps: path ?? [], cursor: 0 });

    unit.behaviorState = WarriorBehaviorState.Moving;
  }

  /**
   * Follow the pre-computed path step by step.
   *   - Advances past steps the unit has already reached.
   *   - Moves toward the next upcoming step.
   *   - Falls back to direct movement when the path is exhausted (near castle).
   */
  private moveAlongPath(context: ArchetypeUpdateContext): void {
    const { unit, state } = context;
    const pathState = this.unitPaths.get(unit);

    if (!pathState || pathState.cursor >= pathState.steps.length) {
      // No path or exhausted — move directly toward the stored target (castle position)
      MovementService.updateUnitMovementWithRetry(unit, state, unit.moveSpeed);
      return;
    }

    // Advance cursor past steps already reached (O(1) per tick, no array mutation)
    const curTileX = Math.floor(unit.x);
    const curTileY = Math.floor(unit.y);
    while (
      pathState.cursor < pathState.steps.length &&
      pathState.steps[pathState.cursor].x === curTileX &&
      pathState.steps[pathState.cursor].y === curTileY
    ) {
      pathState.cursor++;
    }

    if (pathState.cursor >= pathState.steps.length) {
      // Path fully consumed — should be adjacent to castle, use direct movement
      MovementService.updateUnitMovementWithRetry(unit, state, unit.moveSpeed);
      return;
    }

    // Step toward the center of the next tile in the pre-computed path.
    // Using +0.5 (tile center) keeps the unit away from tile edges, ensuring
    // the radius-aware walkability check doesn't clip into adjacent tiles.
    const nextStep = pathState.steps[pathState.cursor];
    unit.targetX = nextStep.x + 0.5;
    unit.targetY = nextStep.y + 0.5;
    MovementService.updateUnitMovement(unit, state, unit.moveSpeed);
  }

  // ─── Target Search ───────────────────────────────────────────────────────────

  /**
   * Find the nearest enemy unit within detectEnemyRange.
   */
  private findNearestEnemy(context: ArchetypeUpdateContext): UnitSchema | null {
    const { unit, state } = context;
    return CombatSystem.findClosestEnemy(state, unit, WARRIOR_CONFIG.detectEnemyRange);
  }

  /**
   * Find the nearest enemy castle on the entire map.
   * Returns the index into state.buildings, or null if none found.
   */
  private findNearestEnemyCastle(context: ArchetypeUpdateContext): number | null {
    const { unit, state } = context;

    let closestIndex: number | null = null;
    let closestDistance = Infinity;

    for (let i = 0; i < state.buildings.length; i++) {
      const building = state.buildings[i];

      if (building.buildingType !== BuildingType.Castle) continue;
      if (building.health <= 0) continue;

      // Skip our own castle
      if (building.playerId && building.playerId !== "" && building.playerId === unit.playerId) {
        continue;
      }

      const distance = CombatSystem.getManhattanDistance(
        unit.x, unit.y,
        building.x, building.y
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    }

    return closestIndex;
  }
}
