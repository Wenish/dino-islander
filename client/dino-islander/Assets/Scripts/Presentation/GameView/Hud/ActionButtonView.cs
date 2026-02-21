using System;
using UnityEngine;
using UnityEngine.U2D;
using UnityEngine.UI;

namespace Assets.Scripts.Presentation.GameView.Hud
{
    public class ActionButtonView : MonoBehaviour
    {
        [SerializeField] private Image _button;
        [SerializeField] private Button _switchButton;
        [SerializeField] private Image _renderer;
        [SerializeField] private Sprite[] _modifierSprites;
        [SerializeField] private bool _switchByModifierId = true;

        public void Init(Action onSwitch)
        {
            if (onSwitch == null) return;
            _switchButton.onClick.AddListener(() => OnSwitchButtonClicked(onSwitch));
        }

        public void SetVisibility(float visibilityPercentage)
        {
            _button.fillAmount = Mathf.Clamp01(visibilityPercentage);
        }

        public void SetActiveModifier(int modifierId)
        {
            if (_switchByModifierId)
            {
                var spriteIndex = modifierId - 1;
                var sprite = spriteIndex >= 0 && spriteIndex < _modifierSprites.Length
                    ? _modifierSprites[spriteIndex]
                    : null;

                _renderer.sprite = sprite;
                _renderer.enabled = sprite != null;
            }
            else
            {
                _renderer.sprite = _modifierSprites[0];
                _renderer.enabled = true;
            }
        }

        public void OnSwitchButtonClicked(Action action) => action?.Invoke();
    }
}
