import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
const SAVE = 'rafli-ps-save-v1';

// ================= DATA & EKONOMI =================
const CONSOLES = [
  { name: 'PS3 Slim', mult: 1, cost: 0, color: 0x1a1a1d },
  { name: 'PS4', mult: 1.9, cost: 120000, color: 0x15161a },
  { name: 'PS5', mult: 3.6, cost: 650000, color: 0xf2f3f7 },
];
const TVS = [
  { name: 'TV 32"', mult: 1, cost: 0, s: 0.85 },
  { name: 'TV 43" 4K', mult: 1.25, cost: 90000, s: 1.1 },
  { name: 'TV 55" OLED', mult: 1.6, cost: 380000, s: 1.4 },
];
const SLOT_COST = [0, 0, 60000, 160000, 420000, 1200000]; // slot 0,1 gratis
const BASE_PRICE = 5000; // Rp per sesi (1 jam)
const SESSION_SEC = 14;
const GAMES = [100000, 420000, 1600000, 6500000];
const SHOP_UP = {
  kasir: { name: 'Kasir Otomatis', desc: 'Uang langsung masuk tanpa perlu diambil.', costs: [150000], max: 1 },
  ac: { name: 'AC & Kenyamanan', desc: 'Reputasi naik, pelanggan betah.', costs: [250000, 900000, 3500000], max: 3 },
  decor: { name: 'Dekorasi Neon & Poster', desc: 'Toko makin keren, pelanggan lebih banyak.', costs: [200000, 800000, 3000000], max: 3 },
  snack: { name: 'Warung Snack & Minuman', desc: 'Tambahan 15% pendapatan tiap level.', costs: [180000, 700000, 2800000, 9000000], max: 4 },
  mkt: { name: 'Promosi Medsos', desc: 'Pelanggan datang lebih sering.', costs: [100000, 450000, 1800000, 7000000, 25000000], max: 5 },
  staff: { name: 'Pegawai Jaga', desc: 'Antrean cepat, sesi lebih cepat selesai.', costs: [500000, 2500000, 11000000], max: 3 },
};

let S = defaultState();
function defaultState() {
  return { money: 0, total: 0, st: [ { o: 1, c: 0, t: 0 }, { o: 1, c: 0, t: 0 }, { o: 0, c: 0, t: 0 }, { o: 0, c: 0, t: 0 }, { o: 0, c: 0, t: 0 }, { o: 0, c: 0, t: 0 } ], g: 0, kasir: 0, ac: 0, decor: 0, snack: 0, mkt: 0, staff: 0, seen: Date.now(), ips: 0 };
}
function load() { try { const s = JSON.parse(localStorage.getItem(SAVE)); if (s && s.st) S = { ...defaultState(), ...s }; } catch (e) { /* abaikan */ } }
function save() { try { S.seen = Date.now(); localStorage.setItem(SAVE, JSON.stringify(S)); } catch (e) { /* abaikan */ } }

const rep = () => Math.min(5, 1 + S.ac * 0.6 + S.decor * 0.5 + S.snack * 0.3 + S.g * 0.2 + S.st.filter((x) => x.o && x.c >= 2).length * 0.1);
const sessionIncome = (st) => Math.round(BASE_PRICE * CONSOLES[st.c].mult * TVS[st.t].mult * (1 + S.g * 0.25) * (1 + S.snack * 0.15) * (1 + (rep() - 1) * 0.08));
const arrivalEvery = () => Math.max(1.2, 6.5 / (1 + S.mkt * 0.45 + (rep() - 1) * 0.25));
const sessionLen = () => SESSION_SEC / (1 + S.staff * 0.18);

function money(n) {
  n = Math.floor(n);
  if (n >= 1e12) return 'Rp ' + (n / 1e12).toFixed(2).replace('.', ',') + ' T';
  if (n >= 1e9) return 'Rp ' + (n / 1e9).toFixed(2).replace('.', ',') + ' M';
  if (n >= 1e6) return 'Rp ' + (n / 1e6).toFixed(2).replace('.', ',') + ' Jt';
  if (n >= 1e3) return 'Rp ' + (n / 1e3).toFixed(1).replace('.', ',') + ' Rb';
  return 'Rp ' + n;
}

// ================= THREE =================
const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0a0b14); scene.fog = new THREE.Fog(0x0a0b14, 30, 60);
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
const orbit = { az: 0.75, el: 0.62, dist: 18.5, tx: 0, tz: 1.8 };

scene.add(new THREE.HemisphereLight(0xaab4ff, 0x2a2030, 0.8));
const key = new THREE.DirectionalLight(0xfff0dd, 1.6); key.position.set(8, 16, 10); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -14, right: 14, top: 12, bottom: -12, near: 1, far: 50 }); scene.add(key);

function canvasTex(w, h, fn, srgb = true) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); fn(g, w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData = { c, g }; return t; }
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });

