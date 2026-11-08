import * as THREE from 'three';
import { GameAudio } from './audio.js';
import { std, canvasTex, emojiSprite, textSprite, dialogSprite, makeConsole, makeSofa, makeChair, makeFood, makePerson, attachController, detachController, poseWalk, poseStand, poseSitPlay, poseCheer, poseType, applyGesture } from './models.js';
import { buildWorld, BAYS } from './world.js';
import { NAMES, LINES, pick, newTrait } from './dialog.js';

const $ = (id) => document.getElementById(id);
const SAVE = 'rafli-ps-save-v3';
const audio = new GameAudio();
const TS = Math.max(1, Math.min(12, +(new URLSearchParams(location.search).get('speed') || 1)));

// ================= DATA & EKONOMI =================
const CONSOLES = [
  { name: 'PS3 Slim', mult: 1, cost: 0 }, { name: 'PS4', mult: 1.8, cost: 60000 }, { name: 'PS4 Pro', mult: 2.8, cost: 220000 },
  { name: 'PS5', mult: 4.6, cost: 800000 }, { name: 'PS5 Pro', mult: 7.5, cost: 2800000 },
];
const TVS = [
  { name: 'TV 32"', mult: 1, cost: 0, s: 0.8 }, { name: 'TV 43" 4K', mult: 1.2, cost: 45000, s: 1.0 }, { name: 'TV 55" OLED', mult: 1.45, cost: 170000, s: 1.2 },
  { name: 'TV 65" OLED', mult: 1.8, cost: 600000, s: 1.4 }, { name: 'TV 77" Gaming', mult: 2.3, cost: 2000000, s: 1.62 },
];
const SOFAS = [{ name: 'Sofa Biasa', cost: 0, pat: 1, tip: 0 }, { name: 'Sofa Kulit Premium', cost: 55000, pat: 1.3, tip: 0.06 }, { name: 'Sofa VIP + Bantal', cost: 320000, pat: 1.7, tip: 0.14 }];
const SLOT_COST = [0, 0, 45000, 140000, 380000, 1100000, 3000000, 8000000, 20000000];
const NSLOT = 9;
const BASE_PRICE = 5000;      // Rp per orang per sesi (1 jam) di PS3 level 0
const SESSION_SEC = 16;
const GCOL = ['#22c55e', '#f97316', '#ef4444', '#3b82f6', '#a855f7'];
const growth = (b, g, l) => Math.round(b * Math.pow(g, l));
const MENU = [
  { id: 'teh', name: 'Es Teh Manis', price: 4000, cost: 1000, emoji: '🧋', min: 1 }, { id: 'goreng', name: 'Gorengan', price: 3000, cost: 1000, emoji: '🍘', min: 1 },
  { id: 'kopi', name: 'Kopi Hitam', price: 5000, cost: 1500, emoji: '☕', min: 2 }, { id: 'mie', name: 'Indomie Telor', price: 9000, cost: 3500, emoji: '🍜', min: 3 },
  { id: 'jeruk', name: 'Es Jeruk', price: 5000, cost: 1500, emoji: '🍊', min: 4 },
];
const BRANCH_COST = [6000000, 25000000, 90000000];
const BRANCH_NAME = ['Cabang Timur', 'Cabang Barat', 'Cabang Belakang'];

const SHOP = [
  { id: 'kantin', name: '🍜 Kantin & Jajanan', desc: 'Buka kantin: Indomie, es, kopi, gorengan. Level naik = menu baru & harga +8%.', lvKey: 'snack', cost: (l) => (l < 4 ? [90000, 350000, 1400000, 5000000][l] : growth(5000000, 1.8, l - 3)), max: Infinity, eff: (l) => (l ? `Level ${l} · ${MENU.filter((m) => m.min <= l).length} menu` : 'Tutup') },
  { id: 'mkt', name: '📣 Promosi Medsos', desc: 'Pelanggan datang makin sering. Biaya iklan harian naik. Tanpa batas.', lvKey: 'mkt', cost: (l) => growth(50000, 1.55, l), max: Infinity, eff: (l) => `+${l * 12}% kedatangan` },
  { id: 'train', name: '🎓 Pelatihan & Manajemen', desc: '+8% pendapatan PS tiap level. Tanpa batas.', lvKey: 'train', cost: (l) => growth(120000, 1.6, l), max: Infinity, eff: (l) => `+${l * 8}% pendapatan` },
  { id: 'lobby', name: '🛋 Ruang Tunggu', desc: 'Tambah kursi tunggu & kesabaran antre.', lvKey: 'lobby', cost: (l) => [70000, 300000, 1200000, 4000000][l], max: 4, eff: (l) => `Level ${l}/4` },
  { id: 'ac', name: '❄ AC & Kenyamanan', desc: 'Reputasi naik, pelanggan lebih sabar.', lvKey: 'ac', cost: (l) => [200000, 800000, 3200000][l], max: 3, eff: (l) => `Level ${l}/3` },
  { id: 'decor', name: '🪩 Dekorasi Neon & Poster', desc: 'Toko lebih keren: reputasi & pelanggan.', lvKey: 'decor', cost: (l) => [180000, 700000, 2800000][l], max: 3, eff: (l) => `Level ${l}/3` },
];
const STAFF = [
  { id: 'kasir', name: '💳 Kecepatan Kasir', desc: 'Pembayaran lebih cepat. Gaji +5 Rb/hari tiap level.', lvKey: 'kasir', cost: (l) => [60000, 350000, 1800000][l], max: 3, eff: (l) => `Level ${l}/3` },
  { id: 'staff', name: '🧑‍🔧 Pegawai Jaga', desc: 'Perbaiki konsol otomatis, sesi lebih cepat. Gaji 16 Rb/hari per pegawai.', lvKey: 'staff', cost: (l) => [250000, 1400000, 7000000][l], max: 3, eff: (l) => `${l} pegawai` },
  { id: 'cctv', name: '📹 CCTV & Keamanan', desc: 'Kurangi pelanggan kabur tanpa bayar & stik rusak. Biaya 3 Rb/hari.', lvKey: 'cctv', cost: (l) => [150000, 700000, 3000000][l], max: 3, eff: (l) => `Level ${l}/3` },
  { id: 'genset', name: '⚡ Genset Listrik', desc: 'Saat listrik padam, genset otomatis menyala.', lvKey: 'genset', cost: () => 400000, max: 1, eff: (l) => (l ? 'Terpasang' : 'Belum ada') },
];

const NEWD = () => ({ inc: 0, kantin: 0, tip: 0, elec: 0, rent: 0, sal: 0, cogs: 0, broken: 0, theft: 0 });
let S = defaultState();
function defaultState() {
  return { money: 0, run: 0, life: 0, st: Array.from({ length: NSLOT }, (_, i) => ({ o: i < 2 ? 1 : 0, c: 0, t: 0, l: 0, s: 0 })), mkt: 0, train: 0, snack: 0, ac: 0, decor: 0, lobby: 0, kasir: 0, staff: 0, cctv: 0, genset: 0,
    br: [{ o: 0, l: 0 }, { o: 0, l: 0 }, { o: 0, l: 0 }], regs: [], d: NEWD(), y: NEWD(), stars: 0, ep: 0, qs: null, qp: { earn: 0, served: 0, upg: 0, vip: 0 }, sat: 0.8, ach: {}, cnt: { tap: 0, fix: 0, hh: 0, theft: 0, orders: 0 }, tut: 0,
    hhUntil: 0, hhReady: 0, clock: 9, day: 1, seen: Date.now(), served: 0, music: true, sfx: true, franchises: 0 };
}
function load() { try { const s = JSON.parse(localStorage.getItem(SAVE)); if (s && s.st && s.st.length === NSLOT) { const d = defaultState(); S = { ...d, ...s, qp: { ...d.qp, ...(s.qp || {}) }, cnt: { ...d.cnt, ...(s.cnt || {}) }, d: { ...d.d, ...(s.d || {}) }, y: { ...d.y, ...(s.y || {}) }, br: s.br && s.br.length === 3 ? s.br : d.br }; } } catch (e) { /* abaikan */ } }
function save() { try { S.seen = Date.now(); localStorage.setItem(SAVE, JSON.stringify(S)); } catch (e) { /* abaikan */ } }

// ---- turunan ----
const stationsOwned = () => S.st.filter((x) => x.o).length;
const branchCount = () => S.br.filter((b) => b.o).length;
const avgTier = () => { const o = S.st.filter((x) => x.o); return o.length ? o.reduce((a, d) => a + d.c, 0) / o.length : 0; };
const rep = () => Math.max(1, Math.min(5, 1 + S.ac * 0.55 + S.decor * 0.45 + Math.min(S.snack, 5) * 0.12 + S.lobby * 0.15 + avgTier() * 0.25 + (S.sat - 0.7) * 1.2));
let eventMult = 1, eventUntil = 0, eventName = '', rainUntil = 0, blackoutUntil = 0, blackout = false;
const hhActive = () => Date.now() < S.hhUntil;
const branchMult = () => 1 + S.br.reduce((a, b) => a + (b.o ? 0.3 + 0.1 * b.l : 0), 0);
const globalMult = () => (1 + S.train * 0.08) * (1 + S.stars * 0.2) * (1 + S.ep * 0.02) * branchMult() * (hhActive() ? 1.5 : 1) * (Date.now() < eventUntil ? eventMult : 1);
const personIncome = (d) => BASE_PRICE * CONSOLES[d.c].mult * TVS[d.t].mult * (1 + d.l * 0.1) * globalMult();
const sessionLen = () => SESSION_SEC / (1 + S.staff * 0.15);
const hourFactor = () => { const h = S.clock; let f = 1; if (h >= 16 && h < 22) f = 1.5; else if (h >= 22 || h < 6) f = 0.45; else if (h >= 12 && h < 16) f = 1.15; if (S.day % 7 === 6 || S.day % 7 === 0) f *= 1.3; return f; };
const arrivalEvery = () => Math.max(0.9, 7.5 / ((1 + S.mkt * 0.12) * (0.65 + 0.15 * rep()) * hourFactor() * (hhActive() ? 2 : 1) * (Date.now() < eventUntil && eventName === 'rombongan' ? 1.6 : 1) * (Date.now() < rainUntil ? 0.75 : 1)));
const patienceBase = () => 55 * (1 + S.ac * 0.15 + S.lobby * 0.1 + S.staff * 0.08);
const elecCost = (d) => 120 + 80 * d.c + 50 * d.t;
const dailyRent = () => 9000 + 6000 * stationsOwned() + 25000 * branchCount();
const dailySalary = () => S.staff * 16000 + S.kasir * 5000 + (S.snack > 0 ? 10000 : 0) + S.cctv * 3000 + S.mkt * 2000;
const memberLvl = (r) => (r.visits >= 15 ? 3 : r.visits >= 8 ? 2 : r.visits >= 3 ? 1 : 0);
const MEMBER = ['Pelanggan Baru', '🥈 Member Silver', '🥇 Member Gold', '💎 Member Platinum'];
const menuPrice = (m) => Math.round(m.price * (1 + Math.max(0, S.snack - 1) * 0.08));

function money(n) {
  n = Math.floor(n); const neg = n < 0; n = Math.abs(n); const u = [[1e15, 'Qa'], [1e12, 'T'], [1e9, 'M'], [1e6, 'Jt'], [1e3, 'Rb']];
  for (const [v, s] of u) if (n >= v) return (neg ? '-' : '') + 'Rp ' + (n / v).toFixed(n / v >= 100 ? 0 : n / v >= 10 ? 1 : 2).replace('.', ',') + ' ' + s;
  return (neg ? '-' : '') + 'Rp ' + n;
}
const incomeWin = [];
function earn(a, cat = 'inc') { S.money += a; S.run += a; S.life += a; if (cat !== 'kantin') S.qp.earn += a; S.d[cat] += a; incomeWin.push([performance.now(), a]); }
function spend(a, cat) { S.money = Math.max(0, S.money - a); S.d[cat] += a; }
const dayProfit = (d) => d.inc + d.kantin + d.tip - d.elec - d.rent - d.sal - d.cogs - d.broken;
function incomeRate() { const nowT = performance.now(); while (incomeWin.length && nowT - incomeWin[0][0] > 20000 / TS) incomeWin.shift(); return incomeWin.reduce((a, b) => a + b[1], 0) / (20 / TS); }

// ================= THREE: scene =================
const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x8cc4f0); scene.fog = new THREE.Fog(0x8cc4f0, 70, 330);
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 900);
const hemi = new THREE.HemisphereLight(0xaab4ff, 0x3a3a30, 0.9); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0dd, 1.6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 30, bottom: -30, near: 1, far: 120 }); scene.add(sun, sun.target);
const world = buildWorld(scene);

