// RAFLI GM — aplikasi Game Master. Semua pengaturan game diubah di sini dan berlaku realtime di game.
import { DEFAULT_CFG, SCHEMA, STATE_FIELDS, merge, clone, getPath, setPath, delPath, same } from './shared/config.js';
import { createLink, DEFAULT_SERVER, newRoom } from './shared/sync.js';

const $ = (id) => document.getElementById(id);
const h = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs || {})) { if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v); } kids.flat().forEach((c) => c != null && e.append(c.nodeType ? c : document.createTextNode(c))); return e; };
const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* abaikan */ } };
const rp = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
function toast(t) { const el = $('toast'); el.textContent = t; el.style.opacity = 1; clearTimeout(toast.t); toast.t = setTimeout(() => (el.style.opacity = 0), 1800); }

// ---------- data ----------
let OVR = lsGet('rafli-gm-ovr', {});
const conn = Object.assign({ room: newRoom(), server: DEFAULT_SERVER, remote: true, auto: false }, lsGet('rafli-gm-conn', {}));
lsSet('rafli-gm-conn', conn);
const eff = () => merge(DEFAULT_CFG, OVR);
let game = { state: null, tel: null, last: 0, acked: 0 }; let sendStatus = 'saved'; let sentT = 0; const logLines = [];
const log = (t) => { logLines.unshift(new Date().toLocaleTimeString() + '  ' + t); logLines.length = Math.min(logLines.length, 60); const el = $('logBox'); if (el) el.textContent = logLines.join('\n'); };

// ---------- koneksi ----------
const link = createLink({ role: 'gm', onMsg: onGameMsg, onStatus: updateConn });
function connect() { link.configure({ room: conn.room, server: conn.server, remote: conn.remote }); }
function onGameMsg(m) {
  if (m.k === 'tel') { game.tel = m.d; game.last = Date.now(); if (cur === 'monitor') paintMonitor(); }
  else if (m.k === 'state') { game.state = m.d; game.last = Date.now(); log('Status game diterima'); if (cur === 'monitor') paintMonitor(); if (cur === 'data') paintData(false); }
  else if (m.k === 'ack') { game.last = Date.now(); if (m.what === 'cfg') { game.acked = m.t || Date.now(); setSend('acked'); } log('Game: ' + m.what + ' OK'); }
  updateConn();
}
function updateConn() {
  const st = link.status(); const set = (id, cls, txt) => { const e = $(id); e.className = 'pill ' + cls; e.textContent = txt; };
  set('pLocal', st.local ? 'on' : '', 'Lokal'); set('pRemote', { ok: 'on', connecting: 'mid', error: 'err', off: '' }[st.remote] || '', 'Relay ' + ({ ok: '✓', connecting: '…', error: '✗', off: '–' }[st.remote] || ''));
  const alive = game.last && Date.now() - game.last < 15000; set('pGame', alive ? 'on' : game.last ? 'mid' : '', alive ? 'Game online' : game.last ? 'Game diam' : 'Game ?');
  const cs = $('cStat'); if (cs) cs.innerHTML = `Lokal: ${st.local ? 'siap ✓' : '—'} · Relay: ${{ ok: 'tersambung ✓', connecting: 'menyambung…', error: 'gagal ✗ ' + (st.error || ''), off: 'mati' }[st.remote]}<br>Pesan dari game terakhir: ${game.last ? Math.round((Date.now() - game.last) / 1000) + ' dtk lalu' : 'belum ada'}`;
}
setInterval(updateConn, 2000);
function setSend(s) { sendStatus = s; $('sendState').textContent = { saved: 'Tersimpan di GM', pending: '✎ Mengirim…', sent: '✓ Terkirim', acked: '✓ Diterima game' }[s] || s; $('sendState').style.color = s === 'acked' ? '#6ee7b7' : s === 'pending' ? '#fde68a' : '#aab'; }
let sendTimer = 0;
function pushCfg(now) { setSend('pending'); clearTimeout(sendTimer); sendTimer = setTimeout(() => { lsSet('rafli-gm-ovr', OVR); link.send({ k: 'cfg', d: OVR }, { co: 'cfg' }); sentT = Date.now(); setSend('sent'); log('Pengaturan dikirim (' + Object.keys(OVR).length + ' grup diubah)'); }, now ? 0 : 900); }
function setCfg(path, val) { const def = getPath(DEFAULT_CFG, path); if (same(val, def)) delPath(OVR, path); else setPath(OVR, path, val); prune(OVR); lsSet('rafli-gm-ovr', OVR); pushCfg(); }
function prune(o) { for (const k of Object.keys(o)) { if (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k])) { prune(o[k]); if (!Object.keys(o[k]).length) delete o[k]; } } return o; }
const cmd = (name, a = {}) => { link.send({ k: 'cmd', name, a }); log('Perintah: ' + name + ' ' + JSON.stringify(a).slice(0, 80)); toast('Perintah dikirim: ' + name); };

