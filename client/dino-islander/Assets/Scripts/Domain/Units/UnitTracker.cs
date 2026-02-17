using System;
using System.Collections.Generic;


namespace Assets.Scripts.Domain.Units
{
    public class UnitTracker
    {
        private Dictionary<string, IUnit> _units = new Dictionary<string, IUnit>(); // <id, unit>

        public void AddUnit(IUnit unit) 
        {
            _units.Add(unit.Id, unit);
            OnUnitAdded?.Invoke(unit);
        }
        public void RemoveUnit(IUnit unit)
        {
            _units.Remove(unit.Id);
            OnUnitRemoved?.Invoke(unit);
        }

        public void RemoveUnit(string id)
        {
            var unit = Get(id);
            if(unit != null)
                RemoveUnit(unit);
        }


        public IUnit Get(string id) => _units.TryGetValue(id, out IUnit val) ? val : null;

        public event Action<IUnit> OnUnitAdded;
        public event Action<IUnit> OnUnitRemoved;
    }
}
