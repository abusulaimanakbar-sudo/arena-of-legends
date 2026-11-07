// Sirkuit jalan kota: jalur tertutup, marka, pagar, pohon, gedung, lampu jalan
import * as THREE from '../vendor/three.module.js';

export const TRACK_W = 13;

function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

export function buildWorld(scene) {
  const R = rng(42);
  // jalur: titik kontrol (x,z)
  const cp = [[0, 0], [160, 0], [300, 40], [380, 150], [340, 280], [220, 330], [120, 260], [60, 330], [-60, 380], [-200, 320], [-240, 190], [-160, 90], [-80, 50]];
  const curve = new THREE.CatmullRomCurve3(cp.map((p) => new THREE.Vector3(p[0], 0, p[1])), true, 'centripetal');
  const N = 900; const pts = curve.getSpacedPoints(N); pts.pop();
  const n = pts.length; const tang = [], norm = [];
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; const t = new THREE.Vector3().subVectors(b, a).normalize(); tang.push(t); norm.push(new THREE.Vector3(-t.z, 0, t.x)); }
  const len = curve.getLength();

  // aspal
  const pos = [], uv = [], idx = [];
  let acc = 0;
  for (let i = 0; i <= n; i++) {
    const k = i % n; const p = pts[k], nr = norm[k];
    pos.push(p.x - nr.x * TRACK_W / 2, 0.02, p.z - nr.z * TRACK_W / 2, p.x + nr.x * TRACK_W / 2, 0.02, p.z + nr.z * TRACK_W / 2);
    uv.push(0, acc / 6, 1, acc / 6); acc += len / n;
    if (i < n) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); rg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); rg.setIndex(idx); rg.computeVertexNormals();
  const roadTex = makeRoadTex(); roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping; roadTex.anisotropy = 8;
  const road = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.92, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); road.position.y = 0.06; road.receiveShadow = true; scene.add(road);

  // tanah
  const gt = makeGrassTex(); gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(400, 400);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshStandardMaterial({ map: gt, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.set(100, 0, 150); ground.receiveShadow = true; scene.add(ground);

  // curb merah-putih + pagar
  const curbG = new THREE.BoxGeometry(0.5, 0.16, 1.2);
  const curbMat = [new THREE.MeshStandardMaterial({ color: 0xd8d8d8 }), new THREE.MeshStandardMaterial({ color: 0xc8102e })];
  const curbs = [new THREE.InstancedMesh(curbG, curbMat[0], n), new THREE.InstancedMesh(curbG, curbMat[1], n)];
  let ci = [0, 0]; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s1 = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < n; i += 2) for (const side of [-1, 1]) {
    const p = pts[i], nr = norm[i], t = tang[i]; const ang = Math.atan2(t.x, t.z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ang);
    const k = (i / 2 + (side > 0 ? 1 : 0)) % 2; m4.compose(new THREE.Vector3(p.x + nr.x * side * (TRACK_W / 2 + 0.25), 0.04, p.z + nr.z * side * (TRACK_W / 2 + 0.25)), q, s1); curbs[k].setMatrixAt(ci[k]++, m4);
  }
  curbs.forEach((c, k) => { c.count = ci[k]; c.receiveShadow = true; scene.add(c); });

  const railG = new THREE.BoxGeometry(0.15, 0.7, 4.2);
  const rails = new THREE.InstancedMesh(railG, new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 0.7, roughness: 0.4 }), n);
  let ri = 0;
  for (let i = 0; i < n; i += 4) for (const side of [-1, 1]) {
    const p = pts[i], nr = norm[i], t = tang[i]; q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(t.x, t.z));
    m4.compose(new THREE.Vector3(p.x + nr.x * side * (TRACK_W / 2 + 4), 0.45, p.z + nr.z * side * (TRACK_W / 2 + 4)), q, s1); rails.setMatrixAt(ri++, m4);
  }
  rails.count = ri; rails.castShadow = true; scene.add(rails);

  // pohon & gedung & lampu (instanced)
  const near = (x, z) => { let md = 1e9; for (let i = 0; i < n; i += 6) { const dx = pts[i].x - x, dz = pts[i].z - z; const d = dx * dx + dz * dz; if (d < md) md = d; } return Math.sqrt(md); };
  const trunkG = new THREE.CylinderGeometry(0.25, 0.35, 3, 6), leafG = new THREE.ConeGeometry(2.2, 6, 8);
  const trunk = new THREE.InstancedMesh(trunkG, new THREE.MeshStandardMaterial({ color: 0x5a3b22 }), 700), leaf = new THREE.InstancedMesh(leafG, new THREE.MeshStandardMaterial({ color: 0x2f7a3a, roughness: 0.9 }), 700);
  let ti = 0;
  for (let k = 0; k < 2500 && ti < 700; k++) { const x = -420 + R() * 900, z = -150 + R() * 650; if (near(x, z) < TRACK_W / 2 + 12) continue; const sc = 0.8 + R() * 0.9; m4.compose(new THREE.Vector3(x, 1.5 * sc, z), q.identity(), new THREE.Vector3(sc, sc, sc)); trunk.setMatrixAt(ti, m4); m4.compose(new THREE.Vector3(x, 5.5 * sc, z), q.identity(), new THREE.Vector3(sc, sc, sc)); leaf.setMatrixAt(ti, m4); ti++; }
  trunk.count = leaf.count = ti; trunk.castShadow = leaf.castShadow = true; scene.add(trunk, leaf);

  const bG = new THREE.BoxGeometry(1, 1, 1); const bTex = makeWindowTex();
  const blds = new THREE.InstancedMesh(bG, new THREE.MeshStandardMaterial({ map: bTex, roughness: 0.8 }), 160); let bi = 0;
  for (let k = 0; k < 900 && bi < 160; k++) { const x = -420 + R() * 900, z = -150 + R() * 650; if (near(x, z) < TRACK_W / 2 + 22) continue; const w = 10 + R() * 22, d = 10 + R() * 22, h = 8 + R() * 40; const c = new THREE.Color().setHSL(0.08 + R() * 0.1, 0.12, 0.45 + R() * 0.3); m4.compose(new THREE.Vector3(x, h / 2, z), q.identity(), new THREE.Vector3(w, h, d)); blds.setMatrixAt(bi, m4); blds.setColorAt(bi, c); bi++; }
  blds.count = bi; blds.castShadow = true; blds.receiveShadow = true; scene.add(blds);

  const poleG = new THREE.CylinderGeometry(0.1, 0.14, 8, 6); const poles = new THREE.InstancedMesh(poleG, new THREE.MeshStandardMaterial({ color: 0x555a60 }), 200);
  const lampG = new THREE.SphereGeometry(0.35, 8, 6); const lamps = new THREE.InstancedMesh(lampG, new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe9a0, emissiveIntensity: 1.5 }), 200); let pi = 0;
  for (let i = 0; i < n && pi < 200; i += 22) { const p = pts[i], nr = norm[i]; const side = (i / 22) % 2 ? 1 : -1; const x = p.x + nr.x * side * (TRACK_W / 2 + 6), z = p.z + nr.z * side * (TRACK_W / 2 + 6); m4.compose(new THREE.Vector3(x, 4, z), q.identity(), s1); poles.setMatrixAt(pi, m4); m4.compose(new THREE.Vector3(x - nr.x * side * 0.8, 8, z - nr.z * side * 0.8), q, s1); lamps.setMatrixAt(pi, m4); pi++; }
  poles.count = lamps.count = pi; scene.add(poles, lamps);

  // garis start/finish
  const sf = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_W, 2.4), new THREE.MeshBasicMaterial({ map: makeCheckerTex() })); sf.rotation.x = -Math.PI / 2; sf.rotation.z = -Math.atan2(tang[0].x, tang[0].z) + Math.PI / 2 * 0; sf.position.set(pts[0].x, 0.04, pts[0].z); sf.rotation.set(-Math.PI / 2, 0, 0); sf.rotation.z = Math.atan2(tang[0].x, tang[0].z) * -1; scene.add(sf);
  // gerbang start
  const gate = new THREE.Group(); const gm = new THREE.MeshStandardMaterial({ color: 0x222831 });
  for (const s of [-1, 1]) { const pl = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8, 0.6), gm); pl.position.set(s * (TRACK_W / 2 + 1), 4, 0); gate.add(pl); }
  const bn = new THREE.Mesh(new THREE.BoxGeometry(TRACK_W + 3, 1.6, 0.5), new THREE.MeshStandardMaterial({ map: makeBannerTex(), emissive: 0x222222 })); bn.position.y = 7.6; gate.add(bn);
  gate.position.copy(pts[0]); gate.rotation.y = Math.atan2(tang[0].x, tang[0].z); scene.add(gate);

  return { pts, tang, norm, n, len, nearest, start: { pos: pts[0].clone(), heading: Math.atan2(tang[0].x, tang[0].z) } };

  // cari titik jalur terdekat (pencarian lokal dari indeks sebelumnya)
  function nearest(x, z, hint) {
    let best = 1e18, bi2 = 0;
    const range = hint == null ? n : 40; const from = hint == null ? 0 : hint - 20;
    for (let k = 0; k < range; k++) { const i = (((from + k) % n) + n) % n; const dx = pts[i].x - x, dz = pts[i].z - z; const d = dx * dx + dz * dz; if (d < best) { best = d; bi2 = i; } }
    const nr = norm[bi2]; const side = (x - pts[bi2].x) * nr.x + (z - pts[bi2].z) * nr.z;
    return { i: bi2, dist: Math.sqrt(best), side };
  }
}

