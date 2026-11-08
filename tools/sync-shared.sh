#!/bin/sh
# Salin modul bersama (shared/) ke game dan aplikasi GM. Jalankan setiap kali shared/ diubah.
cd "$(dirname "$0")/.." || exit 1
for d in rafli-playstation rafli-gm; do mkdir -p "$d/js/shared"; cp shared/config.js shared/sync.js "$d/js/shared/"; done
echo "shared disalin ke rafli-playstation dan rafli-gm"
