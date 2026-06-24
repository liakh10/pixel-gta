export type WeaponId = "fist" | "pistol" | "smg";

export interface WeaponStat {
  name: string; dmg: number; cooldown: number; speed: number; range: number; auto: boolean; ammoUse: boolean;
}

export const WEAPONS: Record<WeaponId, WeaponStat> = {
  fist: { name: "FISTS", dmg: 12, cooldown: 0.35, speed: 0, range: 22, auto: false, ammoUse: false },
  pistol: { name: "PISTOL", dmg: 22, cooldown: 0.28, speed: 520, range: 320, auto: false, ammoUse: true },
  smg: { name: "SMG", dmg: 16, cooldown: 0.08, speed: 620, range: 360, auto: true, ammoUse: true },
};

export class Car {
  speed = 0;
  driver: "player" | "ai" | null = null;
  aiDir = 0;            // current heading the AI wants (radians)
  aiTimer = 0;
  blink = Math.random() * Math.PI * 2;
  w = 30; h = 16;
  constructor(
    public x: number, public y: number, public angle: number,
    public color: string, public police = false,
    public health = 100, public maxSpeed = 150, public accel = 140, public turn = 2.6,
  ) {}
}

export type PedState = "walk" | "flee" | "down";

export class Ped {
  walkFrame = 0; frameT = 0;
  state: PedState = "walk";
  target: { x: number; y: number } | null = null;
  retarget = 0;
  downT = 0;
  shootT = Math.random() * 1.5;
  health = 30;
  constructor(public x: number, public y: number, public angle = 0, public key = "ped1", public isCop = false) {
    if (isCop) this.health = 60;
  }
}

export class Bullet {
  life: number;
  constructor(
    public x: number, public y: number, public vx: number, public vy: number,
    public dmg: number, public fromPlayer: boolean, life = 0.7,
  ) { this.life = life; }
}

export type PickupKind = "cash" | "gun";
export class Pickup {
  bob = Math.random() * Math.PI * 2;
  constructor(public x: number, public y: number, public kind: PickupKind, public value = 0) {}
}

export class Particle {
  constructor(
    public x: number, public y: number, public vx: number, public vy: number,
    public life: number, public maxLife: number, public color: string, public size: number,
  ) {}
}

export class Player {
  onFoot = true;
  angle = 0;            // facing / aim (radians, 0 = east)
  walkFrame = 0; frameT = 0;
  health = 100; maxHealth = 100; armor = 0; maxArmor = 0;
  car: Car | null = null;
  weapon: WeaponId = "fist";
  ammo = 0;
  fireCd = 0;
  invuln = 0;
  constructor(public x: number, public y: number) {}

  takeDamage(d: number): boolean {
    if (this.invuln > 0) return false;
    if (this.armor > 0) {
      const a = Math.min(this.armor, d);
      this.armor -= a; d -= a;
    }
    this.health = Math.max(0, this.health - d);
    this.invuln = 0.25;
    return this.health <= 0;
  }
}
