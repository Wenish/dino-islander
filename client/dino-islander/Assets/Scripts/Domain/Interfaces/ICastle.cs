using System;

namespace Assets.Scripts.Domain
{
    public interface ICastle
    {
        IReadOnlyObservable<float> ModifierSwitchDelayProgress { get; }
        public void SyncModifierSwitchDelayProgress(float progress);
    }
}