// ---------- navigasi ----------
const TABS = [['monitor', '📡 Monitor'], ['actions', '🎛 Aksi'], ['data', '🧾 Data Game'], ...SCHEMA.map((g) => ['g:' + g.id, g.icon + ' ' + g.title]), ['presets', '🧩 Preset'], ['backup', '💾 Cadangan']];
let cur = 'monitor', query = '';
$('nav').append(...TABS.map(([k, l]) => h('button', { 'data-t': k, onclick: () => go(k) }, l)));
function go(k) { cur = k; [...$('nav').children].forEach((b) => b.classList.toggle('on', b.dataset.t === k)); render(); }
function render() { const m = $('main'); m.innerHTML = ''; if (cur === 'monitor') { m.append(h('div', { id: 'monitor' })); paintMonitor(); } else if (cur === 'actions') paintActions(m); else if (cur === 'data') { m.append(h('div', { id: 'dataBox' })); paintData(true); } else if (cur === 'presets') paintPresets(m); else if (cur === 'backup') paintBackup(m); else paintGroup(m, SCHEMA.find((g) => 'g:' + g.id === cur)); }

// ---------- monitor ----------
function paintMonitor() {
  const box = $('monitor'); if (!box) return; const t = game.tel, s = game.state; const k = (a, b) => h('div', { class: 'kpi' }, h('small', {}, a), h('b', {}, b));
  const clock = (c) => { const hh = Math.floor(c), mm = Math.floor((c % 1) * 60); return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); };
  box.innerHTML = ''; box.append(h('h2', {}, '📡 Monitor Game'));
  if (!t && !s) box.append(h('div', { class: 'card' }, 'Belum ada data dari game. Pastikan game & GM memakai kode ruang yang sama (🔗), lalu tekan ', h('button', { class: 'sm', onclick: () => { link.send({ k: 'poll' }); log('Meminta status game'); } }, 'Ambil status game')));
  const d = t || {};
  box.append(h('div', { class: 'grid' }, k('Uang', rp(d.money ?? s?.money ?? 0)), k('Pendapatan / dtk', rp(d.ips ?? s?.ips ?? 0)), k('Laba hari ini', rp(d.profit ?? s?.profit ?? 0)), k('Hari · Jam', `${d.day ?? s?.day ?? '-'} · ${clock(d.clock ?? s?.clock ?? 0)}`), k('Pelanggan di toko', d.parties ?? s?.parties ?? 0), k('Stasiun terpakai', `${d.busy ?? s?.busy ?? 0} / ${s?.stations ?? '-'}`), k('Reputasi', ((d.rep ?? s?.rep ?? 0)).toFixed(1) + '★'), k('Franchise', '👑 ' + (s?.stars ?? 0))));
  if (s) {
    const row = (a, v, c = '') => h('div', { class: 'fr ' + c }, h('span', {}, a), h('b', {}, rp(v)));
    const lab = (x) => x.inc + x.kantin + x.tip - x.elec - x.rent - x.sal - x.cogs - x.broken - (x.upkeep || 0) - (x.tax || 0);
    const pl = (x, title) => h('div', { class: 'card' }, h('h3', {}, title), row('Sewa PS', x.inc), row('Kantin', x.kantin), row('Tip', x.tip), row('Listrik', -x.elec), row('Sewa tempat', -x.rent), row('Gaji & bonus SDM', -x.sal), row('Bahan kantin', -x.cogs), row('Perawatan aset', -(x.upkeep || 0)), row('Pajak usaha', -(x.tax || 0)), row('Stik rusak', -x.broken), row('LABA', lab(x), 'tot'));
    box.append(h('div', { class: 'grid', style: 'grid-template-columns:repeat(auto-fit,minmax(260px,1fr))' }, pl(s.tot || s.d, 'Sejak awal (kumulatif)'), pl(s.d, 'Hari ini'), pl(s.y, 'Kemarin')));
    if (s.hist && s.hist.length) box.append(h('div', { class: 'card tw' }, h('h3', {}, 'Riwayat harian'), h('table', {}, h('tr', {}, ...['Hari', 'Pendapatan', 'Biaya', 'Laba'].map((x) => h('th', {}, x))), ...s.hist.slice().reverse().map((r) => h('tr', {}, h('td', {}, r.day), h('td', {}, rp(r.inc + r.kantin + r.tip)), h('td', {}, rp(r.elec + r.rent + r.sal + r.cogs + r.broken + (r.upkeep || 0) + (r.tax || 0))), h('td', { class: lab(r) >= 0 ? 'good' : 'bad' }, rp(lab(r))))))));
    box.append(h('div', { class: 'card' }, `Hujan: ${s.rain ? 'ya' : 'tidak'} · Listrik padam: ${s.blackout ? 'ya' : 'tidak'} · Happy Hour: ${s.hh ? 'aktif' : 'tidak'} · Kecepatan ×${s.ts} · Member: ${s.regs} · Biaya tetap/hari: ${rp(s.daily.rent + s.daily.sal)} · Perawatan aset/hari: ${rp(s.daily.upkeep || 0)} · Pesanan kantin: ${s.cnt.orders} · Maling: ${s.cnt.theft}`));
  }
  box.append(h('div', { class: 'row' }, h('button', { onclick: () => { link.send({ k: 'poll' }); log('Meminta status game'); } }, '⟳ Ambil status game'), h('button', { onclick: () => go('actions') }, '🎛 Ke Aksi')));
  box.append(h('h3', {}, 'Log'), h('pre', { id: 'logBox', class: 'card log' }, logLines.join('\n')));
}

