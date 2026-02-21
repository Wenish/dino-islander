using Assets.Scripts.Domain;
using DinoIslander.Infrastructure;
using UnityEngine;

namespace Assets.Scripts.Presentation
{
    public class UnitView : MonoBehaviour
    {
        private IUnit _unit;

        [SerializeField] private Animator _animator;
        [SerializeField] private HealthbarView _healthbar;
        private IndicatorModifierView _indicatorModifier;

        [Tooltip("Maximum time in seconds to reach the latest target position.")]
        [Min(0f)]
        [SerializeField] private float MaxMoveLerpDuration = 0.1f;
        [SerializeField] private SpriteRenderer _spriteRenderer;

        private Vector3 startPosition = Vector3.zero;
        private Vector3 targetPosition = Vector3.zero;
        private float moveStartTime;
        private AnimationType _pendingAnimation;
        private bool _animatorReady;

        public void Init(IUnit unit)
        {

            _unit = unit;
            if(_animator == null)
                _animator = GetComponentInChildren<Animator>();
            
            if(_spriteRenderer == null)
                _spriteRenderer = GetComponentInChildren<SpriteRenderer>();

            if(_indicatorModifier == null)
                _indicatorModifier = GetComponentInChildren<IndicatorModifierView>();

            transform.position = _unit.Position.Value;
            startPosition = transform.position;
            targetPosition = transform.position;
            moveStartTime = Time.time;
            _unit.Position.Bind(x => SetPosition(x));
            _unit.AnimationType.Bind(x => SetAnimation(x));
            _unit.ModifierId.Bind(x => SetModifier(x));
            _unit.Health.Bind(x => UpdateHealthBar());
            _unit.MaxHealth.Bind(x => UpdateHealthBar());
            
            UpdateHealthBar();
        }
        private void SetPosition(Vector3 pos)
        {
            startPosition = transform.position;
            targetPosition = pos;
            moveStartTime = Time.time;
            FlipSpriteDirection(targetPosition.x - startPosition.x);

        }
        private void Update()
        {
            if (!_animatorReady && _animator != null && _animator.isInitialized)
            {
                _animatorReady = true;
                ApplyAnimation(_pendingAnimation);
            }
            LerpPosition();
        }

        private void FlipSpriteDirection(float xDirection)
        {
            if (_spriteRenderer == null) return;

            if (xDirection > 0)
            {
                _spriteRenderer.flipX = false;
            }
            else if (xDirection < 0)
            {
                _spriteRenderer.flipX = true;
            }
        }

        private void LerpPosition()
        {
            if (transform.position == targetPosition) return;

            if (MaxMoveLerpDuration <= 0f)
            {
                transform.position = targetPosition;
                return;
            }

            var elapsed = Time.time - moveStartTime;
            var t = Mathf.Clamp01(elapsed / MaxMoveLerpDuration);
            transform.position = Vector3.Lerp(startPosition, targetPosition, t);
        }
        
        private void SetAnimation(AnimationType currentAnimation)
        {
            _pendingAnimation = currentAnimation;
            if (_animatorReady)
            {
                ApplyAnimation(currentAnimation);
            }
        }

        private void ApplyAnimation(AnimationType currentAnimation)
        {
            var name = UnitUtility.GetAnimationNameFromType(currentAnimation);
            if (string.IsNullOrEmpty(name)) return;

            int hash = Animator.StringToHash(name);

            if (_animator != null && _animator.HasState(0, hash))
            {
                _animator.Play(hash);
            }
        }

        private void SetModifier(int modifierId)
        {
            if (_indicatorModifier != null)
            {
                _indicatorModifier.SetModifier(modifierId);
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