// ---- ruangan ----
const W = 16, D = 12;
const roomGroup = new THREE.Group(); scene.add(roomGroup);
const floorTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#2b2d3a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1d1f2b'; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.moveTo(0, i * h / 4); g.lineTo(w, i * h / 4); g.stroke(); } for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } });
floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(W / 4, D / 4);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), std(0xffffff, { map: floorTex, roughness: 0.35, metalness: 0.15 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; roomGroup.add(floor);
const outside = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), std(0x14161f)); outside.rotation.x = -Math.PI / 2; outside.position.y = -0.02; scene.add(outside);
const wallMat = std(0x3a3f66, { roughness: 0.9 });
const back = new THREE.Mesh(new THREE.BoxGeometry(W, 4.2, 0.3), wallMat); back.position.set(0, 2.1, -D / 2); back.receiveShadow = true; roomGroup.add(back);
const left = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.2, D), wallMat); left.position.set(-W / 2, 2.1, 0); left.receiveShadow = true; roomGroup.add(left);
const base = new THREE.Mesh(new THREE.BoxGeometry(W + 0.3, 0.12, 0.35), std(0x111320)); base.position.set(0, 0.06, D / 2); roomGroup.add(base);
// papan nama neon
const signTex = canvasTex(1024, 256, (g, w, h) => {
  g.fillStyle = '#0b0d1f'; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 88px sans-serif'; g.shadowColor = '#3b82f6'; g.shadowBlur = 36; g.fillStyle = '#e6f0ff'; g.fillText('RAFLI', 175, 100);
  g.shadowColor = '#f472b6'; g.fillStyle = '#ffd6ec'; g.fillText('PLAYSTATION', 670, 100);
  g.shadowBlur = 20; g.font = '900 54px sans-serif';
  const sy = [['△', '#4ade80'], ['○', '#f87171'], ['✕', '#60a5fa'], ['□', '#f472b6']]; sy.forEach(([c, col], i) => { g.fillStyle = col; g.shadowColor = col; g.fillText(c, 340 + i * 115, 205); });
});
const sign = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 2.1), new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false })); sign.position.set(0, 3.2, -D / 2 + 0.2); roomGroup.add(sign);
const neonL = new THREE.PointLight(0x3b82f6, 18, 14); neonL.position.set(-3, 3.2, -4.2); scene.add(neonL);
const neonR = new THREE.PointLight(0xf472b6, 18, 14); neonR.position.set(3, 3.2, -4.2); scene.add(neonR);
// strip LED langit
const strips = []; for (const [x, z, c] of [[-W / 2 + 0.3, 0, 0x3b82f6], [0, -D / 2 + 0.3, 0xf472b6]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(x ? 0.06 : W - 0.6, 0.06, x ? D - 0.6 : 0.06), new THREE.MeshBasicMaterial({ color: c, toneMapped: false })); m.position.set(x, 4.0, z); roomGroup.add(m); strips.push(m); }
// pintu kaca depan
const door = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.4, 0.08), new THREE.MeshPhysicalMaterial({ color: 0x88aaff, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.2 })); door.position.set(-1, 1.7, D / 2); scene.add(door);
const mat = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.2), new THREE.MeshBasicMaterial({ map: canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#20233f'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.fillText('WELCOME', w / 2, 55); g.font = '20px sans-serif'; g.fillText('Rafli PlayStation', w / 2, 90); }) })); mat.rotation.x = -Math.PI / 2; mat.position.set(-1, 0.03, D / 2 - 1.0); roomGroup.add(mat);
// karpet tengah
const rug = new THREE.Mesh(new THREE.PlaneGeometry(5, 3), std(0x2a2160, { roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(0.5, 0.02, 2.5); roomGroup.add(rug);

// dekorasi (tampil sesuai level)
const decorGroup = new THREE.Group(); roomGroup.add(decorGroup);
function buildDecor() {
  decorGroup.clear();
  if (S.decor >= 1) { // poster
    const mk = (txt, c1, c2) => canvasTex(128, 180, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = 'bold 22px sans-serif'; g.textAlign = 'center'; g.fillText(txt, w / 2, h - 18); g.font = '60px sans-serif'; g.fillText('🎮', w / 2, 90); });
    [['FIFA', '#0a7', '#046'], ['GTA', '#f60', '#a02'], ['TEKKEN', '#c22', '#413']].forEach(([t, a, b], i) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.55), new THREE.MeshBasicMaterial({ map: mk(t, a, b) })); p.position.set(-W / 2 + 0.2, 2.1, -3.2 + i * 2.1 + 0.8); p.rotation.y = Math.PI / 2; decorGroup.add(p); });
  }
  if (S.decor >= 2) { // tanaman
    for (const [x, z] of [[7.2, -5], [-7.2, 5.2], [7.3, 0.2]]) { const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.25, 0.5, 14), std(0x7a4a2a)); pot.position.set(x, 0.25, z); const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), std(0x2d9b4e, { roughness: 0.9 })); lf.position.set(x, 0.95, z); lf.scale.y = 1.3; lf.castShadow = true; decorGroup.add(pot, lf); }
  }
  if (S.decor >= 3) { // lampu gantung neon
    for (const [x, c] of [[-4, 0x3b82f6], [0, 0xf472b6], [4, 0x4ade80]]) { const m = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.035, 8, 32), new THREE.MeshBasicMaterial({ color: c, toneMapped: false })); m.position.set(x, 3.6, 1.5); m.rotation.x = Math.PI / 2; decorGroup.add(m); const l = new THREE.PointLight(c, 8, 8); l.position.set(x, 3.4, 1.5); decorGroup.add(l); }
  }
  if (S.ac >= 1) { const ac = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.4), std(0xeeeeee, { roughness: 0.4 })); ac.position.set(-6, 3.6, -D / 2 + 0.4); decorGroup.add(ac); const ac2 = ac.clone(); ac2.position.x = 6; if (S.ac >= 2) decorGroup.add(ac2); }
  if (S.snack >= 1) { // kulkas minuman
    const fr = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.2, 0.9), std(0x2a6ff0, { metalness: 0.3 })); fr.position.set(7.3, 1.1, -3.4); fr.castShadow = true; decorGroup.add(fr);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.7), new THREE.MeshBasicMaterial({ map: canvasTex(64, 128, (g, w, h) => { g.fillStyle = '#cfe8ff'; g.fillRect(0, 0, w, h); for (let i = 0; i < 12; i++) { g.fillStyle = ['#e33', '#3a3', '#fa0', '#36f'][i % 4]; g.fillRect(8 + (i % 3) * 18, 8 + Math.floor(i / 3) * 28, 12, 22); } }) })); gl.position.set(7.3 - 0.0, 1.15, -3.4 + 0.46); decorGroup.add(gl);
  }
}

