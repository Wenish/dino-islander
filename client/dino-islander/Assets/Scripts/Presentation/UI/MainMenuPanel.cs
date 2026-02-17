using UnityEngine;
using UnityEngine.UI;

namespace Assets.Scripts.Presentation
{
    public class MainMenuPanel : MenuPanel
    {
        [SerializeField] Button ButtonStartBotGame;
        [SerializeField] Button ButtonStartPlayerGame;

        GameBootstrap _bootstrap;

        public void Init(GameBootstrap bootstrap)
        {
            base.Init();
            _bootstrap = bootstrap;
        }

        public void Start()
        {
            ButtonStartBotGame.onClick.AddListener(StartBotGame);
            ButtonStartPlayerGame.onClick.AddListener(StartPlayerGame);
        }

        public void StartPlayerGame()
        {
            _bootstrap.ConnectToServer(false);
        }
        public void StartBotGame()
        {
            _bootstrap.ConnectToServer(true);
        }
    }
}
