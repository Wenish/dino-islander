using Assets.Scripts.Domain;
using System;
using UnityEngine;

namespace Assets.Scripts.Presentation
{
    public class BuildingSpawner : MonoBehaviour
    {
        [SerializeField] private BuildingPrefabConfiguration _buildingConfig;
        [SerializeField] private EntityInstanceTracker _unitInstanceTracker;

        public void SpawnBuilding(IBuilding building, Action onModifierSwitch = null)
        {
            var prefab = _buildingConfig.GetPrefab(building.Type, building.IsHostile);

            if (prefab == null) return;
            var instance = Instantiate(prefab, building.Position, Quaternion.identity);
            _unitInstanceTracker.RegisterUnit(building, instance);
            var view = instance.GetComponent<BuildingView>();
            view.Init(building, onModifierSwitch);
        }

        public void Despawn(string id)
        {
            var instance = _unitInstanceTracker.Get(id);
            if (instance != null)
                Destroy(instance);

            _unitInstanceTracker.UnregisterUnit(id);
        }

        public void DespawnAll()
        {
            _unitInstanceTracker.ClearAll();
        }
    }
}
