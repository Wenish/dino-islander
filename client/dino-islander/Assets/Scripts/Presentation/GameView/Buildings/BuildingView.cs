using Assets.Scripts.Domain;
using Assets.Scripts.Presentation.GameView.Buildings;
using System;
using UnityEngine;

namespace Assets.Scripts.Presentation
{
    public class BuildingView : MonoBehaviour
    {
        private IBuilding _building;
        [SerializeField] private HealthbarView _healthbar;
        [SerializeField] private UnitModifierButtonView _spawnButtonView;

        public void Init(IBuilding building, Action onModifierSwitch = null)
        {
            _building = building;

            transform.position = _building.Position;
            _building.Health.Bind(x => UpdateHealthBar());
            _building.MaxHealth.Bind(x => UpdateHealthBar());
            _building.ModifierSwitchDelayProgress.Bind(x => UpdateModifierRechargeBar());

            UpdateHealthBar();

            if (_spawnButtonView != null)
                _spawnButtonView.Init(onModifierSwitch);
        }

        private void UpdateHealthBar()
        {
            if (_healthbar == null) return;

            var perc = Mathf.Clamp01((float)_building.Health.Value / _building.MaxHealth.Value);
            _healthbar.SetHealth(perc);
        }

        private void UpdateModifierRechargeBar()
        {
            if (_spawnButtonView == null) return;
            var spawnProgress = _building.ModifierSwitchDelayProgress.Value;
            _spawnButtonView.SetVisibility(spawnProgress);
        }
    }
}
