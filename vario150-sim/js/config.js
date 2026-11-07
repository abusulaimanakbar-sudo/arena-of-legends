// Data part, model mesin & fisika Vario 150 LED New (angka disetel agar terasa realistis)
export const COLORS = {
  black:  { name: 'Matte Black',   body: 0x2b2f36, accent: 0xc8102e, metal: 0.6, rough: 0.35 },
  white:  { name: 'Pearl White',   body: 0xf1f1ee, accent: 0xc8102e, metal: 0.3,  rough: 0.25 },
  red:    { name: 'Candy Red',     body: 0xb8101f, accent: 0x111111, metal: 0.45, rough: 0.2 },
  blue:   { name: 'Matte Blue',    body: 0x1e3f73, accent: 0xdddddd, metal: 0.5,  rough: 0.5 },
  grey:   { name: 'Titanium Grey', body: 0x7b8087, accent: 0xff6a00, metal: 0.6,  rough: 0.35 },
  lime:   { name: 'Racing Lime',   body: 0x8fd400, accent: 0x111111, metal: 0.4,  rough: 0.3 },
};

export const PARTS = {
  disp: {
    label: 'Mesin / Bore Up', hint: 'Kapasitas silinder. Makin besar makin bertenaga & makin berat getarannya.',
    options: {
      '150': { name: 'Standar 150cc (eSP)', hp: 1.00, peak: 0,    note: 'Ø57,3 × 58,7 mm' },
      '162': { name: 'Bore Up 162cc',       hp: 1.10, peak: -150, note: 'Ø60 mm' },
      '175': { name: 'Bore Up 175cc',       hp: 1.22, peak: -250, note: 'Ø63 mm + stroker' },
      '200': { name: 'Big Bore 200cc',      hp: 1.38, peak: -350, note: 'Ø66 mm + stroker' },
    },
  },
  cam: {
    label: 'Noken As (Camshaft)', hint: 'Durasi lebih panjang = napas atas kuat, bawah & idle jadi "kasar".',
    options: {
      stock: { name: 'Standar',        hp: 1.00, peak: 0,   lumpy: 0.0,  idleMin: 0 },
      sport: { name: 'Sport (dur 250°)', hp: 1.05, peak: 450, lumpy: 0.25, idleMin: 100 },
      race:  { name: 'Racing (dur 280°)',hp: 1.10, peak: 900, lumpy: 0.55, idleMin: 300 },
    },
  },
  tb: {
    label: 'Throttle Body', hint: 'Diameter venturi. Besar = nafas lega, perlu setting AFR.',
    options: {
      '28': { name: '28 mm (std)', hp: 1.00, peak: 0 },
      '30': { name: '30 mm',       hp: 1.03, peak: 200 },
      '32': { name: '32 mm',       hp: 1.05, peak: 400 },
    },
  },
  air: {
    label: 'Filter Udara', hint: 'Filter racing lebih lega, suara intake terdengar.',
    options: {
      stock: { name: 'Standar', hp: 1.00, intake: 0.0 },
      sport: { name: 'Filter Racing', hp: 1.02, intake: 0.4 },
      open:  { name: 'Open Filter (Corong)', hp: 1.04, intake: 0.9 },
    },
  },
  exhaust: {
    label: 'Knalpot', hint: 'Mengubah tenaga dan karakter suara.',
    options: {
      stock:    { name: 'Standar (SJ-88)',   hp: 1.00, peak: 0,    gain: 0.85, bass: 0,  rasp: 0.0,  res: 700,  resQ: 0.7, drive: 0.05, pop: 0.0, lp: 4500, color: 0x8b8e92, len: 0.42, rad: 0.062 },
      freeflow: { name: 'Free Flow Slip-On', hp: 1.04, peak: 300,  gain: 1.0,  bass: 2,  rasp: 0.25, res: 900,  resQ: 1.0, drive: 0.15, pop: 0.2, lp: 7000, color: 0xb9bcc0, len: 0.46, rad: 0.058 },
      racing:   { name: 'Racing Full System',hp: 1.09, peak: 650,  gain: 1.15, bass: 1,  rasp: 0.6,  res: 1600, resQ: 1.4, drive: 0.35, pop: 0.45,lp: 11000,color: 0x2c2e31, len: 0.55, rad: 0.05, titan: true },
      brong:    { name: 'Brong Knalpot Bobokan', hp: 1.03, peak: -350, gain: 1.3, bass: 7,  rasp: 0.4,  res: 380,  resQ: 1.6, drive: 0.5,  pop: 0.35,lp: 6000, color: 0x4a3b2c, len: 0.62, rad: 0.075, burnt: true },
    },
  },
  roller: {
    label: 'Roller CVT', hint: 'Roller berat = CVT geser lebih awal (tarikan bawah, top speed rendah). Ringan = RPM tinggi.',
    options: {
      '7':  { name: '7 gram',  g: 7 },
      '8.5':{ name: '8,5 gram',g: 8.5 },
      '10': { name: '10 gram (std)', g: 10 },
      '11.5':{name: '11,5 gram',g: 11.5 },
      '13': { name: '13 gram', g: 13 },
    },
  },
  spring: {
    label: 'Per CVT (Spring)', hint: 'Mengatur RPM kopling mulai gigit.',
    options: {
      soft:  { name: 'Lunak',    engage: 3000 },
      stock: { name: 'Standar',  engage: 3500 },
      hard:  { name: 'Racing Keras', engage: 4600 },
    },
  },
  tire: {
    label: 'Ban', hint: 'Grip tikungan & hambatan gulir.',
    options: {
      stock: { name: 'Standar (80/90-14)', grip: 1.00, roll: 1.0, color: 0x1b1b1b },
      sport: { name: 'Sport Soft',  grip: 1.18, roll: 1.1, color: 0x151515 },
      slick: { name: 'Semi Slick',  grip: 1.38, roll: 1.25, color: 0x0d0d0d },
    },
  },
  weight: {
    label: 'Bobot', hint: 'Lepas aksesoris, velg ringan.',
    options: {
      stock: { name: 'Standar (112 kg)', mass: 112 },
      light: { name: 'Lightweight (−6 kg)', mass: 106 },
    },
  },
};

