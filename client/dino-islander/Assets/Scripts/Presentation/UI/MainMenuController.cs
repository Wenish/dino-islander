using UnityEngine;
using UnityEngine.UIElements;

public class MainMenuController : MonoBehaviour
{
    private string PLAYER_NAME_KEY = "PlayerName";
    private UIDocument uiDocument;
    private VisualElement rootVisualElement;
    private Button buttonPlayVsBot;
    private Button buttonPlayVsPlayer;
    private TextField textFieldPlayerName;
    private Label labelErrorMessage;
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

        if (textFieldPlayerName != null)
        {
            textFieldPlayerName.UnregisterValueChangedCallback(OnTextFieldPlayerNameChanged);
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
        textFieldPlayerName = rootVisualElement.Q<TextField>("TextFieldPlayerName");
        labelErrorMessage = rootVisualElement.Q<Label>("LabelErrorMessage");

        labelErrorMessage.text = "";
        if (textFieldPlayerName != null)
        {
            textFieldPlayerName.value = PlayerPrefs.GetString(PLAYER_NAME_KEY, "");
        }

        return buttonPlayVsBot != null && buttonPlayVsPlayer != null && textFieldPlayerName != null && labelErrorMessage != null;
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
        textFieldPlayerName.UnregisterValueChangedCallback(OnTextFieldPlayerNameChanged);

        buttonPlayVsBot.clicked += OnPlayVsBotClicked;
        buttonPlayVsPlayer.clicked += OnPlayVsPlayerClicked;
        Debug.Log("MainMenuController: button callbacks registered");

        textFieldPlayerName.RegisterValueChangedCallback(OnTextFieldPlayerNameChanged);
        Debug.Log("MainMenuController: text field callback registered");
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

    private void OnTextFieldPlayerNameChanged(ChangeEvent<string> evt)
    {
        PlayerPrefs.SetString(PLAYER_NAME_KEY, evt.newValue);
    }

    private void SetPlayButtonsEnabled(bool enabled)
    {
        if (buttonPlayVsBot != null)
        {
            buttonPlayVsBot.SetEnabled(enabled);
        }

        if (buttonPlayVsPlayer != null)
        {
            buttonPlayVsPlayer.SetEnabled(enabled);
        }
    }

    async void OnPlayVsBotClicked()
    {
        Debug.Log("Play vs Bot clicked");
        if (!TryEnsureBootstrap())
        {
            return;
        }
        SetPlayButtonsEnabled(false);
        if(labelErrorMessage != null)
        {
            labelErrorMessage.text = "";
        }
        try {
            await _bootstrap.ConnectToServer(true, textFieldPlayerName.value);
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"Failed to connect to server: {ex.Message}");
            if (labelErrorMessage != null)
            {
                labelErrorMessage.text = "Failed to connect to server. Please try again.";
            }
        }
        finally
        {
            SetPlayButtonsEnabled(true);
        }
    }

    async void OnPlayVsPlayerClicked()
    {
        Debug.Log("Play vs Player clicked");
        if (!TryEnsureBootstrap())
        {
            return;
        }
        SetPlayButtonsEnabled(false);
        if (labelErrorMessage != null)        {
            labelErrorMessage.text = "";
        }
        try {
            await _bootstrap.ConnectToServer(false, textFieldPlayerName.value);
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"Failed to connect to server: {ex.Message}");
            if (labelErrorMessage != null)
            {
                labelErrorMessage.text = "Failed to connect to server. Please try again.";
            }
        }
        finally
        {
            SetPlayButtonsEnabled(true);
        }
    }
}