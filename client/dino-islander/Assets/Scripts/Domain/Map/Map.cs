using NUnit.Framework;
using System.Collections.Generic;

namespace Assets.Scripts.Domain
{
    public class Map
    {
        public int Width;
        public int Height;
        public List<Tile> Tiles;

        public class Tile
        {
            public int x;
            public int y;
            public FloorType Type;
        }
    }
}