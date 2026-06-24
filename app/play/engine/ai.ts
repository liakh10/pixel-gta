import { Car, Ped } from "./entities";
import { World } from "./world";
import { TILE } from "./tiles";
import { DriveInput } from "./vehicles";

export function angDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

const DIRS = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

// ── Pedestrian wandering on sidewalks/parks ──
export function updatePedWander(ped: Ped, world: World, dt: number, speed = 26) {
  if (ped.state === "down") { ped.downT -= dt; return; }

  ped.retarget -= dt;
  if (!ped.target || ped.retarget <= 0) {
    ped.target = world.randomWalkPoint();
    ped.retarget = 3 + Math.random() * 4;
  }
  moveToward(ped, world, ped.target.x, ped.target.y, ped.state === "flee" ? speed * 2.3 : speed, dt);
  if (ped.target && Math.hypot(ped.target.x - ped.x, ped.target.y - ped.y) < 8) ped.target = null;
  if (ped.state === "flee") { ped.frameT += dt * 2; }
}

export function fleeFrom(ped: Ped, fx: number, fy: number, world: World) {
  const a = Math.atan2(ped.y - fy, ped.x - fx);
  ped.target = { x: ped.x + Math.cos(a) * TILE * 4, y: ped.y + Math.sin(a) * TILE * 4 };
  ped.state = "flee";
  ped.retarget = 1.2;
}

export function moveToward(ped: Ped, world: World, tx: number, ty: number, speed: number, dt: number) {
  const a = Math.atan2(ty - ped.y, tx - ped.x);
  ped.angle = a;
  const nx = ped.x + Math.cos(a) * speed * dt;
  const ny = ped.y + Math.sin(a) * speed * dt;
  if (!world.rectHitsSolid(nx, ped.y, 4, 4)) ped.x = nx;
  if (!world.rectHitsSolid(ped.x, ny, 4, 4)) ped.y = ny;
  ped.frameT += dt;
  if (ped.frameT > 0.18) { ped.frameT = 0; ped.walkFrame ^= 1; }
}

// ── Traffic: follow the road grid, turn at intersections ──
export function updateTraffic(car: Car, world: World, dt: number): DriveInput {
  const ahead = TILE * 1.1;
  const canGo = (a: number) => world.isRoadWorld(car.x + Math.cos(a) * ahead, car.y + Math.sin(a) * ahead);

  car.aiTimer -= dt;
  if (!canGo(car.aiDir)) {
    const rev = car.aiDir + Math.PI;
    const opts = DIRS.filter((a) => canGo(a) && Math.abs(angDiff(a, rev)) > 0.2);
    car.aiDir = opts.length ? opts[(Math.random() * opts.length) | 0] : rev;
    car.aiTimer = 0.8 + Math.random();
  } else if (car.aiTimer <= 0) {
    car.aiTimer = 0.7 + Math.random() * 1.6;
    if (Math.random() < 0.35) {
      const perp = [car.aiDir + Math.PI / 2, car.aiDir - Math.PI / 2].filter(canGo);
      if (perp.length) car.aiDir = perp[(Math.random() * perp.length) | 0];
    }
  }
  const diff = angDiff(car.aiDir, car.angle);
  const steer = Math.max(-1, Math.min(1, diff * 2.4));
  const throttle = Math.abs(diff) > 0.6 ? 0.45 : 0.8;
  return { throttle, steer, brake: false };
}

// ── Generic "drive toward a point" for police chases ──
export function driveToward(car: Car, tx: number, ty: number): DriveInput {
  const desired = Math.atan2(ty - car.y, tx - car.x);
  const diff = angDiff(desired, car.angle);
  const steer = Math.max(-1, Math.min(1, diff * 2.2));
  const dist = Math.hypot(tx - car.x, ty - car.y);
  const throttle = dist < 40 ? 0.3 : Math.abs(diff) > 1.4 ? 0.5 : 1;
  return { throttle, steer, brake: false };
}
