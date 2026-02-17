using Assets.Scripts.Domain;
using UnityEngine;

namespace Assets.Scripts.Presentation
{
    public class BuildingView : MonoBehaviour
    {
        private IBuilding _building;
        [SerializeField] private HealthbarView _healthbar;

        public void Init(IBuilding building)
        {
            _building = building;

            transform.position = _building.Position;
            _building.Health.Bind(x => UpdateHealthBar());
            _building.MaxHealth.Bind(x => UpdateHealthBar());

            UpdateHealthBar();
        }

        private void UpdateHealthBar()
        {
            if (_healthbar == null) return;

            var perc = Mathf.Clamp01((float)_building.Health.Value / _building.MaxHealth.Value);
            _healthbar.SetHealth(perc);
        }
    }
}