const HX = 12, HZ = 9;
const room = new THREE.Group(); scene.add(room);
const floorTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#2d3040'; g.fillRect(0, 0, w, h); g.strokeStyle = '#222534'; g.lineWidth = 2; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * w / 8, 0); g.lineTo(i * w / 8, h); g.moveTo(0, i * h / 8); g.lineTo(w, i * h / 8); g.stroke(); } for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.025})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } });
floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(6, 4.5);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(HX * 2, HZ * 2), std(0xffffff, { map: floorTex, roughness: 0.3, metalness: 0.15 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; room.add(floor);
const wallTex = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#323760'; g.fillRect(0, 0, w, h); for (let i = 0; i < 32; i++) { g.fillStyle = i % 2 ? '#383d68' : '#2d3256'; g.fillRect(i * 16, 0, 16, h); } });
wallTex.wrapS = THREE.RepeatWrapping; wallTex.repeat.set(6, 1);
const walls = [];
function addWall(w, h, d, x, y, z, key) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9, transparent: true })); m.position.set(x, y, z); m.receiveShadow = true; room.add(m); walls.push({ m, key }); }
addWall(HX * 2 + 0.3, 4.6, 0.3, 0, 2.3, -HZ, 'back'); addWall(0.3, 4.6, HZ * 2, -HX, 2.3, 0, 'left'); addWall(0.3, 4.6, HZ * 2, HX, 2.3, 0, 'right');
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x9db8ff, transparent: true, opacity: 0.14, roughness: 0.05, metalness: 0.1 });
const frameMat = std(0x0e1020, { metalness: 0.4 });
for (const [x0, x1] of [[-HX, -1.5], [1.5, HX]]) { const w = x1 - x0; const gl = new THREE.Mesh(new THREE.BoxGeometry(w, 3.8, 0.05), glassMat); gl.position.set((x0 + x1) / 2, 1.9, HZ); room.add(gl); const fr = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.16, 0.12), frameMat); fr.position.set((x0 + x1) / 2, 3.85, HZ); room.add(fr); const fb = fr.clone(); fb.position.y = 0.08; room.add(fb); for (let x = x0 + 3; x < x1; x += 3) { const pl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.8, 0.1), frameMat); pl.position.set(x, 1.9, HZ); room.add(pl); } }
const doorL = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3.5, 0.05), glassMat), doorR = doorL.clone(); doorL.position.set(-0.75, 1.75, HZ); doorR.position.set(0.75, 1.75, HZ); room.add(doorL, doorR);
const doorTop = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.3, 0.14), frameMat); doorTop.position.set(0, 3.7, HZ); room.add(doorTop);
const signTex = canvasTex(1024, 256, (g, w, h) => {
  g.fillStyle = '#0b0d1f'; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 88px sans-serif'; g.shadowColor = '#3b82f6'; g.shadowBlur = 36; g.fillStyle = '#e6f0ff'; g.fillText('RAFLI', 175, 100);
  g.shadowColor = '#f472b6'; g.fillStyle = '#ffd6ec'; g.fillText('PLAYSTATION', 670, 100);
  g.shadowBlur = 18; g.font = '900 54px sans-serif'; [['△', '#4ade80'], ['○', '#f87171'], ['✕', '#60a5fa'], ['□', '#f472b6']].forEach(([c, col], i) => { g.fillStyle = col; g.shadowColor = col; g.fillText(c, 340 + i * 115, 205); });
});
const sign = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 2.1), new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false })); sign.position.set(0, 3.55, -HZ + 0.2); room.add(sign);
const neonL = new THREE.PointLight(0x3b82f6, 16, 16); neonL.position.set(-4, 3.2, -HZ + 1.5); scene.add(neonL);
const neonR = new THREE.PointLight(0xf472b6, 16, 16); neonR.position.set(4, 3.2, -HZ + 1.5); scene.add(neonR);
const ledMats = []; for (const [x, y, z, w, d, c] of [[0, 4.4, -HZ + 0.25, HX * 2 - 0.5, 0.06, 0xf472b6], [-HX + 0.25, 4.4, 0, 0.06, HZ * 2 - 0.5, 0x3b82f6], [HX - 0.25, 4.4, 0, 0.06, HZ * 2 - 0.5, 0x8b5cf6]]) { const mt = new THREE.MeshBasicMaterial({ color: c, toneMapped: false }); const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, d), mt); m.position.set(x, y, z); room.add(m); ledMats.push(mt); }
const rug = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.4), std(0x2a2160, { roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(-6.5, 0.02, 5.6); room.add(rug);
const rug2 = new THREE.Mesh(new THREE.PlaneGeometry(10, 5.4), std(0x1f2a52, { roughness: 1 })); rug2.rotation.x = -Math.PI / 2; rug2.position.set(0, 0.02, -1.4); room.add(rug2);
const mat = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.4), new THREE.MeshBasicMaterial({ map: canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#20233f'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = 'bold 32px sans-serif'; g.textAlign = 'center'; g.fillText('SELAMAT DATANG', w / 2, 55); g.font = '20px sans-serif'; g.fillText('Rafli PlayStation', w / 2, 92); }) })); mat.rotation.x = -Math.PI / 2; mat.position.set(0, 0.03, HZ - 1.1); room.add(mat);
const ceilL = []; for (const [x, z] of [[-7, -3], [0, -3], [7, -3], [-6, 4], [6, 3]]) { const l = new THREE.PointLight(0xffe8c8, 9, 15); l.position.set(x, 4.2, z); scene.add(l); ceilL.push(l); }
const pend = []; for (const x of [-9, -4.5, 0, 4.5, 9]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.2, 20), new THREE.MeshBasicMaterial({ color: 0xfff0cc, toneMapped: false })); l.position.set(x, 3.9, -HZ + 3.4); room.add(l); pend.push(l); }

// ---- kasir ----
const CASH = { x: 3.2, z: 8.0, w: 2.8, d: 1.0 };
const counter = new THREE.Group(); counter.position.set(CASH.x, 0, CASH.z); room.add(counter);
{
  const body = new THREE.Mesh(new THREE.BoxGeometry(CASH.w, 1.05, CASH.d), std(0x262a52)); body.position.y = 0.52; body.castShadow = true; counter.add(body);
  const top = new THREE.Mesh(new THREE.BoxGeometry(CASH.w + 0.2, 0.07, CASH.d + 0.15), std(0xf0f0f5, { roughness: 0.2 })); top.position.y = 1.08; counter.add(top);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(CASH.w, 0.06, 0.02), new THREE.MeshBasicMaterial({ color: 0x3b82f6, toneMapped: false })); strip.position.set(0, 0.6, -CASH.d / 2 - 0.01); counter.add(strip);
  const mon = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.36, 0.04), std(0x111, { emissive: 0x1a4a8a, emissiveIntensity: 0.9 })); mon.position.set(-0.6, 1.4, 0.15); mon.rotation.y = Math.PI; counter.add(mon);
  const reg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.3), std(0xd1d5db)); reg.position.set(0.5, 1.19, 0.0); counter.add(reg);
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), std(0xfbbf24, { metalness: 0.8 })); bell.position.set(1.0, 1.12, -0.2); counter.add(bell);
}
const CASHIER_POS = new THREE.Vector3(CASH.x - 0.4, 0, CASH.z + 1.0);
const payQueue = [new THREE.Vector3(CASH.x - 0.3, 0, 6.3), new THREE.Vector3(CASH.x - 0.3, 0, 5.2), new THREE.Vector3(CASH.x - 0.3, 0, 4.1), new THREE.Vector3(CASH.x + 0.9, 0, 4.1)];

// ---- kantin ----
const KAN = { x: 8.0, z: 6.0 };
const kantin = new THREE.Group(); room.add(kantin); let menuTex = null, kantinLock = null;
function buildKantin() {
  kantin.clear(); menuTex = null; kantinLock = null;
  const cnt = new THREE.Group(); cnt.position.set(KAN.x, 0, KAN.z); kantin.add(cnt);
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.05, 1.0), std(0x7a3f1d, { roughness: 0.7 })); body.position.y = 0.52; body.castShadow = true; cnt.add(body);
  const top = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.07, 1.15), std(0xe8d9b8, { roughness: 0.4 })); top.position.y = 1.08; cnt.add(top);
  const aw = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.12, 1.5), std(0xdc2626)); aw.position.set(0, 3.0, 0.4); aw.rotation.x = 0.12; cnt.add(aw);
  for (const sx of [-1, 1]) { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3, 6), std(0x333)); pl.position.set(sx * 2.25, 1.5, -0.55); cnt.add(pl); }
  const panel = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.4, 0.2), std(0x5b3a1e, { roughness: 0.8 })); panel.position.set(8.7, 1.7, 8.88); kantin.add(panel);
  menuTex = canvasTex(512, 320, () => {}); const bd = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.75), new THREE.MeshBasicMaterial({ map: menuTex, toneMapped: false })); bd.position.set(7.2, 2.1, 8.76); bd.rotation.y = Math.PI; kantin.add(bd);
  for (let i = 0; i < 2; i++) { const sh = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 0.4), std(0xcaa472)); sh.position.set(10.0, 1.4 + i * 0.7, 8.6); kantin.add(sh); for (let k = 0; k < 5; k++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 8), std([0xdc2626, 0x16a34a, 0xf59e0b, 0x2563eb, 0xe5e7eb][k])); b.position.set(9.0 + k * 0.5, 1.58 + i * 0.7, 8.6); kantin.add(b); } }
  const stove = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 0.7), std(0x9ca3af, { metalness: 0.6 })); stove.position.set(7.0, 0.45, 8.3); kantin.add(stove); const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.25, 0.3, 12), std(0x6b7280, { metalness: 0.7 })); pot.position.set(7.0, 1.05, 8.3); kantin.add(pot);
  const fr = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.0, 0.8), std(0xe5e7eb, { roughness: 0.3 })); fr.position.set(11.1, 1.0, 8.4); kantin.add(fr);
  const nm = textSprite('🍜 KANTIN RAFLI', '#ffe27a', 40); nm.position.set(8.0, 3.7, 6.2); nm.scale.set(3.4, 0.64, 1); kantin.add(nm);
  for (const x of [6.4, 7.6, 8.8, 10.0]) { const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 12), std(0xdc2626)); sl.position.set(x, 0.62, 4.9); const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6), std(0x888)); lg.position.set(x, 0.3, 4.9); kantin.add(sl, lg); }
  if (S.snack < 1) { const veil = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3.2, 3.6), new THREE.MeshBasicMaterial({ color: 0x111428, transparent: true, opacity: 0.55 })); veil.position.set(8.4, 1.6, 7.0); kantin.add(veil); kantinLock = textSprite('🔒 Kantin tutup — buka di tab Toko', '#ffd45e', 34); kantinLock.position.set(8.0, 2.2, 5.4); kantinLock.scale.set(3.6, 0.7, 1); kantin.add(kantinLock); }
  drawMenu();
}
function drawMenu() {
  if (!menuTex) return; const { g, c } = menuTex.userData; g.fillStyle = '#1b1208'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#ffd45e'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.fillText('MENU KANTIN', c.width / 2, 44);
  g.textAlign = 'left'; g.font = '26px sans-serif'; MENU.forEach((m, i) => { const ok = m.min <= S.snack; g.fillStyle = ok ? '#ffffff' : '#6b7280'; g.fillText(`${m.emoji} ${m.name}`, 24, 92 + i * 44); g.textAlign = 'right'; g.fillText(ok ? 'Rp ' + menuPrice(m).toLocaleString('id-ID') : '🔒', c.width - 24, 92 + i * 44); g.textAlign = 'left'; });
  menuTex.needsUpdate = true;
}

// ---- dekorasi + kursi tunggu ----
const decorGroup = new THREE.Group(); room.add(decorGroup);
const obstacles = []; let lobbySeats = [];
function addObs(x, z, hw, hd) { obstacles.push([x - hw, z - hd, x + hw, z + hd]); }
const LOBBY_SOFA_X = [-9.8, -6.4, -3.6];
function buildDecor() {
  decorGroup.clear(); obstacles.length = 0; lobbySeats = [];
  obstacles.push([CASH.x - CASH.w / 2 - 0.15, CASH.z - 0.6, CASH.x + CASH.w / 2 + 0.15, HZ]);
  obstacles.push([KAN.x - 2.4, KAN.z - 0.6, KAN.x + 2.4, KAN.z + 0.6]); obstacles.push([5.6, 6.6, 11.8, HZ]);
  // sofa tunggu di dinding depan
  const nSofa = Math.min(3, 2 + (S.lobby >= 1 ? 1 : 0));
  for (let i = 0; i < nSofa; i++) { const sx = LOBBY_SOFA_X[i]; const s = makeSofa([0x374151, 0x6d28d9, 0x0f766e][i], 1, 2.4); s.position.set(sx, 0, HZ - 1.0); decorGroup.add(s); addObs(sx, HZ - 1.0, 1.35, 0.6); for (const o of [-0.55, 0.55]) lobbySeats.push({ pos: new THREE.Vector3(sx + o, 0, HZ - 1.03), yaw: Math.PI, approach: new THREE.Vector3(sx + o, 0, HZ - 2.4), used: false, y: -0.4 }); }
  const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.45, 16), std(0x1f2937)); tb.position.set(-8.1, 0.22, HZ - 1.0); decorGroup.add(tb); addObs(-8.1, HZ - 1.0, 0.45, 0.45);
  const mags = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.22), std(0xef4444)); mags.position.set(-8.1, 0.47, HZ - 1.0); decorGroup.add(mags);
  if (S.lobby >= 2) for (let i = 0; i < 3; i++) { const z = 3.0 + i * 1.3; const ch = makeChair([0x3b82f6, 0xf59e0b, 0x10b981][i]); ch.position.set(-HX + 0.7, 0, z); ch.rotation.y = -Math.PI / 2; decorGroup.add(ch); addObs(-HX + 0.7, z, 0.4, 0.4); lobbySeats.push({ pos: new THREE.Vector3(-HX + 0.72, 0, z), yaw: Math.PI / 2, approach: new THREE.Vector3(-HX + 2.0, 0, z), used: false, y: -0.38 }); }
  if (S.lobby >= 3) for (let i = 0; i < 3; i++) { const x = -9.2 + i * 1.3; const ch = makeChair([0xef4444, 0x8b5cf6, 0x06b6d4][i]); ch.position.set(x, 0, 3.0); ch.rotation.y = Math.PI; decorGroup.add(ch); addObs(x, 3.0, 0.4, 0.4); lobbySeats.push({ pos: new THREE.Vector3(x, 0, 2.98), yaw: 0, approach: new THREE.Vector3(x, 0, 4.4), used: false, y: -0.38 }); }
  if (S.lobby >= 4) { const tv = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 0.06), std(0x0a0a0c)); tv.position.set(-HX + 0.2, 2.3, 4.6); tv.rotation.y = Math.PI / 2; decorGroup.add(tv); const sc = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.8), new THREE.MeshBasicMaterial({ color: 0x2e5bd6, toneMapped: false })); sc.position.set(-HX + 0.24, 2.3, 4.6); sc.rotation.y = Math.PI / 2; decorGroup.add(sc); }
  if (S.decor >= 1) {
    const mk = (txt, c1, c2) => canvasTex(128, 180, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = 'bold 22px sans-serif'; g.textAlign = 'center'; g.fillText(txt, w / 2, h - 18); g.font = '60px sans-serif'; g.fillText('🎮', w / 2, 90); });
    [['FIFA', '#0a7', '#046'], ['GTA', '#f60', '#a02'], ['TEKKEN', '#c22', '#413'], ['GOW', '#456', '#123'], ['F1', '#d22', '#613']].forEach(([t, a, b], i) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.4), new THREE.MeshBasicMaterial({ map: mk(t, a, b) })); p.position.set(-HX + 0.2, 2.6, -6.5 + i * 2.5); p.rotation.y = Math.PI / 2; decorGroup.add(p); });
  }
  if (S.decor >= 2) for (const [x, z] of [[HX - 0.8, -HZ + 0.9], [-HX + 0.8, HZ - 0.8], [-11.2, -6.6], [11.2, 3.6]]) { const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.5, 14), std(0x7a4a2a)); pot.position.set(x, 0.25, z); const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), std(0x2d9b4e, { roughness: 0.9 })); lf.position.set(x, 0.95, z); lf.scale.y = 1.3; lf.castShadow = true; decorGroup.add(pot, lf); addObs(x, z, 0.4, 0.4); }
  if (S.decor >= 3) for (const [x, c] of [[-7, 0x3b82f6], [0, 0xf472b6], [7, 0x4ade80]]) { const m = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.035, 8, 32), new THREE.MeshBasicMaterial({ color: c, toneMapped: false })); m.position.set(x, 3.5, 1.5); m.rotation.x = Math.PI / 2; decorGroup.add(m); }
  if (S.ac >= 1) { const mk2 = (x) => { const ac = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.35), std(0xeeeeee, { roughness: 0.4 })); ac.position.set(x, 3.95, -HZ + 0.4); decorGroup.add(ac); }; mk2(-6.2); if (S.ac >= 2) mk2(6.2); if (S.ac >= 3) mk2(0); }
  buildGrid();
}

// ---- stasiun (9 slot) ----
const SLOTS = [
  { x: -9, z: -HZ + 0.35, ry: 0 }, { x: -4.5, z: -HZ + 0.35, ry: 0 }, { x: 0, z: -HZ + 0.35, ry: 0 }, { x: 4.5, z: -HZ + 0.35, ry: 0 }, { x: 9, z: -HZ + 0.35, ry: 0 },
  { x: -HX + 0.35, z: -3.6, ry: Math.PI / 2 }, { x: -HX + 0.35, z: 0.3, ry: Math.PI / 2 }, { x: HX - 0.35, z: -3.6, ry: -Math.PI / 2 }, { x: HX - 0.35, z: 0.3, ry: -Math.PI / 2 },
];
const SOFA_COLORS = [0x6d2ce0, 0x1d6fd8, 0xc2410c, 0x0f9d7a, 0xb4236b, 0x4b5563, 0xca8a04, 0x0e7490, 0x9333ea];
const stations = SLOTS.map((p, i) => {
  const g = new THREE.Group(); g.position.set(p.x, 0, p.z); g.rotation.y = p.ry; scene.add(g);
  const st = { i, g, slot: p, parts: new THREE.Group(), busy: false, reserved: false, genre: 0, tvTex: null, led: null, glow: null, lock: null, flash: 0, cheerT: 0, party: null, broken: false, alert: null };
  g.add(st.parts); return st;
});
const toWorld = (st, x, y, z) => st.g.localToWorld(new THREE.Vector3(x, y, z));
const seatPos = (st, k) => toWorld(st, k === 0 ? -0.5 : 0.5, 0, 3.25);
const frontPos = (st, k) => toWorld(st, k === 0 ? -0.5 : 0.5, 0, 2.2);
const faceYaw = (st) => st.slot.ry + Math.PI;
const selRing = new THREE.Mesh(new THREE.RingGeometry(1.7, 1.85, 40), new THREE.MeshBasicMaterial({ color: 0x4aa3ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide })); selRing.rotation.x = -Math.PI / 2; selRing.position.y = 0.05; scene.add(selRing);
let selected = 0;

