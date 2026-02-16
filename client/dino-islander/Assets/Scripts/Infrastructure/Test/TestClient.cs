using Colyseus;
using DinoIslander.Infrastructure;
using UnityEngine;

public class TestClient : MonoBehaviour
{
    private Client client;
    private Room<GameRoomState> room;

    async void Start()
    {
        try
        {
            // Connect to server
            client = new Client("ws://localhost:3001");
            room = await client.JoinOrCreate<GameRoomState>("game");

            if (room == null)
            {
                Debug.LogError("Failed to join room: room is null");
                return;
            }

            if (room.State == null)
            {
                Debug.LogError("Failed to get room state: state is null");
                return;
            }

            room.OnStateChange += (state, isFirstState) =>
            {
                if (isFirstState)
                {
                    Debug.Log("Initial room state received");

                    // Load initial map stats
                    int mapWidth = state.width;
                    int mapHeight = state.height;
                    Debug.Log($"Map dimensions: {mapWidth}x{mapHeight}");


                    var callbacks = Colyseus.Schema.Callbacks.Get(room);

                    callbacks.OnAdd(state => state.tiles, (index, tile) =>
                    {
                        Debug.Log($"Tile added at index {index}: {tile}");
                        // example call setTileOnMap(tile)
                    });

                    callbacks.OnChange(state => state.tiles, (index, tile) =>
                    {
                        Debug.Log($"Tile changed at index {index}: {tile}");
                        // example call updateTileOnMap(tile)
                    });

                    callbacks.OnRemove(state => state.tiles, (index, tile) =>
                    {
                        Debug.Log($"Tile removed at index {index}: {tile}");
                        // example call removeTileFromMap(tile)
                    });

                    var spawnUnitMessage = new SpawnUnitMessage
                    {
                        unitType = UnitType.Warrior
                    };

                    var _ = room.Send("spawnUnit", spawnUnitMessage);
                }
            };

        }
        catch (System.Exception e)
        {
            Debug.LogError("Error in TestClient.Start: " + e.Message + "\n" + e.StackTrace);
        }
    }

    void OnDestroy()
    {
        if (room != null)
            room.Leave();
    }
}