export const SOUND_PRESETS = {
  stock:  { name: 'Standar Vario',        pitch: 0,  bass: 0,  rasp: 0.0, drive: 0.05, lumpy: 0,    synth: 0.0,  pop: 0.0,  res: 700, volume: 1.2, runMix: 1.0 },
  racing: { name: 'Racing Kering',        pitch: 1.0,bass: -2, rasp: 0.6, drive: 0.35, lumpy: 0.05, synth: 0.2,  pop: 0.35, res: 1700,volume: 1.0, runMix: 1.1 },
  brong:  { name: 'Brong Berat',          pitch: -2.5,bass: 8, rasp: 0.4, drive: 0.5,  lumpy: 0.15, synth: 0.25, pop: 0.3,  res: 360, volume: 1.05,runMix: 1.0 },
  kuda:   { name: 'Timing Kuda (Galloping)', pitch: -1,bass: 5, rasp: 0.35,drive: 0.4,  lumpy: 0.85, synth: 0.3,  pop: 0.2,  res: 520, volume: 1.0, runMix: 1.0 },
  cempreng:{name: 'Cempreng 4T Tinggi',   pitch: 3.5,bass: -5, rasp: 0.7, drive: 0.3,  lumpy: 0.0,  synth: 0.35, pop: 0.25, res: 2600,volume: 0.95,runMix: 1.0 },
  gp:     { name: 'Scream GP (Sintetis)', pitch: 5,  bass: 0,  rasp: 0.5, drive: 0.55, lumpy: 0.0,  synth: 0.9,  pop: 0.5,  res: 1900,volume: 1.0, runMix: 0.5 },
  custom: { name: 'Custom (atur sendiri)' },
};

export const ECU_LIMITS = {
  timing: { min: 10, max: 42, step: 0.5, unit: '° BTDC', def: 27 },
  afr:    { min: 10.5, max: 15.5, step: 0.1, unit: ':1', def: 12.8 },
  idle:   { min: 900, max: 2800, step: 50, unit: ' rpm', def: 1500 },
  limit:  { min: 8000, max: 13500, step: 100, unit: ' rpm', def: 9500 },
};

