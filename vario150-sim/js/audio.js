// Mesin suara berlapis dari rekaman asli: idle → langsam → gas dikit → jalan → tengah → atas
// Tiap lapisan diputar dengan pitch = rpm / rpm-dasar, lalu di-crossfade (equal-power) menurut RPM sehingga mulus.

// base = rpm perkiraan saat rekaman dibuat (pitch normal), c = titik tengah lapisan pada skala rpm
const LAYERS = [
  // Mode 1: rekaman awal (idle + saat jalan)
  { id: 'idle', mode: 1, url: 'assets/idle.mp3', base: 1100, c: 1100 },
  { id: 'jalan', mode: 1, url: 'assets/run.mp3', base: 5600, c: 5000 },
  // Mode 2: rekaman langsam → gas dikit → tengah → atas
  { id: 'langsam', mode: 2, url: 'assets/lang1.mp3', base: 1500, c: 1500 },
  { id: 'dikit', mode: 2, url: 'assets/lang2.mp3', base: 3200, c: 3200 },
  { id: 'tengah', mode: 2, url: 'assets/mid.mp3', base: 6600, c: 7000 },
  { id: 'atas', mode: 2, url: 'assets/high.mp3', base: 11000, c: 9800 },
];


// bobot lapisan menurut rpm (segitiga pada skala log, jumlah daya = 1)
export function layerWeights(rpm, mode = 1) {
  const w = new Array(LAYERS.length).fill(0);
  const idx = LAYERS.map((l, i) => (l.mode === mode ? i : -1)).filter((i) => i >= 0);
  const n = idx.length; const C = (k) => LAYERS[idx[k]].c;
  if (rpm <= C(0)) { w[idx[0]] = 1; return w; }
  if (rpm >= C(n - 1)) { w[idx[n - 1]] = 1; return w; }
  for (let k = 0; k < n - 1; k++) {
    const a = C(k), b = C(k + 1);
    if (rpm >= a && rpm <= b) { const f = Math.log(rpm / a) / Math.log(b / a); w[idx[k]] = Math.cos(f * Math.PI / 2); w[idx[k + 1]] = Math.sin(f * Math.PI / 2); break; }
  }
  return w;
}

export class EngineAudio {
  constructor() { this.ctx = null; this.ready = false; this.loading = null; this.muted = false; this.layers = []; }

  async init() {
    if (this.loading) return this.loading;
    this.loading = (async () => {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = this.ctx = new AC();
      const load = async (u) => ctx.decodeAudioData(await (await fetch(u)).arrayBuffer());
      const bufs = await Promise.all(LAYERS.map((l) => load(l.url)));
      this.master = ctx.createGain(); this.master.gain.value = 1.0;
      const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.003; lim.release.value = 0.1; // pengaman agar tidak pecah
      this.master.connect(lim); lim.connect(ctx.destination);
      this.layers = LAYERS.map((l, i) => { const s = ctx.createBufferSource(); s.buffer = bufs[i]; s.loop = true; const g = ctx.createGain(); g.gain.value = 0; s.connect(g).connect(this.master); s.start(0, Math.random() * 2); return { ...l, s, g }; });
      this.ready = true;
    })();
    return this.loading;
  }

  resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume(); }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 1.0, this.ctx.currentTime, 0.05); }

  // st: {rpm, throttle, setup}. Hanya rekaman milik mode terpilih; nada mengikuti rpm, level mengikuti gas.
  update(dt, st) {
    if (!this.ready) return;
    const t = this.ctx.currentTime, setup = st.setup;
    const rpm = Math.max(500, st.rpm), thr = st.throttle;
    const vol = setup.ecu.volume ?? 1.2;
    const mode = setup.ecu.soundMode === 2 ? 2 : 1;
    const w = layerWeights(rpm, mode);
    const load = 0.75 + 0.25 * thr;
    this.layers.forEach((L, i) => {
      L.s.playbackRate.setTargetAtTime(Math.min(2.6, Math.max(0.5, rpm / L.base)), t, 0.04);
      L.g.gain.setTargetAtTime(w[i] * vol * load * 0.7, t, 0.04);
    });
  }

  stopAll() { if (this.ready) this.layers.forEach((L) => (L.g.gain.value = 0)); }
}
