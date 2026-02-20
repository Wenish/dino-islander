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
	public partial class BuildingSchema : GameObjectSchema {
#if UNITY_5_3_OR_NEWER
[Preserve]
#endif
public BuildingSchema() { }
		[Type(9, "uint8")]
		public byte buildingType = default(byte);

		[Type(10, "uint16")]
		public ushort health = default(ushort);

		[Type(11, "uint16")]
		public ushort maxHealth = default(ushort);
	}
}
