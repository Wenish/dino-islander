using UnityEngine;
using UnityEngine.UIElements;

[RequireComponent(typeof(UIDocument))]
public class InGameHeaderController : MonoBehaviour
{
    private UIDocument uiDocument;
    private VisualElement rootVisualElement;

    private Label timerLabel;

    private Label player1NameLabel;
    private Label player2NameLabel;

    private Label player1MinionKillsLabel;
    private Label player2MinionKillsLabel;

    // Start is called once before the first execution of Update after the MonoBehaviour is created
    void Awake()
    {
        uiDocument = GetComponent<UIDocument>();
        rootVisualElement = uiDocument.rootVisualElement;
        timerLabel = rootVisualElement.Q<Label>("TimerLabel");
        player1NameLabel = rootVisualElement.Q<Label>("Player1NameLabel");
        player2NameLabel = rootVisualElement.Q<Label>("Player2NameLabel");
        player1MinionKillsLabel = rootVisualElement.Q<Label>("Player1MinionKillsLabel");
        player2MinionKillsLabel = rootVisualElement.Q<Label>("Player2MinionKillsLabel");
    }

    public void SetPlayer1Name(string name)
    {
        player1NameLabel.text = name;
    }

    public void SetPlayer2Name(string name)
    {
        player2NameLabel.text = name;
    }

    public void SetTimerText(int minutes, int seconds)
    {
        timerLabel.text = $"{minutes:00}:{seconds:00}";
    }

    public void SetPlayer1MinionKills(int kills)
    {
        player1MinionKillsLabel.text = kills.ToString();
    }

    public void SetPlayer2MinionKills(int kills)
    {
        player2MinionKillsLabel.text = kills.ToString();
    }
}
