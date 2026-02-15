/**
 * Example Client Connection
 * 
 * This is a quick reference for how to connect to the Dino Islander server
 * from a browser or Node.js client using the Colyseus client library.
 * 
 * For this to work, you'll need:
 * - npm install colyseus.js  (in your client project)
 * - The server running on ws://localhost:3000
 */

// ============================================================================
// BROWSER CLIENT EXAMPLE
// ============================================================================

// 1. Import Colyseus client
// import { Client } from "colyseus.js";

// 2. Create client instance
// const client = new Client("ws://localhost:3000");

// 3. Join the "game" room
// const room = await client.joinOrCreate("game");

// 4. Listen for state changes
// room.state.onChange = () => {
//   console.log("Room state updated!");
//   console.log("Map dimensions:", room.state.width, "x", room.state.height);
//   console.log("Total tiles:", room.state.tiles.length);
// };

// 5. Listen for specific tile changes
// room.state.tiles.onAdd((tile, index) => {
//   console.log(`Tile at index ${index}:`, tile.x, tile.y, tile.type);
// };

// 6. Listen for When you're done
// room.leave();

// ============================================================================
// NODE.JS CLIENT EXAMPLE (using colyseus.js)
// ============================================================================

// import { Client } from "colyseus.js";

// async function connectToGame() {
//   try {
//     const client = new Client("ws://localhost:3000");
//     const room = await client.joinOrCreate("game");

//     console.log("Connected to room:", room.name);
//     console.log("Room ID:", room.roomId);
//     console.log("Session ID:", room.sessionId);

//     // Process initial map state
//     console.log(`Map: ${room.state.width}x${room.state.height}`);
//     console.log(`Tiles: ${room.state.tiles.length}`);

//     // Example: Count tile types
//     const tileTypes = { floor: 0, water: 0 };
//     room.state.tiles.forEach(tile => {
//       tileTypes[tile.type]++;
//     });
//     console.log("Tile types:", tileTypes);

//     // Listen for changes
//     room.onStateChange.once(() => {
//       console.log("State changed!");
//     });

//     // Clean disconnect after 5 seconds
//     setTimeout(() => {
//       room.leave();
//       console.log("Disconnected");
//     }, 5000);

//   } catch (error) {
//     console.error("Connection failed:", error);
//   }
// }

// connectToGame();

// ============================================================================
// UNITY CLIENT EXAMPLE
// ============================================================================

// You'll use the Colyseus Unity SDK:
// https://github.com/colyseus/colyseus-unity

// using Colyseus;
// using UnityEngine;

// public class GameManager : MonoBehaviour
// {
//     private ColyseusClient client;
//     private ColyseusRoom<GameRoomState> room;

//     async void Start()
//     {
//         // Connect to server
//         client = new ColyseusClient("ws://localhost:3000");
//         room = await client.JoinOrCreate<GameRoomState>("game");

//         Debug.Log("Map: " + room.State.width + "x" + room.State.height);

//         // Listen for state changes
//         room.State.OnTilesAdd += (tile, key) =>
//         {
//             Debug.Log($"Tile: {tile.x}, {tile.y} - {tile.type}");
//         };
//     }

//     void OnDestroy()
//     {
//         if (room != null)
//             room.Leave();
//     }
// }

// ============================================================================
// TYPESCRIPT CLIENT TYPES
// ============================================================================

// These are the expected types on the client side:

// interface Tile {
//   x: number;          // 0 to width-1
//   y: number;          // 0 to height-1
//   type: "floor" | "water";
// }

// interface GameRoomState {
//   width: number;      // Map width
//   height: number;     // Map height
//   tiles: Tile[];      // All map tiles
// }

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Error scenarios:
// - Connection refused: Server not running
// - Room not found: Server restarted or room name misspelled
// - Message timeout: Network issue or server overloaded
// - State sync failed: Schema version mismatch

// Example error handling:
// try {
//   const room = await client.joinOrCreate("game");
// } catch (error) {
//   if (error.code === 4000) {
//     console.error("Room does not exist");
//   } else if (error.code === 4001) {
//     console.error("Seat taken");
//   } else {
//     console.error("Connection error:", error);
//   }
// }

// ============================================================================
// DEBUGGING TIPS
// ============================================================================

// 1. Enable Colyseus debug logging:
//    localStorage.debug = "colyseus*";

// 2. Check room state:
//    console.log(JSON.stringify(room.state, null, 2));

// 3. Monitor network traffic:
//    Use browser DevTools -> Network -> WS tab

// 4. Verify server health:
//    curl http://localhost:3000/health
