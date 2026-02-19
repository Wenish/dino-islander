using System;

namespace Assets.Scripts.Domain
{
    public interface ICastle
    {
        IReadOnlyObservable<float> ModifierSwitchDelayProgress { get; }
        void SyncModifierSwitchDelayProgress(float progress);
    }
}