function buildStation(st) {
  st.parts.clear(); if (st.lock) { st.g.remove(st.lock); st.lock = null; } st.tvTex = null; st.led = null; st.glow = null;
  const d = S.st[st.i];
  if (!d.o) {
    const sp = textSprite('🔒 Slot ' + (st.i + 1) + '  ·  ' + money(SLOT_COST[st.i]), '#ffd45e', 36); sp.position.set(0, 1.5, 1.8); sp.scale.set(3.4, 0.64, 1); st.g.add(sp); st.lock = sp;
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 4.4), new THREE.MeshBasicMaterial({ color: 0x2c3366, transparent: true, opacity: 0.35 })); pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.03, 2.1); st.parts.add(pad);
    const rim = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(3.6, 4.4)), new THREE.LineBasicMaterial({ color: 0x5560ff })); rim.rotation.x = -Math.PI / 2; rim.position.set(0, 0.04, 2.1); st.parts.add(rim);
    return;
  }
  const tv = TVS[d.t];
  const cab = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.55, 0.65), std(0x2b2723, { roughness: 0.65 })); cab.position.set(0, 0.275, 0.1); cab.castShadow = true; cab.receiveShadow = true; st.parts.add(cab);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.03, 0.66), new THREE.MeshBasicMaterial({ color: 0x3b82f6, toneMapped: false })); trim.position.set(0, 0.56, 0.1); st.parts.add(trim);
  const w = 1.7 * tv.s, h = 0.96 * tv.s, baseY = 0.58 + h / 2 + 0.12;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.06), std(0x08080a, { roughness: 0.3 })); frame.position.set(0, baseY, 0); frame.castShadow = true; st.parts.add(frame);
  const tex = canvasTex(160, 90, () => {}); st.tvTex = tex;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); scr.position.set(0, baseY, 0.033); st.parts.add(scr);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.25), std(0x08080a)); foot.position.set(0, 0.6, 0.05); st.parts.add(foot);
  const glow = new THREE.PointLight(0x5588ff, 2.5, 5.5); glow.position.set(0, 1.5, 1.4); st.parts.add(glow); st.glow = glow;
  const cons = makeConsole(d.c); cons.position.set(d.c >= 3 ? -1.35 : -1.2, 0.57, 0.15); cons.rotation.y = 0.15; st.parts.add(cons); st.led = cons.userData.led;
  const sofa = makeSofa(SOFA_COLORS[st.i], d.s); sofa.position.set(0, 0, 3.3); st.parts.add(sofa);
  const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.4, 14), std(0x1f2937)); tb.position.set(1.7, 0.2, 2.6); tb.castShadow = true; st.parts.add(tb);
  const lab = textSprite(CONSOLES[d.c].name + ' · ' + tv.name, '#9fc3ff', 32); lab.position.set(0, baseY + h / 2 + 0.4, 0); lab.scale.set(2.6, 0.5, 1); st.parts.add(lab);
}

// ================= JALUR (A* grid, termasuk luar ruangan) =================
const CELL = 0.5, GX0 = -30, GZ0 = -HZ, GW = 120, GH = 78;
let blocked = new Uint8Array(GW * GH);
const cellOf = (x, z) => [Math.max(0, Math.min(GW - 1, Math.floor((x - GX0) / CELL))), Math.max(0, Math.min(GH - 1, Math.floor((z - GZ0) / CELL)))];
const cellCenter = (cx, cz) => new THREE.Vector3(GX0 + (cx + 0.5) * CELL, 0, GZ0 + (cz + 0.5) * CELL);
function buildGrid() {
  blocked = new Uint8Array(GW * GH); const rects = obstacles.slice();
  stations.forEach((st) => { if (!S.st[st.i].o) return; st.g.updateMatrixWorld(true); const add = (lx0, lz0, lx1, lz1) => { const pts = [[lx0, lz0], [lx1, lz0], [lx1, lz1], [lx0, lz1]].map(([x, z]) => toWorld(st, x, 0, z)); rects.push([Math.min(...pts.map((p) => p.x)), Math.min(...pts.map((p) => p.z)), Math.max(...pts.map((p) => p.x)), Math.max(...pts.map((p) => p.z))]); }; add(-1.8, -0.4, 1.8, 0.5); add(-1.15, 2.75, 1.15, 3.85); add(1.4, 2.3, 2.0, 2.9); });
  for (const b of BAYS) rects.push([b.x - 1.15, b.z - 2.3, b.x + 1.15, b.z + 2.3]);
  const R = 0.3;
  for (let cz = 0; cz < GH; cz++) for (let cx = 0; cx < GW; cx++) {
    const c = cellCenter(cx, cz); let b = 0;
    if (c.z < HZ + 0.3 && (c.x < -HX + 0.4 || c.x > HX - 0.4)) b = 1;
    if (c.z < -HZ + 0.4) b = 1;
    if (c.z > HZ - 0.25 && c.z < HZ + 0.25 && Math.abs(c.x) > 1.3) b = 1;
    if (c.x < -29.3 || c.x > 29.3 || c.z > 28.5) b = 1;
    if (!b) for (const r of rects) if (c.x > r[0] - R && c.x < r[2] + R && c.z > r[1] - R && c.z < r[3] + R) { b = 1; break; }
    blocked[cz * GW + cx] = b;
  }
}
function nearestFree(cx, cz) { if (!blocked[cz * GW + cx]) return [cx, cz]; for (let r = 1; r < 10; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { const x = cx + dx, z = cz + dz; if (x >= 0 && z >= 0 && x < GW && z < GH && !blocked[z * GW + x]) return [x, z]; } return [cx, cz]; }
class Heap { constructor() { this.a = []; } push(k, v) { const a = this.a; a.push([k, v]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } } pop() { const a = this.a; const top = a[0]; const last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; } get size() { return this.a.length; } }
function findPath(from, to) {
  const [sx, sz] = nearestFree(...cellOf(from.x, from.z)), [ex, ez] = nearestFree(...cellOf(to.x, to.z)); const key = (x, z) => z * GW + x;
  const open = new Heap(), came = new Map(), g = new Map(); g.set(key(sx, sz), 0); const h = (x, z) => { const dx = Math.abs(x - ex), dz = Math.abs(z - ez); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); }; open.push(h(sx, sz), [sx, sz]); const closed = new Set(); let found = false, it = 0;
  while (open.size && it++ < 9000) {
    const [, [cx, cz]] = open.pop(); const ck = key(cx, cz); if (closed.has(ck)) continue; closed.add(ck); if (cx === ex && cz === ez) { found = true; break; }
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue; const nx = cx + dx, nz = cz + dz; if (nx < 0 || nz < 0 || nx >= GW || nz >= GH || blocked[key(nx, nz)]) continue;
      if (dx && dz && (blocked[key(cx + dx, cz)] || blocked[key(cx, cz + dz)])) continue;
      const ng = g.get(ck) + (dx && dz ? 1.414 : 1); const nk = key(nx, nz); if (g.has(nk) && ng >= g.get(nk)) continue; g.set(nk, ng); came.set(nk, ck); open.push(ng + h(nx, nz), [nx, nz]);
    }
  }
  if (!found) return [to.clone()];
  const out = []; let k = key(ex, ez); while (k !== key(sx, sz)) { out.push(cellCenter(k % GW, Math.floor(k / GW))); k = came.get(k); } out.reverse();
  // haluskan (buang titik segaris) + string pulling ringan
  const sm = []; for (let i = 0; i < out.length; i++) { if (i && i < out.length - 1) { const a = out[i - 1], b = out[i], c = out[i + 1]; if (Math.abs((b.x - a.x) * (c.z - b.z) - (b.z - a.z) * (c.x - b.x)) < 1e-6) continue; } sm.push(out[i]); }
  sm.push(to.clone()); return sm;
}

