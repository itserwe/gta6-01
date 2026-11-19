// The story: five missions across Solmar, from Riko's garage to the port
// heist. Each mission is a list of steps; a step completes by reaching a
// place, picking something up, beating someone, or surviving a timer.
import { PLACES } from './city.js';
import { MISSION_REWARDS } from './config.js';

export const MISSIONS = [
  {
    title: 'Misi 1 — Pesan Pertama',
    intro: 'Riko: "Kau baru di Solmar. Datang ke bengkelku, ada kerjaan."',
    steps: [
      { type: 'goto', label: 'Temui Riko di bengkel', target: PLACES.garage, radius: 70 },
      { type: 'goto', label: 'Beli kopi untuk Riko di Kafe Pantai', target: PLACES.cafe, radius: 70 },
      { type: 'goto', label: 'Kembali ke bengkel Riko', target: PLACES.garage, radius: 70 },
    ],
  },
  {
    title: 'Misi 2 — Antar Paket',
    intro: 'Riko: "Antar paket ini ke Kafe Pantai. Jangan sampai telat — dan jangan ditanya isinya."',
    steps: [
      { type: 'pickup', label: 'Ambil paket di bengkel', target: PLACES.garage, radius: 70 },
      { type: 'deliver', label: 'Antar paket ke Kafe Pantai (90 detik)', target: PLACES.cafe, radius: 70, timer: 90 },
    ],
  },
  {
    title: 'Misi 3 — Tagih Utang',
    intro: 'Riko: "Si Bono di pasar berutang padaku. Tagih. Kalau melawan, kau tahu caranya."',
    steps: [
      { type: 'goto', label: 'Cari Bono di Pasar Solmar', target: PLACES.market, radius: 90 },
      { type: 'beat', label: 'Hajar Bono sampai dia bayar (tekan F)', target: PLACES.market, radius: 130 },
      { type: 'pickup', label: 'Ambil uangnya', target: PLACES.market, radius: 70 },
    ],
  },
  {
    title: 'Misi 4 — Kabur dari Polisi',
    intro: 'Polisi mengendus paket itu. Kabur! Bertahan 35 detik atau sampai ke markas di taman.',
    steps: [
      { type: 'survive', label: 'Kabur dari polisi — bertahan 35 detik!', target: PLACES.hideout, radius: 90, timer: 35, wanted: 3 },
    ],
  },
  {
    title: 'Misi 5 — Heist Pelabuhan',
    intro: 'Riko: "Satu kerjaan besar. Curi mobil sport oranye di pelabuhan, bawa ke markas. Setelah ini, Solmar milik kita."',
    steps: [
      { type: 'goto', label: 'Menyusup ke Pelabuhan', target: PLACES.port, radius: 110 },
      { type: 'steal', label: 'Curi mobil sport oranye (tekan E di dekatnya)', target: PLACES.port, radius: 90 },
      { type: 'deliver', label: 'Bawa mobil itu ke markas di taman', target: PLACES.hideout, radius: 90 },
    ],
  },
];

export function missionTitle(index) {
  return index < MISSIONS.length ? MISSIONS[index].title : 'Solmar Bebas';
}
export function missionReward(index) { return MISSION_REWARDS[index] ?? 0; }
export function currentStep(missionIndex, stepIndex) {
  const m = MISSIONS[missionIndex];
  return m ? m.steps[stepIndex] ?? null : null;
}
