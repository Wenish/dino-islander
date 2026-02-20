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

    private Room<GameRoomState> _room;
    private readonly Dictionary<string, GameObject> _activeHammerHitEffectsByPlayer = new();

    [SerializeField] private InputActionReference _attackAction;

    private void Awake()
    {
        if (_worldCamera == null)
        {
            _worldCamera = Camera.main;
        }

        _attackAction.action.performed += OnClick;
        _attackAction.action.Enable();
    }

    private void OnClick(InputAction.CallbackContext context)
    {
        if (_room == null)
        {
            return;
        }

        if (EventSystem.current != null && EventSystem.current.IsPointerOverGameObject())
        {
            return;
        }

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

    public void Init(Room<GameRoomState> room)
    {
        _room = room;
        _room.OnMessage<HammerHitMessage>("hammerHit", OnHammerHit);
    }

    private void OnDestroy()
    {
        _attackAction.action.performed -= OnClick;
        _attackAction.action.Disable();

        _room = null;

        foreach (GameObject effect in _activeHammerHitEffectsByPlayer.Values)
        {
            if (effect != null)
            {
                Destroy(effect);
            }
        }

        _activeHammerHitEffectsByPlayer.Clear();
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
        {
            Destroy(previousEffect);
        }

        Vector3 position = new Vector3(hammerHitMessage.x, hammerHitMessage.y, 0);
        GameObject newEffect = Instantiate(HammerHitEffectPrefab, position, Quaternion.identity);
        _activeHammerHitEffectsByPlayer[hammerHitMessage.playerId] = newEffect;
    }

    public void SendHammerHit(float x, float y)
    {
        if (_room == null)
        {
            Debug.LogWarning("Cannot send hammer hit - not connected to room");
            return;
        }

        RequestHammerHitMessage message = new RequestHammerHitMessage
        {
            x = x,
            y = y
        };

        _room.Send("requestHammerHit", message);
    }
}
