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
	public partial class CastleSchema : GameObjectSchema {
#if UNITY_5_3_OR_NEWER
[Preserve]
#endif
public CastleSchema() { }
		[Type(5, "uint16")]
		public ushort health = default(ushort);

		[Type(6, "uint16")]
		public ushort maxHealth = default(ushort);
	}
}
