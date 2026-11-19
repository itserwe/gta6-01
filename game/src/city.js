// Solmar's map: a road grid, building blocks, a beach and sea to the south,
// a park in the north-west, a market square and a port in the east. Pure data
// plus the collision helpers the world and traffic use; no drawing here.
import { WORLD } from './config.js';

export const ROAD_W = 110;
// Road centre lines. Every road runs the full city; blocks sit between them.
export const ROADS_X = [240, 600, 960, 1320, 1680, 2040, 2360];
export const ROADS_Y = [220, 560, 900, 1240, 1580];
export const BEACH_Y = 1760; // south of this: sand, then sea

export const DISTRICTS = [
  { name: 'Kota Tua', x: 0, y: 0, w: 900, h: 700 },
  { name: 'Pusat Kota', x: 900, y: 0, w: 900, h: 900 },
  { name: 'Pelabuhan', x: 1800, y: 0, w: 760, h: 900 },
  { name: 'Pantai Solmar', x: 0, y: 1580, w: 2560, h: 340 },
];

export const PLACES = {
  garage: { x: 1320, y: 560, label: 'Bengkel Riko' },
  cafe: { x: 600, y: 1680, label: 'Kafe Pantai' },
  market: { x: 960, y: 900, label: 'Pasar Solmar' },
  hideout: { x: 240, y: 220, label: 'Markas (Taman)' },
  port: { x: 2360, y: 220, label: 'Pelabuhan' },
  hospital: { x: 1680, y: 1240, label: 'Rumah Sakit' },
  policeStation: { x: 2040, y: 900, label: 'Kantor Polisi' },
};

// Buildings are generated once from the road grid: each block gets 1-2 rects
// with a colour and a height (for the roof shading the renderer uses).
export function buildCity(random) {
  const buildings = [];
  const colors = ['#b08968', '#7d8aa0', '#a06a5a', '#8a7d9e', '#6b8a7d', '#9e8a5a'];
  for (let ix = 0; ix < ROADS_X.length - 1; ix += 1) {
    for (let iy = 0; iy < ROADS_Y.length - 1; iy += 1) {
      const x0 = ROADS_X[ix] + ROAD_W / 2 + 14;
      const x1 = ROADS_X[ix + 1] - ROAD_W / 2 - 14;
      const y0 = ROADS_Y[iy] + ROAD_W / 2 + 14;
      const y1 = ROADS_Y[iy + 1] - ROAD_W / 2 - 14;
      if (x1 - x0 < 90 || y1 - y0 < 90) continue;
      // The park block (north-west) stays green; the market block stays open.
      if (ix === 0 && iy === 0) continue;
      if (ix === 1 && iy === 1) continue;
      const n = random() < 0.5 ? 1 : 2;
      for (let b = 0; b < n; b += 1) {
        const bw = (x1 - x0) / n - 18;
        const bh = (y1 - y0) * (0.55 + random() * 0.3);
        buildings.push({
          x: x0 + b * ((x1 - x0) / n) + 8,
          y: y0 + (y1 - y0 - bh) / 2,
          w: bw, h: bh,
          color: colors[Math.floor(random() * colors.length)],
          roof: random() < 0.5,
        });
      }
    }
  }
  // Port containers along the east edge.
  for (let i = 0; i < 8; i += 1) {
    buildings.push({ x: 2220 + (i % 2) * 130, y: 300 + Math.floor(i / 2) * 90, w: 110, h: 60, color: i % 2 ? '#c0563a' : '#3a7d8c', roof: false, container: true });
  }
  return { buildings };
}

export function onRoad(x, y) {
  if (y > BEACH_Y) return false;
  for (const rx of ROADS_X) if (Math.abs(x - rx) < ROAD_W / 2) return true;
  for (const ry of ROADS_Y) if (Math.abs(y - ry) < ROAD_W / 2) return true;
  return false;
}

export function nearestRoadPoint(x, y) {
  let best = null; let bd = Infinity;
  for (const rx of ROADS_X) { const d = Math.abs(x - rx); if (d < bd) { bd = d; best = { x: rx, y }; } }
  for (const ry of ROADS_Y) { const d = Math.abs(y - ry); if (d < bd) { bd = d; best = { x, y: ry }; } }
  return best;
}

// Push a circle out of every building it overlaps; returns true on a hit.
export function collideBuildings(city, p, radius) {
  let hit = false;
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(p.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(p.y, b.y + b.h));
    const dx = p.x - cx; const dy = p.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      hit = true;
      if (d2 > 0.01) {
        const d = Math.sqrt(d2);
        p.x = cx + (dx / d) * radius; p.y = cy + (dy / d) * radius;
      } else { p.y = b.y - radius; }
    }
  }
  return hit;
}

export function clampCity(p, margin = 20) {
  p.x = Math.max(margin, Math.min(WORLD.width - margin, p.x));
  p.y = Math.max(margin, Math.min(WORLD.height - margin, p.y));
}

export function districtAt(x, y) {
  for (const d of DISTRICTS) if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d.name;
  return 'Solmar';
}
