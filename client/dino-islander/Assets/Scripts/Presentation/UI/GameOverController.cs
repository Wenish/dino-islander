using UnityEngine;
using UnityEngine.UIElements;

public class GameOverController : MonoBehaviour
{
    UIDocument uiDocument;
    VisualElement rootVisualElement;

    Label winnerPlayerNameLabel;

    Label gameOverCountdownTimerLabel;

    void Awake()
    {
        uiDocument = GetComponent<UIDocument>();
        rootVisualElement = uiDocument.rootVisualElement;

        winnerPlayerNameLabel = rootVisualElement.Q<Label>("WinnerPlayerNameLabel");
        gameOverCountdownTimerLabel = rootVisualElement.Q<Label>("GameOverCountdownTimerLabel");
    }

    public void SetWinnerPlayerName(string playerName)
    {
        winnerPlayerNameLabel.text = $"Winner: {playerName}";
    }

    public void SetGameOverCountdownTimer(float timeLeftInSeconds)
    {
        gameOverCountdownTimerLabel.text = timeLeftInSeconds.ToString();
    }

    public void Show()
    {
        rootVisualElement.style.display = DisplayStyle.Flex;
    }
    public void Hide()
    {
        rootVisualElement.style.display = DisplayStyle.None;
    }
}