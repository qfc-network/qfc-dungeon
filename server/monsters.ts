import { Monster } from "./types";
import { v4 as uuid } from "uuid";

interface MonsterTemplate {
  name: string;
  emoji: string;
  hp: number;
  attack: number;
  defense: number;
  xp: number;
}

const EASY: MonsterTemplate[] = [
  { name: "Rat", emoji: "\u{1F400}", hp: 15, attack: 3, defense: 1, xp: 5 },
  { name: "Bat", emoji: "\u{1F987}", hp: 10, attack: 5, defense: 0, xp: 4 },
  { name: "Spider", emoji: "\u{1F577}\uFE0F", hp: 20, attack: 4, defense: 2, xp: 7 },
];

const MEDIUM: MonsterTemplate[] = [
  { name: "Skeleton", emoji: "\u{1F480}", hp: 35, attack: 8, defense: 4, xp: 15 },
  { name: "Snake", emoji: "\u{1F40D}", hp: 25, attack: 10, defense: 2, xp: 12 },
  { name: "Ghost", emoji: "\u{1F47B}", hp: 30, attack: 7, defense: 6, xp: 18 },
];

const HARD: MonsterTemplate[] = [
  { name: "Drake", emoji: "\u{1F409}", hp: 60, attack: 14, defense: 8, xp: 30 },
  { name: "Dark Mage", emoji: "\u{1F9D9}", hp: 40, attack: 18, defense: 3, xp: 35 },
  { name: "Demon", emoji: "\u{1F479}", hp: 80, attack: 16, defense: 10, xp: 40 },
];

const BOSS: MonsterTemplate = {
  name: "Dragon Lord",
  emoji: "\u{1F432}",
  hp: 200,
  attack: 25,
  defense: 15,
  xp: 100,
};

export function getMonsterPool(floor: number): MonsterTemplate[] {
  if (floor <= 3) return EASY;
  if (floor <= 6) return MEDIUM;
  return HARD;
}

export function createMonster(template: MonsterTemplate, x: number, y: number): Monster {
  return {
    id: uuid(),
    name: template.name,
    emoji: template.emoji,
    hp: template.hp,
    maxHp: template.hp,
    attack: template.attack,
    defense: template.defense,
    xp: template.xp,
    x,
    y,
  };
}

export function createBoss(x: number, y: number): Monster {
  return createMonster(BOSS, x, y);
}

export function monsterAI(
  monster: Monster,
  playerX: number,
  playerY: number,
  isWalkable: (x: number, y: number) => boolean
): { dx: number; dy: number } {
  const dist = Math.abs(monster.x - playerX) + Math.abs(monster.y - playerY);
  if (dist > 5) return { dx: 0, dy: 0 };

  // Simple chase: move toward player
  const dx = Math.sign(playerX - monster.x);
  const dy = Math.sign(playerY - monster.y);

  // Try horizontal first, then vertical
  if (dx !== 0 && isWalkable(monster.x + dx, monster.y)) {
    return { dx, dy: 0 };
  }
  if (dy !== 0 && isWalkable(monster.x, monster.y + dy)) {
    return { dx: 0, dy };
  }
  // Try diagonal alternatives
  if (dx !== 0 && dy !== 0) {
    if (isWalkable(monster.x, monster.y + dy)) return { dx: 0, dy };
    if (isWalkable(monster.x + dx, monster.y)) return { dx, dy: 0 };
  }
  return { dx: 0, dy: 0 };
}
