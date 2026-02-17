using UnityEngine;

namespace Assets.Scripts.Domain
{
    public interface IBuilding : IDamageable, IEntity
    {
        BuildingType Type { get; }
        bool IsHostile { get; }
        Vector3 Position { get; }
    }
}
