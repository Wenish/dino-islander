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

		[Type(3, "uint16")]
		public ushort minionsKilled = default(ushort);

		[Type(4, "uint8")]
		public byte modifierId = default(byte);

		[Type(5, "number")]
		public float lastModifierSwitchTimeInPhaseMs = default(float);

		[Type(6, "boolean")]
		public bool isBot = default(bool);

		[Type(7, "number")]
		public float lastHammerHitTimeInPhaseMs = default(float);

		[Type(8, "number")]
		public float lastRaptorSpawnTimeInPhaseMs = default(float);
	}
}
