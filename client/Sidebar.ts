import { GameState, Item } from "./types";

export class Sidebar {
  private onUseItem: (itemId: string) => void;

  constructor(onUseItem: (itemId: string) => void) {
    this.onUseItem = onUseItem;
  }

  update(state: GameState): void {
    const p = state.player;

    // Stats
    this.setText("stat-floor", String(state.floor));
    this.setText("stat-level", String(p.level));
    this.setText("stat-hp", `${p.hp}/${p.maxHp}`);
    this.setText("stat-xp", `${p.xp}/${p.xpToLevel}`);
    this.setText("stat-score", String(state.score));
    this.setText("stat-turns", String(state.turns));

    // Calculate effective stats
    let atk = p.attack;
    let def = p.defense;
    if (p.equipment.weapon) atk += p.equipment.weapon.stats.attack ?? 0;
    if (p.equipment.armor) def += p.equipment.armor.stats.defense ?? 0;
    if (p.equipment.ring?.stats.attack) atk += p.equipment.ring.stats.attack;
    if (p.equipment.ring?.stats.defense) def += p.equipment.ring.stats.defense;
    for (const b of p.buffs) {
      if (b.stat === "attack") atk += b.value;
      if (b.stat === "defense") def += b.value;
    }
    this.setText("stat-atk", String(atk));
    this.setText("stat-def", String(def));

    // Bars
    this.setWidth("hp-bar", (p.hp / p.maxHp) * 100);
    this.setWidth("xp-bar", (p.xp / p.xpToLevel) * 100);

    // Equipment
    this.setText("eq-weapon", p.equipment.weapon ? `${p.equipment.weapon.emoji} ${p.equipment.weapon.name}` : "None");
    this.setText("eq-armor", p.equipment.armor ? `${p.equipment.armor.emoji} ${p.equipment.armor.name}` : "None");
    this.setText("eq-ring", p.equipment.ring ? `${p.equipment.ring.emoji} ${p.equipment.ring.name}` : "None");

    // Inventory
    this.setText("inv-count", String(p.inventory.length));
    const list = document.getElementById("inventory-list")!;
    list.innerHTML = "";
    for (const item of p.inventory) {
      const li = document.createElement("li");
      li.innerHTML = `<span>${item.emoji} ${item.name}</span><span style="color:#666;font-size:11px">${this.itemStatText(item)}</span>`;
      li.addEventListener("click", () => this.onUseItem(item.id));
      list.appendChild(li);
    }

    // Buffs
    const buffsList = document.getElementById("buffs-list")!;
    buffsList.innerHTML = "";
    for (const b of p.buffs) {
      const li = document.createElement("li");
      li.textContent = `${b.name}: +${b.value} ${b.stat} (${b.turns}t)`;
      buffsList.appendChild(li);
    }

    // Log
    const logDiv = document.getElementById("log")!;
    logDiv.innerHTML = "";
    for (const msg of state.log) {
      const p2 = document.createElement("p");
      p2.textContent = msg;
      if (msg.includes("damage") || msg.includes("slain")) p2.className = "log-damage";
      else if (msg.includes("restored") || msg.includes("heal")) p2.className = "log-heal";
      else if (msg.includes("Picked up") || msg.includes("Equipped") || msg.includes("chest")) p2.className = "log-item";
      else if (msg.includes("Level up")) p2.className = "log-level";
      else p2.className = "log-info";
      logDiv.appendChild(p2);
    }
    logDiv.scrollTop = logDiv.scrollHeight;
  }

  private itemStatText(item: Item): string {
    if (item.type === "consumable") {
      if (item.stats.hp) return `+${item.stats.hp} HP`;
      if (item.stats.attack) return `+${item.stats.attack} ATK`;
      if (item.stats.defense) return `+${item.stats.defense} DEF`;
      if (item.name === "Map Scroll") return "Reveal";
      return "";
    }
    if (item.stats.attack) return `+${item.stats.attack} ATK`;
    if (item.stats.defense) return `+${item.stats.defense} DEF`;
    return "";
  }

  private setText(id: string, text: string): void {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  private setWidth(id: string, pct: number): void {
    const el = document.getElementById(id);
    if (el) el.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  }
}
