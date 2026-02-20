using UnityEngine;
using UnityEngine.UIElements;

public class LobbyController : MonoBehaviour
{
    private UIDocument uiDocument;
    private VisualElement rootVisualElement;
    private Button buttonLeaveGame;

    private Label player1NameLabel;
    private Label player2NameLabel;

    private VisualElement waitingOnPlayerContainer;

    private VisualElement gameCountdownContainer;

    private Label gameCountdownTimeLabel;

    private GameBootstrap _bootstrap;

    public void Init(GameBootstrap bootstrap)
    {
        _bootstrap = bootstrap;
    }

    public void Show()
    {
        rootVisualElement.style.display = DisplayStyle.Flex;
    }

    public void Hide()
    {
        rootVisualElement.style.display = DisplayStyle.None;
    }

    public void ShowWaitingOnPlayerContainer()
    {
        waitingOnPlayerContainer.style.display = DisplayStyle.Flex;
        gameCountdownContainer.style.display = DisplayStyle.None;
    }

    public void ShowGameCountdownContainer()
    {
        waitingOnPlayerContainer.style.display = DisplayStyle.None;
        gameCountdownContainer.style.display = DisplayStyle.Flex;
    }


    void Awake()
    {
        uiDocument = GetComponent<UIDocument>();
        rootVisualElement = uiDocument.rootVisualElement;
        buttonLeaveGame = rootVisualElement.Q<Button>("ButtonLeaveGame");
        player1NameLabel = rootVisualElement.Q<Label>("Player1NameLabel");
        player2NameLabel = rootVisualElement.Q<Label>("Player2NameLabel");
        waitingOnPlayerContainer = rootVisualElement.Q<VisualElement>("WaitingOnPlayerContainer");
        gameCountdownContainer = rootVisualElement.Q<VisualElement>("GameCountdownContainer");
        gameCountdownTimeLabel = rootVisualElement.Q<Label>("GameCountdownTimeLabel");

        ShowWaitingOnPlayerContainer();
    }

    void OnEnable()
    {
        buttonLeaveGame.clicked += OnLeaveGameClicked;
        Debug.Log("LobbyController enabled and event listener added.");
    }

    void OnDisable()
    {
        buttonLeaveGame.clicked -= OnLeaveGameClicked;
    }

    private async void OnLeaveGameClicked()
    {
        Debug.Log("Leave Game button clicked.");
        buttonLeaveGame.SetEnabled(false); // Prevent multiple clicks
        try 
        {
            await _bootstrap.LeaveGame();
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"Error leaving room: {ex.Message}");
        }
        finally
        {
            buttonLeaveGame.SetEnabled(true);
        }
    }
}