import * as THREE from 'three';
import { GameAudio } from './audio.js';
import { std, canvasTex, emojiSprite, textSprite, makeConsole, makeSofa, makePerson, attachController, detachController, poseWalk, poseStand, poseSitPlay, poseCheer, poseTalk, poseType } from './models.js';

const $ = (id) => document.getElementById(id);
const SAVE = 'rafli-ps-save-v2';
const audio = new GameAudio();

// ================= DATA =================
const CONSOLES = [
  { name: 'PS3 Slim', mult: 1, cost: 0 }, { name: 'PS4', mult: 1.7, cost: 120000 }, { name: 'PS4 Pro', mult: 2.6, cost: 420000 },
  { name: 'PS5', mult: 4.2, cost: 1500000 }, { name: 'PS5 Pro', mult: 7, cost: 5000000 },
];
const TVS = [
  { name: 'TV 32"', mult: 1, cost: 0, s: 0.8 }, { name: 'TV 43" 4K', mult: 1.2, cost: 80000, s: 1.0 }, { name: 'TV 55" OLED', mult: 1.45, cost: 300000, s: 1.2 },
  { name: 'TV 65" OLED', mult: 1.8, cost: 1100000, s: 1.4 }, { name: 'TV 77" Gaming', mult: 2.3, cost: 3600000, s: 1.62 },
];
const SOFAS = [{ name: 'Sofa Biasa', cost: 0, pat: 1, tip: 0 }, { name: 'Sofa Kulit Premium', cost: 110000, pat: 1.3, tip: 0.08 }, { name: 'Sofa VIP + Bantal', cost: 650000, pat: 1.7, tip: 0.18 }];
const SLOT_COST = [0, 0, 60000, 180000, 520000, 1500000, 4200000, 11000000];
const BASE_PRICE = 3000;       // per orang per sesi (1 jam)
const SESSION_SEC = 15;
const GENRES = ['Sepak Bola', 'Balap', 'Fighting', 'Tembak-tembakan', 'Petualangan Horor'];
const GCOL = ['#22c55e', '#f97316', '#ef4444', '#3b82f6', '#a855f7'];
const growth = (b, g, l) => Math.round(b * Math.pow(g, l));

const SHOP = [
  { id: 'mkt', name: '📣 Promosi Medsos', desc: 'Pelanggan datang makin sering. Tanpa batas level.', lvKey: 'mkt', cost: (l) => growth(60000, 1.55, l), max: Infinity, eff: (l) => `+${l * 12}% kedatangan` },
  { id: 'train', name: '🎓 Pelatihan & Manajemen', desc: '+8% pendapatan semua stasiun tiap level. Tanpa batas.', lvKey: 'train', cost: (l) => growth(150000, 1.6, l), max: Infinity, eff: (l) => `+${l * 8}% pendapatan` },
  { id: 'snack', name: '🍟 Warung Snack & Minuman', desc: '+10% pendapatan tiap level, pelanggan lebih betah.', lvKey: 'snack', cost: (l) => growth(120000, 1.6, l), max: Infinity, eff: (l) => `+${l * 10}%` },
  { id: 'ac', name: '❄ AC & Kenyamanan', desc: 'Reputasi naik, pelanggan lebih sabar.', lvKey: 'ac', cost: (l) => [200000, 800000, 3200000][l], max: 3, eff: (l) => `Level ${l}/3` },
  { id: 'decor', name: '🪩 Dekorasi Neon & Poster', desc: 'Toko lebih keren: reputasi & pelanggan.', lvKey: 'decor', cost: (l) => [180000, 700000, 2800000][l], max: 3, eff: (l) => `Level ${l}/3` },
  { id: 'lobby', name: '🛋 Ruang Tunggu', desc: 'Tambah kursi tunggu & kesabaran antre.', lvKey: 'lobby', cost: (l) => [90000, 400000, 1800000][l], max: 3, eff: (l) => `Level ${l}/3` },
];
const STAFF = [
  { id: 'kasir', name: '💳 Kecepatan Kasir', desc: 'Pembayaran lebih cepat, antrean kasir pendek.', lvKey: 'kasir', cost: (l) => [60000, 350000, 1800000][l], max: 3, eff: (l) => `Level ${l}/3` },
  { id: 'staff', name: '🧑‍🔧 Pegawai Jaga', desc: 'Pegawai keliling: sesi lebih cepat selesai & pelanggan puas.', lvKey: 'staff', cost: (l) => [250000, 1400000, 7000000][l], max: 3, eff: (l) => `${l} pegawai` },
];

let S = defaultState();
function defaultState() {
  return { money: 0, run: 0, life: 0, st: Array.from({ length: 8 }, (_, i) => ({ o: i < 2 ? 1 : 0, c: 0, t: 0, l: 0, s: 0 })), mkt: 0, train: 0, snack: 0, ac: 0, decor: 0, lobby: 0, kasir: 0, staff: 0,
    stars: 0, ep: 0, qs: null, qp: { earn: 0, served: 0, upg: 0, vip: 0 }, sat: 0.8, hhUntil: 0, hhReady: 0, clock: 9, day: 1, seen: Date.now(), served: 0, music: true, sfx: true, franchises: 0 };
}
function load() { try { const s = JSON.parse(localStorage.getItem(SAVE)); if (s && s.st && s.st.length === 8) S = { ...defaultState(), ...s, qp: { ...defaultState().qp, ...(s.qp || {}) } }; } catch (e) { /* abaikan */ } }
function save() { try { S.seen = Date.now(); localStorage.setItem(SAVE, JSON.stringify(S)); } catch (e) { /* abaikan */ } }

// ---- turunan ----
const stationsOwned = () => S.st.filter((x) => x.o).length;
const avgTier = () => { const o = S.st.filter((x) => x.o); return o.length ? o.reduce((a, d) => a + d.c, 0) / o.length : 0; };
const rep = () => Math.max(1, Math.min(5, 1 + S.ac * 0.55 + S.decor * 0.45 + Math.min(S.snack, 6) * 0.1 + S.lobby * 0.2 + avgTier() * 0.25 + (S.sat - 0.7) * 1.2));
let eventMult = 1, eventUntil = 0, eventName = '';
const hhActive = () => Date.now() < S.hhUntil;
const globalMult = () => (1 + S.train * 0.08) * (1 + S.snack * 0.1) * (1 + S.stars * 0.2) * (1 + S.ep * 0.02) * (hhActive() ? 1.5 : 1) * (Date.now() < eventUntil ? eventMult : 1);
const personIncome = (d) => BASE_PRICE * CONSOLES[d.c].mult * TVS[d.t].mult * (1 + d.l * 0.1) * globalMult();
const sessionLen = () => SESSION_SEC / (1 + S.staff * 0.15);
const hourFactor = () => { const h = S.clock; let f = 1; if (h >= 16 && h < 22) f = 1.5; else if (h >= 22 || h < 6) f = 0.4; else if (h >= 12 && h < 16) f = 1.15; if ((S.day % 7 === 6 || S.day % 7 === 0)) f *= 1.3; return f; };
const arrivalEvery = () => Math.max(0.9, 8 / ((1 + S.mkt * 0.12) * (0.65 + 0.15 * rep()) * hourFactor() * (hhActive() ? 2 : 1) * (Date.now() < eventUntil && eventName === 'rombongan' ? 1.6 : 1)));
const patienceBase = () => 38 * (1 + S.ac * 0.15 + S.lobby * 0.15 + S.staff * 0.08);
const lobbySpots = () => 3 + S.lobby * 2;

function money(n) {
  n = Math.floor(n); const u = [[1e15, 'Qa'], [1e12, 'T'], [1e9, 'M'], [1e6, 'Jt'], [1e3, 'Rb']];
  for (const [v, s] of u) if (n >= v) return 'Rp ' + (n / v).toFixed(n / v >= 100 ? 0 : n / v >= 10 ? 1 : 2).replace('.', ',') + ' ' + s;
  return 'Rp ' + n;
}

// ================= THREE: scene =================
const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0a0b14);
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 140);
const orbit = { az: 0.18, el: 0.8, dist: 24, tx: 0, tz: 0.8 };

const hemi = new THREE.HemisphereLight(0xaab4ff, 0x2a2030, 0.8); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0dd, 1.5); sun.position.set(6, 18, 12); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 13, bottom: -13, near: 1, far: 50 }); scene.add(sun);

