using Assets.Scripts.Domain;
using UnityEngine;

public class GameBootstrap : MonoBehaviour
{
    [SerializeField] private MapView _mapView;

    private Map _map;

    private void Start()
    {
        _map = MapGenerator.Generate(30, 20);
        _mapView.Render(_map);
    }
}