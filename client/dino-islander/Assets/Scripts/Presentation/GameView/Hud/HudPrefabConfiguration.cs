using Assets.Scripts.Domain;
using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

[CreateAssetMenu(fileName = "hudPrefabConfiguration", menuName = "Config/HudPrefabConfig")]
public class HudPrefabConfiguration : ScriptableObject
{
    [SerializeField] private List<HudPrefabMapping> _buildingPrefabMapping;

    public GameObject GetPrefab(HudType type)
    {
        if (_buildingPrefabMapping.Any(p => p.Type == type))
            return _buildingPrefabMapping.First(p => p.Type == type).Prefab;

        Debug.Log("No prefab found for HudType " + type + ".");
        return null;
    }
}

[Serializable]
public class HudPrefabMapping
{
    public GameObject Prefab;
    public HudType Type;
}
