export interface Tile {
  type: "floor" | "wall" | "door" | "stairs" | "chest" | "trap";
  visible: boolean;
  explored: boolean;
  monster?: Monster;
  item?: Item;
}

export interface Monster {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  xp: number;
  x: number;
  y: number;
}

export interface Item {
  id: string;
  name: string;
  emoji: string;
  type: "weapon" | "armor" | "ring" | "consumable";
  stats: { attack?: number; defense?: number; hp?: number };
  duration?: number;
}

export interface Buff {
  name: string;
  stat: string;
  value: number;
  turns: number;
}

export interface Player {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  level: number;
  xp: number;
  xpToLevel: number;
  inventory: Item[];
  equipment: { weapon?: Item; armor?: Item; ring?: Item };
  buffs: Buff[];
}

export interface GameState {
  id: string;
  player: Player;
  floor: number;
  map: Tile[][];
  monsters: Monster[];
  log: string[];
  status: "playing" | "dead" | "victory";
  score: number;
  turns: number;
}

export interface LeaderboardEntry {
  score: number;
  floor: number;
  turns: number;
  level: number;
  date: string;
}
