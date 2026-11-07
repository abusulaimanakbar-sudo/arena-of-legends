// Model 3D prosedural Honda Vario 150 LED New. Arah depan = +Z, atas = +Y, kiri-kanan = X
import * as THREE from '../vendor/three.module.js';
import { COLORS, PARTS } from './config.js';

const WB = 0.64;      // setengah wheelbase
const WR = 0.275;     // jari-jari roda

function profileMesh(points, width, mat, bevel = 0.012) {
  // points: [z,y] pada sisi samping, diekstrusi ke lebar (X)
  const sh = new THREE.Shape();
  points.forEach((p, i) => (i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1])));
  const g = new THREE.ExtrudeGeometry(sh, { depth: width, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 12 });
  g.translate(0, 0, -width / 2); g.rotateY(-Math.PI / 2);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.castShadow = true; return m;
}
function smoothPoly(pts, seg = 8) { // Catmull-Rom closed -> polyline
  const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], 0)), true, 'centripetal', 0.5);
  return c.getPoints(pts.length * seg).map((v) => [v.x, v.y]);
}

function makeWheel(tireColor, rimColor = 0x2b3a8c) {
  const g = new THREE.Group();
  const spin = new THREE.Group(); g.add(spin);
  const tire = new THREE.Mesh(new THREE.TorusGeometry(WR - 0.055, 0.056, 16, 40), new THREE.MeshStandardMaterial({ color: tireColor, roughness: 0.95 })); tire.rotation.y = Math.PI / 2; tire.scale.set(1, 1, 1.0); tire.castShadow = true; spin.add(tire);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(WR - 0.1, 0.02, 8, 36), new THREE.MeshStandardMaterial({ color: rimColor, metalness: 0.6, roughness: 0.3 })); rim.rotation.y = Math.PI / 2; spin.add(rim);
  const spokeMat = new THREE.MeshStandardMaterial({ color: 0x23262a, metalness: 0.7, roughness: 0.4 });
  for (let i = 0; i < 5; i++) { // velg 5 spoke
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.17, 0.04), spokeMat); sp.position.y = 0.08; const piv = new THREE.Group(); piv.rotation.x = (i / 5) * Math.PI * 2; piv.add(sp); spin.add(piv);
    const sp2 = sp.clone(); sp2.scale.set(1, 0.9, 1);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 16), spokeMat); hub.rotation.z = Math.PI / 2; spin.add(hub);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.006, 32), new THREE.MeshStandardMaterial({ color: 0xaeb2b8, metalness: 1, roughness: 0.3 })); disc.rotation.z = Math.PI / 2; disc.position.x = 0.04; spin.add(disc);
  g.userData.spin = spin; g.userData.tire = tire;
  return g;
}