// ---------- aksi ----------
function paintActions(m) {
  const sec = (title, ...kids) => m.append(h('div', { class: 'card' }, h('h3', {}, title), ...kids));
  m.append(h('h2', {}, '🎛 Aksi Langsung'));
  const amt = h('input', { type: 'number', value: 1000000, step: 100000 });
  sec('💰 Uang', h('div', { class: 'row' }, amt, h('button', { class: 'ok', onclick: () => cmd('give', { amount: +amt.value }) }, 'Tambah'), h('button', { class: 'warn', onclick: () => cmd('give', { amount: -Math.abs(+amt.value) }) }, 'Kurangi')),
    h('div', { class: 'row' }, ...[[1e5, '+100 Rb'], [1e6, '+1 Jt'], [1e8, '+100 Jt'], [1e10, '+10 M'], [1e12, '+1 T']].map(([v, l]) => h('button', { class: 'sm', onclick: () => cmd('give', { amount: v }) }, l))));
  const hr = h('input', { type: 'number', value: 12, min: 0, max: 24, step: 0.5 }), dy = h('input', { type: 'number', value: 1, min: 1, step: 1 });
  sec('⏰ Waktu', h('div', { class: 'row' }, 'Jam', hr, 'Hari', dy, h('button', { onclick: () => cmd('time', { clock: +hr.value, day: +dy.value }) }, 'Terapkan')), h('div', { class: 'row' }, ...[[6, 'Pagi'], [12, 'Siang'], [17, 'Sore'], [20, 'Malam'], [2, 'Dini hari']].map(([v, l]) => h('button', { class: 'sm', onclick: () => cmd('time', { clock: v }) }, l + ' ' + v + ':00'))));
  const ts = h('input', { type: 'range', min: 1, max: 12, step: 1, value: 1 }), tsl = h('b', {}, '×1'); ts.oninput = () => (tsl.textContent = '×' + ts.value);
  sec('⏩ Kecepatan simulasi', h('div', { class: 'row' }, ts, tsl, h('button', { onclick: () => cmd('timescale', { v: +ts.value }) }, 'Terapkan')), h('small', {}, 'Mempercepat seluruh dunia game (berguna untuk uji keseimbangan).'));
  sec('🎉 Pemicu acara', h('div', { class: 'evbtns' }, ...[['turnamen', '🏆 Turnamen'], ['rombongan', '🚌 Rombongan'], ['streamer', '⭐ Streamer VIP'], ['ultah', '🎂 Ulang tahun'], ['hujan', '🌧 Hujan'], ['listrik', '⚡ Listrik padam'], ['promo', '🎉 Diskon viral']].map(([n, l]) => h('button', { onclick: () => cmd('event', { name: n }) }, l))),
    h('div', { class: 'row' }, h('button', { class: 'sm', onclick: () => cmd('rain', { on: 0 }) }, 'Hentikan hujan'), h('button', { class: 'sm', onclick: () => cmd('blackout', { on: 0 }) }, 'Nyalakan listrik'), h('button', { class: 'sm', onclick: () => cmd('hh', { on: 1 }) }, '🔥 Mulai Happy Hour'), h('button', { class: 'sm', onclick: () => cmd('hh', { on: 0 }) }, 'Stop Happy Hour')));
  const n = h('input', { type: 'number', value: 5, min: 1, max: 20 });
  sec('🧍 Pelanggan', h('div', { class: 'row' }, 'Jumlah', n, h('button', { onclick: () => cmd('spawn', { n: +n.value }) }, 'Datangkan'), h('button', { onclick: () => cmd('spawn', { n: +n.value, vip: 1 }) }, 'Datangkan VIP')), h('div', { class: 'row' }, h('button', { class: 'warn sm', onclick: () => cmd('clear') }, 'Usir semua pelanggan'), h('button', { class: 'sm', onclick: () => cmd('fixAll') }, '🔧 Perbaiki semua konsol')));
  const tx = h('input', { type: 'text', placeholder: 'Teks pengumuman…', maxlength: 140 });
  sec('📢 Pengumuman', h('div', { class: 'row' }, tx, h('button', { onclick: () => tx.value && cmd('announce', { text: tx.value }) }, 'Tampilkan di game')));
  sec('🚀 Jalan pintas', h('div', { class: 'row' }, h('button', { onclick: () => cmd('state', { st: Array.from({ length: 9 }, () => ({ o: 1, c: 0, t: 0, s: 0, l: 0 })).map((x, i) => ({ ...x, c: (game.state?.st?.[i]?.c) ?? 0, t: (game.state?.st?.[i]?.t) ?? 0, s: (game.state?.st?.[i]?.s) ?? 0, l: (game.state?.st?.[i]?.l) ?? 0 })) }) }, '🔓 Buka semua 9 slot'),
    h('button', { onclick: () => { const c = eff(); cmd('state', { snack: c.menu.reduce((a, x) => Math.max(a, x.min), 1), lobby: c.shop.lobby.costs.length, ac: c.shop.ac.costs.length, decor: c.shop.decor.costs.length, kasir: c.shop.kasir.costs.length, staff: c.shop.staff.costs.length, cctv: c.shop.cctv.costs.length, genset: 1 }); } }, '⭐ Maksimalkan upgrade toko'),
    h('button', { onclick: () => { const c = eff(); cmd('state', { st: Array.from({ length: 9 }, () => ({ o: 1, c: c.consoles.length - 1, t: c.tvs.length - 1, s: c.sofas.length - 1, l: 10 })) }); } }, '🎮 Semua stasiun maksimal'), h('button', { onclick: () => cmd('state', { br: [{ o: 1, l: 1 }, { o: 1, l: 1 }, { o: 1, l: 1 }] }) }, '🏢 Buka 3 cabang')));
  sec('⚠ Zona berbahaya', h('div', { class: 'row' }, h('button', { class: 'warn', onclick: () => { OVR = {}; lsSet('rafli-gm-ovr', OVR); cmd('resetCfg'); pushCfg(true); toast('Semua pengaturan dikembalikan ke default'); render(); } }, 'Kembalikan SEMUA pengaturan ke default'), h('button', { class: 'warn', onclick: () => { if (confirm('Reset total game (uang, upgrade, progres) di game?')) cmd('reset'); } }, 'Reset total progres game')));
}

