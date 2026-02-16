namespace Assets.Scripts.Domain
{
    [System.Flags]
    public enum NeighborMask
    {
        None = 0,
        Up = 1 << 0,    // 1
        Down = 1 << 1,  // 2
        Left = 1 << 2,  // 4
        Right = 1 << 3  // 8
    }
}
