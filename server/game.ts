import { v4 as uuid } from "uuid";
import { GameState, Player, Monster, Item } from "./types";
import { generateMap } from "./mapgen";
import {
  calcDamage,
  getEffectiveAttack,
  getEffectiveDefense,
  tickBuffs,
  xpToLevel,
} from "./combat";
import { rollChestLoot } from "./items";

const SIZE = 15;
const VISION_RADIUS = 3;

export function createGame(): GameState {
  const player: Player = {
    x: 0,
    y: 0,
    hp: 100,
    maxHp: 100,
    attack: 10,
    defense: 5,
    level: 1,
    xp: 0,
    xpToLevel: xpToLevel(1),
    inventory: [],
    equipment: {},
    buffs: [],
  };

  const state: GameState = {
    id: uuid(),
    player,
    floor: 1,
    map: [],
    monsters: [],
    log: ["You enter the dungeon..."],
    status: "playing",
    score: 0,
    turns: 0,
  };

  enterFloor(state, 1);
  return state;
}

function enterFloor(state: GameState, floor: number): void {
  state.floor = floor;
  const { map, monsters, playerStart } = generateMap(floor);
  state.map = map;
  state.monsters = monsters;
  state.player.x = playerStart.x;
  state.player.y = playerStart.y;
  updateVisibility(state);
  state.log.push(`--- Floor ${floor} ---`);
}

export function handleMove(
  state: GameState,
  dx: number,
  dy: number
): GameState {
  if (state.status !== "playing") return state;

  const p = state.player;
  const nx = p.x + dx;
  const ny = p.y + dy;

  if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE) return state;

  const tile = state.map[ny][nx];

  if (tile.type === "wall") return state;

  // Check for monster at target
  const monster = state.monsters.find((m) => m.x === nx && m.y === ny && m.hp > 0);
  if (monster) {
    playerAttack(state, monster);
  } else {
    // Move player
    p.x = nx;
    p.y = ny;
    handleTileEffects(state, tile);
  }

  if (state.status !== "playing") return state;

  // Monster turns
  monsterTurns(state);

  // Tick buffs
  p.buffs = tickBuffs(p.buffs);

  state.turns++;
  state.score = calcScore(state);
  updateVisibility(state);

  return state;
}

export function handleUseItem(state: GameState, itemId: string): GameState {
  if (state.status !== "playing") return state;

  const p = state.player;
  const idx = p.inventory.findIndex((i) => i.id === itemId);
  if (idx === -1) return state;

  const item = p.inventory[idx];

  if (item.type === "consumable") {
    applyConsumable(state, item);
    p.inventory.splice(idx, 1);
  } else if (item.type === "weapon" || item.type === "armor" || item.type === "ring") {
    equipItem(state, item, idx);
  }

  return state;
}

function equipItem(state: GameState, item: Item, invIdx: number): void {
  const p = state.player;
  const slot = item.type as "weapon" | "armor" | "ring";
  const current = p.equipment[slot];

  // Swap
  p.inventory.splice(invIdx, 1);
  p.equipment[slot] = item;
  if (current) {
    p.inventory.push(current);
  }
  state.log.push(`Equipped ${item.emoji} ${item.name}`);
}

function applyConsumable(state: GameState, item: Item): void {
  const p = state.player;

  if (item.name === "Health Potion") {
    const heal = Math.min(item.stats.hp ?? 30, p.maxHp - p.hp);
    p.hp += heal;
    state.log.push(`Used ${item.emoji} ${item.name}: restored ${heal} HP`);
  } else if (item.name === "Energy Potion") {
    p.buffs.push({ name: "Energy", stat: "attack", value: 5, turns: 10 });
    state.log.push(`Used ${item.emoji} ${item.name}: +5 ATK for 10 turns`);
  } else if (item.name === "Shield Scroll") {
    p.buffs.push({ name: "Shield", stat: "defense", value: 5, turns: 10 });
    state.log.push(`Used ${item.emoji} ${item.name}: +5 DEF for 10 turns`);
  } else if (item.name === "Map Scroll") {
    // Reveal entire floor
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        state.map[y][x].explored = true;
      }
    }
    state.log.push(`Used ${item.emoji} ${item.name}: floor revealed!`);
  }
}

