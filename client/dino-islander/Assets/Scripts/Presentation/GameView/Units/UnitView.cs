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
        [Tooltip("Maximum time in seconds to reach the latest target position.")]
        [Min(0f)]
        [SerializeField] private float MaxMoveLerpDuration = 0.1f;
        [SerializeField] private SpriteRenderer _spriteRenderer;

        private Vector3 startPosition = Vector3.zero;
        private Vector3 targetPosition = Vector3.zero;
        private float moveStartTime;

        public void Init(IUnit unit)
        {

            _unit = unit;
            if(_animator == null)
                _animator = GetComponentInChildren<Animator>();
            
            if(_spriteRenderer == null)
                _spriteRenderer = GetComponentInChildren<SpriteRenderer>();

            transform.position = _unit.Position.Value;
            startPosition = transform.position;
            targetPosition = transform.position;
            moveStartTime = Time.time;
            _unit.Position.Bind(x => SetPosition(x));
            _unit.AnimationType.Bind(x => SetAnimation(x));
            _unit.ModifierId.Bind(x => SetModifierColor(x));
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
            var name = UnitUtility.GetAnimationNameFromType(currentAnimation);
            if (string.IsNullOrEmpty(name)) return;

            int hash = Animator.StringToHash(name);

            // 0 = Base Layer (usually)
            if (_animator != null && _animator.HasState(0, hash))
            {
                _animator.Play(hash);
                Debug.Log("Playing animation: " + name);
            }
            else
            {
                Debug.LogWarning($"Animation state '{name}' does not exist on {gameObject.name}");
            }
        }

        private void SetModifierColor(int modifierId)
        {
            if (_spriteRenderer == null) return;

            switch (modifierId)
            {
                case ModifierType.Fire:
                    _spriteRenderer.color = new Color(1f, 0.6f, 0.6f);
                    break;
                case ModifierType.Water:
                    _spriteRenderer.color = new Color(0.6f, 0.6f, 1f);
                    break;
                case ModifierType.Earth:
                    _spriteRenderer.color = new Color(0.6f, 1f, 0.6f);
                    break;
                default:
                    _spriteRenderer.color = Color.white;
                    break;
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
