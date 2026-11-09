// Model 3D prosedural: orang (rangka 2 segmen), konsol PS3/PS4/PS4 Pro/PS5/PS5 Pro, stik, sofa, TV, dll.
import * as THREE from 'three';

// Material ringan (Lambert) dengan cache: material dengan parameter sama dipakai bersama
const matCache = new Map();
export const std = (color, o = {}) => {
  const { roughness, metalness, flatShading, map, ...rest } = o; void roughness; void metalness;
  const key = map ? null : color + '|' + (flatShading ? 1 : 0) + '|' + JSON.stringify(rest);
  if (key && matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshLambertMaterial({ color, flatShading: !!flatShading, map, ...rest }); if (key) matCache.set(key, m); return m;
};
const geoCache = new Map();
export const sharedGeo = (key, make) => { let g = geoCache.get(key); if (!g) { g = make(); geoCache.set(key, g); } return g; };
// gabungkan beberapa bagian berwarna menjadi 1 geometri (warna per-vertex)
const _col = new THREE.Color();
export function mergeColored(parts) {
  const pos = [], nor = [], col = [];
  for (const { g, m, c } of parts) {
    const ng = g.index ? g.toNonIndexed() : g.clone(); if (m) ng.applyMatrix4(m); _col.set(c);
    const p = ng.attributes.position.array, n = ng.attributes.normal.array; for (let i = 0; i < p.length; i++) { pos.push(p[i]); nor.push(n[i]); } for (let i = 0; i < p.length / 3; i++) col.push(_col.r, _col.g, _col.b); ng.dispose();
  }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return out;
}
// gabungkan mesh statis dalam grup. Material Lambert polos (tanpa tekstur/transparan/emisi) digabung jadi SATU mesh dengan warna per-vertex.
const bakeMat = { 0: new THREE.MeshLambertMaterial({ vertexColors: true }), 1: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }) };
const bakeable = (m) => m.isMeshLambertMaterial && !m.map && !m.transparent && !m.vertexColors && m.emissive.getHex() === 0 && m.opacity === 1;
export function mergeByMaterial(group) {
  group.updateMatrixWorld(true); const inv = group.matrixWorld.clone().invert(); const buckets = new Map(); const rm = [];
  group.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && !Array.isArray(o.material) && !o.userData.keep) { const m = o.material; const key = bakeable(m) ? (m.flatShading ? 'bake1' : 'bake0') : m; if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(o); rm.push(o); } });
  const out = [];
  for (const [key, list] of buckets) {
    const bake = typeof key === 'string'; const mat = bake ? bakeMat[key === 'bake1' ? 1 : 0] : key;
    const pos = [], nor = [], uv = [], colr = []; const hasUV = !bake && list.every((o) => o.geometry.attributes.uv); const hasC = !bake && list.every((o) => o.geometry.attributes.color);
    for (const o of list) {
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(inv.clone().multiply(o.matrixWorld)); const p = g.attributes.position.array, n = g.attributes.normal.array;
      for (let i = 0; i < p.length; i++) { pos.push(p[i]); nor.push(n[i]); }
      if (bake) { const c = o.material.color; for (let i = 0; i < p.length / 3; i++) colr.push(c.r, c.g, c.b); }
      if (hasUV) { const u = g.attributes.uv.array; for (let i = 0; i < u.length; i++) uv.push(u[i]); } if (hasC) { const c = g.attributes.color.array; for (let i = 0; i < c.length; i++) colr.push(c[i]); } g.dispose();
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); if (hasUV) geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); if (bake || hasC) geo.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
    out.push(new THREE.Mesh(geo, mat));
  }
  rm.forEach((o) => o.parent && o.parent.remove(o)); out.forEach((o) => group.add(o)); return out;
}
export const vcMat = new THREE.MeshLambertMaterial({ vertexColors: true });
export function canvasTex(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); fn(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData = { c, g }; return t; }

