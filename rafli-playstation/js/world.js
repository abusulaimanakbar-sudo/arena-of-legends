// Lingkungan luar: langit dinamis, medan low-poly, jalan, parkiran bermarka, kendaraan, cabang, hujan
import * as THREE from 'three';
import { makeCar, makeBike, mergeByMaterial, std } from './models.js';

const bmCache = new Map(); const bm = (c) => { const k = 'a' + c; if (!bmCache.has(k)) bmCache.set(k, new THREE.MeshBasicMaterial({ color: c })); return bmCache.get(k); }; const bmt = (c) => { const k = 't' + c; if (!bmCache.has(k)) bmCache.set(k, new THREE.MeshBasicMaterial({ color: c, toneMapped: false })); return bmCache.get(k); };
const lowStd = (color, o = {}) => std(color, { flatShading: true, ...o });
function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

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
  for (let i = 0; i < 14; i++) { const g = new THREE.Group(); const n = 3 + Math.floor(R() * 4); for (let k = 0; k < n; k++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(5 + R() * 5, 0), cloudMat); s.position.set(k * 7 - n * 3, R() * 2, (R() - 0.5) * 5); s.scale.y = 0.55; g.add(s); } mergeByMaterial(g); g.position.set((R() - 0.5) * 360, 55 + R() * 40, -80 + R() * 220 - 60); g.userData.v = 1.5 + R() * 2; root.add(g); clouds.push(g); }

  // ---------- tanah ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), lowStd(0x4c8f3a)); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.06; ground.receiveShadow = true; stat.add(ground);
  const patchCols = [0x5a9e44, 0x4a8636, 0x66a84c]; for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(new THREE.CircleGeometry(6 + R() * 14, 7), lowStd(patchCols[i % 3])); m.rotation.x = -Math.PI / 2; m.position.set((R() - 0.5) * 300, -0.05, (R() - 0.5) * 300 + 30); stat.add(m); }
  // trotoar, aspal parkir, jalan
  const asphalt = lowStd(0x30333c, { flatShading: false }); const mk = (w, d, x, z, mat, y = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), mat); m.position.set(x, y + 0.0, z); m.receiveShadow = true; stat.add(m); return m; };
  mk(90, 3.0, 0, 10.5, lowStd(0x9a9ca8, { flatShading: false }), 0.02);            // trotoar depan
  mk(60, 20, 0, 21.2, asphalt, 0.0);                                               // area parkir
  mk(220, 9, 0, 35.9, asphalt, 0.0);                                               // jalan raya
  mk(7, 6.2, LOT.entryX, 31.3, asphalt, 0.0); mk(7, 6.2, LOT.exitX, 31.3, asphalt, 0.0); // akses
  const dash = bm(0xf2c230), white = bm(0xf2f2f2);
  for (let x = -105; x < 105; x += 6) { const d = new THREE.Mesh(new THREE.BoxGeometry(3, 0.02, 0.18), dash); d.position.set(x, 0.07, 35.9); stat.add(d); }
  mk(220, 0.15, 0, 31.6, lowStd(0x55586a, { flatShading: false }), 0.01); // bahu jalan
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
  // pegunungan jauh + bukit
  const mtnCols = [0x5b6f8f, 0x6a7fa3, 0x4f6684, 0x7a8fb0];
  for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2 + R() * 0.2; const r = 230 + R() * 40; const h = 40 + R() * 70; const m = new THREE.Mesh(new THREE.ConeGeometry(30 + R() * 30, h, 6 + Math.floor(R() * 3)), lowStd(mtnCols[i % 4])); m.position.set(Math.cos(a) * r, h / 2 - 3, Math.sin(a) * r + 20); m.rotation.y = R() * 3; stat.add(m); const cap = new THREE.Mesh(new THREE.ConeGeometry(9 + R() * 4, h * 0.28, 6), lowStd(0xf3f6fb)); cap.position.set(m.position.x, h * 0.88 - 3, m.position.z); stat.add(cap); }
  for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; const r = 110 + R() * 60; const h = 8 + R() * 14; const m = new THREE.Mesh(new THREE.SphereGeometry(18 + R() * 16, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2), lowStd([0x4c8f3a, 0x3f7d33, 0x5ba043][i % 3])); m.position.set(Math.cos(a) * r, -2, Math.sin(a) * r + 20); m.scale.y = h / 20; stat.add(m); }
  // pohon (pinus + bulat) & semak, instancing
  const trunkG = new THREE.CylinderGeometry(0.25, 0.35, 2.2, 5), coneG = new THREE.ConeGeometry(1.8, 4.2, 6), ballG = new THREE.IcosahedronGeometry(1.7, 0), bushG = new THREE.IcosahedronGeometry(0.9, 0);
  const NT = 380; const trunks = new THREE.InstancedMesh(trunkG, lowStd(0x6b4426), NT), cones = new THREE.InstancedMesh(coneG, lowStd(0x2f7a3a), NT), balls = new THREE.InstancedMesh(ballG, lowStd(0x4aa84e), NT), bushes = new THREE.InstancedMesh(bushG, lowStd(0x3e9444), 260);
  let ti = 0, ci = 0, bi = 0, si = 0; const q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), p3 = new THREE.Vector3();
  for (let k = 0; k < 2600 && ti < NT; k++) { const x = (R() - 0.5) * 360, z = (R() - 0.5) * 300 + 20; if (!place(x, z) || Math.hypot(x, z - 20) > 175) continue; const s = 0.8 + R() * 0.9; sc.set(s, s, s); trunks.setMatrixAt(ti, m4.compose(p3.set(x, 1.1 * s, z), q, sc)); if (R() < 0.6) cones.setMatrixAt(ci++, m4.compose(p3.set(x, 4.2 * s, z), q, sc)); else balls.setMatrixAt(bi++, m4.compose(p3.set(x, 3.4 * s, z), q, sc)); ti++; }
  for (let k = 0; k < 1500 && si < 260; k++) { const x = (R() - 0.5) * 200, z = (R() - 0.5) * 200 + 20; if (!place(x, z)) continue; const s = 0.7 + R() * 0.9; sc.set(s, s * 0.8, s); bushes.setMatrixAt(si++, m4.compose(p3.set(x, 0.5, z), q, sc)); }
  trunks.count = ti; cones.count = ci; balls.count = bi; bushes.count = si; [trunks, cones, balls, bushes].forEach((m) => { m.castShadow = true; stat.add(m); });
  // pohon di trotoar & halaman toko
  for (const x of [-28, -20, 20, 28]) { const t = new THREE.Mesh(trunkG, lowStd(0x6b4426)); t.position.set(x, 1.1, 10.8); const b = new THREE.Mesh(ballG, lowStd(0x4aa84e)); b.position.set(x, 3.3, 10.8); t.castShadow = b.castShadow = true; stat.add(t, b); }
  // rumah-rumah low-poly
  const winMats = []; const houseCols = [0xf4d6a0, 0xe8a0a0, 0xa0c4e8, 0xc4e8a0, 0xe8e0a0, 0xd0b0e8]; const roofCols = [0xa33a2a, 0x4a5a8a, 0x7a4a2a];
  for (let i = 0; i < 24; i++) { const side = i % 2 ? 1 : -1; const x = side * (38 + (i >> 1) * 7.5 + R() * 3); const z = -30 + R() * 90; if (Math.abs(x) < 50 && z > -14 && z < 14) continue; const g = new THREE.Group(); const w = 5 + R() * 3, d = 5 + R() * 3, h = 3 + R() * 2.5; const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lowStd(houseCols[i % 6])); b.position.y = h / 2; const rf = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, 2.2, 4), lowStd(roofCols[i % 3])); rf.position.y = h + 1.1; rf.rotation.y = Math.PI / 4; const wm = bmt(0x3b4a66); winMats.push(wm); for (const sx of [-1, 1]) { const wn = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), wm); wn.position.set(sx * w * 0.25, h * 0.55, d / 2 + 0.02); g.add(wn); } b.castShadow = rf.castShadow = true; g.add(b, rf); g.position.set(x, 0, z); g.rotation.y = side > 0 ? -Math.PI / 2 + (R() - 0.5) * 0.3 : Math.PI / 2 + (R() - 0.5) * 0.3; stat.add(g); }
  // bukit belakang toko + pagar belakang
  for (let i = 0; i < 7; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(2.6 + R() * 1.2, 6 + R() * 3, 6), lowStd(0x2f7a3a)); t.position.set(-30 + i * 10 + R() * 3, 3.2, -16 - R() * 6); t.castShadow = true; stat.add(t); }

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
  const vehicles = [];
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
    winMats.forEach((m) => m.color.setRGB(0.23 + night * 0.77, 0.29 + night * 0.62, 0.4 + night * 0.2).multiplyScalar(0.7 + night * 0.6)); branchWin.forEach((m) => m.color.setRGB(0.4 + night * 0.6, 0.55 + night * 0.4, 0.85 - night * 0.2));
    // cahaya
    lights.sun.position.copy(sunDir.y > 0 ? sunDir : new THREE.Vector3(-sunDir.x, -sunDir.y, sunDir.z)).multiplyScalar(40); lights.sun.intensity = (sunDir.y > 0 ? Math.max(0, sunDir.y) * 2.0 : Math.max(0, -sunDir.y) * 0.35) * (1 - rk * 0.65) + 0.05;
    lights.sun.color.setRGB(1, 0.78 + Math.min(0.2, sunDir.y), 0.55 + Math.min(0.4, sunDir.y * 1.2)); if (sunDir.y <= 0) lights.sun.color.setRGB(0.55, 0.65, 1);
    lights.hemi.intensity = (0.62 + day * 0.65) * (1 - rk * 0.3); lights.hemi.color.copy(sk.mid).lerp(new THREE.Color(0xffffff), 0.35);
    const fogC = sk.bot.clone().lerp(gray, rk * 0.7); lights.fog.color.copy(fogC); lights.fog.near = 70 - rk * 35; lights.fog.far = 330 - rk * 170;
    scene.background = fogC; cache = { day, night, rain: rk }; }
    clouds.forEach((c) => { c.position.x += c.userData.v * dt * (1 + rk); if (c.position.x > 200) c.position.x = -200; });
    sky.position.copy(camPos);
    // hujan
    rainMat.opacity = rk * 0.6; rain.visible = rk > 0.02; if (rain.visible) { rain.position.set(camPos.x, 0, camPos.z); const a = rg.attributes.position.array; for (let i = 0; i < RN; i++) { const o = i * 6; let y = a[o + 1] - dt * 24; if (y < 0) y += 30; a[o + 1] = y; a[o + 4] = y - 1.0; } rg.attributes.position.needsUpdate = true; }
    // lalu lintas
    trafficT -= dt; if (trafficT <= 0) { trafficT = 5 + Math.random() * 8; spawnTraffic(); }
    updateVehicles(dt);
    return { ...cache, rain: rk };
  }
  mergeByMaterial(stat);
  return { update, setBranches, driveIn, driveOut, BAYS, LOT, root, vehicles, lotLights, setRainDensity(d) { rain.geometry.setDrawRange(0, Math.floor(RN * d) * 2); } };
}
