using Assets.Scripts.Domain;
using Assets.Scripts.Presentation.Controllers;
using UnityEngine;

namespace Assets.Scripts.Application
{
    public class SoundService : MonoBehaviour
    {
        [SerializeField] private SoundtrackController _soundtrackController;
        [SerializeField] private UnitSoundConfig _unitSoundConfig;
        [SerializeField] private int _maxConcurrentSfx = 4;
        [SerializeField] private float _duckedVolume = 0.15f;
        [SerializeField] private float _duckFadeDuration = 0.4f;

        private AudioSource[] _sfxSources;
        private int _nextSourceIndex;

        private float _userVolume = 1f;
        private float _targetVolume = 1f;
        private float _fadeSpeed;
        private bool _isFading;

        public float UserVolume => _userVolume;

        private void Awake()
        {
            _sfxSources = new AudioSource[_maxConcurrentSfx];
            for (int i = 0; i < _maxConcurrentSfx; i++)
            {
                _sfxSources[i] = gameObject.AddComponent<AudioSource>();
                _sfxSources[i].playOnAwake = false;
            }
        }

        // ── SFX ──────────────────────────────────────────

        public void PlaySfx(AudioClip clip, float volume = 1f)
        {
            if (clip == null) return;

            var source = GetAvailableSource();
            if (source == null) return;

            source.PlayOneShot(clip, volume * _userVolume);
        }

        private AudioSource GetAvailableSource()
        {
            for (int i = 0; i < _sfxSources.Length; i++)
            {
                int idx = (_nextSourceIndex + i) % _sfxSources.Length;
                if (!_sfxSources[idx].isPlaying)
                {
                    _nextSourceIndex = (idx + 1) % _sfxSources.Length;
                    return _sfxSources[idx];
                }
            }
            return null;
        }

        public AudioSource PlayLoop(AudioClip clip, float volume = 1f)
        {
            if (clip == null) return null;

            var source = GetAvailableSource();
            if (source == null) return null;

            source.clip = clip;
            source.volume = volume * _userVolume;
            source.loop = true;
            source.Play();
            return source;
        }

        public void StopLoop(AudioSource source)
        {
            if (source == null) return;
            source.Stop();
            source.loop = false;
            source.clip = null;
        }

        public AudioSource PlayUnitSound(UnitType unitType, AnimationType state)
        {
            if (_unitSoundConfig == null) return null;

            var entry = _unitSoundConfig.GetEntry(unitType, state);
            if (entry == null) return null;

            var clip = entry.GetRandomClip();
            if (clip == null) return null;

            if (entry.Loop)
                return PlayLoop(clip, entry.Volume);

            PlaySfx(clip, entry.Volume);
            return null;
        }

        // ── Soundtrack volume ────────────────────────────

        public void SetVolume(float volume)
        {
            _userVolume = Mathf.Clamp01(volume);
            _targetVolume = _userVolume;
            _isFading = false;
            _soundtrackController.SetVolume(_userVolume);
        }

        public void DuckVolume()
        {
            _targetVolume = _duckedVolume * _userVolume;
            StartFade();
        }

        public void RestoreVolume()
        {
            _targetVolume = _userVolume;
            StartFade();
        }

        private void StartFade()
        {
            if (_duckFadeDuration <= 0f)
            {
                _soundtrackController.SetVolume(_targetVolume);
                _isFading = false;
                return;
            }

            _fadeSpeed = Mathf.Abs(_targetVolume - _soundtrackController.CurrentVolume) / _duckFadeDuration;
            _isFading = true;
        }

        // ── Update ───────────────────────────────────────

        private void Update()
        {
            if (!_isFading) return;

            var current = _soundtrackController.CurrentVolume;
            var next = Mathf.MoveTowards(current, _targetVolume, _fadeSpeed * Time.deltaTime);
            _soundtrackController.SetVolume(next);

            if (Mathf.Approximately(next, _targetVolume))
                _isFading = false;
        }
    }
}
