using Assets.Scripts.Domain;
using System;
using UnityEngine;
using UnityEngine.UIElements;

namespace Assets.Scripts.Presentation
{
    public class HudSpawner : MonoBehaviour
    {
        [SerializeField] private HudPrefabConfiguration _HudConfig;
        [SerializeField] private Vector3 _position;
        private GameObject _instance;

        public void Spawn(IHud hud, Action onModifierSwitch, Action onRaptorSpawn)
        {
            var prefab = _HudConfig.GetPrefab(HudType.DefaultPlayerHud);

            if (prefab == null) return;
            var instance = Instantiate(prefab, _position, Quaternion.identity);
            _instance = instance;
            var view = instance.GetComponent<HudView>();
            view.Init(hud, onModifierSwitch, onRaptorSpawn);
        }

        public void SetVisible(bool visible)
        {
            if (_instance == null) return;
            _instance.SetActive(visible);
        }

        public void Despawn()
        {
            if (_instance == null) return;

            Destroy(_instance);
            _instance = null;
        }
    }
}