// ---------- data game ----------
let dataDirty = {}; let dataSt = null;
function paintData(force) {
  const box = $('dataBox'); if (!box) return; const s = game.state;
  if (force) { dataDirty = {}; dataSt = s ? clone({ st: s.st, br: s.br }) : null; }
  if (!force && Object.keys(dataDirty).length) return; box.innerHTML = '';
  box.append(h('h2', {}, '🧾 Data Game (edit progres pemain)'), h('div', { class: 'row' }, h('button', { onclick: () => { link.send({ k: 'poll' }); log('Meminta status game'); } }, '⟳ Ambil dari game'), h('span', { class: 'def' }, s ? 'Data diambil ' + Math.round((Date.now() - s.t) / 1000) + ' dtk lalu' : 'Belum ada data — tekan Ambil dari game')));
  if (!s) return; if (!dataSt) dataSt = clone({ st: s.st, br: s.br });
  const c = eff(); const patch = {};
  const card = h('div', { class: 'card' }, h('h3', {}, 'Nilai umum'));
  STATE_FIELDS.forEach(([k, label, step]) => { const inp = h('input', { type: 'number', value: Math.round(s[k] * 100) / 100, step }); inp.oninput = () => { dataDirty[k] = +inp.value; }; card.append(h('div', { class: 'field' }, h('label', {}, label), h('div', { class: 'ctl' }, inp))); });
  const tbl = h('div', { class: 'card tw' }, h('h3', {}, 'Stasiun'), h('table', {}, h('tr', {}, ...['#', 'Buka(1/0)', 'Konsol', 'TV', 'Sofa', 'Level Layanan'].map((x) => h('th', {}, x))), ...dataSt.st.map((r, i) => h('tr', {}, h('td', {}, i + 1),
    ...[['o', 1, 0, 1], ['c', 0, 0, c.consoles.length - 1], ['t', 0, 0, c.tvs.length - 1], ['s', 0, 0, c.sofas.length - 1], ['l', 1, 0, 999]].map(([f, , mn, mx]) => { const inp = h('input', { type: 'number', value: r[f], min: mn, max: mx, step: 1 }); inp.oninput = () => { dataSt.st[i][f] = +inp.value; dataDirty.st = dataSt.st; }; return h('td', {}, inp); })))));
  const brs = h('div', { class: 'card tw' }, h('h3', {}, 'Cabang'), h('table', {}, h('tr', {}, ...['Cabang', 'Dibangun(1/0)', 'Level'].map((x) => h('th', {}, x))), ...dataSt.br.map((r, i) => h('tr', {}, h('td', {}, c.branch.names[i]), ...['o', 'l'].map((f) => { const inp = h('input', { type: 'number', value: r[f], min: 0, step: 1 }); inp.oninput = () => { dataSt.br[i][f] = +inp.value; dataDirty.br = dataSt.br; }; return h('td', {}, inp); })))));
  box.append(card, tbl, brs, h('div', { class: 'row' }, h('button', { class: 'ok', onclick: () => { Object.assign(patch, dataDirty); cmd('state', patch); dataDirty = {}; } }, '📤 Kirim perubahan ke game'), h('button', { onclick: () => paintData(true) }, 'Batalkan')));
}