// ---- meja kasir ----
const counter = new THREE.Group(); counter.position.set(6.2, 0, 3.2); counter.rotation.y = -Math.PI / 2; roomGroup.add(counter);
{
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.05, 0.9), std(0x262a52)); body.position.y = 0.52; body.castShadow = true; counter.add(body);
  const top = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 1.05), std(0xf0f0f5, { roughness: 0.2 })); top.position.y = 1.08; counter.add(top);
  const mon = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.04), std(0x111, { emissive: 0x1a4a8a, emissiveIntensity: 0.8 })); mon.position.set(-0.7, 1.4, -0.1); counter.add(mon);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.06), std(0x333)); stand.position.set(-0.7, 1.2, -0.1); counter.add(stand);
  const pig = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), std(0xf7a8c0)); pig.position.set(0.9, 1.3, 0); counter.add(pig);
}

// ---- pembuat model ----
function makeController(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.12, 4, 10), std(color, { roughness: 0.4 })); body.rotation.z = Math.PI / 2; body.scale.set(1, 1, 0.9); g.add(body);
  for (const sx of [-1, 1]) { const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.07, 4, 8), std(color, { roughness: 0.4 })); grip.position.set(sx * 0.1, -0.03, 0.02); grip.rotation.x = 0.4; g.add(grip); }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.012, 0.02), new THREE.MeshBasicMaterial({ color: 0x3b82f6, toneMapped: false })); bar.position.set(0, 0.03, -0.045); g.add(bar);
  return g;
}
function makeConsole(level) {
  const g = new THREE.Group(); const c = CONSOLES[level];
  if (level === 2) { // PS5: bodi putih melengkung + panel hitam
    const mid = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.26), std(0x0f1016, { roughness: 0.3 })); mid.position.y = 0.26; g.add(mid);
    for (const sx of [-1, 1]) { const sh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.26), std(0xf4f5fa, { roughness: 0.25 })); sh.position.set(sx * 0.08, 0.26, 0); g.add(sh); const wing = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.045, 3), std(0xf4f5fa, { roughness: 0.25 })); wing.scale.set(1, 1, 1); wing.rotation.set(0, Math.PI / 2, 0); wing.position.set(sx * 0.115, 0.27, 0); wing.rotation.z = Math.PI / 2; wing.scale.set(1.5, 1, 1.3); g.add(wing); }
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.46, 0.2), new THREE.MeshBasicMaterial({ color: 0x3b82f6, toneMapped: false })); led.position.set(0.0, 0.26, 0.131); g.add(led); g.userData.led = led;
  } else if (level === 1) { // PS4: jajar genjang hitam
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.5, 0); sh.lineTo(0.42, 0.1); sh.lineTo(0, 0.1); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false }); geo.translate(-0.25, 0.0, -0.15);
    const m = new THREE.Mesh(geo, std(c.color, { roughness: 0.35, metalness: 0.2 })); m.position.y = 0.0; g.add(m);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.008, 0.004), new THREE.MeshBasicMaterial({ color: 0x3b82f6, toneMapped: false })); led.position.set(0, 0.095, 0.152); g.add(led); g.userData.led = led;
  } else { // PS3 slim
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, 0.28), std(c.color, { roughness: 0.3, metalness: 0.3 })); m.position.y = 0.035; g.add(m);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.004), new THREE.MeshBasicMaterial({ color: 0xff3030, toneMapped: false })); led.position.set(0.12, 0.05, 0.142); g.add(led); g.userData.led = led;
  }
  g.traverse((o) => { o.castShadow = true; });
  return g;
}
function makeSofa(color) {
  const g = new THREE.Group(); const m = std(color, { roughness: 0.85 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.4, 0.9), m); seat.position.y = 0.35; g.add(seat);
  const bk = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.7, 0.25), m); bk.position.set(0, 0.8, 0.35); g.add(bk);
  for (const sx of [-1, 1]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.55, 0.9), m); arm.position.set(sx * 1.08, 0.5, 0); g.add(arm); }
  g.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
  return g;
}

