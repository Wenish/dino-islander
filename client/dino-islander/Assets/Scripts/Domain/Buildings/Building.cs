using System;
using TMPro;
using UnityEngine;

namespace Assets.Scripts.Domain
{
    public class Building : IBuilding
    {
        public Building(string id, BuildingType type, Vector3 position, int maxHealth, bool isHostile, float modifierSwitchDelayProgress)
        {
            _maxhealth = new Observable<int>(maxHealth);
            _health = new Observable<int>(maxHealth);
            _modifierSwitchDelayProgress = new Observable<float>(modifierSwitchDelayProgress);
            _position = position;
            _id = id;
            _type = type;
            _istHostile = isHostile;
        }

        public string Id => _id;
        private string _id;

        public Vector3 Position => _position;
        private Vector3 _position = Vector3.zero;

        private readonly Observable<int> _health;
        public IReadOnlyObservable<int> Health => _health;

        private readonly Observable<int> _maxhealth;
        public IReadOnlyObservable<int> MaxHealth => _maxhealth;

        private readonly Observable<float> _modifierSwitchDelayProgress;
        public IReadOnlyObservable<float> ModifierSwitchDelayProgress => _modifierSwitchDelayProgress;

        public BuildingType Type => _type;
        private BuildingType _type;

        public bool IsHostile => _istHostile;
        private bool _istHostile;

        public void SyncMaxHealth(int maxHealth)
        {
            _maxhealth.SetValue(maxHealth);
        }

        public void SyncHealth(int newHealth)
        {
            _health.SetValue(newHealth);
        }

        public void SyncModifierSwitchDelayProgress(float progress)
        {
            _modifierSwitchDelayProgress.SetValue(progress);
        }

        public void DamageTaken(int v)
        {
            OnDamageTaken?.Invoke(this, v);
        }
        public event Action<IDamageable, int> OnDamageTaken;
    }
}
