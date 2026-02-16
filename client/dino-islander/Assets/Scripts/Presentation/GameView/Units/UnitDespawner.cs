using Assets.Scripts.Domain;
using UnityEngine;

namespace Assets.Scripts.Presentation
{
    public class UnitDespawner : MonoBehaviour
    {
        [SerializeField] private UnitTracker _unitTracker;
        public void DespawnUnit(Unit unit)
        {
            _unitTracker.UnregisterAndDestroy(unit);
        }
    }
}