// ---- stasiun ----
const SLOTS = [
  { x: -6, z: -5.2, ry: 0 }, { x: -2, z: -5.2, ry: 0 }, { x: 2, z: -5.2, ry: 0 }, { x: 6, z: -5.2, ry: 0 },
  { x: -7.4, z: -0.6, ry: Math.PI / 2 }, { x: -7.4, z: 2.8, ry: Math.PI / 2 },
];
const stations = SLOTS.map((p, i) => {
  const g = new THREE.Group(); g.position.set(p.x, 0, p.z); g.rotation.y = p.ry; scene.add(g);
  const st = { i, g, slot: p, tvCanvas: null, busy: false, reserved: false, coin: 0, coinSprite: null, parts: new THREE.Group(), lockSprite: null, flash: 0 };
  g.add(st.parts); return st;
});
const seatWorld = (st) => st.g.localToWorld(new THREE.Vector3(0, 0, 2.7));
const approachWorld = (st) => st.g.localToWorld(new THREE.Vector3(0, 0, 4.0));

function buildStation(st) {
  st.parts.clear(); const d = S.st[st.i];
  if (st.lockSprite) { st.g.remove(st.lockSprite); st.lockSprite = null; }
  if (!d.o) { // slot terkunci
    const sp = labelSprite('🔒 Slot ' + (st.i + 1) + '\n' + money(SLOT_COST[st.i]), '#ffd45e');
    sp.position.set(0, 1.4, 1.6); sp.scale.set(2.2, 1.1, 1); st.g.add(sp); st.lockSprite = sp;
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 4.4), new THREE.MeshBasicMaterial({ color: 0x222850, transparent: true, opacity: 0.55 })); pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.03, 2.0); st.parts.add(pad);
    st.tvTex = null; return;
  }
  const tv = TVS[d.t], cs = CONSOLES[d.c];
  // meja TV
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.7), std(0x2a2724, { roughness: 0.7 })); cab.position.set(0, 0.3, 0.1); cab.castShadow = true; cab.receiveShadow = true; st.parts.add(cab);
  const w = 1.7 * tv.s, h = 0.96 * tv.s;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, h + 0.1, 0.07), std(0x08080a, { roughness: 0.3 })); frame.position.set(0, 0.6 + h / 2 + 0.2, 0); frame.castShadow = true; st.parts.add(frame);
  const tex = canvasTex(128, 72, () => {}); st.tvTex = tex;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); scr.position.set(0, 0.6 + h / 2 + 0.2, 0.037); st.parts.add(scr);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.2), std(0x08080a)); stand.position.set(0, 0.7, 0); st.parts.add(stand);
  const glow = new THREE.PointLight(0x5588ff, 3, 5); glow.position.set(0, 1.4, 1.3); st.parts.add(glow); st.glow = glow;
  // konsol di atas meja
  const cons = makeConsole(d.c); cons.position.set(-0.7, 0.6, 0.2); st.parts.add(cons); st.led = cons.userData.led;
  const ctl = makeController(d.c === 2 ? 0xf4f5fa : 0x16171c); ctl.position.set(0.7, 0.63, 0.25); st.parts.add(ctl);
  // sofa & meja kecil
  const sofa = makeSofa([0x6d2ce0, 0x1d6fd8, 0xc2410c, 0x0f9d7a, 0xb4236b, 0x4b5563][st.i]); sofa.position.set(0, 0, 3.3); sofa.rotation.y = Math.PI; st.parts.add(sofa);
  // label konsol
  const lab = labelSprite(cs.name + ' · ' + tv.name, '#9fc3ff'); lab.position.set(0, 0.6 + h + 0.55, 0); lab.scale.set(2.4, 0.5, 1); st.parts.add(lab);
  st.labelSprite = lab;
}

function labelSprite(text, color = '#fff') {
  const lines = text.split('\n');
  const t = canvasTex(512, 64 * lines.length, (g, w, h) => { g.clearRect(0, 0, w, h); g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 8; g.strokeStyle = '#000c'; g.fillStyle = color; lines.forEach((l, i) => { g.strokeText(l, w / 2, 32 + i * 64); g.fillText(l, w / 2, 32 + i * 64); }); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false })); s.renderOrder = 10; return s;
}

