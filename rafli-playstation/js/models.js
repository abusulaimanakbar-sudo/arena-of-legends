// Model 3D prosedural: orang (rangka 2 segmen), konsol PS3/PS4/PS4 Pro/PS5/PS5 Pro, stik, sofa, TV, dll.
import * as THREE from 'three';

export const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
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
  const g = new THREE.Group(); const m = std(color, { roughness: 0.35 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.1, 4, 8), m); body.rotation.z = Math.PI / 2; body.scale.set(1, 1, 0.8); g.add(body);
  for (const sx of [-1, 1]) { const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.06, 4, 8), m); grip.position.set(sx * 0.085, -0.025, 0.012); grip.rotation.x = 0.35; g.add(grip); }
  const blk = std(0x14151a, { roughness: 0.4 }); const mid = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.012, 0.05), blk); mid.position.set(0, 0.028, 0); g.add(mid);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.008, 0.012), new THREE.MeshBasicMaterial({ color: 0x3b82f6, toneMapped: false })); bar.position.set(0, 0.03, -0.035); g.add(bar);
  return g;
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
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
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
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
export function makeChair(color = 0x3b82f6) {
  const g = new THREE.Group(); const m = std(color, { roughness: 0.6 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.55), m); seat.position.y = 0.45; g.add(seat);
  const bk = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.07), m); bk.position.set(0, 0.76, 0.24); g.add(bk);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 6), std(0x222)); l.position.set(sx * 0.22, 0.22, sz * 0.22); g.add(l); }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  return g;
}

// ---------- kendaraan low-poly ----------
export function makeCar(color = 0xdc2626, kind = 'car') {
  const g = new THREE.Group(); const body = std(color, { roughness: 0.4, metalness: 0.3, flatShading: true }), glass = std(0x1f2937, { roughness: 0.15, metalness: 0.5, flatShading: true }), dark = std(0x111111);
  const tall = kind === 'suv' ? 0.18 : 0;
  const lower = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.62 + tall, 4.1), body); lower.position.y = 0.58 + tall / 2; g.add(lower);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.56 + tall, 2.2), glass); cab.position.set(0, 1.12 + tall, -0.15); g.add(cab);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.08, 2.0), body); roof.position.set(0, 1.44 + tall * 1.3, -0.15); g.add(roof);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 1.2), body); hood.position.set(0, 0.92 + tall, 1.45); g.add(hood);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.26, 10), dark); w.rotation.z = Math.PI / 2; w.position.set(sx * 0.93, 0.34, sz * 1.3); g.add(w); }
  for (const sx of [-1, 1]) { const hl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.05), new THREE.MeshBasicMaterial({ color: 0xfff6c8, toneMapped: false })); hl.position.set(sx * 0.62, 0.72 + tall, 2.07); g.add(hl); const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.05), new THREE.MeshBasicMaterial({ color: 0xff2222, toneMapped: false })); tl.position.set(sx * 0.62, 0.74 + tall, -2.07); g.add(tl); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return g;
}
export function makeBike(color = 0x2563eb) {
  const g = new THREE.Group(); const body = std(color, { roughness: 0.4, flatShading: true }), dark = std(0x111111);
  const mid = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 1.0), body); mid.position.set(0, 0.55, -0.2); g.add(mid);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.8), dark); seat.position.set(0, 0.85, -0.3); g.add(seat);
  const front = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, 0.3), body); front.position.set(0, 0.7, 0.55); g.add(front);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.05), dark); bar.position.set(0, 1.08, 0.5); g.add(bar);
  for (const z of [0.7, -0.75]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.14, 10), dark); w.rotation.z = Math.PI / 2; w.position.set(0, 0.28, z); g.add(w); }
  const hl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.04), new THREE.MeshBasicMaterial({ color: 0xfff6c8, toneMapped: false })); hl.position.set(0, 0.95, 0.72); g.add(hl);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return g;
}

// ---------- makanan kantin ----------
export function makeFood(kind) {
  const g = new THREE.Group();
  if (kind === 'mie') { const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.07, 0.08, 14), std(0xf8fafc, { roughness: 0.3 })); bowl.position.y = 0.04; const noodle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 14), std(0xf4c542, { roughness: 0.9 })); noodle.position.y = 0.085; const egg = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), std(0xfff7d6)); egg.position.set(0.03, 0.115, 0.01); egg.scale.y = 0.6; const sc = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.03), std(0x2f9e44)); sc.position.set(-0.04, 0.105, 0.03); g.add(bowl, noodle, egg, sc); }
  else if (kind === 'teh' || kind === 'jeruk') { const col = kind === 'teh' ? 0xc2761e : 0xff8a1f; const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.034, 0.13, 10), std(col, { transparent: true, opacity: 0.85, roughness: 0.1 })); glass.position.y = 0.065; const ice = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), std(0xffffff, { transparent: true, opacity: 0.7 })); ice.position.set(0, 0.12, 0); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.13, 4), std(0xef4444)); st.position.set(0.015, 0.15, 0); st.rotation.z = 0.2; g.add(glass, ice, st); }
  else if (kind === 'kopi') { const sa = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.01, 12), std(0xf8fafc)); sa.position.y = 0.005; const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.035, 0.06, 12), std(0xf8fafc)); cup.position.y = 0.04; const cf = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.005, 12), std(0x3b2314)); cf.position.y = 0.068; g.add(sa, cup, cf); }
  else { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.015, 14), std(0xf8fafc)); pl.position.y = 0.008; g.add(pl); for (let i = 0; i < 4; i++) { const fr = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.025, 8), std(0xc98a2b)); fr.position.set(Math.cos(i * 1.6) * 0.05, 0.03 + (i > 2 ? 0.02 : 0), Math.sin(i * 1.6) * 0.05); g.add(fr); } }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return g;
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

