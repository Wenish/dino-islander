// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 4.0.12
// 

using Colyseus.Schema;
#if UNITY_5_3_OR_NEWER
using UnityEngine.Scripting;
#endif

namespace DinoIslander.Infrastructure {
	public partial class ActionSchema : Schema {
#if UNITY_5_3_OR_NEWER
[Preserve]
#endif
public ActionSchema() { }
		[Type(0, "uint8")]
		public byte actionId = default(byte);

		[Type(1, "float32")]
		public float cooldownProgress = default(float);
	}
}
