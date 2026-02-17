

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

        private readonly Observable<int> _maxhealth;
        public IReadOnlyObservable<int> MaxHealth => _maxhealth;

        private readonly Observable<Vector3> _position;
        public IReadOnlyObservable<Vector3> Position => _position;

        private readonly Observable<AnimationType> _animationType;
        public IReadOnlyObservable<AnimationType> AnimationType => _animationType;

        public bool IsHostile { get; }

        public event Action<IDamageable, int> OnDamageTaken;

        public Unit(string id, UnitType type, int maxHealth, bool isHostile)
        {
            Id = id;
            Type = type;
            IsHostile = isHostile;
            _health = new Observable<int>(maxHealth);
            _maxhealth = new Observable<int>(maxHealth);
            _position = new Observable<Vector3>(Vector3.zero);
            _animationType = new Observable<AnimationType>(0);
        }

        public void SyncHealth(int newHealth)
        {
            _health.SetValue(newHealth);
        }

        public void SyncPosition(float x, float y)
        {
            _position.SetValue(new Vector3(x, y, 0f));
        }
        public void SyncAnimation(int type)
        {
            var animType = UnitUtility.GetAnimTypeFromSchema(type);
            _animationType.SetValue(animType);
        }

        public void DamageTaken(int v)
        {
            OnDamageTaken?.Invoke(this, v);
        }

        public void SyncMaxHealth(int maxHealth)
        {
            _maxhealth.SetValue(maxHealth);
        }
    }
}
