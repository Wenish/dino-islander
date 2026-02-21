using Assets.Scripts.Application;
using Colyseus;
using DinoIslander.Infrastructure;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;

public class HammerHitService : MonoBehaviour
{
    public GameObject HammerHitEffectPrefab;
    [SerializeField] private Camera _worldCamera;
    [SerializeField] private InputActionReference _attackAction;
    [SerializeField] private SoundService _soundService;
    [SerializeField] private AudioClip _hammerHitSound;

    private Room<GameRoomState> _room;
    private readonly Dictionary<string, GameObject> _activeHammerHitEffectsByPlayer = new();

    private BonkController _bonkController;
    private float _chargeProgress;
    private bool _pendingClick;

    private void Awake()
    {
        if (_worldCamera == null)
            _worldCamera = Camera.main;

        _attackAction.action.performed += OnClick;
        _attackAction.action.Enable();
    }

    public void SetCursorEnabled(bool enabled)
    {
        if (_bonkController == null) return;
        _bonkController.SetHammerMode(enabled);
    }

    public void SetChargeProgress(float progress)
    {
        if (_bonkController == null) return;
        _chargeProgress = progress;
        _bonkController.SetCharge(progress);
    }

    public void Init(Room<GameRoomState> room)
    {
        _room = room;
        _room.OnMessage<HammerHitMessage>("hammerHit", OnHammerHit);

        GameObject cursorGo = Instantiate(HammerHitEffectPrefab);
        _bonkController = cursorGo.GetComponent<BonkController>();
        _bonkController.SetHammerMode(false);
    }

    public void CleanUp()
    {
        if (_bonkController != null)
            Destroy(_bonkController.gameObject);
        _bonkController = null;

        foreach (GameObject effect in _activeHammerHitEffectsByPlayer.Values)
        {
            if (effect != null)
                Destroy(effect);
        }
        _activeHammerHitEffectsByPlayer.Clear();

        _room = null;
        _chargeProgress = 0f;
    }

    private void OnDestroy()
    {
        _attackAction.action.performed -= OnClick;
        _attackAction.action.Disable();
        CleanUp();
    }

    private void OnClick(InputAction.CallbackContext context) => _pendingClick = true;

    private void Update()
    {
        if (!_pendingClick) return;
        _pendingClick = false;

        if (_room == null || _chargeProgress < 1f) return;
        if (EventSystem.current != null && EventSystem.current.IsPointerOverGameObject()) return;

        Camera cameraToUse = _worldCamera != null ? _worldCamera : Camera.main;
        if (cameraToUse == null)
        {
            Debug.LogWarning("Cannot send hammer hit - no camera available");
            return;
        }

        Vector2 screenPosition = Mouse.current.position.ReadValue();
        Vector3 worldPosition = cameraToUse.ScreenToWorldPoint(new Vector3(screenPosition.x, screenPosition.y, -cameraToUse.transform.position.z));
        worldPosition.z = 0f;

        SendHammerHit(worldPosition.x, worldPosition.y);
    }

    private void OnHammerHit(HammerHitMessage hammerHitMessage)
    {
        if (hammerHitMessage == null)
        {
            Debug.LogError("Received invalid hammer hit message");
            return;
        }

        if (HammerHitEffectPrefab == null)
        {
            Debug.LogWarning("Cannot spawn hammer hit effect - prefab is not assigned");
            return;
        }

        if (string.IsNullOrEmpty(hammerHitMessage.playerId))
        {
            Debug.LogWarning("Cannot spawn hammer hit effect - player id is missing");
            return;
        }

        if (_activeHammerHitEffectsByPlayer.TryGetValue(hammerHitMessage.playerId, out GameObject previousEffect) && previousEffect != null)
            Destroy(previousEffect);

        Vector3 position = new Vector3(hammerHitMessage.x, hammerHitMessage.y, 0);
        GameObject newEffect = Instantiate(HammerHitEffectPrefab, position, Quaternion.identity);
        _activeHammerHitEffectsByPlayer[hammerHitMessage.playerId] = newEffect;
        _soundService.PlaySfx(_hammerHitSound);
    }

    public void SendHammerHit(float x, float y)
    {
        if (_room == null)
        {
            Debug.LogWarning("Cannot send hammer hit - not connected to room");
            return;
        }

        var message = new PlayerActionMessage
        {
            actionId = PlayerActionType.BonkEnemies,
            x = x,
            y = y
        };

        _room.Send("requestPlayerAction", message);
    }
}