const W = 18, D = 14, HX = W / 2, HZ = D / 2;
const room = new THREE.Group(); scene.add(room);
// lantai: beton poles + garis jalur
const floorTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#2a2d3b'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1e202c'; g.lineWidth = 2; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * w / 8, 0); g.lineTo(i * w / 8, h); g.moveTo(0, i * h / 8); g.lineTo(w, i * h / 8); g.stroke(); } for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.025})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } });
floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(W / 4, D / 4);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), std(0xffffff, { map: floorTex, roughness: 0.28, metalness: 0.2 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; room.add(floor);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), std(0x181a26)); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.03; ground.receiveShadow = true; scene.add(ground);
const sidewalk = new THREE.Mesh(new THREE.PlaneGeometry(40, 5), std(0x3b3e4d)); sidewalk.rotation.x = -Math.PI / 2; sidewalk.position.set(0, -0.01, HZ + 3.2); scene.add(sidewalk);
// dinding (dengan transparansi otomatis saat menghalangi kamera)
const wallTex = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#2f3358'; g.fillRect(0, 0, w, h); for (let i = 0; i < 32; i++) { g.fillStyle = i % 2 ? '#353a63' : '#2b2f52'; g.fillRect(i * 16, 0, 16, h); } });
wallTex.wrapS = THREE.RepeatWrapping; wallTex.repeat.set(4, 1);
const walls = [];
function addWall(w, h, d, x, y, z, key) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9, transparent: true })); m.position.set(x, y, z); m.receiveShadow = true; room.add(m); walls.push({ m, key }); return m; }
addWall(W, 4.4, 0.3, 0, 2.2, -HZ, 'back'); addWall(0.3, 4.4, D, -HX, 2.2, 0, 'left'); addWall(0.3, 4.4, D, HX, 2.2, 0, 'right');
// dinding depan: panel kaca + bingkai (pintu di tengah)
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x9db8ff, transparent: true, opacity: 0.14, roughness: 0.05, metalness: 0.1 });
const frameMat = std(0x0e1020, { metalness: 0.4 });
for (const [x0, x1] of [[-HX, -1.4], [1.4, HX]]) { const w = x1 - x0; const gl = new THREE.Mesh(new THREE.BoxGeometry(w, 3.6, 0.05), glassMat); gl.position.set((x0 + x1) / 2, 1.8, HZ); room.add(gl); const fr = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.14, 0.12), frameMat); fr.position.set((x0 + x1) / 2, 3.65, HZ); room.add(fr); const fb = fr.clone(); fb.position.y = 0.07; room.add(fb); }
const doorL = new THREE.Mesh(new THREE.BoxGeometry(1.4, 3.4, 0.05), glassMat), doorR = doorL.clone(); doorL.position.set(-0.7, 1.7, HZ); doorR.position.set(0.7, 1.7, HZ); room.add(doorL, doorR);
const doorTop = new THREE.Mesh(new THREE.BoxGeometry(3, 0.25, 0.14), frameMat); doorTop.position.set(0, 3.52, HZ); room.add(doorTop);
// papan nama neon
const signTex = canvasTex(1024, 256, (g, w, h) => {
  g.fillStyle = '#0b0d1f'; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 88px sans-serif'; g.shadowColor = '#3b82f6'; g.shadowBlur = 36; g.fillStyle = '#e6f0ff'; g.fillText('RAFLI', 175, 100);
  g.shadowColor = '#f472b6'; g.fillStyle = '#ffd6ec'; g.fillText('PLAYSTATION', 670, 100);
  g.shadowBlur = 18; g.font = '900 54px sans-serif'; [['△', '#4ade80'], ['○', '#f87171'], ['✕', '#60a5fa'], ['□', '#f472b6']].forEach(([c, col], i) => { g.fillStyle = col; g.shadowColor = col; g.fillText(c, 340 + i * 115, 205); });
});
const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 1.9), new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false })); sign.position.set(0, 3.55, -HZ + 0.2); room.add(sign);
const neonL = new THREE.PointLight(0x3b82f6, 16, 14); neonL.position.set(-3, 3.2, -HZ + 1.5); scene.add(neonL);
const neonR = new THREE.PointLight(0xf472b6, 16, 14); neonR.position.set(3, 3.2, -HZ + 1.5); scene.add(neonR);
const ledMats = []; for (const [x, y, z, w, d, c] of [[0, 4.3, -HZ + 0.25, W - 0.5, 0.06, 0xf472b6], [-HX + 0.25, 4.3, 0, 0.06, D - 0.5, 0x3b82f6], [HX - 0.25, 4.3, 0, 0.06, D - 0.5, 0x8b5cf6]]) { const mt = new THREE.MeshBasicMaterial({ color: c, toneMapped: false }); const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, d), mt); m.position.set(x, y, z); room.add(m); ledMats.push(mt); }
// karpet area tunggu & jalur
const rug = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 3.6), std(0x2a2160, { roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(-3, 0.02, 5.1); room.add(rug);
const mat = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.4), new THREE.MeshBasicMaterial({ map: canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#20233f'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = 'bold 32px sans-serif'; g.textAlign = 'center'; g.fillText('SELAMAT DATANG', w / 2, 55); g.font = '20px sans-serif'; g.fillText('Rafli PlayStation', w / 2, 92); }) })); mat.rotation.x = -Math.PI / 2; mat.position.set(0, 0.03, HZ - 1.1); room.add(mat);
// lampu gantung bulat di atas tiap area
const pend = []; for (const x of [-6.75, -2.25, 2.25, 6.75]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.2, 20), new THREE.MeshBasicMaterial({ color: 0xfff0cc, toneMapped: false })); l.position.set(x, 3.7, -HZ + 3.3); room.add(l); pend.push(l); }

// ---- meja kasir (depan kanan) ----
const COUNTER = { x: 5.5, z: 5.6, w: 3.4, d: 0.9 };
const counter = new THREE.Group(); counter.position.set(COUNTER.x, 0, COUNTER.z); room.add(counter);
{
  const body = new THREE.Mesh(new THREE.BoxGeometry(COUNTER.w, 1.05, COUNTER.d), std(0x262a52)); body.position.y = 0.52; body.castShadow = true; counter.add(body);
  const top = new THREE.Mesh(new THREE.BoxGeometry(COUNTER.w + 0.2, 0.07, COUNTER.d + 0.15), std(0xf0f0f5, { roughness: 0.2 })); top.position.y = 1.08; counter.add(top);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(COUNTER.w, 0.06, 0.02), new THREE.MeshBasicMaterial({ color: 0x3b82f6, toneMapped: false })); strip.position.set(0, 0.6, -COUNTER.d / 2 - 0.01); counter.add(strip);
  const mon = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.36, 0.04), std(0x111, { emissive: 0x1a4a8a, emissiveIntensity: 0.9 })); mon.position.set(-0.7, 1.4, 0.1); mon.rotation.x = -0.15; counter.add(mon);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.05), std(0x333)); stand.position.set(-0.7, 1.2, 0.1); counter.add(stand);
  const reg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.3), std(0xd1d5db)); reg.position.set(0.5, 1.19, 0.0); counter.add(reg);
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), std(0xfbbf24, { metalness: 0.8 })); bell.position.set(1.1, 1.12, -0.1); counter.add(bell);
}
const PAY_SPOT = new THREE.Vector3(COUNTER.x - 0.6, 0, COUNTER.z - 1.5);
const CASHIER_POS = new THREE.Vector3(COUNTER.x - 0.4, 0, COUNTER.z + 0.95);

