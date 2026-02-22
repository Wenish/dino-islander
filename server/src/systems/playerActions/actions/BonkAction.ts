import { GameRoomState, UnitSchema } from "../../../schema";
import { ACTION_CONFIG } from "../../../config/actionConfig";
import { CombatSystem } from "../../CombatSystem";
import { MovementSystem } from "../../MovementSystem";
import { ModifierSystem } from "../../modifiers";
import { IPlayerAction, PlayerActionMessage } from "../PlayerActionTypes";
import { AIBehaviorSystem } from "../../AIBehaviorSystem";

/**
 * BonkAction — Hammer Slam
 *
 * The player slams the ground at a coordinate, dealing AoE modifier-based
 * damage and knockback to all enemy units within the radius.
 */
export class BonkAction implements IPlayerAction {
  readonly cooldownMs = ACTION_CONFIG.bonkCooldownMs;

  constructor(private readonly broadcast: (event: string, data: unknown) => void) {}

  execute(playerId: string, data: PlayerActionMessage, state: GameRoomState): boolean {
    const { x, y } = data;
    if (x == null || y == null) return false;

    const player = state.players.find(p => p.id === playerId);
    if (!player) return false;

    const currentPhaseTimeMs = state.timePastInThePhase;
    const phaseTimeWentBackwards = currentPhaseTimeMs < player.lastHammerHitTimeInPhaseMs;
    if (phaseTimeWentBackwards) {
      player.lastHammerHitTimeInPhaseMs = -ACTION_CONFIG.bonkCooldownMs;
    }

    const elapsedSinceLastHammerHitMs = currentPhaseTimeMs - player.lastHammerHitTimeInPhaseMs;
    if (elapsedSinceLastHammerHitMs < ACTION_CONFIG.bonkCooldownMs) {
      console.log(`Hammer hit on cooldown for ${playerId}: ${elapsedSinceLastHammerHitMs.toFixed(0)} ms elapsed`);
      return false;
    }

    player.lastHammerHitTimeInPhaseMs = currentPhaseTimeMs;
    this.applyBonkDamage(playerId, x, y, player.modifierId, state);
    this.broadcast('hammerHit', { x, y, playerId });
    return true;
  }

  private applyBonkDamage(
    playerId: string,
    x: number,
    y: number,
    modifierId: number,
    state: GameRoomState
  ): void {
    const unitsInRange = CombatSystem
      .queryUnitsInRange(state, x, y, ACTION_CONFIG.bonkRadius)
      .sort((unitA, unitB) => {
        const dxA = unitA.x - x;
        const dyA = unitA.y - y;
        const dxB = unitB.x - x;
        const dyB = unitB.y - y;
        return (dxA * dxA + dyA * dyA) - (dxB * dxB + dyB * dyB);
      })
      .slice(0, ACTION_CONFIG.bonkMaxHits);

    for (const unit of unitsInRange) {
      if (unit.health <= 0) continue;

      const multiplier = ModifierSystem.getModifierMultiplier(modifierId, unit.modifierId);
      const finalDamage = Math.max(1, Math.round(ACTION_CONFIG.bonkDamage * multiplier));

      unit.health = Math.max(0, unit.health - finalDamage);
      AIBehaviorSystem.notifyUnitDamaged(unit, state, finalDamage, playerId);

      if (unit.health > 0) {
        this.applyBonkKnockback(x, y, unit, state);
      }
    }
  }

  /**
   * Push unit away from the bonk center point.
   * Similar to CombatSystem.applyKnockback but uses a coordinate as source.
   */
  private applyBonkKnockback(
    centerX: number,
    centerY: number,
    target: UnitSchema,
    state: GameRoomState
  ): void {
    const dx = target.x - centerX;
    const dy = target.y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) return;

    const dirX = dx / dist;
    const dirY = dy / dist;
    const knockbackDist = Math.min(
      ACTION_CONFIG.bonkKnockbackPower / (target.weight || 1),
      ACTION_CONFIG.bonkMaxKnockback
    );

    for (let d = knockbackDist; d > 0; d -= ACTION_CONFIG.bonkKnockbackStep) {
      const newX = target.x + dirX * d;
      const newY = target.y + dirY * d;

      const metadata = MovementSystem.isPositionWalkable(state, newX, newY, { unitRadius: target.radius });
      if (metadata.isWalkable) {
        target.x = newX;
        target.y = newY;
        return;
      }
    }
  }
}
