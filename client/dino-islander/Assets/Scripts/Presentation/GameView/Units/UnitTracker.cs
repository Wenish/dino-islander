using Assets.Scripts.Domain;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
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
        public void UnregisterUnit(Unit unit, GameObject instance)
        {
            UnregisterUnit(unit.Id);
            
        }
        public void UnregisterUnit(string id)
        {
            Units.Remove(id);
        }
    }
}
