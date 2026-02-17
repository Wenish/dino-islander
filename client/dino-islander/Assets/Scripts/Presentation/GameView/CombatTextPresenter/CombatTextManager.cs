using Assets.Scripts.Domain;
using Unity.VisualScripting;
using UnityEngine;

namespace Assets.Scripts.Presentation
{
    public class CombatTextManager : MonoBehaviour
    {
        [SerializeField] private GameObject combatTextPrefab;
        [SerializeField] private Vector3 Offset;
        [SerializeField] private Transform combatTextContainer;
        [SerializeField] private EntityInstanceTracker _instanceTracker;

        private Camera _mainCam;
        [SerializeField] private Canvas _canvas;
        private EntityTracker _entityTracker;
     
        public void Init(EntityTracker unitTracker)
        {
            _mainCam = Camera.main;
            _entityTracker = unitTracker;

            _entityTracker.OnAdded += OnUnitAdded;
            _entityTracker.OnRemoved += OnUnitRemoved;
        }

        private void OnDestroy()
        {
            _entityTracker.OnAdded -= OnUnitAdded;
            _entityTracker.OnRemoved -= OnUnitRemoved;
        }

        private void OnUnitAdded(IDamageable unit)
        {
            unit.OnDamageTaken += HandleDamageTaken;
        }
        private void OnUnitRemoved(IDamageable unit)
        {
            unit.OnDamageTaken -= HandleDamageTaken;
        }
        private void HandleDamageTaken(IDamageable damageable, int damageAmount)
        {
            if (damageable is not IEntity entity) return;

            var view = _instanceTracker.Get(entity.Id);
            if (view == null) return;

            InstantiateCombatText(damageAmount, view.transform.position);
        }

        private CombatTextView InstantiateCombatText(int damageAmount, Vector3 position)
        {
            var go = Instantiate(combatTextPrefab, combatTextContainer);
            CombatTextView combatText = go.GetComponent<CombatTextView>();
            combatText.Init(damageAmount);

            Vector3 worldPos = position + Offset;
            Vector3 screenPos = _mainCam.WorldToScreenPoint(worldPos);

            RectTransform textRect = go.GetComponent<RectTransform>();
            textRect.position = screenPos;

            return combatText;
        }
    }
}