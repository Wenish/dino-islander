using Assets.Scripts.Domain;
using UnityEngine;

namespace Assets.Scripts.Presentation
{
    public class UIRoot : MonoBehaviour
    {
        [SerializeField] public MenuPanel GameUI;
        [SerializeField] public MenuPanel LobbyUI;
        [SerializeField] public MenuPanel GameEndUI;
        [SerializeField] public MainMenuPanel MainMenuUI;

        private GameBootstrap _bootstrap;

        public void Init(GameBootstrap bootstrap)
        {
            _bootstrap = bootstrap;

            GameUI.Init();
            LobbyUI.Init();
            GameEndUI.Init();

            MainMenuUI.Init(_bootstrap);
            MainMenuUI.Show();
        }

        public void SwitchGameState(GameState state)
        {
            switch (state)
            {
                case GameState.MainMenu:
                    DeactivateAll();
                    MainMenuUI.Show();
                    break;
                case GameState.Lobby:
                    DeactivateAll();
                    LobbyUI.Show();
                    break;
                case GameState.InGame:
                    DeactivateAll();
                    GameUI.Show();
                    break;
                case GameState.GameOver:
                    DeactivateAll();
                    GameEndUI.Show();
                    break;
            }
        }

        public void DeactivateAll()
        {
            GameUI.Hide();
            LobbyUI.Hide();
            GameEndUI.Hide();
            MainMenuUI.Hide();
        }
    }
}
