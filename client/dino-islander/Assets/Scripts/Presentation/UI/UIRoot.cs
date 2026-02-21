using Assets.Scripts.Domain;
using UnityEngine;
using UnityEngine.UIElements;

namespace Assets.Scripts.Presentation
{
    public class UIRoot : MonoBehaviour
    {
        [SerializeField] public MenuPanel GameUI;
        [SerializeField] public GameObject InGameHeaderUI;
        [SerializeField] public GameObject LobbyUI;
        [SerializeField] public GameObject GameOverUI;
        [SerializeField] public UIDocument UiDocumentMainMenu;
    

        private GameBootstrap _bootstrap;
        private InGameHeaderController _inGameHeaderController;
        private MainMenuController _mainMenuController;
        private LobbyController _lobbyController;
        private GameOverController _gameOverController;

        public void Init(GameBootstrap bootstrap)
        {
            _bootstrap = bootstrap;
            _inGameHeaderController = InGameHeaderUI.GetComponent<InGameHeaderController>();
            _mainMenuController = UiDocumentMainMenu.GetComponent<MainMenuController>();
            _lobbyController = LobbyUI.GetComponent<LobbyController>();
            _gameOverController = GameOverUI.GetComponent<GameOverController>();

            GameUI.Init();
            _lobbyController.Init(_bootstrap);
            _mainMenuController.Init(_bootstrap);
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
            _lobbyController.SetPlayerName(playerIndex, name);
        }

        public void SetPlayerNameLabelColor(int playerIndex, Color color)
        {
            if (_inGameHeaderController == null)
            {
                return;
            }

            _inGameHeaderController.SetPlayerNameLabelColor(playerIndex, color);
            _lobbyController.SetPlayerNameLabelColor(playerIndex, color);
        }

        public void SetPlayerMinionKills(int playerIndex, int kills)
        {
            if (_inGameHeaderController == null)
            {
                return;
            }

            _inGameHeaderController.SetPlayerMinionKills(playerIndex, kills);
        }

        public void ShowLobbyWaitingForPlayers()
        {
            _lobbyController.ShowWaitingOnPlayerContainer();
        }

        public void ShowLobbyCountdownTimer()
        {
            _lobbyController.ShowGameCountdownContainer();
        }
        public void SetLobbyCountdownTimer(int secondsLeft)
        {
            _lobbyController.SetGameCountdownTimer(secondsLeft);
        }

        public void SetWinnerPlayerName(string playerName)
        {
            _gameOverController.SetWinnerPlayerName(playerName);
        }

        public void SetWinnerPlayerNameColor(Color color)
        {
            _gameOverController.SetWinnerPlayerNameColor(color);
        }

        public void SetGameOverCountdownTimer(float timeLeftInSeconds)
        {
            _gameOverController.SetGameOverCountdownTimer(timeLeftInSeconds);
        }

        public void SwitchGameState(GameState state)
        {
            Debug.Log($"Switching game state to: {state}");
            switch (state)
            {
                case GameState.MainMenu:
                    DeactivateAll();
                    UiDocumentMainMenu.gameObject.SetActive(true);
                    UnityEngine.Cursor.visible = true;
                    break;
                case GameState.Lobby:
                    DeactivateAll();
                    _lobbyController.Show();
                    break;
                case GameState.InGame:
                    DeactivateAll();
                    GameUI.Show();
                    _inGameHeaderController.SetRootOpacity(1f);
                    break;
                case GameState.GameOver:
                    DeactivateAll();
                    _gameOverController.Show();
                    break;
            }
        }

        public void DeactivateAll()
        {
            GameUI.Hide();
            _lobbyController.Hide();
            _inGameHeaderController.SetRootOpacity(0f);
            UiDocumentMainMenu.gameObject.SetActive(false);
            _gameOverController.Hide();
        }
    }
}
