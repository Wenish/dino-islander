using System;
using UnityEngine;
using UnityEngine.UI;

namespace Assets.Scripts.Presentation.GameView.Hud
{
    public class ModifierSwitchButtonView : MonoBehaviour
    {
        [SerializeField] private Image _button;
        [SerializeField] private Button _switchButton;
        [SerializeField] private ModifierSwitchButtonView modifierIcon;

        public void Init(Action onSwitch)
        {
            if (onSwitch == null) return;
            _switchButton.onClick.AddListener(() => OnSwitchButtonClicked(onSwitch));
        }

        public void SetVisibility(float visibilityPercentage)
        {
            _button.fillAmount = Mathf.Clamp01(visibilityPercentage);
        }

        public void OnSwitchButtonClicked(Action action)
        {
            // This method can be used if you want to handle the button click directly in this class.
            // For example, you could invoke an event or call a method on a controller.
        }

    }
}
