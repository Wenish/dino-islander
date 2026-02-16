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
	public partial class GameObjectSchema : Schema {
#if UNITY_5_3_OR_NEWER
[Preserve]
#endif
public GameObjectSchema() { }
		[Type(0, "uint8")]
		public byte type = default(byte);

		[Type(1, "float32")]
		public float x = default(float);

		[Type(2, "float32")]
		public float y = default(float);

		[Type(3, "string")]
		public string id = default(string);

		[Type(4, "string")]
		public string playerId = default(string);
	}
}
