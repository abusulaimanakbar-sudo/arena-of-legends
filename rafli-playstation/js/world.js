// Lingkungan luar: langit dinamis, medan low-poly, jalan, parkiran bermarka, kendaraan, cabang, hujan
import * as THREE from 'three';
import { makeCar, makeBike, mergeByMaterial, std, vcMat, createDecals } from './models.js';

const bmCache = new Map(); const bm = (c) => { const k = 'a' + c; if (!bmCache.has(k)) bmCache.set(k, new THREE.MeshBasicMaterial({ color: c })); return bmCache.get(k); }; const bmt = (c) => { const k = 't' + c; if (!bmCache.has(k)) bmCache.set(k, new THREE.MeshBasicMaterial({ color: c, toneMapped: false })); return bmCache.get(k); };
const lowStd = (color, o = {}) => std(color, { flatShading: true, ...o });
function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

function canvasTile(size, draw) { const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const hash3 = (a, b, c) => { const v = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453; return v - Math.floor(v); };
function mergeAttr(geos) { const pos = [], nor = [], col = []; for (const g0 of geos) { const g = g0.index ? g0.toNonIndexed() : g0; pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); col.push(...g.attributes.color.array); } const o = new THREE.BufferGeometry(); o.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); o.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); o.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return o; }
// warna per-vertex bergradasi menurut tinggi (+ variasi kecil agar tidak kaku)
function grad(geo, cLow, cHigh, y0, y1, jitter = 0.06, flat = false) {
  const g = flat ? (geo.index ? geo.toNonIndexed() : geo) : geo; if (flat) g.computeVertexNormals(); const pos = g.attributes.position; const col = new Float32Array(pos.count * 3); const a = new THREE.Color(cLow), b = new THREE.Color(cHigh), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) { const t = Math.min(1, Math.max(0, (pos.getY(i) - y0) / (y1 - y0))); c.copy(a).lerp(b, t); const j = 1 + (hash3(pos.getX(i), pos.getY(i), pos.getZ(i)) - 0.5) * jitter * 2; col[i * 3] = c.r * j; col[i * 3 + 1] = c.g * j; col[i * 3 + 2] = c.b * j; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}
export const LOT = { rowA: 15.8, rowB: 26.4, lane: 21.2, spacing: 4.5, n: 9, x0: -18, roadZ: 34.4, roadZ2: 37.4, entryX: -23.5, exitX: 23.5 };
export const BAYS = [];
for (const [row, z, yaw] of [['A', LOT.rowA, Math.PI], ['B', LOT.rowB, 0]]) for (let i = 0; i < LOT.n; i++) BAYS.push({ id: BAYS.length, row, x: LOT.x0 + i * LOT.spacing, z, yaw, taken: false, fixed: false });
[0, 8, 9, 17].forEach((i) => { BAYS[i].fixed = true; BAYS[i].taken = true; }); // mobil karyawan/penghuni tetap

// palet langit menurut jam
const SKY = [
  { h: 0, top: 0x070b1f, mid: 0x0d1433, bot: 0x1a2250 }, { h: 5, top: 0x1b2552, mid: 0x6a4a7a, bot: 0xf59e6b }, { h: 7, top: 0x4a8fe0, mid: 0x8cc4f0, bot: 0xf5d9a8 },
  { h: 12, top: 0x2f7ad8, mid: 0x7cc0f2, bot: 0xcfeaff }, { h: 17, top: 0x3a6fc0, mid: 0xf2a56a, bot: 0xffd29a }, { h: 19, top: 0x1c2250, mid: 0x7a3f6a, bot: 0xf2704a }, { h: 21, top: 0x0a0f2a, mid: 0x131a40, bot: 0x222a5a }, { h: 24, top: 0x070b1f, mid: 0x0d1433, bot: 0x1a2250 },
];
function skyAt(h) { let a = SKY[0], b = SKY[1]; for (let i = 0; i < SKY.length - 1; i++) if (h >= SKY[i].h && h <= SKY[i + 1].h) { a = SKY[i]; b = SKY[i + 1]; break; } const t = (h - a.h) / Math.max(0.001, b.h - a.h); const L = (k) => new THREE.Color(a[k]).lerp(new THREE.Color(b[k]), t); return { top: L('top'), mid: L('mid'), bot: L('bot') }; }

