// Combat: a punch up close, and a pistol shot (hitscan) when the player
// has ammo. Targets are thugs, foot cops and, if the player is reckless,
// pedestrians. Returns what happened so the world can react.
export function attack(state, audio) {
  const p = state.player;
  const now = state.time;
  if (now - (state.lastAttack || -9) < 0.35) return null;
  state.lastAttack = now;
  const range = state.ammo > 0 ? 320 : 60;
  const reach = state.ammo > 0 ? 320 : state.player ? 60 : 60;
  void reach;
  let best = null; let bd = Infinity;
  const targets = [];
  for (const t of state.thugs) if (t.active) targets.push(t);
  for (const t of state.police.footCops) if (t.active) targets.push(t);
  for (const t of state.traffic.peds) if (t.active) targets.push(t);
  const ax = Math.cos(p.angle); const ay = Math.sin(p.angle);
  for (const t of targets) {
    const dx = t.x - p.x; const dy = t.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > range || d < 1) continue;
    // Must be roughly in front of the player.
    if ((dx * ax + dy * ay) / d < 0.3) continue;
    if (d < bd) { bd = d; best = t; }
  }
  if (state.ammo > 0) {
    state.ammo -= 1;
    state.tracers.push({ x1: p.x, y1: p.y, x2: p.x + ax * Math.min(bd, 320), y2: p.y + ay * Math.min(bd, 320), life: 0.12 });
    if (audio) audio.shoot();
    if (best) {
      best.health = (best.health ?? 50) - 40;
      best.x += ax * 14; best.y += ay * 14;
      if (best.health <= 0) best.active = false;
      return { hit: true, killed: best.health <= 0, target: best, shot: true };
    }
    return { hit: false, shot: true };
  }
  if (audio) audio.punch();
  if (best && bd < 62) {
    best.health = (best.health ?? 50) - 34;
    best.x += ax * 22; best.y += ay * 22;
    if (best.health <= 0) best.active = false;
    return { hit: true, killed: best.health <= 0, target: best, shot: false };
  }
  return { hit: false, shot: false };
}
