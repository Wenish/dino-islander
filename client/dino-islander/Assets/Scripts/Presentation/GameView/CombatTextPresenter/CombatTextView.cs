using System.Collections;
using TMPro;
using UnityEngine;

namespace Assets.Scripts.Presentation
{
    internal class CombatTextView : MonoBehaviour
    {
        public TextMeshProUGUI DamageText;
        public float Duration;
        public void Init(int damageAmount)
        {
            DamageText.text = damageAmount.ToString();
            StartCoroutine(DestroyAfterDuration(Duration));
        }

        private IEnumerator DestroyAfterDuration(float duration)
        {
            yield return new WaitForSeconds(duration);
            Destroy(gameObject);
            Debug.Log("Damage number destroyed.");
        }
    }
}
