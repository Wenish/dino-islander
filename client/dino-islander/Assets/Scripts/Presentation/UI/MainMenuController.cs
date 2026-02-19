using UnityEngine;
using UnityEngine.UIElements;

public class MainMenuController : MonoBehaviour
{
    private UIDocument uiDocument;
    private VisualElement rootVisualElement;
    private Button buttonPlayVsBot;
    private Button buttonPlayVsPlayer;
    private bool callbacksRegistered;

    GameBootstrap _bootstrap;

    public void Init(GameBootstrap bootstrap)
    {
        _bootstrap = bootstrap;
    }

    public void Awake()
    {
        uiDocument = GetComponent<UIDocument>();
        TryInitializeButtons();
    }

    public void OnEnable()
    {
        if (TryBindCallbacks())
        {
            return;
        }

        if (uiDocument != null && uiDocument.rootVisualElement != null)
        {
            uiDocument.rootVisualElement.schedule.Execute(() =>
            {
                if (!TryBindCallbacks())
                {
                    Debug.LogError("Buttons not found in MainMenuController");
                }
            }).StartingIn(0);
        }
        else
        {
            Debug.LogError("UIDocument or rootVisualElement is not ready in MainMenuController");
        }
    }

    public void OnDisable()
    {
        if (!callbacksRegistered)
        {
            return;
        }

        if (buttonPlayVsBot != null)
        {
            buttonPlayVsBot.clicked -= OnPlayVsBotClicked;
        }

        if (buttonPlayVsPlayer != null)
        {
            buttonPlayVsPlayer.clicked -= OnPlayVsPlayerClicked;
        }

        callbacksRegistered = false;
    }

    private bool TryInitializeButtons()
    {
        if (uiDocument == null)
        {
            uiDocument = GetComponent<UIDocument>();
        }

        if (uiDocument == null)
        {
            return false;
        }

        rootVisualElement = uiDocument.rootVisualElement;
        if (rootVisualElement == null)
        {
            return false;
        }

        buttonPlayVsBot = rootVisualElement.Q<Button>("ButtonPlayVsBot");
        buttonPlayVsPlayer = rootVisualElement.Q<Button>("ButtonPlayVsPlayer");

        return buttonPlayVsBot != null && buttonPlayVsPlayer != null;
    }

    private bool TryBindCallbacks()
    {
        if (callbacksRegistered)
        {
            return true;
        }

        if (!TryInitializeButtons())
        {
            return false;
        }

        buttonPlayVsBot.clicked -= OnPlayVsBotClicked;
        buttonPlayVsPlayer.clicked -= OnPlayVsPlayerClicked;

        buttonPlayVsBot.clicked += OnPlayVsBotClicked;
        buttonPlayVsPlayer.clicked += OnPlayVsPlayerClicked;
        Debug.Log("MainMenuController: button callbacks registered");
        callbacksRegistered = true;
        return true;
    }

    private bool TryEnsureBootstrap()
    {
        if (_bootstrap != null)
        {
            return true;
        }

        _bootstrap = FindFirstObjectByType<GameBootstrap>();
        if (_bootstrap == null)
        {
            Debug.LogError("GameBootstrap is null in MainMenuController");
            return false;
        }

        return true;
    }

    void OnPlayVsBotClicked()
    {
        Debug.Log("Play vs Bot clicked");
        if (!TryEnsureBootstrap())
        {
            return;
        }
        _bootstrap.ConnectToServer(true);
    }

    void OnPlayVsPlayerClicked()
    {
        Debug.Log("Play vs Player clicked");
        if (!TryEnsureBootstrap())
        {
            return;
        }
        _bootstrap.ConnectToServer(false);
    }
}