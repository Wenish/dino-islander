using Assets.Scripts.Domain;
using System;
using UnityEngine.Tilemaps;

namespace Assets.Scripts.Presentation
{
    [Serializable]
    public class TileConfig
    {
       public FloorType Type;
       public TileBase Tile; 
    }
}
