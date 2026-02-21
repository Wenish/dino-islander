using Assets.Scripts.Domain;
using Assets.Scripts.Presentation.GameView.Hud;
using System;
using UnityEditor;
using UnityEngine;

namespace Assets.Scripts.Presentation
{
    public class HudView : MonoBehaviour
    {
        private IHud _hud;
        [SerializeField] private ActionButtonView _modifierSwitchButton;
        [SerializeField] private ActionButtonView _raptorSpawnButton;

        public void Init(IHud hud, Action onModifierSwitch, Action onRaptorSpawn)
        {
            _hud = hud;

            _modifierSwitchButton.Init(onModifierSwitch);
            _raptorSpawnButton.Init(onRaptorSpawn);

            _hud.ModifierSwitchDelayProgress.Bind(UpdateModifierSwitchButton);
            _hud.RaptorSpawnActionDelayProgress.Bind(UpdateRaptorSpawnButton);
            _hud.CurrentModifierId.Bind(UpdateModifierIcons);
        }

        public void UpdateModifierSwitchButton(float progress) => _modifierSwitchButton.SetVisibility(progress);
        public void UpdateRaptorSpawnButton(float progress) => _raptorSpawnButton.SetVisibility(progress);
        public void UpdateModifierIcons(int modifierId) => _modifierSwitchButton.SetActiveModifier(modifierId);
    }
}
