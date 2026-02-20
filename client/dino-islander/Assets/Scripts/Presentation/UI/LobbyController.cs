using UnityEngine;
using UnityEngine.UIElements;

public class LobbyController : MonoBehaviour
{
    private UIDocument uiDocument;
    private VisualElement rootVisualElement;
    private Button buttonLeaveGame;

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

    void Awake()
    {
        uiDocument = GetComponent<UIDocument>();
        rootVisualElement = uiDocument.rootVisualElement;
        buttonLeaveGame = rootVisualElement.Q<Button>("ButtonLeaveGame");
        if (buttonLeaveGame == null)
        {
            Debug.LogError("ButtonLeaveGame not found in the UI document.");
        }
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