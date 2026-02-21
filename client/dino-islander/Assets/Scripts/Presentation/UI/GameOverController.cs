using UnityEngine;
using UnityEngine.UIElements;

public class GameOverController : MonoBehaviour
{
    UIDocument uiDocument;
    VisualElement rootVisualElement;

    void Awake()
    {
        uiDocument = GetComponent<UIDocument>();
        rootVisualElement = uiDocument.rootVisualElement;
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