// ---------- grup pengaturan ----------
function fieldRow(f) {
  const c = eff(); const val = getPath(c, f.p), def = getPath(DEFAULT_CFG, f.p), mod = !same(val, def);
  const row = h('div', { class: 'field' + (mod ? ' mod' : '') }, h('label', {}, f.label)); const ctl = h('div', { class: 'ctl' });
  const num = h('input', { type: 'number', value: val, min: f.min, max: f.max, step: f.step }); const apply = (v) => { if (Number.isFinite(v)) { setCfg(f.p, v); row.classList.toggle('mod', !same(v, def)); rs.style.display = same(v, def) ? 'none' : ''; } };
  num.onchange = () => { apply(+num.value); if (rng) rng.value = num.value; }; num.oninput = () => { if (rng) rng.value = num.value; };
  let rng = null; if ((f.max - f.min) / f.step <= 1200) { rng = h('input', { type: 'range', min: f.min, max: f.max, step: f.step, value: val }); rng.oninput = () => { num.value = rng.value; }; rng.onchange = () => apply(+rng.value); ctl.append(rng); }
  const rs = h('button', { class: 'rs sm', title: 'Kembalikan ke default', style: mod ? '' : 'display:none', onclick: () => { setCfg(f.p, def); render(); } }, '↺');
  ctl.append(num, f.unit ? h('span', { class: 'def' }, f.unit) : '', h('span', { class: 'def' }, 'default ' + (typeof def === 'number' && Math.abs(def) >= 1000 ? def.toLocaleString('id-ID') : def)), rs); row.append(ctl); if (f.hint) row.append(h('div', { class: 'hint' }, f.hint)); return row;
}
function tableBlock(t) {
  const c = eff(); const rows = getPath(c, t.p), def = getPath(DEFAULT_CFG, t.p); const card = h('div', { class: 'card tw' }, h('h3', {}, t.title));
  const tb = h('table', {}, h('tr', {}, h('th', {}, '#'), ...t.cols.map((x) => h('th', {}, x[1]))), ...rows.map((r, i) => h('tr', {}, h('td', {}, i + 1), ...t.cols.map(([k, , type, step]) => { const inp = h('input', { type: type === 'num' ? 'number' : 'text', value: r[k], step: step || 1 }); if (!same(r[k], def[i]?.[k])) inp.style.borderColor = '#ffd45e'; inp.onchange = () => { const cur = clone(getPath(eff(), t.p)); cur[i][k] = type === 'num' ? +inp.value : inp.value; setCfg(t.p, cur); inp.style.borderColor = same(cur[i][k], def[i]?.[k]) ? '' : '#ffd45e'; }; return h('td', {}, inp); }))));
  card.append(tb, h('div', { class: 'row' }, h('button', { class: 'sm', onclick: () => { setCfg(t.p, clone(def)); render(); } }, '↺ Default tabel ini'))); return card;
}
function listBlock(l) {
  const c = eff(); const arr = getPath(c, l.p), def = getPath(DEFAULT_CFG, l.p); const card = h('div', { class: 'card' }, h('h3', {}, l.title)); const wrap = h('div', { class: 'row' });
  arr.forEach((v, i) => { const inp = h('input', { type: 'number', value: v, step: l.step || 1, style: 'min-width:110px;max-width:150px' }); if (v !== def[i]) inp.style.borderColor = '#ffd45e'; inp.onchange = () => { const cur = clone(getPath(eff(), l.p)); cur[i] = +inp.value; setCfg(l.p, cur); inp.style.borderColor = cur[i] === def[i] ? '' : '#ffd45e'; }; wrap.append(h('label', { class: 'def' }, '#' + (i + 1) + ' ', inp)); });
  card.append(wrap, h('button', { class: 'sm', onclick: () => { setCfg(l.p, clone(def)); render(); } }, '↺ Default')); return card;
}
function textBlock(l) {
  const c = eff(); const arr = getPath(c, l.p), def = getPath(DEFAULT_CFG, l.p); const ta = h('textarea', { rows: Math.min(10, arr.length + 1) }); ta.value = arr.join('\n');
  const info = h('span', { class: 'def' }, arr.length + ' baris — satu entri per baris'); ta.onchange = () => { const v = ta.value.split('\n').map((x) => x.trim()).filter(Boolean); setCfg(l.p, v.length ? v : clone(def)); info.textContent = (v.length || def.length) + ' baris'; toast('Tersimpan'); };
  return h('div', { class: 'card' }, h('h3', {}, l.title), ta, h('div', { class: 'row' }, info, h('button', { class: 'sm', onclick: () => { setCfg(l.p, clone(def)); render(); } }, '↺ Default')));
}
function paintGroup(m, g) {
  m.append(h('h2', {}, g.icon + ' ' + g.title));
  const q = h('input', { class: 'search', type: 'search', placeholder: '🔎 Cari pengaturan di grup ini…', value: query }); m.append(q); const body = h('div', {}); m.append(body);
  const draw = () => { body.innerHTML = ''; const s = query.toLowerCase(); if (g.fields) { const fs = g.fields.filter((f) => !s || f.label.toLowerCase().includes(s) || f.p.toLowerCase().includes(s)); if (fs.length) { const card = h('div', { class: 'card' }); fs.forEach((f) => card.append(fieldRow(f))); body.append(card); } } (g.tables || []).forEach((t) => body.append(tableBlock(t))); (g.lists || []).forEach((l) => body.append(listBlock(l))); (g.textLists || []).filter((l) => !s || l.title.toLowerCase().includes(s)).forEach((l) => body.append(textBlock(l))); if (!body.children.length) body.append(h('div', { class: 'card' }, 'Tidak ada hasil.')); };
  q.oninput = () => { query = q.value; draw(); }; draw();
}

