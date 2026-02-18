using Assets.Scripts.Domain;
using UnityEngine;
using UnityEngine.UIElements;

namespace Assets.Scripts.Presentation
{
    public class UIRoot : MonoBehaviour
    {
        [SerializeField] public MenuPanel GameUI;
        [SerializeField] public MenuPanel LobbyUI;
        [SerializeField] public MenuPanel GameEndUI;
        [SerializeField] public MainMenuPanel MainMenuUI;
        [SerializeField] public GameObject InGameHeaderUI;
        [SerializeField] public UIDocument UiDocumentLobby;
        [SerializeField] public UIDocument UiDocumentGameOver;

        private GameBootstrap _bootstrap;
        private InGameHeaderController _inGameHeaderController;

        public void Init(GameBootstrap bootstrap)
        {
            _bootstrap = bootstrap;
            _inGameHeaderController = InGameHeaderUI.GetComponent<InGameHeaderController>();

            GameUI.Init();
            LobbyUI.Init();
            GameEndUI.Init();

            MainMenuUI.Init(_bootstrap);
            MainMenuUI.Show();
        }

        public void SetTimePastInPhase(float timePastInThePhaseMs)
        {
            if (_inGameHeaderController == null)
            {
                return;
            }

            int totalSeconds = Mathf.Max(0, Mathf.FloorToInt(timePastInThePhaseMs / 1000f));
            int minutes = totalSeconds / 60;
            int seconds = totalSeconds % 60;

            _inGameHeaderController.SetTimerText(minutes, seconds);
        }

        public void SetPlayerName(int playerIndex, string name)
        {
            if (_inGameHeaderController == null)
            {
                return;
            }

            _inGameHeaderController.SetPlayerName(playerIndex, name);
        }

        public void SetPlayerNameLabelColor(int playerIndex, Color color)
        {
            if (_inGameHeaderController == null)
            {
                return;
            }

            _inGameHeaderController.SetPlayerNameLabelColor(playerIndex, color);
        }

        public void SetPlayerMinionKills(int playerIndex, int kills)
        {
            if (_inGameHeaderController == null)
            {
                return;
            }

            _inGameHeaderController.SetPlayerMinionKills(playerIndex, kills);
        }

        public void SwitchGameState(GameState state)
        {
            Debug.Log($"Switching game state to: {state}");
            switch (state)
            {
                case GameState.MainMenu:
                    DeactivateAll();
                    MainMenuUI.Show();
                    break;
                case GameState.Lobby:
                    DeactivateAll();
                    LobbyUI.Show();
                    UiDocumentLobby.enabled = true;
                    break;
                case GameState.InGame:
                    DeactivateAll();
                    GameUI.Show();
                    _inGameHeaderController.SetRootOpacity(1f);
                    break;
                case GameState.GameOver:
                    DeactivateAll();
                    GameEndUI.Show();
                    UiDocumentGameOver.enabled = true;
                    break;
            }
        }

        public void DeactivateAll()
        {
            GameUI.Hide();
            LobbyUI.Hide();
            GameEndUI.Hide();
            MainMenuUI.Hide();
            _inGameHeaderController.SetRootOpacity(0f);
            UiDocumentLobby.enabled = false;
            UiDocumentGameOver.enabled = false;
        }
    }
}
