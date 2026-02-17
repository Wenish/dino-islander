using Assets.Scripts.Domain;
using Assets.Scripts.Domain.Units;
using UnityEngine;

namespace Assets.Scripts.Presentation
{
    public class CombatTextManager : MonoBehaviour
    {
        [SerializeField] private GameObject combatTextPrefab;
        [SerializeField] private Vector3 Offset;
        [SerializeField] private Transform combatTextContainer;
        [SerializeField] private UnitInstanceTracker _instanceTracker;

        private Camera _mainCam;
        [SerializeField] private Canvas _canvas;
        private UnitTracker _unitTracker;
     
        public void Init(UnitTracker unitTracker)
        {
            _mainCam = Camera.main;
            _unitTracker = unitTracker;

            _unitTracker.OnUnitAdded += OnUnitAdded;
            _unitTracker.OnUnitRemoved += OnUnitRemoved;
        }

        private void OnDestroy()
        {
            _unitTracker.OnUnitAdded -= OnUnitAdded;
            _unitTracker.OnUnitRemoved -= OnUnitRemoved;
        }

        private void OnUnitAdded(IUnit unit)
        {
            unit.OnDamageTaken += HandleDamageTaken;
        }
        private void OnUnitRemoved(IUnit unit)
        {
            unit.OnDamageTaken -= HandleDamageTaken;
        }
        private void HandleDamageTaken(IUnit unit, int damageAmount)
        {

            var view = _instanceTracker.Get(unit.Id);
            if(view == null) return;

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