function playerAttack(state: GameState, monster: Monster): void {
  const p = state.player;
  const atk = getEffectiveAttack(p);
  const dmg = calcDamage(atk, monster.defense);
  monster.hp -= dmg;

  state.log.push(`You hit ${monster.emoji} ${monster.name} for ${dmg} damage`);

  if (monster.hp <= 0) {
    state.log.push(`${monster.emoji} ${monster.name} defeated! +${monster.xp} XP`);
    state.map[monster.y][monster.x].monster = undefined;

    // Grant XP
    p.xp += monster.xp;
    while (p.xp >= p.xpToLevel) {
      p.xp -= p.xpToLevel;
      p.level++;
      p.maxHp += 10;
      p.hp = Math.min(p.hp + 10, p.maxHp);
      p.attack += 2;
      p.defense += 1;
      p.xpToLevel = xpToLevel(p.level);
      state.log.push(`Level up! You are now level ${p.level}`);
    }

    // Drop loot
    const { rollLoot } = require("./items");
    if (Math.random() < 0.3) {
      const loot = rollLoot(state.floor);
      if (loot) {
        state.map[monster.y][monster.x].item = loot;
      }
    }
  }
}

function monsterTurns(state: GameState): void {
  const p = state.player;
  const def = getEffectiveDefense(p);

  for (const m of state.monsters) {
    if (m.hp <= 0) continue;

    const dist = Math.abs(m.x - p.x) + Math.abs(m.y - p.y);

    // Adjacent = attack player
    if (dist === 1) {
      const dmg = calcDamage(m.attack, def);
      p.hp -= dmg;
      state.log.push(`${m.emoji} ${m.name} hits you for ${dmg} damage`);

      if (p.hp <= 0) {
        p.hp = 0;
        state.status = "dead";
        state.log.push("You have been slain...");
        return;
      }
      continue;
    }

    // Chase if within 5 tiles
    if (dist <= 5) {
      const isWalkable = (x: number, y: number): boolean => {
        if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return false;
        if (state.map[y][x].type === "wall") return false;
        if (x === p.x && y === p.y) return false;
        if (state.monsters.some((o) => o !== m && o.hp > 0 && o.x === x && o.y === y))
          return false;
        return true;
      };

      const { monsterAI } = require("./monsters");
      const move = monsterAI(m, p.x, p.y, isWalkable);
      if (move.dx !== 0 || move.dy !== 0) {
        state.map[m.y][m.x].monster = undefined;
        m.x += move.dx;
        m.y += move.dy;
        state.map[m.y][m.x].monster = m;
      }
    }
  }
}

function handleTileEffects(state: GameState, tile: typeof state.map[0][0]): void {
  const p = state.player;

  if (tile.item) {
    if (p.inventory.length < 6) {
      state.log.push(`Picked up ${tile.item.emoji} ${tile.item.name}`);
      p.inventory.push(tile.item);
      tile.item = undefined;
    } else {
      state.log.push("Inventory full!");
    }
  }

  if (tile.type === "chest") {
    const loot = rollChestLoot(state.floor);
    if (p.inventory.length < 6) {
      state.log.push(`Opened chest: ${loot.emoji} ${loot.name}!`);
      p.inventory.push(loot);
    } else {
      state.log.push("Chest opened but inventory full! Item lost.");
    }
    tile.type = "floor";
  }

  if (tile.type === "trap") {
    const dmg = 5 + state.floor * 2;
    p.hp -= dmg;
    state.log.push(`Stepped on a trap! Took ${dmg} damage`);
    tile.type = "floor";
    if (p.hp <= 0) {
      p.hp = 0;
      state.status = "dead";
      state.log.push("You have been slain...");
    }
  }

  if (tile.type === "stairs") {
    if (state.floor >= 10) {
      state.status = "victory";
      state.log.push("You conquered the dungeon! Victory!");
    } else {
      enterFloor(state, state.floor + 1);
    }
  }
}

function updateVisibility(state: GameState): void {
  const p = state.player;

  // Clear visibility
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      state.map[y][x].visible = false;
    }
  }

  // Set visible tiles within radius
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dist = Math.abs(x - p.x) + Math.abs(y - p.y);
      if (dist <= VISION_RADIUS) {
        state.map[y][x].visible = true;
        state.map[y][x].explored = true;
      }
    }
  }
}

function calcScore(state: GameState): number {
  return (
    state.floor * 100 +
    state.player.level * 50 +
    state.turns +
    state.player.xp
  );
}

export function getClientState(state: GameState): object {
  return {
    id: state.id,
    player: state.player,
    floor: state.floor,
    map: state.map,
    log: state.log.slice(-20),
    status: state.status,
    score: state.score,
    turns: state.turns,
  };
}