// ---------- preset & cadangan ----------
const PRESETS = {
  'Mudah (santai)': { desc: 'Pendapatan lebih besar, upgrade murah, pelanggan sabar.', fn: (o) => { setPath(o, 'eco.basePrice', 7500); setPath(o, 'cust.patience', 90); setPath(o, 'cust.theft', 0.04); setPath(o, 'cust.hangRate', 0.002); setPath(o, 'costs.rentBase', 4000); setPath(o, 'costs.rentStation', 3000); setPath(o, 'costs.salStaff', 8000); } },
  'Normal (bawaan)': { desc: 'Kembali ke keseimbangan bawaan.', fn: (o) => { for (const k of Object.keys(o)) delete o[k]; } },
  'Sulit (tycoon sejati)': { desc: 'Harga & biaya lebih berat, pelanggan nakal & tidak sabar.', fn: (o) => { setPath(o, 'eco.basePrice', 4000); setPath(o, 'cust.patience', 35); setPath(o, 'cust.theft', 0.3); setPath(o, 'cust.hangRate', 0.012); setPath(o, 'costs.rentBase', 15000); setPath(o, 'costs.rentStation', 10000); setPath(o, 'costs.salStaff', 26000); setPath(o, 'eco.layananGrowth', 1.7); setPath(o, 'shop.mkt.growth', 1.8); setPath(o, 'shop.train.growth', 1.8); } },
  'Sandbox kaya': { desc: 'Uang awal besar & pendapatan raksasa untuk uji coba fitur.', fn: (o) => { setPath(o, 'eco.startMoney', 50000000); setPath(o, 'eco.basePrice', 25000); setPath(o, 'cust.arrivalBase', 3); setPath(o, 'eco.sessionSec', 8); } },
  'Ramai terus': { desc: 'Kedatangan sangat sering untuk menguji antrean & kantin.', fn: (o) => { setPath(o, 'cust.arrivalBase', 2.5); setPath(o, 'cust.arrivalMin', 0.6); setPath(o, 'cust.maxParties', 40); setPath(o, 'cust.maxPending', 20); } },
  'Acara sering': { desc: 'Acara acak muncul tiap 20–40 detik.', fn: (o) => { setPath(o, 'events.min', 20); setPath(o, 'events.max', 40); } },
};
function paintPresets(m) {
  m.append(h('h2', {}, '🧩 Preset Keseimbangan'), h('p', { class: 'def' }, 'Preset menimpa beberapa pengaturan penting (sisanya dibiarkan). Bisa dikombinasikan; ubah lagi lewat grup pengaturan.'));
  Object.entries(PRESETS).forEach(([n, p]) => m.append(h('div', { class: 'card' }, h('h3', {}, n), h('p', { class: 'def' }, p.desc), h('button', { class: 'ok', onclick: () => { p.fn(OVR); prune(OVR); lsSet('rafli-gm-ovr', OVR); pushCfg(true); toast('Preset diterapkan: ' + n); } }, 'Terapkan'))));
}
function paintBackup(m) {
  m.append(h('h2', {}, '💾 Cadangan & Impor'));
  const ta = h('textarea', { rows: 12, spellcheck: 'false' }); ta.value = JSON.stringify(OVR, null, 1);
  m.append(h('div', { class: 'card' }, h('h3', {}, 'Pengaturan GM (hanya yang diubah dari default)'), ta, h('div', { class: 'row' },
    h('button', { class: 'ok', onclick: () => { try { OVR = prune(JSON.parse(ta.value)); lsSet('rafli-gm-ovr', OVR); pushCfg(true); toast('Diimpor & dikirim'); } catch (e) { toast('JSON tidak valid'); } } }, 'Impor & kirim'),
    h('button', { onclick: () => { ta.value = JSON.stringify(OVR, null, 1); } }, 'Muat ulang'), h('button', { onclick: () => { navigator.clipboard && navigator.clipboard.writeText(ta.value).then(() => toast('Disalin'), () => toast('Salin manual')); } }, 'Salin'))));
  m.append(h('div', { class: 'card' }, h('h3', {}, 'Ringkasan'), h('p', { class: 'def' }, `${JSON.stringify(OVR).length} karakter · ${Object.keys(OVR).length} grup diubah`)));
}