export const DEFAULT_SETUP = {
  color: 'white', disp: '150', cam: 'stock', tb: '28', air: 'stock', exhaust: 'stock',
  roller: '10', spring: 'stock', tire: 'stock', weight: 'stock',
  ecu: { timing: 27, afr: 12.8, idle: 1500, limit: 9500, pops: false, soundMode: 1, volume: 1.2 },
  soundPreset: 'stock',
  sound: { ...SOUND_PRESETS.stock },
};

export function cloneSetup(s) { return JSON.parse(JSON.stringify(s)); }

// ---------- Model mesin ----------
const STOCK_PEAK_RPM = 8500;
const STOCK_HP = 13.0;

export function engineModel(setup) {
  const d = PARTS.disp.options[setup.disp], c = PARTS.cam.options[setup.cam], t = PARTS.tb.options[setup.tb],
    a = PARTS.air.options[setup.air], e = PARTS.exhaust.options[setup.exhaust];
  const peakRpm = STOCK_PEAK_RPM + d.peak + c.peak + t.peak + e.peak;
  // timing optimum bergeser: kapasitas/cam besar butuh advance lebih sedikit
  const timingOpt = 27 - (setup.disp === '200' ? 3 : setup.disp === '175' ? 2 : setup.disp === '162' ? 1 : 0) + (setup.cam === 'race' ? 1.5 : 0);
  const afrOpt = 12.8 - (setup.tb !== '28' ? 0.1 : 0);
  const tf = Math.max(0.55, 1 - 0.0017 * Math.pow(setup.ecu.timing - timingOpt, 2));
  const knock = setup.ecu.timing > timingOpt + 7 ? Math.min(1, (setup.ecu.timing - timingOpt - 7) / 8) : 0;
  const af = Math.max(0.6, 1 - 0.028 * Math.pow(setup.ecu.afr - afrOpt, 2));
  const knockLoss = 1 - 0.18 * knock;
  const hpMax = STOCK_HP * d.hp * c.hp * t.hp * a.hp * e.hp * tf * af * knockLoss;
  const power = (rpm) => { // hp
    const x = rpm / peakRpm;
    const shape = Math.max(0.02, x * (1 + x - x * x));
    // di bawah ~3000 rpm tenaga turun lebih cepat
    const low = Math.min(1, 0.55 + rpm / 6500);
    return hpMax * shape * (x < 0.7 ? low : 1);
  };
  const torque = (rpm) => (power(Math.max(rpm, 800)) * 745.7 * 9.5493) / Math.max(rpm, 800); // Nm
  const spring = PARTS.spring.options[setup.spring];
  const roller = PARTS.roller.options[setup.roller].g;
  const wotRpm = Math.max(5500, Math.min(setup.ecu.limit - 300, peakRpm * (1 + (10 - roller) * 0.035)));
  const tire = PARTS.tire.options[setup.tire];
  const mass = PARTS.weight.options[setup.weight].mass + 70; // + pengendara 70 kg
  return {
    peakRpm, hpMax, power, torque, wotRpm, engage: spring.engage + c.idleMin * 0.4,
    grip: tire.grip, roll: tire.roll, mass, knock, timingOpt, afrOpt,
    lumpy: c.lumpy, intake: a.intake, exh: e,
    idleRpm: Math.max(setup.ecu.idle, 900 + c.idleMin),
  };
}

// torque & power curve untuk dyno chart
export function dynoCurve(setup, from = 1500, to = 13000, n = 60) {
  const m = engineModel(setup); const out = [];
  for (let i = 0; i <= n; i++) { const r = from + (to - from) * i / n; const over = r > setup.ecu.limit ? 0 : 1; out.push({ rpm: r, hp: m.power(r) * over, nm: m.torque(r) * over }); }
  return out;
}

// ---------- Fisika kendaraan ----------
export const PHYS = { R: 0.265, finalDrive: 9.0, cvtLow: 2.75, cvtHigh: 0.88, eff: 0.86, CdA: 0.45, rho: 1.2 };

export function totalRatio(rpmRatio) { return PHYS.finalDrive * rpmRatio; }
