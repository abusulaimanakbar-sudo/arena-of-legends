// Nama, sifat, dan dialog NPC (bahasa gaul Indonesia)
export const NAMES = ['Rafi', 'Dimas', 'Putri', 'Andi', 'Siti', 'Bayu', 'Nanda', 'Tono', 'Wulan', 'Fajar', 'Rina', 'Yoga', 'Dewi', 'Kevin', 'Sari', 'Bimo', 'Lutfi', 'Citra', 'Gilang', 'Mira', 'Eko', 'Ayu', 'Rendra', 'Salsa', 'Joko', 'Tika', 'Hendra', 'Vina', 'Aldi', 'Nisa', 'Reza', 'Dinda', 'Farhan', 'Intan', 'Arga', 'Lia'];
export const pick = (a) => a[Math.floor(Math.random() * a.length)];
export function newTrait() {
  const r = Math.random();
  const t = { nakal: Math.random() < 0.22 ? 0.6 + Math.random() * 0.4 : Math.random() * 0.3, baik: Math.random() < 0.28 ? 0.6 + Math.random() * 0.4 : Math.random() * 0.4, emosi: Math.random() < 0.25 ? 0.6 + Math.random() * 0.4 : Math.random() * 0.4, rame: Math.random() < 0.4 ? 0.6 + Math.random() * 0.4 : Math.random() * 0.3, lapar: Math.random() };
  t.label = t.nakal > 0.6 ? '😈 Nakal' : t.emosi > 0.6 ? '😤 Emosian' : t.baik > 0.6 ? '😇 Baik hati' : t.rame > 0.6 ? '🗣 Ramai' : '🙂 Santai'; void r; return t;
}
export const LINES = {
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
};
