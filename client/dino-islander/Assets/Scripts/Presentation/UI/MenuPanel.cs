using UnityEngine;

namespace Assets.Scripts.Presentation
{
    [RequireComponent(typeof(CanvasGroup))]
    public class MenuPanel : MonoBehaviour
    {
        CanvasGroup _cg;
        public virtual void Init()
        {
            _cg = GetComponent<CanvasGroup>();
        }

        public void Show() => _cg.alpha = 1;
        public void Hide() => _cg.alpha = 0;
    }
}
