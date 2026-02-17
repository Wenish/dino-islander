using UnityEngine;

namespace Assets.Scripts.Domain
{
    public interface IUnit : IDamageable, IEntity
    {
        UnitType Type { get; }
        IReadOnlyObservable<Vector3> Position { get; }
        IReadOnlyObservable<AnimationType> AnimationType { get; }
        bool IsHostile { get; }

        void SyncPosition(float x, float y);
        void SyncAnimation(int type);
    }
}