export function buildBike(setup) {
  const root = new THREE.Group();
  const col = COLORS[setup.color];
  const body = new THREE.MeshPhysicalMaterial({ color: col.body, metalness: col.metal, roughness: col.rough, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  const accent = new THREE.MeshStandardMaterial({ color: col.accent, metalness: 0.3, roughness: 0.4 });
  const black = new THREE.MeshStandardMaterial({ color: 0x0f1012, roughness: 0.7 });
  const plastic = new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.6 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd8dade, metalness: 1, roughness: 0.15 });
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.85 });
  const ledMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdfeaff, emissiveIntensity: 2.2 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xff1020, emissive: 0xff0010, emissiveIntensity: 1.6 });
  const amber = new THREE.MeshStandardMaterial({ color: 0xff9a1a, emissive: 0xff7a00, emissiveIntensity: 1.0 });

  // ---- rangka belakang (swingarm+mesin CVT) bergerak sedikit saat suspensi
  const lean = new THREE.Group(); root.add(lean); root.userData.lean = lean;

  // roda
  const rimCol = col.accent === 0x111111 ? 0xdddddd : (setup.color === 'white' ? 0x2b3a8c : col.accent);
  const fw = makeWheel(PARTS.tire.options[setup.tire].color, rimCol), rw = makeWheel(PARTS.tire.options[setup.tire].color, rimCol);
  const steer = new THREE.Group(); steer.position.set(0, 0.93, 0.5); lean.add(steer); root.userData.steer = steer;
  // fork miring
  const forkTilt = new THREE.Group(); forkTilt.rotation.x = 0.0; steer.add(forkTilt);
  const forkLen = 0.72;
  const fk = new THREE.Group(); fk.rotation.x = -0.45; steer.add(fk); // condong ke depan
  const mkTube = (r, l, m) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, 12), m);
  for (const sx of [-0.07, 0.07]) { const t = mkTube(0.017, 0.72, chrome); t.position.set(sx, -0.34, 0); fk.add(t); const t2 = mkTube(0.024, 0.28, new THREE.MeshStandardMaterial({ color: 0x2a2c30, metalness: 0.8, roughness: 0.3 })); t2.position.set(sx, -0.6, 0); fk.add(t2); }
  // roda depan terhubung ke ujung fork
  const fwMount = new THREE.Group(); fk.add(fwMount); fwMount.position.set(0, -0.72, 0);
  // kompensasi rotasi fork agar roda sejajar tanah
  fwMount.rotation.x = 0.45; fwMount.add(fw);
  // posisi roda depan di dunia lokal: ditentukan di bawah dengan menempatkan langsung
  root.userData.frontWheel = fw; root.userData.rearWheel = rw;
  // fender depan
  const fender = profileMesh([[0.18, 0.02], [0.16, 0.07], [-0.02, 0.095], [-0.2, 0.05], [-0.22, 0.0], [-0.05, 0.04]].map((p) => [p[0], p[1]]), 0.14, body, 0.01);
  fender.position.set(0, 0, 0); fwMount.add(fender); fender.position.y = WR + 0.0; fender.position.z = 0.03; fender.rotation.x = -0.0;

  // --- handlebar & cowl
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.66, 10), black); bar.rotation.z = Math.PI / 2; bar.position.set(0, 0.17, -0.02); steer.add(bar);
  for (const sx of [-1, 1]) {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.12, 10), black); grip.rotation.z = Math.PI / 2; grip.position.set(sx * 0.34, 0.17, -0.02); steer.add(grip);
    const mir = new THREE.Group(); const stem = mkTube(0.006, 0.2, black); stem.position.y = 0.1; mir.add(stem);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), body); head.scale.set(1.0, 0.7, 0.35); head.position.y = 0.21; mir.add(head);
    mir.position.set(sx * 0.3, 0.19, 0.0); mir.rotation.z = -sx * 0.25; steer.add(mir);
    const lever = mkTube(0.004, 0.1, black); lever.rotation.x = Math.PI / 2; lever.position.set(sx * 0.31, 0.15, 0.06); steer.add(lever);
  }
  // speedometer LCD
  const meter = profileMesh([[-0.12, 0.0], [0.08, 0.0], [0.1, 0.07], [0.02, 0.1], [-0.1, 0.09]], 0.24, plastic, 0.01); meter.position.set(0, 0.15, -0.0); steer.add(meter);
  const lcd = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.05), new THREE.MeshStandardMaterial({ color: 0x0a2230, emissive: 0x2ad0ff, emissiveIntensity: 0.6 })); lcd.position.set(0, 0.23, -0.035); lcd.rotation.x = -1.0; lcd.rotation.y = Math.PI; steer.add(lcd);

  // headlamp & front cowl (ikut stang)
  const front = profileMesh([[-0.14, 0.15], [0.12, 0.13], [0.3, -0.02], [0.2, -0.2], [0.06, -0.36], [-0.1, -0.4], [-0.16, -0.2], [-0.15, 0.0]], 0.3, body, 0.008); front.position.set(0, 0, 0.0); steer.add(front);
  const beak = profileMesh([[0.1, 0.1], [0.33, -0.06], [0.2, -0.08]], 0.12, plastic, 0.006); steer.add(beak);
  front.position.set(0, 0, 0.0); steer.add(front);
  const lampBar = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.034, 0.03), ledMat); lampBar.position.set(0, 0.05, 0.25); lampBar.rotation.x = -0.25; steer.add(lampBar); // DRL
  for (const sx of [-1, 1]) {
    const lens = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.09, 4, 10), ledMat); lens.rotation.z = Math.PI / 2; lens.scale.set(1, 1, 0.5); lens.position.set(sx * 0.075, -0.06, 0.305); lens.rotation.x = -0.2; steer.add(lens);
    const sig = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.02, 0.025), amber); sig.position.set(sx * 0.15, 0.05, 0.17); steer.add(sig);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.05), accent); trim.position.set(sx * 0.2, -0.22, 0.12); trim.rotation.x = -0.35; steer.add(trim);
  }
  const lightBeam = new THREE.SpotLight(0xe8f0ff, 3.5, 60, 0.4, 0.6, 1.2); lightBeam.position.set(0, -0.07, 0.25); lightBeam.target.position.set(0, -0.5, 8); steer.add(lightBeam); steer.add(lightBeam.target); root.userData.headlight = lightBeam;
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.022), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x444444, metalness: 1, roughness: 0.2 })); logo.position.set(0, -0.2, 0.17); logo.rotation.x = -0.4; steer.add(logo);

  // ---- bodi utama (leg shield belakang + floor + side) pada lean group
  const leg = profileMesh([[0.36, 0.92], [0.26, 0.98], [0.2, 0.9], [0.17, 0.6], [0.14, 0.36], [0.2, 0.3], [0.3, 0.3], [0.32, 0.5], [0.34, 0.72]], 0.34, plastic, 0.01); lean.add(leg);
  for (const sx of [-1, 1]) { const wing = profileMesh([[0.56, 0.8], [0.4, 0.98], [0.22, 0.92], [0.18, 0.55], [0.24, 0.32], [0.4, 0.5]], 0.045, body, 0.006); wing.position.x = sx * 0.19; lean.add(wing); }
  leg.position.z = 0; leg.visible = true;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.5), plastic); floor.position.set(0, 0.26, 0.02); floor.castShadow = true; lean.add(floor);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.012, 0.05), accent); stripe.position.set(0, 0.285, 0.27); lean.add(stripe);
  for (const sx of [-1, 1]) { const pegs = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.01, 0.05), black); pegs.position.set(sx * 0.2, 0.31, -0.25); lean.add(pegs); }

  const mid = profileMesh([[-0.04, 0.3], [-0.05, 0.68], [-0.25, 0.76], [-0.55, 0.82], [-0.82, 0.96], [-0.93, 0.94], [-0.86, 0.7], [-0.62, 0.48], [-0.4, 0.33], [-0.2, 0.28]], 0.4, body, 0.01); lean.add(mid);
  const inset = profileMesh([[-0.14, 0.4], [-0.2, 0.6], [-0.5, 0.68], [-0.6, 0.55], [-0.45, 0.42]], 0.43, plastic, 0.004); lean.add(inset);
  const seat = profileMesh(smoothPoly([[-0.02, 0.77], [-0.16, 0.84], [-0.4, 0.86], [-0.62, 0.9], [-0.8, 0.98], [-0.62, 0.84], [-0.4, 0.8], [-0.18, 0.77]], 5), 0.3, seatMat, 0.02); lean.add(seat);
  const tail = profileMesh([[-0.8, 0.95], [-0.93, 1.0], [-0.99, 0.94], [-0.9, 0.78], [-0.76, 0.8]], 0.26, body, 0.008); lean.add(tail);
  const tl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.02), tailMat); tl.position.set(0, 0.97, -0.995); lean.add(tl);
  for (const sx of [-1, 1]) { const tk = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.025, 0.02), tailMat); tk.position.set(sx * 0.13, 0.9, -0.97); lean.add(tk); }
  const grabrail = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 8, 20, Math.PI), black); grabrail.rotation.set(0, 0, 0); grabrail.rotation.y = Math.PI / 2; grabrail.position.set(0, 0.9, -0.64); grabrail.scale.set(1, 1, 1); lean.add(grabrail);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.006), new THREE.MeshStandardMaterial({ color: 0xf5f5f0 })); plate.position.set(0, 0.66, -0.96); plate.rotation.x = 0.15; lean.add(plate);

  // mesin + CVT cover
  const eng = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.42), new THREE.MeshStandardMaterial({ color: 0x4b4e53, metalness: 0.7, roughness: 0.45 })); eng.position.set(0, 0.27, -0.22); lean.add(eng);
  const cvt = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 30), new THREE.MeshStandardMaterial({ color: 0x23262a, metalness: 0.5, roughness: 0.5 })); cvt.rotation.z = Math.PI / 2; cvt.position.set(0.17, 0.3, -0.25); cvt.scale.set(1, 1, 1.2); lean.add(cvt);
  const cvtCap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.01, 24), accent); cvtCap.rotation.z = Math.PI / 2; cvtCap.position.set(0.205, 0.3, -0.25); cvtCap.scale.set(1, 1, 1.2); lean.add(cvtCap);
  const sw = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.65), new THREE.MeshStandardMaterial({ color: 0x35373b, metalness: 0.7, roughness: 0.4 })); sw.position.set(-0.13, 0.28, -0.35); lean.add(sw);
  // shock belakang
  const shock = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.34, 10), new THREE.MeshStandardMaterial({ color: 0xff7a00, metalness: 0.4, roughness: 0.4 })); shock.position.set(0.17, 0.5, -0.6); shock.rotation.x = 0.42; lean.add(shock); const shock2 = shock.clone(); shock2.position.x = -0.17; lean.add(shock2);

  // knalpot (berubah sesuai part)
  const ex = PARTS.exhaust.options[setup.exhaust];
  const exMat = new THREE.MeshStandardMaterial({ color: ex.color, metalness: 0.9, roughness: ex.burnt ? 0.6 : 0.25 });
  const muff = new THREE.Mesh(new THREE.CylinderGeometry(ex.rad, ex.rad * 0.9, ex.len, 20), exMat); muff.rotation.x = Math.PI / 2 - 0.1; muff.position.set(-0.19, 0.25, -0.75 + (setup.exhaust === 'stock' ? 0.0 : 0.02)); lean.add(muff);
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(ex.rad * 0.72, ex.rad * 0.72, 0.02, 16), new THREE.MeshStandardMaterial({ color: ex.titan ? 0x6d4cc0 : 0x111111, metalness: 1, roughness: 0.3, emissive: ex.burnt ? 0x331100 : 0 })); tip.rotation.x = Math.PI / 2 - 0.1; tip.position.set(-0.19, 0.265 - 0.0, muff.position.z - ex.len / 2 - 0.01); lean.add(tip);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 10), exMat); pipe.rotation.x = Math.PI / 2; pipe.position.set(-0.19, 0.2, -0.3); lean.add(pipe);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.07, 0.3), setup.exhaust === 'stock' ? plastic : accent); guard.position.set(-0.26, 0.25, -0.65); lean.add(guard);
  root.userData.tip = tip;
  // filter udara opsional terlihat
  if (setup.air !== 'stock') { const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0xff3b00, metalness: 0.4, roughness: 0.5 })); cone.rotation.z = Math.PI / 2; cone.position.set(0.18, 0.43, -0.05); lean.add(cone); }

  // roda belakang & depan posisi
  const rwMount = new THREE.Group(); rwMount.position.set(0, WR, -WB); lean.add(rwMount); rwMount.add(rw);
  const fwPos = new THREE.Vector3(0, WR, WB);

  // taruh roda depan: kita hitung pivot fork supaya ujung fork berada di posisi (0,WR,WB)
  // steer (0,0.93,0.5), fork miring -0.45: titik ujung = steer + R(-0.45)*(0,-0.72,0)
  const tipLocal = new THREE.Vector3(0, -0.72, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), -0.45);
  // sesuaikan tinggi steer sehingga ujung fork persis ketinggian WR
  steer.position.y = WR - tipLocal.y; steer.position.z = WB - tipLocal.z;
  // ekor fork horizontal: tinggi stang
  const stemTop = 0; void stemTop;
  // gerakan suspensi sederhana
  root.userData.parts = { lean, fw, rw, rwMount };
  root.userData.rimsOffsetY = WR;
  // bayangan palsu tidak perlu; shadow via renderer
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return root;
}

export const BIKE_DIMS = { WB, WR };
