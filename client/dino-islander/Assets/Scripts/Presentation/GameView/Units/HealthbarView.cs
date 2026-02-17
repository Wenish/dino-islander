using UnityEngine;
using UnityEngine.UI;

namespace Assets.Scripts.Presentation
{
    public class HealthbarView : MonoBehaviour
    {
        [SerializeField] private Image _fill;

        public void SetHealth(float healthPercent) => _fill.fillAmount = healthPercent;
    }
}
