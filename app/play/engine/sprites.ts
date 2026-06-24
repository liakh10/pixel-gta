// Procedural pixel-art sprites, drawn once into offscreen canvases and cached.
// All directional sprites (player, cars, peds) face EAST (+x) so they can be
// rotated by an entity's `angle` (0 = east) at render time.

export type Canvas = HTMLCanvasElement;

function make(w: number, h: number): { c: Canvas; ctx: CanvasRenderingContext2D } {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

function hash(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2246822519) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0; h = (h * 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

// ── People (top-down, facing east) ──
function buildPerson(shirt: string, skin: string, hair: string, frame: number): Canvas {
  const { c, ctx } = make(14, 14);
  const cx = 7, cy = 7;
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.ellipse(cx, cy + 4, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
  // legs (animate)
  const off = frame === 1 ? 1 : -1;
  ctx.fillStyle = "#2a2a35";
  ctx.fillRect(cx - 3, cy + 1 + off, 2, 4);
  ctx.fillRect(cx + 1, cy + 1 - off, 2, 4);
  // body
  rr(ctx, cx - 4, cy - 3, 8, 7, 2, shirt);
  // arms
  ctx.fillStyle = shirt;
  ctx.fillRect(cx - 5, cy - 2, 2, 4);
  ctx.fillRect(cx + 3, cy - 2, 2, 4);
  // head + hair (front toward east = right)
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(cx + 1, cy - 1, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = hair;
  ctx.fillRect(cx - 2, cy - 4, 4, 3);
  return c;
}

// ── Car (top-down, facing east; front at right) ──
function buildCar(body: string, opts?: { police?: boolean }): Canvas {
  const L = 30, W = 16;
  const { c, ctx } = make(L, W);
  const dark = shade(body, 0.6);
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  rr(ctx, 2, 3, L - 3, W - 3, 4, "rgba(0,0,0,0.3)");
  // wheels
  ctx.fillStyle = "#101014";
  ctx.fillRect(5, 0, 6, 3); ctx.fillRect(5, W - 3, 6, 3);
  ctx.fillRect(L - 12, 0, 6, 3); ctx.fillRect(L - 12, W - 3, 6, 3);
  // body
  rr(ctx, 1, 2, L - 3, W - 4, 5, body);
  // outline
  ctx.strokeStyle = dark; ctx.lineWidth = 1;
  ctx.strokeRect(1.5, 2.5, L - 4, W - 5);
  // roof / cabin (lighter)
  rr(ctx, 9, 4, 12, W - 8, 3, shade(body, 1.18));
  // windshield (front, toward east)
  ctx.fillStyle = "#9fd0e8";
  ctx.fillRect(20, 4, 4, W - 8);
  // rear window
  ctx.fillStyle = "#6fa8c4";
  ctx.fillRect(7, 4, 3, W - 8);
  // headlights (front)
  ctx.fillStyle = "#fff3b0";
  ctx.fillRect(L - 3, 3, 2, 2); ctx.fillRect(L - 3, W - 5, 2, 2);
  // tail lights
  ctx.fillStyle = "#cc2222";
  ctx.fillRect(1, 3, 1, 2); ctx.fillRect(1, W - 5, 1, 2);
  if (opts?.police) {
    // light bar on roof
    ctx.fillStyle = "#1133cc"; ctx.fillRect(13, 5, 2, W - 10);
    ctx.fillStyle = "#cc1133"; ctx.fillRect(15, 5, 2, W - 10);
  }
  return c;
}

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) * f);
  const g = Math.min(255, ((n >> 8) & 255) * f);
  const b = Math.min(255, (n & 255) * f);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function buildTree(): Canvas {
  const { c, ctx } = make(20, 20);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.ellipse(10, 13, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#5a3d22"; ctx.fillRect(9, 9, 2, 5);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = 5 + hash(i, 1, 3) * 3;
    ctx.fillStyle = i % 3 === 0 ? "#2f7d32" : "#3c9140";
    ctx.fillRect(10 + Math.cos(a) * r - 1, 7 + Math.sin(a) * r - 1, 3, 3);
  }
  ctx.fillStyle = "#4caf50"; ctx.beginPath(); ctx.arc(10, 7, 4, 0, Math.PI * 2); ctx.fill();
  return c;
}

function buildCash(): Canvas {
  const { c, ctx } = make(16, 16);
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(8, 12, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  rr(ctx, 2, 4, 12, 8, 1, "#2e7d32");
  rr(ctx, 3, 5, 10, 6, 1, "#43a047");
  ctx.fillStyle = "#e8f5e9"; ctx.font = "bold 8px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("$", 8, 8.5);
  return c;
}

function buildGunPickup(): Canvas {
  const { c, ctx } = make(16, 16);
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(8, 12, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#33363d"; ctx.fillRect(3, 6, 9, 3); ctx.fillRect(9, 6, 3, 5);
  ctx.fillStyle = "#5a5f6a"; ctx.fillRect(3, 6, 9, 1);
  ctx.fillStyle = "#1c1e22"; ctx.fillRect(4, 9, 3, 3);
  return c;
}

function shadowEllipse(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(8, 13, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
}

function buildGem(): Canvas {
  const { c, ctx } = make(16, 16);
  shadowEllipse(ctx);
  // faceted diamond
  ctx.fillStyle = "#19e0ff"; ctx.beginPath(); ctx.moveTo(8, 1); ctx.lineTo(14, 6); ctx.lineTo(8, 14); ctx.lineTo(2, 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#ff3e9a"; ctx.beginPath(); ctx.moveTo(8, 1); ctx.lineTo(8, 14); ctx.lineTo(2, 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#a855f7"; ctx.beginPath(); ctx.moveTo(5, 4); ctx.lineTo(11, 4); ctx.lineTo(8, 1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#ffffff"; ctx.fillRect(7, 3, 2, 2);
  return c;
}

function buildStar(): Canvas {
  const { c, ctx } = make(16, 16);
  shadowEllipse(ctx);
  ctx.fillStyle = "#FFD23D";
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 7 : 3;
    const x = 8 + Math.cos(a) * r, y = 8 + Math.sin(a) * r;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#fff6c0"; ctx.fillRect(7, 5, 2, 2);
  return c;
}

function buildHealth(): Canvas {
  const { c, ctx } = make(16, 16);
  shadowEllipse(ctx);
  rr(ctx, 3, 2, 10, 10, 2, "#f5f5f5");
  ctx.fillStyle = "#e23b3b"; ctx.fillRect(7, 4, 2, 6); ctx.fillRect(5, 6, 6, 2);
  return c;
}

function buildArmor(): Canvas {
  const { c, ctx } = make(16, 16);
  shadowEllipse(ctx);
  ctx.fillStyle = "#4aa6ff";
  ctx.beginPath(); ctx.moveTo(8, 2); ctx.lineTo(13, 4); ctx.lineTo(13, 8); ctx.lineTo(8, 13); ctx.lineTo(3, 8); ctx.lineTo(3, 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#bfe0ff"; ctx.fillRect(7, 5, 2, 5); ctx.fillRect(5, 6, 6, 2);
  return c;
}

// ── Tiles (cached variants per type) ──
export const T = { GRASS: 0, ROAD: 1, SIDEWALK: 2, BUILDING: 3, WATER: 4, PARK: 5 } as const;

function buildTile(type: number, variant: number, size: number): Canvas {
  const { c, ctx } = make(size, size);
  const noise = (base: [number, number, number], v: number) => {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const n = hash(x, y, variant * 13 + type * 7);
      const f = 1 - v / 2 + n * v;
      ctx.fillStyle = `rgb(${(base[0] * f) | 0},${(base[1] * f) | 0},${(base[2] * f) | 0})`;
      ctx.fillRect(x, y, 1, 1);
    }
  };
  switch (type) {
    case T.GRASS: noise([74, 124, 58], 0.28); break;
    case T.PARK: noise([86, 140, 64], 0.26); break;
    case T.ROAD:
      noise([46, 47, 52], 0.16);
      break;
    case T.SIDEWALK:
      noise([120, 122, 128], 0.14);
      ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
      break;
    case T.WATER: noise([40, 92, 150], 0.2); break;
    case T.BUILDING: {
      const tones: [number, number, number][] = [[70, 64, 78], [78, 70, 64], [64, 70, 82], [86, 72, 70]];
      const base = tones[variant % tones.length];
      noise(base, 0.12);
      // windows
      ctx.fillStyle = "rgba(255,225,150,0.18)";
      for (let wy = 3; wy < size - 3; wy += 7)
        for (let wx = 3; wx < size - 3; wx += 7)
          if (hash(wx, wy, variant) > 0.35) ctx.fillRect(wx, wy, 3, 4);
      ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
      break;
    }
  }
  return c;
}

export interface SpriteSet {
  person: (key: string) => Canvas[];   // 2 walk frames
  car: (color: string, police?: boolean) => Canvas;
  tree: Canvas;
  cash: Canvas;
  gun: Canvas;
  gem: Canvas;
  star: Canvas;
  health: Canvas;
  armor: Canvas;
  tile: (type: number, variant: number) => Canvas;
  tileSize: number;
}

export function buildSprites(tileSize: number): SpriteSet {
  const personCache = new Map<string, Canvas[]>();
  const carCache = new Map<string, Canvas>();
  const tileCache = new Map<string, Canvas>();
  const VARIANTS = 3;

  const palettes: Record<string, [string, string, string]> = {
    player: ["#2f7d32", "#5b3a1f", "#0e0e0e"],   // CJ — green shirt, dark skin, black hair
    ped1: ["#3b78c4", "#f1c27d", "#3a2a1a"],
    ped2: ["#43a047", "#c68642", "#111111"],
    ped3: ["#8e44ad", "#ffdbac", "#5a3a1a"],
    ped4: ["#d39e00", "#8d5524", "#222"],
    cop: ["#1f3a93", "#e0ac69", "#101820"],
  };

  return {
    person: (key) => {
      if (!personCache.has(key)) {
        const p = palettes[key] || palettes.ped1;
        personCache.set(key, [buildPerson(p[0], p[1], p[2], 0), buildPerson(p[0], p[1], p[2], 1)]);
      }
      return personCache.get(key)!;
    },
    car: (color, police) => {
      const k = color + (police ? "_p" : "");
      if (!carCache.has(k)) carCache.set(k, buildCar(color, { police }));
      return carCache.get(k)!;
    },
    tree: buildTree(),
    cash: buildCash(),
    gun: buildGunPickup(),
    gem: buildGem(),
    star: buildStar(),
    health: buildHealth(),
    armor: buildArmor(),
    tile: (type, variant) => {
      const k = `${type}_${variant % VARIANTS}`;
      if (!tileCache.has(k)) tileCache.set(k, buildTile(type, variant % VARIANTS, tileSize));
      return tileCache.get(k)!;
    },
    tileSize,
  };
}

export const CAR_COLORS = ["#c0392b", "#2980b9", "#27ae60", "#f39c12", "#8e44ad", "#16a085", "#d35400", "#7f8c8d", "#2c3e50", "#c0c0c0"];
export const PED_KEYS = ["ped1", "ped2", "ped3", "ped4"];
