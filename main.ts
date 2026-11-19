// Solmar — entri make.fun "Make GTA 6" (gta6-01).
//
// Solmar adalah game kejahatan dunia terbuka 2D dari atas (top-down): sebuah
// kota pesisir yang bisa dijelajahi dengan berjalan kaki atau mengemudi,
// lengkap dengan lalu lintas, pejalan kaki, pencurian mobil, tingkat buronan
// bintang 1-5 beserta polisi yang mengejar, cerita lima misi, pertempuran,
// HUD dan minimap, layar awal, serta simpanan progres di localStorage.
//
// File ini adalah entrypoint-nya (Node 22, hanya pustaka standar). Tugasnya
// sederhana: menyerahkan game dan tangkapan layarnya. Ia menyalin folder
// game/ dan screenshots/ yang ada di sebelah file ini ke direktori keluaran,
// lalu menulis dossier.json di sana — ringkasan yang dibaca juri — dengan
// bantuan pustaka make.fun yang sudah di-vendor di vendor/makefun-game.ts.
//
// Di luar wadah penilai, MAKEFUN_OUTPUT_DIR menggantikan /output:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Folder tempat file ini berada: game/ dan screenshots/ tinggal di sini.
const rootDir = fileURLToPath(new URL('.', import.meta.url));

// Tujuan penyerahan; penilai memakai /output, di mesin sendiri bisa diarah-
// kan ke tempat lain lewat MAKEFUN_OUTPUT_DIR.
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Menyalin satu pohon folder secara utuh, termasuk subfoldernya.
function copyTree(from: string, to: string): void {
  cpSync(from, to, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
copyTree(join(rootDir, 'game'), join(outputDir, 'game'));

const shotsOut = join(outputDir, 'screenshots');
mkdirSync(shotsOut, { recursive: true });
const shotsIn = join(rootDir, 'screenshots');
if (existsSync(shotsIn)) copyTree(shotsIn, shotsOut);

// Batas-batas penilai sendiri (reference/gate.json): hanya text_max_bytes
// yang membentuk isi dossier; sisanya menolak entri yang memang akan ditolak
// penilai — lebih dari 4 tangkapan layar atau satu berkas di atas 256 KiB;
// lebih dari 993 berkas di game/ atau total 48 MiB; atau satu path di bawah
// game/ yang lebih panjang dari 1000 byte.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

writeFileSync(join(outputDir, 'dossier.json'), dossier);
