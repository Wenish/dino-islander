import { GameRoomState } from "../../../schema";
import { ACTION_CONFIG } from "../../../config/actionConfig";
import { CombatSystem } from "../../CombatSystem";
import { MovementSystem } from "../../MovementSystem";
import { ModifierSystem } from "../../modifiers";
import { IPlayerAction, BonkActionData } from "../PlayerActionTypes";

/**
 * BonkAction — Hammer Slam
 *
 * The player slams the ground at a coordinate, dealing AoE modifier-based
 * damage and knockback to all enemy units within the radius.
 */
export class BonkAction implements IPlayerAction<BonkActionData> {
  execute(playerId: string, data: BonkActionData, state: GameRoomState): boolean {
    const { x, y } = data;
    if (x == null || y == null) return false;

    const player = state.players.find(p => p.id === playerId);
    if (!player) return false;

    const radius = ACTION_CONFIG.bonkRadius;
    const baseDamage = ACTION_CONFIG.bonkDamage;

    // Find all units in the bonk radius
    const unitsInRange = CombatSystem.queryUnitsInRange(state, x, y, radius);

    for (const unit of unitsInRange) {
      // Only hit enemy units
      if (unit.playerId === playerId) continue;
      if (unit.health <= 0) continue;

      // Modifier-based damage: player modifier vs unit modifier
      const multiplier = ModifierSystem.getModifierMultiplier(player.modifierId, unit.modifierId);
      const finalDamage = Math.max(1, Math.round(baseDamage * multiplier));

      unit.health = Math.max(0, unit.health - finalDamage);

      // Knockback away from bonk center
      if (unit.health > 0) {
        this.applyBonkKnockback(x, y, unit, state);
      }
    }

    return true;
  }

  /**
   * Push unit away from the bonk center point.
   * Similar to CombatSystem.applyKnockback but uses a coordinate as source.
   */
  private applyBonkKnockback(
    centerX: number,
    centerY: number,
    target: import("../../../schema").UnitSchema,
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
