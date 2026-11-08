// Nama, sifat, dan dialog NPC. Isi default berasal dari konfigurasi bersama dan bisa diganti GM (diubah di tempat).
import { DEFAULT_CFG } from './shared/config.js';
export const NAMES = [...DEFAULT_CFG.text.names];
export const LINES = Object.fromEntries(Object.entries(DEFAULT_CFG.text.lines).map(([k, v]) => [k, [...v]]));
export const pick = (a) => (a && a.length ? a[Math.floor(Math.random() * a.length)] : '');
export function newTrait() {
  const t = { nakal: Math.random() < 0.22 ? 0.6 + Math.random() * 0.4 : Math.random() * 0.3, baik: Math.random() < 0.28 ? 0.6 + Math.random() * 0.4 : Math.random() * 0.4, emosi: Math.random() < 0.25 ? 0.6 + Math.random() * 0.4 : Math.random() * 0.4, rame: Math.random() < 0.4 ? 0.6 + Math.random() * 0.4 : Math.random() * 0.3, lapar: Math.random() };
  t.label = t.nakal > 0.6 ? '😈 Nakal' : t.emosi > 0.6 ? '😤 Emosian' : t.baik > 0.6 ? '😇 Baik hati' : t.rame > 0.6 ? '🗣 Ramai' : '🙂 Santai'; return t;
}
