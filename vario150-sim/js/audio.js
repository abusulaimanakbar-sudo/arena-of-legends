// Mesin suara berlapis dari rekaman asli: idle → langsam → gas dikit → jalan → tengah → atas
// Tiap lapisan diputar dengan pitch = rpm / rpm-dasar, lalu di-crossfade (equal-power) menurut RPM sehingga mulus.
import { PARTS } from './config.js';

// base = rpm perkiraan saat rekaman dibuat (pitch normal), c = titik tengah lapisan pada skala rpm
const LAYERS = [
  { id: 'idle', url: 'assets/idle.mp3', base: 1100, c: 1100 },
  { id: 'langsam', url: 'assets/lang1.mp3', base: 1500, c: 1900 },
  { id: 'dikit', url: 'assets/lang2.mp3', base: 3200, c: 3200 },
  { id: 'jalan', url: 'assets/run.mp3', base: 5600, c: 5000 },
  { id: 'tengah', url: 'assets/mid.mp3', base: 6600, c: 7000 },
  { id: 'atas', url: 'assets/high.mp3', base: 11000, c: 9800 },
];
const LUMPY_PATTERN = [0, 0.7, 0.15, 0.9, 0.05, 0.55, 0.3, 0.85]; // pola "kuda berlari"

function smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function curve(k) { const n = 512, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = k < 0.01 ? x : Math.tanh(x * (1 + k * 9)) / Math.tanh(1 + k * 9); } return c; }

// bobot lapisan menurut rpm (segitiga pada skala log, jumlah daya = 1)
export function layerWeights(rpm) {
  const w = new Array(LAYERS.length).fill(0); const n = LAYERS.length;
  if (rpm <= LAYERS[0].c) { w[0] = 1; return w; }
  if (rpm >= LAYERS[n - 1].c) { w[n - 1] = 1; return w; }
  for (let i = 0; i < n - 1; i++) {
    const a = LAYERS[i].c, b = LAYERS[i + 1].c;
    if (rpm >= a && rpm <= b) { const f = Math.log(rpm / a) / Math.log(b / a); w[i] = Math.cos(f * Math.PI / 2); w[i + 1] = Math.sin(f * Math.PI / 2); break; }
  }
  return w;
}

export class EngineAudio {
  constructor() { this.ctx = null; this.ready = false; this.loading = null; this.step = 0; this.stepT = 0; this.limiterPhase = 0; this.popCool = 0; this.muted = false; this.lastDrive = -1; this.layers = []; }

  async init() {
    if (this.loading) return this.loading;
    this.loading = (async () => {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = this.ctx = new AC();
      const load = async (u) => ctx.decodeAudioData(await (await fetch(u)).arrayBuffer());
      const bufs = await Promise.all(LAYERS.map((l) => load(l.url)));
      const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const nd = nb.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1; this.noiseBuf = nb;

      this.master = ctx.createGain(); this.master.gain.value = 1.7;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -9; comp.ratio.value = 6; comp.knee.value = 6;
      this.master.connect(comp); comp.connect(ctx.destination);

      this.bus = ctx.createGain();
      this.lowshelf = ctx.createBiquadFilter(); this.lowshelf.type = 'lowshelf'; this.lowshelf.frequency.value = 200;
      this.peak = ctx.createBiquadFilter(); this.peak.type = 'peaking'; this.peak.Q.value = 1; this.peak.gain.value = 5;
      this.rasp = ctx.createBiquadFilter(); this.rasp.type = 'highshelf'; this.rasp.frequency.value = 2800;
      this.shaper = ctx.createWaveShaper(); this.shaper.oversample = '2x';
      this.lp = ctx.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 9000;
      this.out = ctx.createGain();
      this.bus.connect(this.lowshelf).connect(this.peak).connect(this.rasp).connect(this.shaper).connect(this.lp).connect(this.out).connect(this.master);

      this.layers = LAYERS.map((l, i) => { const s = ctx.createBufferSource(); s.buffer = bufs[i]; s.loop = true; const g = ctx.createGain(); g.gain.value = 0; s.connect(g).connect(this.bus); s.start(0, Math.random() * 2); return { ...l, s, g }; });

      // layer sintetis (pulsa 4-tak)
      this.o1 = ctx.createOscillator(); this.o1.type = 'sawtooth'; this.o2 = ctx.createOscillator(); this.o2.type = 'square';
      this.synthG = ctx.createGain(); this.synthG.gain.value = 0;
      const sf = ctx.createBiquadFilter(); sf.type = 'lowpass'; sf.frequency.value = 2400; this.sf = sf;
      this.o1.connect(sf); this.o2.connect(sf); sf.connect(this.synthG).connect(this.bus); this.o1.start(); this.o2.start();
      // angin
      this.wind = ctx.createBufferSource(); this.wind.buffer = nb; this.wind.loop = true;
      const wf = ctx.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 700; wf.Q.value = 0.5; this.windF = wf;
      this.windG = ctx.createGain(); this.windG.gain.value = 0; this.wind.connect(wf).connect(this.windG).connect(this.master); this.wind.start();
      this.ready = true;
    })();
    return this.loading;
  }

  resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume(); }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 1.7, this.ctx.currentTime, 0.05); }

  pop(strength = 1) {
    const ctx = this.ctx, t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 350 + Math.random() * 900; bp.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.55 * strength, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05 + Math.random() * 0.06);
    s.connect(bp).connect(g).connect(this.master); s.start(t, Math.random()); s.stop(t + 0.2);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.08);
    const og = ctx.createGain(); og.gain.setValueAtTime(0.4 * strength, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(og).connect(this.master); o.start(t); o.stop(t + 0.12);
  }

  // st: {rpm, throttle, speed(m/s), setup, eng(engineModel), limiter(bool), garage(bool)}
  update(dt, st) {
    if (!this.ready) return;
    const t = this.ctx.currentTime, setup = st.setup, e = st.eng;
    const sp = setup.sound; const ex = PARTS.exhaust.options[setup.exhaust];
    const rpm = Math.max(500, st.rpm), thr = st.throttle;

    const pitchSt = sp.pitch + (setup.exhaust === 'brong' ? -0.5 : 0);
    const drive = Math.min(1, sp.drive + ex.drive * 0.5 + e.intake * 0.1);
    const rasp = Math.min(1, sp.rasp + ex.rasp * 0.5);
    const lumpy = Math.min(1, sp.lumpy + e.lumpy * 0.6);
    const pitchMul = Math.pow(2, pitchSt / 12);

    if (Math.abs(drive - this.lastDrive) > 0.005) { this.shaper.curve = curve(drive); this.lastDrive = drive; }
    this.lowshelf.gain.setTargetAtTime(sp.bass + ex.bass * 0.6, t, 0.05);
    this.peak.frequency.setTargetAtTime(Math.max(200, sp.res * (0.8 + rpm / 20000)), t, 0.05);
    this.peak.Q.value = ex.resQ; this.peak.gain.setTargetAtTime(4 + rasp * 8, t, 0.05);
    this.rasp.gain.setTargetAtTime(-6 + rasp * 14, t, 0.05);
    this.lp.frequency.setTargetAtTime(Math.min(16000, ex.lp + e.intake * 1500 + 3000), t, 0.05);

    // pola timing kuda
    this.stepT += dt * rpm / 120;
    while (this.stepT >= 1) { this.stepT -= 1; this.step = (this.step + 1) % LUMPY_PATTERN.length; }
    const lp = LUMPY_PATTERN[this.step];
    const fade = 1 - smooth(3000, 6500, rpm) * 0.8;
    const lumpGain = 1 - lumpy * lp * 0.85 * fade;
    const lumpRate = 1 + lumpy * (lp - 0.5) * 0.14 * fade;

    let cut = 1;
    if (st.limiter) { this.limiterPhase += dt * 17; cut = (Math.floor(this.limiterPhase) % 2) ? 0.15 : 1; if (Math.random() < dt * 18) this.pop(0.5); }

    // lapisan: bobot dari rpm, level dari bukaan gas (gas pas = suara pas)
    const vol = sp.volume * ex.gain;
    const load = 0.55 + 0.45 * thr;                      // gas dilepas → lebih pelan
    const w = layerWeights(rpm);
    this.layers.forEach((L, i) => {
      const rate = Math.min(2.6, Math.max(0.5, rpm / L.base)) * pitchMul * lumpRate;
      L.s.playbackRate.setTargetAtTime(rate, t, 0.03);
      const mix = (L.id === 'jalan' || L.id === 'dikit' ? (sp.runMix ?? 1) : 1);
      L.g.gain.setTargetAtTime(w[i] * vol * load * lumpGain * cut * mix * 0.9, t, 0.03);
    });

    // layer sintetis
    const fire = rpm / 120 * pitchMul * lumpRate;
    this.o1.frequency.setTargetAtTime(Math.max(20, fire * 2), t, 0.02); this.o2.frequency.setTargetAtTime(Math.max(20, fire), t, 0.02);
    this.sf.frequency.setTargetAtTime(500 + rpm * 0.45, t, 0.05);
    this.synthG.gain.setTargetAtTime(sp.synth * 0.22 * (0.35 + 0.65 * thr) * vol * lumpGain * cut, t, 0.03);

    // pop knalpot
    this.popCool -= dt;
    const popLevel = Math.min(1, sp.pop + ex.pop * 0.5 + (setup.ecu.afr > 13.6 ? 0.25 : 0) - (setup.ecu.afr < 11.8 ? 0.3 : 0));
    if (setup.ecu.pops && popLevel > 0.05 && thr < 0.05 && rpm > 3800 && this.popCool <= 0 && !st.garage) {
      if (Math.random() < dt * 14 * popLevel) { this.pop(0.4 + popLevel * 0.8); this.popCool = 0.04 + Math.random() * 0.12; }
    }
    if (e.knock > 0 && thr > 0.7 && Math.random() < dt * 25 * e.knock) this.pop(0.18);

    const spd = st.speed || 0;
    this.windG.gain.setTargetAtTime(Math.min(0.5, spd / 55) * 0.35 * (st.garage ? 0 : 1), t, 0.1);
    this.windF.frequency.setTargetAtTime(400 + spd * 28, t, 0.1);
  }

  stopAll() { if (this.ready) { this.layers.forEach((L) => (L.g.gain.value = 0)); this.synthG.gain.value = 0; this.windG.gain.value = 0; } }
}
