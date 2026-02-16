using Assets.Scripts.Domain;
using UnityEngine;
using Colyseus;
using DinoIslander.Infrastructure;

public class GameBootstrap : MonoBehaviour
{
    [SerializeField] private MapView _mapView;
    [SerializeField] private Client _client;
    [SerializeField] private Room<GameRoomState> _room;

    private Map _map;

    private void Start()
    {
        _map = MapGenerator.Generate(30, 20);
        _mapView.Render(_map);

        ConnectToServer();
    }

    public async void ConnectToServer()
    {
        _client = new Client("ws://localhost:3011");
        _room = await _client.JoinOrCreate<GameRoomState>("game");

        if(_room == null)
        {
            Debug.LogError("Failed to join room: room is null");
            return;
        }
        if (_room.State == null)
        {
            Debug.LogError("Failed to get room state: state is null");
            return;
        }
        var callbacks = Colyseus.Schema.Callbacks.Get(_room);
        callbacks.OnAdd(state => state.tiles, (index, tile) =>
        {
            _map.SetTile(tile.x, tile.y, MapUtility.GetTypeFromSchema(tile.type));
            _mapView.UpdateTile(_map, tile.x, tile.y);
        }
        );
        callbacks.OnRemove(state => state.tiles, (index, tile) =>
        {
            _map.SetTile(tile.x, tile.y, FloorType.Empty);
            _mapView.UpdateTile(_map, tile.x, tile.y);
        }
        );
    }
}