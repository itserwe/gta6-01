// Drawing only: the city, cars, people, effects, HUD, minimap and panels.
// The camera follows the player across the 2560x1920 city; the 1280x720
// logical view is scaled to fit the window.
import { FIELD, FONT, PALETTE } from './config.js';
import { ROADS_X, ROADS_Y, ROAD_W, BEACH_Y, DISTRICTS } from './city.js';
import { MISSIONS } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WON = 'won';

const MINIMAP = { x: 1064, y: 16, w: 200, h: 150 };

function stars(n) { return '★'.repeat(n) + '☆'.repeat(5 - n); }

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();
  function font(size) {
    if (!fonts.has(size)) fonts.set(size, `bold ${size}px ${FONT}`);
    return fonts.get(size);
  }
  function text(value, x, y, size, color, align = 'left', baseline = 'alphabetic') {
    context.font = font(size); context.fillStyle = color;
    context.textAlign = align; context.textBaseline = baseline;
    context.fillText(value, x, y);
  }
  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    view.x = (canvas.width - FIELD.width * view.scale) / 2;
    view.y = (canvas.height - FIELD.height * view.scale) / 2;
  }

  function drawCity(state, time) {
    const { city } = state;
    // Grass base.
    context.fillStyle = PALETTE.grass;
    context.fillRect(0, 0, 2560, 1920);
    // Park (north-west block).
    context.fillStyle = PALETTE.park;
    context.fillRect(ROADS_X[0] + ROAD_W / 2, ROADS_Y[0] + ROAD_W / 2, ROADS_X[1] - ROADS_X[0] - ROAD_W, ROADS_Y[1] - ROADS_Y[0] - ROAD_W);
    for (let i = 0; i < 12; i += 1) {
      const tx = 330 + (i % 4) * 55; const ty = 330 + Math.floor(i / 4) * 55;
      context.fillStyle = PALETTE.tree;
      context.beginPath(); context.arc(tx, ty, 20, 0, Math.PI * 2); context.fill();
    }
    // Beach + sea.
    context.fillStyle = PALETTE.sand;
    context.fillRect(0, BEACH_Y, 2560, 1920 - BEACH_Y);
    context.fillStyle = PALETTE.sea;
    context.fillRect(0, 1860, 2560, 60);
    context.fillStyle = PALETTE.seaDark;
    for (let x = 0; x < 2560; x += 90) {
      context.fillRect(x + ((time * 30) % 90), 1878, 44, 4);
    }
    // Roads.
    context.fillStyle = PALETTE.road;
    for (const rx of ROADS_X) context.fillRect(rx - ROAD_W / 2, 0, ROAD_W, BEACH_Y);
    for (const ry of ROADS_Y) context.fillRect(0, ry - ROAD_W / 2, 2560, ROAD_W);
    // Centre dashes.
    context.fillStyle = PALETTE.line;
    for (const rx of ROADS_X) for (let y = 0; y < BEACH_Y; y += 56) context.fillRect(rx - 3, y, 6, 28);
    for (const ry of ROADS_Y) for (let x = 0; x < 2560; x += 56) context.fillRect(x, ry - 3, 28, 6);
    // Buildings.
    for (const b of city.buildings) {
      context.fillStyle = '#00000033';
      context.fillRect(b.x + 6, b.y + 8, b.w, b.h);
      context.fillStyle = b.color;
      context.fillRect(b.x, b.y, b.w, b.h);
      if (b.roof) {
        context.fillStyle = PALETTE.roof;
        context.fillRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16);
      } else if (!b.container) {
        context.fillStyle = 'rgba(255,255,255,0.25)';
        for (let wx = b.x + 12; wx < b.x + b.w - 14; wx += 26)
          for (let wy = b.y + 12; wy < b.y + b.h - 14; wy += 26) context.fillRect(wx, wy, 12, 10);
      }
    }
    // District labels.
    for (const d of DISTRICTS) text(d.name, d.x + 16, d.y + 30, 22, 'rgba(255,255,255,0.5)');
  }

  function drawCar(c, time) {
    context.save();
    context.translate(c.x, c.y); context.rotate(c.angle);
    context.fillStyle = '#00000044';
    context.fillRect(-26, -14, 56, 30);
    context.fillStyle = c.color;
    context.beginPath();
    context.roundRect(-27, -13, 54, 26, 8);
    context.fill();
    context.fillStyle = 'rgba(20,30,45,0.85)';
    context.fillRect(-6, -10, 16, 20);
    context.fillStyle = '#f8fafc';
    context.fillRect(20, -11, 4, 5); context.fillRect(20, 6, 4, 5);
    context.fillStyle = '#f59e0b';
    context.fillRect(-27, -11, 3, 5); context.fillRect(-27, 6, 3, 5);
    if (c.kind === 'police') {
      context.fillStyle = '#f8fafc';
      context.fillRect(-27, -13, 54, 8);
      const flash = Math.floor(time * 6) % 2 === 0;
      context.fillStyle = flash ? '#ef4444' : '#3b82f6';
      context.beginPath(); context.arc(-2, 0, 6, 0, Math.PI * 2); context.fill();
      context.fillStyle = flash ? '#3b82f6' : '#ef4444';
      context.beginPath(); context.arc(8, 0, 6, 0, Math.PI * 2); context.fill();
    }
    if (c.kind === 'target') {
      context.strokeStyle = '#f97316'; context.lineWidth = 3;
      context.beginPath(); context.roundRect(-30, -16, 60, 32, 9); context.stroke();
    }
    context.restore();
  }

  function drawPerson(p, color, radius = 11) {
    context.fillStyle = '#00000033';
    context.beginPath(); context.arc(p.x + 2, p.y + 3, radius, 0, Math.PI * 2); context.fill();
    context.fillStyle = color;
    context.beginPath(); context.arc(p.x, p.y, radius, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#f2c9a0';
    context.beginPath(); context.arc(p.x + Math.cos(p.angle) * 4, p.y + Math.sin(p.angle) * 4, 6, 0, Math.PI * 2); context.fill();
  }

  function drawWorld(state, time) {
    // Clamp the camera here too: staged scenes set it directly after
    // stepping, and an unclamped camera shows the void outside the city.
    const camX = Math.max(640, Math.min(2560 - 640, state.camera.x));
    const camY = Math.max(360, Math.min(1920 - 360, state.camera.y));
    const cam = { x: camX, y: camY };
    context.save();
    context.translate(FIELD.width / 2 - cam.x, FIELD.height / 2 - cam.y);
    drawCity(state, time);
    // Mission target marker (pulsing).
    const step = state._step;
    if (step) {
      const pulse = 26 + Math.sin(time * 4) * 6;
      context.strokeStyle = '#f2c94c'; context.lineWidth = 4;
      context.beginPath(); context.arc(step.target.x, step.target.y, pulse, 0, Math.PI * 2); context.stroke();
      context.fillStyle = '#f2c94c';
      context.beginPath(); context.arc(step.target.x, step.target.y, 6, 0, Math.PI * 2); context.fill();
      // Label above the marker, high enough that the player standing on the
      // target never covers it.
      const label = step.target.label || '';
      if (label) {
        context.font = font(18);
        const w = context.measureText(label).width + 16;
        context.fillStyle = 'rgba(10,16,26,0.8)';
        context.fillRect(step.target.x - w / 2, step.target.y - 78, w, 26);
        text(label, step.target.x, step.target.y - 59, 18, '#f2c94c', 'center');
      }
    }
    for (const p of state.pickups) {
      if (!p.active) continue;
      context.fillStyle = PALETTE.gold;
      context.beginPath(); context.arc(p.x, p.y, 12, 0, Math.PI * 2); context.fill();
      text('$', p.x, p.y + 6, 16, '#7c5a00', 'center');
    }
    for (const c of state.traffic.cars) if (c.active) drawCar(c, time);
    for (const c of state.police.cops) if (c.active) drawCar(c, time);
    if (state.playerCar.active) drawCar(state.playerCar, time);
    for (const p of state.traffic.peds) if (p.active) drawPerson(p, p.color, 9);
    for (const t of state.thugs) if (t.active) {
      drawPerson(t, t.color, 13);
      // Health bar + name go ABOVE the thug: the mission marker's pill
      // now sits higher (target.y - 78), so the two no longer collide,
      // and the player fighting from the south can't cover the name.
      context.fillStyle = '#1f2937'; context.fillRect(t.x - 20, t.y - 26, 40, 6);
      context.fillStyle = '#e5534b'; context.fillRect(t.x - 20, t.y - 26, 40 * Math.max(0, t.health / 100), 6);
      text('BONO', t.x, t.y - 32, 13, '#fff', 'center');
    }
    for (const cop of state.police.footCops) if (cop.active) drawPerson(cop, cop.color, 11);
    if (state.player.onFoot) {
      const p = state.player;
      if (p.invuln <= 0 || Math.floor(time * 10) % 2 === 0) {
        drawPerson(p, PALETTE.player, 13);
        context.strokeStyle = '#7c5a00'; context.lineWidth = 3;
        context.beginPath(); context.moveTo(p.x, p.y);
        context.lineTo(p.x + Math.cos(p.angle) * 22, p.y + Math.sin(p.angle) * 22); context.stroke();
      }
    }
    for (const tr of state.tracers) {
      context.strokeStyle = '#fef08a'; context.lineWidth = 3;
      context.beginPath(); context.moveTo(tr.x1, tr.y1); context.lineTo(tr.x2, tr.y2); context.stroke();
    }
    for (const pt of state.particles) {
      if (!pt.active) continue;
      context.fillStyle = pt.color;
      context.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    context.restore();
  }

  function drawMinimap(state) {
    const sx = MINIMAP.w / 2560; const sy = MINIMAP.h / 1920;
    context.fillStyle = 'rgba(10,16,26,0.85)';
    context.fillRect(MINIMAP.x - 4, MINIMAP.y - 4, MINIMAP.w + 8, MINIMAP.h + 8);
    context.fillStyle = '#2f6b35';
    context.fillRect(MINIMAP.x, MINIMAP.y, MINIMAP.w, MINIMAP.h);
    context.fillStyle = '#3a4a5a';
    for (const rx of ROADS_X) context.fillRect(MINIMAP.x + rx * sx - 2, MINIMAP.y, 4, MINIMAP.h);
    for (const ry of ROADS_Y) context.fillRect(MINIMAP.x, MINIMAP.y + ry * sy, MINIMAP.w, 4);
    context.fillStyle = '#1e7fa8';
    context.fillRect(MINIMAP.x, MINIMAP.y + 1760 * sy, MINIMAP.w, MINIMAP.h - 1760 * sy);
    const step = state._step;
    if (step) {
      context.fillStyle = '#f2c94c';
      context.beginPath(); context.arc(MINIMAP.x + step.target.x * sx, MINIMAP.y + step.target.y * sy, 5, 0, Math.PI * 2); context.fill();
    }
    for (const c of state.police.cops) if (c.active) {
      context.fillStyle = '#60a5fa';
      context.fillRect(MINIMAP.x + c.x * sx - 2, MINIMAP.y + c.y * sy - 2, 4, 4);
    }
    context.fillStyle = '#ffcf3f';
    context.beginPath(); context.arc(MINIMAP.x + state.player.x * sx, MINIMAP.y + state.player.y * sy, 5, 0, Math.PI * 2); context.fill();
    context.strokeStyle = '#fff'; context.lineWidth = 1.5;
    context.beginPath(); context.arc(MINIMAP.x + state.player.x * sx, MINIMAP.y + state.player.y * sy, 5, 0, Math.PI * 2); context.stroke();
    text('SOLMAR', MINIMAP.x, MINIMAP.y + MINIMAP.h + 16, 12, PALETTE.muted);
  }

  function drawHud(state) {
    context.fillStyle = 'rgba(10,16,26,0.72)';
    context.fillRect(12, 12, 250, 92);
    text(`$${state.money}`, 24, 40, 28, PALETTE.gold);
    text(`Ammo ${state.ammo}   •   Mobil dicuri ${state.stats.carsStolen}`, 24, 62, 14, PALETTE.muted);
    // Health bar.
    context.fillStyle = '#1f2937'; context.fillRect(24, 72, 180, 12);
    context.fillStyle = state.player.health > 40 ? PALETTE.green : PALETTE.red;
    context.fillRect(24, 72, 180 * Math.max(0, state.player.health / 100), 12);
    text(`${Math.round(state.player.health)}`, 212, 84, 13, PALETTE.text);
    // Wanted stars.
    text(stars(state.wanted), 24, 138, 30, state.wanted > 0 ? '#f87171' : '#64748b');
    if (state.wanted > 0) text('WANTED', 24, 162, 14, '#f87171');
    // Mission objective.
    const step = state._step;
    if (step) {
      const label = `${state.missionIndex + 1}/5  ${step.label}`;
      context.fillStyle = 'rgba(10,16,26,0.72)';
      const w = Math.min(640, 40 + label.length * 8.5);
      context.fillRect((FIELD.width - w) / 2, 12, w, 52);
      text(label, FIELD.width / 2, 34, 17, '#fff', 'center');
      if (step.timer) text(`Sisa waktu: ${Math.max(0, Math.ceil(state.stepTimer))} dtk`, FIELD.width / 2, 56, 14, '#fbbf24', 'center');
      else text(MISSIONS[state.missionIndex]?.title ?? '', FIELD.width / 2, 56, 14, PALETTE.muted, 'center');
    }
    drawMinimap(state);
    // Toast message.
    if (state.messageTimer > 0) {
      text(state.message, FIELD.width / 2, FIELD.height - 84, 20, '#fff', 'center');
    }
    const hint = state.player.onFoot
      ? 'WASD jalan  •  E curi / masuk mobil  •  F serang  •  P jeda  •  M suara'
      : 'W gas  •  S rem/mundur  •  A/D belok  •  E keluar mobil  •  P jeda';
    text(hint, FIELD.width / 2, FIELD.height - 18, 15, 'rgba(255,255,255,0.75)', 'center');
    if (state.hasPackage) text('📦 Paket dibawa', FIELD.width - 220, FIELD.height - 48, 16, PALETTE.gold, 'right');
  }

  function drawPanel(title, lines, prompt) {
    const w = 680; const h = 150 + lines.length * 32;
    const x = (FIELD.width - w) / 2; const y = (FIELD.height - h) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, w, h);
    context.strokeStyle = '#f2c94c'; context.lineWidth = 3; context.strokeRect(x, y, w, h);
    text(title, FIELD.width / 2, y + 62, 44, PALETTE.text, 'center');
    lines.forEach((line, i) => text(line, FIELD.width / 2, y + 112 + i * 32, 19, PALETTE.muted, 'center'));
    text(prompt, FIELD.width / 2, y + h - 28, 20, PALETTE.gold, 'center');
  }

  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    // Expose the current mission step to the painters.
    state._step = state.missionIndex < MISSIONS.length
      ? MISSIONS[state.missionIndex].steps[state.stepIndex] ?? null : null;
    drawWorld(state, state.time);
    if (screen === SCREEN_TITLE) {
      drawPanel('SOLMAR', [
        'Kota pantai. Lima misi. Satu nama yang ditakuti.',
        'Jalan kaki, curi mobil, kabur dari polisi, selesaikan cerita Riko.',
        `Rekor: $${best}   •   Misi selesai: ${state.stats.missionsDone}/5`,
      ], 'Tekan Spasi / klik untuk mulai  •  Lanjutkan: tekan C di layar judul');
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) drawPanel('Jeda', ['Kota menunggu. Polisi juga.', 'Progres tersimpan otomatis saat misi selesai.'], 'Tekan P untuk lanjut');
    else if (screen === SCREEN_OVER) {
      const busted = state.gameOver === 'busted';
      drawPanel(busted ? 'TERTANGKAP!' : 'WASTED', [
        busted ? 'Polisi Solmar menangkapmu. Riko sedang mengurus jaminan…' : 'Kau tumbang di jalanan Solmar.',
        `Uang: $${state.money}   •   Misi selesai: ${state.stats.missionsDone}/5`,
      ], 'Tekan Spasi untuk coba lagi');
    } else if (screen === SCREEN_WON) {
      drawPanel('SOLMAR MILIKMU!', [
        'Heist pelabuhan berhasil. Riko tersenyum, polisi kebingungan.',
        `Uang akhir: $${state.money}   •   Mobil dicuri: ${state.stats.carsStolen}`,
      ], 'Tekan Spasi untuk terus main bebas');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
