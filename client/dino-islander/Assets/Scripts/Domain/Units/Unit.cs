

using System;
using UnityEngine;

namespace Assets.Scripts.Domain
{
    public class Unit : IUnit
    {
        public string Id { get; }
        public UnitType Type { get; }

        private readonly Observable<int> _health;
        public IReadOnlyObservable<int> Health => _health;

        private readonly Observable<Vector3> _position;
        public IReadOnlyObservable<Vector3> Position => _position;

        public bool IsHostile { get; }

        event Action<IUnit, int> OnDamageTaken;

        public Unit(string id, UnitType type, int initialHealth, bool isHostile)
        {
            Id = id;
            Type = type;
            IsHostile = isHostile;
            _health = new Observable<int>(initialHealth);
            _position = new Observable<Vector3>(Vector3.zero);
        }

        // Called ONLY by networking layer
        public void SyncHealth(int newHealth)
        {
            _health.SetValue(newHealth);
        }
        public void SyncPosition(float x, float y)
        {
            _position.SetValue(new Vector3(x, y, 0f));
        }

        public void DamageTaken(int v)
        {
            OnDamageTaken?.Invoke(this, v);
        }
    }

    public interface IUnit
    {
        string Id { get; }
        UnitType Type { get; }
        IReadOnlyObservable<int> Health { get; }
        IReadOnlyObservable<Vector3> Position { get; }
        bool IsHostile { get; }
        void SyncHealth(int newHealth);
        void SyncPosition(float x, float y);

        event Action<IUnit, int> OnDamageTaken;
    }
}