namespace Assets.Scripts.Domain
{
    public interface IHud
    {
        IReadOnlyObservable<float> ModifierSwitchDelayProgress { get; }
        void SyncModifierSwitchDelayProgress(float progress);

        IReadOnlyObservable<float> RaptorSpawnActionDelayProgress { get; }
        void SyncRaptorSpawnActionDelayProgress(float progress);

        IReadOnlyObservable<int> CurrentModifierId { get; }
        void SyncCurrentModifierId(int modifierId);
    }
}