using DinoIslander.Infrastructure;

namespace Assets.Scripts.Domain.Units
{
    public class UnitFactory
    {
        public Unit CreateFromSchema(UnitSchema unit)
        {
            var type = UnitUtility.GetTypeFromSchema(unit.unitType);
            var domainUnit = new Unit(unit.id, type, unit.health);
            return domainUnit;
        }
    }
}
