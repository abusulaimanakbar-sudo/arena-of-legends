// Penghubung realtime antara GAME dan aplikasi GM.
//  1) Lokal  : BroadcastChannel + event storage (instan, perangkat/origin yang sama)
//  2) Relay  : ntfy (pub/sub HTTP) untuk aplikasi/perangkat terpisah. Kode ruang = rahasia topik.
export const DEFAULT_SERVER = 'https://ntfy.sh';
const MAXLEN = 3300;
const uid = () => Math.random().toString(36).slice(2, 10);
export const newRoom = () => 'rafli-' + Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);

export function createLink({ role, onMsg, onStatus }) {
  const me = uid(); let seq = 0; const seen = new Set(); const parts = new Map();
  let room = '', server = DEFAULT_SERVER, remoteOn = true, bc = null, abort = null, retry = 0, closed = false, subTimer = null;
  const st = { local: false, remote: 'off', last: 0, error: '' };
  const emit = () => onStatus && onStatus({ ...st });
  const topic = (suffix) => `${room}-${suffix}`;
  const outTopic = () => topic(role === 'gm' ? 'g' : 'p'), inTopic = () => topic(role === 'gm' ? 'p' : 'g');

  function deliver(raw) {
    let m; try { m = JSON.parse(raw); } catch (e) { return; } if (!m || m.from === role) return;
    if (m.k === 'part') { const a = parts.get(m.id) || { n: m.n, d: [], got: 0 }; if (a.d[m.i] === undefined) { a.d[m.i] = m.d; a.got++; } parts.set(m.id, a); if (a.got === a.n) { parts.delete(m.id); deliver(a.d.join('')); } return; }
    const key = m.u + ':' + m.s; if (seen.has(key)) return; seen.add(key); if (seen.size > 400) seen.delete(seen.values().next().value);
    st.last = Date.now(); emit(); try { onMsg(m); } catch (e) { console.error(e); }
  }
  // ---- lokal ----
  function openLocal() {
    if (bc) { try { bc.close(); } catch (e) { /* abaikan */ } bc = null; }
    st.local = false; if (!room) return;
    try { if (typeof BroadcastChannel !== 'undefined') { bc = new BroadcastChannel('rafli-' + room); bc.onmessage = (e) => deliver(e.data); st.local = true; } } catch (e) { /* abaikan */ }
    if (typeof addEventListener === 'function' && !openLocal.bound) { openLocal.bound = true; addEventListener('storage', (e) => { if (e.key && e.key === 'rafli-msg-' + room && e.newValue) deliver(e.newValue); }); st.local = true; }
  }
  function sendLocal(raw, store = true) { try { if (bc) bc.postMessage(raw); } catch (e) { /* abaikan */ } if (store && !bc) { try { if (typeof localStorage !== 'undefined') localStorage.setItem('rafli-msg-' + room, raw); } catch (e) { /* abaikan */ } } }
  // ---- relay: antrean terbatas laju, gabungkan pesan ber-kunci sama ----
  const queue = []; let lastPub = 0, pumping = false;
  async function publishRaw(raw) { const r = await fetch(`${server}/${outTopic()}`, { method: 'POST', body: raw }); if (!r.ok) throw new Error('HTTP ' + r.status); }
  async function pump() {
    if (pumping) return; pumping = true;
    while (queue.length && !closed) {
      const wait = lastPub + 1100 - Date.now(); if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      const item = queue.shift(); try { await publishRaw(item.raw); st.error = ''; if (st.remote === 'error') st.remote = 'ok'; } catch (e) { st.error = String(e.message || e); st.remote = 'error'; emit(); if (item.tries < 3) { item.tries++; queue.unshift(item); await new Promise((r) => setTimeout(r, 2500)); } }
      lastPub = Date.now(); emit();
    }
    pumping = false;
  }
  function queueRemote(m, co) {
    const raw = JSON.stringify(m); const items = [];
    if (raw.length <= MAXLEN) items.push({ raw, co, tries: 0 });
    else { const id = uid(), n = Math.ceil(raw.length / MAXLEN); for (let i = 0; i < n; i++) items.push({ raw: JSON.stringify({ k: 'part', id, i, n, d: raw.slice(i * MAXLEN, (i + 1) * MAXLEN), from: role, u: me, s: ++seq }), co: null, tries: 0 }); }
    if (co) for (let i = queue.length - 1; i >= 0; i--) if (queue[i].co === co) queue.splice(i, 1);
    queue.push(...items); pump();
  }
  // ---- relay: langganan stream NDJSON ----
  async function subscribe() {
    if (closed || !room || !remoteOn) { st.remote = 'off'; emit(); return; }
    if (abort) abort.abort(); abort = new AbortController(); const my = abort; const tp = inTopic(); const key = 'rafli-since-' + tp;
    st.remote = 'connecting'; emit();
    try {
      const since = (typeof localStorage !== 'undefined' && localStorage.getItem(key)) || '12h';
      const r = await fetch(`${server}/${tp}/json?since=${encodeURIComponent(since)}`, { signal: my.signal }); if (!r.ok) throw new Error('HTTP ' + r.status);
      st.remote = 'ok'; st.error = ''; retry = 0; emit(); const rd = r.body.getReader(); const dec = new TextDecoder(); let buf = '';
      for (;;) { const { value, done } = await rd.read(); if (done) break; buf += dec.decode(value, { stream: true }); let i; while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue; try { const ev = JSON.parse(line); if (ev.event === 'message') { try { localStorage.setItem(key, ev.id); } catch (e) { /* abaikan */ } deliver(ev.message); } else if (ev.event === 'keepalive' || ev.event === 'open') { st.remote = 'ok'; emit(); } } catch (e) { /* baris rusak */ } } }
    } catch (e) { if (my.signal.aborted) return; st.remote = 'error'; st.error = String(e.message || e); emit(); }
    if (closed || my.signal.aborted) return; retry = Math.min(retry + 1, 6); clearTimeout(subTimer); subTimer = setTimeout(subscribe, Math.min(30000, 1500 * 2 ** retry));
  }
  const api = {
    configure({ room: r, server: s, remote }) { const changed = r !== room || (s || DEFAULT_SERVER) !== server || remote !== remoteOn; room = r || ''; server = (s || DEFAULT_SERVER).replace(/\/+$/, ''); remoteOn = remote !== false; if (!changed) return; openLocal(); clearTimeout(subTimer); if (abort) abort.abort(); retry = 0; if (room && remoteOn && typeof fetch === 'function') subscribe(); else { st.remote = 'off'; } emit(); },
    // opts.co = kunci penggabungan; opts.remote=false -> hanya lokal
    send(msg, opts = {}) { if (!room) return false; const m = { ...msg, from: role, u: me, s: ++seq, t: Date.now() }; const raw = JSON.stringify(m); sendLocal(raw, opts.store !== false); if (opts.remote !== false && remoteOn && typeof fetch === 'function') queueRemote(m, opts.co); return true; },
    status: () => ({ ...st }), get room() { return room; }, get server() { return server; },
    close() { closed = true; if (abort) abort.abort(); clearTimeout(subTimer); if (bc) bc.close(); },
  };
  return api;
}