// animasi layar TV
const GAME_COLS = [['#16a34a', '#052e16'], ['#dc2626', '#450a0a'], ['#2563eb', '#172554'], ['#c026d3', '#4a044e'], ['#f59e0b', '#451a03']];
function drawTV(st, t, playing) {
  const tex = st.tvTex; if (!tex) return; const { g, c } = tex.userData; const w = c.width, h = c.height;
  if (!playing) { // menu PS
    g.fillStyle = '#0a0f2a'; g.fillRect(0, 0, w, h); const gr = g.createRadialGradient(w / 2, h, 4, w / 2, h, w); gr.addColorStop(0, '#2457d6aa'); gr.addColorStop(1, '#0000'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.fillText('RAFLI PLAYSTATION', w / 2, 32); g.font = '20px sans-serif'; g.fillText('△ ○ ✕ □', w / 2, 56);
  } else {
    const [a, b] = GAME_COLS[st.game % GAME_COLS.length]; const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5; i++) { g.fillStyle = `rgba(255,255,255,${0.12 + 0.1 * Math.sin(t * 3 + i)})`; g.fillRect((Math.sin(t * (1.2 + i * 0.4) + i) * 0.5 + 0.5) * (w - 24), (Math.cos(t * (0.9 + i * 0.3) + i * 2) * 0.5 + 0.5) * (h - 14), 24, 14); }
    g.fillStyle = '#fff'; g.font = 'bold 10px sans-serif'; g.textAlign = 'left'; g.fillText('SCORE ' + Math.floor(t * 137 % 99999), 5, 11);
  }
  tex.needsUpdate = true;
}

// ---- orang ----
const SKIN = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac];
function makePerson(kind = 'cust') {
  const g = new THREE.Group();
  const shirt = kind === 'cashier' ? 0x2563eb : [0xef4444, 0x22c55e, 0xf59e0b, 0x8b5cf6, 0x06b6d4, 0xec4899, 0x64748b][Math.floor(Math.random() * 7)];
  const pants = [0x1f2937, 0x374151, 0x1e3a8a, 0x3f3f46][Math.floor(Math.random() * 4)];
  const skin = SKIN[Math.floor(Math.random() * SKIN.length)];
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 4, 10), std(shirt)); torso.position.y = 1.0; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 12), std(skin, { roughness: 0.7 })); head.position.y = 1.5; g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), std(kind === 'cashier' ? 0x222 : [0x1a1a1a, 0x3b2314, 0x111][Math.floor(Math.random() * 3)], { roughness: 0.9 })); hair.position.y = 1.52; g.add(hair);
  if (kind === 'cust' && Math.random() < 0.4) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.19, 0.08, 14), std(0x111827)); cap.position.y = 1.62; g.add(cap); }
  const mkLimb = (r, l, c, x, y) => { const piv = new THREE.Group(); piv.position.set(x, y, 0); const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 3, 8), std(c)); m.position.y = -l / 2 - r; piv.add(m); g.add(piv); return piv; };
  g.userData.armL = mkLimb(0.065, 0.36, shirt, -0.27, 1.25); g.userData.armR = mkLimb(0.065, 0.36, shirt, 0.27, 1.25);
  g.userData.legL = mkLimb(0.08, 0.42, pants, -0.1, 0.66); g.userData.legR = mkLimb(0.08, 0.42, pants, 0.1, 0.66);
  g.traverse((o) => { o.castShadow = true; });
  g.userData.phase = Math.random() * 6;
  return g;
}
const DOOR = new THREE.Vector3(-1, 0, D / 2 + 3);
const DOORIN = new THREE.Vector3(-1, 0, D / 2 - 1.4);
const cashier = makePerson('cashier'); cashier.position.set(6.2, 0, 4.6); cashier.rotation.y = -Math.PI / 2; scene.add(cashier);
const customers = [];

function spawnCustomer() {
  const free = stations.filter((s) => S.st[s.i].o && !s.busy && !s.reserved);
  if (!free.length) return;
  const st = free[Math.floor(Math.random() * free.length)]; st.reserved = true;
  const p = makePerson(); p.position.copy(DOOR); scene.add(p);
  const way = [DOORIN.clone(), new THREE.Vector3(DOORIN.x, 0, approachWorld(st).z > 3 ? approachWorld(st).z : 3.2), approachWorld(st), seatWorld(st)];
  customers.push({ p, st, state: 'walk', way, wi: 0, t: 0, speed: 2.6 + Math.random() * 0.8, income: sessionIncome(S.st[st.i]), len: sessionLen() * (0.85 + Math.random() * 0.3), cheer: 0 });
}

function animateLimbs(p, moving, t) {
  const u = p.userData; const s = moving ? Math.sin(t * 9 + u.phase) * 0.7 : 0;
  u.legL.rotation.x = s; u.legR.rotation.x = -s; u.armL.rotation.x = -s * 0.8; u.armR.rotation.x = s * 0.8; p.position.y = moving ? Math.abs(Math.sin(t * 9 + u.phase)) * 0.04 : 0;
}

