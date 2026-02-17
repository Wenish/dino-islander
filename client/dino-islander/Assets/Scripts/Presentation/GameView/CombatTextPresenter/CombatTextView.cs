using TMPro;
using UnityEngine;

namespace Assets.Scripts.Presentation
{
    internal class CombatTextView : MonoBehaviour
    {
        [SerializeField] private TextMeshProUGUI _damageText;
        [SerializeField] private float _duration = 1.5f;

        private float _remainingTime;
        private bool _isActive;
        private CanvasGroup _cg;

        private void Awake()
        {
            _cg = GetComponent<CanvasGroup>();
        }

        public void Init(int damageAmount)
        {
            _damageText.text = damageAmount.ToString();

            _remainingTime = _duration;
            _cg.alpha = 1f;
            _isActive = true;
        }

        private void Update()
        {
            if (!_isActive) return;

            _remainingTime -= Time.deltaTime;

            float normalizedTime = Mathf.Clamp01(_remainingTime / _duration);

            // Fade alpha
            _cg.alpha = normalizedTime;

            if (_remainingTime <= 0f)
            {
                Destroy(gameObject);
            }
        }
    }
}