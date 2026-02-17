using System;

namespace Assets.Scripts.Domain
{
    public static class MapUtility
    {
        public static FloorType GetTypeFromSchema(int type)
        { 
            return (FloorType)type;
        }
    }
}
