using Assets.Scripts.Domain;
using Assets.Scripts.Domain.Units;
using Assets.Scripts.Presentation;
using Colyseus;
using Colyseus.Schema;
using DinoIslander.Infrastructure;
using UnityEngine;

public class GameBootstrap : MonoBehaviour
{
    [SerializeField] private UnitSpawner _unitSpawner;
    [SerializeField] private MapView _mapView;
    [SerializeField] private Client _client;
    [SerializeField] private Room<GameRoomState> _room;

    private UnitFactory _unitFactory;
    private UnitTracker _unitTracker;
    private Map _map;

    private void Start()
    {
        _unitTracker = new UnitTracker();
        _unitFactory = new UnitFactory();
        _mapView.Render(_map);

        ConnectToServer();
    }

    public async void ConnectToServer()
    {
        _client = new Client("ws://localhost:3011");
        _room = await _client.JoinOrCreate<GameRoomState>("game");
        
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
            var domainUnit = _unitFactory.CreateFromSchema(unit);

            callbacks.Listen(unit, unit => unit.health, (value, previousValue) =>
            {
                domainUnit.SyncHealth(unit.health);
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