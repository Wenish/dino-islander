using UnityEngine;

namespace Assets.Scripts.Presentation.Controllers
{
    /// <summary>
    /// Scriptable object that holds a collection of soundtrack audio clips
    /// Assign this to the SoundtrackController to play soundtracks
    /// </summary>
    [CreateAssetMenu(fileName = "SoundtrackCollection", menuName = "Audio/Soundtrack Collection", order = 1)]
    public class SoundtrackCollection : ScriptableObject
    {
        [SerializeField] private AudioClip[] soundtracks;

        public AudioClip[] Soundtracks => soundtracks;

        public bool HasSoundtracks => soundtracks != null && soundtracks.Length > 0;

        /// <summary>
        /// Get a shuffled copy of all soundtracks in the collection
        /// Uses Fisher-Yates shuffle algorithm to ensure proper randomization
        /// </summary>
        public AudioClip[] GetShuffledSoundtracks()
        {
            if (!HasSoundtracks)
            {
                Debug.LogError("SoundtrackCollection has no soundtracks assigned!");
                return new AudioClip[0];
            }

            // Create a copy of the array
            AudioClip[] shuffled = new AudioClip[soundtracks.Length];
            System.Array.Copy(soundtracks, shuffled, soundtracks.Length);

            // Fisher-Yates shuffle
            for (int i = shuffled.Length - 1; i > 0; i--)
            {
                int randomIndex = Random.Range(0, i + 1);
                // Swap
                AudioClip temp = shuffled[i];
                shuffled[i] = shuffled[randomIndex];
                shuffled[randomIndex] = temp;
            }

            return shuffled;
        }
    }
}
