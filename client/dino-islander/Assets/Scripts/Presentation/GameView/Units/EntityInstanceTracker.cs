using Assets.Scripts.Domain;
using System.Collections.Generic;
using UnityEngine;

namespace Assets.Scripts.Presentation
{
    public class EntityInstanceTracker : MonoBehaviour
    {
        private Dictionary<string, GameObject> _instances = new();

        public void RegisterUnit(IEntity idObj, GameObject instance)
        {
            if (!_instances.ContainsKey(idObj.Id))
                _instances.Add(idObj.Id, instance);
            else
                Debug.LogWarning($"Unit {idObj.Id} already registered.");
        }
        public void UnregisterUnit(string id) => _instances.Remove(id);
        public GameObject Get(string id) => _instances.TryGetValue(id, out var go) ? go : null;
    }
}