let clock = 0;
function updateCustomers(dt) {
  for (let i = customers.length - 1; i >= 0; i--) {
    const c = customers[i], p = c.p;
    if (c.state === 'walk' || c.state === 'leave') {
      const tgt = c.way[c.wi]; const dir = tgt.clone().sub(p.position); dir.y = 0; const dist = dir.length();
      if (dist < 0.12) {
        c.wi++;
        if (c.wi >= c.way.length) {
          if (c.state === 'walk') { c.state = 'play'; c.t = 0; c.st.busy = true; c.st.game = Math.floor(Math.random() * 5); p.rotation.y = c.st.slot.ry + Math.PI; p.position.copy(seatWorld(c.st)); p.position.y = -0.25; p.userData.legL.rotation.x = p.userData.legR.rotation.x = -1.4; p.userData.armL.rotation.x = p.userData.armR.rotation.x = -1.1; }
          else { scene.remove(p); customers.splice(i, 1); }
        }
        continue;
      }
      dir.normalize(); const sp = c.speed * dt; p.position.addScaledVector(dir, Math.min(sp, dist)); p.rotation.y = Math.atan2(dir.x, dir.z); animateLimbs(p, true, clock);
    } else if (c.state === 'play') {
      c.t += dt; const prog = c.t / c.len;
      p.userData.armL.rotation.x = p.userData.armR.rotation.x = -1.15 + Math.sin(clock * 11 + p.userData.phase) * 0.06;
      p.position.y = -0.25 + (Math.sin(clock * 3 + p.userData.phase) > 0.97 ? 0.08 : 0);
      if (c.t >= c.len) { // selesai: bayar
        c.st.busy = false; c.st.reserved = false; p.position.y = 0; p.userData.legL.rotation.x = p.userData.legR.rotation.x = 0;
        giveCoin(c.st, c.income);
        c.state = 'leave'; c.way = [approachWorld(c.st), new THREE.Vector3(DOORIN.x, 0, approachWorld(c.st).z > 3 ? approachWorld(c.st).z : 3.2), DOORIN.clone(), DOOR.clone()]; c.wi = 0;
      }
      void prog;
    }
  }
}

// ---- koin ----
const coinTex = canvasTex(128, 128, (g, w, h) => { g.beginPath(); g.arc(64, 64, 52, 0, 7); g.fillStyle = '#ffcc33'; g.fill(); g.lineWidth = 8; g.strokeStyle = '#b8860b'; g.stroke(); g.fillStyle = '#8a5a00'; g.font = 'bold 56px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Rp', 64, 68); });
const floaters = [];
function giveCoin(st, amt) {
  if (S.kasir > 0) { earn(amt); popup(seatWorld(st).clone().add(new THREE.Vector3(0, 1.8, 0)), '+' + money(amt)); return; }
  st.coin += amt;
  if (!st.coinSprite) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: coinTex, depthTest: false })); s.scale.set(0.9, 0.9, 1); s.renderOrder = 11; s.userData.st = st; st.g.add(s); s.position.set(0, 2.9, 1.6); st.coinSprite = s; }
}
function collectStation(st) { if (st.coin > 0) { const a = st.coin; st.coin = 0; earn(a); popup(st.g.localToWorld(new THREE.Vector3(0, 3, 1.6)), '+' + money(a)); beep(); } if (st.coinSprite) { st.g.remove(st.coinSprite); st.coinSprite = null; } }
function earn(a) { S.money += a; S.total += a; incomeWindow.push([performance.now(), a]); }
const incomeWindow = [];
function popup(pos, text) { const s = labelSprite(text, '#ffe27a'); s.position.copy(pos); s.scale.set(1.9, 0.5, 1); scene.add(s); floaters.push({ s, t: 0 }); }
function updateFloaters(dt) { for (let i = floaters.length - 1; i >= 0; i--) { const f = floaters[i]; f.t += dt; f.s.position.y += dt * 0.9; f.s.material.opacity = Math.max(0, 1 - f.t / 1.4); if (f.t > 1.4) { scene.remove(f.s); floaters.splice(i, 1); } } }

