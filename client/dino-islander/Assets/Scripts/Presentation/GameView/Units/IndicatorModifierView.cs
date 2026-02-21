using DinoIslander.Infrastructure;
using UnityEngine;
using UnityEngine.UI;
public class IndicatorModifierView : MonoBehaviour
{
    public Image imageModifier;

    public Sprite fireIcon;
    public Sprite waterIcon;
    public Sprite grassIcon;

    public void SetModifier(int modifierType)
    {
        imageModifier.enabled = true;
        switch (modifierType)
        {
            case (int)ModifierType.Fire:
                imageModifier.sprite = fireIcon;
                break;
            case (int)ModifierType.Water:
                imageModifier.sprite = waterIcon;
                break;
            case (int)ModifierType.Earth:
                imageModifier.sprite = grassIcon;
                break;
            default:
                imageModifier.sprite = null;
                imageModifier.enabled = false;
                break;
        }
    }
}