// ================= TV =================
function drawTV(st, t, playing) {
  const tex = st.tvTex; if (!tex) return; const { g, c } = tex.userData; const w = c.width, h = c.height;
  if (blackout) { g.fillStyle = '#020204'; g.fillRect(0, 0, w, h); tex.needsUpdate = true; return; }
  if (!playing) {
    g.fillStyle = '#0a1030'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) { g.beginPath(); g.strokeStyle = `rgba(120,170,255,${0.15 + i * 0.08})`; g.lineWidth = 2; for (let x = 0; x <= w; x += 6) { const y = h * (0.45 + i * 0.07) + Math.sin(x * 0.05 + t * (0.8 + i * 0.3) + i) * 8; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
    g.fillStyle = '#fff'; g.font = 'bold 11px sans-serif'; g.textAlign = 'center'; g.fillText('RAFLI PLAYSTATION', w / 2, 24); g.font = '15px sans-serif'; g.fillText('△  ○  ✕  □', w / 2, h - 14);
  } else {
    const gn = st.genre;
    if (gn === 0) { g.fillStyle = '#15803d'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ffffffaa'; g.lineWidth = 1.5; g.strokeRect(6, 8, w - 12, h - 16); g.beginPath(); g.moveTo(w / 2, 8); g.lineTo(w / 2, h - 8); g.stroke(); g.beginPath(); g.arc(w / 2, h / 2, 14, 0, 7); g.stroke(); for (let i = 0; i < 8; i++) { g.fillStyle = i < 4 ? '#2563eb' : '#ef4444'; g.fillRect(20 + ((Math.sin(t * 1.3 + i * 1.7) * 0.5 + 0.5) * (w - 44)), 14 + ((Math.cos(t * 0.9 + i * 2.1) * 0.5 + 0.5) * (h - 34)), 5, 7); } g.fillStyle = '#fff'; g.beginPath(); g.arc(w / 2 + Math.sin(t * 2) * 50, h / 2 + Math.cos(t * 1.7) * 22, 3, 0, 7); g.fill(); g.font = 'bold 9px sans-serif'; g.textAlign = 'left'; g.fillText('2 - 1  ' + Math.floor(t % 90) + "'", 6, 8); }
    else if (gn === 1) { g.fillStyle = '#7dd3fc'; g.fillRect(0, 0, w, h * 0.45); g.fillStyle = '#374151'; g.beginPath(); g.moveTo(w * 0.42, h * 0.45); g.lineTo(w * 0.58, h * 0.45); g.lineTo(w, h); g.lineTo(0, h); g.fill(); for (let i = 0; i < 7; i++) { const p = ((t * 1.6 + i / 7) % 1), y = h * 0.45 + p * p * h * 0.55, ww = 1 + p * 8; g.fillStyle = '#fde047'; g.fillRect(w / 2 - ww / 2, y, ww, 2 + p * 8); } const cx = w / 2 + Math.sin(t * 1.5) * 22; g.fillStyle = '#ef4444'; g.fillRect(cx - 14, h - 26, 28, 14); g.fillStyle = '#111'; g.fillRect(cx - 16, h - 14, 8, 6); g.fillRect(cx + 8, h - 14, 8, 6); g.fillStyle = '#fff'; g.font = 'bold 10px sans-serif'; g.textAlign = 'left'; g.fillText(Math.floor(180 + Math.sin(t) * 40) + ' km/h', 6, h - 4); }
    else if (gn === 2) { g.fillStyle = '#312e81'; g.fillRect(0, 0, w, h); g.fillStyle = '#1e1b4b'; g.fillRect(0, h * 0.75, w, h * 0.25); const hit = Math.sin(t * 4) > 0.8; const ax = 45 + (hit ? 12 : 0), bx = w - 55 - (hit ? 0 : 6); g.fillStyle = '#f59e0b'; g.fillRect(ax, h * 0.35, 16, h * 0.4); g.fillStyle = '#10b981'; g.fillRect(bx, h * 0.35, 16, h * 0.4); g.fillStyle = '#22c55e'; g.fillRect(6, 6, 60 * (0.6 + 0.3 * Math.sin(t)), 7); g.fillRect(w - 66, 6, 60 * (0.6 + 0.3 * Math.cos(t * 1.3)), 7); if (hit) { g.fillStyle = '#fff'; g.font = 'bold 16px sans-serif'; g.fillText('K.O!', w / 2 - 14, h / 2); } }
    else if (gn === 3) { g.fillStyle = '#0f172a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 4; i++) { g.fillStyle = '#7f1d1d'; const ex = (Math.sin(t * 0.7 + i * 2) * 0.5 + 0.5) * (w - 20) + 4; g.fillRect(ex, 30 + i * 8, 10, 24); } const cx = w / 2 + Math.sin(t * 1.4) * 36, cy = h / 2 + Math.cos(t * 1.1) * 14; g.strokeStyle = '#4ade80'; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, 9, 0, 7); g.moveTo(cx - 14, cy); g.lineTo(cx + 14, cy); g.moveTo(cx, cy - 14); g.lineTo(cx, cy + 14); g.stroke(); g.fillStyle = '#fff'; g.font = 'bold 9px sans-serif'; g.textAlign = 'left'; g.fillText('AMMO 24/90', 6, h - 5); }
    else { g.fillStyle = '#05050a'; g.fillRect(0, 0, w, h); const gr = g.createRadialGradient(w / 2 + Math.sin(t) * 20, h / 2, 4, w / 2, h / 2, 60 + Math.sin(t * 7) * 4); gr.addColorStop(0, '#6b5b95cc'); gr.addColorStop(1, '#0000'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#2a2236'; g.fillRect(w * 0.55, h * 0.3, 18, h * 0.5); }
  }
  tex.needsUpdate = true;
}

// ================= WAKTU, DIALOG, GERAKAN =================
let clockT = 0; const later = [];
const after = (sec, fn) => later.push({ t: sec, fn });
function updateLater(dt) { for (let i = later.length - 1; i >= 0; i--) { later[i].t -= dt; if (later[i].t <= 0) { const f = later[i].fn; later.splice(i, 1); try { f(); } catch (e) { /* abaikan */ } } } }
let voiceBudget = 0;
function say(m, text, tone = 'say', dur = 3) {
  if (!m || !m.alive || !m.p) return; if (m.dlg) { m.p.remove(m.dlg); m.dlg = null; }
  const sp = dialogSprite(text, tone); sp.position.set(0, 2.3, 0); m.p.add(sp); m.dlg = sp; m.dlgUntil = clockT + dur;
  if (voiceBudget < 3) { voiceBudget++; if (tone === 'shout') audio.shout(); else audio.voice(m.girl ? 1.3 : 1); }
}
function act(m, name, dur) { if (m && m.alive) { m.gest = name; m.gestUntil = clockT + dur; } }
function setBubble(m, e) { if (!m.alive || m.bubbleE === e) return; m.bubbleE = e; const nb = emojiSprite(e); nb.position.set(0, 2.05, 0); if (m.bubble) m.p.remove(m.bubble); m.p.add(nb); m.bubble = nb; }
function finishPose(m) {
  if (m.gest && clockT < m.gestUntil) applyGesture(m.p, m.gest, clockT); else m.gest = null;
  if (m.dlg && clockT > m.dlgUntil) { m.p.remove(m.dlg); m.dlg = null; }
}
function poseSitRelax(m) {
  const p = m.p, u = p.userData, t = clockT; p.position.y = m.sitY ?? -0.4;
  u.legs.forEach((l, i) => { l.th.rotation.x = -1.5; l.sn.rotation.x = 1.5; l.th.rotation.z = (i ? 1 : -1) * 0.1; });
  u.hips.rotation.set(-0.05, 0, 0); u.hips.position.y = 0.9; u.arms.forEach((a, i) => { a.up.rotation.x = -0.25; a.up.rotation.z = (i ? -1 : 1) * 0.1; a.fo.rotation.x = -0.9; });
  u.head.rotation.y = Math.sin(t * 0.4 + u.phase) * 0.25; u.head.rotation.x = 0;
}

// ================= PELANGGAN =================
const SHIRTS = [0xef4444, 0x22c55e, 0xf59e0b, 0x8b5cf6, 0x06b6d4, 0xec4899, 0x64748b, 0xe2e8f0, 0x14b8a6], SKINS = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac], HAIRS = [0x111111, 0x2b1b12, 0x3b2314, 0x0a0a0a, 0x5b3a1e];
const newLook = (type) => ({ shirt: type === 'pelajar' ? 0xe5e7eb : type === 'vip' ? 0x7c3aed : pick(SHIRTS), skin: pick(SKINS), hair: pick(HAIRS), girl: Math.random() < 0.38, bag: type === 'pelajar', cap: Math.random() < 0.25, headset: type === 'vip' });
let birthdayNext = false; const parties = []; let partyId = 0; const staffNPCs = []; const allMembers = () => parties.flatMap((q) => q.members);
const DOOR_IN = new THREE.Vector3(0, 0, HZ - 2.0);
const bayExit = (bay) => new THREE.Vector3(bay.x + 1.85, 0, bay.z);
const PRE = ['drive', 'toDoor', 'toLobbySeat', 'sitDown', 'seated', 'standUp'];
const freeStations = () => stations.filter((s) => S.st[s.i].o && !s.busy && !s.reserved);
const seatAt = (st, size, i) => toWorld(st, size === 1 ? 0 : (i ? 0.5 : -0.5), 0, 3.25);
const frontAt = (st, size, i) => toWorld(st, size === 1 ? 0 : (i ? 0.5 : -0.5), 0, 2.2);

function mkMember(q, idx, pos, look, reg) {
  const p = makePerson(look); p.position.copy(pos); scene.add(p);
  const bub = emojiSprite('🙂'); bub.position.set(0, 2.05, 0); p.add(bub);
  return { p, q, reg, name: reg ? reg.name : pick(NAMES), trait: reg ? reg.trait : newTrait(), girl: look.girl, bubble: bub, bubbleE: '🙂', dlg: null, dlgUntil: 0, gest: null, gestUntil: 0, path: [], pi: 0, v: 0, speed: 2.0 + Math.random() * 0.6, speedMul: 1, arrived: true, alive: true, food: null, eatUntil: 0, ordered: false, seat: null, sitY: -0.4, idx };
}
function spawnParty(forceVip) {
  if (stationsOwned() < 1) return false;
  const vip = forceVip || (rep() >= 3 && Math.random() < 0.06 && S.st.some((d) => d.o && d.c >= 2));
  const size = vip ? 1 : Math.random() < 0.4 ? 2 : 1;
  const pendingPeople = parties.filter((q) => PRE.includes(q.state)).reduce((a, q) => a + q.size, 0);
  const capacity = freeStations().length * 2 + lobbySeats.filter((s) => !s.used).length + 1;
  if (pendingPeople + size > capacity || parties.length > 22) return false;
  const bays = BAYS.filter((b) => !b.taken); if (!bays.length) return false;
  const bay = pick(bays); bay.taken = true;
  const type = vip ? 'vip' : pick(['pelajar', 'gamer', 'karyawan', 'gamer']);
  let kind = vip ? 'suv' : type === 'pelajar' ? (Math.random() < 0.7 ? 'bike' : 'car') : type === 'karyawan' ? (Math.random() < 0.7 ? 'car' : 'bike') : Math.random() < 0.5 ? 'bike' : 'car'; if (size === 2) kind = 'car';
  const q = { id: ++partyId, state: 'drive', type, vip, size, bay, members: [], t0: clockT, patience: patienceBase(), maxPat: patienceBase(), st: null, t: 0, len: sessionLen() * (type === 'gamer' ? 1.3 : type === 'pelajar' ? 1.1 : 1) * (0.85 + Math.random() * 0.3), income: 0, bill: 0, sT: 2 + Math.random() * 4, tQ: 0, afterSit: 'seated', afterStand: 'station', genre: Math.floor(Math.random() * 5), looks: [], regs: [], escape: false };
  const pool = S.regs.filter((r) => !r.present); for (let i = 0; i < size; i++) { const reg = !vip && pool.length && Math.random() < Math.min(0.5, 0.12 + S.regs.length * 0.02) ? pool.splice(Math.floor(Math.random() * pool.length), 1)[0] : null; q.regs.push(reg); q.looks.push(reg ? reg.look : newLook(type)); if (reg) reg.present = true; }
  if (birthdayNext) { q.birthday = true; birthdayNext = false; } parties.push(q); q.vehicle = world.driveIn(bay, kind, pick([0xdc2626, 0x2563eb, 0x16a34a, 0xf59e0b, 0xe5e7eb, 0x111827, 0x7c3aed, 0x0ea5e9]), () => onParked(q)); audio.car(); return true;
}
function onParked(q) {
  const ex = bayExit(q.bay); for (let i = 0; i < q.size; i++) { const m = mkMember(q, i, ex.clone().add(new THREE.Vector3(0.0, 0, i * 0.6)), q.looks[i], q.regs[i]); q.members.push(m); }
  goto(q, q.members.map(() => DOOR_IN.clone()), 'toDoor'); setBubble(q.members[0], q.vip ? '🌟' : '🙂');
  if (q.birthday) { setBubble(q.members[0], '🎂'); after(1.0, () => say(q.members[0], pick(LINES.birthday), 'good', 4)); } else if (Date.now() < rainUntil && Math.random() < 0.5) after(0.8, () => say(q.members[0], pick(LINES.rain), 'say', 3)); else if (q.regs[0]) after(1.2, () => say(q.members[0], pick(LINES.member), 'say'));
}
function goto(q, targets, state, mul = 1) { q.state = state; q.members.forEach((m, i) => { m.path = findPath(m.p.position, targets[i] || targets[0]); m.pi = 0; m.arrived = false; m.speedMul = mul; }); }
function moveMember(m, dt) {
  if (m.arrived) return true; const tgt = m.path[m.pi]; if (!tgt) { m.arrived = true; return true; }
  const dir = tgt.clone().sub(m.p.position); dir.y = 0; const dist = dir.length(); const last = m.pi >= m.path.length - 1;
  if (dist < 0.12) { m.pi++; if (m.pi >= m.path.length) { m.arrived = true; m.v = 0; return true; } return false; }
  dir.normalize(); const want = m.speed * (m.speedMul || 1) * (last ? Math.min(1, 0.35 + dist / 1.2) : 1); m.v += (want - m.v) * Math.min(1, dt * 7);
  m.p.position.addScaledVector(dir, Math.min(m.v * dt, dist)); const yaw = Math.atan2(dir.x, dir.z); let d = yaw - m.p.rotation.y; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; m.p.rotation.y += d * Math.min(1, dt * 9);
  poseWalk(m.p, clockT, Math.max(0.3, m.v / 2.4)); return false;
}
function separate(list, dt) {
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) { const a = list[i], b = list[j]; if (a.arrived || b.arrived) continue; const dx = b.p.position.x - a.p.position.x, dz = b.p.position.z - a.p.position.z; const d2 = dx * dx + dz * dz; if (d2 < 0.3 && d2 > 1e-4) { const d = Math.sqrt(d2), push = (0.55 - d) * 2.5 * dt; a.p.position.x -= (dx / d) * push; a.p.position.z -= (dz / d) * push; b.p.position.x += (dx / d) * push; b.p.position.z += (dz / d) * push; } }
}

function pickLobbySeats(size) {
  const fr = lobbySeats.filter((s) => !s.used); if (fr.length < size) return null;
  if (size === 2) for (let i = 0; i < lobbySeats.length - 1; i++) { const a = lobbySeats[i], b = lobbySeats[i + 1]; if (!a.used && !b.used && a.pos.distanceTo(b.pos) < 1.3) return [a, b]; }
  return size === 1 ? [fr[Math.floor(Math.random() * fr.length)]] : fr.slice(0, 2);
}
function waitingParties() { return parties.filter((q) => q.state === 'seated' || q.state === 'sitDown' || q.state === 'toLobbySeat').sort((a, b) => a.t0 - b.t0); }
function tryAssign(q) {
  const fr = freeStations(); if (!fr.length) return false; const st = q.vip ? fr.sort((a, b) => S.st[b.i].c - S.st[a.i].c)[0] : pick(fr);
  st.reserved = true; q.st = st; const ap = q.members.map((m) => (m.seat ? m.seat.approach.clone() : m.p.position.clone())); q.members.forEach((m) => { if (m.seat) { m.seat.used = false; m.seat = null; } });
  q.genre = Math.floor(Math.random() * 5); const wasSeated = q.state === 'seated';
  if (wasSeated) beginStand(q, 'station', ap); else goto(q, q.members.map((m, i) => frontAt(st, q.size, i)), 'toStation');
  return true;
}
function arrivedInside(q) {
  const ahead = waitingParties().filter((o) => o !== q);
  if (!ahead.length && tryAssign(q)) { say(q.members[0], pick(LINES.greet), 'say'); return; }
  const seats = pickLobbySeats(q.size);
  if (seats) { q.members.forEach((m, i) => { m.seat = seats[i]; seats[i].used = true; m.sitY = seats[i].y; }); goto(q, q.members.map((m) => m.seat.approach.clone()), 'toLobbySeat'); }
  else { const base = new THREE.Vector3(-3 + Math.random() * 2, 0, 4.5 + Math.random() * 1.2); q.members.forEach((m) => (m.seat = null)); goto(q, q.members.map((m, i) => base.clone().add(new THREE.Vector3(i * 0.7, 0, 0))), 'toLobbySeat'); }
  say(q.members[0], pick(LINES.greet), 'say');
}
function beginSit(q, next, targets) { q.state = 'sitDown'; q.t = 0; q.afterSit = next; q.members.forEach((m, i) => { m.from = m.p.position.clone(); m.fromYaw = m.p.rotation.y; m.sitTo = targets[i]; }); }
function beginStand(q, next, fronts) { q.state = 'standUp'; q.t = 0; q.afterStand = next; q.members.forEach((m, i) => { m.from = m.p.position.clone(); m.fromYaw = m.p.rotation.y; m.standTo = fronts[i]; m.fromY = m.p.position.y; detachController(m.p); }); }
const smooth = (k) => k * k * (3 - 2 * k);

// ---- pesanan kantin ----
const tasks = []; const TRAY_POS = new THREE.Vector3(KAN.x, 0, 4.9); const WAITER_IDLE = new THREE.Vector3(11.0, 0, 4.9);
function orderFood(q, m, where) {
  if (S.snack < 1 || m.ordered) return; const opts = MENU.filter((x) => x.min <= S.snack); const it = pick(opts);
  m.ordered = true; m.order = it; q.bill += menuPrice(it); spend(it.cost, 'cogs'); S.cnt.orders++; say(m, pick(LINES.food), 'say', 3); setBubble(m, it.emoji); act(m, 'talk', 1.6);
  tasks.push({ q, m, where, item: it });
}
const cook = makePerson({ kind: 'staff', shirt: 0xf8fafc, pants: 0x1f2937, apron: true, cap: true, girl: false }); cook.position.set(KAN.x, 0, KAN.z + 1.5); cook.rotation.y = Math.PI; scene.add(cook);
const waiter = { p: makePerson({ kind: 'staff', shirt: 0xdc2626, pants: 0x1f2937, apron: true, cap: true, girl: true }), state: 'idle', task: null, path: [], pi: 0, v: 0, speed: 2.8, speedMul: 1, arrived: true, t: 0, tray: null, alive: true };
waiter.p.position.copy(WAITER_IDLE); scene.add(waiter.p);
function taskValid(t) { const q = t.q; if (!parties.includes(q) || !t.m.alive) return false; return t.where === 'lobby' ? (q.state === 'seated' || q.state === 'sitDown') : (q.state === 'play' || q.state === 'sitDown'); }
function updateWaiter(dt) {
  const on = S.snack >= 1; waiter.p.visible = on; cook.visible = on; if (!on) return; const w = waiter, t = clockT;
  const stateHandle = () => {
    if (w.state === 'idle') { if (!w.arrived) { moveMember(w, dt); } else poseStand(w.p, t); while (tasks.length && !taskValid(tasks[0])) tasks.shift(); if (tasks.length && w.arrived) { w.task = tasks.shift(); w.state = 'toPick'; w.path = findPath(w.p.position, TRAY_POS); w.pi = 0; w.arrived = false; } }
    else if (w.state === 'toPick') { if (moveMember(w, dt)) { w.state = 'cook'; w.t = 0; w.p.rotation.y = 0; } }
    else if (w.state === 'cook') { poseStand(w.p, t); w.t += dt; if (w.t > 1.5 / (1 + S.snack * 0.08)) { w.tray = makeFood(w.task.item.id === 'goreng' ? 'goreng' : w.task.item.id); w.tray.position.set(0, 1.2, 0.35); w.p.userData.hips.add(w.tray); w.tray.position.set(0, 0.45, 0.32); w.state = 'deliver'; const tk = w.task; const tgt = tk.where === 'lobby' ? (tk.m.seat ? tk.m.seat.approach.clone() : tk.m.p.position.clone()) : frontAt(tk.q.st, tk.q.size, tk.m.idx); w.path = findPath(w.p.position, tgt); w.pi = 0; w.arrived = false; } }
    else if (w.state === 'deliver') {
      if (!taskValid(w.task)) { w.p.userData.hips.remove(w.tray); w.tray = null; w.task = null; w.state = 'back'; w.path = findPath(w.p.position, WAITER_IDLE); w.pi = 0; w.arrived = false; return; }
      const done = moveMember(w, dt); const u = w.p.userData; u.arms.forEach((a) => { a.up.rotation.x = -1.0; a.fo.rotation.x = -0.9; }); if (done) { w.state = 'serve'; w.t = 0; const m = w.task.m; let d = Math.atan2(m.p.position.x - w.p.position.x, m.p.position.z - w.p.position.z); w.p.rotation.y = d; }
    }
    else if (w.state === 'serve') {
      poseStand(w.p, t); const u = w.p.userData; u.arms.forEach((a) => { a.up.rotation.x = -1.1; a.fo.rotation.x = -0.6; }); w.t += dt;
      if (w.t > 0.9) { const tk = w.task, m = tk.m; w.p.userData.hips.remove(w.tray); w.tray = null; if (taskValid(tk)) { const f = makeFood(tk.item.id === 'goreng' ? 'goreng' : tk.item.id); f.position.set(0, 0.2, 0.28); m.p.userData.hips.add(f); m.food = f; m.eatUntil = clockT + 11; say(m, pick(LINES.thanks.slice(0, 1).concat(['Makasih mas!', 'Wah pesenanku datang!'])), 'good', 2.4); audio.coin(); } w.task = null; w.state = 'back'; w.path = findPath(w.p.position, WAITER_IDLE); w.pi = 0; w.arrived = false; }
    }
    else if (w.state === 'back') { if (moveMember(w, dt)) { w.state = 'idle'; w.arrived = true; w.p.rotation.y = 0; } }
  };
  stateHandle();
  // koki
  const cu = cook.userData; if (w.state === 'cook') { poseStand(cook, t); cu.arms[1].up.rotation.x = -1.0 + Math.sin(t * 9) * 0.25; cu.arms[1].fo.rotation.x = -1.2; cu.arms[0].up.rotation.x = -0.9; cu.arms[0].fo.rotation.x = -1.3; cook.rotation.y = Math.PI; } else { poseStand(cook, t); cu.head.rotation.y = Math.sin(t * 0.5) * 0.5; }
}
// makan di tempat
function updateEating(m, dt) {
  if (!m.food) return; if (clockT > m.eatUntil) { m.p.userData.hips.remove(m.food); m.food = null; m.ordered = false; setBubble(m, m.q.state === 'play' ? '🎮' : '🙂'); return; }
  if (!m.gest || m.gest === 'eat') { m.gest = 'eat'; m.gestUntil = clockT + 0.3; } if (Math.random() < dt * 0.9) audio.eat(); if (Math.random() < dt * 0.12) say(m, pick(LINES.eat), 'good', 2.2);
}

// ================= SIFAT, OBROLAN, KENAKALAN =================
const floaters = [];
function popup(pos, text, color = '#fff') { const s = textSprite(text, color, 38); s.position.copy(pos); scene.add(s); floaters.push({ s, t: 0 }); }
function updateFloaters(dt) { for (let i = floaters.length - 1; i >= 0; i--) { const f = floaters[i]; f.t += dt; f.s.position.y += dt * 0.8; f.s.material.opacity = Math.max(0, 1 - f.t / 1.8); if (f.t > 1.8) { scene.remove(f.s); floaters.splice(i, 1); } } }
function neighborOf(q) { const a = q.members[0]; return parties.find((o) => o !== q && o.state === 'seated' && o.members.some((m) => m.seat && a.seat && m.seat.pos.distanceTo(a.seat.pos) < 1.9)); }
function playNeighbor(q) { return parties.find((o) => o !== q && o.state === 'play' && o.st && q.st && o.st.g.position.distanceTo(q.st.g.position) < 6.5); }
function chat(a, b) {
  say(a, pick(LINES.waitChat), 'say', 3); act(a, 'talk', 2.6); a.p.userData.head.rotation.y = 0;
  after(2.2, () => { if (!b.alive) return; say(b, pick(LINES.waitChat), 'say', 3); const g = Math.random() < 0.5 ? 'laugh' : 'talk'; act(b, g, 2.2); if (g === 'laugh') audio.laugh(); });
  if (Math.random() < 0.5) after(4.6, () => { if (!a.alive) return; say(a, pick(LINES.neighborReact), 'say', 2.4); act(a, 'laugh', 1.8); audio.laugh(); });
}
function breakStick(q, m) { const c = Math.round(12000 * (1 + S.st[q.st.i].c * 0.5)); spend(c, 'broken'); say(m, pick(LINES.broke), 'bad', 3); act(m, 'facepalm', 2.2); popup(toWorld(q.st, 0, 2.6, 2.4), '🎮💥 Stik rusak −' + money(c), '#ff9a7a'); audio.error(); setBubble(m, '😅'); after(2.4, () => setBubble(m, '🎮')); }
function social(q, dt) {
  q.sT -= dt; if (q.sT > 0) return; q.sT = 3.5 + Math.random() * 6; const m = pick(q.members), tr = m.trait, r = Math.random();
  if (q.state === 'seated') {
    if (S.snack > 0 && !m.ordered && !m.food && !m.hadOrder && r < 0.25 + 0.5 * tr.lapar) { m.hadOrder = true; orderFood(q, m, 'lobby'); return; }
    const nb = neighborOf(q); if (nb && tr.rame > 0.3 && r < 0.75) { chat(m, pick(nb.members)); return; }
    if (q.size === 2 && r < 0.6) { chat(m, q.members[1 - m.idx]); return; }
    if (q.patience / q.maxPat < 0.45) { say(m, pick(LINES.waitAnnoy), 'bad', 2.8); act(m, 'facepalm', 2); } else if (r < 0.55) { act(m, 'phone', 5); if (Math.random() < 0.3) say(m, pick(LINES.bored), 'say', 2.4); } else say(m, pick(LINES.waitChat), 'say', 3);
  } else if (q.state === 'play') {
    const st = q.st; const lose = Math.random() < 0.45;
    if (r < 0.42) {
      if (!lose) { say(m, pick(LINES.win), 'shout', 2.4); act(m, 'shout', 1.6); setBubble(m, '🤩'); st.cheerT = 1.2; after(1.8, () => setBubble(m, '🎮')); }
      else if (tr.emosi > 0.5) { say(m, pick(LINES.rage), 'shout', 2.8); act(m, 'rage', 2.2); setBubble(m, '😡'); if (Math.random() < 0.3 * (1 - S.cctv * 0.25)) breakStick(q, m); after(2.4, () => setBubble(m, '🎮')); }
      else { say(m, pick(LINES.lose), 'bad', 2.6); act(m, 'facepalm', 1.8); }
    } else if (r < 0.62 && q.size === 2) {
      const o = q.members[1 - m.idx]; say(m, pick(LINES.shout), 'shout', 2.4); act(m, 'talk', 2); after(1.5, () => { if (!o.alive) return; say(o, pick(LINES.neighborReact), 'say', 2.4); act(o, 'laugh', 1.6); audio.laugh(); });
    } else if (r < 0.8) { const nbr = playNeighbor(q); if (nbr) { const o = pick(nbr.members); say(m, pick(LINES.shout), 'shout', 2.2); after(1.0, () => { if (!o.alive) return; say(o, pick(LINES.neighborReact), 'say', 2.4); act(o, 'point', 1.8); }); } }
    else if (tr.nakal > 0.45) {
      const o = q.size === 2 ? q.members[1 - m.idx] : null; say(m, pick(LINES.prank), 'say', 2.8); act(m, 'point', 1.6); setBubble(m, '😈'); after(2.2, () => setBubble(m, '🎮'));
      if (o) after(1.6, () => { if (!o.alive) return; say(o, pick(LINES.caught), 'bad', 2.4); act(o, 'rage', 1.5); if (o.food) o.eatUntil = clockT; if (Math.random() < 0.25) breakStick(q, o); });
    } else if (tr.baik > 0.5) { say(m, pick(LINES.kind), 'good', 3); act(m, 'talk', 2); setBubble(m, '😊'); after(2.4, () => setBubble(m, '🎮')); }
    else if (r > 0.9) { say(m, pick(LINES.hungry), 'say', 2.4); }
  } else if (q.state === 'queue' || q.state === 'toCounter') { say(m, pick(LINES.pay), 'say', 2.4); }
}

// ================= ALUR PELANGGAN =================
let cashierBusy = null;
const smoothYaw = (from, to, e) => { let d = to - from; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return from + d * e; };
function startPlay(q) { const st = q.st; q.state = 'play'; q.t = 0; st.busy = true; st.reserved = false; st.party = q; st.genre = q.genre; st.flash = 0; q.orderAt = q.len * (0.15 + Math.random() * 0.3); q.members.forEach((m) => { setBubble(m, '🎮'); }); }
function leaveAngry(q, why) {
  q.members.forEach((m) => { if (m.seat) { m.seat.used = false; m.seat = null; } setBubble(m, '😡'); detachController(m.p); if (m.food) { m.p.userData.hips.remove(m.food); m.food = null; } });
  S.sat = Math.max(0, S.sat - 0.06 * q.size); audio.angry(); popup(q.members[0].p.position.clone().add(new THREE.Vector3(0, 2.7, 0)), why || 'Pelanggan pergi!', '#ff7a7a'); say(q.members[0], pick(LINES.waitAnnoy), 'bad', 2.5);
  q.members.forEach((m) => { m.p.position.y = 0; }); goto(q, q.members.map(() => bayExit(q.bay)), 'angry', 1.5);
}
function board(q) {
  const i = parties.indexOf(q); if (i >= 0) parties.splice(i, 1);
  q.members.forEach((m) => { m.alive = false; scene.remove(m.p); if (m.reg) m.reg.present = false; });
  world.driveOut(q.vehicle, q.bay, () => { q.bay.taken = false; q.vehicle.remove = true; }); audio.car();
}
function completePay(q) {
  cashierBusy = null; const nak = Math.max(...q.members.map((m) => m.trait.nakal));
  if (!q.vip && nak > 0.5 && Math.random() < nak * 0.14 * (1 - Math.min(0.8, S.cctv * 0.28 + S.staff * 0.08))) {
    if (Math.random() < S.cctv * 0.3) { say(cashier.m, 'Ketahuan CCTV! Bayar + denda!', 'shout', 3); earn(q.income * 1.2, 'inc'); spend(q.elec, 'elec'); popup(CASHIER_POS.clone().add(new THREE.Vector3(0, 2.8, -0.6)), '📹 Tertangkap CCTV +' + money(q.income * 1.2), '#7affb2'); }
    else { S.cnt.theft++; S.d.theft += q.income; say(q.members[0], 'Kabur ah! Hehe', 'shout', 2.5); say(cashier.m, 'MALING!! Woi bayar!', 'shout', 3); act(cashier.m, 'point', 2.5); popup(CASHIER_POS.clone().add(new THREE.Vector3(0, 2.8, -0.6)), '🏃 Kabur tanpa bayar!', '#ff7a7a'); S.sat = Math.max(0, S.sat - 0.05); audio.angry(); q.members.forEach((m) => setBubble(m, '😈')); goto(q, q.members.map(() => bayExit(q.bay)), 'angry', 2.2); return; }
  } else {
    earn(q.income, 'inc'); if (q.tip > 0) earn(q.tip, 'tip'); if (q.bill > 0) earn(q.bill, 'kantin'); spend(q.elec, 'elec');
    popup(CASHIER_POS.clone().add(new THREE.Vector3(0, 2.8, -0.6)), '+' + money(q.income + q.bill), '#ffe27a'); if (q.tip > 0) popup(CASHIER_POS.clone().add(new THREE.Vector3(1.0, 2.3, -0.6)), '+tip ' + money(q.tip), '#7affb2'); audio.cash();
  }
  if (q.birthday) { const ex = q.income * 0.6; earn(ex, 'tip'); popup(CASHIER_POS.clone().add(new THREE.Vector3(-0.9, 2.5, -0.6)), '🎂 Ulang tahun +' + money(ex), '#ffb3e6'); }
  S.served += q.size; S.qp.served += q.size; if (q.vip) S.qp.vip++; S.sat = Math.min(1, S.sat + 0.02 * q.size);
  q.members.forEach((m) => {
    let r = m.reg; if (!r && Math.random() < 0.35 && S.regs.length < 40) { r = { id: Date.now() + Math.random(), name: m.name, trait: m.trait, visits: 0, spent: 0, look: q.looks[m.idx], present: true }; S.regs.push(r); m.reg = r; }
    if (r) { const old = memberLvl(r); r.visits++; r.spent += q.income / q.size; if (memberLvl(r) > old) { const lv = memberLvl(r); after(0.4, () => { say(m, 'Aku naik jadi ' + MEMBER[lv] + '!', 'good', 3.6); act(m, 'laugh', 2); audio.fanfare(); }); banner(`🎖 ${m.name} naik jadi ${MEMBER[lv]}! Bonus pendapatan makin besar`); } }
    setBubble(m, '😄');
    if (m.trait.baik > 0.55) { say(m, pick(LINES.tip), 'good', 3); if (Math.random() < 0.5) { const extra = q.income * 0.1; earn(extra, 'tip'); popup(m.p.position.clone().add(new THREE.Vector3(0, 2.8, 0)), '💚 tip ekstra ' + money(extra), '#7affb2'); } } else if (m === q.members[0]) say(m, pick(LINES.thanks), 'good', 3);
  });
  if (q.members[0].trait.baik > 0.7 && Math.random() < 0.25) after(6, () => { banner('😇 Temannya datang karena rekomendasi!'); spawnParty(); });
  goto(q, q.members.map(() => bayExit(q.bay)), 'toCar');
}
function updateParties(dt) {
  voiceBudget = Math.max(0, voiceBudget - dt * 2.5); const movers = []; const t = clockT;
  for (let i = parties.length - 1; i >= 0; i--) {
    const q = parties[i]; if (!parties.includes(q)) continue;
    switch (q.state) {
      case 'drive': break;
      case 'toDoor': case 'toLobbySeat': case 'toStation': case 'toCounter': case 'toCar': case 'angry': {
        let all = true; for (const m of q.members) { if (!moveMember(m, dt)) all = false; else poseStand(m.p, t); finishPose(m); movers.push(m); }
        if (all) {
          if (q.state === 'toDoor') arrivedInside(q);
          else if (q.state === 'toLobbySeat') { if (q.members.every((m) => m.seat)) beginSit(q, 'seated', q.members.map((m) => ({ pos: m.seat.pos, yaw: m.seat.yaw, y: m.seat.y }))); else q.state = 'seated'; }
          else if (q.state === 'toStation') beginSit(q, 'play', q.members.map((m, k) => ({ pos: seatAt(q.st, q.size, k), yaw: faceYaw(q.st), y: -0.42 })));
          else if (q.state === 'toCounter') { q.state = 'queue'; q.tQ = clockT; }
          else board(q);
        }
        break;
      }
      case 'sitDown': {
        q.t += dt; const k = Math.min(1, q.t / 0.9), e = smooth(k); const play = q.afterSit === 'play';
        q.members.forEach((m) => { const T = m.sitTo; m.p.position.x = m.from.x + (T.pos.x - m.from.x) * e; m.p.position.z = m.from.z + (T.pos.z - m.from.z) * e; m.p.rotation.y = smoothYaw(m.fromYaw, T.yaw, Math.min(1, e * 1.6)); const yy = T.y * Math.max(0, (k - 0.3) / 0.7); if (k < 0.4) poseWalk(m.p, t, 0.4); else if (play) poseSitPlay(m.p, t, 0); else { m.sitY = T.y; poseSitRelax(m); } m.p.position.y = yy; if (k >= 1 && play && !m.p.userData.controller) attachController(m.p, m.idx ? 0x14151a : 0xf4f5fa); finishPose(m); });
        if (k >= 1) { if (play) startPlay(q); else q.state = 'seated'; }
        break;
      }
      case 'seated': {
        q.patience -= dt * (1 - Math.min(0.5, S.staff * 0.12)) * (q.members.some((m) => m.food) ? 0.5 : 1); const r = q.patience / q.maxPat;
        q.members.forEach((m) => { if (m.seat) poseSitRelax(m); else poseStand(m.p, t); if (!m.food && !m.dlg && !m.ordered) setBubble(m, r > 0.6 ? '🙂' : r > 0.3 ? '😐' : '😠'); updateEating(m, dt); finishPose(m); });
        if (freeStations().length) { const head = waitingParties()[0]; if (head === q || q.vip) tryAssign(q); }
        if (q.state === 'seated') { if (q.patience <= 0) leaveAngry(q, 'Kelamaan antre, pelanggan pergi!'); else social(q, dt); }
        break;
      }
      case 'standUp': {
        q.t += dt; const k = Math.min(1, q.t / 0.7), e = smooth(k);
        q.members.forEach((m) => { const T = m.standTo; m.p.position.x = m.from.x + (T.x - m.from.x) * e; m.p.position.z = m.from.z + (T.z - m.from.z) * e; m.p.position.y = m.fromY * (1 - e); if (k < 0.6) { if (q.afterStand === 'pay') poseSitPlay(m.p, t, 0); else poseSitRelax(m); m.p.position.y = m.fromY * (1 - e); } else poseStand(m.p, t); m.p.rotation.y = smoothYaw(m.fromYaw, Math.atan2(T.x - m.from.x, T.z - m.from.z), Math.min(1, e * 2)); finishPose(m); });
        if (k >= 1) {
          q.members.forEach((m) => { m.p.position.y = 0; });
          if (q.afterStand === 'station') goto(q, q.members.map((m, k2) => frontAt(q.st, q.size, k2)), 'toStation');
          else {
            const st = q.st, d = S.st[st.i]; st.busy = false; st.party = null; q.members.forEach((m) => { if (m.food) { m.p.userData.hips.remove(m.food); m.food = null; } });
            let inc = 0; const per = personIncome(d); q.members.forEach((m) => { const ml = m.reg ? memberLvl(m.reg) : 0; inc += per * (1 + 0.05 * ml) * (q.vip ? 3 : q.type === 'gamer' ? 1.15 : 1); });
            q.income = inc; q.tip = inc * (SOFAS[d.s].tip + (S.sat > 0.8 ? 0.04 : 0) + q.members.reduce((a, m) => a + m.trait.baik * 0.04, 0)); q.elec = elecCost(d) * q.size;
            const idx = parties.filter((o) => o.state === 'toCounter' || o.state === 'queue' || o.state === 'pay').length % payQueue.length;
            goto(q, q.members.map((m, k2) => payQueue[idx].clone().add(new THREE.Vector3(k2 * 0.7, 0, 0))), 'toCounter');
          }
        }
        break;
      }
      case 'play': {
        const st = q.st;
        if (!st.broken && !blackout && Math.random() < dt * 0.005 * (1 - Math.min(0.5, S.staff * 0.15)) * (1 + S.st[st.i].c * 0.12)) breakStation(st);
        if (st.broken) {
          st.brokenT += dt; q.members.forEach((m) => { poseSitPlay(m.p, t, 0); finishPose(m); });
          if (S.staff > 0 && st.brokenT > 7 / S.staff) fixStation(st, true);
          else if (st.brokenT > 25) { st.broken = false; if (st.alert) { st.g.remove(st.alert); st.alert = null; } st.busy = false; st.party = null; leaveAngry(q, 'Konsol rusak — pelanggan pergi!'); }
          break;
        }
        if (!blackout) q.t += dt; else { q.members.forEach((m) => { poseSitPlay(m.p, t, 0); finishPose(m); }); break; }
        const cheering = st.cheerT > 0; st.cheerT = Math.max(0, st.cheerT - dt);
        if (!cheering && Math.random() < dt * 0.1) { st.cheerT = 1.1; audio.cheer(); }
        if (q.t > q.orderAt && S.snack > 0) q.members.forEach((m) => { if (!m.ordered && !m.food && !m.hadOrder && Math.random() < dt * 0.3 * (0.3 + m.trait.lapar)) { m.hadOrder = true; orderFood(q, m, 'station'); } });
        q.members.forEach((m) => { if (cheering) poseCheer(m.p, t); else poseSitPlay(m.p, t, Math.sin(t * 0.7 + q.t) > 0.8 ? 0.7 : 0.1); updateEating(m, dt); finishPose(m); });
        social(q, dt);
        if (q.t >= q.len) { q.members.forEach((m) => setBubble(m, '😊')); beginStand(q, 'pay', q.members.map((m, k2) => frontAt(st, q.size, k2))); }
        break;
      }
      case 'queue': {
        q.members.forEach((m) => { poseStand(m.p, t); m.p.rotation.y = 0; finishPose(m); });
        const head = parties.filter((o) => o.state === 'queue').sort((a, b) => a.tQ - b.tQ)[0]; if (!cashierBusy && head === q) { cashierBusy = q; q.state = 'pay'; q.t = 0; q.members.forEach((m) => setBubble(m, '💵')); }
        social(q, dt); break;
      }
      case 'pay': {
        q.t += dt * (1 + S.kasir * 0.6); q.members.forEach((m) => { poseStand(m.p, t); m.p.rotation.y = 0; finishPose(m); }); if (q.t >= 1.2) completePay(q); break;
      }
      default: break;
    }
  }
  separate(movers.concat(staffNPCs), dt);
}

// ---- konsol hang ----
function breakStation(st) {
  st.broken = true; st.brokenT = 0; audio.error(); const sp = emojiSprite('⚠️'); sp.scale.set(0.9, 0.9, 1); sp.position.set(0, 2.9, 1.6); st.g.add(sp); st.alert = sp;
  if (st.party) st.party.members.forEach((m) => { setBubble(m, '😟'); say(m, 'Yah konsolnya hang!', 'bad', 3); });
  popup(toWorld(st, 0, 3.4, 1.6), 'Konsol hang! Tap untuk perbaiki', '#fbbf24');
}
function fixStation(st, auto) {
  if (!st.broken) return; st.broken = false; if (st.alert) { st.g.remove(st.alert); st.alert = null; } S.cnt.fix++; audio.buy(); popup(toWorld(st, 0, 3, 1.6), auto ? '🔧 Pegawai memperbaiki' : '🔧 Diperbaiki!', '#7affb2');
  if (st.party) st.party.members.forEach((m) => { setBubble(m, '🎮'); say(m, 'Nah gitu dong, lanjut!', 'good', 2.4); }); if (!auto) earn(Math.max(300, incomeRate() * 2), 'tip');
}

// ---- NPC kasir & pegawai ----
const cashier = makePerson({ kind: 'staff', shirt: 0x2563eb, pants: 0x1f2937, girl: true, apron: true, headset: true }); cashier.position.copy(CASHIER_POS); cashier.rotation.y = Math.PI; scene.add(cashier);
cashier.m = { p: cashier, alive: true, dlg: null, dlgUntil: 0, girl: true, gest: null, gestUntil: 0 };
function syncStaff() { while (staffNPCs.length < S.staff) { const p = makePerson({ kind: 'staff', shirt: 0x0ea5e9, pants: 0x111827, apron: true, cap: true, girl: staffNPCs.length % 2 === 1 }); p.position.set(-1 + staffNPCs.length * 2, 0, HZ - 3); scene.add(p); staffNPCs.push({ p, path: [], pi: 0, wait: 2, arrived: true, speed: 1.7, v: 0, speedMul: 1 }); } }
function updateStaff(dt) { for (const s of staffNPCs) { if (s.arrived) { s.wait -= dt; poseStand(s.p, clockT); if (s.wait <= 0) { const owned = stations.filter((x) => S.st[x.i].o); const tgt = owned.length && Math.random() < 0.8 ? frontAt(pick(owned), 1, 0) : new THREE.Vector3(-1 + Math.random() * 6, 0, 3 + Math.random() * 1.5); s.path = findPath(s.p.position, tgt); s.pi = 0; s.arrived = false; s.wait = 3 + Math.random() * 4; } } else moveMember(s, dt); } }

// ================= HARI, BIAYA, ACARA =================
function updateClock(dt) {
  S.clock += dt / 10;
  if (S.clock >= 24) {
    S.clock -= 24; const rent = dailyRent(), sal = dailySalary(); spend(rent, 'rent'); spend(sal, 'sal'); S.y = S.d; S.d = NEWD(); const p = dayProfit(S.y);
    S.day++; banner(`📊 Laporan hari ke-${S.day - 1}: pendapatan ${money(S.y.inc + S.y.kantin + S.y.tip)} · biaya ${money(S.y.elec + S.y.rent + S.y.sal + S.y.cogs + S.y.broken)} · LABA ${money(p)}`); audio.quest(); save(); if (tab === 'fin') renderAll();
  }
}
let nextEvent = 55;
function updateEvents(dt) {
  if (blackout && Date.now() > blackoutUntil) { blackout = false; $('genBtn').classList.add('hidden'); banner('💡 Listrik menyala kembali'); audio.buy(); }
  if (blackout && Math.random() < dt * 0.25) { const m = pick(allMembers()); if (m) say(m, pick(LINES.blackout), 'shout', 2.6); }
  nextEvent -= dt; if (nextEvent > 0) return; nextEvent = 70 + Math.random() * 80; const r = Math.random();
  if (r < 0.16) { eventName = 'turnamen'; eventMult = 1.8; eventUntil = Date.now() + 35000; banner('🏆 Turnamen FIFA! Pendapatan ×1,8 selama 35 detik'); audio.horn(); }
  else if (r < 0.32) { eventName = 'rombongan'; eventUntil = Date.now() + 25000; eventMult = 1; banner('🚌 Rombongan anak sekolah datang!'); audio.horn(); for (let i = 0; i < 4; i++) after(i * 1.2, () => spawnParty()); }
  else if (r < 0.43) { banner('⭐ Streamer terkenal mampir ke tokomu!'); audio.horn(); spawnParty(true); }
  else if (r < 0.55) { banner('🎂 Ada yang ulang tahun! Rombongan traktiran datang'); audio.fanfare(); birthdayNext = true; spawnParty(); }
  else if (r < 0.74) { rainUntil = Date.now() + 80000; banner('🌧 Hujan deras turun! Pelanggan agak sepi tapi betah'); }
  else if (r < 0.88) { if (S.genset > 0) { banner('⚡ Listrik padam — genset menyala otomatis!'); audio.buy(); } else { blackout = true; blackoutUntil = Date.now() + 22000; banner('⚡ LISTRIK PADAM! Tap "Hidupkan Genset" atau tunggu'); audio.error(); $('genBtn').classList.remove('hidden'); } }
  else { eventName = 'promo'; eventMult = 1.4; eventUntil = Date.now() + 30000; banner('🎉 Diskon viral di medsos! Pendapatan ×1,4'); audio.quest(); }
}
$('genBtn').onclick = () => { blackoutUntil = 0; audio.buy(); };

// ================= MISI, PRESTASI, TUTORIAL =================
function genQuests(ep) {
  let seed = ep * 9301 + 49297; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const pool = ['earn', 'serve', 'upg', 'tier', 'vip', 'rep']; for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const earnT = Math.round(30000 * Math.pow(1.75, ep) / 1000) * 1000;
  return pool.slice(0, 3).map((t) => (t === 'earn' ? { t, n: earnT } : t === 'serve' ? { t, n: 8 + ep * 3 } : t === 'upg' ? { t, n: 2 + Math.floor(ep / 2) } : t === 'tier' ? { t, n: Math.min(NSLOT, 1 + Math.floor(ep / 2)), tier: Math.min(4, 1 + Math.floor(ep / 3)) } : t === 'vip' ? { t, n: 1 + Math.floor(ep / 4) } : { t, n: Math.min(4.5, 2 + ep * 0.3) }));
}
const qDesc = (q) => ({ earn: () => `Hasilkan ${money(q.n)}`, serve: () => `Layani ${q.n} pelanggan`, upg: () => `Beli ${q.n} upgrade`, tier: () => `${q.n} stasiun dengan ${CONSOLES[q.tier].name}+`, vip: () => `Layani ${q.n} pelanggan VIP`, rep: () => `Reputasi ${q.n.toFixed(1)}★` }[q.t])();
const qProg = (q) => ({ earn: S.qp.earn, serve: S.qp.served, upg: S.qp.upg, tier: S.st.filter((d) => d.o && d.c >= q.tier).length, vip: S.qp.vip, rep: rep() }[q.t]);
function checkQuests() {
  if (!S.qs) S.qs = genQuests(S.ep);
  if (S.qs.every((q) => qProg(q) >= q.n)) { const reward = Math.max(Math.round(40000 * Math.pow(1.6, S.ep)), Math.round(incomeRate() * 60 * 4)); S.money += reward; S.ep++; S.qp = { earn: 0, served: 0, upg: 0, vip: 0 }; S.qs = genQuests(S.ep); audio.levelUp(); banner(`🏅 Episode ${S.ep} selesai! Bonus ${money(reward)} · +2% pendapatan permanen`); renderAll(); }
}
const ACH = [
  { id: 's50', n: '🙋 Pelanggan Pertama', d: 'Layani 50 pelanggan', ok: () => S.served >= 50, r: 40000 }, { id: 's500', n: '🎉 Langganan Setia', d: 'Layani 500 pelanggan', ok: () => S.served >= 500, r: 600000 }, { id: 's5000', n: '🏙 Tersohor se-Kota', d: 'Layani 5.000 pelanggan', ok: () => S.served >= 5000, r: 12000000 },
  { id: 'e1m', n: '💰 Jutawan', d: 'Total penghasilan Rp 1 Jt', ok: () => S.life >= 1e6, r: 80000 }, { id: 'e1b', n: '🏦 Miliarder', d: 'Total penghasilan Rp 1 M', ok: () => S.life >= 1e9, r: 20000000 },
  { id: 'all9', n: '🏬 Toko Penuh', d: 'Buka semua 9 slot stasiun', ok: () => stationsOwned() >= NSLOT, r: 900000 }, { id: 'ps5', n: '🎮 Sultan PS5', d: 'Punya PS5 Pro', ok: () => S.st.some((d) => d.o && d.c >= 4), r: 1500000 }, { id: 'tv77', n: '📺 Bioskop Mini', d: 'Pasang TV 77"', ok: () => S.st.some((d) => d.o && d.t >= 4), r: 1500000 },
  { id: 'rep5', n: '⭐ Bintang Lima', d: 'Reputasi 5★', ok: () => rep() >= 4.5, r: 500000 }, { id: 'ep5', n: '📋 Pekerja Keras', d: 'Selesaikan 5 episode', ok: () => S.ep >= 5, r: 800000 }, { id: 'ep20', n: '🏅 Legenda Episode', d: 'Selesaikan 20 episode', ok: () => S.ep >= 20, r: 30000000 },
  { id: 'fr1', n: '👑 Pengusaha Franchise', d: 'Buka franchise pertama', ok: () => S.franchises >= 1, r: 100000 }, { id: 'fix10', n: '🔧 Teknisi Handal', d: 'Perbaiki 10 konsol hang', ok: () => S.cnt.fix >= 10, r: 300000 }, { id: 'tap100', n: '👆 Kasir Cepat', d: 'Tap kasir 100 kali', ok: () => S.cnt.tap >= 100, r: 200000 },
  { id: 'hh10', n: '🔥 Raja Happy Hour', d: 'Pakai Happy Hour 10 kali', ok: () => S.cnt.hh >= 10, r: 500000 }, { id: 'ord50', n: '🍜 Juragan Kantin', d: 'Layani 50 pesanan kantin', ok: () => S.cnt.orders >= 50, r: 400000 },
  { id: 'gold', n: '🥇 Pelanggan Emas', d: 'Punya 1 member Gold', ok: () => S.regs.some((r) => memberLvl(r) >= 2), r: 500000 }, { id: 'br1', n: '🏢 Cabang Pertama', d: 'Buka cabang baru', ok: () => branchCount() >= 1, r: 1000000 }, { id: 'theft', n: '🕵 Waspada', d: 'Kena maling 3 kali (sial!)', ok: () => S.cnt.theft >= 3, r: 150000 },
];
function checkAch() { for (const a of ACH) if (!S.ach[a.id] && a.ok()) { S.ach[a.id] = 1; const r = Math.max(a.r, Math.round(incomeRate() * 90)); S.money += r; audio.quest(); banner(`🏆 Prestasi: ${a.n} · Hadiah ${money(r)}`); if (tab === 'ach') renderAll(); } }
const TUT = [
  { t: '👋 Selamat datang! Pelanggan datang naik motor/mobil, main PS, lalu bayar di kasir. Tunggu pelanggan pertama.', ok: () => S.served >= 1 },
  { t: '⭐ Buka tab 🎮 Stasiun di panel kanan, beli "Level Layanan" untuk menaikkan pendapatan.', ok: () => S.qp.upg >= 1 || S.ep > 0 },
  { t: '🍜 Buka kantin di tab 🏪 Toko: pelanggan akan pesan Indomie, es & kopi — untungnya besar!', ok: () => S.snack >= 1 },
  { t: '🔓 Tambah stasiun di tab Stasiun (chip 🔒) supaya makin banyak pelanggan terlayani.', ok: () => stationsOwned() >= 3 },
  { t: '👆 Tap kasir untuk bonus. Tap pelanggan untuk lihat sifatnya & ikuti kamera. ⚠ di stasiun = konsol hang, tap untuk perbaiki.', ok: () => S.cnt.tap >= 1 },
  { t: '📊 Cek tab Laporan untuk laba harian. Selesaikan misi untuk naik episode — tanpa akhir. Selamat bermain!', ok: () => S.ep >= 1 },
];
function updateTutorial() { const el = $('tut'); if (S.tut >= TUT.length) { el.classList.add('hidden'); return; } if (TUT[S.tut].ok()) { S.tut++; audio.quest(); if (S.tut >= TUT.length) { el.classList.add('hidden'); return; } } el.classList.remove('hidden'); el.textContent = TUT[S.tut].t; }

// ================= UI =================
let tab = 'st';
const TABS = [['st', '🎮 Stasiun'], ['shop', '🏪 Toko'], ['staff', '🧑‍🔧 Staf'], ['br', '🏢 Cabang'], ['quest', '📋 Misi'], ['ach', '🏆 Prestasi'], ['fin', '📊 Laporan'], ['fr', '👑 Franchise']];
$('tabs').innerHTML = TABS.map(([k, l]) => `<button data-t="${k}">${l}</button>`).join('');
$('tabs').onclick = (e) => { const b = e.target.closest('button'); if (b) { audio.init(); audio.click(); tab = b.dataset.t; renderAll(); } };
function itemCard(id, title, desc, lvText, cost) { const can = cost !== null && cost !== undefined && S.money >= cost; const maxed = cost === null; return `<div class="card"><h4>${title}</h4><p>${desc}</p><span class="lv">${lvText}</span><button data-a="${id}" class="${can ? 'can' : ''}" ${maxed ? 'disabled' : ''}>${maxed ? 'MAKSIMAL' : 'Beli ' + money(cost)}</button></div>`; }
function stationItems(i) {
  const d = S.st[i]; if (!d.o) return [{ id: 'slot' + i, t: `🔓 Buka Slot ${i + 1}`, desc: 'Tambah stasiun baru untuk lebih banyak pelanggan. (Sewa +Rp 6 Rb/hari)', lv: 'Terkunci', cost: SLOT_COST[i] }];
  const nc = CONSOLES[d.c + 1], nt = TVS[d.t + 1], ns = SOFAS[d.s + 1];
  return [
    { id: 'con' + i, t: `🎮 ${CONSOLES[d.c].name}`, desc: nc ? `Upgrade ke ${nc.name} (pendapatan ×${(nc.mult / CONSOLES[d.c].mult).toFixed(1)}). Listrik naik.` : 'Konsol terbaik.', lv: `×${CONSOLES[d.c].mult} · Rp ${Math.round(personIncome(d)).toLocaleString('id-ID')}/orang/jam`, cost: nc ? nc.cost : null },
    { id: 'tv' + i, t: `📺 ${TVS[d.t].name}`, desc: nt ? `Upgrade ke ${nt.name}.` : 'TV terbesar.', lv: `×${TVS[d.t].mult}`, cost: nt ? nt.cost : null },
    { id: 'sofa' + i, t: `🛋 ${SOFAS[d.s].name}`, desc: ns ? `Upgrade ke ${ns.name}: tip lebih besar.` : 'Sofa terbaik.', lv: `tip +${Math.round(SOFAS[d.s].tip * 100)}%`, cost: ns ? ns.cost : null },
    { id: 'lay' + i, t: `⭐ Level Layanan ${d.l}`, desc: '+10% pendapatan stasiun ini tiap level. Tanpa batas.', lv: `listrik/sesi ${money(elecCost(d))}`, cost: growth(20000, 1.5, d.l) },
  ];
}
function finRows(d, title) {
  const inc = d.inc + d.kantin + d.tip, exp = d.elec + d.rent + d.sal + d.cogs + d.broken, p = inc - exp; const row = (a, b, cls = '') => `<div class="fr ${cls}"><span>${a}</span><b>${money(b)}</b></div>`;
  return `<div class="qlist"><h4>${title}</h4>${row('Sewa PS', d.inc)}${row('Kantin', d.kantin)}${row('Tip', d.tip)}${row('Total pendapatan', inc, 'tot')}${row('Listrik', -d.elec)}${row('Sewa tempat', -d.rent)}${row('Gaji & operasional', -d.sal)}${row('Bahan kantin', -d.cogs)}${row('Stik rusak', -d.broken)}${row('Total biaya', -exp, 'tot')}${row('LABA BERSIH', p, p >= 0 ? 'good' : 'bad')}<small>Margin ${inc > 0 ? Math.round((p / inc) * 100) : 0}%${d.theft ? ' · hilang karena kabur: ' + money(d.theft) : ''}</small></div>`;
}
function renderAll() {
  [...$('tabs').children].forEach((b) => b.classList.toggle('on', b.dataset.t === tab)); let h = '';
  if (tab === 'st') { h += '<div class="chips">' + S.st.map((d, i) => `<button data-s="${i}" class="${i === selected ? 'on' : ''}">${d.o ? '🎮' : '🔒'} ${i + 1}</button>`).join('') + '</div><div class="cards">' + stationItems(selected).map((x) => itemCard(x.id, x.t, x.desc, x.lv, x.cost)).join('') + '</div>'; }
  else if (tab === 'shop' || tab === 'staff') { const list = tab === 'shop' ? SHOP : STAFF; h += '<div class="cards">' + list.map((u) => { const lv = S[u.lvKey]; return itemCard('up' + u.id, u.name, u.desc, u.eff(lv), lv >= u.max ? null : u.cost(lv)); }).join('') + '</div>'; }
  else if (tab === 'br') {
    h += '<div class="cards"><div class="note">Cabang = bangunan baru di sebelah. Tiap cabang menambah pendapatan +30% (dan +10% per level upgrade) dari seluruh bisnis, tapi sewa +Rp 25 Rb/hari.</div>' + S.br.map((b, i) => {
      if (!b.o) return i === branchCount() ? itemCard('bb' + i, `🏗 ${BRANCH_NAME[i]}`, 'Bangun cabang baru di lahan kosong.', 'Belum dibangun', BRANCH_COST[i]) : `<div class="card"><h4>🔒 ${BRANCH_NAME[i]}</h4><p>Bangun cabang sebelumnya dulu.</p></div>`;
      return itemCard('bu' + i, `🏢 ${BRANCH_NAME[i]}`, 'Upgrade: +10% pendapatan per level. Tanpa batas.', `Level ${b.l} · +${Math.round((0.3 + 0.1 * b.l) * 100)}%`, growth(3000000 * (i + 1), 1.7, b.l));
    }).join('') + '</div>';
  }
  else if (tab === 'quest') h += '<div class="qlist">' + `<h4>Episode ${S.ep + 1}</h4>` + (S.qs || []).map((q) => { const p = Math.min(qProg(q), q.n); return `<div class="q ${p >= q.n ? 'done' : ''}"><span>${p >= q.n ? '✅' : '🎯'} ${qDesc(q)}</span><div class="bar"><i style="width:${Math.min(100, p / q.n * 100)}%"></i></div></div>`; }).join('') + '<small>Selesaikan semua misi untuk naik episode. Tidak ada habisnya — target & bonus makin besar.</small></div>';
  else if (tab === 'ach') { const got = ACH.filter((a) => S.ach[a.id]).length; h += `<div class="qlist"><h4>🏆 Prestasi ${got}/${ACH.length}</h4><div class="stat">Pelanggan: <b>${S.served.toLocaleString('id-ID')}</b> · Total: <b>${money(S.life)}</b> · Hari: <b>${S.day}</b> · Episode: <b>${S.ep + 1}</b> · Franchise: <b>${S.franchises}</b> · Member: <b>${S.regs.length}</b> · Pesanan kantin: <b>${S.cnt.orders}</b></div><div class="achs">` + ACH.map((a) => `<div class="ach ${S.ach[a.id] ? 'got' : ''}"><b>${S.ach[a.id] ? '✅' : '🔒'} ${a.n}</b><small>${a.d} · ${money(a.r)}</small></div>`).join('') + '</div></div>'; }
  else if (tab === 'fin') { h += finRows(S.d, `📊 Hari ini (hari ke-${S.day})`) + finRows(S.y, 'Kemarin') + `<div class="qlist"><small>Biaya tetap per hari (dibayar tengah malam): sewa ${money(dailyRent())} + gaji/operasional ${money(dailySalary())}. Listrik dipotong tiap sesi, bahan kantin tiap pesanan. Member tetap: ${S.regs.length} orang.</small></div>`; }
  else { const stars = Math.floor(Math.sqrt(S.run / 1.5e6)); h += `<div class="cards"><div class="card"><h4>👑 Buka Franchise</h4><p>Reset toko (uang, upgrade, cabang) tapi dapat <b>Bintang Franchise</b>: +20% pendapatan per bintang, permanen. Member, prestasi & episode tetap. Bisa diulang tanpa batas.</p><span class="lv">Bintang: ${S.stars} · Tambahan jika reset: +${stars}</span><button data-a="franchise" class="${stars >= 1 ? 'can' : ''}" ${stars < 1 ? 'disabled' : ''}>${stars < 1 ? 'Butuh ' + money(1.5e6) + ' pendapatan' : 'Buka Franchise (+' + stars + '★)'}</button></div></div>`; }
  $('cards').innerHTML = h; renderQuestMini();
}
function renderQuestMini() { $('quests').innerHTML = `<b>Episode ${S.ep + 1}</b>` + (S.qs || []).map((q) => { const p = Math.min(qProg(q), q.n); return `<div class="qm ${p >= q.n ? 'done' : ''}">${p >= q.n ? '✅' : '▫'} ${qDesc(q)} <em>${q.t === 'earn' ? money(p) : q.t === 'rep' ? p.toFixed(1) : Math.floor(p)}/${q.t === 'earn' ? money(q.n) : q.t === 'rep' ? q.n.toFixed(1) : q.n}</em></div>`; }).join(''); }
function buy(a) {
  let ok = false; const aff = (c) => S.money >= c;
  if (a.startsWith('slot')) { const i = +a.slice(4); if (aff(SLOT_COST[i])) { S.money -= SLOT_COST[i]; S.st[i].o = 1; buildStation(stations[i]); buildGrid(); ok = true; } }
  else if (a.startsWith('con')) { const i = +a.slice(3), d = S.st[i], n = CONSOLES[d.c + 1]; if (n && aff(n.cost)) { S.money -= n.cost; d.c++; buildStation(stations[i]); buildGrid(); ok = true; } }
  else if (a.startsWith('tv')) { const i = +a.slice(2), d = S.st[i], n = TVS[d.t + 1]; if (n && aff(n.cost)) { S.money -= n.cost; d.t++; buildStation(stations[i]); ok = true; } }
  else if (a.startsWith('sofa')) { const i = +a.slice(4), d = S.st[i], n = SOFAS[d.s + 1]; if (n && aff(n.cost)) { S.money -= n.cost; d.s++; buildStation(stations[i]); buildGrid(); ok = true; } }
  else if (a.startsWith('lay')) { const i = +a.slice(3), d = S.st[i], c = growth(20000, 1.5, d.l); if (aff(c)) { S.money -= c; d.l++; ok = true; } }
  else if (a.startsWith('bb')) { const i = +a.slice(2); if (i === branchCount() && aff(BRANCH_COST[i])) { S.money -= BRANCH_COST[i]; S.br[i].o = 1; world.setBranches(branchCount()); ok = true; banner(`🏗 ${BRANCH_NAME[i]} dibuka! Pendapatan +30%`); } }
  else if (a.startsWith('bu')) { const i = +a.slice(2), b = S.br[i], c = growth(3000000 * (i + 1), 1.7, b.l); if (b.o && aff(c)) { S.money -= c; b.l++; ok = true; } }
  else if (a.startsWith('up')) { const id = a.slice(2), u = [...SHOP, ...STAFF].find((x) => x.id === id), lv = S[u.lvKey]; if (lv < u.max && aff(u.cost(lv))) { S.money -= u.cost(lv); S[u.lvKey]++; if (id === 'staff') syncStaff(); if (['ac', 'decor', 'lobby'].includes(id)) buildDecor(); if (id === 'kantin') { buildKantin(); if (lv === 0) banner('🍜 Kantin dibuka! Pelanggan mulai pesan jajanan'); else drawMenu(); } ok = true; } }
  else if (a === 'franchise') { const stars = Math.floor(Math.sqrt(S.run / 1.5e6)); if (stars >= 1) { doFranchise(stars); return; } }
  if (ok) { S.qp.upg++; audio.buy(); toast('Berhasil dibeli!'); renderAll(); save(); checkQuests(); } else { audio.error(); toast('Uang belum cukup'); }
}
function doFranchise(stars) {
  const keep = { stars: S.stars + stars, ep: S.ep, qs: S.qs, qp: S.qp, life: S.life, served: S.served, music: S.music, sfx: S.sfx, day: S.day, clock: S.clock, franchises: S.franchises + 1, ach: S.ach, cnt: S.cnt, tut: S.tut, regs: S.regs, y: S.y };
  S = { ...defaultState(), ...keep }; S.money = 25000; S.regs.forEach((r) => (r.present = false));
  parties.slice().forEach((q) => { q.members.forEach((m) => { m.alive = false; scene.remove(m.p); }); if (q.vehicle) { q.vehicle.remove = true; q.vehicle.done = true; } q.bay.taken = false; }); parties.length = 0; cashierBusy = null; tasks.length = 0; stations.forEach((s) => { s.busy = false; s.reserved = false; s.broken = false; });
  BAYS.forEach((b) => { b.taken = b.fixed; }); stations.forEach(buildStation); buildKantin(); buildDecor(); syncStaff(); world.setBranches(0); renderAll(); audio.levelUp(); banner(`👑 Franchise baru dibuka! Total ${S.stars}★ (+${stars}) — pendapatan permanen naik`); save();
}
$('cards').onclick = (e) => { audio.init(); const chip = e.target.closest('[data-s]'); if (chip) { selected = +chip.dataset.s; audio.click(); renderAll(); return; } const b = e.target.closest('button[data-a]'); if (b && !b.disabled) buy(b.dataset.a); else if (b) audio.error(); };
let toastT = 0; function toast(t) { const el = $('toast'); el.textContent = t; el.style.opacity = 1; clearTimeout(toastT); toastT = setTimeout(() => (el.style.opacity = 0), 1500); }
let banT = 0; function banner(t) { const el = $('banner'); el.textContent = t; el.classList.add('show'); clearTimeout(banT); banT = setTimeout(() => el.classList.remove('show'), 5500); }
function syncPrefs() { $('btnMus').textContent = S.music ? '🎵' : '🔇'; $('btnSfx').textContent = S.sfx ? '🔊' : '🔈'; $('btnMus').classList.toggle('off', !S.music); $('btnSfx').classList.toggle('off', !S.sfx); }
$('btnMus').onclick = () => { audio.init(); S.music = !S.music; audio.setMusic(S.music); syncPrefs(); save(); };
$('btnSfx').onclick = () => { audio.init(); S.sfx = !S.sfx; audio.setSfx(S.sfx); syncPrefs(); save(); if (S.sfx) audio.click(); };
$('btnHH').onclick = () => { audio.init(); const now = Date.now(); if (now < S.hhReady) { toast('Happy Hour siap lagi dalam ' + Math.ceil((S.hhReady - now) / 1000) + ' dtk'); audio.error(); return; } S.cnt.hh++; S.hhUntil = now + 40000; S.hhReady = now + 130000; audio.horn(); banner('🔥 HAPPY HOUR! Pelanggan ×2, pendapatan ×1,5 selama 40 detik'); };

// ================= KAMERA =================
const PRESETS = { pano: { az: 0.18, el: 0.86, dist: 29, tx: 0, tz: 2.5, ty: 0.2 }, inside: { az: 0.0, el: 0.32, dist: 15, tx: 0, tz: 1.5, ty: 1.0 }, parking: { az: 0.3, el: 0.5, dist: 32, tx: 0, tz: 20, ty: 0 } };
const cam = { ...PRESETS.pano }, camT = { ...PRESETS.pano }; let camMode = 'pano', followM = null, followAz = 0;
function setCam(mode) { camMode = mode; if (PRESETS[mode]) { Object.assign(camT, PRESETS[mode]); followM = null; } if (mode === 'follow') { if (!followM) followM = pick(allMembers().filter((m) => m.alive)); if (!followM) { setCam('pano'); return; } camT.dist = 6.5; camT.el = 0.38; showNpc(followM); } else if (mode !== 'follow') hideNpc(); document.querySelectorAll('#camBtns button').forEach((b) => b.classList.toggle('on', b.dataset.cam === mode)); }
document.querySelectorAll('#camBtns button').forEach((b) => (b.onclick = () => { audio.init(); audio.click(); setCam(b.dataset.cam); }));
const STATE_TXT = { drive: 'Sedang parkir', toDoor: 'Menuju pintu', toLobbySeat: 'Mencari kursi tunggu', sitDown: 'Duduk', seated: 'Menunggu giliran', standUp: 'Berdiri', toStation: 'Menuju stasiun PS', play: 'Lagi main PS 🎮', toCounter: 'Menuju kasir', queue: 'Antre bayar', pay: 'Membayar', toCar: 'Pulang', angry: 'Pergi kesal' };
let npcSel = null;
function showNpc(m) { npcSel = m; $('npcInfo').classList.remove('hidden'); updateNpc(); }
function hideNpc() { npcSel = null; $('npcInfo').classList.add('hidden'); }
function updateNpc() { const m = npcSel; if (!m) return; if (!m.alive) { hideNpc(); if (camMode === 'follow') setCam('pano'); return; } const tr = m.trait, r = m.reg; const bar = (v) => '█'.repeat(Math.round(v * 5)) + '░'.repeat(5 - Math.round(v * 5)); $('npcInfo').innerHTML = `<b>${m.name}</b> <span>${tr.label}</span><div>${r ? MEMBER[memberLvl(r)] + ' · kunjungan ' + r.visits : 'Pelanggan baru'}</div><div>${STATE_TXT[m.q.state] || ''}</div><small>Nakal ${bar(tr.nakal)} Baik ${bar(tr.baik)} Emosi ${bar(tr.emosi)} Ramai ${bar(tr.rame)}</small><div class="nb"><button id="npcFollow">${camMode === 'follow' ? '👁 Panorama' : '👤 Ikuti'}</button><button id="npcClose">✖</button></div>`; $('npcFollow').onclick = () => { if (camMode === 'follow') setCam('pano'); else { followM = m; setCam('follow'); } }; $('npcClose').onclick = () => { hideNpc(); if (camMode === 'follow') setCam('pano'); }; }

// ================= INPUT =================
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let drag = null, moved = 0, pinch = null; const cv = $('gl'); const pts = new Map();
cv.addEventListener('pointerdown', (e) => { audio.init(); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); drag = { x: e.clientX, y: e.clientY }; moved = 0; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } });
addEventListener('pointermove', (e) => {
  if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); camT.dist = Math.max(4, Math.min(50, camT.dist - (d - pinch) * 0.06)); pinch = d; moved = 99; return; }
  if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved += Math.abs(dx) + Math.abs(dy);
  if (camMode === 'follow') { followAz -= dx * 0.006; } else camT.az -= dx * 0.006; camT.el = Math.max(0.12, Math.min(1.3, camT.el + dy * 0.004)); drag = { x: e.clientX, y: e.clientY };
});
addEventListener('pointerup', (e) => { const had = pts.delete(e.pointerId); if (had && drag && moved < 8 && pts.size === 0) tap(e); if (!pts.size) { drag = null; pinch = null; } });
cv.addEventListener('wheel', (e) => { camT.dist = Math.max(4, Math.min(50, camT.dist + e.deltaY * 0.03)); e.preventDefault(); }, { passive: false });
function tap(e) {
  ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ptr, camera);
  const ms = allMembers().filter((m) => m.alive); const hits = ray.intersectObjects(ms.map((m) => m.p), true);
  if (hits.length) { let o = hits[0].object; const mm = ms.find((m) => { let x = o; while (x) { if (x === m.p) return true; x = x.parent; } return false; }); if (mm) { audio.click(); showNpc(mm); return; } }
  const ch = ray.intersectObjects([cashier, counter], true)[0]; if (ch) { const bonus = Math.max(150, incomeRate() * 1.2); earn(bonus, 'tip'); S.cnt.tap++; audio.coin(); popup(CASHIER_POS.clone().add(new THREE.Vector3(0, 2.8, -0.4)), '+' + money(bonus), '#ffe27a'); say(cashier.m, pick(['Silakan kak!', 'Makasih ya!', 'Ada yang bisa dibantu?']), 'say', 2); act(cashier.m, 'wave', 1.6); return; }
  const brk = stations.find((s) => s.broken && ray.ray.distanceToPoint(toWorld(s, 0, 2.9, 1.6)) < 1.4); if (brk) { fixStation(brk, false); return; }
  let best = null, bd = 1e9; stations.forEach((s) => { const c = toWorld(s, 0, 1, 1.6); const r = ray.ray.distanceToPoint(c); if (r < 1.6) { const d = c.distanceTo(ray.ray.origin); if (d < bd) { bd = d; best = s; } } });
  if (best) { selected = best.i; tab = 'st'; audio.click(); renderAll(); if (!S.st[best.i].o && S.money >= SLOT_COST[best.i]) buy('slot' + best.i); }
}
function onResize() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = h < 520 ? 52 : w < 700 ? 56 : 42;
  const side = $('side'); const open = !side.classList.contains('closed'); const sw = open ? side.getBoundingClientRect().width + 8 : 0; document.body.classList.toggle('noside', !open);
  if (sw > 0 && w > 600) camera.setViewOffset(w, h, sw / 2, 0, w, h); else camera.clearViewOffset(); camera.updateProjectionMatrix();
  const portrait = h > w && (matchMedia('(pointer:coarse)').matches || w < 700); $('rotate').classList.toggle('hidden', !portrait);
}
addEventListener('resize', onResize); addEventListener('orientationchange', () => setTimeout(onResize, 200));
$('btnSide').onclick = () => { $('side').classList.toggle('closed'); onResize(); audio.init(); audio.click(); };
$('btnFull').onclick = () => { try { const el = document.documentElement; if (document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen().then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {}); } catch (e) { /* abaikan */ } };
addEventListener('pointerdown', () => { try { if (matchMedia('(pointer:coarse)').matches) { const el = document.documentElement; const fs = el.requestFullscreen ? el.requestFullscreen() : null; if (fs) fs.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {}); } } catch (e) { /* abaikan */ } }, { once: true });

