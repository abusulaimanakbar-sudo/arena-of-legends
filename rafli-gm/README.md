# RAFLI GM — Aplikasi Game Master

Aplikasi admin terpisah untuk mengatur **semua** hal di game RAFLI PLAYSTATION secara realtime:
ekonomi, harga & pengali, menu kantin, biaya operasional, kedatangan & sifat pelanggan, acara, misi/hadiah, suara,
nama & dialog NPC, serta data progres (uang, level, stasiun, cabang) dan aksi langsung (acara, pelanggan, waktu).

## Cara menyambungkan
1. Di GM: tekan **🔗 Koneksi** → salin **kode ruang**.
2. Di game: tombol **🔗** (pojok kanan atas) → tempel kode yang sama → **Simpan & sambung**.
3. Ubah apa pun di GM → langsung berlaku di game. Indikator "✓ Diterima game" muncul bila sampai.

Sinkronisasi memakai dua jalur: **lokal** (BroadcastChannel; instan bila GM & game satu browser/origin) dan **relay ntfy**
(untuk aplikasi/perangkat terpisah, perlu internet). Semua pengaturan GM disimpan permanen di game, jadi tidak perlu GM tetap menyala.

## Pengembangan
Skema semua pengaturan ada di `shared/config.js` (`DEFAULT_CFG` + `SCHEMA`). Tambah pengaturan baru di sana,
pakai di kode game lewat `CFG.…`, lalu jalankan `tools/sync-shared.sh`. Form di GM dibuat otomatis dari `SCHEMA`.
