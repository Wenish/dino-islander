using Assets.Scripts.Domain;
using System.Collections.Generic;
using UnityEngine;

namespace Assets.Scripts.Presentation
{
    public class UnitTracker : MonoBehaviour
    {
        public Dictionary<string, GameObject> Units = new();

        public void RegisterUnit(Unit unit, GameObject instance)
        { 
            Units.Add(unit.Id, instance);
        }

        public void UnregisterAndDestroy(Unit unit)
        {
            if (Units.TryGetValue(unit.Id, out var instance))
            {
                Destroy(instance);
                UnregisterUnit(unit);
            }
        }

        public void UnregisterUnit(Unit unit)
        {
            UnregisterUnit(unit.Id); 
        }

        public void UnregisterUnit(string id)
        {
            Units.Remove(id);
        }
    }
}
