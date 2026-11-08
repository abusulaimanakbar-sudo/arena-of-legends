// Musik latar lo-fi (sintetis) + efek suara. Semua dibuat dengan WebAudio, tanpa file.
export class GameAudio {
  constructor() { this.ctx = null; this.musicOn = true; this.sfxOn = true; this.step = 0; this.next = 0; this.timer = null; this.blipT = 0; }

  init() {
    if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = 0.9;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4;
    this.master.connect(comp); comp.connect(c.destination);
    this.music = c.createGain(); this.music.gain.value = this.musicOn ? 0.55 : 0;
    this.sfx = c.createGain(); this.sfx.gain.value = this.sfxOn ? 0.9 : 0;
    // reverb sederhana (delay berumpan balik)
    const dl = c.createDelay(1); dl.delayTime.value = 0.28; const fb = c.createGain(); fb.gain.value = 0.32; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    dl.connect(lp); lp.connect(fb); fb.connect(dl); this.music.connect(this.master); const send = c.createGain(); send.gain.value = 0.35; this.music.connect(send); send.connect(dl); lp.connect(this.master);
    this.sfx.connect(this.master);
    const nb = c.createBuffer(1, c.sampleRate, c.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; this.noise = nb;
    this.next = c.currentTime + 0.1; this.step = 0;
    this.timer = setInterval(() => this.schedule(), 40);
  }
  resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume(); }
  setMusic(on) { this.musicOn = on; if (this.music) this.music.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, 0.1); }
  setSfx(on) { this.sfxOn = on; if (this.sfx) this.sfx.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.05); }

  // ---------- musik ----------
  schedule() {
    const c = this.ctx; if (!c || !this.musicOn) { if (c) this.next = Math.max(this.next, c.currentTime); return; }
    const bpm = 76, spb = 60 / bpm / 4; // 16th
    while (this.next < c.currentTime + 0.25) { this.playStep(this.step, this.next, spb); this.next += spb * (this.step % 2 ? 1.16 : 0.84); this.step = (this.step + 1) % 64; }
  }
  playStep(s, t, spb) {
    const bar = Math.floor(s / 16) % 4, pos = s % 16;
    // Am9 - Fmaj9 - Cmaj9 - G6
    const chords = [[57, 60, 64, 67, 71], [53, 57, 60, 64, 67], [60, 64, 67, 71, 74], [55, 59, 62, 64, 69]];
    const roots = [45, 41, 48, 43]; const ch = chords[bar];
    if (pos === 0) { ch.forEach((n, i) => this.epiano(n, t + i * 0.012, spb * 15, 0.045)); }
    if (pos === 8 && bar % 2) ch.slice(1, 4).forEach((n, i) => this.epiano(n, t + i * 0.01, spb * 6, 0.03));
    if (pos === 0 || pos === 10) this.bass(roots[bar], t, spb * (pos ? 5 : 9));
    if (pos === 0 || pos === 6 || pos === 10) this.kick(t, pos === 0 ? 1 : 0.7);
    if (pos === 4 || pos === 12) this.snare(t);
    if (pos % 2 === 0) this.hat(t, pos % 4 === 2 ? 0.05 : 0.03);
    // melodi pentatonik acak
    if (pos % 2 === 0 && Math.random() < 0.42) { const sc = [69, 72, 74, 76, 79, 81]; const n = sc[Math.floor(Math.random() * sc.length)] - (bar === 1 ? 4 : 0); this.pluck(n, t, spb * 3); }
  }
  osc(type, f, t, dur, vol, dest, f2) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }
  mf(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  epiano(n, t, dur, vol) { const f = this.mf(n); const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; lp.connect(this.music); this.osc('sine', f, t, dur, vol, lp); this.osc('triangle', f * 2.003, t, dur * 0.5, vol * 0.35, lp); }
  bass(n, t, dur) { this.osc('sine', this.mf(n), t, dur, 0.16, this.music); }
  pluck(n, t, dur) { const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; lp.connect(this.music); this.osc('triangle', this.mf(n), t, dur, 0.05, lp); }
  kick(t, v) { this.osc('sine', 120, t, 0.18, 0.28 * v, this.music, 40); }
  snare(t) { this.noiseHit(t, 0.12, 0.07, 1800, 'bandpass', this.music); }
  hat(t, v) { this.noiseHit(t, 0.04, v, 7000, 'highpass', this.music); }
  noiseHit(t, dur, vol, freq, type, dest) {
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noise; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; const g = c.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f).connect(g).connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  // ---------- efek ----------
  ok() { return this.ctx && this.sfxOn; }
  tone(f, dur = 0.15, vol = 0.18, type = 'triangle', delay = 0, f2) { if (!this.ok()) return; this.osc(type, f, this.ctx.currentTime + delay, dur, vol, this.sfx, f2); }
  coin() { this.tone(988, 0.08, 0.14, 'square'); this.tone(1319, 0.2, 0.14, 'square', 0.07); }
  cash() { if (!this.ok()) return; const t = this.ctx.currentTime; this.noiseHit(t, 0.06, 0.2, 3000, 'highpass', this.sfx); this.tone(1568, 0.35, 0.12, 'sine', 0.05); this.tone(2093, 0.4, 0.09, 'sine', 0.07); }
  buy() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 0.14, 'triangle', i * 0.07)); }
  error() { this.tone(180, 0.2, 0.2, 'sawtooth', 0, 120); }
  click() { this.tone(660, 0.05, 0.08, 'square'); }
  door() { this.tone(880, 0.35, 0.1, 'sine'); this.tone(660, 0.5, 0.1, 'sine', 0.18); }
  cheer() { if (!this.ok()) return; const t = this.ctx.currentTime; this.noiseHit(t, 0.5, 0.1, 1500, 'bandpass', this.sfx); this.tone(520, 0.3, 0.07, 'sawtooth', 0, 780); }
  angry() { this.tone(400, 0.35, 0.12, 'sawtooth', 0, 160); }
  levelUp() { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.28, 0.14, 'triangle', i * 0.09)); }
  quest() { [659, 784, 988, 1319].forEach((f, i) => this.tone(f, 0.22, 0.14, 'square', i * 0.08)); }
  horn() { this.tone(220, 0.6, 0.14, 'sawtooth'); this.tone(277, 0.6, 0.12, 'sawtooth'); this.tone(330, 0.6, 0.1, 'sawtooth'); }
  blip() { if (!this.ok()) return; const f = 300 + Math.floor(Math.random() * 6) * 120; this.tone(f, 0.06, 0.025, 'square', 0, f * (Math.random() < 0.5 ? 1.5 : 0.7)); }
}
