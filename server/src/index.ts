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

import { Server } from "colyseus";
import http from "http";
import express, { Request, Response } from "express";
import { GameRoom } from "./rooms/GameRoom";
import { IServerConfig } from "./utils/types";

// Configuration
const config: IServerConfig = {
  port: parseInt(process.env.PORT || "3010", 10),
  debug: process.env.DEBUG === "true",
};

/**
 * Initialize and start the server
 */
async function start(): Promise<void> {
  console.log("🚀 Starting Dino Islander Server (MVP)");
  console.log(`📍 Port: ${config.port}`);
  console.log(`🔧 Debug: ${config.debug}`);

  // Create Express app
  const app = express();
  const httpServer = http.createServer(app);

  // Create Colyseus server
  const gameServer = new Server({
    server: httpServer,
  });

  // Health check endpoint
  app.get("/health", (req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Register the GameRoom
  // Auto-creates a room named "game" if it doesn't exist
  gameServer.define("game", GameRoom);

  console.log("📋 Room registered: 'game' (GameRoom)");

  // Listen for connections
  gameServer.listen(config.port);

  console.log(`✅ Server listening on ws://localhost:${config.port}`);
  console.log(`💚 API health check: http://localhost:${config.port}/health`);
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