// ---- dekorasi (level) ----
const decorGroup = new THREE.Group(); room.add(decorGroup);
const obstacles = []; // [x0,z0,x1,z1] dunia
function addObs(x, z, hw, hd) { obstacles.push([x - hw, z - hd, x + hw, z + hd]); }
function buildDecor() {
  decorGroup.clear(); obstacles.length = 0;
  // kasir, kulkas (selalu ada)
  obstacles.push([COUNTER.x - COUNTER.w / 2 - 0.1, COUNTER.z - 0.55, COUNTER.x + COUNTER.w / 2 + 0.1, HZ]);
  const fr = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.2, 0.9), std(0x2a6ff0, { metalness: 0.3, roughness: 0.3 })); fr.position.set(HX - 0.9, 1.1, HZ - 1.5); fr.castShadow = true; decorGroup.add(fr); addObs(HX - 0.9, HZ - 1.5, 0.6, 0.5);
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.7), new THREE.MeshBasicMaterial({ map: canvasTex(64, 128, (g, w, h) => { g.fillStyle = '#cfe8ff'; g.fillRect(0, 0, w, h); for (let i = 0; i < 12; i++) { g.fillStyle = ['#e33', '#3a3', '#fa0', '#36f'][i % 4]; g.fillRect(8 + (i % 3) * 18, 8 + Math.floor(i / 3) * 28, 12, 22); } }) })); gl.position.set(HX - 0.9, 1.15, HZ - 1.5 - 0.46); gl.rotation.y = Math.PI; decorGroup.add(gl);
  // sofa tunggu (kiri depan)
  const ws = makeSofa(0x374151, 1); ws.position.set(-6.2, 0, HZ - 0.9); decorGroup.add(ws); addObs(-6.2, HZ - 0.9, 1.2, 0.6);
  const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.45, 16), std(0x1f2937)); tb.position.set(-4.4, 0.22, HZ - 0.9); decorGroup.add(tb); addObs(-4.4, HZ - 0.9, 0.4, 0.4);
  if (S.lobby >= 1) { const s2 = makeSofa(0x6d28d9, 1); s2.position.set(-3.0, 0, HZ - 0.9); decorGroup.add(s2); addObs(-3.0, HZ - 0.9, 1.2, 0.6); }
  if (S.lobby >= 2) { const dsp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.3, 0.5), std(0xe5e7eb)); dsp.position.set(-0.2 - 0.3, 0.65, HZ - 0.5 + 0.0); dsp.position.set(-8.4, 0.65, HZ - 0.9); decorGroup.add(dsp); addObs(-8.4, HZ - 0.9, 0.35, 0.35); }
  if (S.decor >= 1) {
    const mk = (txt, c1, c2) => canvasTex(128, 180, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = 'bold 22px sans-serif'; g.textAlign = 'center'; g.fillText(txt, w / 2, h - 18); g.font = '60px sans-serif'; g.fillText('🎮', w / 2, 90); });
    [['FIFA', '#0a7', '#046'], ['GTA', '#f60', '#a02'], ['TEKKEN', '#c22', '#413'], ['GOD OF WAR', '#456', '#123']].forEach(([t, a, b], i) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.4), new THREE.MeshBasicMaterial({ map: mk(t, a, b) })); p.position.set(-HX + 0.2, 2.5, -4 + i * 2.7); p.rotation.y = Math.PI / 2; decorGroup.add(p); });
  }
  if (S.decor >= 2) for (const [x, z] of [[HX - 0.7, -HZ + 0.8], [-HX + 0.7, HZ - 0.7], [0, -HZ + 0.7]]) { const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.5, 14), std(0x7a4a2a)); pot.position.set(x, 0.25, z); const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), std(0x2d9b4e, { roughness: 0.9 })); lf.position.set(x, 0.95, z); lf.scale.y = 1.3; lf.castShadow = true; decorGroup.add(pot, lf); addObs(x, z, 0.4, 0.4); }
  if (S.decor >= 3) for (const [x, c] of [[-6, 0x3b82f6], [0, 0xf472b6], [6, 0x4ade80]]) { const m = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.035, 8, 32), new THREE.MeshBasicMaterial({ color: c, toneMapped: false })); m.position.set(x, 3.4, 0.5); m.rotation.x = Math.PI / 2; decorGroup.add(m); }
  if (S.ac >= 1) { const mk2 = (x) => { const ac = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.35), std(0xeeeeee, { roughness: 0.4 })); ac.position.set(x, 3.75, -HZ + 0.4); decorGroup.add(ac); }; mk2(-5.2); if (S.ac >= 2) mk2(5.2); if (S.ac >= 3) mk2(0); }
  buildGrid();
}

// ---- stasiun ----
const SLOTS = [
  { x: -6.75, z: -HZ + 0.35, ry: 0 }, { x: -2.25, z: -HZ + 0.35, ry: 0 }, { x: 2.25, z: -HZ + 0.35, ry: 0 }, { x: 6.75, z: -HZ + 0.35, ry: 0 },
  { x: -HX + 0.35, z: -1.4, ry: Math.PI / 2 }, { x: -HX + 0.35, z: 2.2, ry: Math.PI / 2 }, { x: HX - 0.35, z: -1.4, ry: -Math.PI / 2 }, { x: HX - 0.35, z: 2.2, ry: -Math.PI / 2 },
];
const SOFA_COLORS = [0x6d2ce0, 0x1d6fd8, 0xc2410c, 0x0f9d7a, 0xb4236b, 0x4b5563, 0xca8a04, 0x0e7490];
const stations = SLOTS.map((p, i) => {
  const g = new THREE.Group(); g.position.set(p.x, 0, p.z); g.rotation.y = p.ry; scene.add(g);
  return { i, g, slot: p, parts: new THREE.Group(), busy: false, reserved: false, genre: 0, tvTex: null, led: null, glow: null, lock: null, flash: 0, cheerT: 0, party: null };
});
stations.forEach((s) => s.g.add(s.parts));
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
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.2), new THREE.MeshBasicMaterial({ color: 0x2c3366, transparent: true, opacity: 0.4 })); pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.03, 2.1); st.parts.add(pad);
    const rim = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(3.4, 4.2)), new THREE.LineBasicMaterial({ color: 0x5560ff })); rim.rotation.x = -Math.PI / 2; rim.position.set(0, 0.04, 2.1); st.parts.add(rim);
    return;
  }
  const tv = TVS[d.t];
  const cab = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.55, 0.65), std(0x2b2723, { roughness: 0.65 })); cab.position.set(0, 0.275, 0.1); cab.castShadow = true; cab.receiveShadow = true; st.parts.add(cab);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.03, 0.66), new THREE.MeshBasicMaterial({ color: 0x3b82f6, toneMapped: false })); trim.position.set(0, 0.56, 0.1); st.parts.add(trim);
  const w = 1.7 * tv.s, h = 0.96 * tv.s;
  const baseY = 0.58 + h / 2 + 0.12;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.06), std(0x08080a, { roughness: 0.3 })); frame.position.set(0, baseY, 0); frame.castShadow = true; st.parts.add(frame);
  const tex = canvasTex(160, 90, () => {}); st.tvTex = tex;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); scr.position.set(0, baseY, 0.033); st.parts.add(scr);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.25), std(0x08080a)); foot.position.set(0, 0.6, 0.05); st.parts.add(foot);
  const glow = new THREE.PointLight(0x5588ff, 2.5, 5.5); glow.position.set(0, 1.5, 1.4); st.parts.add(glow); st.glow = glow;
  const cons = makeConsole(d.c); cons.position.set(d.c >= 3 ? -1.35 : -1.2, 0.57, 0.15); cons.rotation.y = 0.15; st.parts.add(cons); st.led = cons.userData.led;
  const sofa = makeSofa(SOFA_COLORS[st.i], d.s); sofa.position.set(0, 0, 3.3); st.parts.add(sofa);
  // meja kecil + gelas
  const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.4, 14), std(0x1f2937)); tb.position.set(1.7, 0.2, 2.6); tb.castShadow = true; st.parts.add(tb);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.14, 10), std(0xef4444)); cup.position.set(1.7, 0.47, 2.6); st.parts.add(cup);
  const lab = textSprite(CONSOLES[d.c].name + ' · ' + tv.name, '#9fc3ff', 32); lab.position.set(0, baseY + h / 2 + 0.4, 0); lab.scale.set(2.6, 0.5, 1); st.parts.add(lab);
}

