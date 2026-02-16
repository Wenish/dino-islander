using Assets.Scripts.Domain;
using UnityEngine;
using UnityEngine.Tilemaps;

public class MapView : MonoBehaviour
{
    [SerializeField] private Tilemap _waterTilemap;
    [SerializeField] private Tilemap _floorTilemap;
    [SerializeField] private Tilemap _bridgeTilemap;
    [SerializeField] private MapTileConfiguration TileConfig;


    public void Render(Map map)
    {
        _floorTilemap.ClearAllTiles();
        _bridgeTilemap.ClearAllTiles();

        float offsetX = -map.Width / 2f;
        float offsetY = -map.Height / 2f;

        foreach (var tile in map.GetAllTiles())
        {
            if (tile == null) continue;

            var position = new Vector3Int(tile.X, tile.Y, 0);

            //water always present
            _waterTilemap.SetTile(position, TileConfig.GetTileType(FloorType.Water));

            switch (tile.Type)
            {

                case FloorType.Bridge:
                    _bridgeTilemap.SetTile(position, TileConfig.GetTileType(tile.Type));
                    break;

                case FloorType.Floor:
                    int mask = (int)GetNeighborMask(map, tile.X, tile.Y);
                    TileBase floorTile = TileConfig.GetFloorTile(mask);
                    _floorTilemap.SetTile(position, floorTile);
                    break;
            }
        }
    }

    public void UpdateTile(Map map, int x, int y)
    {
        if (map == null)
        {
            Debug.Log("Map is null");
        }
        var tile = map.GetTile(x, y);
        if (tile == null) return;

        var position = new Vector3Int(x, y, 0);

        //water stays
        _waterTilemap.SetTile(position, TileConfig.GetTileType(FloorType.Water));

        // Clear old tile first
        _floorTilemap.SetTile(position, null);
        _bridgeTilemap.SetTile(position, null);

        switch (tile.Type)
        {
            case FloorType.Bridge:
                _bridgeTilemap.SetTile(position, TileConfig.GetTileType(tile.Type));
                break;

            case FloorType.Floor:
                int mask = (int)GetNeighborMask(map, x, y);
                TileBase floorTile = TileConfig.GetFloorTile(mask);
                _floorTilemap.SetTile(position, floorTile);
                break;
        }

        UpdateNeighbors(map, x, y);
    }


    private void UpdateNeighbors(Map map, int x, int y)
    {
        UpdateFloorTileIfFloor(map, x, y + 1);
        UpdateFloorTileIfFloor(map, x, y - 1);
        UpdateFloorTileIfFloor(map, x - 1, y);
        UpdateFloorTileIfFloor(map, x + 1, y);
    }

    private void UpdateFloorTileIfFloor(Map map, int x, int y)
    {
        var tile = map.GetTile(x, y);
        if (tile != null && tile.Type == FloorType.Floor)
        {
            int mask = (int)GetNeighborMask(map, x, y);
            _floorTilemap.SetTile(new Vector3Int(x, y, 0), TileConfig.GetFloorTile(mask));
        }
    }

    private NeighborMask GetNeighborMask(Map map, int x, int y)
    {
        NeighborMask mask = NeighborMask.None;

        if (IsFloor(map, x, y + 1)) mask |= NeighborMask.Up;
        if (IsFloor(map, x, y - 1)) mask |= NeighborMask.Down;
        if (IsFloor(map, x - 1, y)) mask |= NeighborMask.Left;
        if (IsFloor(map, x + 1, y)) mask |= NeighborMask.Right;

        return mask;
    }

    private bool IsFloor(Map map, int x, int y)
    {
        var tile = map.GetTile(x, y);
        return tile == null || tile.Type == FloorType.Floor;
    }
}