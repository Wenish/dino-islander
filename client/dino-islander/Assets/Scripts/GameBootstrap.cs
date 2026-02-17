using Assets.Scripts.Domain;
using Assets.Scripts.Domain.Units;
using Assets.Scripts.Presentation;
using Colyseus;
using Colyseus.Schema;
using DinoIslander.Infrastructure;
using System.Collections.Generic;
using UnityEngine;

public class GameBootstrap : MonoBehaviour
{
    [SerializeField] private UnitSpawner _unitSpawner;
    [SerializeField] private MapView _mapView;
    [SerializeField] private Client _client;
    [SerializeField] private Room<GameRoomState> _room;
    [SerializeField] private Camera _mainCam;
    [SerializeField] private CombatTextManager _combatTextManager;

    private UnitFactory _unitFactory;
    private UnitTracker _unitTracker;
    private Map _map;

    private void Start()
    {
        _unitTracker = new UnitTracker();
        _unitFactory = new UnitFactory();
        _combatTextManager.Init(_unitTracker);

        ConnectToServer();
    }

    public void SetCamPosition(float x, float y)
    {
        _mainCam.transform.position = new Vector3(x, y, _mainCam.transform.position.z);
    }
    private async void OnApplicationQuit()
    {
        if (_room != null)
        {
            await _room.Leave();
        }
    }

    public async void ConnectToServer()
    {
#if UNITY_EDITOR
        _client = new Client("ws://localhost:3011");
#else
        _client = new Client("wss://dino-islander-server.pibern.ch");
#endif
        //_room = await _client.JoinOrCreate<GameRoomState>("game");

        var options = new Dictionary<string, object>
        {
            { "fillWithBots", true },
            { "botBehavior", "basic" }
        };

        _room = await _client.JoinOrCreate<GameRoomState>("game", options);

        if (_room == null)
        {
            Debug.LogError("Failed to join room: room is null");
            return;
        }
        if (_room.State == null)
        {
            Debug.LogError("Failed to get room state: state is null");
            return;
        }

        _room.OnStateChange += (state, isFirstState) =>
        {
            if (isFirstState)
            {
                _map = MapGenerator.Generate(state.width, state.height);
                SetCamPosition(state.width / 2, state.height / 2);
                RegisterCallbacks();
            }
        };
    }

    private void RegisterCallbacks()
    {
        var callbacks = Callbacks.Get(_room);

        RegisterTileCallbacks(callbacks);
        RegisterUnitCallbacks(callbacks);
    }

    private void RegisterUnitCallbacks(StateCallbackStrategy<GameRoomState> callbacks)
    {
        callbacks.OnAdd(state => state.units, (index, unit) =>
        {
            var domainUnit = _unitFactory.CreateFromSchema(unit, _room.SessionId);

            callbacks.Listen(unit, unit => unit.health, (value, previousValue) =>
            {
                if (previousValue <= 0) return;
                var dmg = previousValue - value;
                dmg = Mathf.Clamp(dmg, 0, dmg);

                domainUnit.DamageTaken(dmg);
                domainUnit.SyncHealth(unit.health);
            });
            callbacks.Listen(unit, unit => unit.maxHealth, (value, previousValue) =>
            {
                domainUnit.SyncMaxHealth(unit.maxHealth);
            });
            callbacks.Listen(unit, unit => unit.behaviorState, (value, previousValue) =>
            {
                domainUnit.SyncAnimation(unit.behaviorState);
            });
            callbacks.Listen(unit, unit => unit.y, (value, previousValue) =>
            {
                domainUnit.SyncPosition(domainUnit.Position.Value.x, value);
            });
            callbacks.Listen(unit, unit => unit.x, (value, previousValue) =>
            {
                domainUnit.SyncPosition(value, domainUnit.Position.Value.y);
            });

            domainUnit.SyncPosition(unit.x, unit.y);
            _unitTracker.AddUnit(domainUnit);
            _unitSpawner.SpawnUnit(domainUnit);
        });

        //unit callbacks
        callbacks.OnRemove(state => state.units, (index, unit) =>
        {
            _unitSpawner.DespawnUnit(unit.id);
            _unitTracker.RemoveUnit(unit.id);
        });
    }
    private void RegisterTileCallbacks(StateCallbackStrategy<GameRoomState> callbacks)
    {
        //tile callbacks
        callbacks.OnAdd(state => state.tiles, (index, tile) =>
        {
            _map.SetTile(tile.x, tile.y, MapUtility.GetTypeFromSchema(tile.type));
            _mapView.UpdateTile(_map, tile.x, tile.y);
        });
        callbacks.OnRemove(state => state.tiles, (index, tile) =>
        {
            _map.SetTile(tile.x, tile.y, FloorType.Empty);
            _mapView.UpdateTile(_map, tile.x, tile.y);
        });
    }
}