// ================= JALUR (A*) =================
const CELL = 0.5, GX0 = -HX, GZ0 = -HZ, GW = Math.round(W / CELL), GH = Math.round((D + 4) / CELL);
let blocked = new Uint8Array(GW * GH);
const cellOf = (x, z) => [Math.max(0, Math.min(GW - 1, Math.floor((x - GX0) / CELL))), Math.max(0, Math.min(GH - 1, Math.floor((z - GZ0) / CELL)))];
const cellCenter = (cx, cz) => new THREE.Vector3(GX0 + (cx + 0.5) * CELL, 0, GZ0 + (cz + 0.5) * CELL);
function buildGrid() {
  blocked = new Uint8Array(GW * GH);
  const rects = obstacles.slice();
  stations.forEach((st) => { if (!S.st[st.i].o) return; const add = (lx0, lz0, lx1, lz1) => { const pts = [[lx0, lz0], [lx1, lz0], [lx1, lz1], [lx0, lz1]].map(([x, z]) => toWorld(st, x, 0, z)); rects.push([Math.min(...pts.map((p) => p.x)), Math.min(...pts.map((p) => p.z)), Math.max(...pts.map((p) => p.x)), Math.max(...pts.map((p) => p.z))]); }; st.g.updateMatrixWorld(true); add(-1.8, -0.4, 1.8, 0.5); add(-1.15, 2.75, 1.15, 3.85); add(1.4, 2.3, 2.0, 2.9); });
  const R = 0.3;
  for (let cz = 0; cz < GH; cz++) for (let cx = 0; cx < GW; cx++) {
    const c = cellCenter(cx, cz); let b = 0;
    if (c.x < -HX + 0.4 || c.x > HX - 0.4 || c.z < -HZ + 0.4) b = 1;
    if (c.z > HZ - 0.3 && c.z < HZ + 0.3 && Math.abs(c.x) > 1.2) b = 1; // dinding depan
    for (const r of rects) if (c.x > r[0] - R && c.x < r[2] + R && c.z > r[1] - R && c.z < r[3] + R) { b = 1; break; }
    blocked[cz * GW + cx] = b;
  }
}
function nearestFree(cx, cz) { if (!blocked[cz * GW + cx]) return [cx, cz]; for (let r = 1; r < 8; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { const x = cx + dx, z = cz + dz; if (x >= 0 && z >= 0 && x < GW && z < GH && !blocked[z * GW + x]) return [x, z]; } return [cx, cz]; }
function findPath(from, to) {
  const [sx, sz] = nearestFree(...cellOf(from.x, from.z)), [ex, ez] = nearestFree(...cellOf(to.x, to.z));
  const open = [[sx, sz]], came = new Map(), g = new Map(); const key = (x, z) => z * GW + x; g.set(key(sx, sz), 0);
  const f = new Map(); const h = (x, z) => { const dx = Math.abs(x - ex), dz = Math.abs(z - ez); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); }; f.set(key(sx, sz), h(sx, sz));
  const closed = new Set(); let found = false;
  while (open.length) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (f.get(key(...open[i])) < f.get(key(...open[bi]))) bi = i;
    const [cx, cz] = open.splice(bi, 1)[0]; const ck = key(cx, cz); if (closed.has(ck)) continue; closed.add(ck);
    if (cx === ex && cz === ez) { found = true; break; }
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue; const nx = cx + dx, nz = cz + dz; if (nx < 0 || nz < 0 || nx >= GW || nz >= GH || blocked[key(nx, nz)]) continue;
      if (dx && dz && (blocked[key(cx + dx, cz)] || blocked[key(cx, cz + dz)])) continue;
      const ng = g.get(ck) + (dx && dz ? 1.414 : 1); const nk = key(nx, nz); if (g.has(nk) && ng >= g.get(nk)) continue;
      g.set(nk, ng); came.set(nk, ck); f.set(nk, ng + h(nx, nz)); open.push([nx, nz]);
    }
  }
  if (!found) return [to.clone()];
  const out = []; let k = key(ex, ez); while (k !== key(sx, sz)) { out.push(cellCenter(k % GW, Math.floor(k / GW))); k = came.get(k); } out.reverse();
  // haluskan: buang titik segaris
  const sm = []; for (let i = 0; i < out.length; i++) { if (i && i < out.length - 1) { const a = out[i - 1], b = out[i], c = out[i + 1]; if (Math.abs((b.x - a.x) * (c.z - b.z) - (b.z - a.z) * (c.x - b.x)) < 1e-6) continue; } sm.push(out[i]); }
  sm.push(to.clone()); return sm;
}

