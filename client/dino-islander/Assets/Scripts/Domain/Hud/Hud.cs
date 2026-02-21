namespace Assets.Scripts.Domain
{
    public class Hud : IHud
    {
        public Hud(float modifierSwitchDelayProgress, float raptorSpawnActionDelayProgress) 
        {
            _modifierSwitchDelayProgress = new Observable<float>(modifierSwitchDelayProgress);
            _raptorSpawnActionDelayProgress = new Observable<float>(raptorSpawnActionDelayProgress);
        }

        private readonly Observable<float> _modifierSwitchDelayProgress;
        public IReadOnlyObservable<float> ModifierSwitchDelayProgress => _modifierSwitchDelayProgress;

        private readonly Observable<float> _raptorSpawnActionDelayProgress;
        public IReadOnlyObservable<float> RaptorSpawnActionDelayProgress => _raptorSpawnActionDelayProgress;

        public void SyncModifierSwitchDelayProgress(float progress) => _modifierSwitchDelayProgress.SetValue(progress);

        public void SyncRaptorSpawnActionDelayProgress(float progress) => _raptorSpawnActionDelayProgress.SetValue(progress);
    }
}