// ================= LOOP =================
let arrive = 3, saveT = 0, uiT = 0, last = performance.now(), blipT = 0, qT = 0, thunderT = 15, carT = 8;
function simStep(dt) {
  clockT += dt; updateClock(dt); updateEvents(dt); updateLater(dt);
  arrive -= dt; if (arrive <= 0) { arrive = arrivalEvery() * (0.7 + Math.random() * 0.6); if (parties.filter((p) => PRE.includes(p.state)).length < 8) spawnParty(); }
  updateParties(dt); updateWaiter(dt); updateStaff(dt); updateFloaters(dt);
  cashier.m.p = cashier; if (cashierBusy && cashierBusy.state === 'pay') poseType(cashier, clockT); else poseStand(cashier, clockT); finishPose(cashier.m);
  let near = false; const dp = new THREE.Vector3(0, 0, HZ); for (const m of allMembers()) if (m.p.position.distanceTo(dp) < 2.6) near = true; for (const s of staffNPCs) if (s.p.position.distanceTo(dp) < 2.6) near = true;
  const tx = near ? 1.55 : 0.75; doorL.position.x += (-tx - doorL.position.x) * Math.min(1, dt * 6); doorR.position.x += (tx - doorR.position.x) * Math.min(1, dt * 6);
  for (const st of stations) { if (!S.st[st.i].o) continue; if ((st.flash -= dt) <= 0) { st.flash = st.busy ? 0.09 : 0.12; drawTV(st, clockT + st.i * 3, st.busy); } if (st.glow) { st.glow.color.set(st.busy ? GCOL[st.genre % 5] : '#5588ff'); st.glow.intensity = blackout ? 0 : st.busy ? 4.5 + Math.sin(clockT * 12 + st.i) * 1.2 : 1.6; } if (st.led) st.led.material.color.set(blackout ? 0x000000 : st.busy ? 0x33ff88 : 0x3b82f6); }
  blipT -= dt; if (blipT <= 0) { blipT = 0.3 + Math.random() * 0.6; if (stations.some((s) => s.busy) && !blackout) audio.blip(); }
  carT -= dt; if (carT <= 0) { carT = 10 + Math.random() * 12; audio.car(); }
}
function frame(now) {
  const rdt = Math.min(0.06, (now - last) / 1000); last = now;
  for (let i = 0; i < TS; i++) simStep(rdt);
  const raining = Date.now() < rainUntil; audio.setRain(raining); if (raining) { thunderT -= rdt; if (thunderT <= 0) { thunderT = 12 + Math.random() * 14; audio.thunder(); } }
  const env = world.update(rdt * TS, S.clock, raining, camera.position, { sun, hemi, fog: scene.fog }); sun.target.position.set(0, 0, 8);
  if (blackout) { hemi.intensity *= 0.55; sun.intensity *= 0.7; }
  const nightK = env.night; ceilL.forEach((l) => { l.intensity = blackout ? 0 : 7 + nightK * 7; }); neonL.intensity = blackout ? 0 : (14 + Math.sin(clockT * 2) * 3) * (0.7 + nightK * 1.1); neonR.intensity = blackout ? 0 : (14 + Math.cos(clockT * 2.3) * 3) * (0.7 + nightK * 1.1); ledMats.forEach((m) => m.color.setScalar(blackout ? 0.05 : 1).multiply(new THREE.Color(m === ledMats[0] ? 0xf472b6 : m === ledMats[1] ? 0x3b82f6 : 0x8b5cf6)));
  pend.forEach((m) => m.material.color.setRGB(blackout ? 0.1 : 1, blackout ? 0.1 : 0.94 - nightK * 0.1, blackout ? 0.1 : 0.8 - nightK * 0.3));
  const ss = stations[selected]; selRing.position.copy(toWorld(ss, 0, 0.05, 1.8)); selRing.rotation.z = ss.slot.ry; selRing.material.opacity = 0.5 + Math.sin(clockT * 4) * 0.3; selRing.visible = tab === 'st';
  // kamera halus
  if (camMode === 'follow' && followM && followM.alive) { camT.tx = followM.p.position.x; camT.tz = followM.p.position.z; camT.ty = 1.2; if (followM.v > 0.4 || !followM.q || followM.q.state !== 'play') camT.az = smoothYaw(camT.az, followM.p.rotation.y + Math.PI + followAz, Math.min(1, rdt * 1.5)); } else if (camMode === 'follow') setCam('pano');
  const k = 1 - Math.exp(-rdt * (camMode === 'follow' ? 6 : 4)); cam.az = smoothYaw(cam.az, camT.az, k); for (const key of ['el', 'dist', 'tx', 'tz', 'ty']) cam[key] += (camT[key] - cam[key]) * k;
  camera.position.set(cam.tx + Math.sin(cam.az) * Math.cos(cam.el) * cam.dist, cam.ty + Math.sin(cam.el) * cam.dist, cam.tz + Math.cos(cam.az) * Math.cos(cam.el) * cam.dist); camera.lookAt(cam.tx, cam.ty, cam.tz);
  const cx = camera.position.x, cz = camera.position.z; for (const w of walls) { const hide = (w.key === 'back' && cz < -HZ + 1) || (w.key === 'left' && cx < -HX + 1) || (w.key === 'right' && cx > HX - 1); w.m.material.opacity += ((hide ? 0.08 : 1) - w.m.material.opacity) * Math.min(1, rdt * 6); w.m.material.depthWrite = w.m.material.opacity > 0.9; }
  uiT += rdt; if (uiT > 0.25) {
    uiT = 0; $('money').textContent = money(S.money); $('ips').textContent = money(incomeRate()); const r = rep(); const rr = Math.round(r); $('rep').textContent = '★'.repeat(rr) + '☆'.repeat(5 - rr); const pr = dayProfit(S.d); $('profit').textContent = money(pr); $('profit').style.color = pr >= 0 ? '#6ee7b7' : '#fca5a5';
    $('stars').textContent = '👑 ' + S.stars; const hh = Math.floor(S.clock), mm = Math.floor((S.clock % 1) * 60); $('clock').textContent = `Hari ${S.day} · ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${raining ? '🌧' : hh >= 6 && hh < 18 ? '☀' : '🌙'}`;
    const now2 = Date.now(); const hhb = $('btnHH'); if (hhActive()) { hhb.textContent = '🔥 ' + Math.ceil((S.hhUntil - now2) / 1000) + 's'; hhb.classList.add('act'); } else if (now2 < S.hhReady) { hhb.textContent = '⏳ ' + Math.ceil((S.hhReady - now2) / 1000) + 's'; hhb.classList.remove('act'); } else { hhb.textContent = '⚡ Happy Hour'; hhb.classList.remove('act'); }
    qT += 0.25; if (qT > 1) { qT = 0; checkQuests(); checkAch(); updateTutorial(); renderQuestMini(); if (npcSel) updateNpc(); } affordRefresh();
  }
  saveT += rdt; if (saveT > 5) { saveT = 0; save(); }
  renderer.render(scene, camera); requestAnimationFrame(frame);
}
let lastAff = '';
function affordRefresh() { const k = Math.floor(S.money / 500) + tab + selected + S.day; if (k === lastAff) return; lastAff = k; const sc = $('cards').scrollTop; renderAll(); $('cards').scrollTop = sc; }