// ================= TV =================
function drawTV(st, t, playing) {
  const tex = st.tvTex; if (!tex) return; const { g, c } = tex.userData; const w = c.width, h = c.height;
  if (!playing) { // menu XMB
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

// ================= ENTITAS =================
const DOOR_OUT = new THREE.Vector3(0, 0, HZ + 3.5), DOOR_IN = new THREE.Vector3(0, 0, HZ - 1.0);
const parties = []; const staffNPCs = [];
const cashier = makePerson({ kind: 'staff', shirt: 0x2563eb, pants: 0x1f2937, girl: true, apron: true, headset: true }); cashier.position.copy(CASHIER_POS); cashier.rotation.y = Math.PI; scene.add(cashier);
let cashierBusy = null;
let clockT = 0;

function spawnParty() {
  const vip = rep() >= 3 && Math.random() < 0.07 && S.st.some((d) => d.o && d.c >= 2);
  const size = vip ? 1 : Math.random() < 0.38 ? 2 : 1; const type = vip ? 'vip' : ['pelajar', 'gamer', 'karyawan'][Math.floor(Math.random() * 3)];
  if (parties.length >= 16) return;
  const members = [];
  for (let k = 0; k < size; k++) {
    const p = makePerson(type === 'pelajar' ? { bag: true, shirt: 0xe5e7eb } : type === 'vip' ? { headset: true, shirt: 0x7c3aed, cap: false } : {}); p.position.set(-0.6 + k * 1.2 + (Math.random() - 0.5) * 0.4, 0, HZ + 3.6 + k * 0.5); scene.add(p);
    const bubble = emojiSprite('🙂'); bubble.position.set(0, 2.15, 0); p.add(bubble);
    members.push({ p, path: [], pi: 0, speed: 2.2 + Math.random() * 0.5, arrived: true, bubble, seatIdx: k, yaw: 0, tr: 0 });
  }
  const party = { members, state: 'enter', type, vip, size, patience: patienceBase() * (type === 'gamer' ? 1.2 : 1), maxPat: 0, st: null, t: 0, len: sessionLen() * (type === 'gamer' ? 1.35 : type === 'pelajar' ? 1.1 : 1) * (0.85 + Math.random() * 0.3), income: 0, mood: 1, lobbyIdx: -1, genre: Math.floor(Math.random() * 5) };
  party.maxPat = party.patience; parties.push(party); audio.door();
  const spot = lobbySpot(party); sendTo(party, members.map((m, i) => spot.clone().add(new THREE.Vector3(i * 0.8, 0, 0))), 'toLobby');
}
function lobbySpot(party) {
  const used = new Set(parties.filter((q) => q !== party && q.lobbyIdx >= 0).map((q) => q.lobbyIdx));
  for (let i = 0; i < 12; i++) if (!used.has(i)) { party.lobbyIdx = i; const col = i % 4, row = Math.floor(i / 4); return new THREE.Vector3(-4.6 + col * 1.5, 0, 3.6 + row * 1.1); }
  party.lobbyIdx = -1; return new THREE.Vector3(-2, 0, 3.6);
}
function sendTo(party, targets, state) {
  party.state = state; party.members.forEach((m, i) => { m.path = findPath(m.p.position, targets[i] || targets[0]); m.pi = 0; m.arrived = false; });
}
function freeStations() { return stations.filter((s) => S.st[s.i].o && !s.busy && !s.reserved); }
function tryAssign(party) {
  const fr = freeStations(); if (!fr.length) return false;
  let st; if (party.vip) st = fr.sort((a, b) => S.st[b.i].c - S.st[a.i].c)[0]; else st = fr[Math.floor(Math.random() * fr.length)];
  st.reserved = true; party.st = st; party.lobbyIdx = -1; party.income = 0;
  party.genre = Math.floor(Math.random() * 5);
  sendTo(party, party.members.map((m, i) => frontPos(st, party.size === 1 ? 0.5 * 0 + (i ? 1 : 0) : i)), 'toStation');
  // pemain tunggal duduk di tengah-kiri
  return true;
}
function setBubble(m, e) { if (m.bubbleE === e) return; m.bubbleE = e; const nb = emojiSprite(e); nb.position.copy(m.bubble.position); m.p.remove(m.bubble); m.p.add(nb); m.bubble = nb; }

function moveMember(m, dt, t) {
  if (m.arrived) return true;
  const tgt = m.path[m.pi]; if (!tgt) { m.arrived = true; return true; }
  const dir = tgt.clone().sub(m.p.position); dir.y = 0; const dist = dir.length();
  if (dist < 0.1) { m.pi++; if (m.pi >= m.path.length) { m.arrived = true; poseStand(m.p, t); return true; } return false; }
  dir.normalize(); m.p.position.addScaledVector(dir, Math.min(m.speed * dt, dist));
  const yaw = Math.atan2(dir.x, dir.z); let d = yaw - m.p.rotation.y; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; m.p.rotation.y += d * Math.min(1, dt * 10);
  poseWalk(m.p, t, m.speed / 2.4); return false;
}

function updateParties(dt) {
  for (let i = parties.length - 1; i >= 0; i--) {
    const q = parties[i]; const t = clockT;
    if (q.state === 'toLobby' || q.state === 'toStation' || q.state === 'toCounter' || q.state === 'leave' || q.state === 'angry') {
      const all = q.members.map((m) => moveMember(m, dt, t)).every(Boolean);
      if (all) {
        if (q.state === 'toLobby') { q.state = 'wait'; q.members.forEach((m) => { m.p.rotation.y = Math.PI; }); }
        else if (q.state === 'toStation') { q.state = 'sit'; q.t = 0; q.members.forEach((m, k) => { m.from = m.p.position.clone(); m.fromYaw = m.p.rotation.y; }); }
        else if (q.state === 'toCounter') { q.state = 'queue'; }
        else { scene.remove(...q.members.map((m) => m.p)); parties.splice(i, 1); continue; }
      }
    }
    if (q.state === 'wait') {
      q.members.forEach((m) => { poseStand(m.p, t); });
      q.patience -= dt * (1 - Math.min(0.5, S.staff * 0.12)); const r = q.patience / q.maxPat;
      q.members.forEach((m) => setBubble(m, r > 0.6 ? '🙂' : r > 0.3 ? '😐' : '😠'));
      if (!tryAssign(q) || false) { /* tetap menunggu */ }
      if (q.state === 'wait' && q.patience <= 0) { q.state = 'angry'; S.sat = Math.max(0, S.sat - 0.06 * q.size); audio.angry(); q.members.forEach((m) => setBubble(m, '😡')); sendTo(q, q.members.map(() => DOOR_OUT.clone()), 'angry'); popup(q.members[0].p.position.clone().add(new THREE.Vector3(0, 2.4, 0)), 'Pelanggan pergi!', '#ff7a7a'); }
    } else if (q.state === 'sit') {
      q.t += dt; const k = Math.min(1, q.t / 0.9); const e = k * k * (3 - 2 * k);
      q.members.forEach((m, idx) => {
        const seatI = q.size === 1 ? 0 : idx; const st = q.st; const sp = seatPos(st, q.size === 1 ? 0 : seatI); const sx = q.size === 1 ? toWorld(st, 0, 0, 3.25) : sp;
        m.p.position.lerpVectors(m.from, sx, e); let dy = faceYaw(st) - m.fromYaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; m.p.rotation.y = m.fromYaw + dy * e;
        m.p.position.y = 0; if (k > 0.35) { poseSitPlay(m.p, t); m.p.position.y = -0.42 * ((k - 0.35) / 0.65); } else poseWalk(m.p, t, 0.4);
        if (k >= 1 && !m.p.userData.controller) attachController(m.p, idx ? 0x14151a : 0xf4f5fa);
      });
      if (k >= 1) { q.state = 'play'; q.t = 0; q.st.busy = true; q.st.reserved = false; q.st.party = q; q.st.genre = q.genre; q.st.flash = 0; q.members.forEach((m) => setBubble(m, '🎮')); q.base = S.st[q.st.i]; }
    } else if (q.state === 'play') {
      q.t += dt; const st = q.st;
      const cheering = st.cheerT > 0; st.cheerT = Math.max(0, st.cheerT - dt);
      if (!cheering && Math.random() < dt * 0.12) { st.cheerT = 1.1; audio.cheer(); q.members.forEach((m) => setBubble(m, ['😆', '🔥', '🤩'][Math.floor(Math.random() * 3)])); }
      if (cheering && st.cheerT <= 0) q.members.forEach((m) => setBubble(m, '🎮'));
      q.members.forEach((m) => { if (cheering) poseCheer(m.p, t); else poseSitPlay(m.p, t, Math.sin(t * 0.7 + q.t) > 0.8 ? 0.7 : 0.1); });
      if (q.t >= q.len) { // selesai -> bangun
        q.state = 'stand'; q.t = 0; q.members.forEach((m) => { detachController(m.p); m.from = m.p.position.clone(); setBubble(m, '😊'); });
      }
    } else if (q.state === 'stand') {
      q.t += dt; const k = Math.min(1, q.t / 0.7); const st = q.st;
      q.members.forEach((m, idx) => { const fp = frontPos(st, q.size === 1 ? 0 : idx); m.p.position.lerpVectors(m.from, fp, k); m.p.position.y = -0.42 * (1 - k); poseSitPlay(m.p, t, 0); if (k > 0.6) poseStand(m.p, t); });
      if (k >= 1) {
        q.members.forEach((m) => { m.p.position.y = 0; });
        st.busy = false; st.party = null;
        const d = S.st[st.i]; const per = personIncome(d); q.income = per * q.size * (q.vip ? 3 : q.type === 'gamer' ? 1.15 : 1);
        q.tip = q.income * (SOFAS[d.s].tip + (S.sat > 0.8 ? 0.05 : 0));
        const slots = [0, 1].map((x) => new THREE.Vector3(PAY_SPOT.x - 0.5 + (cashierQueue() * 0.9) + x * 0.7, 0, PAY_SPOT.z));
        sendTo(q, q.members.map((m, idx) => slots[idx] || slots[0]), 'toCounter');
      }
    } else if (q.state === 'queue') {
      q.members.forEach((m) => { poseStand(m.p, t); m.p.rotation.y = 0; });
      if (!cashierBusy) { cashierBusy = q; q.state = 'pay'; q.t = 0; q.members.forEach((m) => setBubble(m, '💵')); }
    } else if (q.state === 'pay') {
      q.t += dt * (1 + S.kasir * 0.6); q.members.forEach((m) => poseTalk(m.p, t));
      if (q.t >= 1.2) { // bayar
        cashierBusy = null; const total = q.income + (q.tip || 0); earn(total, true); S.served += q.size; S.qp.served += q.size; if (q.vip) S.qp.vip += 1;
        S.sat = Math.min(1, S.sat + 0.02 * q.size); audio.cash(); popup(CASHIER_POS.clone().add(new THREE.Vector3(0, 2.6, -0.6)), '+' + money(total), '#ffe27a');
        if (q.tip > 0) popup(CASHIER_POS.clone().add(new THREE.Vector3(0.9, 2.2, -0.6)), '+tip ' + money(q.tip), '#7affb2');
        q.members.forEach((m) => setBubble(m, '😄')); sendTo(q, q.members.map(() => DOOR_OUT.clone()), 'leave');
      }
    }
  }
}
function cashierQueue() { return parties.filter((p) => p.state === 'queue' || p.state === 'toCounter' || p.state === 'pay').length % 3; }

function earn(a, fromCust) { S.money += a; S.run += a; S.life += a; S.qp.earn += a; incomeWin.push([performance.now(), a]); void fromCust; }
const incomeWin = [];
const floaters = [];
function popup(pos, text, color = '#fff') { const s = textSprite(text, color, 38); s.position.copy(pos); scene.add(s); floaters.push({ s, t: 0 }); }
function updateFloaters(dt) { for (let i = floaters.length - 1; i >= 0; i--) { const f = floaters[i]; f.t += dt; f.s.position.y += dt * 0.8; f.s.material.opacity = Math.max(0, 1 - f.t / 1.6); if (f.t > 1.6) { scene.remove(f.s); floaters.splice(i, 1); } } }

// ---- pegawai ----
function syncStaff() {
  while (staffNPCs.length < S.staff) { const p = makePerson({ kind: 'staff', shirt: 0x0ea5e9, pants: 0x111827, apron: true, cap: true, girl: staffNPCs.length % 2 === 1 }); p.position.set(-1 + staffNPCs.length * 2, 0, HZ - 2); scene.add(p); staffNPCs.push({ p, path: [], pi: 0, wait: 2, arrived: true, speed: 1.6 }); }
}
function updateStaff(dt) {
  for (const s of staffNPCs) {
    if (s.arrived) { s.wait -= dt; poseStand(s.p, clockT); if (s.wait <= 0) { const owned = stations.filter((x) => S.st[x.i].o); const tgt = owned.length && Math.random() < 0.8 ? frontPos(owned[Math.floor(Math.random() * owned.length)], 0.5) : new THREE.Vector3(-1 + Math.random() * 6, 0, 3.5 + Math.random()); s.path = findPath(s.p.position, tgt); s.pi = 0; s.arrived = false; s.wait = 3 + Math.random() * 4; } }
    else { const m = { p: s.p, path: s.path, pi: s.pi, speed: s.speed, arrived: false }; moveMember(m, dt, clockT); s.pi = m.pi; s.arrived = m.arrived; }
  }
}

// ================= SIKLUS HARI & EVENT =================
function updateClock(dt) {
  S.clock += dt / 10; if (S.clock >= 24) { S.clock -= 24; S.day++; toast('Hari ke-' + S.day + (S.day % 7 === 6 || S.day % 7 === 0 ? ' (akhir pekan: ramai!)' : '')); }
  const h = S.clock; const day = Math.max(0, Math.sin((h - 6) / 12 * Math.PI)); // 0 malam .. 1 siang
  const night = 1 - day;
  scene.background.setRGB(0.04 + day * 0.35, 0.05 + day * 0.5, 0.1 + day * 0.7).lerp(new THREE.Color(0x070816), night * 0.7);
  hemi.intensity = 0.55 + day * 0.55; sun.intensity = 0.5 + day * 1.6; sun.color.setHSL(0.1, 0.4, 0.7 + day * 0.2);
  const nb = 0.8 + night * 0.9; neonL.intensity = (14 + Math.sin(clockT * 2) * 3) * nb; neonR.intensity = (14 + Math.cos(clockT * 2.3) * 3) * nb;
  pend.forEach((m) => m.material.color.setRGB(1, 0.94 - night * 0.1, 0.8 - night * 0.3));
}
let nextEvent = 70;
function updateEvents(dt) {
  nextEvent -= dt; if (nextEvent <= 0) {
    nextEvent = 80 + Math.random() * 80; const r = Math.random();
    if (r < 0.3) { eventName = 'turnamen'; eventMult = 1.8; eventUntil = Date.now() + 35000; banner('🏆 Turnamen FIFA! Pendapatan ×1,8 selama 35 detik'); audio.horn(); }
    else if (r < 0.6) { eventName = 'rombongan'; eventMult = 1; eventUntil = Date.now() + 25000; banner('🚌 Rombongan anak sekolah datang!'); audio.horn(); for (let i = 0; i < 4; i++) setTimeout(spawnParty, i * 700); }
    else if (r < 0.8) { banner('⭐ Streamer terkenal mampir ke tokomu!'); audio.horn(); S.qp.vip = S.qp.vip; const keep = Math.random; void keep; vipNext = true; }
    else { eventName = 'promo'; eventMult = 1.4; eventUntil = Date.now() + 30000; banner('🎉 Diskon viral di medsos! Pendapatan ×1,4'); audio.quest(); }
  }
}
let vipNext = false;

// ================= MISI TANPA AKHIR =================
function genQuests(ep) {
  let seed = ep * 9301 + 49297; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const pool = ['earn', 'serve', 'upg', 'tier', 'vip', 'rep']; for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const earnT = Math.round(25000 * Math.pow(1.75, ep) / 1000) * 1000;
  return pool.slice(0, 3).map((t) => {
    if (t === 'earn') return { t, n: earnT };
    if (t === 'serve') return { t, n: 8 + ep * 3 };
    if (t === 'upg') return { t, n: 2 + Math.floor(ep / 2) };
    if (t === 'tier') return { t, n: Math.min(8, 1 + Math.floor(ep / 2)), tier: Math.min(4, 1 + Math.floor(ep / 3)) };
    if (t === 'vip') return { t, n: 1 + Math.floor(ep / 4) };
    return { t, n: Math.min(4.5, 2 + ep * 0.3) };
  });
}
const qDesc = (q) => ({ earn: () => `Hasilkan ${money(q.n)}`, serve: () => `Layani ${q.n} pelanggan`, upg: () => `Beli ${q.n} upgrade`, tier: () => `${q.n} stasiun dengan ${CONSOLES[q.tier].name}+`, vip: () => `Layani ${q.n} pelanggan VIP`, rep: () => `Reputasi ${q.n.toFixed(1)}★` }[q.t])();
const qProg = (q) => ({ earn: S.qp.earn, serve: S.qp.served, upg: S.qp.upg, tier: S.st.filter((d) => d.o && d.c >= q.tier).length, vip: S.qp.vip, rep: rep() }[q.t]);
function checkQuests() {
  if (!S.qs) S.qs = genQuests(S.ep);
  if (S.qs.every((q) => qProg(q) >= q.n)) {
    const ips = incomeRate(); const reward = Math.max(Math.round(40000 * Math.pow(1.6, S.ep)), Math.round(ips * 60 * 4));
    S.money += reward; S.run += 0; S.ep++; S.qp = { earn: 0, served: 0, upg: 0, vip: 0 }; S.qs = genQuests(S.ep);
    audio.levelUp(); banner(`🏅 Episode ${S.ep} selesai! Bonus ${money(reward)} · +2% pendapatan permanen`); renderAll();
  }
}
function incomeRate() { const nowT = performance.now(); while (incomeWin.length && nowT - incomeWin[0][0] > 20000) incomeWin.shift(); return incomeWin.reduce((a, b) => a + b[1], 0) / 20; }

// ================= UI =================
let tab = 'st';
const TABS = [['st', '🎮 Stasiun'], ['shop', '🏪 Toko'], ['staff', '🧑‍🔧 Staf'], ['quest', '📋 Misi'], ['fr', '👑 Franchise']];
$('tabs').innerHTML = TABS.map(([k, l]) => `<button data-t="${k}">${l}</button>`).join('');
$('tabs').onclick = (e) => { const b = e.target.closest('button'); if (b) { audio.init(); audio.click(); tab = b.dataset.t; renderAll(); } };
function itemCard(id, title, desc, lvText, cost, extraCls = '') {
  const can = cost !== null && cost !== undefined && S.money >= cost; const maxed = cost === null;
  return `<div class="card ${extraCls}"><h4>${title}</h4><p>${desc}</p><span class="lv">${lvText}</span><button data-a="${id}" class="${can ? 'can' : ''}" ${maxed ? 'disabled' : ''}>${maxed ? 'MAKSIMAL' : 'Beli ' + money(cost)}</button></div>`;
}
function stationItems(i) {
  const d = S.st[i]; if (!d.o) return [{ id: 'slot' + i, t: `🔓 Buka Slot ${i + 1}`, desc: 'Tambah stasiun baru untuk lebih banyak pelanggan.', lv: 'Terkunci', cost: SLOT_COST[i] }];
  const nc = CONSOLES[d.c + 1], nt = TVS[d.t + 1], ns = SOFAS[d.s + 1];
  return [
    { id: 'con' + i, t: `🎮 ${CONSOLES[d.c].name}`, desc: nc ? `Upgrade ke ${nc.name} (pendapatan ×${(nc.mult / CONSOLES[d.c].mult).toFixed(1)}).` : 'Konsol sudah yang terbaik.', lv: `×${CONSOLES[d.c].mult}`, cost: nc ? nc.cost : null },
    { id: 'tv' + i, t: `📺 ${TVS[d.t].name}`, desc: nt ? `Upgrade ke ${nt.name}.` : 'TV sudah terbesar.', lv: `×${TVS[d.t].mult}`, cost: nt ? nt.cost : null },
    { id: 'sofa' + i, t: `🛋 ${SOFAS[d.s].name}`, desc: ns ? `Upgrade ke ${ns.name}: pelanggan lebih sabar & tip lebih besar.` : 'Sofa terbaik.', lv: `tip ${Math.round(SOFAS[d.s].tip * 100)}%`, cost: ns ? ns.cost : null },
    { id: 'lay' + i, t: `⭐ Level Layanan ${d.l}`, desc: 'Servis & paket game. +10% pendapatan stasiun ini tiap level. Tanpa batas.', lv: `Rp ${Math.round(personIncome(d)).toLocaleString('id-ID')}/orang`, cost: growth(25000, 1.55, d.l) },
  ];
}
function renderAll() {
  [...$('tabs').children].forEach((b) => b.classList.toggle('on', b.dataset.t === tab));
  let h = '';
  if (tab === 'st') {
    h += '<div class="chips">' + S.st.map((d, i) => `<button data-s="${i}" class="${i === selected ? 'on' : ''}">${d.o ? '🎮' : '🔒'} ${i + 1}</button>`).join('') + '</div><div class="cards">';
    h += stationItems(selected).map((x) => itemCard(x.id, x.t, x.desc, x.lv, x.cost)).join('') + '</div>';
  } else if (tab === 'shop' || tab === 'staff') {
    const list = tab === 'shop' ? SHOP : STAFF; h += '<div class="cards">' + list.map((u) => { const lv = S[u.lvKey]; return itemCard('up' + u.id, u.name, u.desc, u.eff(lv), lv >= u.max ? null : u.cost(lv)); }).join('') + '</div>';
  } else if (tab === 'quest') {
    h += '<div class="qlist">' + `<h4>Episode ${S.ep + 1}</h4>` + (S.qs || []).map((q) => { const p = Math.min(qProg(q), q.n); const pct = Math.min(100, p / q.n * 100); return `<div class="q ${p >= q.n ? 'done' : ''}"><span>${p >= q.n ? '✅' : '🎯'} ${qDesc(q)}</span><div class="bar"><i style="width:${pct}%"></i></div></div>`; }).join('') + '<small>Selesaikan semua misi untuk naik episode. Episode tidak ada habisnya — target makin besar, bonus makin besar.</small></div>';
  } else {
    const stars = Math.floor(Math.sqrt(S.run / 1.5e6)); h += `<div class="cards"><div class="card wide"><h4>👑 Buka Cabang Franchise</h4><p>Reset toko (uang & upgrade) tapi dapat <b>Bintang Franchise</b> permanen: +20% pendapatan per bintang. Episode & statistik tetap. Bisa diulang tanpa batas.</p><span class="lv">Bintang saat ini: ${S.stars} · Tambahan jika reset sekarang: +${stars}</span><button data-a="franchise" class="${stars >= 1 ? 'can' : ''}" ${stars < 1 ? 'disabled' : ''}>${stars < 1 ? 'Butuh ' + money(1.5e6) + ' pendapatan run ini' : 'Buka Cabang (+' + stars + '★)'}</button></div></div>`;
  }
  $('cards').innerHTML = h; renderQuestMini();
}
function renderQuestMini() {
  $('quests').innerHTML = `<b>Episode ${S.ep + 1}</b>` + (S.qs || []).map((q) => { const p = Math.min(qProg(q), q.n); return `<div class="qm ${p >= q.n ? 'done' : ''}">${p >= q.n ? '✅' : '▫'} ${qDesc(q)} <em>${q.t === 'earn' ? money(p) : q.t === 'rep' ? p.toFixed(1) : Math.floor(p)}/${q.t === 'earn' ? money(q.n) : q.t === 'rep' ? q.n.toFixed(1) : q.n}</em></div>`; }).join('');
}
function buy(a) {
  let cost = 0, ok = false; const aff = (c) => S.money >= c;
  if (a.startsWith('slot')) { const i = +a.slice(4); cost = SLOT_COST[i]; if (aff(cost)) { S.money -= cost; S.st[i].o = 1; buildStation(stations[i]); buildGrid(); ok = true; } }
  else if (a.startsWith('con')) { const i = +a.slice(3), d = S.st[i], n = CONSOLES[d.c + 1]; if (n && aff(n.cost)) { S.money -= n.cost; d.c++; buildStation(stations[i]); buildGrid(); ok = true; } }
  else if (a.startsWith('tv')) { const i = +a.slice(2), d = S.st[i], n = TVS[d.t + 1]; if (n && aff(n.cost)) { S.money -= n.cost; d.t++; buildStation(stations[i]); ok = true; } }
  else if (a.startsWith('sofa')) { const i = +a.slice(4), d = S.st[i], n = SOFAS[d.s + 1]; if (n && aff(n.cost)) { S.money -= n.cost; d.s++; buildStation(stations[i]); buildGrid(); ok = true; } }
  else if (a.startsWith('lay')) { const i = +a.slice(3), d = S.st[i]; cost = growth(25000, 1.55, d.l); if (aff(cost)) { S.money -= cost; d.l++; ok = true; } }
  else if (a.startsWith('up')) { const id = a.slice(2), u = [...SHOP, ...STAFF].find((x) => x.id === id), lv = S[u.lvKey]; if (lv < u.max && aff(u.cost(lv))) { S.money -= u.cost(lv); S[u.lvKey]++; if (id === 'staff') syncStaff(); if (['ac', 'decor', 'lobby'].includes(id)) buildDecor(); ok = true; } }
  else if (a === 'franchise') { const stars = Math.floor(Math.sqrt(S.run / 1.5e6)); if (stars >= 1) { doFranchise(stars); return; } }
  if (ok) { S.qp.upg++; audio.buy(); toast('Berhasil dibeli!'); renderAll(); save(); checkQuests(); } else { audio.error(); toast('Uang belum cukup'); }
}
function doFranchise(stars) {
  const keep = { stars: S.stars + stars, ep: S.ep, qs: S.qs, qp: S.qp, life: S.life, served: S.served, music: S.music, sfx: S.sfx, day: S.day, clock: S.clock, franchises: S.franchises + 1 };
  S = { ...defaultState(), ...keep }; S.money = 20000;
  parties.slice().forEach((q) => { scene.remove(...q.members.map((m) => m.p)); }); parties.length = 0; cashierBusy = null; stations.forEach((s) => { s.busy = false; s.reserved = false; });
  stations.forEach(buildStation); buildDecor(); syncStaff(); renderAll(); audio.levelUp(); banner(`👑 Cabang baru dibuka! Total ${S.stars}★ (+${stars}) — pendapatan permanen naik`); save();
}
$('cards').onclick = (e) => {
  audio.init(); const chip = e.target.closest('[data-s]'); if (chip) { selected = +chip.dataset.s; audio.click(); renderAll(); return; }
  const b = e.target.closest('button[data-a]'); if (b && !b.disabled) buy(b.dataset.a); else if (b) audio.error();
};
let toastT = 0; function toast(t) { const el = $('toast'); el.textContent = t; el.style.opacity = 1; clearTimeout(toastT); toastT = setTimeout(() => (el.style.opacity = 0), 1500); }
let banT = 0; function banner(t) { const el = $('banner'); el.textContent = t; el.classList.add('show'); clearTimeout(banT); banT = setTimeout(() => el.classList.remove('show'), 5000); }

// tombol atas
function syncPrefs() { $('btnMus').textContent = S.music ? '🎵' : '🔇'; $('btnSfx').textContent = S.sfx ? '🔊' : '🔈'; $('btnMus').classList.toggle('off', !S.music); $('btnSfx').classList.toggle('off', !S.sfx); }
$('btnMus').onclick = () => { audio.init(); S.music = !S.music; audio.setMusic(S.music); syncPrefs(); save(); };
$('btnSfx').onclick = () => { audio.init(); S.sfx = !S.sfx; audio.setSfx(S.sfx); syncPrefs(); save(); if (S.sfx) audio.click(); };
$('btnHH').onclick = () => { audio.init(); const now = Date.now(); if (now < S.hhReady) { toast('Happy Hour siap lagi dalam ' + Math.ceil((S.hhReady - now) / 1000) + ' dtk'); audio.error(); return; } S.hhUntil = now + 40000; S.hhReady = now + 130000; audio.horn(); banner('🔥 HAPPY HOUR! Pelanggan ×2, pendapatan ×1,5 selama 40 detik'); };

// ================= INPUT =================
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let drag = null, moved = 0, pinch = null;
const cv = $('gl'); const pts = new Map();
cv.addEventListener('pointerdown', (e) => { audio.init(); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); drag = { x: e.clientX, y: e.clientY }; moved = 0; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } });
addEventListener('pointermove', (e) => {
  if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); orbit.dist = Math.max(10, Math.min(34, orbit.dist - (d - pinch) * 0.05)); pinch = d; moved = 99; return; }
  if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved += Math.abs(dx) + Math.abs(dy); orbit.az -= dx * 0.006; orbit.el = Math.max(0.3, Math.min(1.25, orbit.el + dy * 0.004)); drag = { x: e.clientX, y: e.clientY };
});
addEventListener('pointerup', (e) => { const had = pts.delete(e.pointerId); if (had && drag && moved < 8 && pts.size === 0) tap(e); if (!pts.size) { drag = null; pinch = null; } });
cv.addEventListener('wheel', (e) => { orbit.dist = Math.max(10, Math.min(34, orbit.dist + e.deltaY * 0.02)); e.preventDefault(); }, { passive: false });
function tap(e) {
  ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ptr, camera);
  // kasir / meja kasir
  const ch = ray.intersectObjects([cashier, counter], true)[0]; if (ch) { const bonus = Math.max(150, incomeRate() * 1.2); earn(bonus); audio.coin(); popup(CASHIER_POS.clone().add(new THREE.Vector3(0, 2.8, -0.4)), '+' + money(bonus), '#ffe27a'); return; }
  // stasiun
  let best = null, bd = 1e9; stations.forEach((s) => { const c = toWorld(s, 0, 1, 1.6); const r = ray.ray.distanceToPoint(c); if (r < 1.6) { const d = c.distanceTo(ray.ray.origin); if (d < bd) { bd = d; best = s; } } });
  if (best) { selected = best.i; tab = 'st'; audio.click(); renderAll(); if (!S.st[best.i].o && S.money >= SLOT_COST[best.i]) buy('slot' + best.i); }
}

