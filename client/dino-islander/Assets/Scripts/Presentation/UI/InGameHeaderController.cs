using UnityEngine;
using UnityEngine.UIElements;

[RequireComponent(typeof(UIDocument))]
public class InGameHeaderController : MonoBehaviour
{
    private UIDocument uiDocument;
    private VisualElement rootVisualElement;
    private bool isInitialized;

    private Label timerLabel;

    private Label player1NameLabel;
    private Label player2NameLabel;

    private Label player1MinionKillsLabel;
    private Label player2MinionKillsLabel;

    // Start is called once before the first execution of Update after the MonoBehaviour is created
    void Awake()
    {
        TryInitialize();
    }

    private bool TryInitialize()
    {
        if (isInitialized)
        {
            return true;
        }

        uiDocument = GetComponent<UIDocument>();
        if (uiDocument == null || uiDocument.rootVisualElement == null)
        {
            return false;
        }

        rootVisualElement = uiDocument.rootVisualElement;
        timerLabel = rootVisualElement.Q<Label>("TimerLabel");
        player1NameLabel = rootVisualElement.Q<Label>("Player1NameLabel");
        player2NameLabel = rootVisualElement.Q<Label>("Player2NameLabel");
        player1MinionKillsLabel = rootVisualElement.Q<Label>("Player1MinionKillsLabel");
        player2MinionKillsLabel = rootVisualElement.Q<Label>("Player2MinionKillsLabel");

        isInitialized = timerLabel != null
            && player1NameLabel != null
            && player2NameLabel != null
            && player1MinionKillsLabel != null
            && player2MinionKillsLabel != null;

        return isInitialized;
    }

    public void SetRootOpacity(float opacity)
    {
        if (!TryInitialize())
        {
            return;
        }

        rootVisualElement.style.opacity = opacity;
    }

    public void SetPlayerName(int playerIndex, string name)
    {
        if (playerIndex == 0)
        {
            SetPlayer1Name(name);
            return;
        }

        if (playerIndex == 1)
        {
            SetPlayer2Name(name);
        }
    }

    public void SetPlayerMinionKills(int playerIndex, int kills)
    {
        if (playerIndex == 0)
        {
            SetPlayer1MinionKills(kills);
            return;
        }

        if (playerIndex == 1)
        {
            SetPlayer2MinionKills(kills);
        }
    }

    public void SetTimerText(int minutes, int seconds)
    {
        if (!TryInitialize())
        {
            return;
        }

        timerLabel.text = $"{minutes:00}:{seconds:00}";
    }

    private void SetPlayer1Name(string name)
    {
        if (!TryInitialize())
        {
            return;
        }

        player1NameLabel.text = name;
    }

    private void SetPlayer2Name(string name)
    {
        if (!TryInitialize())
        {
            return;
        }

        player2NameLabel.text = name;
    }

    private void SetPlayer1MinionKills(int kills)
    {
        if (!TryInitialize())
        {
            return;
        }

        player1MinionKillsLabel.text = kills.ToString();
    }

    private void SetPlayer2MinionKills(int kills)
    {
        if (!TryInitialize())
        {
            return;
        }

        player2MinionKillsLabel.text = kills.ToString();
    }
}
