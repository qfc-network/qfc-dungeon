import { Tile, Monster } from "./types";
import { getMonsterPool, createMonster, createBoss } from "./monsters";
import { rollLoot } from "./items";

const SIZE = 15;

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function generateMap(
  floor: number
): { map: Tile[][]; monsters: Monster[]; playerStart: { x: number; y: number } } {
  // Initialize all walls
  const map: Tile[][] = [];
  for (let y = 0; y < SIZE; y++) {
    map[y] = [];
    for (let x = 0; x < SIZE; x++) {
      map[y][x] = { type: "wall", visible: false, explored: false };
    }
  }

  // BSP room generation
  const rooms = bspSplit({ x: 1, y: 1, w: SIZE - 2, h: SIZE - 2 }, 3);

  // Carve rooms
  for (const room of rooms) {
    for (let ry = room.y; ry < room.y + room.h; ry++) {
      for (let rx = room.x; rx < room.x + room.w; rx++) {
        if (ry >= 0 && ry < SIZE && rx >= 0 && rx < SIZE) {
          map[ry][rx] = { type: "floor", visible: false, explored: false };
        }
      }
    }
  }

  // Connect rooms with corridors
  for (let i = 0; i < rooms.length - 1; i++) {
    const a = roomCenter(rooms[i]);
    const b = roomCenter(rooms[i + 1]);
    carveCorridor(map, a.x, a.y, b.x, b.y);
  }

  // Place player in first room
  const start = roomCenter(rooms[0]);
  const playerStart = { x: start.x, y: start.y };

  // Place stairs in last room
  const end = roomCenter(rooms[rooms.length - 1]);
  map[end.y][end.x] = { type: "stairs", visible: false, explored: false };

  // Place monsters
  const monsters: Monster[] = [];
  const pool = getMonsterPool(floor);
  const monsterCount = Math.min(3 + floor, 8);

  for (let i = 0; i < monsterCount; i++) {
    const pos = findEmptyFloor(map, monsters, playerStart);
    if (!pos) break;
    const template = pool[Math.floor(Math.random() * pool.length)];
    const m = createMonster(template, pos.x, pos.y);
    monsters.push(m);
    map[pos.y][pos.x].monster = m;
  }

  // Place boss on floor 10
  if (floor === 10) {
    const bossPos = findEmptyFloor(map, monsters, playerStart);
    if (bossPos) {
      const boss = createBoss(bossPos.x, bossPos.y);
      monsters.push(boss);
      map[bossPos.y][bossPos.x].monster = boss;
    }
  }

  // Place items on floor
  const itemCount = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < itemCount; i++) {
    const pos = findEmptyFloor(map, monsters, playerStart);
    if (!pos) break;
    const item = rollLoot(floor);
    if (item) {
      map[pos.y][pos.x].item = item;
    }
  }

  // Place chests
  const chestCount = Math.random() < 0.5 ? 1 : 0;
  for (let i = 0; i < chestCount; i++) {
    const pos = findEmptyFloor(map, monsters, playerStart);
    if (pos) {
      map[pos.y][pos.x].type = "chest";
    }
  }

  // Place traps on higher floors
  if (floor >= 3) {
    const trapCount = Math.floor(Math.random() * (floor / 2));
    for (let i = 0; i < trapCount; i++) {
      const pos = findEmptyFloor(map, monsters, playerStart);
      if (pos) {
        map[pos.y][pos.x].type = "trap";
      }
    }
  }

  return { map, monsters, playerStart };
}

function bspSplit(area: Room, depth: number): Room[] {
  if (depth <= 0 || area.w < 4 || area.h < 4) {
    // Create a room within this area
    const rw = Math.max(2, Math.floor(area.w * (0.5 + Math.random() * 0.4)));
    const rh = Math.max(2, Math.floor(area.h * (0.5 + Math.random() * 0.4)));
    const rx = area.x + Math.floor(Math.random() * (area.w - rw));
    const ry = area.y + Math.floor(Math.random() * (area.h - rh));
    return [{ x: rx, y: ry, w: rw, h: rh }];
  }

  const splitH = area.w > area.h ? false : area.h > area.w ? true : Math.random() < 0.5;

  if (splitH) {
    const split = area.y + Math.floor(area.h * (0.3 + Math.random() * 0.4));
    const top: Room = { x: area.x, y: area.y, w: area.w, h: split - area.y };
    const bottom: Room = { x: area.x, y: split, w: area.w, h: area.h - (split - area.y) };
    return [...bspSplit(top, depth - 1), ...bspSplit(bottom, depth - 1)];
  } else {
    const split = area.x + Math.floor(area.w * (0.3 + Math.random() * 0.4));
    const left: Room = { x: area.x, y: area.y, w: split - area.x, h: area.h };
    const right: Room = { x: split, y: area.y, w: area.w - (split - area.x), h: area.h };
    return [...bspSplit(left, depth - 1), ...bspSplit(right, depth - 1)];
  }
}

function roomCenter(room: Room): { x: number; y: number } {
  return {
    x: Math.floor(room.x + room.w / 2),
    y: Math.floor(room.y + room.h / 2),
  };
}

function carveCorridor(map: Tile[][], x1: number, y1: number, x2: number, y2: number): void {
  let x = x1;
  let y = y1;

  while (x !== x2) {
    if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) {
      if (map[y][x].type === "wall") {
        map[y][x] = { type: "floor", visible: false, explored: false };
      }
    }
    x += x < x2 ? 1 : -1;
  }
  while (y !== y2) {
    if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) {
      if (map[y][x].type === "wall") {
        map[y][x] = { type: "floor", visible: false, explored: false };
      }
    }
    y += y < y2 ? 1 : -1;
  }
}

function findEmptyFloor(
  map: Tile[][],
  monsters: Monster[],
  playerStart: { x: number; y: number }
): { x: number; y: number } | null {
  for (let attempts = 0; attempts < 100; attempts++) {
    const x = Math.floor(Math.random() * SIZE);
    const y = Math.floor(Math.random() * SIZE);
    if (map[y][x].type !== "floor") continue;
    if (x === playerStart.x && y === playerStart.y) continue;
    if (map[y][x].monster || map[y][x].item) continue;
    if (monsters.some((m) => m.x === x && m.y === y)) continue;
    return { x, y };
  }
  return null;
}
