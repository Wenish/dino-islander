using Assets.Scripts.Domain;
using UnityEngine;

namespace Assets.Scripts.Presentation
{
    public class UnitView : MonoBehaviour
    {
        private IUnit _unit;

        [SerializeField] private Animator _animator;
        [SerializeField] private HealthbarView _healthbar;
        [SerializeField] private float LerpSpeed = 0.7f;    

        private Vector3 targetPosition = Vector3.zero;

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
            targetPosition = pos;

        }
        private void Update()
        {
            var tarPos = Vector3.Lerp(transform.position, targetPosition, Time.deltaTime * LerpSpeed);
            transform.position = tarPos;
        }
        private void SetAnimation(AnimationType currentAnimation)
        {
            var name = UnitUtility.GetAnimationNameFromType(currentAnimation);
            if (string.IsNullOrEmpty(name)) return;

            int hash = Animator.StringToHash(name);

            // 0 = Base Layer (usually)
            if (_animator.HasState(0, hash))
            {
                _animator.Play(hash);
                Debug.Log("Playing animation: " + name);
            }
            else
            {
                Debug.LogWarning($"Animation state '{name}' does not exist on {_animator.gameObject.name}");
            }
        }

        private void UpdateHealthBar()
        {
            if(_healthbar == null) return;

            var perc = Mathf.Clamp01((float)_unit.Health.Value / _unit.MaxHealth.Value);
            _healthbar.SetHealth(perc);
        }
    }
}
