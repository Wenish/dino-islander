/**
 * Dino Islander - Multiplayer Backend
 * 
 * MVP Server Bootstrap
 * 
 * This is the entry point for the production-ready Colyseus server.
 * 
 * Architecture:
 * - Server-authoritative game world
 * - Tile-based map state
 * - Real-time state synchronization via Colyseus
 * 
 * Responsibilities:
 * - Bootstrap Colyseus server
 * - Register GameRoom
 * - Accept WebSocket connections from clients
 * - Maintain authoritative world state
 */

import { defineServer, defineRoom } from "colyseus";
import { Encoder } from "@colyseus/schema";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { Request, Response } from "express";
import { playground } from "@colyseus/playground";
import { GameRoom } from "./rooms/GameRoom";
import { config } from "./config";

/**
 * Initialize and start the server
 */
async function start(): Promise<void> {
  console.log("🚀 Starting Dino Islander Server (MVP)");
  console.log(`📍 Port: ${config.port}`);
  console.log(`🔧 Debug: ${config.debug}`);

  // Increase default Colyseus Schema encoder buffer to avoid overflow
  // NOTE: default is 4KB; larger states (e.g., big maps) may exceed this
  Encoder.BUFFER_SIZE = 16 * 1024; // 16 KB

  // Create Colyseus server with WebSocket transport
  const gameServer = defineServer({
    transport: new WebSocketTransport(),
    rooms: {
      game: defineRoom(GameRoom),
    },
    express: (app) => {
      // Health check endpoint
      app.use("/playground", playground());
      app.get("/health", (req: Request, res: Response) => {
        res.json({ status: "ok", timestamp: new Date().toISOString() });
      });
    },
  });

  console.log("📋 Room registered: 'game' (GameRoom)");

  // Listen for connections
  gameServer.listen(config.port);

  console.log(`✅ Server listening on ws://localhost:${config.port}`);
  console.log(`💚 API health check: http://localhost:${config.port}/health`);
  console.log(`🎮 Playground: http://localhost:${config.port}/playground`);
  console.log("");
  console.log("Waiting for clients...");
}

// Start server
start().catch((err) => {
  console.error("❌ Server startup failed:", err);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("⛔ SIGTERM received, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("⛔ SIGINT received, shutting down gracefully...");
  process.exit(0);
});