// ---------- kotak koneksi ----------
function openConn() { $('cRoom').value = conn.room; $('cServer').value = conn.server; $('cRemote').checked = conn.remote; $('cAuto').checked = !!conn.auto; $('connBox').classList.remove('hidden'); updateConn(); }
$('btnConn').onclick = openConn; $('cClose').onclick = () => $('connBox').classList.add('hidden');
$('cNew').onclick = () => { $('cRoom').value = newRoom(); };
$('cCopy').onclick = () => { const v = $('cRoom').value; if (navigator.clipboard) navigator.clipboard.writeText(v).then(() => toast('Kode disalin'), () => toast(v)); else toast(v); };
$('cSave').onclick = () => { conn.room = $('cRoom').value.trim() || newRoom(); conn.server = $('cServer').value.trim() || DEFAULT_SERVER; conn.remote = $('cRemote').checked; conn.auto = $('cAuto').checked; lsSet('rafli-gm-conn', conn); connect(); link.send({ k: 'hello' }); pushCfg(true); $('connBox').classList.add('hidden'); toast('Tersambung ke ruang ' + conn.room); };
$('cResend').onclick = () => { pushCfg(true); toast('Pengaturan dikirim ulang'); };
setInterval(() => { if (conn.auto && link.status().remote === 'ok') link.send({ k: 'poll' }); }, 30000);

// ---------- mulai ----------
connect(); setSend('saved'); go('monitor'); link.send({ k: 'hello' }, { remote: false }); if (Object.keys(OVR).length) pushCfg(true);
window.__gm = { get OVR() { return OVR; }, eff, link, conn, cmd, setCfg, go };
