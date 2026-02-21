using Assets.Scripts.Presentation.Controllers;
using UnityEngine;
using UnityEngine.UI;

namespace Assets.Scripts.Presentation.GameView.Hud
{
    public class VolumeSliderView : MonoBehaviour
    {
        [SerializeField] private SoundtrackController _soundtrackController;
        [SerializeField] private Slider _slider;

        private void Start()
        {
            _slider.SetValueWithoutNotify(_soundtrackController.CurrentVolume);
            _slider.onValueChanged.AddListener(OnSliderChanged);
        }

        private void OnDestroy()
        {
            _slider.onValueChanged.RemoveListener(OnSliderChanged);
        }

        private void OnSliderChanged(float value)
        {
            _soundtrackController.SetVolume(value);
        }
    }
}
