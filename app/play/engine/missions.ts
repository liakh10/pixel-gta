import { World } from "./world";

export type MissionKind = "deliver" | "taxi" | "collect";

export interface MissionPickup { x: number; y: number; got: boolean; }
export interface Mission {
  kind: MissionKind;
  stage: number;
  dest: { x: number; y: number };
  pickups?: MissionPickup[];
  timeLeft: number;
  reward: number;
  text: string;
}

const ARRIVE = 28;

function dist(ax: number, ay: number, bx: number, by: number) { return Math.hypot(ax - bx, ay - by); }

export class MissionManager {
  active: Mission | null = null;

  start(kind: MissionKind, world: World, ox: number, oy: number) {
    if (kind === "deliver") {
      const dest = world.randomRoadPoint();
      const d = dist(ox, oy, dest.x, dest.y);
      this.active = {
        kind, stage: 0, dest,
        timeLeft: Math.max(25, d / 70),
        reward: Math.round(120 + d / 4),
        text: "DELIVER: reach the drop-off",
      };
    } else if (kind === "taxi") {
      const pickup = world.randomRoadPoint();
      this.active = {
        kind, stage: 0, dest: pickup,
        timeLeft: 45,
        reward: 0,
        text: "TAXI: pick up the passenger",
      };
    } else {
      const pickups: MissionPickup[] = [];
      for (let i = 0; i < 3; i++) { const p = world.randomRoadPoint(); pickups.push({ x: p.x, y: p.y, got: false }); }
      this.active = {
        kind, stage: 0, dest: pickups[0],
        pickups,
        timeLeft: 40,
        reward: 260,
        text: "COLLECT: grab all 3 cash crates",
      };
    }
  }

  // returns reward amount on completion, -1 on fail, 0 otherwise
  update(dt: number, px: number, py: number, world: World): number {
    const m = this.active;
    if (!m) return 0;
    m.timeLeft -= dt;
    if (m.timeLeft <= 0) { this.active = null; return -1; }

    if (m.kind === "deliver") {
      if (dist(px, py, m.dest.x, m.dest.y) < ARRIVE) { const r = m.reward; this.active = null; return r; }
    } else if (m.kind === "taxi") {
      if (m.stage === 0) {
        if (dist(px, py, m.dest.x, m.dest.y) < ARRIVE) {
          const drop = world.randomRoadPoint();
          const d = dist(m.dest.x, m.dest.y, drop.x, drop.y);
          m.stage = 1; m.dest = drop; m.timeLeft = Math.max(30, d / 70);
          m.reward = Math.round(160 + d / 3.5);
          m.text = "TAXI: drop the passenger off";
        }
      } else {
        if (dist(px, py, m.dest.x, m.dest.y) < ARRIVE) { const r = m.reward; this.active = null; return r; }
      }
    } else if (m.kind === "collect" && m.pickups) {
      for (const p of m.pickups) if (!p.got && dist(px, py, p.x, p.y) < ARRIVE) p.got = true;
      const left = m.pickups.filter((p) => !p.got);
      m.text = `COLLECT: ${m.pickups.length - left.length}/${m.pickups.length} crates`;
      if (left.length === 0) { const r = m.reward; this.active = null; return r; }
      m.dest = left[0];
    }
    return 0;
  }

  cancel() { this.active = null; }
}

export const MISSION_KINDS: MissionKind[] = ["deliver", "taxi", "collect"];
