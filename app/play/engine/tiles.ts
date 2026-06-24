import { T } from "./sprites";

export const TILE = 24;          // world px per tile
export const MAP_W = 80;
export const MAP_H = 80;
export const WORLD_W = MAP_W * TILE;
export const WORLD_H = MAP_H * TILE;

const PERIOD = 8;                // city grid period (tiles)
const ROAD_W = 2;                // road width (tiles)

export interface CityData {
  type: Uint8Array;     // tile type per cell
  variant: Uint8Array;  // visual variant
  solid: Uint8Array;    // 1 = blocks movement
}

function h(x: number, y: number, s: number): number {
  let v = (x * 374761393 + y * 668265263 + s * 2246822519) >>> 0;
  v = (v ^ (v >>> 13)) >>> 0; v = (v * 1274126177) >>> 0;
  return ((v ^ (v >>> 16)) >>> 0) / 4294967295;
}

export function generateCity(): CityData {
  const n = MAP_W * MAP_H;
  const type = new Uint8Array(n);
  const variant = new Uint8Array(n);
  const solid = new Uint8Array(n);

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const i = y * MAP_W + x;
      variant[i] = Math.floor(h(x, y, 99) * 3);

      // water border
      if (x < 1 || y < 1 || x >= MAP_W - 1 || y >= MAP_H - 1) {
        type[i] = T.WATER; solid[i] = 1; continue;
      }

      const lx = x % PERIOD, ly = y % PERIOD;
      const roadX = lx < ROAD_W, roadY = ly < ROAD_W;

      if (roadX || roadY) {
        type[i] = T.ROAD; solid[i] = 0;
        continue;
      }

      // block interior — is this block a park?
      const bx = Math.floor(x / PERIOD), by = Math.floor(y / PERIOD);
      const isPark = h(bx, by, 7) < 0.18;

      const ring = lx === ROAD_W || lx === PERIOD - 1 || ly === ROAD_W || ly === PERIOD - 1;
      if (ring) {
        type[i] = T.SIDEWALK; solid[i] = 0;
      } else if (isPark) {
        type[i] = T.PARK; solid[i] = 0;
      } else {
        type[i] = T.BUILDING; solid[i] = 1;
      }
    }
  }
  return { type, variant, solid };
}

export function tileAt(city: CityData, tx: number, ty: number): number {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return T.WATER;
  return city.type[ty * MAP_W + tx];
}

export function isRoadTile(city: CityData, tx: number, ty: number): boolean {
  return tileAt(city, tx, ty) === T.ROAD;
}

export function isSolidTile(city: CityData, tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
  return city.solid[ty * MAP_W + tx] === 1;
}