// ================= UPGRADE UI =================
let tab = 'st';
const TABS = [['st', '🎮 Stasiun'], ['shop', '🏪 Toko'], ['gm', '💿 Game']];
$('tabs').innerHTML = TABS.map(([k, l]) => `<button data-t="${k}">${l}</button>`).join('');
$('tabs').onclick = (e) => { const b = e.target.closest('button'); if (b) { tab = b.dataset.t; renderCards(); } };
function card(title, desc, lv, cost, act, extra = '') {
  const can = S.money >= cost;
  return `<div class="card"><h4>${title}</h4><p>${desc}</p><span class="lv">${lv}</span><button class="${can ? 'can' : ''}" ${cost === null ? 'disabled' : ''} data-a="${act}">${cost === null ? 'MAKSIMAL' : 'Beli ' + money(cost)}</button>${extra}</div>`;
}
function renderCards() {
  [...$('tabs').children].forEach((b) => b.classList.toggle('on', b.dataset.t === tab));
  let h = '';
  if (tab === 'st') {
    S.st.forEach((d, i) => {
      if (!d.o) { h += card(`Slot ${i + 1} (terkunci)`, 'Tambah stasiun baru untuk pelanggan lebih banyak.', '—', SLOT_COST[i], 'slot' + i); return; }
      const nc = CONSOLES[d.c + 1], nt = TVS[d.t + 1];
      h += card(`Stasiun ${i + 1}: ${CONSOLES[d.c].name}`, nc ? `Upgrade ke ${nc.name} (×${nc.mult} pendapatan).` : 'Konsol sudah terbaik.', `Rp ${sessionIncome(d).toLocaleString('id-ID')}/sesi`, nc ? nc.cost : null, 'con' + i);
      h += card(`Stasiun ${i + 1}: ${TVS[d.t].name}`, nt ? `Upgrade ke ${nt.name} (×${nt.mult}).` : 'TV sudah terbesar.', `×${TVS[d.t].mult}`, nt ? nt.cost : null, 'tv' + i);
    });
  } else if (tab === 'shop') {
    for (const [k, u] of Object.entries(SHOP_UP)) { const lv = S[k]; h += card(u.name, u.desc, `Level ${lv}/${u.max}`, lv >= u.max ? null : u.costs[lv], 'up' + k); }
  } else {
    const names = ['Paket Game Olahraga', 'Paket Game Balap & Aksi', 'Paket Game AAA Terbaru', 'Langganan PS Plus Premium'];
    GAMES.forEach((c, i) => { h += card(names[i], `+25% pendapatan semua stasiun.`, S.g > i ? 'Dimiliki ✓' : S.g === i ? 'Tersedia' : 'Beli yang sebelumnya dulu', S.g > i ? null : S.g === i ? c : Infinity, 'game' + i); });
  }
  $('cards').innerHTML = h;
  $('cards').querySelectorAll('button').forEach((b) => { if (b.textContent.includes('Infinity')) { b.textContent = 'Terkunci'; b.disabled = true; } });
}
$('cards').onclick = (e) => {
  const b = e.target.closest('button[data-a]'); if (!b || b.disabled) return; const a = b.dataset.a; let cost = 0, ok = false;
  if (a.startsWith('slot')) { const i = +a.slice(4); cost = SLOT_COST[i]; if (S.money >= cost) { S.money -= cost; S.st[i].o = 1; buildStation(stations[i]); ok = true; } }
  else if (a.startsWith('con')) { const i = +a.slice(3), d = S.st[i], n = CONSOLES[d.c + 1]; if (n && S.money >= n.cost) { S.money -= n.cost; d.c++; buildStation(stations[i]); ok = true; } }
  else if (a.startsWith('tv')) { const i = +a.slice(2), d = S.st[i], n = TVS[d.t + 1]; if (n && S.money >= n.cost) { S.money -= n.cost; d.t++; buildStation(stations[i]); ok = true; } }
  else if (a.startsWith('up')) { const k = a.slice(2), u = SHOP_UP[k], lv = S[k]; if (lv < u.max && S.money >= u.costs[lv]) { S.money -= u.costs[lv]; S[k]++; buildDecor(); ok = true; } }
  else if (a.startsWith('game')) { const i = +a.slice(4); if (S.g === i && S.money >= GAMES[i]) { S.money -= GAMES[i]; S.g++; ok = true; } }
  if (ok) { beep(true); toast('Berhasil dibeli!'); renderCards(); save(); } else toast('Uang belum cukup');
};
let toastT = 0; function toast(t) { const el = $('toast'); el.textContent = t; el.style.opacity = 1; clearTimeout(toastT); toastT = setTimeout(() => (el.style.opacity = 0), 1400); }

// ================= SUARA (koin sederhana) =================
let actx = null, muted = false;
function beep(big) { if (muted) return; try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const t = actx.currentTime; const o = actx.createOscillator(), g = actx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(big ? 660 : 880, t); o.frequency.exponentialRampToValueAtTime(big ? 1320 : 1760, t + 0.09); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25); o.connect(g).connect(actx.destination); o.start(t); o.stop(t + 0.28); } catch (e) { /* abaikan */ } }
$('btnSnd').onclick = () => { muted = !muted; $('btnSnd').textContent = muted ? '🔇' : '🔊'; };

