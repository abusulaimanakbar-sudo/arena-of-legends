// Konfigurasi game RAFLI PLAYSTATION — sumber tunggal. Dipakai oleh game & aplikasi GM.
// GM hanya menyimpan "override" (selisih dari default). Game = merge(DEFAULT_CFG, override).
export const DEFAULT_CFG = {
  eco: { basePrice: 5000, sessionSec: 16, layananBase: 20000, layananGrowth: 1.5, layananBonus: 0.1, trainBonus: 0.08, epBonus: 0.02, starBonus: 0.2, vipMult: 3, gamerMult: 1.15, memberBonus: 0.05, tipSat: 0.04, tipSatMin: 0.8, tipBaik: 0.04, kantinStep: 0.08, offlineRate: 0.5, offlineMaxHours: 8, franchiseDiv: 1500000, regVisits: [3, 8, 15], startMoney: 0, franchiseMoney: 25000 },
  consoles: [{ name: 'PS3 Slim', mult: 1, cost: 0 }, { name: 'PS4', mult: 1.8, cost: 60000 }, { name: 'PS4 Pro', mult: 2.8, cost: 220000 }, { name: 'PS5', mult: 4.6, cost: 800000 }, { name: 'PS5 Pro', mult: 7.5, cost: 2800000 }],
  tvs: [{ name: 'TV 32"', mult: 1, cost: 0, s: 0.8 }, { name: 'TV 43" 4K', mult: 1.2, cost: 45000, s: 1.0 }, { name: 'TV 55" OLED', mult: 1.45, cost: 170000, s: 1.2 }, { name: 'TV 65" OLED', mult: 1.8, cost: 600000, s: 1.4 }, { name: 'TV 77" Gaming', mult: 2.3, cost: 2000000, s: 1.62 }],
  sofas: [{ name: 'Sofa Biasa', cost: 0, pat: 1, tip: 0 }, { name: 'Sofa Kulit Premium', cost: 55000, pat: 1.3, tip: 0.06 }, { name: 'Sofa VIP + Bantal', cost: 320000, pat: 1.7, tip: 0.14 }],
  slots: [0, 0, 45000, 140000, 380000, 1100000, 3000000, 8000000, 20000000],
  menu: [
    { id: 'teh', name: 'Es Teh Manis', emoji: '🧋', price: 4000, cost: 1000, min: 1, on: 1 }, { id: 'goreng', name: 'Gorengan', emoji: '🍘', price: 3000, cost: 1000, min: 1, on: 1 },
    { id: 'kopi', name: 'Kopi Hitam', emoji: '☕', price: 5000, cost: 1500, min: 2, on: 1 }, { id: 'mie', name: 'Indomie Telor', emoji: '🍜', price: 9000, cost: 3500, min: 3, on: 1 }, { id: 'jeruk', name: 'Es Jeruk', emoji: '🍊', price: 5000, cost: 1500, min: 4, on: 1 },
  ],
  shop: {
    kantin: { costs: [90000, 350000, 1400000, 5000000], base: 9000000, growth: 1.8 }, mkt: { base: 50000, growth: 1.55 }, train: { base: 120000, growth: 1.6 },
    lobby: { costs: [70000, 300000, 1200000, 4000000] }, ac: { costs: [200000, 800000, 3200000] }, decor: { costs: [180000, 700000, 2800000] },
    kasir: { costs: [60000, 350000, 1800000] }, staff: { costs: [250000, 1400000, 7000000] }, cctv: { costs: [150000, 700000, 3000000] }, genset: { costs: [400000] },
  },
  branch: { costs: [6000000, 25000000, 90000000], names: ['Cabang Timur', 'Cabang Barat', 'Cabang Belakang'], mult: 0.3, lvlBonus: 0.1, upgBase: 3000000, upgGrowth: 1.7 },
  costs: { elecBase: 120, elecTier: 80, elecTv: 50, rentBase: 9000, rentStation: 6000, rentBranch: 25000, salStaff: 16000, salKasir: 5000, salKantin: 10000, salCctv: 3000, mktUpkeep: 2000, stickBase: 12000, stickTier: 0.5, elecPct: 0.03, upkeepRate: 0.012, tax: 0.06, salPct: 0.08, rentTier: 0.15 },
  rep: { ac: 0.55, decor: 0.45, snack: 0.12, lobby: 0.15, tier: 0.25, sat: 1.2 },
  cust: {
    arrivalBase: 7.5, arrivalMin: 0.9, mktArrival: 0.12, repBase: 0.65, repArrival: 0.15, hourRush: 1.5, hourNoon: 1.15, hourNight: 0.45, weekend: 1.3, rainMult: 0.75, rombonganMult: 1.6,
    patience: 55, patAc: 0.15, patLobby: 0.1, patStaff: 0.08, maxParties: 22, maxPending: 8, pairProb: 0.4, vipProb: 0.06, vipMinRep: 3, regBase: 0.12, regPer: 0.02, regMax: 0.5, regNew: 0.35,
    wPelajar: 1, wGamer: 2, wKaryawan: 1, gamerLen: 1.3, pelajarLen: 1.1, staffSession: 0.15,
    theft: 0.14, theftNakal: 0.5, cctvTheft: 0.28, staffTheft: 0.08, cctvCatch: 0.3, stickRage: 0.3, hangRate: 0.005, speedMin: 2.0, speedMax: 2.6,
  },
  time: { hourSec: 10, startHour: 9 },
  hh: { duration: 40, cooldown: 130, arrivalMult: 2, incomeMult: 1.5 },
  events: {
    min: 70, max: 150,
    list: {
      turnamen: { on: 1, w: 16, dur: 35, mult: 1.8 }, rombongan: { on: 1, w: 16, dur: 25, count: 4 }, streamer: { on: 1, w: 11 }, ultah: { on: 1, w: 12, bonus: 0.6 },
      hujan: { on: 1, w: 19, dur: 80 }, listrik: { on: 1, w: 14, dur: 22 }, promo: { on: 1, w: 12, dur: 30, mult: 1.4 },
    },
  },
  quest: { earnBase: 30000, earnGrowth: 1.75, serveBase: 8, servePer: 3, rewardBase: 40000, rewardGrowth: 1.6, rewardIps: 4 },
  ach: { rewardMult: 1 },
  audio: { music: 1, sfx: 1 },
  text: {
    names: ['Rafi', 'Dimas', 'Putri', 'Andi', 'Siti', 'Bayu', 'Nanda', 'Tono', 'Wulan', 'Fajar', 'Rina', 'Yoga', 'Dewi', 'Kevin', 'Sari', 'Bimo', 'Lutfi', 'Citra', 'Gilang', 'Mira', 'Eko', 'Ayu', 'Rendra', 'Salsa', 'Joko', 'Tika', 'Hendra', 'Vina', 'Aldi', 'Nisa', 'Reza', 'Dinda', 'Farhan', 'Intan', 'Arga', 'Lia'],
    lines: {
      greet: ['Permisi mas, masih ada slot?', 'Halo kak, mau main PS!', 'Wah, tokonya makin keren ya', 'Bang, satu jam dulu!', 'Sepi apa rame nih hari ini?'],
      waitChat: ['Lama ya antrinya?', 'Lu biasa main apa bro?', 'Gue mau main FIFA nih', 'Semalam gue menang 5-0 loh', 'Sambil nunggu ngemil dulu ah', 'Eh itu yang main jago banget', 'Kita satu tim aja gimana?', 'Hp gue mau abis baterai...', 'Wah ramai banget hari ini', 'Dulu PS3 doang, sekarang PS5 coy'],
      waitAnnoy: ['Lama amat sih giliranku', 'Duh kapan kosongnya?', 'Aduh pegal berdiri...', 'Mas, masih lama nggak?'],
      win: ['GOOOOL!!', 'Yesss menang!', 'Rasain lu!', 'Ez banget bro!', 'Combo maut!', 'Satu kosong!', 'Mantap jiwa!', 'Juara dunia!'],
      lose: ['Yah kalah...', 'Anjir curang nih!', 'Kok bisa sih?!', 'Lagi lagi lagi!', 'Stiknya error nih!', 'Lag banget ini!', 'Sial, dikit lagi!'],
      rage: ['AAARGH!!', 'Rematch SEKARANG!', 'Nggak terima gue!', 'Ampun dah game ini!', 'Sialan lu!!'],
      shout: ['WOOOY BERISIK!', 'PELAN-PELAN DONG!', 'Gooool lagi!', 'Awas di belakangmu!', 'Tembak tembak!'],
      neighborReact: ['Berisik woi!', 'Santai bro...', 'Wah seru tuh', 'Hahaha dia kalah', 'Mantap bro!'],
      food: ['Mas, Indomie telor satu!', 'Es teh manis ya kak', 'Kopi hitam satu, nggak pakai gula', 'Gorengan sepuluh ribu!', 'Es jeruk dingin ya', 'Laper nih, pesen mie dulu'],
      eat: ['Enak banget!', 'Mantul indomienya', 'Seger banget esnya', 'Nyam nyam...', 'Gorengannya masih panas!', 'Kopinya pas!'],
      thanks: ['Makasih ya mas!', 'Seru banget, besok balik lagi!', 'Tokonya bersih, enak!', 'Pelayanannya ramah banget', 'Mantap, bintang lima!'],
      tip: ['Ini buat kasirnya ya', 'Kembaliannya ambil aja', 'Tip buat adek!', 'Semangat jualannya!'],
      kind: ['Silakan dulu, aku masih bisa nunggu', 'Sini aku traktir minum', 'Minjem stiknya? Boleh kok', 'Tenang bro, kalah menang biasa'],
      prank: ['Hehe... colek dikit', 'Pinjem stiknya ya (nggak balik)', 'Aku sembunyiin remote ah', 'Ssst, jangan bilang kasir...', 'Cobain minuman temen ah'],
      caught: ['Eh ketahuan!', 'Bercanda doang kok!', 'Maaf maaf...'],
      broke: ['Waduh... stiknya patah', 'Bukan salah gue ya!', 'Maaf mas, nanti ganti!'],
      pay: ['Bayar dulu ya', 'Totalnya berapa mas?', 'Pakai QRIS bisa?', 'Ini uangnya pas'],
      hungry: ['Perutku bunyi nih', 'Laper...', 'Ada yang jual mie?'],
      bored: ['Ngantuk...', 'Zzz...', 'Antrian panjang amat'],
      member: ['Aku member Gold lho!', 'Langganan sini dari dulu', 'Ada diskon member nggak?'],
      rain: ['Wah hujan deras!', 'Untung udah sampai', 'Payung gue ketinggalan...'],
      blackout: ['Yaah mati lampu!', 'Lagi seru-serunya!', 'Genset mana genset?!'],
      birthday: ['Happy birthday to you~', 'Selamat ulang tahun, Rafi!', 'Tiup lilinnya!'],
    },
  },
};