function canvasTex(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function makeRoadTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#34373b'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) { const v = 40 + Math.random() * 40; g.fillStyle = `rgb(${v},${v},${v + 4})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    g.fillStyle = '#e9e9e9'; g.fillRect(6, 0, 6, h); g.fillRect(w - 12, 0, 6, h);
    g.fillStyle = '#f2c230'; g.fillRect(w / 2 - 3, 0, 6, h / 2);
  });
}
function makeGrassTex() { return canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#3d7a3a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { g.fillStyle = `hsl(${95 + Math.random() * 30},45%,${25 + Math.random() * 15}%)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }); }
function makeWindowTex() { return canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#d7d2c8'; g.fillRect(0, 0, w, h); for (let y = 6; y < h; y += 16) for (let x = 6; x < w; x += 16) { g.fillStyle = Math.random() < 0.3 ? '#ffe39a' : '#4b6a86'; g.fillRect(x, y, 9, 10); } }); }
function makeCheckerTex() { return canvasTex(128, 32, (g) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 16; x++) { g.fillStyle = (x + y) % 2 ? '#fff' : '#111'; g.fillRect(x * 8, y * 8, 8, 8); } }); }
function makeBannerTex() { return canvasTex(512, 64, (g, w, h) => { g.fillStyle = '#c8102e'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('VARIO 150 CIRCUIT — START / FINISH', w / 2, h / 2 + 2); }); }