export function buildWorld(scene) {
  const R = rng(7);
  const root = new THREE.Group(); scene.add(root); const stat = new THREE.Group(); root.add(stat); // stat = benda statis, digabung per-material agar draw call sedikit
  // ---------- langit ----------
  const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x2f7ad8) }, mid: { value: new THREE.Color(0x7cc0f2) }, bot: { value: new THREE.Color(0xcfeaff) } },
    vertexShader: 'varying float vY; void main(){ vY = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying float vY; void main(){ float t = clamp(vY,0.0,1.0); vec3 c = mix(bot, mid, smoothstep(0.0,0.35,t)); c = mix(c, top, smoothstep(0.3,0.9,t)); if (vY<0.0) c = bot*0.6; gl_FragColor = vec4(c,1.0); }' });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(420, 24, 16), skyMat); sky.renderOrder = -10; root.add(sky);
  const sunM = new THREE.Mesh(new THREE.SphereGeometry(14, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff3c0, fog: false, toneMapped: false })); root.add(sunM);
  const moonM = new THREE.Mesh(new THREE.SphereGeometry(9, 16, 12), new THREE.MeshBasicMaterial({ color: 0xdfe8ff, fog: false, toneMapped: false })); root.add(moonM);
  const starPos = new Float32Array(900); for (let i = 0; i < 300; i++) { const th = R() * Math.PI * 2, ph = Math.acos(R() * 0.95 + 0.05); const r = 400; starPos[i * 3] = r * Math.sin(ph) * Math.cos(th); starPos[i * 3 + 1] = r * Math.cos(ph); starPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }); const stars = new THREE.Points(sg, starMat); root.add(stars);
  // awan low-poly
  const clouds = []; const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, emissive: 0x222222, fog: false });
  for (let i = 0; i < 14; i++) { const g = new THREE.Group(); const n = 3 + Math.floor(R() * 4); for (let k = 0; k < n; k++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(5 + R() * 5, 1), cloudMat); s.position.set(k * 7 - n * 3, R() * 2, (R() - 0.5) * 5); s.scale.y = 0.55; g.add(s); } mergeByMaterial(g); g.position.set((R() - 0.5) * 360, 55 + R() * 40, -80 + R() * 220 - 60); g.userData.v = 1.5 + R() * 2; root.add(g); clouds.push(g); }

  // ---------- tanah ----------
  const grassTex = canvasTile(256, (g, n) => { g.fillStyle = '#437f38'; g.fillRect(0, 0, n, n); for (let i = 0; i < 38; i++) { g.fillStyle = `hsla(${92 + Math.random() * 26},${34 + Math.random() * 18}%,${24 + Math.random() * 14}%,0.22)`; g.beginPath(); g.arc(Math.random() * n, Math.random() * n, 14 + Math.random() * 38, 0, 7); g.fill(); } for (let i = 0; i < 2600; i++) { g.strokeStyle = `hsla(${88 + Math.random() * 34},${38 + Math.random() * 22}%,${18 + Math.random() * 24}%,0.55)`; g.lineWidth = 1; const x = Math.random() * n, y = Math.random() * n; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 3, y - 2 - Math.random() * 4); g.stroke(); } });
  grassTex.repeat.set(110, 110);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshLambertMaterial({ map: grassTex })); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.06; stat.add(ground);
  const asphaltTex = canvasTile(256, (g, n) => { g.fillStyle = '#383b44'; g.fillRect(0, 0, n, n); for (let i = 0; i < 5200; i++) { const v = 40 + Math.random() * 46; g.fillStyle = `rgba(${v},${v},${v + 5},0.55)`; g.fillRect(Math.random() * n, Math.random() * n, 1 + Math.random() * 2, 1 + Math.random() * 2); } g.strokeStyle = 'rgba(20,20,24,0.5)'; g.lineWidth = 1.3; for (let k = 0; k < 4; k++) { g.beginPath(); let x = Math.random() * n, y = Math.random() * n; g.moveTo(x, y); for (let j = 0; j < 7; j++) { x += (Math.random() - 0.5) * 36; y += (Math.random() - 0.5) * 36; g.lineTo(x, y); } g.stroke(); } });
  const paverTex = canvasTile(256, (g, n) => { g.fillStyle = '#a3a5b1'; g.fillRect(0, 0, n, n); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const v = 150 + Math.random() * 28; g.fillStyle = `rgb(${v},${v + 1},${v + 10})`; g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60); } for (let i = 0; i < 1400; i++) { g.fillStyle = 'rgba(70,72,86,0.12)'; g.fillRect(Math.random() * n, Math.random() * n, 2, 2); } });
  const asphaltMat = new THREE.MeshLambertMaterial({ map: asphaltTex }), paverMat = new THREE.MeshLambertMaterial({ map: paverTex });
  // trotoar, aspal parkir, jalan
  const asphalt = asphaltMat; const mk = (w, d, x, z, mat, y = 0) => { const g = new THREE.BoxGeometry(w, 0.12, d); if (mat.map) { const uv = g.attributes.uv, ps = g.attributes.position, nr = g.attributes.normal; for (let i = 0; i < uv.count; i++) { if (nr.getY(i) > 0.5) uv.setXY(i, (ps.getX(i) + x) / 5, (ps.getZ(i) + z) / 5); else uv.setXY(i, 0, 0); } } const m = new THREE.Mesh(g, mat); m.position.set(x, y + 0.0, z); stat.add(m); return m; };
  mk(90, 3.0, 0, 10.5, paverMat, 0.02);            // trotoar depan
  mk(60, 20, 0, 21.2, asphalt, 0.0);                                               // area parkir
  mk(220, 9, 0, 35.9, asphalt, 0.0);                                               // jalan raya
  mk(7, 6.2, LOT.entryX, 31.3, asphalt, 0.0); mk(7, 6.2, LOT.exitX, 31.3, asphalt, 0.0); // akses
  const dash = bm(0xf2c230), white = bm(0xf2f2f2);
  for (let x = -105; x < 105; x += 6) { const d = new THREE.Mesh(new THREE.BoxGeometry(3, 0.02, 0.18), dash); d.position.set(x, 0.07, 35.9); stat.add(d); }
  mk(220, 0.15, 0, 31.6, paverMat, 0.01); // bahu jalan
  // marka parkir (garis putih per bay) + angka + panah
  const lineG = new THREE.BoxGeometry(0.12, 0.02, 4.8); const lines = new THREE.InstancedMesh(lineG, white, (LOT.n + 1) * 2 + 4); let li = 0; const m4 = new THREE.Matrix4();
  for (const zc of [LOT.rowA, LOT.rowB]) for (let i = 0; i <= LOT.n; i++) { m4.makeTranslation(LOT.x0 - LOT.spacing / 2 + i * LOT.spacing, 0.075, zc); lines.setMatrixAt(li++, m4); }
  lines.count = li; stat.add(lines);
  for (const zc of [LOT.rowA - 2.45, LOT.rowB + 2.45]) { const l = new THREE.Mesh(new THREE.BoxGeometry(LOT.n * LOT.spacing, 0.02, 0.12), white); l.position.set(LOT.x0 + (LOT.n - 1) * LOT.spacing / 2, 0.075, zc); stat.add(l); }
  const arrowTex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#f2f2f2'; g.beginPath(); g.moveTo(64, 10); g.lineTo(110, 70); g.lineTo(78, 70); g.lineTo(78, 118); g.lineTo(50, 118); g.lineTo(50, 70); g.lineTo(18, 70); g.closePath(); g.fill(); const t = new THREE.CanvasTexture(c); return t; })();
  const arrowMat = new THREE.MeshBasicMaterial({ map: arrowTex, transparent: true });
  for (const x of [-9, 0, 9, 18]) { const a = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), arrowMat); a.rotation.set(-Math.PI / 2, 0, x < 0 ? -Math.PI / 2 : -Math.PI / 2); a.position.set(x, 0.08, LOT.lane); stat.add(a); }
  const pTex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#1d4ed8'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#fff'; g.font = 'bold 100px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('P', 64, 70); return new THREE.CanvasTexture(c); })();
  const pMat = new THREE.MeshBasicMaterial({ map: pTex });
  for (const x of [-21.5, 21.5]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6), lowStd(0x555a66)); pole.position.set(x, 1.3, 12.2); const sg2 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), pMat); sg2.position.set(x, 2.8, 12.2); stat.add(pole, sg2); }
  // pembatas parkir (pagar rendah + semak)
  const fenceM = lowStd(0xe5e7eb); for (const [x0, x1] of [[-30, -26], [26, 30]]) void x0, x1;
  const hedge = new THREE.Mesh(new THREE.BoxGeometry(60, 0.8, 0.8), lowStd(0x2f7a3a)); hedge.position.set(0, 0.4, 29.2); stat.add(hedge);
  for (const sx of [-1, 1]) { const h2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 19), lowStd(0x2f7a3a)); h2.position.set(sx * 30, 0.4, 20); stat.add(h2); }
  void fenceM;
  // lampu jalan
  const lampMats = []; const lampGeo = new THREE.CylinderGeometry(0.07, 0.1, 6, 6); const lampHead = new THREE.SphereGeometry(0.35, 8, 6);
  const halo = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,230,160,0.9)'); gr.addColorStop(1, 'rgba(255,230,160,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const lotLights = []; for (const [x, z] of [[-10, 21], [10, 21]]) { const l = new THREE.PointLight(0xffe2a8, 0, 30); l.position.set(x, 6, z); root.add(l); lotLights.push(l); }
  const lampHeadMat = bmt(0xfff0c0); lampMats.push(lampHeadMat); const haloPos = [];
  const addLamp = (x, z) => { const p = new THREE.Mesh(lampGeo, lowStd(0x4b5060)); p.position.set(x, 3, z); const h = new THREE.Mesh(lampHead, lampHeadMat); h.position.set(x, 6.1, z); haloPos.push(x, 6.1, z); stat.add(p, h); };
  for (let x = -60; x <= 60; x += 14) addLamp(x, 12.4); for (let x = -60; x <= 60; x += 14) addLamp(x, 31.9);
  for (const x of [-26, 26]) for (const z of [15, 27]) addLamp(x, z);
  const haloGeo = new THREE.BufferGeometry(); haloGeo.setAttribute('position', new THREE.Float32BufferAttribute(haloPos, 3)); const haloPts = new THREE.Points(haloGeo, new THREE.PointsMaterial({ map: halo, size: 7, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); haloPts.frustumCulled = false; root.add(haloPts);

  // ---------- pemandangan ----------
  const place = (x, z) => !(Math.abs(x) < 36 && z > -12 && z < 42) && !(Math.abs(x) > 24 && Math.abs(x) < 50 && z > -12 && z < 12);
  // ---------- pemandangan low-poly: gradasi warna, bayangan palsu, goyang tertiup angin ----------
  const swayU = { value: 0 };
  function swayMat(opts) {
    const m = new THREE.MeshLambertMaterial(opts);
    m.onBeforeCompile = (sh) => { sh.uniforms.uTime = swayU; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\n float ph = instanceMatrix[3].x * 0.31 + instanceMatrix[3].z * 0.23;\n float hg = max(transformed.y - 0.9, 0.0);\n transformed.x += sin(uTime * 1.7 + ph) * 0.05 * hg;\n transformed.z += cos(uTime * 1.3 + ph * 1.3) * 0.04 * hg;\n#endif'); };
    return m;
  }
  // pegunungan: kerucut bergradasi (makin jauh makin pucat) + salju
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + R() * 0.2; const r = 230 + R() * 40; const h = 40 + R() * 70; const rad = 30 + R() * 30;
    const cg = grad(new THREE.ConeGeometry(rad, h, 7 + Math.floor(R() * 3), 1), i % 2 ? 0x3d5a52 : 0x405c6e, i % 2 ? 0x8fa3c4 : 0x7d93b8, -h / 2, h / 2, 0.07, true); const m = new THREE.Mesh(cg, vcMat); m.position.set(Math.cos(a) * r, h / 2 - 3, Math.sin(a) * r + 20); m.rotation.y = R() * 3; stat.add(m);
    const cap = new THREE.Mesh(grad(new THREE.ConeGeometry(rad * 0.34, h * 0.26, 7, 1), 0xdfe8f6, 0xffffff, -h * 0.13, h * 0.13, 0.03, true), vcMat); cap.position.set(m.position.x, h * 0.87 - 3, m.position.z); cap.rotation.y = m.rotation.y; stat.add(cap);
  }
  for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; const r = 110 + R() * 60; const h = 8 + R() * 14; const rr = 18 + R() * 16; const hg = grad(new THREE.SphereGeometry(rr, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), [0x3a7a30, 0x2f6e2b, 0x4a8a38][i % 3], [0x7bbd5a, 0x6aae4f, 0x8ac765][i % 3], 0, rr, 0.05); const m = new THREE.Mesh(hg, vcMat); m.position.set(Math.cos(a) * r, -2, Math.sin(a) * r + 20); m.scale.y = h / rr * 1.05; stat.add(m); }
  // model pohon: pinus bertingkat, pohon bulat (gumpalan), semak
  const nz = (g, amt) => { const p = g.attributes.position, nrm = g.attributes.normal; for (let i = 0; i < p.count; i++) { const d = (hash3(Math.round(p.getX(i) * 50), Math.round(p.getY(i) * 50), Math.round(p.getZ(i) * 50)) - 0.5) * amt; p.setXYZ(i, p.getX(i) + nrm.getX(i) * d, p.getY(i) + nrm.getY(i) * d, p.getZ(i) + nrm.getZ(i) * d); } return g; };
  const trunkOf = (r0, r1, h, col0, col1) => { const t = new THREE.CylinderGeometry(r0, r1, h, 6); t.translate(0, h / 2, 0); return grad(t, col0, col1, 0, h, 0.06); };
  const pineGeo = () => { const parts = [trunkOf(0.16, 0.3, 2.0, 0x6b4426, 0x3a2615)]; for (const [r, h, y] of [[2.1, 2.7, 2.7], [1.7, 2.4, 4.0], [1.2, 2.1, 5.2], [0.75, 1.6, 6.3]]) { const c = new THREE.ConeGeometry(r, h, 8, 1); c.translate(0, y, 0); parts.push(grad(c, 0x1b5a2b, 0x5bbd5f, y - h / 2, y + h / 2, 0.07, true)); } return mergeAttr(parts); };
  const roundGeo = () => { const parts = [trunkOf(0.2, 0.36, 2.5, 0x6b4426, 0x3d2817)]; for (const [r, x, y, z] of [[1.7, 0, 3.7, 0], [1.25, 1.0, 3.2, 0.5], [1.15, -0.9, 3.3, -0.6], [1.0, 0.1, 4.6, -0.2]]) { const b = nz(new THREE.IcosahedronGeometry(r, 1), 0.3); b.translate(x, y, z); parts.push(grad(b, 0x2b7a38, 0x8acb55, y - r, y + r, 0.08, true)); } return mergeAttr(parts); };
  const bushGeo = () => { const parts = []; for (const [r, x, z] of [[0.62, 0, 0], [0.48, 0.55, 0.2], [0.42, -0.5, -0.15]]) { const b = nz(new THREE.IcosahedronGeometry(r, 1), 0.14); b.scale(1, 0.78, 1); b.translate(x, 0.34, z); parts.push(grad(b, 0x2a6e34, 0x66bb5c, 0, 0.8, 0.08, true)); } return mergeAttr(parts); };
  const NP = 120, NR = 64, NB = 130; const treeMat = swayMat({ vertexColors: true });
  const pines = new THREE.InstancedMesh(pineGeo(), treeMat, NP), rounds = new THREE.InstancedMesh(roundGeo(), treeMat, NR), bushes = new THREE.InstancedMesh(bushGeo(), treeMat, NB);
  const q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), p3 = new THREE.Vector3(), eul = new THREE.Euler(), tint = new THREE.Color(); let pn = 0, rn = 0, bn = 0;
  const treeDecals = createDecals(scene, NP + NR + NB + 20, { opacity: 0.38 }); treeDecals.begin();
  const putTree = (kind, x, z, s) => { q.setFromEuler(eul.set((R() - 0.5) * 0.06, R() * 6.28, (R() - 0.5) * 0.06)); sc.set(s, s * (0.9 + R() * 0.25), s); tint.setRGB(0.86 + R() * 0.26, 0.9 + R() * 0.2, 0.84 + R() * 0.26); if (kind === 'p' && pn < NP) { pines.setMatrixAt(pn, m4.compose(p3.set(x, 0, z), q, sc)); pines.setColorAt(pn++, tint); treeDecals.add(x, z, 3.4 * s, 3.4 * s); } else if (kind === 'r' && rn < NR) { rounds.setMatrixAt(rn, m4.compose(p3.set(x, 0, z), q, sc)); rounds.setColorAt(rn++, tint); treeDecals.add(x, z, 3.6 * s, 3.6 * s); } else if (kind === 'b' && bn < NB) { sc.set(s, s, s); bushes.setMatrixAt(bn, m4.compose(p3.set(x, 0, z), q, sc)); bushes.setColorAt(bn++, tint); treeDecals.add(x, z, 1.7 * s, 1.7 * s); } };
  for (let k = 0; k < 3000 && (pn < NP || rn < NR); k++) { const x = (R() - 0.5) * 360, z = (R() - 0.5) * 300 + 20; if (!place(x, z) || Math.hypot(x, z - 20) > 175) continue; const s = 0.75 + R() * 0.85; if (R() < 0.6) putTree('p', x, z, s); else putTree('r', x, z, s); }
  for (let k = 0; k < 2000 && bn < NB; k++) { const x = (R() - 0.5) * 200, z = (R() - 0.5) * 200 + 20; if (!place(x, z)) continue; putTree('b', x, z, 0.8 + R() * 0.9); }
  for (const x of [-28, -20, 20, 28]) putTree('r', x, 10.8, 0.9);                       // pohon trotoar
  for (let i = 0; i < 9; i++) putTree(i % 3 ? 'p' : 'r', -32 + i * 8 + R() * 3, -16 - R() * 6, 0.9 + R() * 0.4);   // di belakang toko
  for (let i = 0; i < 10; i++) putTree('b', -27 + i * 6 + R() * 2, 30.2, 0.9);          // semak di pagar parkir
  [pines, rounds, bushes].forEach((m, i) => { m.count = [pn, rn, bn][i]; m.frustumCulled = false; stat.add(m); }); treeDecals.end();
  // rumput liar & bunga kecil (silang 2 bidang, alpha)
  const bladeTex = canvasTile(64, (g, n) => { g.clearRect(0, 0, n, n); for (let i = 0; i < 9; i++) { const x = 6 + i * 6 + Math.random() * 3, h = 26 + Math.random() * 30; const gr = g.createLinearGradient(0, n, 0, n - h); gr.addColorStop(0, '#2d7a30'); gr.addColorStop(1, '#8ed45b'); g.fillStyle = gr; g.beginPath(); g.moveTo(x - 2.5, n); g.quadraticCurveTo(x + (Math.random() - 0.5) * 8, n - h * 0.6, x + (Math.random() - 0.5) * 6, n - h); g.quadraticCurveTo(x + 4, n - h * 0.5, x + 2.5, n); g.fill(); } });
  bladeTex.wrapS = bladeTex.wrapT = THREE.ClampToEdgeWrapping;
  const tuftGeo = (() => { const a = new THREE.PlaneGeometry(0.75, 0.6); a.translate(0, 0.3, 0); const b = a.clone(); b.rotateY(Math.PI / 2); const parts = [a, b].map((g) => { const c = new Float32Array(g.attributes.position.count * 3).fill(1); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; }); const pos = [], nor = [], uv = [], col = []; for (const g of parts) { const t = g.toNonIndexed(); pos.push(...t.attributes.position.array); nor.push(...t.attributes.normal.array); uv.push(...t.attributes.uv.array); col.push(...t.attributes.color.array); } const o = new THREE.BufferGeometry(); o.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); o.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); o.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return o; })();
  const NG = 340; const tufts = new THREE.InstancedMesh(tuftGeo, swayMat({ map: bladeTex, alphaTest: 0.45, side: THREE.DoubleSide }), NG); let gn = 0;
  for (let k = 0; k < 6000 && gn < NG; k++) { const x = (R() - 0.5) * 150, z = -18 + R() * 70; if (Math.abs(x) < 31.5 && z > 8 && z < 31) continue; if (z > 30 && z < 42) continue; if (Math.abs(x) < 13.5 && z > -10 && z < 10) continue; q.setFromEuler(eul.set(0, R() * 6.28, 0)); const s = 0.8 + R() * 1.3; tint.setRGB(0.8 + R() * 0.4, 0.85 + R() * 0.3, 0.7 + R() * 0.4); tufts.setMatrixAt(gn, m4.compose(p3.set(x, 0, z), q, sc.set(s, s, s))); tufts.setColorAt(gn++, tint); }
  tufts.count = gn; tufts.frustumCulled = false; stat.add(tufts);
  const flowerG = new THREE.IcosahedronGeometry(0.1, 0); const NF = 150; const flowers = new THREE.InstancedMesh(flowerG, new THREE.MeshLambertMaterial({ color: 0xffffff }), NF); let fn = 0; const fcols = [0xff6b9a, 0xffd23f, 0xffffff, 0xb36bff, 0xff8a3d];
  for (let k = 0; k < 4000 && fn < NF; k++) { const x = (R() - 0.5) * 120, z = -16 + R() * 50; if (Math.abs(x) < 31.5 && z > 8 && z < 31) continue; if (z > 30 && z < 42) continue; if (Math.abs(x) < 13.5 && z > -10 && z < 10) continue; flowers.setMatrixAt(fn, m4.compose(p3.set(x, 0.38, z), q.identity(), sc.set(1, 1, 1))); flowers.setColorAt(fn++, tint.set(fcols[fn % 5])); }
  flowers.count = fn; flowers.frustumCulled = false; stat.add(flowers);
  // rumah: dinding bertekstur jendela + kaca menyala saat malam, atap bergradasi
  const facade = canvasTile(128, (g, n) => { g.fillStyle = '#f4f0e8'; g.fillRect(0, 0, n, n); for (const [wx, wy] of [[14, 12], [74, 12], [14, 70], [74, 70]]) { g.fillStyle = '#8d8577'; g.fillRect(wx - 3, wy - 3, 46, 50); const gr = g.createLinearGradient(0, wy, 0, wy + 44); gr.addColorStop(0, '#4d6a94'); gr.addColorStop(1, '#2c3d5a'); g.fillStyle = gr; g.fillRect(wx, wy, 40, 44); g.fillStyle = '#d9d4c8'; g.fillRect(wx + 18, wy, 4, 44); g.fillRect(wx, wy + 20, 40, 4); } });
  const facadeEm = canvasTile(128, (g, n) => { g.fillStyle = '#000'; g.fillRect(0, 0, n, n); for (const [wx, wy] of [[14, 12], [74, 12], [14, 70], [74, 70]]) { g.fillStyle = '#ffd98a'; g.fillRect(wx, wy, 40, 44); g.fillStyle = '#000'; g.fillRect(wx + 18, wy, 4, 44); g.fillRect(wx, wy + 20, 40, 4); } });
  const houseMat = new THREE.MeshLambertMaterial({ map: facade, emissiveMap: facadeEm, emissive: 0x000000, vertexColors: true });
  const houseCols = [0xf4d6a0, 0xe8a0a0, 0xa0c4e8, 0xc4e8a0, 0xe8e0a0, 0xd0b0e8]; const roofCols = [0xa33a2a, 0x4a5a8a, 0x7a4a2a];
  for (let i = 0; i < 24; i++) {
    const side = i % 2 ? 1 : -1; const x = side * (38 + (i >> 1) * 7.5 + R() * 3); const z = -30 + R() * 90; if (Math.abs(x) < 50 && z > -14 && z < 14) continue;
    const g = new THREE.Group(); const w = 5 + R() * 3, d = 5 + R() * 3, h = 3 + R() * 2.5; const bg = new THREE.BoxGeometry(w, h, d); const uv = bg.attributes.uv; for (let k = 0; k < uv.count; k++) { const f = Math.floor(k / 4); if (f < 2) uv.setXY(k, uv.getX(k) * d / 3.2, uv.getY(k) * h / 3.0); else if (f < 4) uv.setXY(k, 0.01, 0.01); else uv.setXY(k, uv.getX(k) * w / 3.2, uv.getY(k) * h / 3.0); }
    const wc = new THREE.Color(houseCols[i % 6]); const cc = new Float32Array(bg.attributes.position.count * 3); for (let k = 0; k < cc.length; k += 3) { cc[k] = wc.r; cc[k + 1] = wc.g; cc[k + 2] = wc.b; } bg.setAttribute('color', new THREE.BufferAttribute(cc, 3)); const b = new THREE.Mesh(bg, houseMat); b.position.y = h / 2;
    const rg2 = new THREE.ConeGeometry(Math.max(w, d) * 0.78, 2.4, 4); rg2.rotateY(Math.PI / 4); const rf = new THREE.Mesh(grad(rg2, roofCols[i % 3], new THREE.Color(roofCols[i % 3]).multiplyScalar(1.5).getHex(), -1.2, 1.2, 0.05, true), vcMat); rf.position.y = h + 1.2;
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.7, 0.12), lowStd(0x5b3a22)); door.position.set(0, 0.85, d / 2 + 0.03); g.add(b, rf, door); g.position.set(x, 0, z); g.rotation.y = side > 0 ? -Math.PI / 2 + (R() - 0.5) * 0.3 : Math.PI / 2 + (R() - 0.5) * 0.3; stat.add(g);
  }

  // ---------- cabang (bangunan baru) ----------
  const branchG = new THREE.Group(); root.add(branchG); const branchWin = [];
  const BR = [{ x: 40, z: -1, ry: -Math.PI / 2, name: 'CABANG TIMUR' }, { x: -40, z: -1, ry: Math.PI / 2, name: 'CABANG BARAT' }, { x: 0, z: -28, ry: 0, name: 'CABANG BELAKANG' }];
  function signTex(txt) { const c = document.createElement('canvas'); c.width = 512; c.height = 96; const g = c.getContext('2d'); g.fillStyle = '#0b0d1f'; g.fillRect(0, 0, 512, 96); g.font = '900 44px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#f472b6'; g.shadowBlur = 20; g.fillStyle = '#ffe0f0'; g.fillText(txt, 256, 50); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
  function setBranches(n) {
    branchG.clear(); branchWin.length = 0;
    BR.forEach((b, i) => {
      const g = new THREE.Group(); g.position.set(b.x, 0, b.z); g.rotation.y = b.ry;
      if (i >= n) { const pad = new THREE.Mesh(new THREE.BoxGeometry(18, 0.15, 14), lowStd(0x3a3f66, { flatShading: false, transparent: true, opacity: 0.55 })); pad.position.y = 0.05; const tb = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.7), new THREE.MeshBasicMaterial({ map: signTex('🔒 LAHAN ' + b.name), transparent: true })); tb.position.set(0, 3.5, 5); g.add(pad, tb); branchG.add(g); return; }
      const body = new THREE.Mesh(new THREE.BoxGeometry(18, 5, 12), lowStd(0x3a3f78)); body.position.y = 2.5; body.castShadow = true; g.add(body);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(18.6, 0.5, 12.6), lowStd(0x1d2147)); roof.position.y = 5.2; g.add(roof);
      const wmat = bmt(0x9db8ff); branchWin.push(wmat);
      for (let k = 0; k < 4; k++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.2), wmat); w.position.set(-6.2 + k * 4.1, 2.6, 6.02); g.add(w); }
      const door = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.2), bmt(0xffe9a8)); door.position.set(0, 1.6, 6.03); g.add(door);
      const sg3 = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.9), new THREE.MeshBasicMaterial({ map: signTex('RAFLI PS · ' + b.name.split(' ')[1]), toneMapped: false })); sg3.position.set(0, 4.3, 6.05); g.add(sg3);
      const parkL = new THREE.Mesh(new THREE.PlaneGeometry(14, 5), lowStd(0x30333c, { flatShading: false })); parkL.rotation.x = -Math.PI / 2; parkL.position.set(0, 0.03, 10); g.add(parkL);
      for (let k = 0; k < 4; k++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 3.4), bm(0xffffff)); l.rotation.x = -Math.PI / 2; l.position.set(-5 + k * 3.3, 0.05, 10); g.add(l); }
      const car = makeCar([0xdc2626, 0x2563eb, 0xf59e0b][i % 3]); car.position.set(-3.3 + i * 3.3, 0, 10); car.rotation.y = Math.PI; g.add(car);
      mergeByMaterial(g); branchG.add(g);
    });
  }

  // ---------- kendaraan ----------
  const vehicles = []; const carDecals = createDecals(scene, 48, { opacity: 0.5 });
  const CAR_COLS = [0xdc2626, 0x2563eb, 0x16a34a, 0xf59e0b, 0xe5e7eb, 0x111827, 0x7c3aed, 0x0ea5e9, 0xf97316];
  function newVehicle(kind, color, path, speed = 9) {
    const g = kind === 'bike' ? makeBike(color) : makeCar(color, kind); scene.add(g);
    const v = { g, kind, path, pi: 0, speed, done: false, wait: 0, onDone: null, heading: path[0].h ?? 0 }; g.position.set(path[0].x, 0, path[0].z); g.rotation.y = v.heading; vehicles.push(v); return v;
  }
  function pathIn(bay) {
    const A = bay.row === 'A';
    return [{ x: -70, z: LOT.roadZ, h: Math.PI / 2 }, { x: LOT.entryX, z: LOT.roadZ, h: Math.PI / 2 }, { x: LOT.entryX, z: LOT.roadZ - 3.5, h: Math.PI }, { x: LOT.entryX, z: LOT.lane + 1, h: Math.PI },
      { x: LOT.entryX + 1, z: LOT.lane, h: Math.PI / 2 }, { x: bay.x, z: LOT.lane, h: Math.PI / 2 }, { x: bay.x, z: bay.z + (A ? 0.6 : -0.6), h: bay.yaw, slow: true }];
  }
  function pathOut(bay) {
    return [{ x: bay.x, z: LOT.lane, h: bay.yaw, rev: true, slow: true }, { x: bay.x + 1, z: LOT.lane, h: Math.PI / 2 }, { x: LOT.exitX, z: LOT.lane, h: Math.PI / 2 }, { x: LOT.exitX, z: LOT.roadZ - 3.5, h: 0 }, { x: LOT.exitX + 1, z: LOT.roadZ, h: Math.PI / 2 }, { x: 80, z: LOT.roadZ, h: Math.PI / 2 }];
  }
  function driveIn(bay, kind, color, onPark) { const v = newVehicle(kind, color, pathIn(bay), kind === 'bike' ? 8 : 9); v.onDone = onPark; return v; }
  function driveOut(v, bay, onGone) { v.path = [{ x: v.g.position.x, z: v.g.position.z, h: v.heading }, ...pathOut(bay)]; v.pi = 1; v.done = false; v.onDone = onGone; v.speed = v.kind === 'bike' ? 8 : 9; }
  let trafficT = 6;
  function spawnTraffic() {
    const east = Math.random() < 0.5; const kind = Math.random() < 0.3 ? 'bike' : Math.random() < 0.3 ? 'suv' : 'car'; const col = CAR_COLS[Math.floor(Math.random() * CAR_COLS.length)];
    const z = east ? LOT.roadZ : LOT.roadZ2; const h = east ? Math.PI / 2 : -Math.PI / 2; const x0 = east ? -90 : 90, x1 = east ? 90 : -90;
    const v = newVehicle(kind, col, [{ x: x0, z, h }, { x: x1, z, h }], 11 + Math.random() * 6); v.ambient = true; v.onDone = () => {};
  }
  function updateVehicles(dt) {
    for (let i = vehicles.length - 1; i >= 0; i--) {
      const v = vehicles[i]; if (v.done) { if (v.ambient || v.remove) { scene.remove(v.g); vehicles.splice(i, 1); } continue; }
      const t = v.path[v.pi + (v.pi < v.path.length - 1 ? 1 : 0)]; const p = v.g.position;
      if (v.pi >= v.path.length - 1 && v.path.length === 1) { v.done = true; continue; }
      const nx = v.path[v.pi + 1]; if (!nx) { v.done = true; if (v.onDone) v.onDone(v); continue; }
      const dx = nx.x - p.x, dz = nx.z - p.z; const dist = Math.hypot(dx, dz); const sp = (nx.slow || v.path[v.pi].slow ? 3.2 : v.speed) * dt;
      if (dist <= Math.max(0.05, sp)) { p.x = nx.x; p.z = nx.z; v.pi++; if (nx.h !== undefined) v.heading = nx.h; if (v.pi >= v.path.length - 1) { v.done = true; if (v.onDone) v.onDone(v); } }
      else { p.x += (dx / dist) * sp; p.z += (dz / dist) * sp; }
      // arah: halus menuju heading segmen
      const want = nx.rev ? v.heading : Math.atan2(dx, dz); const target = nx.h !== undefined && !nx.rev && dist < 4 ? nx.h : want; let d = (nx.rev ? v.heading : target) - v.g.rotation.y; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; v.g.rotation.y += d * Math.min(1, dt * 5);
      void t;
    }
  }

  // ---------- hujan ----------
  const RN = 1400; const rp = new Float32Array(RN * 6); for (let i = 0; i < RN; i++) { const x = (Math.random() - 0.5) * 80, y = Math.random() * 30, z = (Math.random() - 0.5) * 80; rp.set([x, y, z, x - 0.15, y - 1.0, z], i * 6); }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3)); const rainMat = new THREE.LineBasicMaterial({ color: 0xb8d0ff, transparent: true, opacity: 0.0 }); const rain = new THREE.LineSegments(rg, rainMat); rain.frustumCulled = false; root.add(rain);

  // ---------- update ----------
  const state = { rainK: 0 }; let skyAcc = 0, cache = null;
  let sunDir = new THREE.Vector3();
  function update(dt, hour, rainWanted, camPos, lights) {
    const rk = state.rainK += ((rainWanted ? 1 : 0) - state.rainK) * Math.min(1, dt * 0.6);
    skyAcc += dt; if (skyAcc > 0.15 || !cache) { skyAcc = 0; const sk = skyAt(hour); const gray = new THREE.Color(0x56606e);
    skyMat.uniforms.top.value.copy(sk.top).lerp(gray.clone().multiplyScalar(0.5), rk * 0.8); skyMat.uniforms.mid.value.copy(sk.mid).lerp(gray, rk * 0.8); skyMat.uniforms.bot.value.copy(sk.bot).lerp(gray, rk * 0.8);
    const ang = ((hour - 6) / 24) * Math.PI * 2; const day = Math.max(0, Math.sin(ang)); const night = 1 - Math.min(1, day * 3);
    sunDir.set(Math.cos(ang) * 0.9, Math.sin(ang), 0.45).normalize(); sunM.position.copy(sunDir).multiplyScalar(380); moonM.position.set(-sunDir.x, -sunDir.y, -sunDir.z * 0.5).multiplyScalar(380); sunM.visible = sunDir.y > -0.1; moonM.visible = -sunDir.y > -0.1;
    sunM.material.color.setHSL(0.12 - Math.max(0, 0.5 - sunDir.y) * 0.08, 0.9, 0.7);
    starMat.opacity = Math.max(0, night - 0.3) * (1 - rk); cloudMat.color.setRGB(1 - night * 0.7, 1 - night * 0.68, 1 - night * 0.55).lerp(new THREE.Color(0x707884), rk * 0.8); cloudMat.emissive.setRGB(0.2 * (1 - night), 0.2 * (1 - night), 0.2 * (1 - night));
    const lampOn = night > 0.35 || rk > 0.6; lampMats.forEach((m) => m.color.setRGB(lampOn ? 1 : 0.35, lampOn ? 0.94 : 0.35, lampOn ? 0.75 : 0.35)); haloPts.material.opacity = lampOn ? 0.55 : 0; lotLights.forEach((l) => { l.intensity = lampOn ? 26 : 0; });
    houseMat.emissive.setRGB(night * 0.95, night * 0.78, night * 0.42); branchWin.forEach((m) => m.color.setRGB(0.4 + night * 0.6, 0.55 + night * 0.4, 0.85 - night * 0.2));
    // cahaya
    lights.sun.position.copy(sunDir.y > 0 ? sunDir : new THREE.Vector3(-sunDir.x, -sunDir.y, sunDir.z)).multiplyScalar(40); lights.sun.intensity = (sunDir.y > 0 ? Math.max(0, sunDir.y) * 2.0 : Math.max(0, -sunDir.y) * 0.35) * (1 - rk * 0.65) + 0.05;
    lights.sun.color.setRGB(1, 0.78 + Math.min(0.2, sunDir.y), 0.55 + Math.min(0.4, sunDir.y * 1.2)); if (sunDir.y <= 0) lights.sun.color.setRGB(0.55, 0.65, 1);
    lights.hemi.intensity = (0.62 + day * 0.65) * (1 - rk * 0.3); lights.hemi.color.copy(sk.mid).lerp(new THREE.Color(0xffffff), 0.35);
    const fogC = sk.bot.clone().lerp(gray, rk * 0.7); lights.fog.color.copy(fogC); lights.fog.near = 70 - rk * 35; lights.fog.far = 330 - rk * 170;
    scene.background = fogC; cache = { day, night, rain: rk }; }
    swayU.value += dt * (1 + rk * 1.5);
    clouds.forEach((c) => { c.position.x += c.userData.v * dt * (1 + rk); if (c.position.x > 200) c.position.x = -200; });
    sky.position.copy(camPos);
    // hujan
    rainMat.opacity = rk * 0.6; rain.visible = rk > 0.02; if (rain.visible) { rain.position.set(camPos.x, 0, camPos.z); const a = rg.attributes.position.array; for (let i = 0; i < RN; i++) { const o = i * 6; let y = a[o + 1] - dt * 24; if (y < 0) y += 30; a[o + 1] = y; a[o + 4] = y - 1.0; } rg.attributes.position.needsUpdate = true; }
    // lalu lintas
    trafficT -= dt; if (trafficT <= 0) { trafficT = 5 + Math.random() * 8; spawnTraffic(); }
    updateVehicles(dt); carDecals.begin(); for (const v of vehicles) { const b = v.kind === 'bike'; carDecals.add(v.g.position.x, v.g.position.z, b ? 0.9 : 2.5, b ? 1.9 : 5.0, v.g.rotation.y, 0.09); } carDecals.end();
    return { ...cache, rain: rk };
  }
  mergeByMaterial(stat);
  return { update, setBranches, driveIn, driveOut, BAYS, LOT, root, vehicles, lotLights, setRainDensity(d) { rain.geometry.setDrawRange(0, Math.floor(RN * d) * 2); } };
}