function onResize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.fov = innerWidth < 700 ? 60 : 42; camera.updateProjectionMatrix(); }
addEventListener('resize', onResize);

// ================= LOOP =================
let arrive = 3, saveT = 0, uiT = 0, last = performance.now(), blipT = 0, qT = 0;
function frame(now) {
  const dt = Math.min(0.06, (now - last) / 1000); last = now; clockT += dt;
  updateClock(dt); updateEvents(dt);
  arrive -= dt; if (arrive <= 0) { arrive = arrivalEvery() * (0.7 + Math.random() * 0.6); if (stationsOwned() > 0 && parties.filter((p) => p.state === 'wait' || p.state === 'toLobby').length < lobbySpots()) { if (vipNext) { vipNext = false; spawnVip(); } else spawnParty(); } }
  updateParties(dt); updateStaff(dt); updateFloaters(dt);
  // kasir
  if (cashierBusy && cashierBusy.state === 'pay') poseType(cashier, clockT); else poseStand(cashier, clockT);
  // pintu geser
  let near = false; const dp = new THREE.Vector3(0, 0, HZ); [...parties.flatMap((p) => p.members.map((m) => m.p)), ...staffNPCs.map((s) => s.p)].forEach((p) => { if (p.position.distanceTo(dp) < 2.4) near = true; });
  const tx = near ? 1.55 : 0.7; doorL.position.x += (-tx - doorL.position.x) * Math.min(1, dt * 6); doorR.position.x += (tx - doorR.position.x) * Math.min(1, dt * 6); if (near && !doorOpen) { doorOpen = true; } if (!near) doorOpen = false;
  // layar & lampu stasiun
  for (const st of stations) {
    if (!S.st[st.i].o) continue;
    if ((st.flash -= dt) <= 0) { st.flash = st.busy ? 0.08 : 0.1; drawTV(st, clockT + st.i * 3, st.busy); }
    if (st.glow) { st.glow.color.set(st.busy ? GCOL[st.genre % 5] : '#5588ff'); st.glow.intensity = st.busy ? 4.5 + Math.sin(clockT * 12 + st.i) * 1.2 : 1.6; }
    if (st.led) st.led.material.color.set(st.busy ? 0x33ff88 : 0x3b82f6);
  }
  blipT -= dt; if (blipT <= 0) { blipT = 0.25 + Math.random() * 0.5; if (stations.some((s) => s.busy)) audio.blip(); }
  // paparan pilihan
  const ss = stations[selected]; selRing.position.copy(toWorld(ss, 0, 0.05, 1.8)); selRing.rotation.z = ss.slot.ry; selRing.material.opacity = 0.5 + Math.sin(clockT * 4) * 0.3; selRing.visible = tab === 'st';
  // dinding menghalangi kamera => transparan
  const cx = camera.position.x, cz = camera.position.z; for (const w of walls) { const hide = (w.key === 'back' && cz < -HZ + 1) || (w.key === 'left' && cx < -HX + 1) || (w.key === 'right' && cx > HX - 1); w.m.material.opacity += ((hide ? 0.08 : 1) - w.m.material.opacity) * Math.min(1, dt * 6); w.m.material.depthWrite = w.m.material.opacity > 0.9; }
  // UI
  uiT += dt; if (uiT > 0.25) {
    uiT = 0; $('money').textContent = money(S.money); $('ips').textContent = money(incomeRate()); const r = rep(); const rr = Math.round(r); $('rep').textContent = '★'.repeat(rr) + '☆'.repeat(5 - rr);
    $('stars').textContent = '👑 ' + S.stars; const hh = Math.floor(S.clock), mm = Math.floor((S.clock % 1) * 60); $('clock').textContent = `Hari ${S.day} · ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${hh >= 6 && hh < 18 ? '☀' : '🌙'}`;
    const now2 = Date.now(); const hhb = $('btnHH'); if (hhActive()) { hhb.textContent = '🔥 ' + Math.ceil((S.hhUntil - now2) / 1000) + 's'; hhb.classList.add('act'); } else if (now2 < S.hhReady) { hhb.textContent = '⏳ ' + Math.ceil((S.hhReady - now2) / 1000) + 's'; hhb.classList.remove('act'); } else { hhb.textContent = '⚡ Happy Hour'; hhb.classList.remove('act'); }
    qT += 0.25; if (qT > 1) { qT = 0; checkQuests(); renderQuestMini(); } affordRefresh();
  }
  saveT += dt; if (saveT > 5) { saveT = 0; save(); }
  camera.position.set(orbit.tx + Math.sin(orbit.az) * Math.cos(orbit.el) * orbit.dist, Math.sin(orbit.el) * orbit.dist, orbit.tz + Math.cos(orbit.az) * Math.cos(orbit.el) * orbit.dist); camera.lookAt(orbit.tx, 0.3, orbit.tz);
  renderer.render(scene, camera); requestAnimationFrame(frame);
}
let doorOpen = false, lastAff = '';
function affordRefresh() { const k = Math.floor(S.money / 500) + tab + selected; if (k === lastAff) return; lastAff = k; renderAll(); }
function spawnVip() { const before = parties.length; const sv = Math.random; Math.random = () => 0.01; try { spawnParty(); } finally { Math.random = sv; } void before; }

