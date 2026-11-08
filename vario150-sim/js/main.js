import * as THREE from 'three';
import { COLORS, PARTS, SOUND_PRESETS, ECU_LIMITS, DEFAULT_SETUP, cloneSetup, engineModel, dynoCurve } from './config.js';
import { buildBike } from './bike.js';
import { buildWorld, TRACK_W } from './world.js';
import { newState, stepBike, simulateRun } from './physics.js';
import { EngineAudio } from './audio.js';

const $ = (id) => document.getElementById(id);
const KEY = 'vario150-setup-v1';
let setup = cloneSetup(DEFAULT_SETUP);
try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.ecu && s.sound) setup = { ...cloneSetup(DEFAULT_SETUP), ...s }; } catch (e) { /* abaikan */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(setup)); } catch (e) { /* abaikan */ } };

// ---------- Three.js ----------
const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1500);

// lingkungan garasi (studio)
const garageGroup = new THREE.Group(); scene.add(garageGroup);
const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 64), new THREE.MeshStandardMaterial({ color: 0x15191f, roughness: 0.35, metalness: 0.4 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; garageGroup.add(floor);
const ring = new THREE.Mesh(new THREE.RingGeometry(2.1, 2.16, 64), new THREE.MeshBasicMaterial({ color: 0xc8102e })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; garageGroup.add(ring);
const wall = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 6, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0x20262e, side: THREE.BackSide, roughness: 0.9 })); wall.position.y = 3; garageGroup.add(wall);
const neon = new THREE.Mesh(new THREE.TorusGeometry(8.9, 0.04, 8, 96), new THREE.MeshBasicMaterial({ color: 0xff2a48 })); neon.rotation.x = Math.PI / 2; neon.position.y = 4.4; garageGroup.add(neon);

const hemi = new THREE.HemisphereLight(0xcfe0ff, 0x444444, 1.2); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); scene.add(sun, sun.target);
const sc = sun.shadow.camera; sc.left = -4; sc.right = 4; sc.top = 4; sc.bottom = -4; sc.near = 1; sc.far = 40;
const rim1 = new THREE.PointLight(0xff3050, 40, 14); rim1.position.set(-4, 2.5, -3); garageGroup.add(rim1);
const rim2 = new THREE.PointLight(0x4090ff, 30, 14); rim2.position.set(4, 2, 3); garageGroup.add(rim2);

// dunia balap
const worldGroup = new THREE.Group(); scene.add(worldGroup); const world = buildWorld(worldGroup);
const skyColor = new THREE.Color(0x9cc6ee);

