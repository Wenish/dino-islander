
namespace Assets.Scripts.Domain
{
    public class Unit : IUnit
    {
        public string Id { get; }
        public ElementType Element { get; }

        private readonly Observable<int> _health;
        public IReadOnlyObservable<int> Health => _health;

        public Unit(string id, ElementType element, int initialHealth)
        {
            Id = id;
            Element = element;
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
        public interface IUnit
        {
            string Id { get; }
            ElementType Element { get; }
            IReadOnlyObservable<int> Health { get; }
        }
    }
}