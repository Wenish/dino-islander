using Assets.Scripts.Domain;
using System.Collections.Generic;
using System.Threading;
using UnityEngine;

namespace Assets.Scripts.Presentation
{
    public class UnitInstanceTracker : MonoBehaviour
    {
        private Dictionary<string, GameObject> _units = new();

        public void RegisterUnit(IUnit unit, GameObject instance)
        { 
            _units.Add(unit.Id, instance);
        }
        public void UnregisterUnit(string id)
        {
            _units.Remove(id);
        }

        public GameObject Get(string id) => _units.TryGetValue(id, out var go) ? go : null;
    }
}
