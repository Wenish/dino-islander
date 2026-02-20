using UnityEngine;

public class BonkController : MonoBehaviour
{
    public SpriteRenderer hammerSpriteRenderer;
    public GameObject explosionVfx;

    public float rotateHammerAngleAmount = 30f;
    public float rotateHammerAngleDuration = 0.1f;
    public float explosionDuration = 0.3f;

    public void Start()
    {
        StartCoroutine(AnimateHammer());
    }

    private System.Collections.IEnumerator AnimateHammer()
    {
        if (hammerSpriteRenderer == null)
        {
            yield break;
        }

        Transform hammerTransform = hammerSpriteRenderer.transform;
        Quaternion startRotation = hammerTransform.localRotation;

        float halfDuration = rotateHammerAngleDuration * 0.5f;

        yield return RotateToAngle(hammerTransform, startRotation, -rotateHammerAngleAmount, halfDuration);
        yield return RotateToAngle(hammerTransform, startRotation, rotateHammerAngleAmount * 2f, halfDuration);

        if (explosionVfx != null)
        {
            explosionVfx.SetActive(true);
        }

        float delay = Mathf.Max(0f, explosionDuration);
        if (delay > 0f)
        {
            yield return new WaitForSecondsRealtime(delay);
        }

        Destroy(gameObject);
    }

    private System.Collections.IEnumerator RotateToAngle(Transform target, Quaternion baseRotation, float zAngle, float duration)
    {
        if (duration <= 0f)
        {
            target.localRotation = baseRotation * Quaternion.Euler(0f, 0f, zAngle);
            yield break;
        }

        Quaternion from = target.localRotation;
        Quaternion to = baseRotation * Quaternion.Euler(0f, 0f, zAngle);
        float elapsed = 0f;

        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            float t = Mathf.Clamp01(elapsed / duration);
            target.localRotation = Quaternion.Slerp(from, to, t);
            yield return null;
        }

        target.localRotation = to;
    }
}