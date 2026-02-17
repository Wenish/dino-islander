using Assets.Scripts.Domain;
using UnityEngine;

namespace Assets.Scripts.Presentation
{
    public class UnitView : MonoBehaviour
    {
        private IUnit _unit;
        [SerializeField] private Animator _animator;
        [SerializeField] private HealthbarView _healthbar;

        public void Init(IUnit unit)
        {
            _unit = unit;
            if(_animator == null)
                _animator = GetComponentInChildren<Animator>();

            transform.position = _unit.Position.Value;
            _unit.Position.Bind(x => SetPosition(x));
            _unit.AnimationType.Bind(x => SetAnimation(x));
            _unit.Health.Bind(x => UpdateHealthBar());
            _unit.MaxHealth.Bind(x => UpdateHealthBar());
            
            UpdateHealthBar();

        }
        private void SetPosition(Vector3 pos)
        {
            var tarPos = Vector3.Lerp(transform.position, pos, 0.1f);
            transform.position = tarPos;
        }
        private void SetAnimation(AnimationType currentAnimation)
        {
            var name = UnitUtility.GetAnimationNameFromType(currentAnimation);
            if(string.IsNullOrEmpty(name)) return;

            //Run / Attack / Idle
            _animator.Play(name);
            Debug.Log("Trying to Set Animation " + name);
        }
        private void UpdateHealthBar()
        {
            if(_healthbar == null) return;

            var perc = Mathf.Clamp01(_unit.Health.Value / _unit.MaxHealth.Value);
            _healthbar.SetHealth(perc);
        }
    }
}
