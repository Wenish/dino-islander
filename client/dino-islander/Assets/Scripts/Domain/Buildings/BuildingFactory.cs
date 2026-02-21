using DinoIslander.Infrastructure;
using UnityEngine;

namespace Assets.Scripts.Domain
{
    public class BuildingFactory
    {
        public Building CreateFromSchema(BuildingSchema building, string sessionId)
        {
            bool isHostile = string.IsNullOrEmpty(building.playerId) || building.playerId != sessionId;
            var type = BuildingUtility.GetTypeFromSchema(building.buildingType);
            var domainUnit = new Building(building.id, type, new Vector3(building.x, building.y, 0) ,building.health, isHostile, 1.0f);
            return domainUnit;
        }
    }
}
