import { World } from "./world";
import { Camera } from "./camera";
import { Input } from "./input";
import { buildSprites, SpriteSet, T, CAR_COLORS, PED_KEYS } from "./sprites";
import { TILE, MAP_W, MAP_H } from "./tiles";
import { Player, Car, Ped, Bullet, Pickup, Particle, WEAPONS } from "./entities";
import { updateCar, pointInCar } from "./vehicles";
import { updateTraffic, updatePedWander, fleeFrom, driveToward, angDiff } from "./ai";
import { Economy, Shop } from "./economy";
import { Wanted } from "./wanted";
import { MissionManager, MissionKind, MISSION_KINDS } from "./missions";
import { Sfx } from "./sfx";

export interface HudState {
  cash: number;
  hp: number; maxHp: number; armor: number; maxArmor: number;
  wanted: number;
  inCar: boolean; weapon: string; ammo: number;
  missionText: string | null; missionTime: number;
  shop: Shop | null;
  prompt: string | null;
  gameOver: "wasted" | "busted" | null;
  carHp: number;
}

export interface GameHandle {
  onState: (cb: (s: HudState) => void) => void;
  buy: (id: "health" | "armor" | "gun" | "carSpeed" | "carArmor") => void;
  setMinimap: (c: HTMLCanvasElement | null) => void;
  respawn: () => void;
  dispose: () => void;
}

interface FloatText { x: number; y: number; vy: number; life: number; text: string; color: string; }
interface JobMarker { x: number; y: number; kind: MissionKind; }
interface ShopMarker { x: number; y: number; shopId: string; }

