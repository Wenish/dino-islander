# Bot System Usage Examples

## Basic Usage

### Example 1: Create a Room with a Bot

```typescript
// Client-side code
import * as Colyseus from "colyseus.js";

const client = new Colyseus.Client("ws://localhost:2567");

// Create a room with bot auto-fill enabled
const room = await client.create("game_room", {
  fillWithBots: true
});

console.log("Room created! Bot will join if needed.");

// The server will automatically spawn a bot if:
// - Only 1 human player joins
// - Room has space for more players
```

### Example 2: Specify Bot Difficulty

```typescript
// Create room with aggressive bot behavior
const room = await client.create("game_room", {
  fillWithBots: true,
  botBehavior: 'aggressive'  // Use custom behavior
});
```

### Example 3: Join Existing Room with Bots

```typescript
// Join an existing room
const room = await client.joinOrCreate("game_room", {
  fillWithBots: true
});

// If you're the first player, a bot will be added
// If a second human joins later, the bot can remain or be removed (depending on implementation)
```

---

## Observing Bot Behavior

### Listen to State Changes

```typescript
room.onStateChange((state) => {
  // Check which players are bots
  state.players.forEach(player => {
    if (player.isBot) {
      console.log(`${player.name} is a bot`);
    } else {
      console.log(`${player.name} is a human player`);
    }
  });
});
```

### Observe Bot Actions

```typescript
// Watch units being spawned
room.state.units.onAdd = (unit, index) => {
  const player = room.state.players.find(p => p.id === unit.playerId);
  if (player?.isBot) {
    console.log(`Bot spawned a ${unit.unitType} unit!`);
  }
};

// Watch modifier changes
room.state.players.onChange = (player, key) => {
  if (key === "modifierId" && player.isBot) {
    console.log(`Bot switched to modifier ${player.modifierId}`);
  }
};
```

---

## Testing Scenarios

### Scenario 1: Solo Play Against Bot

```typescript
// Perfect for testing or single-player mode
const room = await client.create("game_room", {
  fillWithBots: true,
  botBehavior: 'basic',
  maxPlayers: 2
});

// You vs. Bot
```

### Scenario 2: Practice Mode

```typescript
// Create a training room
const room = await client.create("game_room", {
  fillWithBots: true,
  botBehavior: 'easy'  // Easier bot for learning
});
```

### Scenario 3: Development Testing

```typescript
// Quick testing without needing a second client
const room = await client.create("game_room", {
  fillWithBots: true
});

// Test your game mechanics against an AI opponent
```

---

## Server-Side Usage

### Programmatically Spawn Bots

```typescript
// In GameRoom.ts or custom logic
private addBotToGame(): void {
  const botId = `bot_${Date.now()}`;
  const state = this.state as GameRoomState;
  
  // Create bot player
  state.createBotPlayer(botId, "Test Bot");
  state.setCastleOwner(botId);
  
  // Register with AI system
  this.botAISystem.registerBot(botId, 'basic');
  
  console.log(`Bot added: ${botId}`);
}
```

### Remove Bot When Human Joins

```typescript
// In GameRoom.onJoin()
onJoin(client: Client): void {
  const state = this.state as GameRoomState;
  
  // Create human player
  state.createPlayer(client);
  
  // Optional: Remove bot if human joins
  const botPlayer = state.players.find(p => p.isBot);
  if (botPlayer && state.players.length > this.maxClients) {
    this.removeBotPlayer(botPlayer.id);
  }
  
  // ... rest of onJoin logic
}

private removeBotPlayer(botId: string): void {
  const state = this.state as GameRoomState;
  const botIndex = state.players.findIndex(p => p.id === botId);
  
  if (botIndex !== -1) {
    this.botAISystem.unregisterBot(botId);
    state.players.splice(botIndex, 1);
    console.log(`Bot removed: ${botId}`);
  }
}
```

---

## Integration with Match-making

### Auto-fill Lobbies

```typescript
// Server-side: Auto-fill lobbies that don't fill quickly
class GameRoom extends Room {
  private lobbyTimer: number = 0;
  private readonly LOBBY_TIMEOUT = 30000; // 30 seconds
  
  onUpdate(deltaTime: number): void {
    const state = this.state as GameRoomState;
    
    if (state.gamePhase === GamePhase.Lobby) {
      this.lobbyTimer += deltaTime;
      
      // If waiting too long and only 1 player, add bot
      if (this.lobbyTimer > this.LOBBY_TIMEOUT && state.players.length === 1) {
        this.spawnBot(state);
        // Start game
        this.phaseManager.executeCommand(state, new StartGameCommand());
      }
    }
    
    // ... rest of update logic
  }
}
```