// ---------- util ----------
export const clone = (o) => JSON.parse(JSON.stringify(o));
export function getPath(o, p) { return p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o); }
export function setPath(o, p, v) { const ks = p.split('.'); let a = o; for (let i = 0; i < ks.length - 1; i++) { if (typeof a[ks[i]] !== 'object' || a[ks[i]] === null) a[ks[i]] = {}; a = a[ks[i]]; } a[ks[ks.length - 1]] = v; return o; }
export function delPath(o, p) { const ks = p.split('.'); let a = o; for (let i = 0; i < ks.length - 1; i++) { if (!a || typeof a[ks[i]] !== 'object') return o; a = a[ks[i]]; } if (a) delete a[ks[ks.length - 1]]; return o; }
// merge: objek digabung rekursif, array/primitif diganti utuh
export function merge(base, ovr) { if (ovr === undefined) return clone(base); if (Array.isArray(ovr) || typeof ovr !== 'object' || ovr === null || typeof base !== 'object' || base === null || Array.isArray(base)) return clone(ovr); const out = {}; for (const k of new Set([...Object.keys(base), ...Object.keys(ovr)])) out[k] = k in ovr ? merge(base[k], ovr[k]) : clone(base[k]); return out; }
export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---------- skema untuk UI GM ----------
const N = (p, label, min, max, step, unit = '', hint = '') => ({ p, label, type: 'num', min, max, step, unit, hint });
const T = (p, label) => ({ p, label, type: 'text' });
export const SCHEMA = [
  { id: 'eco', icon: '💰', title: 'Ekonomi Dasar', fields: [
    N('eco.basePrice', 'Harga dasar per orang / jam (PS3 level 0)', 500, 200000, 100, 'Rp', 'Dasar semua pendapatan sewa PS'), N('eco.sessionSec', 'Lama 1 sesi main (detik nyata)', 4, 120, 1, 'dtk'),
    N('eco.layananBase', 'Biaya Level Layanan (dasar)', 1000, 5000000, 1000, 'Rp'), N('eco.layananGrowth', 'Pertumbuhan biaya Level Layanan', 1.05, 3, 0.05, '×'), N('eco.layananBonus', 'Bonus pendapatan per Level Layanan', 0, 1, 0.01, '×'),
    N('eco.trainBonus', 'Bonus Pelatihan per level', 0, 1, 0.01, '×'), N('eco.epBonus', 'Bonus permanen per episode', 0, 0.5, 0.005, '×'), N('eco.starBonus', 'Bonus per Bintang Franchise', 0, 2, 0.05, '×'),
    N('eco.vipMult', 'Pengali pendapatan pelanggan VIP', 1, 20, 0.5, '×'), N('eco.gamerMult', 'Pengali pendapatan tipe Gamer', 0.5, 5, 0.05, '×'), N('eco.memberBonus', 'Bonus pendapatan per level member', 0, 1, 0.01, '×'),
    N('eco.tipSat', 'Tip tambahan bila kepuasan tinggi', 0, 1, 0.01, '×'), N('eco.tipSatMin', 'Batas kepuasan untuk tip tambahan', 0, 1, 0.05), N('eco.tipBaik', 'Tip tambahan per sifat "baik"', 0, 1, 0.01, '×'),
    N('eco.kantinStep', 'Kenaikan harga menu per level kantin', 0, 1, 0.01, '×'), N('eco.offlineRate', 'Rasio pendapatan saat offline', 0, 2, 0.05, '×'), N('eco.offlineMaxHours', 'Batas jam pendapatan offline', 0, 72, 1, 'jam'),
    N('eco.franchiseDiv', 'Pembagi Bintang Franchise (bintang = √(pendapatan ÷ ini))', 10000, 1e9, 10000, 'Rp'), N('eco.startMoney', 'Uang awal game baru', 0, 1e9, 1000, 'Rp'), N('eco.franchiseMoney', 'Uang awal setelah Franchise', 0, 1e9, 1000, 'Rp'),
  ] },
  { id: 'items', icon: '🎮', title: 'Konsol, TV, Sofa, Slot', tables: [
    { p: 'consoles', title: 'Konsol', cols: [['name', 'Nama', 'text'], ['mult', 'Pengali', 'num', 0.1], ['cost', 'Harga', 'num', 1000]] },
    { p: 'tvs', title: 'TV', cols: [['name', 'Nama', 'text'], ['mult', 'Pengali', 'num', 0.05], ['cost', 'Harga', 'num', 1000], ['s', 'Ukuran 3D', 'num', 0.05]] },
    { p: 'sofas', title: 'Sofa', cols: [['name', 'Nama', 'text'], ['cost', 'Harga', 'num', 1000], ['pat', 'Kesabaran ×', 'num', 0.05], ['tip', 'Tip', 'num', 0.01]] },
  ], lists: [{ p: 'slots', title: 'Harga membuka slot 1–9', step: 1000 }] },
  { id: 'menu', icon: '🍜', title: 'Menu Kantin', tables: [{ p: 'menu', title: 'Menu (id & emoji tetap; model 3D mengikuti id)', cols: [['name', 'Nama', 'text'], ['emoji', 'Emoji', 'text'], ['price', 'Harga jual', 'num', 500], ['cost', 'Modal', 'num', 100], ['min', 'Buka di lv', 'num', 1], ['on', 'Aktif (1/0)', 'num', 1]] }] },
  { id: 'shop', icon: '🏪', title: 'Biaya Upgrade Toko & Staf', fields: [
    N('shop.mkt.base', 'Promosi — biaya dasar', 1000, 1e8, 1000, 'Rp'), N('shop.mkt.growth', 'Promosi — pertumbuhan', 1.05, 3, 0.05, '×'), N('shop.train.base', 'Pelatihan — biaya dasar', 1000, 1e8, 1000, 'Rp'), N('shop.train.growth', 'Pelatihan — pertumbuhan', 1.05, 3, 0.05, '×'),
    N('shop.kantin.base', 'Kantin — biaya dasar setelah level 4', 1000, 1e9, 10000, 'Rp'), N('shop.kantin.growth', 'Kantin — pertumbuhan', 1.05, 3, 0.05, '×'),
  ], lists: [{ p: 'shop.kantin.costs', title: 'Kantin — biaya level 1–4', step: 1000 }, { p: 'shop.lobby.costs', title: 'Ruang Tunggu — biaya tiap level', step: 1000 }, { p: 'shop.ac.costs', title: 'AC — biaya tiap level', step: 1000 }, { p: 'shop.decor.costs', title: 'Dekorasi — biaya tiap level', step: 1000 },
    { p: 'shop.kasir.costs', title: 'Kasir — biaya tiap level', step: 1000 }, { p: 'shop.staff.costs', title: 'Pegawai — biaya tiap pegawai', step: 1000 }, { p: 'shop.cctv.costs', title: 'CCTV — biaya tiap level', step: 1000 }, { p: 'shop.genset.costs', title: 'Genset — biaya', step: 1000 }] },
  { id: 'branch', icon: '🏢', title: 'Cabang', fields: [N('branch.mult', 'Bonus pendapatan tiap cabang', 0, 5, 0.05, '×'), N('branch.lvlBonus', 'Bonus per level upgrade cabang', 0, 2, 0.05, '×'), N('branch.upgBase', 'Biaya upgrade cabang (dasar)', 10000, 1e9, 10000, 'Rp'), N('branch.upgGrowth', 'Pertumbuhan biaya upgrade', 1.05, 4, 0.05, '×')],
    lists: [{ p: 'branch.costs', title: 'Harga membangun cabang 1–3', step: 100000 }], textLists: [{ p: 'branch.names', title: 'Nama cabang' }] },
  { id: 'costs', icon: '📊', title: 'Biaya Operasional', fields: [
    N('costs.elecBase', 'Listrik per sesi (dasar)', 0, 100000, 10, 'Rp'), N('costs.elecTier', 'Listrik tambahan per tingkat konsol', 0, 100000, 10, 'Rp'), N('costs.elecTv', 'Listrik tambahan per tingkat TV', 0, 100000, 10, 'Rp'),
    N('costs.rentBase', 'Sewa tempat per hari (dasar)', 0, 1e7, 500, 'Rp'), N('costs.rentStation', 'Sewa tambahan per stasiun / hari', 0, 1e7, 500, 'Rp'), N('costs.rentBranch', 'Sewa tambahan per cabang / hari', 0, 1e8, 1000, 'Rp'),
    N('costs.salStaff', 'Gaji pegawai per hari', 0, 1e7, 500, 'Rp'), N('costs.salKasir', 'Gaji kasir per level / hari', 0, 1e7, 500, 'Rp'), N('costs.salKantin', 'Gaji koki & pelayan kantin / hari', 0, 1e7, 500, 'Rp'), N('costs.salCctv', 'Biaya CCTV per level / hari', 0, 1e7, 500, 'Rp'), N('costs.mktUpkeep', 'Biaya iklan per level / hari', 0, 1e7, 500, 'Rp'),
    N('costs.elecPct', 'Listrik tambahan (% dari pendapatan sesi)', 0, 0.5, 0.005, '×'), N('costs.upkeepRate', 'Perawatan & penyusutan aset per hari (% nilai aset)', 0, 0.2, 0.001, '×'), N('costs.tax', 'Pajak usaha (% dari pendapatan kotor harian)', 0, 0.6, 0.005, '×'), N('costs.salPct', 'Gaji & bonus SDM (% pendapatan kotor, dikali jumlah karyawan)', 0, 0.6, 0.005, '×'), N('costs.rentTier', 'Sewa naik per tingkat konsol+TV stasiun', 0, 2, 0.01, '×'),
    N('costs.stickBase', 'Ganti stik rusak (dasar)', 0, 1e6, 500, 'Rp'), N('costs.stickTier', 'Tambahan biaya stik per tingkat konsol', 0, 5, 0.1, '×'),
  ] },
  { id: 'cust', icon: '🧍', title: 'Pelanggan & Kedatangan', fields: [
    N('cust.arrivalBase', 'Jeda kedatangan dasar', 0.5, 60, 0.5, 'dtk'), N('cust.arrivalMin', 'Jeda kedatangan minimum', 0.2, 20, 0.1, 'dtk'), N('cust.mktArrival', 'Tambahan kedatangan per level Promosi', 0, 2, 0.01, '×'),
    N('cust.repBase', 'Pengaruh reputasi: dasar', 0, 3, 0.05), N('cust.repArrival', 'Pengaruh reputasi: per bintang', 0, 2, 0.05),
    N('cust.hourRush', 'Pengali jam ramai (16–22)', 0, 10, 0.05, '×'), N('cust.hourNoon', 'Pengali siang (12–16)', 0, 10, 0.05, '×'), N('cust.hourNight', 'Pengali malam (22–06)', 0, 10, 0.05, '×'), N('cust.weekend', 'Pengali akhir pekan', 0, 10, 0.05, '×'), N('cust.rainMult', 'Pengali saat hujan', 0, 5, 0.05, '×'), N('cust.rombonganMult', 'Pengali saat rombongan', 0, 10, 0.1, '×'),
    N('cust.patience', 'Kesabaran antre dasar', 5, 600, 1, 'dtk'), N('cust.patAc', 'Kesabaran +/level AC', 0, 2, 0.01, '×'), N('cust.patLobby', 'Kesabaran +/level Ruang Tunggu', 0, 2, 0.01, '×'), N('cust.patStaff', 'Kesabaran +/pegawai', 0, 2, 0.01, '×'),
    N('cust.maxParties', 'Maks. rombongan di toko', 2, 60, 1), N('cust.maxPending', 'Maks. rombongan menunggu/datang', 1, 30, 1), N('cust.pairProb', 'Peluang datang berdua', 0, 1, 0.05), N('cust.vipProb', 'Peluang pelanggan VIP', 0, 1, 0.01), N('cust.vipMinRep', 'Reputasi minimal untuk VIP', 1, 5, 0.1),
    N('cust.regBase', 'Peluang member lama kembali (dasar)', 0, 1, 0.01), N('cust.regPer', 'Tambahan per member terdaftar', 0, 0.2, 0.005), N('cust.regMax', 'Peluang member kembali maksimum', 0, 1, 0.05), N('cust.regNew', 'Peluang pelanggan baru jadi member', 0, 1, 0.05),
    N('cust.wPelajar', 'Bobot tipe Pelajar', 0, 20, 1), N('cust.wGamer', 'Bobot tipe Gamer', 0, 20, 1), N('cust.wKaryawan', 'Bobot tipe Karyawan', 0, 20, 1), N('cust.gamerLen', 'Lama main Gamer ×', 0.2, 5, 0.05), N('cust.pelajarLen', 'Lama main Pelajar ×', 0.2, 5, 0.05), N('cust.staffSession', 'Sesi lebih cepat per pegawai', 0, 1, 0.01, '×'),
    N('cust.speedMin', 'Kecepatan jalan NPC (min)', 0.5, 8, 0.1, 'm/dtk'), N('cust.speedMax', 'Kecepatan jalan NPC (maks)', 0.5, 8, 0.1, 'm/dtk'),
  ] },
  { id: 'risk', icon: '😈', title: 'Kenakalan, Kerusakan & Reputasi', fields: [
    N('cust.theft', 'Peluang kabur tanpa bayar (× sifat nakal)', 0, 1, 0.01), N('cust.theftNakal', 'Sifat nakal minimal untuk kabur', 0, 1, 0.05), N('cust.cctvTheft', 'Pengurang kabur per level CCTV', 0, 1, 0.01), N('cust.staffTheft', 'Pengurang kabur per pegawai', 0, 1, 0.01), N('cust.cctvCatch', 'Peluang tertangkap CCTV per level', 0, 1, 0.01),
    N('cust.stickRage', 'Peluang stik rusak saat emosi', 0, 1, 0.01), N('cust.hangRate', 'Laju konsol hang (per detik)', 0, 0.2, 0.001),
    N('rep.ac', 'Reputasi per level AC', 0, 3, 0.05), N('rep.decor', 'Reputasi per level Dekorasi', 0, 3, 0.05), N('rep.snack', 'Reputasi per level Kantin (maks 5)', 0, 3, 0.01), N('rep.lobby', 'Reputasi per level Ruang Tunggu', 0, 3, 0.01), N('rep.tier', 'Reputasi per rata-rata tingkat konsol', 0, 3, 0.01), N('rep.sat', 'Pengaruh kepuasan pada reputasi', 0, 5, 0.1),
  ] },
  { id: 'time', icon: '⏱', title: 'Waktu, Happy Hour & Kecepatan', fields: [
    N('time.hourSec', 'Detik nyata per 1 jam dalam game (hari = ×24)', 1, 120, 1, 'dtk'), N('time.startHour', 'Jam mulai game baru', 0, 23, 1, 'jam'),
    N('hh.duration', 'Happy Hour — durasi', 5, 600, 5, 'dtk'), N('hh.cooldown', 'Happy Hour — jeda', 0, 3600, 10, 'dtk'), N('hh.arrivalMult', 'Happy Hour — pengali kedatangan', 1, 20, 0.5, '×'), N('hh.incomeMult', 'Happy Hour — pengali pendapatan', 1, 20, 0.1, '×'),
  ] },
  { id: 'events', icon: '🎉', title: 'Acara & Momen', fields: [
    N('events.min', 'Jeda acara acak minimum', 10, 1800, 5, 'dtk'), N('events.max', 'Jeda acara acak maksimum', 10, 3600, 5, 'dtk'),
    ...Object.entries({ turnamen: 'Turnamen', rombongan: 'Rombongan sekolah', streamer: 'Streamer VIP', ultah: 'Ulang tahun', hujan: 'Hujan', listrik: 'Listrik padam', promo: 'Diskon viral' }).flatMap(([k, n]) => [N(`events.list.${k}.on`, `${n} — aktif (1/0)`, 0, 1, 1), N(`events.list.${k}.w`, `${n} — bobot peluang`, 0, 100, 1)]),
    N('events.list.turnamen.dur', 'Turnamen — durasi', 5, 600, 5, 'dtk'), N('events.list.turnamen.mult', 'Turnamen — pengali pendapatan', 1, 20, 0.1, '×'), N('events.list.rombongan.dur', 'Rombongan — durasi', 5, 600, 5, 'dtk'), N('events.list.rombongan.count', 'Rombongan — jumlah kelompok', 1, 20, 1),
    N('events.list.ultah.bonus', 'Ulang tahun — bonus pendapatan', 0, 5, 0.1, '×'), N('events.list.hujan.dur', 'Hujan — durasi', 10, 900, 5, 'dtk'), N('events.list.listrik.dur', 'Listrik padam — durasi', 5, 300, 1, 'dtk'), N('events.list.promo.dur', 'Diskon viral — durasi', 5, 600, 5, 'dtk'), N('events.list.promo.mult', 'Diskon viral — pengali', 1, 20, 0.1, '×'),
  ] },
  { id: 'quest', icon: '📋', title: 'Misi, Prestasi & Hadiah', fields: [
    N('quest.earnBase', 'Misi "hasilkan uang": target dasar', 1000, 1e9, 1000, 'Rp'), N('quest.earnGrowth', 'Pertumbuhan target per episode', 1.05, 4, 0.05, '×'), N('quest.serveBase', 'Misi layani: dasar', 1, 1000, 1), N('quest.servePer', 'Misi layani: tambahan per episode', 0, 100, 1),
    N('quest.rewardBase', 'Hadiah episode (dasar)', 0, 1e9, 1000, 'Rp'), N('quest.rewardGrowth', 'Pertumbuhan hadiah per episode', 1, 4, 0.05, '×'), N('quest.rewardIps', 'Hadiah minimal = pendapatan/dtk × 60 ×', 0, 100, 0.5), N('ach.rewardMult', 'Pengali hadiah prestasi', 0, 100, 0.1, '×'),
  ] },
  { id: 'audio', icon: '🔊', title: 'Suara', fields: [N('audio.music', 'Volume musik latar (pengali)', 0, 2, 0.05), N('audio.sfx', 'Volume efek suara (pengali)', 0, 2, 0.05)] },
  { id: 'text', icon: '💬', title: 'Nama & Dialog NPC', textLists: [{ p: 'text.names', title: 'Daftar nama pelanggan' }, ...Object.keys(DEFAULT_CFG.text.lines).map((k) => ({ p: 'text.lines.' + k, title: 'Dialog: ' + k }))] },
];

// ---------- data game yang boleh diubah GM (state) ----------
export const STATE_FIELDS = [
  ['money', 'Uang', 1000], ['stars', 'Bintang Franchise', 1], ['ep', 'Episode (0 = episode 1)', 1], ['day', 'Hari ke-', 1], ['clock', 'Jam (0–24)', 0.5], ['sat', 'Kepuasan (0–1)', 0.05], ['served', 'Pelanggan dilayani', 1], ['life', 'Total penghasilan seumur hidup', 10000],
  ['mkt', 'Level Promosi', 1], ['train', 'Level Pelatihan', 1], ['snack', 'Level Kantin', 1], ['ac', 'Level AC', 1], ['decor', 'Level Dekorasi', 1], ['lobby', 'Level Ruang Tunggu', 1], ['kasir', 'Level Kasir', 1], ['staff', 'Jumlah Pegawai', 1], ['cctv', 'Level CCTV', 1], ['genset', 'Genset (0/1)', 1],
];
