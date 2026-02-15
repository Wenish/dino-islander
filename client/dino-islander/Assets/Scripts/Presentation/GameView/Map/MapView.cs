using UnityEngine;
using UnityEngine.Tilemaps;
using Assets.Scripts.Domain;
using Assets.Scripts.Presentation;

public class MapView : MonoBehaviour
{
    [SerializeField] private Tilemap _tilemap;
    [SerializeField] private MapTileConfiguration TileConfig;

    public void Render(Map map)
    {
        _tilemap.ClearAllTiles();

        float offsetX = -map.Width / 2f;
        float offsetY = -map.Height / 2f;

        foreach (var tile in map.GetAllTiles())
        {
            var position = new Vector3Int(tile.X, tile.Y, 0);
            TileBase tileAsset = TileConfig.GetTileType(tile.Type);
            _tilemap.SetTile(position, tileAsset);
        }
        _tilemap.transform.position = new Vector3(offsetX, offsetY, 0);
    }
}