// ================= INPUT =================
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let drag = null, moved = 0;
const cv = $('gl');
cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; moved = 0; });
addEventListener('pointermove', (e) => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved += Math.abs(dx) + Math.abs(dy); orbit.az -= dx * 0.006; orbit.el = Math.max(0.25, Math.min(1.2, orbit.el + dy * 0.004)); drag = { x: e.clientX, y: e.clientY }; });
addEventListener('pointerup', (e) => { if (drag && moved < 8) tap(e); drag = null; });
cv.addEventListener('wheel', (e) => { orbit.dist = Math.max(10, Math.min(30, orbit.dist + e.deltaY * 0.02)); e.preventDefault(); }, { passive: false });
function tap(e) {
  ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ptr, camera);
  const coins = stations.filter((s) => s.coinSprite).map((s) => s.coinSprite);
  const hit = ray.intersectObjects(coins, false)[0]; if (hit) { collectStation(hit.object.userData.st); return; }
  // tap stasiun terkunci
  const locks = stations.filter((s) => s.lockSprite).map((s) => s.lockSprite); const h2 = ray.intersectObjects(locks, false)[0];
  if (h2) { const st = stations.find((s) => s.lockSprite === h2.object); const i = st.i; if (S.money >= SLOT_COST[i]) { S.money -= SLOT_COST[i]; S.st[i].o = 1; buildStation(st); beep(true); toast('Slot dibuka!'); renderCards(); save(); } else toast('Butuh ' + money(SLOT_COST[i])); }
}
$('collect').onclick = () => stations.forEach(collectStation);

function onResize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.fov = innerWidth < 700 ? 58 : 42; camera.updateProjectionMatrix(); }
addEventListener('resize', onResize);

// ================= LOOP =================
let arrive = 2, saveT = 0, uiT = 0, last = performance.now();
function frame(now) {
  const dt = Math.min(0.06, (now - last) / 1000); last = now; clock += dt;
  arrive -= dt; if (arrive <= 0) { arrive = arrivalEvery() * (0.7 + Math.random() * 0.6); if (customers.length < 14) spawnCustomer(); }
  updateCustomers(dt); updateFloaters(dt);
  cashier.userData.armL.rotation.x = Math.sin(clock * 2) * 0.1; cashier.visible = S.kasir > 0 || true;
  // layar & lampu
  for (const st of stations) {
    if (!S.st[st.i].o) continue;
    if ((st.flash -= dt) <= 0) { st.flash = st.busy ? 0.09 : 0.5; drawTV(st, clock + st.i, st.busy); }
    if (st.glow) { st.glow.color.set(st.busy ? ['#33dd66', '#ff4444', '#4488ff', '#dd44ee', '#ffaa22'][st.game % 5] : '#5588ff'); st.glow.intensity = st.busy ? 5 + Math.sin(clock * 12) * 1.5 : 2; }
    if (st.led) st.led.material.color.set(st.busy ? 0x33ff88 : 0x3b82f6);
    if (st.coinSprite) st.coinSprite.position.y = 2.9 + Math.sin(clock * 4 + st.i) * 0.12;
  }
  neonL.intensity = 16 + Math.sin(clock * 2) * 3; neonR.intensity = 16 + Math.cos(clock * 2.3) * 3;
  // UI
  uiT += dt; if (uiT > 0.25) {
    uiT = 0; $('money').textContent = money(S.money);
    const nowT = performance.now(); while (incomeWindow.length && nowT - incomeWindow[0][0] > 15000) incomeWindow.shift(); S.ips = incomeWindow.reduce((a, b) => a + b[1], 0) / 15;
    $('ips').textContent = money(S.ips); const r = Math.round(rep()); $('rep').textContent = '★'.repeat(r) + '☆'.repeat(5 - r);
    const pend = stations.some((s) => s.coin > 0); $('collect').classList.toggle('hidden', !pend);
    if (tab && (Math.floor(clock) % 2 === 0)) refreshAfford();
  }
  saveT += dt; if (saveT > 5) { saveT = 0; save(); }
  // kamera
  camera.position.set(orbit.tx + Math.sin(orbit.az) * Math.cos(orbit.el) * orbit.dist, Math.sin(orbit.el) * orbit.dist, orbit.tz + Math.cos(orbit.az) * Math.cos(orbit.el) * orbit.dist);
  camera.lookAt(orbit.tx, 0.4, orbit.tz);
  renderer.render(scene, camera); requestAnimationFrame(frame);
}
let lastAfford = '';
function refreshAfford() { const key = Math.floor(S.money / 1000) + tab; if (key === lastAfford) return; lastAfford = key; const scroll = $('cards').scrollLeft; renderCards(); $('cards').scrollLeft = scroll; }

// ================= BOOT =================
load();
// pendapatan offline
{ const away = (Date.now() - (S.seen || Date.now())) / 1000;
  if (away > 60 && S.total > 0) { const per = Math.max(0.5, stations.length ? S.st.filter((x) => x.o).reduce((a, d) => a + sessionIncome(d) / (sessionLen() + arrivalEvery() * 1.5), 0) : 0); const amt = Math.floor(per * Math.min(away, 8 * 3600) * 0.5); if (amt > 0) { S.money += amt; S.total += amt; $('welcomeTxt').textContent = `Toko tetap buka selama ${Math.round(away / 60)} menit dan menghasilkan ${money(amt)}.`; $('welcome').classList.remove('hidden'); } } }
$('welcomeOk').onclick = () => { $('welcome').classList.add('hidden'); beep(true); };
stations.forEach(buildStation); buildDecor(); renderCards(); onResize();
window.__rp = { S, stations, customers, orbit, spawnCustomer };
requestAnimationFrame(frame);
