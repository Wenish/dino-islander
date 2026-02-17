using Assets.Scripts.Domain;
using System;
using System.Collections.Generic;

public class EntityTracker
{
    private readonly Dictionary<string, IDamageable> _entities = new();
    public void Add(IDamageable entity)
    {
        _entities.Add(((IEntity)entity).Id, entity);
        OnAdded?.Invoke(entity);
    }
    public void Remove(IDamageable entity)
    {
        _entities.Remove(((IEntity)entity).Id);
        OnRemoved?.Invoke(entity);
    }
    public void Remove(string id)
    {
        var entity = Get(id);
        Remove(entity);
    }

    public IDamageable Get(string id)
        => _entities.TryGetValue(id, out var val) ? val : null;

    public event Action<IDamageable> OnAdded;
    public event Action<IDamageable> OnRemoved;
}
