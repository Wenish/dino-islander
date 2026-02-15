using System;

public interface IReadOnlyObservable<T>
{
    T Value { get; }
    void Bind(Action<T> listener);
}