// Keyboard and pointer input. Held keys steer/drive; one-shot presses
// (enter car, attack, pause, mute) are queued as bit flags and taken once.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_ATTACK = 8;
export const ACTION_MUTE = 16;
export const ACTION_RESTART_MISSION = 32;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const ENTER = new Set(['KeyE']);
const ATTACK = new Set(['KeyF']);
const MUTE = new Set(['KeyM']);
const RESTART = new Set(['KeyR']);

export function createInput(target) {
  const held = new Set();
  let actions = 0;
  function down(event) {
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code)) held.add(event.code);
    else if (CONFIRM.has(event.code)) { if (!event.repeat) actions |= ACTION_CONFIRM; }
    else if (PAUSE.has(event.code)) { if (!event.repeat) actions |= ACTION_PAUSE; }
    else if (ENTER.has(event.code)) { if (!event.repeat) actions |= ACTION_ENTER; }
    else if (ATTACK.has(event.code)) { if (!event.repeat) actions |= ACTION_ATTACK; }
    else if (MUTE.has(event.code)) { if (!event.repeat) actions |= ACTION_MUTE; }
    else if (RESTART.has(event.code)) { if (!event.repeat) actions |= ACTION_RESTART_MISSION; }
    else return;
    event.preventDefault();
  }
  function up(event) { held.delete(event.code); }
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', () => held.clear());
  target.addEventListener('pointerdown', () => { actions |= ACTION_CONFIRM; });
  const has = (set) => [...set].some((c) => held.has(c));
  return {
    up: () => has(UP), down: () => has(DOWN), left: () => has(LEFT), right: () => has(RIGHT),
    // -1/0/1 steering and throttle for driving; on foot the loop reads the four booleans.
    steer() { return (has(RIGHT) ? 1 : 0) - (has(LEFT) ? 1 : 0); },
    throttle() { return (has(UP) ? 1 : 0) - (has(DOWN) ? 1 : 0); },
    takeActions() { const t = actions; actions = 0; return t; },
  };
}