// ================= BOOT =================
load();
if (!S.qs) S.qs = genQuests(S.ep);
{ const away = (Date.now() - (S.seen || Date.now())) / 1000;
  if (away > 60 && S.life > 0) { const per = S.st.filter((x) => x.o).reduce((a, d) => a + personIncome(d) * 1.4 / (sessionLen() + 6), 0) * 0.5; const amt = Math.floor(per * Math.min(away, 8 * 3600)); if (amt > 0) { S.money += amt; S.run += amt; S.life += amt; $('welcomeTxt').textContent = `Toko tetap buka ${Math.round(away / 60)} menit dan menghasilkan ${money(amt)}.`; $('welcome').classList.remove('hidden'); } } }
$('welcomeOk').onclick = () => { audio.init(); $('welcome').classList.add('hidden'); audio.cash(); };
stations.forEach(buildStation); buildDecor(); syncStaff(); syncPrefs(); renderAll(); onResize();
addEventListener('pointerdown', () => { audio.init(); audio.setMusic(S.music); audio.setSfx(S.sfx); }, { once: true });
addEventListener('keydown', () => { audio.init(); audio.setMusic(S.music); audio.setSfx(S.sfx); }, { once: true });
window.__rp = { get S() { return S; }, stations, parties, orbit, spawnParty, buy, findPath };
requestAnimationFrame(frame);
