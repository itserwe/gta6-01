// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, the renderer paints what is there. Screens: title,
// play, paused, game over and won. Progress saves to localStorage when a
// mission is completed; C on the title screen continues a saved game.
//
// ?seed=N fixes the layout. ?shot=start|play|mission|end stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BUSTED, EVENT_MISSION, EVENT_WASTED, EVENT_WON } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_MUTE, ACTION_RESTART_MISSION, ACTION_ENTER, ACTION_ATTACK, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WON } from './render.js';
import { stageShot } from './shots.js';
import { createAudio } from './audio.js';
import { saveGame, loadSave, hasSave } from './save.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; } catch { return 0; }
}
function saveBest(value) {
  try { window.localStorage.setItem(BEST_KEY, String(value)); } catch { /* ignore */ }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let continuePressed = false;
  // One-shot actions taken by handleActions() each frame, handed to the
  // world step so ENTER/ATTACK are not lost (taking them twice eats them).
  let pendingActions = 0;

  function announce(message) { status.textContent = message; }
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyC' && screen === SCREEN_TITLE) continuePressed = true;
  });

  function startGame(fromSave) {
    const save = fromSave ? loadSave() : null;
    world.reset(save || undefined);
    if (save) announce(`Lanjutkan: misi ${world.state.missionIndex + 1}, $${world.state.money}.`);
    else announce('Selamat datang di Solmar. Temui Riko di bengkel.');
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
  }

  function endGame(kind) {
    screen = SCREEN_OVER;
    if (world.state.money > best) { best = world.state.money; saveBest(best); }
    announce(kind === 'busted' ? 'Tertangkap polisi.' : 'Wasted.');
  }

  function handleActions() {
    const actions = input.takeActions();
    // Keep ENTER/ATTACK for the world step; the menu consumes the rest.
    pendingActions |= actions & (ACTION_ENTER | ACTION_ATTACK);
    if (actions & ACTION_MUTE) audio.setMuted(!audio.isMuted());
    if (actions & ACTION_RESTART_MISSION && screen === SCREEN_PLAY) {
      world.restartMission();
      announce('Misi diulang.');
    }
    if (continuePressed) {
      continuePressed = false;
      if (screen === SCREEN_TITLE && hasSave()) startGame(true);
      return;
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      if (screen === SCREEN_WON) { screen = SCREEN_PLAY; return; }
      startGame(false);
    } else if (actions & ACTION_CONFIRM && screen === SCREEN_WON) {
      screen = SCREEN_PLAY;
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED; announce('Jeda.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY; announce('Lanjut.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) return;
    const actions = pendingActions;
    pendingActions = 0;
    const events = world.step(STEP, input, audio, actions);
    if (events & EVENT_MISSION) {
      saveGame(world.state);
      announce(`Misi selesai! Uang $${world.state.money}.`);
    }
    if (events & EVENT_WON) {
      screen = SCREEN_WON;
      saveGame(world.state);
      if (world.state.money > best) { best = world.state.money; saveBest(best); }
      announce('Solmar milikmu! Semua misi selesai.');
    } else if (events & EVENT_WASTED) endGame('wasted');
    else if (events & EVENT_BUSTED) endGame('busted');
    const speedRatio = world.state.playerCar.active
      ? Math.abs(world.state.playerCar.speed) / 560
      : world.state.player.speed / 230;
    audio.update(STEP, Math.min(1, speedRatio), world.state.wanted);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY || screen === SCREEN_WON) {
      while (accumulator >= STEP && (screen === SCREEN_PLAY || screen === SCREEN_WON)) {
        step();
        accumulator -= STEP;
      }
    } else accumulator = 0;
    renderer.draw(world.state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Jeda.'); }
  });

  announce('Solmar. Tekan Spasi atau klik untuk mulai.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
