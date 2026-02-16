using Assets.Scripts.Domain;
using UnityEngine;

namespace Assets.Scripts.Presentation
{
    public class UnitView : MonoBehaviour
    {
        private IUnit _unit;
        [SerializeField] private Animator _animator;

        public void Init(IUnit unit)
        {
            _unit = unit;
            if(_animator == null)
                _animator = GetComponentInChildren<Animator>();

            transform.position = _unit.Position.Value;
            _unit.Position.Bind(x => SyncPosition(x));
        }

        private void SyncPosition(Vector3 pos)
        {
            var tarPos = Vector3.Lerp(transform.position, pos, 0.1f);
            transform.position = tarPos;
        }
    }
}
