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
	public partial class UnitSchema : GameObjectSchema {
#if UNITY_5_3_OR_NEWER
[Preserve]
#endif
public UnitSchema() { }
		[Type(5, "uint8")]
		public byte unitType = default(byte);

		[Type(6, "float32")]
		public float moveSpeed = default(float);

		[Type(7, "uint16")]
		public ushort health = default(ushort);

		[Type(8, "uint16")]
		public ushort maxHealth = default(ushort);

		[Type(9, "string")]
		public string name = default(string);
	}
}
