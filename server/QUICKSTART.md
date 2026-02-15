# Quick Start Guide

## 🚀 Get the Server Running in 2 Minutes

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Build

```bash
npm run build
```

### 3. Start

```bash
npm start
```

You should see:
```
🚀 Starting Dino Islander Server (MVP)
📍 Port: 3000
🔧 Debug: false
📋 Room registered: 'game' (GameRoom)
✅ Server listening on ws://localhost:3000
💚 API health check: http://localhost:3000/health
```

### 4. Verify Health

```bash
curl http://localhost:3000/health
```

Response:
```json
{"status":"ok","timestamp":"2026-02-15T10:30:00.000Z"}
```

---

## 📝 Development Workflow

### Fast Development Mode

```bash
npm run dev
```

Restarts automatically when you change code.

### Rebuild After Changes

```bash
npm run build
```

---

## 🧪 Test Connection (Node.js)

Create a test file `test-client.js`:

```javascript
const { Client } = require("colyseus.js");

(async () => {
  const client = new Client("ws://localhost:3000");
  
  try {
    const room = await client.joinOrCreate("game");
    console.log("✓ Connected!");
    console.log(`Map: ${room.state.width}x${room.state.height}`);
    console.log(`Tiles: ${room.state.tiles.length}`);
    
    // Count tile types
    const types = { floor: 0, water: 0 };
    room.state.tiles.forEach(t => types[t.type]++);
    console.log("Types:", types);
    
    room.leave();
  } catch (err) {
    console.error("✗ Failed:", err.message);
  }
})();
```

Then run:
```bash
npm install colyseus.js
node test-client.js
```

---

## 📁 Project Structure

```
server/
├── src/
│   ├── index.ts              # Server entry point
│   ├── rooms/
│   │   └── GameRoom.ts       # Main game room
│   ├── schema/
│   │   ├── TileSchema.ts     # Single tile
│   │   ├── GameRoomState.ts  # Full room state
│   │   └── index.ts          # Exports
│   ├── systems/
│   │   └── MapLoader.ts      # Map loading logic
│   └── utils/
│       └── types.ts          # TypeScript types
├── lib/                       # Compiled JavaScript (auto-generated)
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── SERVER.md                 # Full documentation
├── ARCHITECTURE.md           # System design
└── CLIENT_EXAMPLE.md         # Client connection examples
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Port (default: 3000)
PORT=3000 npm start

# Debug mode
DEBUG=true npm run dev
```

### Map File

Edit `src/maps/default-map.json`:
- Must have `width`, `height`, `tiles` array
- Each tile: `{x, y, type}`
- Type must be `"floor"` or `"water"`

---

## 🐛 Troubleshooting

### Build Errors

```
error TS1240: Unable to resolve signature...
```

**Solution:** Make sure `tsconfig.json` has `experimentalDecorators: true`

### Connection Refused

```
Error: connect ECONNREFUSED 127.0.0.1:3000
```

**Solution:** Server not running. Run `npm start`

### Module Not Found

```
Cannot find module '@colyseus/schema'
```

**Solution:** Run `npm install` in the server folder

### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:** 
- Change port: `PORT=3001 npm start`
- Or kill process: `lsof -i :3000` then `kill <PID>`

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `SERVER.md` | Full server documentation |
| `ARCHITECTURE.md` | System design & data flow |
| `CLIENT_EXAMPLE.md` | Client connection code samples |

---

## ✅ Production Checklist

- [ ] TypeScript builds without errors: `npm run build`
- [ ] Server starts without warnings: `npm start`
- [ ] Health endpoint responds: `curl http://localhost:3000/health`
- [ ] Client can join room
- [ ] Map state is received
- [ ] No console errors after connecting
- [ ] Review `SERVER.md` for deployment options

---

## 🎯 Next Steps

1. **Run the server** (this guide)
2. **Connect a client** (see `CLIENT_EXAMPLE.md`)
3. **Render the map** (client-side task)
4. **Test with multiple clients** (verify state sync)
5. **Add entities** (next MVP phase)

---

## 💡 Tips

- Server is **deterministic**: Restart = same map every time
- State is **server-authoritative**: Clients can't cheat
- Schema is **binary-efficient**: Minimal network overhead
- Map is **immutable**: No server-side tile changes in MVP

---

**Version:** 0.1.0 (MVP)  
**Last Updated:** February 15, 2026
