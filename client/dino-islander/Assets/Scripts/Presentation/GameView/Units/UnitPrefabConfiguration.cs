using Assets.Scripts.Domain;
using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

[CreateAssetMenu(fileName = "UnitPrefabConfiguration", menuName = "Config/UnitPrefabConfig")]
public class UnitPrefabConfiguration : ScriptableObject
{
    [SerializeField] private List<UnitPrefabMapping> _unitPrefabMapping;
    [SerializeField] private GameObject _defaultPrefab;

    public GameObject GetPrefab(UnitType type, bool isHostile)
    {
        Debug.Log("Looking for prefab with type " + type + " and isHostile " + isHostile);
        Debug.Log("Available prefabs: " + string.Join(", ", _unitPrefabMapping.Select(p => $"[Type: {p.Type}, IsHostile: {p.IsHostileVariant}]")));
        if (_unitPrefabMapping.Any(p => p.Type == type && isHostile == p.IsHostileVariant))
            return _unitPrefabMapping.First(p => p.Type == type && isHostile == p.IsHostileVariant).Prefab;

        Debug.Log("No prefab found for type " + type + ".");
        return _defaultPrefab;
    }
}

[Serializable]
public class UnitPrefabMapping
{
    public GameObject Prefab;
    public UnitType Type;
    public bool IsHostileVariant;
}
