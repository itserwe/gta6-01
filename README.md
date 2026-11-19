# Solmar

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/itserwe/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/itserwe/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solmar adalah game kejahatan dunia terbuka 2D dari atas, dibuat untuk bounty make.fun "Make GTA 6". Pemain menjelajahi sebuah kota pesisir — berjalan kaki atau mengemudi di antara lalu lintas dan pejalan kaki — dan bisa mencuri mobil, memicu kejaran polisi saat tingkat buronan naik dari satu sampai lima bintang, bertarung, serta menyelesaikan cerita lima misi. Ada HUD dan minimap untuk navigasi, layar awal, dan progres tersimpan otomatis di localStorage sehingga permainan bisa dilanjutkan lain kali. Gamenya berjalan offline di desktop Chrome, tanpa perlu server atau koneksi internet.

## Menjalankan

```sh
mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
```

Perintah itu menyalin `game/` dan `screenshots/` ke `out/` dan menulis `out/dossier.json`. Untuk sekadar mencoba gamenya di browser, jalankan `node serve.ts` lalu buka http://localhost:8080.

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
