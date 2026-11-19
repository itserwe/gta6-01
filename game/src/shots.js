// The screenshot scenes behind ?shot=start|play|mission|end. Each one sets
// up a real game state (a chase, a fight, a bust) and steps the real rules
// forward, so the frame is what play really looks like. Same seed, same frame.
import { STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { PLACES } from './city.js';
import { MISSIONS } from './missions.js';

function fakeInput(steerFn, throttleFn, move = true) {
  return {
    up: () => move, down: () => false, left: () => false, right: () => false,
    steer: steerFn, throttle: throttleFn ?? (() => 1), takeActions: () => 0,
  };
}

export function stageShot(name, world) {
  const s = world.state;
  world.reset();
  if (name === 'mission') {
    s.missionIndex = 2; s.stepIndex = 1;
    s.player.x = PLACES.market.x; s.player.y = PLACES.market.y + 60;
    s.player.onFoot = true; s.money = 850; s.ammo = 12;
    world.startStep(); // spawns Bono, the debtor to beat up
    world.say(MISSIONS[2].intro);
    s.camera.x = s.player.x; s.camera.y = s.player.y;
    // No walking here: with up=true the player strolls north for 30 steps
    // and ends up standing on the "Pasar Solmar" label. The thug still
    // walks toward the player, so the fight reads.
    for (let i = 0; i < 30; i += 1) world.step(STEP, fakeInput(() => 0, undefined, false), null);
    return { screen: SCREEN_PLAY, best: 850 };
  }
  if (name === 'end') {
    s.missionIndex = 3; s.stepIndex = 0;
    s.player.x = 1320; s.player.y = 900; s.player.onFoot = true; s.player.health = 18;
    s.wanted = 4; s.money = 1200;
    world.startStep(); // sets the 35 s survive timer (was showing 0)
    world.say(MISSIONS[3].intro);
    world.state.gameOver = 'busted';
    s.camera.x = s.player.x; s.camera.y = s.player.y;
    for (const cop of s.police.cops) { cop.active = false; }
    const c1 = s.police.spawnCopCar(s.player.x, s.player.y); if (c1) { c1.x = s.player.x - 120; c1.y = s.player.y; c1.angle = 0; }
    const c2 = s.police.spawnCopCar(s.player.x, s.player.y); if (c2) { c2.x = s.player.x + 120; c2.y = s.player.y + 60; c2.angle = Math.PI; }
    s.police.spawnFootCop(s.player.x, s.player.y);
    return { screen: SCREEN_OVER, best: 1200 };
  }
  if (name === 'play') {
    // A police chase: the player speeds down the main road at wanted 2,
    // two patrol cars behind, traffic ahead, minimap and objective live.
    s.missionIndex = 1; s.stepIndex = 1; s.hasPackage = true;
    s.player.onFoot = false; s.playerCar.active = true;
    s.playerCar.x = 960; s.playerCar.y = 900; s.playerCar.angle = 0; s.playerCar.speed = 380; s.playerCar.color = '#e63946';
    s.player.x = 960; s.player.y = 900; s.player.angle = 0;
    s.wanted = 2; s.money = 350; s.ammo = 12;
    s.camera.x = 960; s.camera.y = 900;
    const c1 = s.police.spawnCopCar(960, 900); if (c1) { c1.x = 820; c1.y = 900; c1.angle = 0; c1.speed = 380; }
    const c2 = s.police.spawnCopCar(960, 900); if (c2) { c2.x = 780; c2.y = 860; c2.angle = 0; c2.speed = 360; }
    world.startStep();
    world.say(MISSIONS[1].intro);
    // Waypoint autopilot: follow the roads (east, then south to the beach
    // cafe) instead of cutting diagonally across buildings.
    const route = [
      { x: 1300, y: 900 }, { x: 1680, y: 900 }, { x: 1680, y: 1240 },
      { x: 1680, y: 1580 }, { x: 1320, y: 1580 }, { x: 960, y: 1580 },
      { x: 600, y: 1580 }, { x: 600, y: 1680 },
    ];
    let wp = 0;
    let lastDiff = 0;
    const input = fakeInput(() => {
      const target = route[Math.min(wp, route.length - 1)];
      if (Math.hypot(target.x - s.player.x, target.y - s.player.y) < 70 && wp < route.length - 1) wp += 1;
      const want = Math.atan2(target.y - s.player.y, target.x - s.player.x);
      let diff = want - s.playerCar.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      lastDiff = diff;
      return diff > 0.15 ? 1 : diff < -0.15 ? -1 : 0;
    }, () => (Math.abs(lastDiff) > 0.45 ? 0.35 : 1)); // slow into corners
    // Only 60 steps (1 s): the chase stays on the straight east road.
    // The car starts at speed 380, so even 90 steps put it mid-turn at
    // the corner, swinging wide into the block's building.
    for (let i = 0; i < 60; i += 1) world.step(STEP, input, null);
    s.camera.x = s.player.x; s.camera.y = s.player.y;
    return { screen: SCREEN_PLAY, best: 350 };
  }
  // start: title over a lively street near the garage.
  s.player.x = 1320; s.player.y = 640;
  s.camera.x = s.player.x; s.camera.y = s.player.y;
  for (let i = 0; i < 120; i += 1) world.step(STEP, fakeInput(() => 0), null);
  s.camera.x = s.player.x; s.camera.y = s.player.y;
  return { screen: SCREEN_TITLE, best: 0 };
}
