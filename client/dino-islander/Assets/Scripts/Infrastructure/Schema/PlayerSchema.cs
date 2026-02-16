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
	public partial class PlayerSchema : Schema {
#if UNITY_5_3_OR_NEWER
[Preserve]
#endif
public PlayerSchema() { }
		[Type(0, "string")]
		public string name = default(string);

		[Type(1, "string")]
		public string id = default(string);

		[Type(2, "number")]
		public float wood = default(float);
	}
}
