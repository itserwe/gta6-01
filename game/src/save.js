// Save / load through localStorage: money, mission progress, health, ammo
// and position. A save never includes the keypair or anything secret.
import { SAVE_KEY } from './config.js';

export function saveGame(state) {
  try {
    const data = {
      money: state.money, missionIndex: state.missionIndex, stepIndex: state.stepIndex,
      health: state.player.health, ammo: state.ammo, x: state.player.x, y: state.player.y,
      carsStolen: state.stats.carsStolen, missionsDone: state.stats.missionsDone, time: state.time,
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch { return false; }
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function hasSave() { return loadSave() !== null; }
export function clearSave() { try { window.localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ } }
