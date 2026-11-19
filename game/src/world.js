// The game's rules and state: the player on foot and in a car, stealing,
// wanted heat, missions, health, money and the win/lose ends. No drawing
// and no DOM here except through the audio object handed in.
import { WORLD, CAR, PLAYER, STEP } from './config.js';
import { buildCity, collideBuildings, clampCity, PLACES } from './city.js';
import { createTraffic } from './traffic.js';
import { createPolice } from './police.js';
import { MISSIONS, missionReward } from './missions.js';
import { attack } from './combat.js';
import { createRandom } from './random.js';

export const EVENT_MISSION = 1;
export const EVENT_WASTED = 2;
export const EVENT_BUSTED = 4;
export const EVENT_WON = 8;
export const EVENT_CRIME = 16;
export const EVENT_PICKUP = 32;

function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

export function createWorld(random) {
  const city = buildCity(random);
  const traffic = createTraffic(random, city);
  const police = createPolice(random);
  const thugs = [];
  for (let i = 0; i < 4; i += 1) thugs.push({ active: false, x: 0, y: 0, angle: 0, speed: 150, health: 100, color: '#7c2d12', kind: 'thug' });
  const pickups = [];
  for (let i = 0; i < 8; i += 1) pickups.push({ active: false, x: 0, y: 0, amount: 0 });
  const particles = [];
  for (let i = 0; i < 60; i += 1) particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, color: '#fff', size: 3 });

  const playerCar = { active: false, x: 0, y: 0, angle: 0, speed: 0, color: '#e63946', kind: 'player' };
  const player = { x: 1320, y: 640, angle: -Math.PI / 2, speed: 0, health: 100, onFoot: true, invuln: 0 };

  const state = {
    time: 0, city, traffic, police, thugs, pickups, particles, tracers: [],
    player, playerCar, wanted: 0, heatTimer: 0, lastCrime: -99, bustedTimer: 0,
    money: 50, ammo: 0, hasPackage: false, missionIndex: 0, stepIndex: 0, stepTimer: 0,
    message: '', messageTimer: 0, gameOver: null, won: false, targetCar: null,
    stats: { carsStolen: 0, missionsDone: 0, pedsHit: 0 },
    camera: { x: player.x, y: player.y },
  };

  function say(text, seconds = 3.5) { state.message = text; state.messageTimer = seconds; }
  function addWanted(n, audio) {
    state.wanted = Math.min(5, state.wanted + n);
    state.lastCrime = state.time; state.heatTimer = 0;
    if (audio) audio.sirenBurst();
  }
  function burst(x, y, color, n = 10) {
    let made = 0;
    for (const p of particles) {
      if (made >= n) break;
      if (p.active) continue;
      p.active = true; p.x = x; p.y = y;
      const a = random() * Math.PI * 2; const s = 60 + random() * 160;
      p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s; p.life = 0.4 + random() * 0.4;
      p.color = color; p.size = 2 + random() * 4; made += 1;
    }
  }
  function spawnPickup(x, y, amount) {
    for (const p of pickups) if (!p.active) { p.active = true; p.x = x; p.y = y; p.amount = amount; return; }
  }
  function spawnThug(x, y, health = 100) {
    for (const t of thugs) if (!t.active) { t.active = true; t.x = x; t.y = y; t.health = health; t.speed = 140; return t; }
    return null;
  }

  function currentStep() {
    const m = MISSIONS[state.missionIndex];
    return m ? m.steps[state.stepIndex] ?? null : null;
  }
  function startStep() {
    const step = currentStep();
    if (!step) return;
    state.stepTimer = step.timer ?? 0;
    if (step.type === 'beat') spawnThug(step.target.x + 30, step.target.y + 20, 100);
    if (step.type === 'survive' && step.wanted) { state.wanted = Math.max(state.wanted, step.wanted); state.lastCrime = state.time; }
    if (step.type === 'steal') {
      const c = traffic.spawnParked(step.target.x, step.target.y, '#f97316');
      if (c) { c.kind = 'target'; state.targetCar = c; }
    }
    if (step.type === 'pickup' && state.missionIndex === 1) state.hasPackage = false;
  }

  function completeStep(audio) {
    const step = currentStep();
    if (!step) return 0;
    let events = 0;
    if (step.type === 'pickup' && state.missionIndex === 1) state.hasPackage = true;
    if (step.type === 'beat') spawnPickup(step.target.x, step.target.y, 300);
    state.stepIndex += 1;
    const m = MISSIONS[state.missionIndex];
    if (state.stepIndex >= m.steps.length) {
      const reward = missionReward(state.missionIndex);
      state.money += reward; state.stats.missionsDone += 1;
      state.missionIndex += 1; state.stepIndex = 0;
      if (state.missionIndex === 2) { state.ammo += 12; say('Riko memberimu pistol + 12 peluru. Tekan F untuk menembak.'); }
      else say(`Misi selesai! +$${reward}`);
      if (audio) audio.mission();
      events |= EVENT_MISSION;
      if (state.missionIndex >= MISSIONS.length) {
        state.won = true; state.gameOver = 'won';
        events |= EVENT_WON;
      }
    }
    startStep();
    return events;
  }

  function reset(saveData) {
    player.x = 1320; player.y = 640; player.angle = -Math.PI / 2; player.speed = 0;
    player.health = 100; player.onFoot = true; player.invuln = 0;
    playerCar.active = false; playerCar.speed = 0;
    state.time = 0; state.wanted = 0; state.heatTimer = 0; state.bustedTimer = 0;
    state.money = 50; state.ammo = 0; state.hasPackage = false;
    state.missionIndex = 0; state.stepIndex = 0; state.gameOver = null; state.won = false;
    state.targetCar = null; state.tracers = [];
    state.stats = { carsStolen: 0, missionsDone: 0, pedsHit: 0 };
    for (const t of thugs) t.active = false;
    for (const p of pickups) p.active = false;
    for (const p of particles) p.active = false;
    traffic.reset(); police.reset();
    if (saveData) {
      state.money = saveData.money ?? 50; state.missionIndex = saveData.missionIndex ?? 0;
      state.stepIndex = saveData.stepIndex ?? 0; player.health = saveData.health ?? 100;
      state.ammo = saveData.ammo ?? 0; player.x = saveData.x ?? player.x; player.y = saveData.y ?? player.y;
      state.stats.carsStolen = saveData.carsStolen ?? 0; state.stats.missionsDone = saveData.missionsDone ?? 0;
    }
    state.camera.x = player.x; state.camera.y = player.y;
    say(MISSIONS[state.missionIndex] ? MISSIONS[state.missionIndex].intro : 'Solmar bebas. Jelajahi kotanya.');
    startStep();
  }

  function nearestStealable() {
    let best = null; let bd = 95;
    const all = [...traffic.cars, ...police.cops];
    for (const c of all) {
      if (!c.active || c.kind === 'player') continue;
      const d = dist(player.x, player.y, c.x, c.y);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  function enterCar(car, audio) {
    playerCar.active = true; playerCar.x = car.x; playerCar.y = car.y;
    playerCar.angle = car.angle; playerCar.speed = 0; playerCar.color = car.color;
    player.onFoot = false;
    if (car.kind === 'traffic' && car.driver) {
      traffic.spawnPed(car.x + 30, car.y + 30);
      addWanted(1, audio); say('Kau mencuri mobil! Polisi mengejarmu.');
    } else if (car.kind === 'target') {
      say('Mobil sport didapat! Bawa ke markas!');
    } else {
      say('Mobil diambil.');
    }
    state.stats.carsStolen += 1;
    car.active = false;
    if (audio) audio.steal();
  }

  function exitCar(audio) {
    const c = traffic.spawnParked(player.x - Math.cos(player.angle) * 40, player.y - Math.sin(player.angle) * 40, playerCar.color);
    if (c) c.kind = 'parked';
    playerCar.active = false; playerCar.speed = 0;
    player.onFoot = true;
    player.x += Math.cos(player.angle + Math.PI / 2) * 36;
    player.y += Math.sin(player.angle + Math.PI / 2) * 36;
    void audio;
  }

  function stepFoot(dt, input) {
    let mx = (input.right() ? 1 : 0) - (input.left() ? 1 : 0);
    let my = (input.down() ? 1 : 0) - (input.up() ? 1 : 0);
    if (mx || my) {
      const len = Math.hypot(mx, my); mx /= len; my /= len;
      player.angle = Math.atan2(my, mx);
      player.x += mx * PLAYER.walkSpeed * dt;
      player.y += my * PLAYER.walkSpeed * dt;
      player.speed = PLAYER.walkSpeed;
    } else player.speed = 0;
    collideBuildings(city, player, PLAYER.radius);
    clampCity(player);
  }

  function stepCar(dt, input, audio) {
    const c = playerCar;
    const steer = input.steer();
    const throttle = input.throttle();
    // Throttle is a magnitude (1 on keys, less from the shot autopilot
    // when it turns), so the car slows into corners instead of swinging
    // wide off the road into buildings.
    if (throttle > 0) c.speed += CAR.accel * Math.min(1, throttle) * dt;
    else if (throttle < 0) c.speed -= (c.speed > 5 ? CAR.brake : CAR.accel * 0.6) * dt;
    else c.speed -= Math.sign(c.speed) * Math.min(Math.abs(c.speed), 240 * dt);
    if (Math.abs(steer) > 0.5 && Math.abs(c.speed) > 240) c.speed -= Math.sign(c.speed) * 200 * dt;
    c.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, c.speed));
    if (Math.abs(c.speed) > 5) c.angle += steer * CAR.turn * dt * Math.sign(c.speed) * Math.min(1, Math.abs(c.speed) / 200 + 0.35);
    const nx = c.x + Math.cos(c.angle) * c.speed * dt;
    const ny = c.y + Math.sin(c.angle) * c.speed * dt;
    const probe = { x: nx, y: ny };
    if (collideBuildings(city, probe, 20)) {
      if (Math.abs(c.speed) > 220 && audio) audio.crash();
      c.speed *= -0.25; burst(c.x, c.y, '#fbbf24', 8);
    } else { c.x = nx; c.y = ny; }
    clampCity(c, 26);
    player.x = c.x; player.y = c.y; player.angle = c.angle; player.speed = Math.abs(c.speed);
    // Ram traffic cars. One shove per car per half second: without the
    // cooldown the overlap lasts many steps and each one shoves 30 px,
    // launching the car hundreds of px off the road into a building.
    for (const o of traffic.cars) {
      if (!o.active || o.kind === 'parked' || o.kind === 'target') continue;
      if (dist(c.x, c.y, o.x, o.y) < 46 && Math.abs(c.speed) > 60 && (!o.ramAt || state.time - o.ramAt > 0.5)) {
        o.ramAt = state.time;
        o.x += Math.cos(c.angle) * 12; o.y += Math.sin(c.angle) * 12;
        o.speed = Math.max(o.speed, 140);
        c.speed *= 0.85;
        if (audio) audio.crash();
        burst(o.x, o.y, '#fbbf24', 6);
      }
    }
    // Hit a pedestrian.
    for (const p of traffic.peds) {
      if (!p.active) continue;
      if (dist(c.x, c.y, p.x, p.y) < 32 && Math.abs(c.speed) > 80) {
        p.active = false; state.stats.pedsHit += 1;
        burst(p.x, p.y, '#e5534b', 12);
        addWanted(1, audio); say('Kau menabrak pejalan kaki! Wanted naik.');
        if (audio) audio.crash();
      }
    }
  }

  function step(dt, input, audio, actionsArg) {
    let events = 0;
    if (state.gameOver === 'busted' || state.gameOver === 'wasted') return events;
    state.time += dt;
    if (state.messageTimer > 0) state.messageTimer -= dt;
    if (player.invuln > 0) player.invuln -= dt;
    for (const t of state.tracers) t.life -= dt;
    state.tracers = state.tracers.filter((t) => t.life > 0);
    for (const p of particles) {
      if (!p.active) continue;
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.life <= 0) p.active = false;
    }

    // NOTE: the caller (main.js) takes the one-shot actions once per frame
    // and hands them in here, so E/F are never eaten by the menu handler.
    const actions = actionsArg !== undefined ? actionsArg : input.takeActions();
    if (actions & 4) { // ACTION_ENTER
      if (player.onFoot) {
        const car = nearestStealable();
        if (car) {
          const wasTarget = car.kind === 'target';
          enterCar(car, audio);
          const step = currentStep();
          if (wasTarget && step && step.type === 'steal') events |= completeStep(audio);
        } else say('Tidak ada mobil di dekatmu. Cari mobil parkir.');
      } else exitCar(audio);
    }
    if (actions & 8) { // ACTION_ATTACK
      if (player.onFoot) {
        const res = attack(state, audio);
        if (res && res.hit && res.target && res.target.kind === 'thug' && res.target.health <= 0) {
          say('Bono menyerah! Ambil uangnya.');
        }
        if (res && res.shot && state.wanted < 2) addWanted(1, audio);
      }
    }

    if (player.onFoot) stepFoot(dt, input); else stepCar(dt, input, audio);

    // Traffic + pedestrians, police.
    const allCars = [...traffic.cars, ...(playerCar.active ? [playerCar] : []), ...police.cops];
    traffic.step(dt, allCars);
    police.step(dt, state, player, player.speed);

    // Thugs chase and punch the player.
    for (const t of thugs) {
      if (!t.active) continue;
      t.angle = Math.atan2(player.y - t.y, player.x - t.x);
      const d = dist(t.x, t.y, player.x, player.y);
      if (d > 44) { t.x += Math.cos(t.angle) * t.speed * dt; t.y += Math.sin(t.angle) * t.speed * dt; }
      else if (player.invuln <= 0 && player.onFoot) {
        player.health -= 12; player.invuln = 0.7;
        burst(player.x, player.y, '#e5534b', 6);
        if (audio) audio.punch();
      }
    }
    // Foot cops grab the player.
    for (const cop of police.footCops) {
      if (!cop.active) continue;
      if (dist(cop.x, cop.y, player.x, player.y) < 34 && player.onFoot && player.invuln <= 0) {
        player.health -= 10; player.invuln = 0.8;
        state.bustedTimer += dt;
        if (audio) audio.punch();
      }
    }
    // Police cars ram the player.
    for (const cop of police.cops) {
      if (!cop.active) continue;
      if (dist(cop.x, cop.y, player.x, player.y) < 44) {
        if (player.onFoot) {
          if (player.invuln <= 0) { player.health -= 14; player.invuln = 0.8; burst(player.x, player.y, '#e5534b', 8); }
          state.bustedTimer += dt * 0.6;
        } else if (Math.abs(playerCar.speed) < 60) {
          state.bustedTimer += dt;
        } else {
          playerCar.speed *= 0.92;
          if (audio && Math.abs(cop.speed) > 200) audio.crash();
        }
      }
    }
    if (state.bustedTimer > 0 && !police.cops.some((c) => c.active && dist(c.x, c.y, player.x, player.y) < 60)) {
      state.bustedTimer = Math.max(0, state.bustedTimer - dt * 0.5);
    }
    if (state.bustedTimer > 2.2 && state.wanted > 0) {
      state.gameOver = 'busted'; events |= EVENT_BUSTED;
    }

    // Wanted cools off when no crime for a while and no cop is near.
    if (state.wanted > 0 && state.time - state.lastCrime > 18) {
      const nearCop = police.cops.some((c) => c.active && dist(c.x, c.y, player.x, player.y) < 320);
      if (!nearCop) {
        state.heatTimer += dt;
        if (state.heatTimer > 6) { state.wanted -= 1; state.heatTimer = 0; say('Polisi kehilangan jejakmu. Wanted turun.'); }
      }
    }
    // Slow health regen when safe; hospital heals fast.
    if (state.wanted === 0 && player.health < 100) player.health = Math.min(100, player.health + 2 * dt);
    if (dist(player.x, player.y, PLACES.hospital.x, PLACES.hospital.y) < 90) player.health = Math.min(100, player.health + 12 * dt);

    // Cash pickups.
    for (const p of pickups) {
      if (!p.active) continue;
      if (dist(player.x, player.y, p.x, p.y) < 40) {
        p.active = false; state.money += p.amount;
        say(`+$${p.amount}`); events |= EVENT_PICKUP;
        if (audio) audio.pickup();
        const step = currentStep();
        if (step && step.type === 'pickup' && state.missionIndex === 2) events |= completeStep(audio);
      }
    }

    // Mission progress.
    const step = currentStep();
    if (step) {
      const d = dist(player.x, player.y, step.target.x, step.target.y);
      if (step.timer) {
        state.stepTimer -= dt;
        if (state.stepTimer <= 0) {
          if (step.type === 'survive') events |= completeStep(audio);
          else { say('Waktu habis! Misi diulang. Tekan R.'); if (audio) audio.fail(); state.stepTimer = step.timer; }
        }
      }
      if (step.type === 'goto' && d < step.radius) events |= completeStep(audio);
      else if (step.type === 'pickup' && d < step.radius && state.missionIndex !== 2) events |= completeStep(audio);
      else if (step.type === 'pickup' && state.missionIndex === 1 && d < step.radius) events |= completeStep(audio);
      else if (step.type === 'deliver' && d < step.radius) {
        if (state.missionIndex === 1 && !state.hasPackage) say('Ambil paketnya dulu di bengkel!');
        else if (state.missionIndex === 4 && player.onFoot) say('Bawa mobilnya, jangan jalan kaki!');
        else events |= completeStep(audio);
      }
      else if (step.type === 'beat' && d < step.radius && !thugs.some((t) => t.active)) {
        // Thug already beaten (or never spawned) — advance only after the fight.
        if (state.stepIndex === 1 && state.missionIndex === 2) { /* wait for pickup */ }
      }
      else if (step.type === 'survive' && d < step.radius) events |= completeStep(audio);
    }
    // Beat step completes when its thug is down.
    if (step && step.type === 'beat' && !thugs.some((t) => t.active) && state.stepIndex === 1 && state.missionIndex === 2) {
      // Thug is down: drop his cash and advance to the pickup step.
      spawnPickup(step.target.x, step.target.y, 300);
      state.stepIndex += 1; startStep();
      say('Bono menyerah! Ambil uangnya di tempat itu.');
    }

    if (player.health <= 0) {
      player.health = 0; state.gameOver = 'wasted'; events |= EVENT_WASTED;
      if (audio) audio.fail();
    }
    // Camera follows the player smoothly, clamped so it never shows the
    // void outside the city (that reads as a dead band on screenshots).
    state.camera.x += (player.x - state.camera.x) * Math.min(1, dt * 5);
    state.camera.y += (player.y - state.camera.y) * Math.min(1, dt * 5);
    state.camera.x = Math.max(640, Math.min(WORLD.width - 640, state.camera.x));
    state.camera.y = Math.max(360, Math.min(WORLD.height - 360, state.camera.y));
    return events;
  }

  function restartMission() {
    const money = state.money;
    const mi = state.missionIndex;
    reset();
    state.money = money; state.missionIndex = mi; state.stepIndex = 0;
    state.wanted = 0; state.hasPackage = false;
    player.x = PLACES.garage.x; player.y = PLACES.garage.y + 80;
    state.camera.x = player.x; state.camera.y = player.y;
    say(MISSIONS[mi].intro);
    startStep();
  }

  reset();
  return { state, reset, step, currentStep, say, spawnThug, spawnPickup, addWanted, completeStep, startStep, restartMission };
}
export { createRandom };
