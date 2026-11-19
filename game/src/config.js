// Every tuning number and colour in one place. Solmar is a 2560x1920 coastal city;
// the camera follows the player, so no rule below depends on the screen size.
export const WORLD = { width: 2560, height: 1920 };
export const FIELD = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const SAVE_KEY = 'solmar.save.v1';
export const BEST_KEY = 'solmar.best';

export const PLAYER = { radius: 14, walkSpeed: 230, health: 100, punchRange: 52, punchDamage: 34 };
export const CAR = { length: 54, width: 26, accel: 420, brake: 620, maxSpeed: 560, maxReverse: 180, turn: 2.6, grip: 0.92 };

export const WANTED_MAX = 5;
export const MISSION_REWARDS = [100, 250, 300, 400, 1000];

export const PALETTE = {
  backdrop: '#0d1420', grass: '#3f7d4a', grassDark: '#356b3f', sand: '#e8d29a', sea: '#1e7fa8',
  seaDark: '#16607f', road: '#333a45', roadEdge: '#4a5568', line: '#e8c33a', sidewalk: '#8a8f98',
  building: '#b08968', building2: '#7d8aa0', building3: '#a06a5a', roof: '#5d4a3a',
  park: '#2f6b35', tree: '#1f4d24', player: '#ffcf3f', playerCar: '#e63946',
  police: '#1f2937', policeLight: '#3b82f6', traffic: '#cbd5e1', ped: '#f1f5f9',
  text: '#f2f5f8', muted: '#aab4c0', panel: 'rgba(12,18,28,0.88)', gold: '#f2c94c',
  red: '#e5534b', blue: '#4aa3ff', green: '#4ade80',
};
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
