using System;
using UnityEngine;
using UnityEngine.UI;

namespace Assets.Scripts.Presentation.GameView.Hud
{
    public class ActionButtonView : MonoBehaviour
    {
        [SerializeField] private Image _button;
        [SerializeField] private Button _switchButton;

        public void Init(Action onSwitch)
        {
            if (onSwitch == null) return;
            _switchButton.onClick.AddListener(onSwitch.Invoke);
        }

        public void SetVisibility(float visibilityPercentage)
        {
            _button.fillAmount = Mathf.Clamp01(visibilityPercentage);
        }
    }
}
