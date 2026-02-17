using DinoIslander.Infrastructure;
using UnityEngine;

namespace Assets.Scripts.Domain
{
    public static class UnitUtility
    {
        public static UnitType GetTypeFromSchema(int type)
        {
            return (UnitType)type;
        }

        public static AnimationType GetAnimTypeFromSchema(int type)
        {
            switch (type)
            {
                case UnitBehaviorState.Attacking:
                    return AnimationType.Attack;
                case UnitBehaviorState.Idle:
                    return AnimationType.Idle;
                case UnitBehaviorState.Moving:
                case UnitBehaviorState.Fleeing:
                case UnitBehaviorState.Wandering:
                    return AnimationType.Run;
            }

            Debug.LogWarning("Unknown animation type: " + type);
            return AnimationType.Idle;
        }
    }
}