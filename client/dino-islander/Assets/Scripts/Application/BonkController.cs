using UnityEngine;
using UnityEngine.InputSystem;

public class BonkController : MonoBehaviour
{
    public SpriteRenderer hammerSpriteRenderer;
    public GameObject explosionVfx;

    public float rotateHammerAngleAmount = 30f;
    public float rotateHammerAngleDuration = 0.1f;
    public float explosionDuration = 0.3f;

    private bool _isHammerMode = false;
    private float _chargeSpentAngle;
    private float _chargeReadyAngle;

    [SerializeField] private Camera _worldCamera;

    /// <summary>
    /// Call immediately after Instantiate() (before Start runs) to switch this instance
    /// into cursor mode: follows the mouse, hides the system cursor, never self-destructs.
    /// </summary>
    public void SetHammerMode(bool enable)
    {

        if (_worldCamera == null)
            _worldCamera = Camera.main;

        // Mirror the animation: bonk ends at +rotateHammerAngleAmount*2 (follow-through),
        // recharge winds back to -rotateHammerAngleAmount (ready to strike).
        _chargeSpentAngle =  rotateHammerAngleAmount * 2f;   // e.g. +60
        _chargeReadyAngle = -rotateHammerAngleAmount;         // e.g. -30

        // OnEnable already ran before this call, so hide the cursor explicitly here.
        Cursor.visible = !enable;
        _isHammerMode = enable;

        gameObject.SetActive(enable);
    }

    private void Start()
    {
        if (!_isHammerMode)
            StartCoroutine(AnimateHammer());
    }

    private void OnEnable()
    {
        if (_isHammerMode)
            Cursor.visible = false;
    }

    private void OnDisable()
    {
        if (_isHammerMode)
            Cursor.visible = true;
    }

    private void Update()
    {
        if (!_isHammerMode || _worldCamera == null || Mouse.current == null) return;

        Vector2 screen = Mouse.current.position.ReadValue();
        Vector3 world = _worldCamera.ScreenToWorldPoint(new Vector3(screen.x, screen.y, -_worldCamera.transform.position.z));
        world.z = 0f;
        transform.position = world;
    }

    /// <summary>
    /// Sets the visible charge level [0,1].
    /// 0 = just hit (wound back / spent), 1 = fully charged (ready to strike).
    /// Only meaningful in cursor mode.
    /// </summary>
    public void SetCharge(float charge)
    {
        if (hammerSpriteRenderer == null) return;
        float angle = Mathf.Lerp(_chargeSpentAngle, _chargeReadyAngle, charge);
        hammerSpriteRenderer.transform.localRotation = Quaternion.Euler(0f, 0f, angle);
    }

    private System.Collections.IEnumerator AnimateHammer()
    {
        if (hammerSpriteRenderer == null) yield break;

        Transform hammerTransform = hammerSpriteRenderer.transform;
        Quaternion startRotation = hammerTransform.localRotation;
        float halfDuration = rotateHammerAngleDuration * 0.5f;

        yield return RotateToAngle(hammerTransform, startRotation, -rotateHammerAngleAmount, halfDuration);
        yield return RotateToAngle(hammerTransform, startRotation, rotateHammerAngleAmount * 2f, halfDuration);

        if (explosionVfx != null)
            explosionVfx.SetActive(true);

        float delay = Mathf.Max(0f, explosionDuration);
        if (delay > 0f)
            yield return new WaitForSecondsRealtime(delay);

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
