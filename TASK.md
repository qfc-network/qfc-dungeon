# QFC AI Dungeon — Roguelike Dungeon Crawler

## Overview
A turn-based roguelike dungeon crawler where floors, monsters, and loot are procedurally generated. Permadeath — when you die, your run is over. Leaderboard tracks best runs.

## MVP Scope (v0.1)

### Core Loop
1. Enter dungeon → Floor 1
2. Each floor: grid-based room with monsters and items
3. Move (WASD/click), attack adjacent monsters, pick up items
4. Find stairs to next floor
5. Die → game over, score saved to leaderboard
6. Goal: survive as many floors as possible

### Map Generation
- Each floor: 15x15 grid
- Rooms connected by corridors (BSP or random walk)
- Tile types: floor, wall, door, stairs_down, chest, trap
- Higher floors = more complex layouts, more enemies
- Fog of war: only see tiles within 3-tile radius

### Player
- HP: 100, Attack: 10, Defense: 5, Level: 1
- Inventory: max 6 items
- XP from killing monsters → level up → +stats
- Equipment slots: weapon, armor, ring

### Monsters (per floor tier)
**Floor 1-3 (Easy):**
- 🐀 Rat: HP 15, ATK 3, DEF 1, XP 5
- 🦇 Bat: HP 10, ATK 5, DEF 0, XP 4
- 🕷️ Spider: HP 20, ATK 4, DEF 2, XP 7

**Floor 4-6 (Medium):**
- 💀 Skeleton: HP 35, ATK 8, DEF 4, XP 15
- 🐍 Snake: HP 25, ATK 10, DEF 2, XP 12
- 👻 Ghost: HP 30, ATK 7, DEF 6, XP 18

**Floor 7-10 (Hard):**
- 🐉 Drake: HP 60, ATK 14, DEF 8, XP 30
- 🧙 Dark Mage: HP 40, ATK 18, DEF 3, XP 35
- 👹 Demon: HP 80, ATK 16, DEF 10, XP 40

**Floor 10 Boss:**
- 🐲 Dragon Lord: HP 200, ATK 25, DEF 15, XP 100

### Items
**Weapons** (replace current):
- 🗡️ Rusty Sword: +3 ATK
- ⚔️ Iron Blade: +6 ATK
- 🔥 Flame Sword: +10 ATK
- ⚡ Lightning Spear: +14 ATK

**Armor** (replace current):
- 🛡️ Leather Armor: +3 DEF
- 🛡️ Chain Mail: +6 DEF
- 🛡️ Plate Armor: +10 DEF

**Consumables** (use from inventory):
- ❤️ Health Potion: restore 30 HP
- ⚡ Energy Potion: +5 ATK for 10 turns
- 🛡️ Shield Scroll: +5 DEF for 10 turns
- 🗺️ Map Scroll: reveal entire floor

### Combat
- Turn-based: player acts, then all monsters act
- Move into monster = attack
- Damage = attacker.ATK × (0.8-1.2) - defender.DEF × 0.5
- Min damage = 1
- Monsters chase player if within 5 tiles (simple pathfinding)

### Web UI
- **Tech**: Vite + TypeScript + HTML Canvas
- **Canvas**: 600x600 game area (each tile = 40px)
- **Sidebar**: Player stats, inventory, minimap, floor info, log
- **Tiles**: Colored rectangles + emoji
  - Floor: #2a2a3a
  - Wall: #1a1a2a
  - Player: 🧑‍💻 (green bg)
  - Monsters: emoji on red/orange bg
  - Items: emoji on gold bg
  - Stairs: 🪜 on blue bg
  - Fog: black with 50% opacity
- **Movement**: Click adjacent tile or WASD keys
- **Animations**: Attack flash, damage numbers, death fade

### Server
- Express on port 3240
- Single-player (no WebSocket needed for MVP)
- Server manages game state (authoritative)
- REST API for actions
- Leaderboard persisted in `~/.qfc-dungeon/leaderboard.json`

### Data Model
```typescript
interface Tile {
  type: "floor" | "wall" | "door" | "stairs" | "chest" | "trap";
  visible: boolean;
  explored: boolean;
  monster?: Monster;
  item?: Item;
}

interface Monster {
  id: string;
  name: string;
  emoji: string;
  hp: number; maxHp: number;
  attack: number; defense: number;
  xp: number;
}

interface Item {
  id: string;
  name: string;
  emoji: string;
  type: "weapon" | "armor" | "ring" | "consumable";
  stats: { attack?: number; defense?: number; hp?: number; };
  duration?: number; // turns for buff items
}

interface Player {
  x: number; y: number;
  hp: number; maxHp: number;
  attack: number; defense: number;
  level: number; xp: number; xpToLevel: number;
  inventory: Item[];
  equipment: { weapon?: Item; armor?: Item; ring?: Item; };
  buffs: { name: string; stat: string; value: number; turns: number; }[];
}

interface GameState {
  id: string;
  player: Player;
  floor: number;
  map: Tile[][];
  log: string[];
  status: "playing" | "dead" | "victory";
  score: number;
  turns: number;
}
```

## File Structure
```
qfc-dungeon/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── client/
│   ├── main.ts          # Entry, game loop
│   ├── Renderer.ts      # Canvas rendering
│   ├── Input.ts         # Keyboard + mouse input
│   ├── Sidebar.ts       # Stats panel
│   ├── api.ts           # REST client
│   └── types.ts
├── server/
│   ├── index.ts         # Express server
│   ├── game.ts          # Game logic
│   ├── mapgen.ts        # Procedural map generation
│   ├── monsters.ts      # Monster definitions + AI
│   ├── items.ts         # Item definitions + loot tables
│   ├── combat.ts        # Combat resolution
│   └── types.ts
└── README.md
```

## Constraints
- Canvas-based rendering, all programmatic (no images)
- Tiles are 40x40 colored rectangles with emoji
- Server authoritative (client sends move direction, server resolves)
- Fog of war: 3-tile vision radius
- Port 3240
- Single player only for MVP

## Build & Run
```bash
npm install
npm run build
npm start         # Server on port 3240
```

## Commit
`feat: QFC AI Dungeon v0.1 — roguelike dungeon crawler`
