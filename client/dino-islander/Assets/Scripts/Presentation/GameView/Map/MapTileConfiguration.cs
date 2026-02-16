using Assets.Scripts.Domain;
using UnityEngine;
using UnityEngine.Tilemaps;

[CreateAssetMenu(fileName = "MapTileConfiguration", menuName = "Config/MapTileConfig")]
public class MapTileConfiguration : ScriptableObject
{
    [SerializeField] private TileBase _water;
    [SerializeField] private TileBase _bridge;
    [SerializeField] private TileBase[] _floorVariants; // 16 tiles, index = neighbor mask

    public TileBase GetTileType(FloorType type) => type switch
    {
        FloorType.Water => _water,
        FloorType.Bridge => _bridge,
        _ => null
    };

    public TileBase GetFloorTile(int mask)
    {
        if (mask < 0 || mask >= _floorVariants.Length) return null;
        return _floorVariants[mask];
    }
}