export function createGame(container: HTMLElement): GameHandle {
  const canvas = document.createElement("canvas");
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  container.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;

  const world = new World();
  const sprites: SpriteSet = buildSprites(TILE);
  const cam = new Camera(container.clientWidth, container.clientHeight, 2.4);
  const input = new Input(canvas);
  const econ = new Economy();
  const wanted = new Wanted();
  const missions = new MissionManager();
  const sfx = new Sfx();

  function resize() {
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = Math.floor(container.clientWidth * dpr);
    canvas.height = Math.floor(container.clientHeight * dpr);
    cam.resize(container.clientWidth, container.clientHeight);
    cam.dpr = dpr;
    ctx.imageSmoothingEnabled = false;
  }
  resize();
  window.addEventListener("resize", resize);

  // ── Entities ──
  const spawn = world.randomRoadPoint();
  const player = new Player(spawn.x, spawn.y);
  const cars: Car[] = [];
  const peds: Ped[] = [];
  const bullets: Bullet[] = [];
  const pickups: Pickup[] = [];
  const particles: Particle[] = [];
  const floats: FloatText[] = [];

  function applyStats(heal = false) {
    player.maxHealth = econ.maxHealth();
    player.maxArmor = econ.maxArmor();
    if (heal) { player.health = player.maxHealth; player.armor = player.maxArmor; }
    else { player.health = Math.min(player.health, player.maxHealth); player.armor = Math.min(player.armor, player.maxArmor); }
    player.weapon = econ.weapon();
  }
  applyStats(true);
  player.ammo = player.weapon === "fist" ? 0 : 200;

  // job + shop markers
  const jobs: JobMarker[] = [];
  for (let i = 0; i < 4; i++) { const p = world.randomRoadPoint(); jobs.push({ x: p.x, y: p.y, kind: MISSION_KINDS[i % MISSION_KINDS.length] }); }
  const shops: ShopMarker[] = [];
  ["GUNSHOP", "GARAGE", "HOSPITAL"].forEach((id) => { const p = world.randomWalkPoint(); shops.push({ x: p.x, y: p.y, shopId: id }); });

  // scatter cash pickups
  for (let i = 0; i < 14; i++) { const p = world.randomRoadPoint(); pickups.push(new Pickup(p.x, p.y, "cash", 40 + Math.floor(Math.random() * 80))); }
  for (let i = 0; i < 4; i++) { const p = world.randomWalkPoint(); pickups.push(new Pickup(p.x, p.y, "gun", 0)); }

  // ── spawn helpers ──
  function spawnTrafficCar() {
    const p = nearOffscreenRoad();
    if (!p) return;
    const c = new Car(p.x, p.y, [0, Math.PI / 2, Math.PI, -Math.PI / 2][(Math.random() * 4) | 0],
      CAR_COLORS[(Math.random() * CAR_COLORS.length) | 0]);
    c.driver = "ai"; c.aiDir = c.angle; c.maxSpeed = 110 + Math.random() * 40;
    cars.push(c);
  }
  function spawnPed() {
    const p = nearOffscreenWalk();
    if (!p) return;
    peds.push(new Ped(p.x, p.y, Math.random() * 6.28, PED_KEYS[(Math.random() * PED_KEYS.length) | 0]));
  }
  function nearOffscreenRoad(): { x: number; y: number } | null {
    for (let k = 0; k < 30; k++) {
      const ang = Math.random() * 6.28; const r = 260 + Math.random() * 120;
      const x = player.x + Math.cos(ang) * r, y = player.y + Math.sin(ang) * r;
      if (x < TILE || y < TILE || x > world.W - TILE || y > world.H - TILE) continue;
      if (world.isRoadWorld(x, y)) return { x, y };
    }
    return null;
  }
  function nearOffscreenWalk(): { x: number; y: number } | null {
    for (let k = 0; k < 30; k++) {
      const ang = Math.random() * 6.28; const r = 220 + Math.random() * 120;
      const x = player.x + Math.cos(ang) * r, y = player.y + Math.sin(ang) * r;
      const t = world.tileAtWorld(x, y);
      if (t === T.SIDEWALK || t === T.PARK) return { x, y };
    }
    return null;
  }
  for (let i = 0; i < 14; i++) spawnTrafficCar();
  for (let i = 0; i < 20; i++) spawnPed();

  // police
  let policeSpawnT = 0;
  function spawnPolice() {
    const p = nearOffscreenRoad(); if (!p) return;
    const c = new Car(p.x, p.y, Math.random() * 6.28, "#202833", true, 100, 165, 170, 2.8);
    c.driver = "ai"; c.aiDir = c.angle;
    cars.push(c);
  }

  // ── effects ──
  function burst(x: number, y: number, color: string, n = 8, spd = 90) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, s = spd * (0.3 + Math.random());
      particles.push(new Particle(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.4 + Math.random() * 0.3, 0.7, color, 1 + Math.random() * 2));
    }
  }
  function floatText(x: number, y: number, text: string, color: string) {
    floats.push({ x, y, vy: -28, life: 1.1, text, color });
  }

  // ── shooting ──
  function tryFire() {
    const w = WEAPONS[player.weapon];
    if (player.fireCd > 0) return;
    if (player.weapon === "fist") {
      // melee
      player.fireCd = w.cooldown;
      sfx.melee();
      for (const pd of peds) {
        if (pd.state === "down") continue;
        const d = Math.hypot(pd.x - player.x, pd.y - player.y);
        if (d < w.range && Math.abs(angDiff(Math.atan2(pd.y - player.y, pd.x - player.x), player.angle)) < 1) {
          pd.health -= w.dmg; burst(pd.x, pd.y, "#ff5555", 5);
          if (pd.health <= 0) downPed(pd);
        }
      }
      return;
    }
    if (player.ammo <= 0) { player.weapon = "fist"; return; }
    player.fireCd = w.cooldown;
    player.ammo--;
    const spread = player.weapon === "smg" ? 0.12 : 0.04;
    const a = player.angle + (Math.random() - 0.5) * spread;
    bullets.push(new Bullet(player.x + Math.cos(a) * 10, player.y + Math.sin(a) * 10, Math.cos(a) * w.speed, Math.sin(a) * w.speed, w.dmg, true, w.range / w.speed));
    burst(player.x + Math.cos(a) * 12, player.y + Math.sin(a) * 12, "#ffd36b", 3, 40);
    cam.shake(1.5, 0.08);
    wanted.shoot();
    sfx.shoot();
  }

  function downPed(pd: Ped) {
    pd.state = "down"; pd.downT = 6;
    burst(pd.x, pd.y, "#cc2222", 10);
    if (pd.isCop) { wanted.killCop(); if (Math.random() < 0.7) pickups.push(new Pickup(pd.x, pd.y, "cash", 60)); }
    else { wanted.crime(10); if (Math.random() < 0.35) pickups.push(new Pickup(pd.x, pd.y, "cash", 30)); }
  }

  // ── death / respawn ──
  let gameOver: "wasted" | "busted" | null = null;
  let deadT = 0;
  function killPlayer(kind: "wasted" | "busted") {
    if (gameOver) return;
    gameOver = kind; deadT = 2.2;
    if (player.car) { player.car.driver = null; player.car = null; player.onFoot = true; }
    burst(player.x, player.y, "#ff3333", 16, 120);
  }
  function doRespawn() {
    const loss = Math.round(econ.cash * 0.1);
    econ.addCash(-loss);
    const hp = world.randomRoadPoint();
    player.x = hp.x; player.y = hp.y;
    applyStats(true);
    player.invuln = 2;
    wanted.clear();
    // clear police
    for (let i = cars.length - 1; i >= 0; i--) if (cars[i].police) cars.splice(i, 1);
    for (let i = peds.length - 1; i >= 0; i--) if (peds[i].isCop) peds.splice(i, 1);
    gameOver = null;
    missions.cancel();
  }

  // ── main update ──
  let nearShop: Shop | null = null;
  let prompt: string | null = null;

  function update(dt: number) {
    prompt = null;

    if (gameOver) {
      deadT -= dt;
      if (deadT <= 0) doRespawn();
      stepParticles(dt);
      return;
    }

    const onFoot = player.onFoot;
    // aim toward mouse
    const wm = cam.screenToWorld(input.mouseX, input.mouseY);
    const aim = Math.atan2(wm.y - player.y, wm.x - player.x);

    if (onFoot) {
      player.angle = aim;
      let mx = 0, my = 0;
      if (input.down("KeyW")) my -= 1;
      if (input.down("KeyS")) my += 1;
      if (input.down("KeyA")) mx -= 1;
      if (input.down("KeyD")) mx += 1;
      const moving = mx !== 0 || my !== 0;
      if (moving) {
        const len = Math.hypot(mx, my); mx /= len; my /= len;
        const sp = 78;
        const nx = player.x + mx * sp * dt, ny = player.y + my * sp * dt;
        if (!world.rectHitsSolid(nx, player.y, 4, 5)) player.x = nx;
        if (!world.rectHitsSolid(player.x, ny, 4, 5)) player.y = ny;
        player.frameT += dt; if (player.frameT > 0.14) { player.frameT = 0; player.walkFrame ^= 1; }
      }
      // health regen
      if (player.health < player.maxHealth) player.health = Math.min(player.maxHealth, player.health + 4 * dt);

      // fire
      if (input.mouseDown) tryFire();

      // enter car
      if (input.consumePressed("KeyF")) {
        let best: Car | null = null, bd = 30;
        for (const c of cars) { const d = Math.hypot(c.x - player.x, c.y - player.y); if (d < bd) { bd = d; best = c; } }
        if (best) {
          if (best.driver === "ai" || best.police) wanted.stealCar();
          best.driver = "player"; player.car = best; player.onFoot = false;
          best.maxSpeed = (best.police ? 170 : 150) * econ.carSpeedMult();
          sfx.start();
        }
      }
      // job
      let nearJob: JobMarker | null = null;
      for (const j of jobs) if (Math.hypot(j.x - player.x, j.y - player.y) < 30) nearJob = j;
      if (nearJob && !missions.active) {
        prompt = "[E] START JOB";
        if (input.consumePressed("KeyE")) { missions.start(nearJob.kind, world, player.x, player.y); sfx.start(); }
      } else if (!nearJob) {
        // car prompt
        for (const c of cars) if (Math.hypot(c.x - player.x, c.y - player.y) < 26) { prompt = "[F] DRIVE"; break; }
      }
      // shop proximity
      nearShop = null;
      for (const sm of shops) {
        if (Math.hypot(sm.x - player.x, sm.y - player.y) < 34) {
          nearShop = econ.shops().find((s) => s.id === sm.shopId) || null;
        }
      }
    } else if (player.car) {
      const car = player.car;
      const throttle = (input.down("KeyW") ? 1 : 0) - (input.down("KeyS") ? 1 : 0);
      const steer = (input.down("KeyD") ? 1 : 0) - (input.down("KeyA") ? 1 : 0);
      const brake = input.down("Space");
      const hardHit = updateCar(car, world, { throttle, steer, brake }, dt);
      if (hardHit) { cam.shake(5, 0.25); sfx.crash(); wanted.wreck(); car.health -= 4; }
      // run over peds
      for (const pd of peds) {
        if (pd.state === "down") continue;
        if (pointInCar(pd.x, pd.y, car, 6) && Math.abs(car.speed) > 40) { downPed(pd); cam.shake(3, 0.15); }
      }
      if (car.health <= 0) {
        burst(car.x, car.y, "#ff8800", 24, 140); cam.shake(7, 0.4); sfx.crash();
        player.onFoot = true; player.car = null; car.driver = null;
        player.takeDamage(25);
        const idx = cars.indexOf(car); if (idx >= 0) cars.splice(idx, 1);
      }
      prompt = "[F] EXIT";
      if (input.consumePressed("KeyF")) {
        car.driver = null; player.onFoot = true;
        player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 18;
        player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 18;
      }
      nearShop = null;
    }

    // ── AI cars ──
    for (const c of cars) {
      if (c.driver !== "ai") continue;
      if (c.police && wanted.level > 0) {
        const di = driveToward(c, player.x, player.y);
        updateCar(c, world, di, dt);
        c.blink += dt * 12;
        // ram / shoot
        const d = Math.hypot(c.x - player.x, c.y - player.y);
        if (d < 90 && wanted.level >= 2 && Math.random() < 0.02 + wanted.level * 0.01) {
          const a = Math.atan2(player.y - c.y, player.x - c.x);
          bullets.push(new Bullet(c.x, c.y, Math.cos(a) * 460, Math.sin(a) * 460, 8, false, 0.7));
          sfx.shoot();
        }
      } else {
        const di = updateTraffic(c, world, dt);
        updateCar(c, world, di, dt);
      }
    }

    // ── peds ──
    for (const pd of peds) {
      if (pd.isCop && wanted.level > 0) {
        const d = Math.hypot(pd.x - player.x, pd.y - player.y);
        if (d > 16) { pd.target = { x: player.x, y: player.y }; updatePedWander(pd, world, dt, 40); }
        pd.shootT -= dt;
        if (d < 150 && pd.shootT <= 0) {
          pd.shootT = 1.1 - wanted.level * 0.08;
          const a = Math.atan2(player.y - pd.y, player.x - pd.x);
          bullets.push(new Bullet(pd.x, pd.y, Math.cos(a) * 420, Math.sin(a) * 420, 9, false, 0.8));
          sfx.shoot();
        }
      } else {
        updatePedWander(pd, world, dt);
        if (pd.state === "flee" && pd.retarget <= 0) pd.state = "walk";
      }
    }

    // ── bullets ──
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.life -= dt;
      const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
      let hit = false;
      if (world.solidAtWorld(nx, ny)) { hit = true; burst(nx, ny, "#cccccc", 4, 60); }
      if (!hit && b.fromPlayer) {
        for (const pd of peds) {
          if (pd.state === "down") continue;
          if (Math.hypot(pd.x - nx, pd.y - ny) < 7) {
            pd.health -= b.dmg; burst(nx, ny, "#ff5555", 5); hit = true;
            if (!pd.isCop && pd.state !== "flee") fleeFrom(pd, player.x, player.y, world);
            if (pd.health <= 0) downPed(pd);
            break;
          }
        }
      }
      if (!hit && !b.fromPlayer) {
        if (player.onFoot && Math.hypot(player.x - nx, player.y - ny) < 7) {
          hit = true; burst(nx, ny, "#ff5555", 5); sfx.hurt(); cam.shake(2, 0.1);
          if (player.takeDamage(b.dmg)) killPlayer("wasted");
        } else if (player.car && pointInCar(nx, ny, player.car)) {
          hit = true; player.car.health -= b.dmg * 0.5; burst(nx, ny, "#ffaa55", 4);
        }
      }
      b.x = nx; b.y = ny;
      if (hit || b.life <= 0) bullets.splice(i, 1);
    }

    // ── pickups ──
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      p.bob += dt * 3;
      if (Math.hypot(p.x - player.x, p.y - player.y) < 18) {
        if (p.kind === "cash") { econ.addCash(p.value); floatText(player.x, player.y - 14, `+$${p.value}`, "#7CFC6B"); sfx.cash(); }
        else { player.ammo += 60; if (player.weapon === "fist" && econ.upgrades.gun > 0) player.weapon = econ.weapon(); floatText(player.x, player.y - 14, "+AMMO", "#ffd36b"); sfx.pickup(); }
        pickups.splice(i, 1);
      }
    }

    // ── missions ──
    const r = missions.update(dt, player.x, player.y, world);
    if (r > 0) { econ.addCash(r); econ.missionsDone++; econ.save(); floatText(player.x, player.y - 16, `MISSION +$${r}`, "#FFD700"); sfx.cash(); }
    else if (r < 0) { floatText(player.x, player.y - 16, "MISSION FAILED", "#ff5555"); }

    // ── wanted / police spawning ──
    const policeCount = cars.filter((c) => c.police).length + peds.filter((p) => p.isCop).length;
    wanted.update(dt, policeCount > 0);
    policeSpawnT -= dt;
    if (wanted.level > 0 && policeSpawnT <= 0 && policeCount < wanted.level * 2) {
      policeSpawnT = 2.5 - wanted.level * 0.25;
      if (Math.random() < 0.6) spawnPolice();
      else { const p = nearOffscreenWalk(); if (p) peds.push(new Ped(p.x, p.y, 0, "cop", true)); }
    }
    if (wanted.level === 0 && policeCount > 0) {
      for (let i = cars.length - 1; i >= 0; i--) if (cars[i].police && Math.hypot(cars[i].x - player.x, cars[i].y - player.y) > 300) cars.splice(i, 1);
      for (let i = peds.length - 1; i >= 0; i--) if (peds[i].isCop && Math.hypot(peds[i].x - player.x, peds[i].y - player.y) > 300) peds.splice(i, 1);
    }

    // ── despawn / maintain population ──
    maintainPopulation();

    // particles + floats
    stepParticles(dt);

    // timers
    if (player.fireCd > 0) player.fireCd -= dt;
    if (player.invuln > 0) player.invuln -= dt;

    // camera
    const tx = player.onFoot ? player.x : player.car!.x;
    const ty = player.onFoot ? player.y : player.car!.y;
    cam.zoom = player.onFoot ? 2.4 : 2.0;
    cam.follow(tx, ty, world.W, world.H, dt);
  }

  function stepParticles(dt: number) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i]; f.life -= dt; f.y += f.vy * dt; f.vy *= 0.94;
      if (f.life <= 0) floats.splice(i, 1);
    }
  }

  function maintainPopulation() {
    for (let i = cars.length - 1; i >= 0; i--) {
      const c = cars[i];
      if (c.driver === "player") continue;
      if (Math.hypot(c.x - player.x, c.y - player.y) > 520) cars.splice(i, 1);
    }
    for (let i = peds.length - 1; i >= 0; i--) {
      const pd = peds[i];
      if (pd.state === "down" && pd.downT <= 0 && Math.hypot(pd.x - player.x, pd.y - player.y) > 200) { peds.splice(i, 1); continue; }
      if (Math.hypot(pd.x - player.x, pd.y - player.y) > 560) peds.splice(i, 1);
    }
    const wantCars = 16;
    if (cars.filter((c) => c.driver === "ai" && !c.police).length < wantCars && Math.random() < 0.4) spawnTrafficCar();
    if (peds.filter((p) => !p.isCop).length < 22 && Math.random() < 0.5) spawnPed();
  }

  // ── render ──
  function render() {
    const dpr = cam.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#0a0a10";
    ctx.fillRect(0, 0, container.clientWidth, container.clientHeight);
    cam.apply(ctx);

    const view = visibleTileRange();
    // tiles
    for (let ty = view.y0; ty <= view.y1; ty++) {
      for (let tx = view.x0; tx <= view.x1; tx++) {
        if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) continue;
        const i = ty * MAP_W + tx;
        const type = world.city.type[i], variant = world.city.variant[i];
        ctx.drawImage(sprites.tile(type, variant), tx * TILE, ty * TILE);
        // lane dashes
        if (type === T.ROAD) drawLane(tx, ty);
      }
    }

    // trees
    for (const t of world.trees) if (inView(t.x, t.y, view)) ctx.drawImage(sprites.tree, t.x - 10, t.y - 14);

    // job markers
    for (const j of jobs) {
      if (missions.active) break;
      drawMarker(j.x, j.y, "#FFD700", "$");
    }
    // shop markers
    for (const sm of shops) drawMarker(sm.x, sm.y, "#46b4ff", sm.shopId === "GUNSHOP" ? "G" : sm.shopId === "GARAGE" ? "C" : "H");
    // mission dest
    if (missions.active) {
      const m = missions.active;
      if (m.pickups) for (const p of m.pickups) { if (!p.got) drawMarker(p.x, p.y, "#FFD700", "$"); }
      else drawMarker(m.dest.x, m.dest.y, "#7CFC6B", "▶");
    }

    // pickups
    for (const p of pickups) {
      if (!inView(p.x, p.y, view)) continue;
      const img = p.kind === "cash" ? sprites.cash : sprites.gun;
      ctx.drawImage(img, p.x - 8, p.y - 8 + Math.sin(p.bob) * 2);
    }

    // peds
    for (const pd of peds) {
      if (!inView(pd.x, pd.y, view)) continue;
      drawRotated(sprites.person(pd.isCop ? "cop" : pd.key)[pd.walkFrame], pd.x, pd.y, pd.angle, pd.state === "down");
    }
    // cars
    for (const c of cars) {
      if (!inView(c.x, c.y, view)) continue;
      drawRotated(sprites.car(c.color, c.police), c.x, c.y, c.angle);
      if (c.police) {
        const on = Math.floor(c.blink) % 2 === 0;
        ctx.fillStyle = on ? "#ff2233" : "#2244ff";
        ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(c.x, c.y, 16, 0, 6.28); ctx.fill(); ctx.globalAlpha = 1;
      }
    }
    // player
    if (!gameOver || deadT > 1.5) {
      if (player.onFoot) {
        const flick = player.invuln > 0 && Math.floor(player.invuln * 20) % 2 === 0;
        if (!flick) drawRotated(sprites.person("player")[player.walkFrame], player.x, player.y, player.angle);
      }
      // (player in car already drawn as the car)
    }
    // muzzle/aim line on foot
    if (player.onFoot && player.weapon !== "fist") {
      ctx.strokeStyle = "rgba(255,80,80,0.25)"; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(player.x, player.y);
      ctx.lineTo(player.x + Math.cos(player.angle) * 200, player.y + Math.sin(player.angle) * 200); ctx.stroke();
    }

    // bullets
    ctx.fillStyle = "#ffe08a";
    for (const b of bullets) ctx.fillRect(b.x - 1, b.y - 1, 2, 2);
    // particles
    for (const p of particles) { ctx.globalAlpha = Math.max(0, p.life / p.maxLife); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); }
    ctx.globalAlpha = 1;
    // floats
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const f of floats) {
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.font = "8px 'Press Start 2P', monospace";
      ctx.fillStyle = "#000"; ctx.fillText(f.text, f.x + 1, f.y + 1);
      ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    // back to screen space for overlays
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // vignette + night tint (screen space)
    const g = ctx.createRadialGradient(
      container.clientWidth / 2, container.clientHeight / 2, container.clientHeight * 0.3,
      container.clientWidth / 2, container.clientHeight / 2, container.clientHeight * 0.75);
    g.addColorStop(0, "rgba(8,10,24,0)");
    g.addColorStop(1, "rgba(4,6,16,0.55)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, container.clientWidth, container.clientHeight);

    // crosshair on foot
    if (player.onFoot && !gameOver) {
      ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 1.5;
      const mx = input.mouseX, my = input.mouseY;
      ctx.beginPath();
      ctx.moveTo(mx - 6, my); ctx.lineTo(mx + 6, my); ctx.moveTo(mx, my - 6); ctx.lineTo(mx, my + 6); ctx.stroke();
    }
  }

  function drawLane(tx: number, ty: number) {
    const lx = tx % 8, ly = ty % 8;
    const roadX = lx < 2, roadY = ly < 2;
    if (roadX && roadY) return; // intersection
    ctx.fillStyle = "rgba(240,210,80,0.5)";
    if (roadY && !roadX && ly === 1 && tx % 2 === 0) ctx.fillRect(tx * TILE, ty * TILE, TILE * 0.6, 1.5);
    if (roadX && !roadY && lx === 1 && ty % 2 === 0) ctx.fillRect(tx * TILE, ty * TILE, 1.5, TILE * 0.6);
  }

  function drawMarker(x: number, y: number, color: string, label: string) {
    const t = performance.now() / 400;
    const pulse = 12 + Math.sin(t + x) * 2;
    ctx.globalAlpha = 0.25; ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, pulse, 0, 6.28); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 4, 0, 6.28); ctx.fill();
    ctx.fillStyle = "#06121f"; ctx.font = "6px 'Press Start 2P', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(label, x, y + 0.5);
  }

  function drawRotated(img: HTMLCanvasElement, x: number, y: number, angle: number, flat = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (flat) ctx.globalAlpha = 0.7;
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function visibleTileRange() {
    return {
      x0: Math.floor(cam.x / TILE) - 1,
      y0: Math.floor(cam.y / TILE) - 1,
      x1: Math.ceil((cam.x + cam.viewW / cam.zoom) / TILE) + 1,
      y1: Math.ceil((cam.y + cam.viewH / cam.zoom) / TILE) + 1,
    };
  }
  function inView(x: number, y: number, v: { x0: number; y0: number; x1: number; y1: number }) {
    const tx = x / TILE, ty = y / TILE;
    return tx >= v.x0 - 1 && tx <= v.x1 + 1 && ty >= v.y0 - 1 && ty <= v.y1 + 1;
  }

  // ── minimap ──
  let mini: HTMLCanvasElement | null = null;
  function drawMinimap() {
    if (!mini) return;
    const mctx = mini.getContext("2d")!;
    const MW = mini.width, MH = mini.height;
    const scale = MW / world.W;
    mctx.clearRect(0, 0, MW, MH);
    mctx.fillStyle = "#0a0e16"; mctx.fillRect(0, 0, MW, MH);
    // roads (coarse — sample every 2 tiles)
    for (let ty = 0; ty < MAP_H; ty += 1) {
      for (let tx = 0; tx < MAP_W; tx += 1) {
        const t = world.city.type[ty * MAP_W + tx];
        if (t === T.ROAD) { mctx.fillStyle = "#39414f"; mctx.fillRect(tx * TILE * scale, ty * TILE * scale, TILE * scale + 0.5, TILE * scale + 0.5); }
        else if (t === T.WATER) { mctx.fillStyle = "#16314f"; mctx.fillRect(tx * TILE * scale, ty * TILE * scale, TILE * scale + 0.5, TILE * scale + 0.5); }
      }
    }
    const dot = (x: number, y: number, c: string, r = 2) => { mctx.fillStyle = c; mctx.beginPath(); mctx.arc(x * scale, y * scale, r, 0, 6.28); mctx.fill(); };
    if (!missions.active) for (const j of jobs) dot(j.x, j.y, "#FFD700", 2);
    for (const sm of shops) dot(sm.x, sm.y, "#46b4ff", 2);
    if (missions.active) { const m = missions.active; if (m.pickups) m.pickups.forEach((p) => !p.got && dot(p.x, p.y, "#FFD700", 2)); else dot(m.dest.x, m.dest.y, "#7CFC6B", 2.5); }
    for (const c of cars) if (c.police) dot(c.x, c.y, "#ff3344", 1.6);
    for (const pd of peds) if (pd.isCop) dot(pd.x, pd.y, "#ff3344", 1.4);
    dot(player.x, player.y, "#ffffff", 2.4);
  }

  // ── HUD push ──
  let stateCb: (s: HudState) => void = () => {};
  function pushState() {
    stateCb({
      cash: econ.cash,
      hp: Math.round(player.health), maxHp: player.maxHealth,
      armor: Math.round(player.armor), maxArmor: player.maxArmor,
      wanted: wanted.level,
      inCar: !player.onFoot, weapon: WEAPONS[player.weapon].name, ammo: player.weapon === "fist" ? 0 : player.ammo,
      missionText: missions.active?.text ?? null,
      missionTime: missions.active ? Math.max(0, Math.ceil(missions.active.timeLeft)) : 0,
      shop: nearShop,
      prompt,
      gameOver,
      carHp: player.car ? Math.round(player.car.health) : 0,
    });
  }

  // ── loop ──
  let raf = 0;
  let last = performance.now();
  let acc = 0;
  function loop() {
    const now = performance.now();
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.05) dt = 0.05;
    update(dt);
    render();
    drawMinimap();
    input.endFrame();
    acc += dt;
    if (acc > 0.06) { acc = 0; pushState(); }
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  return {
    onState: (cb) => { stateCb = cb; pushState(); },
    buy: (id) => { if (econ.buy(id)) { applyStats(); if (id === "gun") player.ammo += 150; pushState(); sfx.cash(); } },
    setMinimap: (c) => { mini = c; },
    respawn: () => doRespawn(),
    dispose: () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      input.dispose();
      if (canvas.parentElement === container) container.removeChild(canvas);
    },
  };
}
