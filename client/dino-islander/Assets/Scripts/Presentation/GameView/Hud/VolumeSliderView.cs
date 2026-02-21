using Assets.Scripts.Application;
using UnityEngine;
using UnityEngine.UI;

namespace Assets.Scripts.Presentation.GameView.Hud
{
    public class VolumeSliderView : MonoBehaviour
    {
        [SerializeField] private SoundService _soundService;
        [SerializeField] private Slider _slider;

        private void Start()
        {
            _slider.SetValueWithoutNotify(_soundService.UserVolume);
            _slider.onValueChanged.AddListener(OnSliderChanged);
        }

        private void OnDestroy() => _slider.onValueChanged.RemoveListener(OnSliderChanged);

        private void OnSliderChanged(float value) => _soundService.SetVolume(value);
    }
}
