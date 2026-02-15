using UnityEngine;

namespace Assets.Scripts.Domain
{
    public static class MapGenerator
    {
        public static Map Generate(int width, int height)
        {
            var map = new Map(width, height);

            for (int x = 0; x < width; x++)
            {
                for (int y = 0; y < height; y++)
                {
                    bool isBorder =
                        x == 0 || y == 0 ||
                        x == width - 1 ||
                        y == height - 1;

                    FloorType type = isBorder
                        ? FloorType.Water
                        : (Random.value > 0.2f
                            ? FloorType.Floor
                            : FloorType.Water);

                    map.SetTile(x, y, type);
                }
            }

            return map;
        }
    }
}