// ================= BOOT =================
load(); S.regs.forEach((r) => (r.present = false)); if (!S.qs) S.qs = genQuests(S.ep);
{ const away = (Date.now() - (S.seen || Date.now())) / 1000;
  if (away > 60 && S.life > 0) { const inc = S.st.filter((x) => x.o).reduce((a, d) => a + personIncome(d) * 1.4 / (sessionLen() + 10), 0); const net = Math.max(0, inc * 0.5 - (dailyRent() + dailySalary()) / 240); const amt = Math.floor(net * Math.min(away, 8 * 3600)); if (amt > 0) { S.money += amt; S.run += amt; S.life += amt; $('welcomeTxt').textContent = `Toko tetap buka ${Math.round(away / 60)} menit dan menghasilkan laba bersih ${money(amt)}.`; $('welcome').classList.remove('hidden'); } } }
$('welcomeOk').onclick = () => { audio.init(); $('welcome').classList.add('hidden'); audio.cash(); };
BAYS.forEach((b) => { b.taken = b.fixed; });
world.setBranches(branchCount()); stations.forEach(buildStation); buildKantin(); buildDecor(); syncStaff(); syncPrefs(); renderAll(); onResize(); setCam('pano');
if (innerHeight < 520) { PRESETS.pano.dist = 24; PRESETS.pano.el = 0.85; setCam('pano'); Object.assign(cam, PRESETS.pano); }
else Object.assign(cam, PRESETS.pano);
addEventListener('pointerdown', () => { audio.init(); audio.setMusic(S.music); audio.setSfx(S.sfx); }, { once: true }); addEventListener('keydown', () => { audio.init(); audio.setMusic(S.music); audio.setSfx(S.sfx); }, { once: true });
window.__rp = { rain() { rainUntil = Date.now() + 90000; }, get S() { return S; }, stations, parties, spawnParty, buy, findPath, world, cam, camT, setCam, allMembers, breakStation, fixStation, tasks, waiter, get blackout() { return blackout; } };
requestAnimationFrame(frame);
