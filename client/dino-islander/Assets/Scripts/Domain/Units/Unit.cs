
namespace Assets.Scripts.Domain
{
    public class Unit : IUnit
    {
        public string Id { get; }
        public UnitType Type { get; }

        private readonly Observable<int> _health;
        public IReadOnlyObservable<int> Health => _health;

        public Unit(string id, UnitType type, int initialHealth)
        {
            Id = id;
            Type = type;
            _health = new Observable<int>(initialHealth);
        }

        // Called ONLY by networking layer
        public void SyncHealth(int newHealth)
        {
            _health.SetValue(newHealth);
        }
    }

    
        public interface IUnit
        {
            string Id { get; }
            UnitType Type { get; }
            IReadOnlyObservable<int> Health { get; }
        }
}