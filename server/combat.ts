import { Player, Monster, Buff } from "./types";

export function calcDamage(attackerAtk: number, defenderDef: number): number {
  const roll = 0.8 + Math.random() * 0.4; // 0.8 - 1.2
  const raw = attackerAtk * roll - defenderDef * 0.5;
  return Math.max(1, Math.round(raw));
}

export function getEffectiveAttack(player: Player): number {
  let atk = player.attack;
  if (player.equipment.weapon) atk += player.equipment.weapon.stats.attack ?? 0;
  if (player.equipment.ring?.stats.attack) atk += player.equipment.ring.stats.attack;
  for (const b of player.buffs) {
    if (b.stat === "attack") atk += b.value;
  }
  return atk;
}

export function getEffectiveDefense(player: Player): number {
  let def = player.defense;
  if (player.equipment.armor) def += player.equipment.armor.stats.defense ?? 0;
  if (player.equipment.ring?.stats.defense) def += player.equipment.ring.stats.defense;
  for (const b of player.buffs) {
    if (b.stat === "defense") def += b.value;
  }
  return def;
}

export function tickBuffs(buffs: Buff[]): Buff[] {
  return buffs
    .map((b) => ({ ...b, turns: b.turns - 1 }))
    .filter((b) => b.turns > 0);
}

export function xpToLevel(level: number): number {
  return 20 + (level - 1) * 15;
}
