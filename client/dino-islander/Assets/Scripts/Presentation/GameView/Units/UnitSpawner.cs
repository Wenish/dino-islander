using Assets.Scripts.Domain;
using Assets.Scripts.Presentation;
using UnityEngine;

namespace Assets.Scripts.Presentation
{
    public class UnitSpawner : MonoBehaviour
    {
        [SerializeField] private UnitPrefabConfiguration _unitConfig;
        [SerializeField] private UnitTracker _unitTracker;
        public void SpawnUnit(Unit unit)
        {
            var prefab = _unitConfig.GetUnitPrefab(unit.Type);

            if(prefab == null) return;
            var instance = Instantiate(prefab, Vector3.zero, Quaternion.identity);
            _unitTracker.RegisterUnit(unit, instance);
        }
    }
}
