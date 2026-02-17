# Bot System Documentation

## Overview

The bot system provides production-ready AI opponents that can act as substitute players. Bots can spawn units, switch modifiers, and make strategic decisions autonomously.

## Key Features

✅ **Server-authoritative** - All bot decisions are computed on the server  
✅ **Easily extensible** - Add new bot behaviors via interface implementation  
✅ **Production-ready** - Robust error handling, performance optimized  
✅ **Configurable** - Control bot difficulty and behavior via room options  
✅ **Hot-swappable** - Different bot behaviors can be selected at runtime  

---

## Quick Start

### Enable Bots in Your Room

When creating a room, pass the `fillWithBots` option:

```typescript
// Client-side code
await client.create("game_room", {
  fillWithBots: true,
  botBehavior: 'basic' // optional, defaults to 'basic'
});
```

### Room Options

```typescript
interface GameRoomOptions {
  fillWithBots?: boolean;      // Auto-fill empty slots with bots
  botBehavior?: string;        // Bot difficulty/behavior ('basic', 'aggressive', etc.)
  maxPlayers?: number;         // Override max players
}
```

---

## Architecture

### Components

1. **BotAISystem** (`BotAISystem.ts`)
   - Central controller for all bot players
   - Manages bot lifecycle and decision execution
   - Supports multiple bot behaviors simultaneously

2. **IBotBehavior** (`IBotBehavior.ts`)
   - Interface for bot decision-making strategies
   - Easily implement new behaviors by extending this interface

3. **BasicBotBehavior** (`BasicBotBehavior.ts`)
   - Default bot implementation
   - Spawns units on a timer with weighted randomness
   - Occasionally switches modifiers for variety

### Data Flow

```
GameRoom.onUpdate() 
  → BotAISystem.update()
    → IBotBehavior.decideAction()
      → Returns BotDecision
    → GameRoom.executeBotAction()
      → spawnUnitForPlayer() or switchModifierForPlayer()
```

---

## Creating Custom Bot Behaviors

### Step 1: Implement IBotBehavior

```typescript
import { IBotBehavior, BotDecision } from '../systems/bot';
import { GameRoomState, PlayerSchema } from '../schema';

export class AggressiveBotBehavior implements IBotBehavior {
  private timeSinceLastAction = 0;
  
  decideAction(
    botPlayer: PlayerSchema,
    state: GameRoomState,
    deltaTime: number
  ): BotDecision | null {
    this.timeSinceLastAction += deltaTime;
    
    // Your decision logic here
    if (this.timeSinceLastAction > 1000) {
      this.timeSinceLastAction = 0;
      return {
        type: 'spawnUnit',
        unitType: UnitType.Warrior
      };
    }
    
    return null; // Wait
  }
  
  reset(): void {
    this.timeSinceLastAction = 0;
  }
  
  getName(): string {
    return 'Aggressive Bot';
  }
}
```

### Step 2: Register Your Behavior

In `GameRoom.onCreate()` or initialization:

```typescript
this.botAISystem.registerBehavior('aggressive', () => new AggressiveBotBehavior());
```

### Step 3: Use Your Behavior

```typescript
// Client creates room with custom behavior
await client.create("game_room", {
  fillWithBots: true,
  botBehavior: 'aggressive'
});
```

---

## Bot Decision Types

```typescript
interface BotDecision {
  type: 'spawnUnit' | 'switchModifier' | 'wait';
  unitType?: number;         // For spawnUnit (UnitType enum)
  modifierId?: number;       // For switchModifier (ModifierType enum)
}
```

### Decision Examples

**Spawn a Warrior:**
```typescript
return {
  type: 'spawnUnit',
  unitType: UnitType.Warrior
};
```

**Switch to Fire Modifier:**
```typescript
return {
  type: 'switchModifier',
  modifierId: ModifierType.Fire
};
```

**Wait (no action):**
```typescript
return null;
```

---

## Performance Considerations

### ✅ Best Practices

- **Rate-limit decisions**: Don't make decisions every tick
- **Cache lookups**: Store frequently accessed data in behavior state
- **Avoid complex calculations**: Keep decision logic simple and fast
- **Use timers**: Implement internal timers to control action frequency

### ⚠️ Avoid

- ❌ Pathfinding calculations in decideAction()
- ❌ Deep array/object traversals every tick
- ❌ Synchronous blocking operations
- ❌ Excessive object allocations

---

## Advanced Features

### Multiple Bot Behaviors Simultaneously

The system supports running multiple bots with different behaviors:

```typescript
// Register different behaviors
botAISystem.registerBehavior('easy', () => new EasyBotBehavior());
botAISystem.registerBehavior('hard', () => new HardBotBehavior());

// Spawn bots with different behaviors
botAISystem.registerBot('bot_1', 'easy');
botAISystem.registerBot('bot_2', 'hard');
```

