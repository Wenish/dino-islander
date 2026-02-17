namespace Assets.Scripts.Domain
{
    public static class StateUtility
    {
        public static GameState GetStateFromSchema(int state) => (GameState)state;
    }
}