---

## Advanced Patterns

### Dynamic Difficulty Adjustment

```typescript
class AdaptiveBotBehavior implements IBotBehavior {
  private difficulty = 1.0; // 0.0 to 2.0
  
  decideAction(botPlayer: PlayerSchema, state: GameRoomState, deltaTime: number) {
    // Get opponent's performance
    const humanPlayer = state.players.find(p => !p.isBot);
    if (!humanPlayer) return null;
    
    const humanUnits = state.units.filter(u => u.playerId === humanPlayer.id).length;
    const botUnits = state.units.filter(u => u.playerId === botPlayer.id).length;
    
    // Adjust difficulty based on performance
    if (humanUnits > botUnits * 1.5) {
      this.difficulty = Math.min(2.0, this.difficulty + 0.01);
    } else if (botUnits > humanUnits * 1.5) {
      this.difficulty = Math.max(0.5, this.difficulty - 0.01);
    }
    
    // Use difficulty to adjust spawn rate
    const adjustedDelay = 3000 / this.difficulty;
    
    // ... decision logic using adjusted values
  }
}
```

### Bot Personality Types

```typescript
// Aggressive - Spawns mostly warriors, attacks quickly
class AggressiveBotBehavior implements IBotBehavior {
  // Focus on combat units, fast spawning
}

// Defensive - Spawns support units, builds economy
class DefensiveBotBehavior implements IBotBehavior {
  // Focus on sheep/economy, slower aggression
}

// Balanced - Mix of strategies
class BalancedBotBehavior implements IBotBehavior {
  // Balanced unit composition
}

// Register all personalities
botAISystem.registerBehavior('aggressive', () => new AggressiveBotBehavior());
botAISystem.registerBehavior('defensive', () => new DefensiveBotBehavior());
botAISystem.registerBehavior('balanced', () => new BalancedBotBehavior());
```

---

## Debugging

### Enable Bot Logging

```typescript
// In BasicBotBehavior or custom behavior
decideAction(botPlayer: PlayerSchema, state: GameRoomState, deltaTime: number) {
  const decision = this.makeDecision(botPlayer, state);
  
  if (decision) {
    console.log(`[Bot ${botPlayer.name}] Decision:`, decision);
  }
  
  return decision;
}
```

### Visualize Bot State

```typescript
// Client-side visualization
room.state.players.onChange = (player, key) => {
  if (player.isBot) {
    console.log(`[Bot ${player.name}] ${key} changed to:`, player[key]);
  }
};
```

### Test Bot Performance

```typescript
// Server-side metrics
class BotAISystem {
  private actionCounts = new Map<string, number>();
  
  update(state: GameRoomState, deltaTime: number, onBotAction: BotActionCallback) {
    for (const [botId, behavior] of this.bots.entries()) {
      const decision = behavior.decideAction(botPlayer, state, deltaTime);
      
      if (decision) {
        // Track bot actions
        const count = this.actionCounts.get(botId) || 0;
        this.actionCounts.set(botId, count + 1);
        
        onBotAction(botId, decision);
      }
    }
  }
  
  getActionCount(botId: string): number {
    return this.actionCounts.get(botId) || 0;
  }
}
```

---

## Performance Tips

### Optimize Bot Decision-Making

```typescript
class OptimizedBotBehavior implements IBotBehavior {
  private cachedEnemyPosition: { x: number, y: number } | null = null;
  private cacheAge = 0;
  private readonly CACHE_DURATION = 5000; // Refresh every 5s
  
  decideAction(botPlayer: PlayerSchema, state: GameRoomState, deltaTime: number) {
    this.cacheAge += deltaTime;
    
    // Use cached data instead of searching every frame
    if (!this.cachedEnemyPosition || this.cacheAge > this.CACHE_DURATION) {
      const enemyCastle = state.castles.find(c => c.playerId !== botPlayer.id);
      if (enemyCastle) {
        this.cachedEnemyPosition = { x: enemyCastle.x, y: enemyCastle.y };
        this.cacheAge = 0;
      }
    }
    
    // Use cached position for decisions
    // ...
  }
}
```

---

## Conclusion

The bot system provides a flexible, production-ready foundation for AI opponents. It's designed to be:

- ✅ Easy to use (single option to enable)
- ✅ Easy to extend (implement IBotBehavior)
- ✅ Easy to test (works with existing game logic)
- ✅ Easy to tune (adjust behavior constants)

Start with `BasicBotBehavior` and extend as needed for your game's specific requirements!
