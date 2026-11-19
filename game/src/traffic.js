// Traffic and pedestrians. NPC cars drive along the road grid, turning at
// intersections; pedestrians stroll the sidewalks and flee from fast cars.
// Both are pooled at boot so the step allocates nothing.
import { ROADS_X, ROADS_Y, ROAD_W, BEACH_Y, onRoad, nearestRoadPoint, collideBuildings } from './city.js';
import { WORLD, CAR } from './config.js';

const CAR_COLORS = ['#cbd5e1', '#94a3b8', '#f59e0b', '#38bdf8', '#a78bfa', '#f472b6', '#34d399', '#e2e8f0'];
const PED_COLORS = ['#f87171', '#60a5fa', '#fbbf24', '#a3e635', '#f472b6', '#2dd4bf', '#e879f9', '#fdba74'];

export function createTraffic(random, city) {
  const cars = [];
  const peds = [];
  for (let i = 0; i < 14; i += 1) {
    cars.push({ active: false, x: 0, y: 0, angle: 0, speed: 0, targetSpeed: 150, color: CAR_COLORS[0], kind: 'traffic', driver: true, honk: 0 });
  }
  for (let i = 0; i < 26; i += 1) {
    peds.push({ active: false, x: 0, y: 0, angle: 0, speed: 0, color: PED_COLORS[0], panic: 0, kind: 'ped' });
  }

  function spawnCar(x, y) {
    for (const c of cars) if (!c.active) {
      const p = nearestRoadPoint(x ?? (200 + random() * 2100), y ?? (200 + random() * 1300));
      c.active = true; c.x = p.x; c.y = p.y;
      // Face ALONG the road the point sits on: a car spawned on a
      // horizontal road with a north/south angle drives straight off the
      // road across grass and into buildings (the old random angle did).
      let dv = Infinity; let dh = Infinity;
      for (const rx of ROADS_X) dv = Math.min(dv, Math.abs(p.x - rx));
      for (const ry of ROADS_Y) dh = Math.min(dh, Math.abs(p.y - ry));
      c.angle = dv < dh ? (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (random() < 0.5 ? 0 : Math.PI);
      c.speed = 120 + random() * 70; c.targetSpeed = c.speed;
      c.color = CAR_COLORS[Math.floor(random() * CAR_COLORS.length)];
      c.kind = 'traffic'; c.driver = true;
      return c;
    }
    return null;
  }
  function spawnParked(x, y, color) {
    for (const c of cars) if (!c.active) {
      c.active = true; c.x = x; c.y = y; c.angle = random() < 0.5 ? 0 : Math.PI / 2;
      c.speed = 0; c.targetSpeed = 0; c.color = color || CAR_COLORS[Math.floor(random() * CAR_COLORS.length)];
      c.kind = 'parked'; c.driver = false;
      return c;
    }
    return null;
  }
  function spawnPed(x, y) {
    for (const p of peds) if (!p.active) {
      p.active = true;
      p.x = x ?? (100 + random() * 2300); p.y = y ?? (100 + random() * 1600);
      p.angle = random() * Math.PI * 2; p.speed = 40 + random() * 35;
      p.color = PED_COLORS[Math.floor(random() * PED_COLORS.length)]; p.panic = 0;
      return p;
    }
    return null;
  }

  function reset(playerPos) {
    for (const c of cars) c.active = false;
    for (const p of peds) p.active = false;
    for (let i = 0; i < 10; i += 1) spawnCar();
    // Parked cars the player can steal, parked ON roads (a car half on a
    // building edge reads as a rendering bug).
    spawnParked(1320, 470, '#e63946'); spawnParked(600, 870, '#38bdf8'); spawnParked(1680, 1180, '#f59e0b');
    spawnParked(960, 1300, '#34d399'); spawnParked(2360, 1580, '#f97316');
    for (let i = 0; i < 20; i += 1) spawnPed();
    void playerPos;
  }

  function stepCar(c, dt, playerCar) {
    if (c.kind === 'parked' || c.kind === 'player') return;
    // Drive forward; at an intersection, sometimes turn onto the cross road.
    const atX = ROADS_X.some((rx) => Math.abs(c.x - rx) < 8);
    const atY = ROADS_Y.some((ry) => Math.abs(c.y - ry) < 8);
    if (atX && atY && random() < dt * 0.9) {
      c.angle = [0, Math.PI / 2, Math.PI, -Math.PI / 2][Math.floor(random() * 4)];
    }
    // Slow down if a car is right ahead.
    let ahead = false;
    for (const o of cars) {
      if (!o.active || o === c) continue;
      const dx = o.x - c.x; const dy = o.y - c.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 70 && dx * Math.cos(c.angle) + dy * Math.sin(c.angle) > 0) { ahead = true; break; }
    }
    const want = ahead ? 0 : c.targetSpeed;
    c.speed += Math.max(-260 * dt, Math.min(160 * dt, want - c.speed));
    const nx = c.x + Math.cos(c.angle) * c.speed * dt;
    const ny = c.y + Math.sin(c.angle) * c.speed * dt;
    // A rammed traffic car can be shoved off the road: push it out of
    // buildings instead of leaving it parked on a roof edge.
    const probe = { x: nx, y: ny };
    if (collideBuildings(city, probe, 20)) { c.x = probe.x; c.y = probe.y; c.speed *= 0.5; }
    else { c.x = nx; c.y = ny; }
    if (c.x < 60 || c.x > WORLD.width - 60 || c.y < 60 || c.y > BEACH_Y - 40) {
      c.active = false; spawnCar();
    }
    void playerCar;
  }

  function stepPed(p, dt, carsNear) {
    if (p.panic > 0) {
      p.panic -= dt;
      // Run away from the nearest car.
      let nx = 0; let ny = 0; let bd = Infinity;
      for (const c of carsNear) {
        if (!c.active) continue;
        const d = Math.hypot(c.x - p.x, c.y - p.y);
        if (d < bd) { bd = d; nx = c.x; ny = c.y; }
      }
      if (bd < 220) {
        const d = Math.max(1, bd);
        p.angle = Math.atan2(p.y - ny, p.x - nx);
        p.x += Math.cos(p.angle) * 170 * dt; p.y += Math.sin(p.angle) * 170 * dt;
        collideBuildings(city, p, 10);
        return;
      }
    }
    if (random() < dt * 0.25) p.angle += (random() - 0.5) * 1.6;
    p.x += Math.cos(p.angle) * p.speed * dt;
    p.y += Math.sin(p.angle) * p.speed * dt;
    if (p.x < 40 || p.x > WORLD.width - 40 || p.y < 40 || p.y > WORLD.height - 40) p.angle += Math.PI;
    collideBuildings(city, p, 10);
  }

  function step(dt, carsNear) {
    for (const c of cars) if (c.active) stepCar(c, dt);
    for (const p of peds) if (p.active) stepPed(p, dt, carsNear);
    // Keep the streets populated.
    let n = 0; for (const c of cars) if (c.active && c.kind === 'traffic') n += 1;
    if (n < 8) spawnCar();
    let np = 0; for (const p of peds) if (p.active) np += 1;
    if (np < 16) spawnPed();
  }

  return { cars, peds, reset, spawnCar, spawnParked, spawnPed, step };
}
