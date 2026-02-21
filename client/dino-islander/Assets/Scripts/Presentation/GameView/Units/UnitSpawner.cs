using Assets.Scripts.Domain;
using UnityEngine;

namespace Assets.Scripts.Presentation
{
    public class UnitSpawner : MonoBehaviour
    {
        [SerializeField] private UnitPrefabConfiguration _unitConfig;
        [SerializeField] private EntityInstanceTracker _unitInstanceTracker;

        public void SpawnUnit(IUnit unit)
        {
            var prefab = _unitConfig.GetPrefab(unit.Type, unit.IsHostile);

            if(prefab == null) return;
            var instance = Instantiate(prefab, unit.Position.Value, Quaternion.identity);
            _unitInstanceTracker.RegisterUnit(unit, instance);
            var view = instance.GetComponent<UnitView>();
            view.Init(unit);
        }

        public void DespawnUnit(string id)
        {
            var instance = _unitInstanceTracker.Get(id);
            if(instance != null)
                Destroy(instance);

            _unitInstanceTracker.UnregisterUnit(id);
        }

        public void DespawnAll()
        {
            _unitInstanceTracker.ClearAll();
        }
    }
}
