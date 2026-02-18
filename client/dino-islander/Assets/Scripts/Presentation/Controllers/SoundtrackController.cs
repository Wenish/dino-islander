using UnityEngine;

namespace Assets.Scripts.Presentation.Controllers
{
    /// <summary>
    /// Plays soundtracks from a SoundtrackCollection in random order on loop.
    /// Automatically starts playing when the scene loads.
    /// 
    /// Usage:
    /// 1. Create a SoundtrackCollection scriptable object and assign audio clips
    /// 2. Add this component to a GameObject in the scene
    /// 3. Assign the SoundtrackCollection to the soundtrackCollection field
    /// 4. Play the scene - soundtracks will start playing automatically
    /// </summary>
    public class SoundtrackController : MonoBehaviour
    {
        [SerializeField] private SoundtrackCollection soundtrackCollection;
        [SerializeField] private float fadeOutDuration = 0.5f;
        [SerializeField] private bool playOnAwake = true;

        private AudioSource audioSource;
        private bool isPlaying = false;
        private float fadeOutTimer = 0f;
        private bool isFadingOut = false;
        private AudioClip[] currentShuffledQueue;
        private int currentTrackIndex = 0;

        private void Awake()
        {
            // Get or create an AudioSource component
            audioSource = GetComponent<AudioSource>();
            if (audioSource == null)
            {
                audioSource = gameObject.AddComponent<AudioSource>();
            }

            // Configure audio source
            audioSource.loop = false; // We'll handle looping manually
            audioSource.playOnAwake = false;
        }

        private void Start()
        {
            if (soundtrackCollection == null)
            {
                Debug.LogError("SoundtrackController: No SoundtrackCollection assigned!", this);
                return;
            }

            if (playOnAwake && soundtrackCollection.HasSoundtracks)
            {
                ShuffleAndPlayNext();
            }
        }

        private void Update()
        {
            // Check if current soundtrack finished playing
            if (isPlaying && !audioSource.isPlaying)
            {
                PlayNextSoundtrack();
            }

            // Handle fade out
            if (isFadingOut)
            {
                fadeOutTimer -= Time.deltaTime;
                if (fadeOutTimer <= 0)
                {
                    audioSource.Stop();
                    isFadingOut = false;
                }
                else
                {
                    // Gradually reduce volume during fade out
                    audioSource.volume = (fadeOutTimer / fadeOutDuration);
                }
            }
        }

        /// <summary>
        /// Shuffle the collection and play the first track
        /// </summary>
        private void ShuffleAndPlayNext()
        {
            currentShuffledQueue = soundtrackCollection.GetShuffledSoundtracks();
            currentTrackIndex = 0;
            PlayCurrentTrack();
        }

        /// <summary>
        /// Play the next soundtrack in the shuffled queue
        /// </summary>
        private void PlayNextSoundtrack()
        {
            if (soundtrackCollection == null || !soundtrackCollection.HasSoundtracks)
            {
                isPlaying = false;
                return;
            }

            // If queue not initialized or we've reached the end, reshuffle
            if (currentShuffledQueue == null || currentTrackIndex >= currentShuffledQueue.Length)
            {
                ShuffleAndPlayNext();
                return;
            }

            PlayCurrentTrack();
        }

        /// <summary>
        /// Play the track at the current index in the shuffled queue
        /// </summary>
        private void PlayCurrentTrack()
        {
            if (currentShuffledQueue == null || currentShuffledQueue.Length == 0)
            {
                isPlaying = false;
                return;
            }

            AudioClip nextClip = currentShuffledQueue[currentTrackIndex];
            currentTrackIndex++;

            if (nextClip != null)
            {
                audioSource.clip = nextClip;
                audioSource.volume = 1f;
                audioSource.Play();
                isPlaying = true;
            }
        }

        /// <summary>
        /// Stop the current soundtrack with fade out
        /// </summary>
        public void Stop()
        {
            isPlaying = false;
            isFadingOut = true;
            fadeOutTimer = fadeOutDuration;
        }

        /// <summary>
        /// Stop immediately without fade out
        /// </summary>
        public void StopImmediate()
        {
            audioSource.Stop();
            isPlaying = false;
            isFadingOut = false;
        }

        /// <summary>
        /// Pause the current soundtrack
        /// </summary>
        public void Pause()
        {
            audioSource.Pause();
            isPlaying = false;
        }

        /// <summary>
        /// Resume playing the current soundtrack
        /// </summary>
        public void Resume()
        {
            if (audioSource.clip != null)
            {
                audioSource.Play();
                isPlaying = true;
            }
        }

        /// <summary>
        /// Set the volume (0-1)
        /// </summary>
        public void SetVolume(float volume)
        {
            audioSource.volume = Mathf.Clamp01(volume);
        }

        /// <summary>
        /// Change the soundtrack collection at runtime
        /// </summary>
        public void SetSoundtrackCollection(SoundtrackCollection newCollection)
        {
            soundtrackCollection = newCollection;
            currentShuffledQueue = null;
            currentTrackIndex = 0;
            if (isPlaying)
            {
                StopImmediate();
                ShuffleAndPlayNext();
            }
        }
    }
}
