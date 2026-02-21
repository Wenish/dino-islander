using Assets.Scripts.Domain;
using System;
using UnityEngine;

namespace Assets.Scripts.Presentation.Controllers
{
    [CreateAssetMenu(fileName = "UnitSoundConfig", menuName = "Audio/Unit Sound Config")]
    public class UnitSoundConfig : ScriptableObject
    {
        [SerializeField] private UnitSoundEntry[] _entries;

        public AudioClip GetClip(UnitType unitType, AnimationType state)
        {
            var entry = GetEntry(unitType, state);
            return entry?.GetRandomClip();
        }

        public UnitSoundEntry GetEntry(UnitType unitType, AnimationType state)
        {
            if (_entries == null) return null;

            foreach (var entry in _entries)
            {
                if (entry.UnitType == unitType && entry.State == state)
                    return entry;
            }
            return null;
        }
    }

    [Serializable]
    public class UnitSoundEntry
    {
        [field: SerializeField] public UnitType UnitType { get; private set; }
        [field: SerializeField] public AnimationType State { get; private set; }
        [SerializeField] private AudioClip[] _clips;
        [SerializeField] [Range(0f, 1f)] private float _volume = 1f;
        [SerializeField] private bool _loop;

        public float Volume => _volume;
        public bool Loop => _loop;

        public AudioClip GetRandomClip()
        {
            if (_clips == null || _clips.Length == 0) return null;
            return _clips[UnityEngine.Random.Range(0, _clips.Length)];
        }
    }
}
