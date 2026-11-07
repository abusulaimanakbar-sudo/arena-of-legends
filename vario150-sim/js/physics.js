// Fisika motor matic: CVT, kopling sentrifugal, rev limiter, hambatan, grip
import { PHYS, engineModel } from './config.js';

export function newState(x = 0, z = 0, heading = 0, idle = 1500) {
  return { x, z, heading, v: 0, rpm: idle, G: PHYS.finalDrive * PHYS.cvtLow, yaw: 0, steer: 0, lean: 0, pitch: 0, thr: 0, accel: 0, lat: 0, limiter: false, slip: 0, clutch: 0, dist: 0 };
}

const L = 1.28; // wheelbase

// in: {thr 0..1, brake 0..1, steer -1..1 (+kiri)}; surface: {grip 0..1, drag m/s2}
export function stepBike(s, inp, eng, setup, dt, surface = { grip: 1, drag: 0 }) {
  const R = PHYS.R, Gmax = PHYS.finalDrive * PHYS.cvtLow, Gmin = PHYS.finalDrive * PHYS.cvtHigh;
  const idle = eng.idleRpm, limit = setup.ecu.limit;
  const thr = Math.max(0, Math.min(1, inp.thr));
  s.thr += (thr - s.thr) * Math.min(1, dt * 10);
  const wheelRpm = Math.abs(s.v) / (2 * Math.PI * R) * 60;

  // target RPM CVT bergantung bukaan gas
  const tgt = thr < 0.04 ? idle + 400 : idle + (eng.wotRpm - idle) * Math.pow(0.3 + 0.7 * thr, 1.1);
  let G = wheelRpm < 1 ? Gmax : Math.min(Gmax, Math.max(Gmin, tgt / wheelRpm));
  // CVT tidak langsung berubah (belt inertia)
  s.G += (G - s.G) * Math.min(1, dt * 6); G = Math.min(Gmax, Math.max(Gmin, s.G));
  const locked = wheelRpm * G;

  // kopling sentrifugal
  const engage = eng.engage;
  let clutch;
  if (locked >= engage * 0.98 && s.rpm >= engage * 0.92) clutch = 1; else clutch = Math.max(0, Math.min(1, (s.rpm - idle) / (engage - idle + 1)));
  const free = idle + s.thr * (engage + 900 - idle);
  if (clutch >= 1 || (s.rpm < locked)) { s.rpm += (Math.max(locked, idle) - s.rpm) * Math.min(1, dt * 10); }
  else { s.rpm += (Math.max(free, locked) - s.rpm) * Math.min(1, dt * 4.5); }
  // overshoot saat lepas gas: engine brake
  if (thr < 0.04 && clutch >= 1) s.rpm += (Math.max(locked, idle) - s.rpm) * Math.min(1, dt * 6);
  s.clutch = clutch;

  s.limiter = s.rpm >= limit;
  if (s.rpm > limit + 100) s.rpm = limit + 100;

  // gaya penggerak
  let drive = 0;
  if (!s.limiter) {
    const Tq = eng.torque(s.rpm) * (0.12 + 0.88 * Math.pow(s.thr, 0.9)) * (clutch < 1 ? clutch * clutch : 1);
    drive = (Tq * G * PHYS.eff) / R;
  }
  // engine brake
  const eb = s.thr < 0.04 && clutch >= 1 ? (s.rpm / 9000) * 55 + 12 : 0;
  const grip = eng.grip * surface.grip * 9.4;
  const m = eng.mass;
  const driveLim = grip * 0.85 * m; // traksi roda belakang
  drive = Math.min(drive, driveLim);
  const drag = 0.5 * PHYS.rho * PHYS.CdA * s.v * Math.abs(s.v) + 8 * m * 0.001 * 9.81 * eng.roll * 1.3 * Math.sign(s.v || 0) + eb * Math.sign(s.v || 0);
  let brakeF = inp.brake * Math.min(7.5 * m, grip * 0.9 * m) * Math.min(1, Math.abs(s.v) / 1.5);
  const a = (drive - drag - brakeF * Math.sign(s.v || 1)) / (m * 1.22) - surface.drag * Math.min(1, Math.abs(s.v) / 6);
  s.accel = a;
  s.v = Math.max(0, s.v + a * dt);
  if (s.v < 0.02 && drive <= 0 && inp.brake > 0) s.v = 0;

  // kemudi: sudut stang efektif mengecil terhadap kecepatan
  s.steer += (inp.steer - s.steer) * Math.min(1, dt * (s.v < 6 ? 8 : 5));
  const maxSteer = 0.62 / (1 + Math.pow(s.v / 8.5, 1.35));
  const steerAng = s.steer * maxSteer;
  let yaw = s.v * Math.tan(steerAng) / L;
  const latLimit = grip * 0.92; const lat = Math.abs(yaw * s.v);
  s.slip = 0;
  if (lat > latLimit && s.v > 0.5) { yaw = Math.sign(yaw) * latLimit / s.v; s.slip = Math.min(1, lat / latLimit - 1); s.v *= 1 - Math.min(0.3, s.slip * 0.4) * dt; }
  s.yaw += (yaw - s.yaw) * Math.min(1, dt * 14);
  s.heading += s.yaw * dt;
  s.lat = s.yaw * s.v;
  s.x += Math.sin(s.heading) * s.v * dt; s.z += Math.cos(s.heading) * s.v * dt;
  s.dist += s.v * dt;
  // visual
  s.lean += (Math.atan(s.lat / 9.81) * 1.1 - s.lean) * Math.min(1, dt * 8);
  s.pitch += ((-a * 0.012) - s.pitch) * Math.min(1, dt * 6);
  s.steerAngle = steerAng;
  return s;
}

// uji akselerasi headless: 0-60, 0-100, top speed, 400m
export function simulateRun(setup) {
  const eng = engineModel(setup); const s = newState(0, 0, 0, eng.idleRpm);
  const out = { t60: null, t100: null, top: 0, t400: null };
  const dt = 0.02;
  s.rpm = eng.idleRpm;
  for (let t = 0; t < 60; t += dt) {
    stepBike(s, { thr: 1, brake: 0, steer: 0 }, eng, setup, dt);
    const kmh = s.v * 3.6;
    if (out.t60 == null && kmh >= 60) out.t60 = t;
    if (out.t100 == null && kmh >= 100) out.t100 = t;
    if (out.t400 == null && s.dist >= 400) out.t400 = t;
    if (kmh > out.top) out.top = kmh;
  }
  return out;
}
