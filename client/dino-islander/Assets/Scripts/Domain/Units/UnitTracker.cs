using System.Collections.Generic;


namespace Assets.Scripts.Domain.Units
{
    public class UnitTracker
    {
        private Dictionary<string, IUnit> _units = new Dictionary<string, IUnit>(); // <id, unit>

        public void AddUnit(IUnit unit) => _units.Add(unit.Id, unit); 
        public void RemoveUnit(string id) => _units.Remove(id);
        public IUnit GetUnit(string id) => _units.TryGetValue(id, out IUnit val) ? val : null;
    }
}
