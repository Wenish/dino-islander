using System;
using TMPro;
using UnityEngine;
using UnityEngine.InputSystem;
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
        [SerializeField] private TextMeshProUGUI _textMeshPro;
        [SerializeField] private InputActionReference _inputAction;

        private Action _onSwitch;
        private string _infoText;

        public void Init(Action onSwitch)
        {
            _onSwitch = onSwitch;
            if (_onSwitch == null) return;

            _switchButton.onClick.AddListener(() => OnSwitchButtonClicked(_onSwitch));

            if (_inputAction != null)
            {
                _infoText = _inputAction.action.GetBindingDisplayString();
                _inputAction.action.performed += OnInputActionPerformed;
                _inputAction.action.Enable();
            }

            _textMeshPro.text = _infoText ?? string.Empty;
        }

        private void OnDestroy()
        {
            if (_inputAction != null)
            {
                _inputAction.action.performed -= OnInputActionPerformed;
            }
        }

        private void OnInputActionPerformed(InputAction.CallbackContext context)
        {
            OnSwitchButtonClicked(_onSwitch);
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
