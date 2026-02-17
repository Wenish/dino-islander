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
		[Type(9, "uint8")]
		public byte unitType = default(byte);

		[Type(10, "uint8")]
		public byte archetype = default(byte);

		[Type(11, "uint8")]
		public byte behaviorState = default(byte);

		[Type(12, "float32")]
		public float targetX = default(float);

		[Type(13, "float32")]
		public float targetY = default(float);

		[Type(14, "float32")]
		public float moveSpeed = default(float);

		[Type(15, "uint16")]
		public ushort health = default(ushort);

		[Type(16, "uint16")]
		public ushort maxHealth = default(ushort);

		[Type(17, "string")]
		public string name = default(string);

		[Type(18, "uint8")]
		public byte modifierId = default(byte);
	}
}
