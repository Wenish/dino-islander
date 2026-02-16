using System.Collections.Generic;

namespace Assets.Scripts.Domain
{
    public class Map
    {
        public int Width { get; }
        public int Height { get; }

        private readonly Tile[,] _tiles;

        public Map(int width, int height)
        {
            Width = width;
            Height = height;
            _tiles = new Tile[width, height];
        }

        public void SetTile(int x, int y, FloorType type)
        {
            _tiles[x, y] = new Tile(x, y, type);
        }

        public Tile GetTile(int x, int y)
        {
            if (x < 0 || x >= Width || y < 0 || y >= Height)
                return null; // safe fallback

            return _tiles[x, y];
        }

        public IEnumerable<Tile> GetAllTiles()
        {
            for (int x = 0; x < Width; x++)
                for (int y = 0; y < Height; y++)
                    yield return _tiles[x, y];
        }
    }

    public class Tile
    {
        public int X { get; }
        public int Y { get; }
        public FloorType Type { get; }

        public Tile(int x, int y, FloorType type)
        {
            X = x;
            Y = y;
            Type = type;
        }

    }
}