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
    // Start is called once before the first execution of Update after the MonoBehaviour is created
    void Awake()
    {
        uiDocument = GetComponent<UIDocument>();
        rootVisualElement = uiDocument.rootVisualElement;
        timerLabel = rootVisualElement.Q<Label>("TimerLabel");
        player1NameLabel = rootVisualElement.Q<Label>("Player1NameLabel");
        player2NameLabel = rootVisualElement.Q<Label>("Player2NameLabel");
    }

    public void SetPlayer1Name(string name)
    {
        player1NameLabel.text = name;
    }

    public void SetPlayer2Name(string name)
    {
        player2NameLabel.text = name;
    }

    public void SetTimerText(string text)
    {
        timerLabel.text = text;
    }
}
