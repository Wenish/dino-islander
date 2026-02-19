using System;
using UnityEngine;
using UnityEngine.UI;

namespace Assets.Scripts.Presentation.GameView.Buildings
{
    public class UnitModifierButtonView : MonoBehaviour
    {
        [SerializeField] private Image _button;
        [SerializeField] private Button _switchButton;

        public void Init(Action onSwitch)
        {
            if (onSwitch == null) return;
            _switchButton.onClick.AddListener(() => onSwitch());
        }

        public void SetVisibility(float visibilityPercentage)
        {
            Color color = _button.color;
            color.a = Mathf.Clamp01(visibilityPercentage);
            _button.color = color;
        }
    }
}
