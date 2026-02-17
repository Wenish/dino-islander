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

            var combatText = InstantiateCombatText(damageAmount);
            // Convert world position to canvas local position
            Vector3 worldPos = view.transform.position + Offset;
            Vector2 screenPoint = RectTransformUtility.WorldToScreenPoint(_mainCam, worldPos);

            RectTransformUtility.ScreenPointToLocalPointInRectangle(
                combatTextContainer as RectTransform,
                screenPoint,
                _mainCam,
                out Vector2 localPoint
            );

            combatText.transform.localPosition = localPoint; // set local position in canvas
            Debug.Log("Damage number instantiated at canvas local position " + localPoint);
        }
        private CombatTextView InstantiateCombatText(int damageAmount)
        {
            var go = Instantiate(combatTextPrefab, combatTextContainer);
            CombatTextView combatText = go.GetComponent<CombatTextView>();
            combatText.Init(damageAmount);
            return combatText;
        }
    }
}