using Assets.Scripts.Domain;
using Assets.Scripts.Presentation.GameView.Hud;
using System;
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

            _hud.ModifierSwitchDelayProgress.Bind(progress => _modifierSwitchButton.SetVisibility(progress));
            _hud.RaptorSpawnActionDelayProgress.Bind(progress => _raptorSpawnButton.SetVisibility(progress));
        }
    }
}
