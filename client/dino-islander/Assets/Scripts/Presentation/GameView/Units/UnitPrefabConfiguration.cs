using Assets.Scripts.Domain;
using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

[CreateAssetMenu(fileName = "UnitPrefabConfiguration", menuName = "Config/UnitPrefabConfig")]
public class UnitPrefabConfiguration : ScriptableObject
{
    [SerializeField] private List<UnitPrefabMapping> _unitPrefabMapping;

    public GameObject GetUnitPrefab(UnitType type, bool isHostile)
    {
        if (_unitPrefabMapping.Any(p => p.Type == type && isHostile == p.IsHostileVariant))
            return _unitPrefabMapping.First(p => p.Type == type && isHostile == p.IsHostileVariant).Prefab;
        
        
        Debug.Log("No prefab found for type " + type + ".");
        return null;
    }
}

[Serializable]
public class UnitPrefabMapping
{
    public GameObject Prefab;
    public UnitType Type;
    public bool IsHostileVariant;
}
