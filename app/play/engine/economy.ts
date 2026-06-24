import { WeaponId } from "./entities";

const SAVE_KEY = "pixelgta_save_v1";

export interface Upgrades {
  health: number; armor: number; gun: number; carSpeed: number; carArmor: number;
}

export interface ShopItem {
  id: keyof Upgrades; name: string; desc: string; cost: number; level: number; max: number; maxed: boolean;
}
export interface Shop { id: string; name: string; items: ShopItem[]; }

const COSTS: Record<keyof Upgrades, number[]> = {
  health: [150, 400, 900],
  armor: [200, 500, 1100],
  gun: [250, 1200],            // pistol, smg
  carSpeed: [300, 700, 1500],
  carArmor: [250, 600, 1300],
};

export class Economy {
  cash = 500;
  upgrades: Upgrades = { health: 0, armor: 0, gun: 0, carSpeed: 0, carArmor: 0 };
  missionsDone = 0;

  constructor() { this.load(); }

  // ── derived stats ──
  maxHealth() { return 100 + this.upgrades.health * 30; }
  maxArmor() { return this.upgrades.armor * 35; }
  weapon(): WeaponId { return this.upgrades.gun >= 2 ? "smg" : this.upgrades.gun === 1 ? "pistol" : "fist"; }
  carSpeedMult() { return 1 + this.upgrades.carSpeed * 0.14; }
  carHealthBonus() { return this.upgrades.carArmor * 60; }

  addCash(n: number) { this.cash = Math.max(0, this.cash + n); this.save(); }

  cost(id: keyof Upgrades): number | null {
    const lvl = this.upgrades[id];
    const arr = COSTS[id];
    if (lvl >= arr.length) return null;
    return arr[lvl];
  }

  shops(): Shop[] {
    const item = (id: keyof Upgrades, name: string, desc: string): ShopItem => {
      const arr = COSTS[id]; const lvl = this.upgrades[id];
      const maxed = lvl >= arr.length;
      return { id, name, desc, cost: maxed ? 0 : arr[lvl], level: lvl, max: arr.length, maxed };
    };
    return [
      { id: "GUNSHOP", name: "AMMU-NATION", items: [
        item("gun", "WEAPON", "Pistol → SMG"),
      ] },
      { id: "GARAGE", name: "GARAGE", items: [
        item("carSpeed", "ENGINE", "+14% top speed"),
        item("carArmor", "PLATING", "+60 car HP"),
      ] },
      { id: "HOSPITAL", name: "PHARMACY", items: [
        item("health", "MAX HEALTH", "+30 HP"),
        item("armor", "BODY ARMOR", "+35 armor"),
      ] },
    ];
  }

  buy(id: keyof Upgrades): boolean {
    const c = this.cost(id);
    if (c === null || this.cash < c) return false;
    this.cash -= c;
    this.upgrades[id]++;
    this.save();
    return true;
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ cash: this.cash, upgrades: this.upgrades, missionsDone: this.missionsDone }));
    } catch { /* ignore */ }
  }
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (typeof d.cash === "number") this.cash = d.cash;
      if (d.upgrades) this.upgrades = { ...this.upgrades, ...d.upgrades };
      if (typeof d.missionsDone === "number") this.missionsDone = d.missionsDone;
    } catch { /* ignore */ }
  }
  reset() {
    this.cash = 500;
    this.upgrades = { health: 0, armor: 0, gun: 0, carSpeed: 0, carArmor: 0 };
    this.missionsDone = 0;
    this.save();
  }
}
