import type { LoreNoteItem } from '../../game/progression/ProgressionController';

export const AWAKENING_LORE_NOTES: readonly LoreNoteItem[] = [
  {
    id: 'lore_01',
    islandId: 'stasis_shrine',
    xp: 10,
    title: { id: 'Catatan I: Mengapa Python?', en: 'Note I: Why Python?' },
    body: {
      id: 'Para Arsitek menamai bahasa mesin Aetheria dari grup komedi Monty Python, bukan dari ular. Kode yang baik harus jelas dibaca manusia maupun robot.',
      en: 'The Architects named Aetheria’s language after the Monty Python comedy troupe, not a snake. Clear code speaks to humans and robots alike.',
    },
    position: [-2, 1, 3],
  },
  {
    id: 'lore_02',
    islandId: 'stasis_shrine',
    xp: 10,
    title: { id: 'Catatan II: Kesunyian', en: 'Note II: The Silence' },
    body: {
      id: 'Ketika Code Core retak, mesin-mesin tidak hancur — mereka hanya kehilangan daftar instruksinya dan tertidur menunggu Arsitek baru.',
      en: 'When the Code Core cracked, machines did not break — they merely lost their instructions and fell asleep.',
    },
    position: [3, 1, -2],
  },
  {
    id: 'lore_03',
    islandId: 'beacon_point',
    xp: 10,
    title: { id: 'Catatan III: Suar Pertama', en: 'Note III: The First Beacon' },
    body: {
      id: 'Tanda pagar # adalah ruang catatan Arsitek. Python melewatinya, tetapi rekan kerjamu di masa depan akan berterima kasih karenanya.',
      en: 'The # symbol marks an Architect’s margin note. Python skips it, but future builders rely on it.',
    },
    position: [18, 2, 4],
  },
  {
    id: 'lore_04',
    islandId: 'supply_grove',
    xp: 10,
    title: { id: 'Catatan IV: Kotak Bernama', en: 'Note IV: Labeled Boxes' },
    body: {
      id: 'Satu variabel seperti kotak penyimpanan berlabel. Memberinya nama jelas seperti `jarak` lebih aman daripada `x` saat jembatan harus dibangun.',
      en: 'A variable acts like a labeled crate. Naming it `jarak` instead of `x` keeps bridges safe.',
    },
    position: [34, 1, -4],
  },
  {
    id: 'lore_05',
    islandId: 'supply_grove',
    xp: 10,
    title: { id: 'Catatan V: Teks dan Angka', en: 'Note V: Text vs Numbers' },
    body: {
      id: 'Mesin pemindai membaca simbol sebagai teks `"12"`. Sebelum berhitung, ubah dulu dengan `int()` agar tidak menimbulkan TypeError.',
      en: 'Scanners read symbols as text `"12"`. Convert with `int()` before arithmetic.',
    },
    position: [39, 1, 6],
  },
  {
    id: 'lore_06',
    islandId: 'gatehouse_rock',
    xp: 10,
    title: { id: 'Catatan VI: Dua Sama Dengan', en: 'Note VI: Double Equals' },
    body: {
      id: 'Kakek Tamo sering berpesan: satu `=` mengisi kotak, dua `==` menanyakan apakah dua nilai sama.',
      en: 'Old Tamo’s rule: single `=` stores a value; double `==` asks whether two values match.',
    },
    position: [52, 2, -3],
  },
  {
    id: 'lore_07',
    islandId: 'terrace_farm',
    xp: 10,
    title: { id: 'Catatan VII: Kekuatan Indentasi', en: 'Note VII: Power of Indentation' },
    body: {
      id: 'Di Python, empat spasi di awal baris bukan hiasan. Indentasi menentukan baris mana yang berada di dalam `if`, `for`, atau `def`.',
      en: 'Four leading spaces are not decoration in Python — indentation defines which lines live inside `if`, `for`, or `def`.',
    },
    position: [68, 3, 5],
  },
  {
    id: 'lore_08',
    islandId: 'terrace_farm',
    xp: 10,
    title: { id: 'Catatan VIII: Anti-Pengulangan', en: 'Note VIII: DRY Principle' },
    body: {
      id: 'BOLT menulis di dinding lumbung: "Jika kamu mengetik baris yang sama lebih dari tiga kali, saatnya memakai loop atau fungsi."',
      en: 'BOLT chalked on the barn wall: "If you type the same line more than three times, use a loop or function."',
    },
    position: [74, 3, -6],
  },
  {
    id: 'lore_09',
    islandId: 'bolts_workshop',
    xp: 10,
    title: { id: 'Catatan IX: Mengembalikan Nilai', en: 'Note IX: Returning Values' },
    body: {
      id: '`print()` berbicara ke layar, sedangkan `return` menyerahkan hasil ke mesin lain. Gudang balok hanya menerima angka dari `return`.',
      en: '`print()` speaks to the screen; `return` hands results back to another machine.',
    },
    position: [90, 4, 2],
  },
  {
    id: 'lore_10',
    islandId: 'core_spire',
    xp: 10,
    title: { id: 'Catatan X: Delapan Serpihan', en: 'Note X: Eight Shards' },
    body: {
      id: 'Kebangkitan hanyalah jembatan langit pertama. Tujuh wilayah lain menunggu di spiral Aetheria menuju Benteng Inti.',
      en: 'The Awakening is only the first Skybridge. Seven more regions await along Aetheria’s spiral.',
    },
    position: [108, 9, 0],
  },
] as const;
