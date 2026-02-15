using System;

public class Observable<T> : IReadOnlyObservable<T>
{
    private T _value;
    public event Action<T> OnChanged;

    public Observable(T initialValue = default)
    {
        _value = initialValue;
    }

    public T Value => _value;

    public void SetValue(T newValue)
    {
        if (!Equals(_value, newValue))
        {
            _value = newValue;
            OnChanged?.Invoke(_value);
        }
    }

    public void Bind(Action<T> listener)
    {
        listener(_value);
        OnChanged += listener;
    }

    public void Unbind(Action<T> listener)
    {
        OnChanged -= listener;
    }
}