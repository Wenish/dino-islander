using UnityEngine;

namespace Assets.Scripts.Common
{
    public static class TimeHelper
    {
        public static float CalcCooldownProgress(float currentPhaseTimeMs, float lastEventTimeInPhaseMs, float cooldownMs)
        {
            return Mathf.Clamp01((currentPhaseTimeMs - lastEventTimeInPhaseMs) / cooldownMs);
        }

    }
}
