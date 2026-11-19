// The wanted system and the police response. Crimes raise the level (1-5
// stars); police cars spawn near the player and ram, foot cops chase on
// foot when close. Lay low out of sight and the heat slowly cools off.
// Police cars collide with buildings just like the player's car.
import { WORLD } from './config.js';
import { collideBuildings } from './city.js';

export function createPolice(random) {
  const cops = []; // police cars, pooled
  const footCops = [];
  for (let i = 0; i < 8; i += 1) cops.push({ active: false, x: 0, y: 0, angle: 0, speed: 0, kind: 'police', color: '#1f2937', light: 0 });
  for (let i = 0; i < 6; i += 1) footCops.push({ active: false, x: 0, y: 0, angle: 0, speed: 260, health: 50, kind: 'cop', color: '#1e3a5f' });

  function spawnCopCar(px, py) {
    for (const c of cops) if (!c.active) {
      const a = random() * Math.PI * 2;
      c.active = true;
      c.x = Math.max(80, Math.min(WORLD.width - 80, px + Math.cos(a) * 700));
      c.y = Math.max(80, Math.min(WORLD.height - 80, py + Math.sin(a) * 700));
      c.angle = Math.atan2(py - c.y, px - c.x); c.speed = 200;
      return c;
    }
    return null;
  }
  function spawnFootCop(px, py) {
    for (const c of footCops) if (!c.active) {
      const a = random() * Math.PI * 2;
      c.active = true;
      c.x = px + Math.cos(a) * 260; c.y = py + Math.sin(a) * 260; c.health = 50;
      return c;
    }
    return null;
  }

  function reset() { for (const c of cops) c.active = false; for (const c of footCops) c.active = false; }

  function step(dt, state, playerPos, playerSpeed) {
    const wanted = state.wanted;
    const wantCars = wanted === 0 ? 0 : Math.min(1 + Math.floor(wanted / 2), 4);
    let n = 0; for (const c of cops) if (c.active) n += 1;
    if (n < wantCars && random() < dt * 1.2) spawnCopCar(playerPos.x, playerPos.y);
    if (wanted >= 3) {
      let nf = 0; for (const c of footCops) if (c.active) nf += 1;
      if (nf < wanted - 2 && random() < dt * 0.8) spawnFootCop(playerPos.x, playerPos.y);
    }
    for (const c of cops) {
      if (!c.active) continue;
      if (wanted === 0) { c.active = false; continue; }
      c.light += dt * 6;
      // Steer toward the player, faster at higher wanted levels.
      const wantAngle = Math.atan2(playerPos.y - c.y, playerPos.x - c.x);
      let diff = wantAngle - c.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      c.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
      const target = 300 + wanted * 55 + playerSpeed * 0.35;
      c.speed += Math.max(-500 * dt, Math.min(320 * dt, target - c.speed));
      const nx = c.x + Math.cos(c.angle) * c.speed * dt;
      const ny = c.y + Math.sin(c.angle) * c.speed * dt;
      const probe = { x: nx, y: ny };
      if (state.city && collideBuildings(state.city, probe, 20)) {
        c.speed *= 0.5; c.x = probe.x; c.y = probe.y;
      } else { c.x = nx; c.y = ny; }
      const d = Math.hypot(playerPos.x - c.x, playerPos.y - c.y);
      if (d > 1100) c.active = false;
    }
    for (const c of footCops) {
      if (!c.active) continue;
      if (wanted === 0) { c.active = false; continue; }
      c.angle = Math.atan2(playerPos.y - c.y, playerPos.x - c.x);
      c.x += Math.cos(c.angle) * c.speed * dt;
      c.y += Math.sin(c.angle) * c.speed * dt;
      if (state.city) collideBuildings(state.city, c, 10);
      if (Math.hypot(playerPos.x - c.x, playerPos.y - c.y) > 900) c.active = false;
    }
  }

  return { cops, footCops, reset, step, spawnCopCar, spawnFootCop };
}
