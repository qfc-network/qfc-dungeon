import { Item } from "./types";
import { v4 as uuid } from "uuid";

interface ItemTemplate {
  name: string;
  emoji: string;
  type: Item["type"];
  stats: Item["stats"];
  duration?: number;
  minFloor: number;
}

const ITEM_TEMPLATES: ItemTemplate[] = [
  // Weapons
  { name: "Rusty Sword", emoji: "\u{1F5E1}\uFE0F", type: "weapon", stats: { attack: 3 }, minFloor: 1 },
  { name: "Iron Blade", emoji: "\u2694\uFE0F", type: "weapon", stats: { attack: 6 }, minFloor: 3 },
  { name: "Flame Sword", emoji: "\u{1F525}", type: "weapon", stats: { attack: 10 }, minFloor: 5 },
  { name: "Lightning Spear", emoji: "\u26A1", type: "weapon", stats: { attack: 14 }, minFloor: 7 },
  // Armor
  { name: "Leather Armor", emoji: "\u{1F6E1}\uFE0F", type: "armor", stats: { defense: 3 }, minFloor: 1 },
  { name: "Chain Mail", emoji: "\u{1F6E1}\uFE0F", type: "armor", stats: { defense: 6 }, minFloor: 3 },
  { name: "Plate Armor", emoji: "\u{1F6E1}\uFE0F", type: "armor", stats: { defense: 10 }, minFloor: 6 },
  // Consumables
  { name: "Health Potion", emoji: "\u2764\uFE0F", type: "consumable", stats: { hp: 30 }, minFloor: 1 },
  { name: "Energy Potion", emoji: "\u26A1", type: "consumable", stats: { attack: 5 }, duration: 10, minFloor: 1 },
  { name: "Shield Scroll", emoji: "\u{1F6E1}\uFE0F", type: "consumable", stats: { defense: 5 }, duration: 10, minFloor: 1 },
  { name: "Map Scroll", emoji: "\u{1F5FA}\uFE0F", type: "consumable", stats: {}, minFloor: 1 },
];

export function createItem(template: ItemTemplate): Item {
  return {
    id: uuid(),
    name: template.name,
    emoji: template.emoji,
    type: template.type,
    stats: { ...template.stats },
    duration: template.duration,
  };
}

export function rollLoot(floor: number): Item | null {
  const available = ITEM_TEMPLATES.filter((t) => t.minFloor <= floor);
  if (available.length === 0) return null;

  // Weight consumables higher
  const weighted: ItemTemplate[] = [];
  for (const t of available) {
    const count = t.type === "consumable" ? 3 : 1;
    for (let i = 0; i < count; i++) weighted.push(t);
  }

  const pick = weighted[Math.floor(Math.random() * weighted.length)];
  return createItem(pick);
}

export function rollChestLoot(floor: number): Item {
  // Chests give better items — filter to equipment preferentially
  const available = ITEM_TEMPLATES.filter((t) => t.minFloor <= floor);
  const equipment = available.filter((t) => t.type === "weapon" || t.type === "armor");
  const pool = equipment.length > 0 && Math.random() < 0.6 ? equipment : available;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return createItem(pick);
}
