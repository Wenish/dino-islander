
namespace Assets.Scripts.Domain
{
    public class Unit : IUnit
    {
        public string Id { get; private set; }
        public int Health { get; private set; }
        public ElementType Element { get; private set; }

        public Unit(string id, int health, ElementType element)
        {

        }
    }

    public interface IUnit
    {
        string Id { get; }
        int Health { get; }
        ElementType Element { get; }
    }
}