namespace Assets.Scripts.Domain
{
    public class Hud : IHud
    {
        public Hud(float modifierSwitchDelayProgress, float raptorSpawnActionDelayProgress, int initialModifierId = 0)
        {
            _modifierSwitchDelayProgress = new Observable<float>(modifierSwitchDelayProgress);
            _raptorSpawnActionDelayProgress = new Observable<float>(raptorSpawnActionDelayProgress);
            _currentModifierId = new Observable<int>(initialModifierId);
        }

        private readonly Observable<float> _modifierSwitchDelayProgress;
        public IReadOnlyObservable<float> ModifierSwitchDelayProgress => _modifierSwitchDelayProgress;

        private readonly Observable<float> _raptorSpawnActionDelayProgress;
        public IReadOnlyObservable<float> RaptorSpawnActionDelayProgress => _raptorSpawnActionDelayProgress;

        private readonly Observable<int> _currentModifierId;
        public IReadOnlyObservable<int> CurrentModifierId => _currentModifierId;

        public void SyncModifierSwitchDelayProgress(float progress) => _modifierSwitchDelayProgress.SetValue(progress);

        public void SyncRaptorSpawnActionDelayProgress(float progress) => _raptorSpawnActionDelayProgress.SetValue(progress);

        public void SyncCurrentModifierId(int modifierId) => _currentModifierId.SetValue(modifierId);
    }
}