let bike = null, bikeHolder = new THREE.Group(); scene.add(bikeHolder);
function rebuildBike() {
  if (bike) { bikeHolder.remove(bike); bike.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
  bike = buildBike(setup); bikeHolder.add(bike);
  bike.userData.headlight.visible = mode === 'drive';
}

// ---------- state ----------
let mode = 'garage';
let eng = engineModel(setup);
const audio = new EngineAudio();
let audioStarted = false;
const orbit = { az: 0.9, el: 0.28, dist: 3.4, auto: true };
let ps = newState(world.start.pos.x, world.start.pos.z, world.start.heading, eng.idleRpm);
let garageRpm = eng.idleRpm, revHeld = false;
const keys = {}; const touch = { l: false, r: false, gas: false, brake: false };
let camMode = 0;

// ---------- UI garasi ----------
const TABS = [
  { id: 'engine', label: '⚙ Mesin', parts: ['disp', 'cam', 'tb', 'air'] },
  { id: 'exhaust', label: '💨 Knalpot & CVT', parts: ['exhaust', 'roller', 'spring'] },
  { id: 'ecu', label: '🖥 ECU' },
  { id: 'look', label: '🎨 Tampilan', parts: ['color', 'tire', 'weight'] },
];
let tab = 'engine';
$('tabs').innerHTML = TABS.map((t) => `<button data-t="${t.id}">${t.label}</button>`).join('');
$('tabs').onclick = (e) => { const b = e.target.closest('button'); if (b) { tab = b.dataset.t; renderPanel(); } };

function refreshAll(rebuild = false) {
  eng = engineModel(setup); save();
  if (rebuild) rebuildBike();
  renderStats();
}
function renderPanel() {
  [...$('tabs').children].forEach((b) => b.classList.toggle('on', b.dataset.t === tab));
  const p = $('panel'); const t = TABS.find((x) => x.id === tab); const scroll = p.scrollTop; let h = '';
  if (t.parts) for (const k of t.parts) {
    if (k === 'color') {
      h += `<div class="grp"><h3>Warna Bodi</h3><p>Varian warna Vario 150 LED New.</p><div class="sw">${Object.entries(COLORS).map(([id, c]) => `<button data-k="color" data-v="${id}" title="${c.name}" class="${setup.color === id ? 'sel' : ''}" style="background:#${c.body.toString(16).padStart(6, '0')}"></button>`).join('')}</div></div>`;
      continue;
    }
    const P = PARTS[k];
    h += `<div class="grp"><h3>${P.label}</h3><p>${P.hint}</p><div class="opts">${Object.entries(P.options).map(([id, o]) => `<button class="opt ${setup[k] === id ? 'sel' : ''}" data-k="${k}" data-v="${id}"><span>${o.name}</span><small>${optInfo(k, o)}</small></button>`).join('')}</div></div>`;
  }
  if (tab === 'ecu') h += ecuHtml();
  p.innerHTML = h; p.scrollTop = scroll;
}
function optInfo(k, o) {
  if (k === 'disp') return `${o.note} · ×${o.hp.toFixed(2)}`;
  if (k === 'exhaust') return o.hp > 1 ? `+${Math.round((o.hp - 1) * 100)}% tenaga` : 'standar';
  if (k === 'roller') return o.g === 10 ? 'standar' : o.g < 10 ? 'top end' : 'bawah';
  if (k === 'spring') return `gigit ${o.engage} rpm`;
  if (k === 'tire') return `grip ×${o.grip.toFixed(2)}`;
  if (k === 'cam' || k === 'tb' || k === 'air') return o.hp > 1 ? `+${Math.round((o.hp - 1) * 100)}%` : '';
  return '';
}
function slider(id, label, v, min, max, step, unit, group) {
  return `<div class="slider"><label>${label}<b id="v-${group}-${id}">${(+v).toFixed(step < 1 ? (step < 0.1 ? 2 : 1) : 0)}${unit}</b></label><input type="range" data-g="${group}" data-id="${id}" min="${min}" max="${max}" step="${step}" value="${v}"></div>`;
}
function ecuHtml() {
  const e = setup.ecu, m = eng; const L = ECU_LIMITS;
  let h = `<div class="grp"><h3>ECU Programmable</h3><p>Ubah peta ECU seperti piggyback / BRT / Racing ECU. Perubahan langsung terdengar & terasa.</p>`;
  h += slider('timing', 'Timing Pengapian (Advance)', e.timing, L.timing.min, L.timing.max, L.timing.step, L.timing.unit, 'ecu');
  const dt = e.timing - m.timingOpt;
  h += `<div class="note" id="timingNote">${timingNote(dt)}</div>`;
  h += slider('afr', 'Campuran Bahan Bakar (AFR)', e.afr, L.afr.min, L.afr.max, L.afr.step, L.afr.unit, 'ecu');
  h += `<div class="note" id="afrNote">${afrNote(e.afr)}</div>`;
  h += slider('idle', 'RPM Idle', e.idle, L.idle.min, L.idle.max, L.idle.step, L.idle.unit, 'ecu');
  h += slider('limit', 'Pembatas Putaran (Limiter)', e.limit, L.limit.min, L.limit.max, L.limit.step, L.limit.unit, 'ecu');
  h += `<div class="grp"><h3>Mode Suara ECU</h3><p>Tiap mode memakai satu rekaman saja dari idle sampai limiter (tidak digabung).</p><div class="opts"><button class="opt ${e.soundMode !== 2 ? 'sel' : ''}" data-mode="1"><span>Mode 1 — Rekaman Langsam 1</span><small>1 suara, idle → limit</small></button><button class="opt ${e.soundMode === 2 ? 'sel' : ''}" data-mode="2"><span>Mode 2 — Rekaman Langsam 2</span><small>1 suara, idle → limit</small></button></div></div>`;
  h += slider('volume', 'Volume Suara', e.volume ?? 1.2, 0.3, 2.5, 0.1, '×', 'ecu');
  h += '</div>';
  return h;
}
const timingNote = (d) => d > 7 ? '⚠ Timing terlalu maju: ngelitik (knocking), tenaga drop, mesin panas.' : d < -6 ? 'Timing terlalu mundur: tarikan loyo, panas di knalpot.' : Math.abs(d) <= 2 ? '✓ Mendekati timing optimal untuk konfigurasi ini.' : 'Mendekati batas — cek di dyno.';
const afrNote = (a) => a < 11.6 ? 'Terlalu kaya: boros, asap hitam, tenaga turun.' : a > 14 ? '⚠ Kurus: panas, tenaga turun, letupan di knalpot.' : a >= 12.4 && a <= 13.2 ? '✓ Campuran tenaga maksimal.' : 'Aman, sedikit di luar titik optimum.';
function soundHtml() {
  const s = setup.sound;
  let h = `<div class="grp"><h3>Karakter Suara Mesin (via ECU)</h3><p>Memakai rekaman asli sesuai <b>Mode Suara</b> yang dipilih di tab ECU, lalu diolah. Pilih preset atau atur sendiri — preset <b>Timing Kuda</b> membuat idle bergelombang seperti derap kuda.</p><div class="opts">`;
  h += Object.entries(SOUND_PRESETS).map(([id, o]) => `<button class="opt ${setup.soundPreset === id ? 'sel' : ''}" data-sp="${id}"><span>${o.name}</span></button>`).join('');
  h += '</div></div><div class="grp"><h3>Atur Manual</h3>';
  h += slider('pitch', 'Nada (pitch)', s.pitch, -6, 8, 0.5, ' st', 'sound');
  h += slider('bass', 'Bass / Brong', s.bass, -10, 12, 1, ' dB', 'sound');
  h += slider('rasp', 'Serak / Cempreng', s.rasp, 0, 1, 0.05, '', 'sound');
  h += slider('drive', 'Distorsi / Garang', s.drive, 0, 1, 0.05, '', 'sound');
  h += slider('res', 'Resonansi Knalpot', s.res, 250, 3500, 50, ' Hz', 'sound');
  h += slider('lumpy', 'Timing Kuda (idle bergelombang)', s.lumpy, 0, 1, 0.05, '', 'sound');
  h += slider('synth', 'Layer Sintetis (scream)', s.synth, 0, 1, 0.05, '', 'sound');
  h += slider('pop', 'Letupan Knalpot', s.pop, 0, 1, 0.05, '', 'sound');
  h += slider('runMix', 'Campuran Suara Jalan', s.runMix, 0, 1.5, 0.05, '', 'sound');
  h += slider('volume', 'Volume', s.volume, 0.3, 2.5, 0.05, '', 'sound');
  h += '</div><div class="note">Knalpot yang dipasang, filter udara, timing & AFR juga ikut mengubah suara. Tahan tombol <b>GAS</b> di kiri bawah untuk mengetes.</div>';
  return h;
}

$('panel').addEventListener('click', (e) => {
  const sp = e.target.closest('[data-sp]');
  if (sp) { const id = sp.dataset.sp; setup.soundPreset = id; if (id !== 'custom') setup.sound = { ...SOUND_PRESETS[id] }; refreshAll(); renderPanel(); startAudio(); return; }
  const md = e.target.closest('[data-mode]');
  if (md) { setup.ecu.soundMode = +md.dataset.mode; save(); renderPanel(); startAudio(); revPulse = 1.5; return; }
  const b = e.target.closest('[data-k]'); if (!b) return;
  setup[b.dataset.k] = b.dataset.v;
  if (b.dataset.k === 'roller' || b.dataset.k === 'spring') { /* tidak perlu rebuild */ }
  const rebuild = ['color', 'exhaust', 'tire', 'air', 'disp', 'weight'].includes(b.dataset.k);
  refreshAll(rebuild); renderPanel(); startAudio();
  if (b.dataset.k === 'exhaust') { revPulse = 1.2; }
});
$('panel').addEventListener('input', (e) => {
  const t = e.target;
    if (t.type !== 'range') return;
  const g = t.dataset.g, id = t.dataset.id, v = parseFloat(t.value);
  if (g === 'ecu') setup.ecu[id] = v; else { setup.sound[id] = v; setup.soundPreset = 'custom'; }
  const step = parseFloat(t.step); $(`v-${g}-${id}`).textContent = v.toFixed(step < 1 ? (step < 0.1 ? 2 : 1) : 0) + (g === 'ecu' ? (ECU_LIMITS[id] ? ECU_LIMITS[id].unit : '×') : ({ pitch: ' st', bass: ' dB', res: ' Hz' }[id] || ''));
  eng = engineModel(setup);
  if (g === 'ecu') { if ($('timingNote')) $('timingNote').textContent = timingNote(setup.ecu.timing - eng.timingOpt); if ($('afrNote')) $('afrNote').textContent = afrNote(setup.ecu.afr); }
  save(); renderStats(); startAudio();
  if (g === 'sound') { revPulse = Math.max(revPulse, 0.6); [...$('panel').querySelectorAll('.opt[data-sp]')].forEach((o) => o.classList.toggle('sel', o.dataset.sp === 'custom')); }
});

let statsTimer = 0;
function renderStats() {
  clearTimeout(statsTimer);
  statsTimer = setTimeout(() => {
    const sim = simulateRun(setup); const stock = engineModel(DEFAULT_SETUP);
    const peakNm = Math.max(...dynoCurve(setup).map((p) => p.nm));
    $('kpis').innerHTML = [
      ['Tenaga', eng.hpMax.toFixed(1), 'HP'], ['Torsi puncak', peakNm.toFixed(1), 'Nm'],
      ['Top speed', sim.top.toFixed(0), 'km/h'], ['0–100', sim.t100 ? sim.t100.toFixed(1) : '—', 's'],
    ].map(([a, b, c]) => `<div class="kpi"><small>${a}</small><b>${b}<i>${c}</i></b></div>`).join('');
    drawDyno(stock);
  }, 30);
}
function drawDyno() {
  const c = $('dyno'), g = c.getContext('2d'), W = c.width, H = c.height;
  g.clearRect(0, 0, W, H);
  const cur = dynoCurve(setup), base = dynoCurve(DEFAULT_SETUP);
  const maxHp = Math.max(18, ...cur.map((p) => p.hp)) * 1.1, maxNm = Math.max(20, ...cur.map((p) => p.nm)) * 1.1;
  const x = (r) => 34 + (r - 1500) / (13000 - 1500) * (W - 50);
  g.strokeStyle = '#1f262f'; g.fillStyle = '#6b7685'; g.font = '10px sans-serif';
  for (let r = 2000; r <= 13000; r += 2000) { g.beginPath(); g.moveTo(x(r), 8); g.lineTo(x(r), H - 20); g.stroke(); g.fillText(r / 1000 + 'k', x(r) - 6, H - 6); }
  const line = (arr, key, mx, col, dash) => { g.beginPath(); g.setLineDash(dash || []); g.strokeStyle = col; g.lineWidth = dash ? 1 : 2.2; arr.forEach((p, i) => { const y = H - 22 - (p[key] / mx) * (H - 34); i ? g.lineTo(x(p.rpm), y) : g.moveTo(x(p.rpm), y); }); g.stroke(); g.setLineDash([]); };
  line(base, 'hp', maxHp, '#ff5a5a66', [4, 4]); line(base, 'nm', maxNm, '#5ab4ff66', [4, 4]);
  line(cur, 'hp', maxHp, '#ff5a5a'); line(cur, 'nm', maxNm, '#5ab4ff');
  g.fillStyle = '#ff9a9a'; g.fillText(maxHp.toFixed(0) + ' HP', 2, 14); g.fillStyle = '#9ad0ff'; g.fillText(maxNm.toFixed(0) + ' Nm', 2, 28);
  g.strokeStyle = '#ffcf5c'; g.setLineDash([2, 3]); g.beginPath(); g.moveTo(x(setup.ecu.limit), 8); g.lineTo(x(setup.ecu.limit), H - 20); g.stroke(); g.setLineDash([]);
}

// ---------- audio start ----------
async function startAudio() {
  if (audioStarted) { audio.resume(); return; }
  audioStarted = true;
  try { await audio.init(); audio.resume(); } catch (e) { console.warn('audio gagal', e); audioStarted = false; }
}
let muted = false;
$('btnMute').onclick = () => { muted = !muted; audio.setMuted(muted); $('btnMute').textContent = muted ? '🔇' : '🔊'; startAudio(); };
['pointerdown', 'keydown', 'touchstart'].forEach((ev) => addEventListener(ev, () => startAudio(), { once: true, passive: true }));

// ---------- mode ----------
function setMode(m) {
  mode = m; const drive = m === 'drive';
  $('garage').classList.toggle('hidden', drive); $('stats').classList.toggle('hidden', drive); $('revbox').classList.toggle('hidden', drive);
  $('hud').classList.toggle('hidden', !drive); garageGroup.visible = !drive; worldGroup.visible = drive;
  $('btnGarage').classList.toggle('on', !drive); $('btnDrive').classList.toggle('on', drive);
  scene.background = drive ? skyColor : new THREE.Color(0x0b0d10); scene.fog = drive ? new THREE.Fog(0x9cc6ee, 120, 700) : null;
  hemi.intensity = drive ? 1.0 : 1.2; sun.intensity = drive ? 2.6 : 2.2;
  if (bike) bike.userData.headlight.visible = drive;
  if (drive) resetRide(); else { bikeHolder.position.set(0, 0, 0); bikeHolder.rotation.set(0, 0, 0); if (bike) { bike.userData.lean.rotation.set(0, 0, 0); bike.userData.steer.rotation.y = 0; } garageRpm = eng.idleRpm; }
  onResize();
}
function setWorldVisible() { /* world: object ringkas */ }
worldGroup.visible = false;
$('btnGarage').onclick = () => setMode('garage'); $('btnDrive').onclick = () => { setMode('drive'); startAudio(); }; $('btnGo').onclick = $('btnDrive').onclick;
$('btnReset').onclick = () => { setup = cloneSetup(DEFAULT_SETUP); refreshAll(true); renderPanel(); };

// ---------- balap ----------
const lap = { n: 1, t: 0, best: (() => { try { return +localStorage.getItem('vario150-best') || 0; } catch (e) { return 0; } })(), last: 0, maxI: 0, prevI: 0, started: false };
const t100 = { t: 0, running: false, done: null };
function resetRide() {
  ps = newState(world.start.pos.x + world.norm[0].x * 2, world.start.pos.z + world.norm[0].z * 2, world.start.heading, eng.idleRpm);
  lap.n = 1; lap.t = 0; lap.maxI = 0; lap.prevI = 0; lap.started = false; t100.t = 0; t100.running = false; t100.done = null; $('t100').textContent = '--'; $('flash').textContent = '';
  say('SIAP! Tekan GAS (W)', 1800);
}
let msgT = 0; function say(t, ms = 1500) { const m = $('msg'); m.textContent = t; m.style.opacity = 1; clearTimeout(msgT); msgT = setTimeout(() => (m.style.opacity = 0), ms); }
const fmt = (t) => { const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s.toFixed(1).padStart(4, '0')}`; };
$('tBest').textContent = lap.best ? fmt(lap.best) : '--';

addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Space') e.preventDefault();
  if (mode === 'drive') { if (e.code === 'KeyC') camMode = (camMode + 1) % 3; if (e.code === 'KeyR') resetRide(); if (e.code === 'KeyG') setMode('garage'); }
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
function bindHold(id, k) { const el = $(id); const on = (e) => { e.preventDefault(); touch[k] = true; }; const off = (e) => { e.preventDefault(); touch[k] = false; }; el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointerleave', off); el.addEventListener('pointercancel', off); }
bindHold('tL', 'l'); bindHold('tR', 'r'); bindHold('tGas', 'gas'); bindHold('tBrake', 'brake');
const rb = $('revBtn'); const revOn = (e) => { e.preventDefault(); revHeld = true; rb.classList.add('act'); startAudio(); }; const revOff = () => { revHeld = false; rb.classList.remove('act'); };
rb.addEventListener('pointerdown', revOn); rb.addEventListener('pointerup', revOff); rb.addEventListener('pointerleave', revOff); rb.addEventListener('pointercancel', revOff);

// orbit kamera garasi
let drag = null;
$('gl').addEventListener('pointerdown', (e) => { if (mode !== 'garage') return; drag = { x: e.clientX, y: e.clientY }; orbit.auto = false; });
addEventListener('pointermove', (e) => { if (!drag) return; orbit.az -= (e.clientX - drag.x) * 0.006; orbit.el = Math.max(0.03, Math.min(1.3, orbit.el + (e.clientY - drag.y) * 0.004)); drag = { x: e.clientX, y: e.clientY }; });
addEventListener('pointerup', () => { drag = null; });
$('gl').addEventListener('wheel', (e) => { if (mode === 'garage') { orbit.dist = Math.max(1.8, Math.min(7, orbit.dist + e.deltaY * 0.003)); e.preventDefault(); } }, { passive: false });

let revPulse = 0;

function onResize() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', onResize);

// ---------- loop ----------
const clock = new THREE.Clock(); const camPos = new THREE.Vector3(); let camInit = false; let uiAcc = 0;
function frame() {
  const dt = Math.min(0.05, clock.getDelta());
  if (mode === 'garage') updateGarage(dt); else updateDrive(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function updateGarage(dt) {
  const rev = revHeld || keys.Space || revPulse > 0; revPulse = Math.max(0, revPulse - dt);
  const thr = rev ? 1 : 0;
  const tgt = rev ? Math.min(setup.ecu.limit + 50, 10000) : eng.idleRpm;
  garageRpm += (tgt - garageRpm) * Math.min(1, dt * (rev ? 3.2 : 2.2));
  if (rev && garageRpm > setup.ecu.limit) garageRpm = setup.ecu.limit;
  const lim = rev && garageRpm >= setup.ecu.limit - 5;
  audio.update(dt, { rpm: garageRpm, throttle: thr, setup, eng });
  if (orbit.auto) orbit.az += dt * 0.25;
  const target = new THREE.Vector3(0, 0.5, 0);
  camera.position.set(Math.sin(orbit.az) * Math.cos(orbit.el) * orbit.dist, 0.4 + Math.sin(orbit.el) * orbit.dist, Math.cos(orbit.az) * Math.cos(orbit.el) * orbit.dist);
  // geser sedikit ke kiri supaya motor tidak tertutup panel
  if (innerWidth > 820) { camera.position.x += Math.cos(orbit.az) * 0.0; target.x -= 0; }
  camera.lookAt(target); camera.fov = 42; camera.updateProjectionMatrix();
  camera.setViewOffset(innerWidth, innerHeight, innerWidth > 820 ? 150 : 0, innerWidth > 820 ? 0 : 130, innerWidth, innerHeight);
  sun.position.set(4, 8, 3); sun.target.position.set(0, 0, 0);
  // getaran mesin
  if (bike) { const sh = (garageRpm / 9000) * 0.003; bikeHolder.position.y = (Math.random() - 0.5) * sh; bike.userData.lean.rotation.z = (Math.random() - 0.5) * sh * 2; bike.userData.frontWheel.userData.spin.rotation.x += 0; }
  if (!audioStarted) camera.clearViewOffset && void 0;
}

function updateDrive(dt) {
  camera.clearViewOffset();
  const inp = {
    thr: (keys.KeyW || keys.ArrowUp || touch.gas) ? 1 : 0,
    brake: (keys.KeyS || keys.ArrowDown || keys.Space || touch.brake) ? 1 : 0,
    steer: ((keys.KeyA || keys.ArrowLeft || touch.l) ? 1 : 0) - ((keys.KeyD || keys.ArrowRight || touch.r) ? 1 : 0),
  };
  // kecil: sub-step untuk stabilitas
  const steps = Math.ceil(dt / 0.01); const h = dt / steps;
  const nr = world.nearest(ps.x, ps.z, lap.prevI);
  const half = TRACK_W / 2;
  const onRoad = nr.dist <= half + 0.4;
  const surface = onRoad ? { grip: 1, drag: 0 } : { grip: 0.55, drag: 3.2 };
  for (let i = 0; i < steps; i++) stepBike(ps, inp, eng, setup, h, surface);
  // pagar pembatas
  if (nr.dist > half + 3.6) {
    const over = nr.dist - (half + 3.6); const sgn = Math.sign(nr.side); ps.x -= world.norm[nr.i].x * sgn * over; ps.z -= world.norm[nr.i].z * sgn * over; if (ps.v > 3) { say('TABRAK!', 600); } ps.v *= 0.35;
  }
  // lap & waktu
  const I = nr.i;
  if (ps.v > 0.5 || lap.started) { lap.started = true; lap.t += dt; }
  if (lap.prevI > world.n * 0.85 && I < world.n * 0.15 && lap.maxI > world.n * 0.6) {
    lap.last = lap.t; if (!lap.best || lap.t < lap.best) { lap.best = lap.t; try { localStorage.setItem('vario150-best', lap.t); } catch (e) { /* abaikan */ } $('flash').textContent = 'REKOR BARU!'; } else $('flash').textContent = 'Lap ' + fmt(lap.t);
    $('tBest').textContent = fmt(lap.best); lap.n++; lap.t = 0; lap.maxI = 0; setTimeout(() => ($('flash').textContent = ''), 3500);
  }
  if (I > lap.maxI && I - lap.prevI < 60) lap.maxI = I; lap.prevI = I;
  // 0-100
  const kmh = ps.v * 3.6;
  if (!t100.running && t100.done == null && ps.v > 0.3 && kmh < 8) { t100.running = true; t100.t = 0; }
  if (t100.running) { t100.t += dt; if (kmh >= 100) { t100.done = t100.t; t100.running = false; $('t100').textContent = t100.t.toFixed(1) + 's'; say('0–100 km/h: ' + t100.t.toFixed(1) + ' dtk', 2200); } else $('t100').textContent = t100.t.toFixed(1) + 's'; }
  if (kmh < 3 && t100.done != null) { t100.done = null; }

  // visual motor
  bikeHolder.position.set(ps.x, 0, ps.z); bikeHolder.rotation.y = ps.heading;
  const U = bike.userData; U.lean.rotation.z = -Math.max(-0.75, Math.min(0.75, ps.lean)); U.lean.rotation.x = ps.pitch;
  U.steer.rotation.y = ps.steerAngle || 0;
  const spin = ps.v * dt / 0.265; U.frontWheel.userData.spin.rotation.x += spin; U.rearWheel.userData.spin.rotation.x += spin * (ps.thr > 0.8 && ps.v < 6 ? 1.6 : 1);
  const vib = (ps.rpm / 9000) * 0.0025 * (0.5 + 0.5 * ps.thr); U.lean.position.y = (Math.random() - 0.5) * vib;
  sun.position.set(ps.x + 40, 80, ps.z + 25); sun.target.position.set(ps.x, 0, ps.z);
  sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.far = 220; sc.updateProjectionMatrix();

  // kamera
  const fwd = new THREE.Vector3(Math.sin(ps.heading), 0, Math.cos(ps.heading));
  const side = new THREE.Vector3(fwd.z, 0, -fwd.x);
  let wantPos, look;
  if (camMode === 0) { wantPos = new THREE.Vector3(ps.x, 1.55 + ps.v * 0.004, ps.z).addScaledVector(fwd, -3.6 - ps.v * 0.03); look = new THREE.Vector3(ps.x, 0.95, ps.z).addScaledVector(fwd, 4); }
  else if (camMode === 1) { wantPos = new THREE.Vector3(ps.x, 3.2, ps.z).addScaledVector(fwd, -7.5).addScaledVector(side, 1.2); look = new THREE.Vector3(ps.x, 0.8, ps.z).addScaledVector(fwd, 3); }
  else { wantPos = new THREE.Vector3(ps.x, 1.28, ps.z).addScaledVector(fwd, -0.18); look = new THREE.Vector3(ps.x, 1.05, ps.z).addScaledVector(fwd, 8); bike.visible = false; }
  if (camMode !== 2) bike.visible = true;
  if (!camInit) { camPos.copy(wantPos); camInit = true; }
  camPos.lerp(wantPos, camMode === 2 ? 1 : 1 - Math.exp(-dt * 7)); camera.position.copy(camPos);
  if (camMode === 2) camera.up.set(Math.sin(-U.lean.rotation.z * 0.3) * 0, 1, 0);
  camera.lookAt(look); camera.fov = 52 + Math.min(18, ps.v * 0.35); camera.updateProjectionMatrix();

  // suara
  audio.update(dt, { rpm: ps.rpm, throttle: inp.thr ? 1 : ps.thr, setup, eng });
  // HUD
  uiAcc += dt; if (uiAcc > 0.03) { uiAcc = 0; $('spd').textContent = Math.round(kmh); $('rpmTxt').textContent = `${Math.round(ps.rpm / 10) * 10} rpm · CVT ${(ps.G / (9 * 0.88 * 1)).toFixed(2)}:1`; $('lap').textContent = lap.n; $('tLap').textContent = fmt(lap.t); drawTach(ps.rpm, setup.ecu.limit, ps.limiter); }
}

function drawTach(rpm, limit, lim) {
  const c = $('tach'), g = c.getContext('2d'), W = c.width, cx = W / 2, cy = W / 2, R = W / 2 - 14; g.clearRect(0, 0, W, W);
  g.fillStyle = '#0a0c10cc'; g.beginPath(); g.arc(cx, cy, R + 8, 0, 7); g.fill();
  const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, max = 14000;
  const ang = (v) => a0 + (a1 - a0) * Math.min(1, v / max);
  g.lineWidth = 12; g.strokeStyle = '#1f262f'; g.beginPath(); g.arc(cx, cy, R - 6, a0, a1); g.stroke();
  g.strokeStyle = lim ? '#ff2a48' : (rpm > limit * 0.88 ? '#ff7a00' : '#37c2ff'); g.beginPath(); g.arc(cx, cy, R - 6, a0, ang(rpm)); g.stroke();
  g.strokeStyle = '#ff2a48'; g.lineWidth = 12; g.beginPath(); g.arc(cx, cy, R - 6, ang(limit), a1); g.globalAlpha = 0.35; g.stroke(); g.globalAlpha = 1;
  g.fillStyle = '#9aa5b4'; g.font = '16px sans-serif'; g.textAlign = 'center';
  for (let v = 0; v <= 14; v += 2) { const a = ang(v * 1000); g.fillText(v, cx + Math.cos(a) * (R - 36), cy + Math.sin(a) * (R - 36) + 5); }
  const a = ang(rpm); g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * (R - 50), cy + Math.sin(a) * (R - 50)); g.stroke();
  g.fillStyle = '#c8102e'; g.beginPath(); g.arc(cx, cy, 7, 0, 7); g.fill(); g.fillStyle = '#6b7685'; g.font = '12px sans-serif'; g.fillText('x1000 RPM', cx, cy + 40);
}

// ---------- boot ----------
rebuildBike(); refreshAll(); renderPanel(); onResize(); setMode('garage');
window.__game = { scene, orbit, rebuild: rebuildBike, get setup() { return setup; }, setMode, audio, get ps() { return ps; }, world };
setTimeout(() => { $('loading').style.opacity = 0; setTimeout(() => $('loading').remove(), 600); }, 400);
requestAnimationFrame(frame);