const emojiCache = {};
export function emojiTex(e) { return emojiCache[e] || (emojiCache[e] = canvasTex(96, 96, (g) => { g.font = '64px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, 48, 52); })); }
export function emojiSprite(e) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex(e), transparent: true, depthTest: false })); s.scale.set(0.4, 0.4, 1); s.renderOrder = 12; return s; }
export function textSprite(text, color = '#fff', size = 40) {
  const t = canvasTex(512, 96, (g, w, h) => { g.font = `bold ${size}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 8; g.strokeStyle = '#000d'; g.fillStyle = color; g.strokeText(text, w / 2, h / 2); g.fillText(text, w / 2, h / 2); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false })); s.scale.set(2.4, 0.45, 1); s.renderOrder = 13; return s;
}

// ---------- stik ----------
export function makeController(color = 0xf4f5fa) {
  const body = new THREE.CapsuleGeometry(0.035, 0.1, 2, 6), grip = new THREE.CapsuleGeometry(0.03, 0.06, 2, 6), mid = new THREE.BoxGeometry(0.09, 0.012, 0.05), bar = new THREE.BoxGeometry(0.1, 0.008, 0.012);
  const rz = new THREE.Matrix4().makeRotationZ(Math.PI / 2).multiply(new THREE.Matrix4().makeScale(1, 1, 0.8));
  const parts = [{ g: body, m: rz, c: color }, { g: mid, m: new THREE.Matrix4().makeTranslation(0, 0.028, 0), c: 0x14151a }, { g: bar, m: new THREE.Matrix4().makeTranslation(0, 0.03, -0.035), c: 0x3b82f6 }];
  for (const sx of [-1, 1]) parts.push({ g: grip, m: new THREE.Matrix4().compose(new THREE.Vector3(sx * 0.085, -0.025, 0.012), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.35, 0, 0)), new THREE.Vector3(1, 1, 1)), c: color });
  const g = new THREE.Group(); g.add(new THREE.Mesh(mergeColored(parts), vcMat)); return g;
}

// ---------- konsol (tier 0..4) ----------
export function makeConsole(tier) {
  const g = new THREE.Group(); let led;
  const black = std(0x101116, { roughness: 0.3, metalness: 0.3 }), white = std(0xf4f5fa, { roughness: 0.22 });
  if (tier === 0) { // PS3 Slim
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.065, 0.26), std(0x1a1b1f, { roughness: 0.25, metalness: 0.4 })); m.position.y = 0.033; g.add(m);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.008, 0.004), std(0x000)); slot.position.set(0, 0.04, 0.131); g.add(slot);
    led = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.014, 0.004), new THREE.MeshBasicMaterial({ color: 0xff3030, toneMapped: false })); led.position.set(0.11, 0.05, 0.131); g.add(led);
  } else if (tier <= 2) { // PS4 / PS4 Pro
    const w = 0.4, d = 0.28, h = tier === 2 ? 0.1 : 0.07;
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(w, 0); sh.lineTo(w - h * 0.9, h); sh.lineTo(0, h); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false }); geo.translate(-w / 2, 0, -d / 2);
    const m = new THREE.Mesh(geo, black); g.add(m);
    led = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.007, 0.004), new THREE.MeshBasicMaterial({ color: 0x3b82f6, toneMapped: false })); led.position.set(-0.02, h - 0.012, d / 2 + 0.002); g.add(led);
    if (tier === 2) { const st = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.02, d - 0.04), black); st.position.set(-0.03, 0.06, 0); g.add(st); }
  } else { // PS5 / PS5 Pro: tegak, sayap putih melengkung + inti hitam
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.4, 0.2), black); core.position.y = 0.22; g.add(core);
    for (const sx of [-1, 1]) {
      const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(0.17, 0.2, 0.1, 0.42); sh.lineTo(0.0, 0.42); sh.closePath();
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.045, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 }); geo.rotateY(Math.PI / 2); geo.translate(0, 0.01, -0.0);
      geo.scale(1, 1, 1);
      const wing = new THREE.Mesh(geo, white); wing.scale.set(1, 1, 1.45); wing.position.set(sx > 0 ? 0.035 : -0.035 - 0.045, 0, -0.1 * 0 + 0.0); wing.position.z = 0.0; wing.rotation.y = 0; g.add(wing);
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.42, 0.24), white); side.position.set(sx * 0.0575, 0.22, 0); side.visible = false; g.add(side);
    }
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.04), white); plate.position.set(0, 0.22, -0.08); g.add(plate);
    led = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.36, 0.03), new THREE.MeshBasicMaterial({ color: 0x3b82f6, toneMapped: false })); led.position.set(0.0, 0.22, 0.102); g.add(led);
    if (tier === 4) { const acc = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.012, 0.22), new THREE.MeshBasicMaterial({ color: 0x8b5cf6, toneMapped: false })); acc.position.set(0, 0.012, 0.0); g.add(acc); }
  }
  mergeByMaterial(g);
  g.userData.led = led; return g;
}

// ---------- sofa (kenyamanan 0..2) ----------
export function makeSofa(color, comfort = 0, width = 2.1) {
  const g = new THREE.Group();
  const m = comfort >= 1 ? std(color, { roughness: 0.35, metalness: 0.05 }) : std(color, { roughness: 0.9 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(width, 0.36, 0.9), m); seat.position.y = 0.27; g.add(seat);
  const bk = new THREE.Mesh(new THREE.BoxGeometry(width, 0.62, 0.22), m); bk.position.set(0, 0.72, 0.34); bk.rotation.x = -0.1; g.add(bk);
  for (const sx of [-1, 1]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.9), m); arm.position.set(sx * (width / 2 + 0.0), 0.46, 0); g.add(arm); }
  for (const sx of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 8), std(0x222)); leg.position.set(sx * (width / 2 - 0.1), 0.05, 0.3); g.add(leg); const leg2 = leg.clone(); leg2.position.z = -0.3; g.add(leg2); }
  if (comfort >= 2) { for (const sx of [-1, 1]) { const cu = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.12), std(0xfacc15, { roughness: 0.8 })); cu.position.set(sx * (width / 2 - 0.4), 0.62, 0.2); cu.rotation.set(-0.25, sx * 0.2, 0); g.add(cu); } }
  mergeByMaterial(g); g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
export function makeChair(color = 0x3b82f6) {
  const g = new THREE.Group(); const m = std(color, { roughness: 0.6 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.55), m); seat.position.y = 0.45; g.add(seat);
  const bk = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.07), m); bk.position.set(0, 0.76, 0.24); g.add(bk);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 6), std(0x222)); l.position.set(sx * 0.22, 0.22, sz * 0.22); g.add(l); }
  mergeByMaterial(g); g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---------- kendaraan low-poly ----------
const HEADM = new THREE.MeshBasicMaterial({ color: 0xfff6c8, toneMapped: false }), TAILM = new THREE.MeshBasicMaterial({ color: 0xff2222, toneMapped: false });
export function makeCar(color = 0xdc2626, kind = 'car') {
  const g = new THREE.Group(); const body = std(color, { roughness: 0.4, metalness: 0.3, flatShading: true }), glass = std(0x1f2937, { roughness: 0.15, metalness: 0.5, flatShading: true }), dark = std(0x111111);
  const tall = kind === 'suv' ? 0.18 : 0;
  const lower = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.62 + tall, 4.1), body); lower.position.y = 0.58 + tall / 2; g.add(lower);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.56 + tall, 2.2), glass); cab.position.set(0, 1.12 + tall, -0.15); g.add(cab);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.08, 2.0), body); roof.position.set(0, 1.44 + tall * 1.3, -0.15); g.add(roof);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 1.2), body); hood.position.set(0, 0.92 + tall, 1.45); g.add(hood);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.26, 10), dark); w.rotation.z = Math.PI / 2; w.position.set(sx * 0.93, 0.34, sz * 1.3); g.add(w); }
  for (const sx of [-1, 1]) { const hl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.05), HEADM); hl.position.set(sx * 0.62, 0.72 + tall, 2.07); g.add(hl); const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.05), TAILM); tl.position.set(sx * 0.62, 0.74 + tall, -2.07); g.add(tl); }
  mergeByMaterial(g); return g;
}
export function makeBike(color = 0x2563eb) {
  const g = new THREE.Group(); const body = std(color, { roughness: 0.4, flatShading: true }), dark = std(0x111111);
  const mid = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 1.0), body); mid.position.set(0, 0.55, -0.2); g.add(mid);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.8), dark); seat.position.set(0, 0.85, -0.3); g.add(seat);
  const front = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, 0.3), body); front.position.set(0, 0.7, 0.55); g.add(front);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.05), dark); bar.position.set(0, 1.08, 0.5); g.add(bar);
  for (const z of [0.7, -0.75]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.14, 10), dark); w.rotation.z = Math.PI / 2; w.position.set(0, 0.28, z); g.add(w); }
  const hl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.04), HEADM); hl.position.set(0, 0.95, 0.72); g.add(hl);
  mergeByMaterial(g); return g;
}

// ---------- makanan kantin ----------
export function makeFood(kind) {
  const g = new THREE.Group();
  if (kind === 'mie') { const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.07, 0.08, 14), std(0xf8fafc, { roughness: 0.3 })); bowl.position.y = 0.04; const noodle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 14), std(0xf4c542, { roughness: 0.9 })); noodle.position.y = 0.085; const egg = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), std(0xfff7d6)); egg.position.set(0.03, 0.115, 0.01); egg.scale.y = 0.6; const sc = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.03), std(0x2f9e44)); sc.position.set(-0.04, 0.105, 0.03); g.add(bowl, noodle, egg, sc); }
  else if (kind === 'teh' || kind === 'jeruk') { const col = kind === 'teh' ? 0xc2761e : 0xff8a1f; const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.034, 0.13, 10), std(col, { transparent: true, opacity: 0.85, roughness: 0.1 })); glass.position.y = 0.065; const ice = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), std(0xffffff, { transparent: true, opacity: 0.7 })); ice.position.set(0, 0.12, 0); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.13, 4), std(0xef4444)); st.position.set(0.015, 0.15, 0); st.rotation.z = 0.2; g.add(glass, ice, st); }
  else if (kind === 'kopi') { const sa = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.01, 12), std(0xf8fafc)); sa.position.y = 0.005; const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.035, 0.06, 12), std(0xf8fafc)); cup.position.y = 0.04; const cf = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.005, 12), std(0x3b2314)); cf.position.y = 0.068; g.add(sa, cup, cf); }
  else { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.015, 14), std(0xf8fafc)); pl.position.y = 0.008; g.add(pl); for (let i = 0; i < 4; i++) { const fr = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.025, 8), std(0xc98a2b)); fr.position.set(Math.cos(i * 1.6) * 0.05, 0.03 + (i > 2 ? 0.02 : 0), Math.sin(i * 1.6) * 0.05); g.add(fr); } }
  mergeByMaterial(g); return g;
}

// ---------- gelembung dialog ----------
const bubCache = new Map();
export function dialogSprite(text, tone = 'say') {
  const key = tone + '|' + text; let tex = bubCache.get(key);
  if (!tex) {
    if (bubCache.size > 250) bubCache.clear();
    const lines = []; const words = text.split(' '); let cur = ''; for (const w of words) { if ((cur + ' ' + w).trim().length > 18) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w; } if (cur.trim()) lines.push(cur.trim());
    const W = 360, H = 40 + lines.length * 40;
    tex = canvasTex(W, H + 20, (g, w, h) => {
      const fill = tone === 'shout' ? '#fff3b0' : tone === 'bad' ? '#ffd5d5' : tone === 'good' ? '#d5ffe0' : '#ffffff'; const stroke = tone === 'shout' ? '#f59e0b' : tone === 'bad' ? '#ef4444' : tone === 'good' ? '#22c55e' : '#334155';
      g.fillStyle = fill; g.strokeStyle = stroke; g.lineWidth = 5; const r = 22; g.beginPath(); g.moveTo(r, 4); g.lineTo(w - r, 4); g.quadraticCurveTo(w - 4, 4, w - 4, r); g.lineTo(w - 4, H - r); g.quadraticCurveTo(w - 4, H, w - r, H); g.lineTo(w / 2 + 14, H); g.lineTo(w / 2, H + 16); g.lineTo(w / 2 - 14, H); g.lineTo(r, H); g.quadraticCurveTo(4, H, 4, H - r); g.lineTo(4, r); g.quadraticCurveTo(4, 4, r, 4); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#111827'; g.font = (tone === 'shout' ? 'bold ' : '') + '30px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; lines.forEach((l, i) => g.fillText(l, w / 2, 28 + i * 38));
    });
    tex.userData.aspect = (H + 20) / W; bubCache.set(key, tex);
  }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })); const wd = tone === 'shout' ? 2.3 : 1.9; sp.scale.set(wd, wd * tex.userData.aspect, 1); sp.renderOrder = 14; sp.center.set(0.5, 0); return sp;
}

// ---------- gerakan tambahan (lapisan di atas pose dasar) ----------
export function applyGesture(p, name, t, k = 1) {
  const u = p.userData, a = u.arms; const ph = u.phase;
  if (name === 'talk') { a[1].up.rotation.x = -0.9 + Math.sin(t * 6 + ph) * 0.25 * k; a[1].fo.rotation.x = -1.2 + Math.sin(t * 7) * 0.3 * k; u.head.rotation.y += Math.sin(t * 3 + ph) * 0.15; u.head.rotation.x = Math.sin(t * 8) * 0.06; }
  else if (name === 'laugh') { u.hips.rotation.x += -0.2; u.head.rotation.x = -0.35 + Math.sin(t * 22) * 0.08; u.hips.position.y += Math.abs(Math.sin(t * 16)) * 0.025; a[0].up.rotation.x = -0.4; a[0].fo.rotation.x = -1.3; }
  else if (name === 'shout') { u.head.rotation.x = -0.25; a[0].up.rotation.x = -2.5 + Math.sin(t * 10) * 0.25; a[1].up.rotation.x = -2.5 + Math.cos(t * 10) * 0.25; a[0].fo.rotation.x = -0.3; a[1].fo.rotation.x = -0.3; u.hips.position.y += Math.abs(Math.sin(t * 12)) * 0.03; }
  else if (name === 'wave') { a[1].up.rotation.x = -2.6; a[1].up.rotation.z = -0.2 + Math.sin(t * 9) * 0.35; a[1].fo.rotation.x = -0.4; }
  else if (name === 'facepalm') { a[1].up.rotation.x = -1.4; a[1].fo.rotation.x = -1.9; u.head.rotation.x = 0.4; }
  else if (name === 'eat') { const c = (Math.sin(t * 2.4 + ph) + 1) / 2; a[1].up.rotation.x = -0.5 - c * 0.9; a[1].fo.rotation.x = -1.0 - c * 1.2; u.head.rotation.x += c * 0.12; }
  else if (name === 'phone') { a[0].up.rotation.x = -1.2; a[1].up.rotation.x = -1.2; a[0].fo.rotation.x = -1.5; a[1].fo.rotation.x = -1.5; u.head.rotation.x = 0.4; u.head.rotation.y = Math.sin(t * 0.6 + ph) * 0.05; }
  else if (name === 'point') { a[1].up.rotation.x = -1.5; a[1].fo.rotation.x = -0.1; a[1].up.rotation.z = -0.15; }
  else if (name === 'rage') { u.hips.position.y += Math.abs(Math.sin(t * 20)) * 0.04; a[0].up.rotation.x = -1.8 + Math.sin(t * 18) * 0.5; a[1].up.rotation.x = -1.8 + Math.cos(t * 18) * 0.5; u.head.rotation.x = 0.2; }
  else if (name === 'sleep') { u.head.rotation.x = 0.5; u.head.rotation.z = Math.sin(t * 0.8) * 0.1; }
}
// ---------- orang ----------
const SKIN = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac];
const SHIRTS = [0xef4444, 0x22c55e, 0xf59e0b, 0x8b5cf6, 0x06b6d4, 0xec4899, 0x64748b, 0xe2e8f0, 0x14b8a6];
const PANTS = [0x1f2937, 0x374151, 0x1e3a8a, 0x3f3f46, 0x7c5a3a];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

const T4 = (x, y, z, sx = 1, sy = 1, sz = 1, rx = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, 0)), new THREE.Vector3(sx, sy, sz));
const G = {
  torso: () => sharedGeo('torso', () => new THREE.CapsuleGeometry(0.17, 0.32, 2, 7)), pelvis: () => sharedGeo('pelvis', () => new THREE.BoxGeometry(0.3, 0.14, 0.2)), neck: () => sharedGeo('neck', () => new THREE.CylinderGeometry(0.05, 0.055, 0.08, 6)),
  skull: () => sharedGeo('skull', () => new THREE.SphereGeometry(0.15, 9, 7)), hair: () => sharedGeo('hair', () => new THREE.SphereGeometry(0.162, 9, 6, 0, Math.PI * 2, 0, Math.PI * 0.52)), pony: () => sharedGeo('pony', () => new THREE.CapsuleGeometry(0.04, 0.16, 2, 5)),
  capTop: () => sharedGeo('capTop', () => new THREE.CylinderGeometry(0.155, 0.165, 0.07, 9)), capBill: () => sharedGeo('capBill', () => new THREE.BoxGeometry(0.14, 0.015, 0.1)), band: () => sharedGeo('band', () => new THREE.TorusGeometry(0.16, 0.014, 5, 10, Math.PI)), cup: () => sharedGeo('cupE', () => new THREE.CylinderGeometry(0.05, 0.05, 0.04, 7)),
  apron: () => sharedGeo('apron', () => new THREE.BoxGeometry(0.3, 0.38, 0.02)), bag: () => sharedGeo('bag', () => new THREE.BoxGeometry(0.26, 0.34, 0.12)),
  seg: (len, r) => sharedGeo(`seg${len}_${r}`, () => { const g = new THREE.CapsuleGeometry(r, len - r * 2, 2, 6); g.translate(0, -len / 2, 0); return g; }),
  hand: () => sharedGeo('hand', () => new THREE.SphereGeometry(0.045, 6, 5)), shoe: () => sharedGeo('shoe', () => new THREE.BoxGeometry(0.1, 0.07, 0.22)),
};
// ===== Orang: kerangka (Group) tanpa mesh; tampilan digambar lewat InstancedMesh bersama (hanya ±18 draw call untuk SEMUA orang) =====
const I4 = new THREE.Matrix4();
const PART_DEFS = [ // [mesh, node, geometri, offset, peran-warna, syarat]
  ['torso', 'hips', () => G.torso(), T4(0, 0.3, 0, 1.05, 1, 0.8), 'shirt'], ['pelvis', 'hips', () => G.pelvis(), T4(0, 0.02, 0), 'pants'], ['neck', 'hips', () => G.neck(), T4(0, 0.62, 0), 'skin'],
  ['skull', 'head', () => G.skull(), T4(0, 0, 0, 0.95, 1.08, 1), 'skin'], ['hair', 'head', () => G.hair(), T4(0, 0.02, 0, 1, 1, 1, -0.15), 'hair'], ['pony', 'head', () => G.pony(), T4(0, -0.02, -0.17, 1, 1, 1, 0.4), 'hair', 'girl'],
  ['capTop', 'head', () => G.capTop(), T4(0, 0.11, 0), 'cap', 'cap'], ['capBill', 'head', () => G.capBill(), T4(0, 0.085, 0.16), 'cap', 'cap'], ['band', 'head', () => G.band(), T4(0, 0.02, 0), 'band', 'headset'],
  ['cup', 'head', () => G.cup(), new THREE.Matrix4().makeTranslation(-0.16, 0, 0).multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2)), 'cups', 'headset'], ['cup', 'head', () => G.cup(), new THREE.Matrix4().makeTranslation(0.16, 0, 0).multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2)), 'cups', 'headset'],
  ['apron', 'hips', () => G.apron(), T4(0, 0.28, 0.14), 'apronC', 'apron'], ['bag', 'hips', () => G.bag(), T4(0, 0.3, -0.18), 'bagC', 'bag'],
  ['up', 'upL', () => G.seg(0.28, 0.05), I4, 'shirt'], ['up', 'upR', () => G.seg(0.28, 0.05), I4, 'shirt'], ['fo', 'foL', () => G.seg(0.26, 0.042), I4, 'skin'], ['fo', 'foR', () => G.seg(0.26, 0.042), I4, 'skin'],
  ['hand', 'foL', () => G.hand(), T4(0, -0.28, 0), 'skin'], ['hand', 'foR', () => G.hand(), T4(0, -0.28, 0), 'skin'],
  ['th', 'thL', () => G.seg(0.45, 0.075), I4, 'pants'], ['th', 'thR', () => G.seg(0.45, 0.075), I4, 'pants'], ['sn', 'snL', () => G.seg(0.44, 0.06), I4, 'pants'], ['sn', 'snR', () => G.seg(0.44, 0.06), I4, 'pants'],
  ['shoe', 'snL', () => G.shoe(), T4(0, -0.45, 0.05), 'shoe'], ['shoe', 'snR', () => G.shoe(), T4(0, -0.45, 0.05), 'shoe'],
];
const peopleReg = []; let peopleMeshes = null, peopleDecals = null; const _pm = new THREE.Matrix4(); const PCAP = 96;
export function initPeople(scene) {
  if (peopleMeshes) return; peopleMeshes = {}; peopleDecals = createDecals(scene, PCAP, { opacity: 0.5 }); const mat = new THREE.MeshLambertMaterial({ color: 0xffffff }); const per = {};
  for (const d of PART_DEFS) per[d[0]] = (per[d[0]] || 0) + 1;
  for (const [name, n] of Object.entries(per)) { const geo = PART_DEFS.find((d) => d[0] === name)[2](); const m = new THREE.InstancedMesh(geo, mat, PCAP * n); m.count = 0; m.frustumCulled = false; m.castShadow = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); peopleMeshes[name] = m; }
}
export function syncPeople() {
  if (!peopleMeshes) return; for (let i = peopleReg.length - 1; i >= 0; i--) if (!peopleReg[i].parent) peopleReg.splice(i, 1);
  const cnt = {}; for (const k in peopleMeshes) cnt[k] = 0; peopleDecals.begin();
  for (const p of peopleReg) {
    if (!p.visible) continue; p.updateMatrixWorld(true); peopleDecals.add(p.position.x, p.position.z, 0.95, 0.95, 0, 0.09); const u = p.userData, nd = u.nodes;
    for (const d of PART_DEFS) { if (d[5] && !u.flags[d[5]]) continue; const mesh = peopleMeshes[d[0]]; const k = cnt[d[0]]; if (k >= mesh.instanceMatrix.count) continue; _pm.multiplyMatrices(nd[d[1]].matrixWorld, d[3]); mesh.setMatrixAt(k, _pm); mesh.setColorAt(k, u.col[d[4]]); cnt[d[0]] = k + 1; }
  }
  peopleDecals.end(); for (const k in peopleMeshes) { const m = peopleMeshes[k]; m.count = cnt[k]; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
}
export function makePerson(opt = {}) {
  const root = new THREE.Group(); const kind = opt.kind || 'cust';
  const girl = opt.girl ?? Math.random() < 0.35;
  const col = { skin: new THREE.Color(opt.skin ?? pick(SKIN)), shirt: new THREE.Color(opt.shirt ?? pick(SHIRTS)), pants: new THREE.Color(opt.pants ?? pick(PANTS)), hair: new THREE.Color(opt.hair ?? pick([0x111111, 0x2b1b12, 0x3b2314, 0x0a0a0a, 0x5b3a1e])), shoe: new THREE.Color(pick([0xf8fafc, 0x111827, 0xdc2626])), cap: new THREE.Color(pick([0x111827, 0xdc2626, 0x2563eb])), band: new THREE.Color(0x111111), cups: new THREE.Color(0xef4444), apronC: new THREE.Color(0x111827), bagC: new THREE.Color(pick([0x2563eb, 0xdc2626, 0x16a34a])) };
  const flags = { girl, cap: !!(opt.cap ?? (kind === 'cust' && !girl && Math.random() < 0.3)), headset: !!opt.headset, apron: !!opt.apron, bag: !!opt.bag };
  const hips = new THREE.Group(); hips.position.y = 0.9; root.add(hips);
  const head = new THREE.Group(); head.position.y = 0.76; hips.add(head);
  const arms = [], legs = [], nodes = { hips, head };
  for (const [sx, sn] of [[-1, 'L'], [1, 'R']]) {
    const up = new THREE.Group(); up.position.set(sx * 0.22, 0.52, 0); hips.add(up); const fo = new THREE.Group(); fo.position.y = -0.28; up.add(fo); arms.push({ up, fo, hand: null }); nodes['up' + sn] = up; nodes['fo' + sn] = fo;
  }
  for (const [sx, sn] of [[-1, 'L'], [1, 'R']]) {
    const th = new THREE.Group(); th.position.set(sx * 0.09, -0.02, 0); hips.add(th); const sh = new THREE.Group(); sh.position.y = -0.45; th.add(sh); legs.push({ th, sn: sh }); nodes['th' + sn] = th; nodes['sn' + sn] = sh;
  }
  root.userData = { hips, head, arms, legs, phase: Math.random() * 6, controller: null, pose: 'stand', nodes, col, flags, isPerson: true };
  peopleReg.push(root); return root;
}

export function attachController(p, color) {
  if (p.userData.controller) return;
  const c = makeController(color); c.position.set(0, 0.22, 0.2); c.rotation.x = -0.35; p.userData.hips.add(c); p.userData.controller = c;
}
export function detachController(p) { const c = p.userData.controller; if (c) { p.userData.hips.remove(c); p.userData.controller = null; } }

// pose: berjalan / berdiri / duduk main / duduk senang
export function poseWalk(p, t, speed = 1) {
  const u = p.userData, s = Math.sin(t * 8 * speed + u.phase);
  u.legs[0].th.rotation.x = s * 0.7; u.legs[1].th.rotation.x = -s * 0.7;
  u.legs[0].sn.rotation.x = Math.max(0, -s) * 0.9; u.legs[1].sn.rotation.x = Math.max(0, s) * 0.9;
  u.arms[0].up.rotation.x = -s * 0.6; u.arms[1].up.rotation.x = s * 0.6; u.arms[0].fo.rotation.x = -0.3 - Math.max(0, s) * 0.4; u.arms[1].fo.rotation.x = -0.3 - Math.max(0, -s) * 0.4;
  u.arms.forEach((a) => (a.up.rotation.z = 0)); u.hips.position.y = 0.9 + Math.abs(Math.cos(t * 8 * speed + u.phase)) * 0.035; u.hips.rotation.set(0, 0, 0); u.head.rotation.set(0, 0, 0); p.position.y = 0;
}
export function poseStand(p, t) {
  const u = p.userData; u.legs.forEach((l) => { l.th.rotation.x = 0; l.sn.rotation.x = 0; });
  u.arms[0].up.rotation.x = 0.05; u.arms[1].up.rotation.x = 0.05; u.arms[0].fo.rotation.x = -0.15; u.arms[1].fo.rotation.x = -0.15;
  u.hips.position.y = 0.9 + Math.sin(t * 1.6 + u.phase) * 0.006; u.hips.rotation.set(0, 0, 0); u.head.rotation.y = Math.sin(t * 0.7 + u.phase) * 0.4; p.position.y = 0;
}
export function poseSitPlay(p, t, excite = 0) {
  const u = p.userData; p.position.y = -0.42;
  u.legs.forEach((l, i) => { l.th.rotation.x = -1.5; l.sn.rotation.x = 1.5; l.th.rotation.z = (i ? 1 : -1) * 0.08; });
  u.hips.rotation.x = -0.12 - excite * 0.12; u.hips.position.y = 0.9;
  u.arms.forEach((a, i) => { a.up.rotation.x = -0.65; a.up.rotation.z = (i ? -1 : 1) * 0.12; a.fo.rotation.x = -1.15 + Math.sin(t * 13 + i * 2 + u.phase) * 0.05 * (1 + excite); });
  u.head.rotation.x = 0.05 + Math.sin(t * 0.8 + u.phase) * 0.03; u.head.rotation.y = Math.sin(t * 0.5 + u.phase) * 0.08;
  if (excite > 0.5) u.hips.position.y = 0.9 + Math.abs(Math.sin(t * 9 + u.phase)) * 0.04 * excite;
}
export function poseCheer(p, t) {
  const u = p.userData; poseSitPlay(p, t, 1); u.arms.forEach((a, i) => { a.up.rotation.x = -2.7 + Math.sin(t * 14 + i) * 0.3; a.up.rotation.z = (i ? -1 : 1) * 0.3; a.fo.rotation.x = -0.2; });
}
export function poseTalk(p, t) { const u = p.userData; poseStand(p, t); u.arms[1].up.rotation.x = -0.6; u.arms[1].fo.rotation.x = -1.2 + Math.sin(t * 5) * 0.15; }
export function poseType(p, t) { const u = p.userData; poseStand(p, t); u.arms.forEach((a, i) => { a.up.rotation.x = -0.7; a.fo.rotation.x = -1.0 + Math.sin(t * 12 + i * 3) * 0.12; }); u.head.rotation.x = 0.25; }

// ===== Bayangan palsu (decal) & kolam cahaya: murah, tanpa shadow-map =====
let _blob = null;
export function blobTex() { return _blob || (_blob = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 1, 32, 32, 31); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); })); }
export function createDecals(scene, cap, { additive = false, opacity = 0.5, color = 0x000000 } = {}) {
  const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ map: blobTex(), color, transparent: true, opacity, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const mesh = new THREE.InstancedMesh(geo, mat, cap); mesh.count = 0; mesh.frustumCulled = false; mesh.renderOrder = 2; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(mesh);
  const M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), E = new THREE.Euler(), Sc = new THREE.Vector3(), C = new THREE.Color();
  return { mesh, n: 0, begin() { this.n = 0; }, add(x, z, sx, sz, rot = 0, y = 0.08, col = null) { if (this.n >= cap) return; E.set(0, rot, 0); Q.setFromEuler(E); M.compose(P.set(x, y, z), Q, Sc.set(sx, 1, sz)); mesh.setMatrixAt(this.n, M); if (col !== null) mesh.setColorAt(this.n, C.set(col)); this.n++; }, end() { mesh.count = this.n; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; } };
}

// ===== Tanaman hias interior (daun melengkung, 1 mesh) =====
export function makePlant(scale = 1) {
  const parts = []; const M = new THREE.Matrix4();
  parts.push({ g: new THREE.CylinderGeometry(0.3, 0.22, 0.5, 10), m: new THREE.Matrix4().makeTranslation(0, 0.25, 0), c: 0xb4693a }, { g: new THREE.CylinderGeometry(0.28, 0.28, 0.04, 10), m: new THREE.Matrix4().makeTranslation(0, 0.5, 0), c: 0x3d2a1c });
  const leaf = new THREE.SphereGeometry(0.5, 7, 5); leaf.scale(0.2, 0.035, 0.55); leaf.translate(0, 0, 0.3);
  const greens = [0x2f8f46, 0x3da356, 0x56bf63, 0x268a3c];
  for (let i = 0; i < 11; i++) { const a = i * 2.4; const tilt = -0.35 - 0.12 * (i % 4); M.compose(new THREE.Vector3(Math.cos(a) * 0.05, 0.55 + 0.05 * (i % 3), Math.sin(a) * 0.05), new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, a, 0, 'YXZ')), new THREE.Vector3(1, 1, 1 + 0.15 * (i % 3))); parts.push({ g: leaf, m: M.clone(), c: greens[i % 4] }); }
  const g = new THREE.Group(); const mesh = new THREE.Mesh(mergeColored(parts), vcMat); g.add(mesh); g.scale.setScalar(scale); return g;
}
