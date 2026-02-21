using Assets.Scripts.Domain;
using System;
using UnityEngine;

namespace Assets.Scripts.Presentation
{
    public class HudSpawner : MonoBehaviour
    {
        [SerializeField] private HudView _hudView;
        private HudView _instance;

        public void Spawn(IHud hud, Action onModifierSwitch, Action onRaptorSpawn) => _hudView.Init(hud, onModifierSwitch, onRaptorSpawn);

        public void Despawn()
        {
            if (_instance != null)
                Destroy(_instance);
        }
    }
}
