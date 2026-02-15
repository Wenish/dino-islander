using Assets.Scripts.Domain;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.Tilemaps;

namespace Assets.Scripts.Presentation
{
    [CreateAssetMenu(fileName = "MapTileConfig", menuName = "Config/MapTileConfig")]
    public class MapTileConfiguration : ScriptableObject
    {
        public List<TileConfig> _config = new();

        public TileBase GetTileType(FloorType type)
        {
            if (_config.Any(cfg => cfg.Type == type))
            {
                return _config.FirstOrDefault(x => x.Type == type).Tile;
            }
            else
            {
                Debug.LogError("Tile not found");
                return null;
            }   
        }
    }
}
