// Mesin suara: tiap mode = SATU rekaman saja (tidak digabung). Nada naik halus dari idle sampai limiter.
const LAYERS = [
  { id: 'mode1', mode: 1, url: 'assets/mode1.mp3' }, // rekaman langsam 1
  { id: 'mode2', mode: 2, url: 'assets/mode2.mp3' }, // rekaman langsam 2
];
// rate pemutaran pada idle dan pada limiter (pemetaan linear sepanjang rentang gas)
const RATE_IDLE = 1.0, RATE_LIMIT = 4.2;

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

  // st: {rpm, throttle, setup}. Hanya rekaman mode terpilih; nada mengikuti rpm (idle → limit), level mengikuti gas.
  update(dt, st) {
    if (!this.ready) return;
    const t = this.ctx.currentTime, setup = st.setup;
    const idle = st.eng.idleRpm, limit = setup.ecu.limit;
    const f = Math.min(1.05, Math.max(0, (st.rpm - idle) / Math.max(1, limit - idle)));
    // nada mengikuti RPM *dan* kecepatan: makin cepat motor, makin tinggi suaranya (CVT menahan RPM, jadi kecepatan ikut dihitung)
    const v = st.speed || 0;
    const sF = Math.min(1.2, v / 24);
    const sEff = Math.max(sF, f * (1 - Math.min(1, v / 6))); // diam/gas di tempat: ikut rpm
    const pitchF = Math.pow(0.2 * f + 0.8 * sEff, 0.85); // naik cepat di awal, terus naik sampai ngebut
    const rate = RATE_IDLE + (RATE_LIMIT - RATE_IDLE) * pitchF;
    const vol = setup.ecu.volume ?? 1.2;
    const mode = setup.ecu.soundMode === 2 ? 2 : 1;
    const load = 0.8 + 0.2 * st.throttle;
    this.layers.forEach((L) => {
      L.s.playbackRate.setTargetAtTime(rate, t, 0.05);
      L.g.gain.setTargetAtTime(L.mode === mode ? vol * load * (0.55 + 0.75 * pitchF) : 0, t, 0.06);
    });
  }

  stopAll() { if (this.ready) this.layers.forEach((L) => (L.g.gain.value = 0)); }
}
