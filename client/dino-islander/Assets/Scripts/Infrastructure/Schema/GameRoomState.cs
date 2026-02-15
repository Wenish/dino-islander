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
	public partial class GameRoomState : Schema {
#if UNITY_5_3_OR_NEWER
[Preserve]
#endif
public GameRoomState() { }
		[Type(0, "uint16")]
		public ushort width = default(ushort);

		[Type(1, "uint16")]
		public ushort height = default(ushort);

		[Type(2, "array", typeof(ArraySchema<TileSchema>))]
		public ArraySchema<TileSchema> tiles = null;
	}
}