### Accessing Game State

Bot behaviors have full read access to game state:

```typescript
decideAction(botPlayer: PlayerSchema, state: GameRoomState, deltaTime: number) {
  // Access own player data
  const myWood = botPlayer.wood;
  const myModifier = botPlayer.modifierId;
  
  // Access game state
  const myUnits = state.units.filter(u => u.playerId === botPlayer.id);
  const enemyCastle = state.castles.find(c => c.playerId !== botPlayer.id);
  const allTiles = state.tiles;
  
  // Make strategic decisions based on game state
  // ...
}
```

### Difficulty Tuning

Adjust `BasicBotBehavior` constants to change difficulty:

```typescript
const BOT_CONFIG = {
  actionCheckInterval: 2000,     // ↓ = more frequent actions
  minSpawnDelay: 3000,           // ↓ = faster spawning
  maxSpawnDelay: 6000,           // ↓ = faster spawning
  modifierSwitchChance: 0.15,    // ↑ = more unpredictable
  
  spawnWeights: {
    [UnitType.Warrior]: 70,      // Adjust unit preferences
    [UnitType.Sheep]: 20,
    [UnitType.Raptor]: 10,
  }
};
```

---

## Testing

### Manual Testing

```typescript
// Start server with bot support
npm run dev

// In client, create a room with bots
const room = await client.create("game_room", { fillWithBots: true });

// Observe bot behavior in game
```

### Unit Testing

```typescript
import { BasicBotBehavior } from './BasicBotBehavior';

describe('BasicBotBehavior', () => {
  it('should spawn units after delay', () => {
    const bot = new BasicBotBehavior();
    const mockPlayer = createMockPlayer();
    const mockState = createMockState();
    
    // Fast-forward time
    const decision = bot.decideAction(mockPlayer, mockState, 5000);
    
    expect(decision).toBeTruthy();
    expect(decision?.type).toBe('spawnUnit');
  });
});
```

---

## Troubleshooting

### Bot Not Spawning

✅ Check `fillWithBots: true` in room options  
✅ Verify maxClients allows space for bots  
✅ Check server logs for bot registration messages  

### Bot Not Taking Actions

✅ Ensure game is in `InGame` phase  
✅ Check behavior's internal timers  
✅ Verify bot is registered in BotAISystem  
✅ Check for errors in server logs  

### Bot Actions Not Working

✅ Ensure valid unitType/modifierId values  
✅ Check GameRoom action handlers are called  
✅ Verify bot has proper castle/spawn positions  

---

## Future Extensions

### Potential Enhancements

- **Learning AI**: Track opponent patterns and adapt
- **Difficulty Levels**: Preset easy/medium/hard configurations
- **Team Bots**: Coordinate multiple bots working together
- **Scripted Behaviors**: Load bot behavior from configuration files
- **Performance Tuning**: Make bots intentionally "slower" to react for fairness

### Adding New Actions

To add new bot actions (e.g., building structures):

1. Extend `BotDecision` type in `IBotBehavior.ts`
2. Add handler case in `GameRoom.executeBotAction()`
3. Implement decision logic in bot behavior

```typescript
// 1. Extend type
interface BotDecision {
  type: 'spawnUnit' | 'switchModifier' | 'buildStructure' | 'wait';
  buildingType?: number; // Add new field
}

// 2. Handle in GameRoom
case 'buildStructure':
  if (decision.buildingType !== undefined) {
    this.buildStructureForPlayer(botId, decision.buildingType);
  }
  break;

// 3. Return from behavior
return {
  type: 'buildStructure',
  buildingType: BuildingType.Tower
};
```

---

## API Reference

### BotAISystem

```typescript
class BotAISystem {
  // Register a new bot behavior type
  registerBehavior(name: string, factory: () => IBotBehavior): void;
  
  // Register a bot player with a behavior
  registerBot(playerId: string, behaviorName?: string): void;
  
  // Unregister a bot player
  unregisterBot(playerId: string): void;
  
  // Check if player is a bot
  isBot(playerId: string): boolean;
  
  // Get number of active bots
  getBotCount(): number;
  
  // Reset all bots (called when game starts)
  resetAllBots(): void;
  
  // Main update loop
  update(state: GameRoomState, deltaTime: number, onBotAction: BotActionCallback): void;
  
  // Cleanup
  dispose(): void;
}
```

### IBotBehavior

```typescript
interface IBotBehavior {
  // Decide next action
  decideAction(
    botPlayer: PlayerSchema,
    state: GameRoomState,
    deltaTime: number
  ): BotDecision | null;
  
  // Reset behavior state
  reset(): void;
  
  // Get behavior name
  getName(): string;
}
```

---

## License

Part of the Dino Islander multiplayer game server.
