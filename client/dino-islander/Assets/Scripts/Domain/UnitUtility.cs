using DinoIslander.Infrastructure;
using System;
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

        public static string GetAnimationNameFromType(AnimationType currentAnimation)
        {
            switch (currentAnimation)
            {
                case AnimationType.Idle:
                    return "Idle";
                case AnimationType.Run:
                    return "Run";
                case AnimationType.Attack:
                    return "Attack 1";
            }
            return "";
        }
    }
}