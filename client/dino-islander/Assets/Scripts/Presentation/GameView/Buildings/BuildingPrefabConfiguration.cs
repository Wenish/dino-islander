using Assets.Scripts.Domain;
using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

[CreateAssetMenu(fileName = "BuildingPrefabConfiguration", menuName = "Config/BuildingPrefabConfig")]
public class BuildingPrefabConfiguration : ScriptableObject
{
    [SerializeField] private List<BuildingPrefabMapping> _buildingPrefabMapping;

    public GameObject GetPrefab(BuildingType type, bool isHostile)
    {
        if (_buildingPrefabMapping.Any(p => p.Type == type && isHostile == p.IsHostileVariant))
            return _buildingPrefabMapping.First(p => p.Type == type && isHostile == p.IsHostileVariant).Prefab;

        Debug.Log("No prefab found for BuildingType " + type + ".");
        return null;
    }
}

[Serializable]
public class BuildingPrefabMapping
{
    public GameObject Prefab;
    public BuildingType Type;
    public bool IsHostileVariant;
}
