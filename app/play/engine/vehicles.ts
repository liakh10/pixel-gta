import { Car } from "./entities";
import { World } from "./world";

export interface DriveInput { throttle: number; steer: number; brake: boolean; }

// Returns true if a hard collision happened this step (for shake/damage/sfx).
export function updateCar(car: Car, world: World, input: DriveInput, dt: number): boolean {
  const { throttle, steer, brake } = input;

  // longitudinal
  if (brake) {
    car.speed -= Math.sign(car.speed) * car.accel * 2.2 * dt;
    if (Math.abs(car.speed) < 6) car.speed = 0;
  } else {
    car.speed += throttle * car.accel * dt;
  }
  // drag / rolling friction
  car.speed *= 1 - 1.4 * dt;
  car.speed = Math.max(-car.maxSpeed * 0.45, Math.min(car.maxSpeed, car.speed));

  // steering scales with speed (can't turn parked)
  const speedFactor = Math.min(1, Math.abs(car.speed) / 50);
  const dir = car.speed >= 0 ? 1 : -1;
  car.angle += steer * car.turn * speedFactor * dir * dt;

  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;

  let crashed = false;
  // axis-separated collision so cars slide along walls
  const hw = 11, hh = 7;
  if (!world.rectHitsSolid(nx, car.y, hw, hh)) {
    car.x = nx;
  } else { crashed = true; }
  if (!world.rectHitsSolid(car.x, ny, hw, hh)) {
    car.y = ny;
  } else { crashed = true; }

  if (crashed) {
    const impact = Math.abs(car.speed);
    car.speed *= -0.25;
    if (impact > 90) car.health = Math.max(0, car.health - impact * 0.05);
    return impact > 60;
  }
  return false;
}

// Four world-space corners of a car (for hit tests)
export function carCorners(car: Car): { x: number; y: number }[] {
  const c = Math.cos(car.angle), s = Math.sin(car.angle);
  const hw = car.w / 2, hh = car.h / 2;
  return [
    [hw, hh], [hw, -hh], [-hw, hh], [-hw, -hh],
  ].map(([dx, dy]) => ({ x: car.x + dx * c - dy * s, y: car.y + dx * s + dy * c }));
}

export function pointInCar(px: number, py: number, car: Car, pad = 0): boolean {
  const c = Math.cos(-car.angle), s = Math.sin(-car.angle);
  const dx = px - car.x, dy = py - car.y;
  const lx = dx * c - dy * s, ly = dx * s + dy * c;
  return Math.abs(lx) <= car.w / 2 + pad && Math.abs(ly) <= car.h / 2 + pad;
}
