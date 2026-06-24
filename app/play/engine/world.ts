import { CityData, generateCity, isSolidTile, isRoadTile, tileAt, TILE, MAP_W, MAP_H, WORLD_W, WORLD_H } from "./tiles";
import { T } from "./sprites";

export interface Tree { x: number; y: number; }

export class World {
  city: CityData;
  trees: Tree[] = [];
  readonly TILE = TILE;
  readonly MAP_W = MAP_W;
  readonly MAP_H = MAP_H;
  readonly W = WORLD_W;
  readonly H = WORLD_H;

  constructor() {
    this.city = generateCity();
    this.scatterTrees();
  }

  private scatterTrees() {
    for (let ty = 0; ty < MAP_H; ty++)
      for (let tx = 0; tx < MAP_W; tx++)
        if (tileAt(this.city, tx, ty) === T.PARK && Math.random() < 0.22)
          this.trees.push({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 });
  }

  tileAtWorld(x: number, y: number): number {
    return tileAt(this.city, Math.floor(x / TILE), Math.floor(y / TILE));
  }
  solidAtWorld(x: number, y: number): boolean {
    return isSolidTile(this.city, Math.floor(x / TILE), Math.floor(y / TILE));
  }
  isRoadWorld(x: number, y: number): boolean {
    return isRoadTile(this.city, Math.floor(x / TILE), Math.floor(y / TILE));
  }

  // AABB centred at (cx,cy) with half-size (hw,hh) vs solid tiles
  rectHitsSolid(cx: number, cy: number, hw: number, hh: number): boolean {
    const minX = Math.floor((cx - hw) / TILE), maxX = Math.floor((cx + hw) / TILE);
    const minY = Math.floor((cy - hh) / TILE), maxY = Math.floor((cy + hh) / TILE);
    for (let ty = minY; ty <= maxY; ty++)
      for (let tx = minX; tx <= maxX; tx++)
        if (isSolidTile(this.city, tx, ty)) return true;
    return false;
  }

  // Find a road point (centre of a road tile) near a target, for spawns
  randomRoadPoint(): { x: number; y: number } {
    for (let k = 0; k < 200; k++) {
      const tx = 2 + Math.floor(Math.random() * (MAP_W - 4));
      const ty = 2 + Math.floor(Math.random() * (MAP_H - 4));
      if (isRoadTile(this.city, tx, ty))
        return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
    }
    return { x: WORLD_W / 2, y: WORLD_H / 2 };
  }

  randomWalkPoint(): { x: number; y: number } {
    for (let k = 0; k < 200; k++) {
      const tx = 2 + Math.floor(Math.random() * (MAP_W - 4));
      const ty = 2 + Math.floor(Math.random() * (MAP_H - 4));
      const t = tileAt(this.city, tx, ty);
      if (t === T.SIDEWALK || t === T.PARK)
        return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
    }
    return this.randomRoadPoint();
  }
}