function limb(len, r, mat, parentY) { // pivot + segmen, mengembalikan {pivot, end}
  const piv = new THREE.Group(); const seg = new THREE.Mesh(new THREE.CapsuleGeometry(r, len - r * 2, 3, 8), mat); seg.position.y = -len / 2; piv.add(seg);
  const end = new THREE.Group(); end.position.y = -len; piv.add(end); return { piv, end };
}
export function makePerson(opt = {}) {
  const root = new THREE.Group();
  const kind = opt.kind || 'cust';
  const skin = std(opt.skin ?? pick(SKIN), { roughness: 0.75 });
  const shirtC = opt.shirt ?? pick(SHIRTS), pantsC = opt.pants ?? pick(PANTS);
  const shirt = std(shirtC, { roughness: 0.8 }), pants = std(pantsC, { roughness: 0.85 });
  const girl = opt.girl ?? Math.random() < 0.35;
  const hips = new THREE.Group(); hips.position.y = 0.9; root.add(hips);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.32, 4, 10), shirt); torso.position.y = 0.3; torso.scale.set(1.05, 1, 0.8); hips.add(torso);
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.2), pants); pelvis.position.y = 0.02; hips.add(pelvis);
  if (opt.apron) { const ap = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.38, 0.02), std(0x111827)); ap.position.set(0, 0.28, 0.14); hips.add(ap); }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.08, 8), skin); neck.position.y = 0.62; hips.add(neck);
  const head = new THREE.Group(); head.position.y = 0.76; hips.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 14), skin); skull.scale.set(0.95, 1.08, 1); head.add(skull);
  const hairC = opt.hair ?? pick([0x111111, 0x2b1b12, 0x3b2314, 0x0a0a0a, 0x5b3a1e]);
  const hairM = std(hairC, { roughness: 0.9 });
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.162, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), hairM); hair.position.y = 0.02; hair.rotation.x = -0.15; head.add(hair);
  if (girl) { const pt = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.16, 3, 6), hairM); pt.position.set(0, -0.02, -0.17); pt.rotation.x = 0.4; head.add(pt); }
  const eyeM = std(0x111, { roughness: 0.3 }); for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), eyeM); e.position.set(sx * 0.055, 0.02, 0.14); head.add(e); }
  if (opt.cap ?? (kind === 'cust' && !girl && Math.random() < 0.3)) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.165, 0.07, 14), std(pick([0x111827, 0xdc2626, 0x2563eb]))); cap.position.y = 0.11; head.add(cap); const bill = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.015, 0.1), cap.material); bill.position.set(0, 0.085, 0.16); head.add(bill); }
  if (opt.headset) { const hp = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.014, 6, 16, Math.PI), std(0x111)); hp.position.y = 0.02; hp.rotation.z = 0; head.add(hp); for (const sx of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 10), std(0xef4444)); c.rotation.z = Math.PI / 2; c.position.set(sx * 0.16, 0.0, 0); head.add(c); } }
  // lengan
  const arms = [];
  for (const sx of [-1, 1]) {
    const up = limb(0.28, 0.05, shirt); up.piv.position.set(sx * 0.22, 0.52, 0); hips.add(up.piv);
    const fo = limb(0.26, 0.042, skin); fo.piv.position.copy(up.end.position); up.piv.add(fo.piv);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), skin); hand.position.y = -0.28; fo.piv.add(hand);
    arms.push({ up: up.piv, fo: fo.piv, hand });
  }
  // kaki
  const legs = [];
  const shoeM = std(pick([0xf8fafc, 0x111827, 0xdc2626]), { roughness: 0.6 });
  for (const sx of [-1, 1]) {
    const th = limb(0.45, 0.075, pants); th.piv.position.set(sx * 0.09, -0.02, 0); hips.add(th.piv);
    const sn = limb(0.44, 0.06, pants); sn.piv.position.copy(th.end.position); th.piv.add(sn.piv);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.22), shoeM); shoe.position.set(0, -0.45, 0.05); sn.piv.add(shoe);
    legs.push({ th: th.piv, sn: sn.piv });
  }
  if (opt.bag) { const bag = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.34, 0.12), std(pick([0x2563eb, 0xdc2626, 0x16a34a]))); bag.position.set(0, 0.3, -0.18); hips.add(bag); }
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  root.userData = { hips, head, arms, legs, torso, phase: Math.random() * 6, controller: null, pose: 'stand' };
  return root;
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
