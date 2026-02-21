namespace Assets.Scripts.Domain
{
    public class HudFactory
    {
        public Hud CreatePlayerHud(float modifierSwitchDelayProgress, float raptorSpawnActionDelayProgress, int initialModifierId = 0) =>
            new(modifierSwitchDelayProgress, raptorSpawnActionDelayProgress, initialModifierId);
    }
}
