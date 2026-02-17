using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Assets.Scripts.Domain
{
    public interface IDamageable
    {
        IReadOnlyObservable<int> Health { get; }
        IReadOnlyObservable<int> MaxHealth { get; }

        void SyncMaxHealth(int maxHealth);
        void SyncHealth(int newHealth);

        event Action<IDamageable, int> OnDamageTaken;
    }
}
