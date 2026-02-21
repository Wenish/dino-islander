using Assets.Scripts.Application;
using DinoIslander.Infrastructure;

namespace Assets.Scripts.Domain.Units
{
    public class UnitFactory
    {
        public Unit CreateFromSchema(UnitSchema unit, string sessionId, SoundService soundService)
        {
            //neutral units are not hostile
            bool isHostile = string.IsNullOrEmpty(unit.playerId) ? false : unit.playerId != sessionId;
            var type = UnitUtility.GetTypeFromSchema(unit.unitType);
            var domainUnit = new Unit(unit.id, type, unit.health, isHostile, soundService);
            return domainUnit;
        }
    }
}
