export type RegionId =
  | 'awakening'
  | 'data_valley'
  | 'arithmetic_mines'
  | 'logic_fortress'
  | 'automation_forest'
  | 'function_kingdom'
  | 'object_realm'
  | 'core_citadel';

export type LocalizedText = {
  id: string;
  en: string;
};

export type KCTierInR1 = 'T2' | 'T1' | 'locked';

export interface KnowledgeComponent {
  id: string;
  homeRegion: RegionId;
  r1Tier: KCTierInR1;
  title: LocalizedText;
  description: LocalizedText;
  practicalExplain: LocalizedText;
  inGameApplication: LocalizedText;
  prerequisites: string[];
  practicedIn: string[];
  isAdditional?: boolean;
}

export interface RegionMeta {
  id: RegionId;
  order: number;
  release: 'R1' | 'R2' | 'R3' | 'R4';
  title: LocalizedText;
  subtitle: LocalizedText;
  unlockCondition: LocalizedText;
}

export const REGIONS: readonly RegionMeta[] = [
  {
    id: 'awakening',
    order: 1,
    release: 'R1',
    title: { id: 'Kebangkitan', en: 'The Awakening' },
    subtitle: {
      id: 'Pulau suar, jembatan kayu, gerbang logika, ladang terasering, bengkel BOLT, dan Puncak Inti.',
      en: 'Beacon islands, wooden bridge, logic gate, terrace farm, BOLT workshop, and Core Spire.',
    },
    unlockCondition: { id: 'Terbuka sejak awal', en: 'Unlocked from start' },
  },
  {
    id: 'data_valley',
    order: 2,
    release: 'R2',
    title: { id: 'Lembah Data', en: 'Data Valley' },
    subtitle: {
      id: 'Tipe data, string mendalam, list, tuple, set, dictionary, dan pengenalan objek.',
      en: 'Data types, deep strings, lists, tuples, sets, dictionaries, and objects intro.',
    },
    unlockCondition: { id: 'Pulihkan Serpihan Inti Kebangkitan', en: 'Restore The Awakening Core Shard' },
  },
  {
    id: 'arithmetic_mines',
    order: 3,
    release: 'R2',
    title: { id: 'Tambang Aritmetika', en: 'Arithmetic Mines' },
    subtitle: {
      id: 'Operator matematika, pembagian bulat, modulo, pangkat, dan urutan prioritas.',
      en: 'Arithmetic operators, floor division, modulo, powers, and precedence.',
    },
    unlockCondition: { id: 'Pulihkan Inti Lembah Data', en: 'Restore Data Valley Core' },
  },
  {
    id: 'logic_fortress',
    order: 4,
    release: 'R3',
    title: { id: 'Benteng Logika', en: 'Logic Fortress' },
    subtitle: {
      id: 'Perbandingan, logika gabungan, percabangan bersarang, dan truthiness.',
      en: 'Comparisons, boolean logic, nested conditionals, and truthiness.',
    },
    unlockCondition: { id: 'Pulihkan Inti Tambang Aritmetika', en: 'Restore Arithmetic Mines Core' },
  },
  {
    id: 'automation_forest',
    order: 5,
    release: 'R3',
    title: { id: 'Hutan Otomasi', en: 'Automation Forest' },
    subtitle: {
      id: 'Perulangan for & while, break, continue, perulangan bersarang, dan akumulator.',
      en: 'for & while loops, break, continue, nested loops, and accumulators.',
    },
    unlockCondition: { id: 'Pulihkan Inti Benteng Logika', en: 'Restore Logic Fortress Core' },
  },
  {
    id: 'function_kingdom',
    order: 6,
    release: 'R3',
    title: { id: 'Kerajaan Fungsi', en: 'Function Kingdom' },
    subtitle: {
      id: 'Fungsi def, parameter, nilai kembali, scope lokal/global, modul, dan try/except.',
      en: 'Functions, parameters, return values, local/global scope, modules, and try/except.',
    },
    unlockCondition: { id: 'Pulihkan Inti Hutan Otomasi', en: 'Restore Automation Forest Core' },
  },
  {
    id: 'object_realm',
    order: 7,
    release: 'R4',
    title: { id: 'Ranah Objek', en: 'Object Realm' },
    subtitle: {
      id: 'Pemrograman berorientasi objek: class, atribut, method, __init__, pewarisan, dan polimorfisme.',
      en: 'Object-oriented programming: classes, attributes, methods, __init__, inheritance, and polymorphism.',
    },
    unlockCondition: { id: 'Pulihkan Inti Kerajaan Fungsi', en: 'Restore Function Kingdom Core' },
  },
  {
    id: 'core_citadel',
    order: 8,
    release: 'R4',
    title: { id: 'Benteng Inti', en: 'Core Citadel' },
    subtitle: {
      id: 'Ujian integrasi akhir bersama Sang Penjaga untuk menyatukan kembali seluruh Aetheria.',
      en: 'Final integration trials with The Guardian to reunite all of Aetheria.',
    },
    unlockCondition: { id: 'Pulihkan Inti Ranah Objek', en: 'Restore Object Realm Core' },
  },
] as const;

export const KC_LIST: readonly KnowledgeComponent[] = [
  // =========================================================================
  // Region 1 — The Awakening: Fundamentals (F1-F8) + T1 Previews (V1, etc.)
  // =========================================================================
  {
    id: 'F1',
    homeRegion: 'awakening',
    r1Tier: 'T2',
    title: { id: 'Apa Itu Program Python', en: 'What Is a Python Program' },
    description: {
      id: 'Memahami program sebagai daftar instruksi berurutan dan menjalankannya.',
      en: 'Understand a program as an ordered list of instructions and run it.',
    },
    practicalExplain: {
      id: 'Program adalah daftar perintah yang dijalankan dari atas ke bawah. Python adalah bahasa yang dipahami manusia dan mesin.',
      en: 'A program is a list of instructions run from top to bottom; Python is a language people and machines both understand.',
    },
    inGameApplication: {
      id: 'Terminal Suar hanya merespons instruksi berbahasa Python milik para Arsitek.',
      en: 'The Beacon Terminal only obeys the Architects’ Python commands.',
    },
    prerequisites: [],
    practicedIn: ['m1_s1', 'm1_s2'],
  },
  {
    id: 'F2',
    homeRegion: 'awakening',
    r1Tier: 'T2',
    title: { id: 'Menampilkan Output dengan print()', en: 'Printing Output with print()' },
    description: {
      id: 'Mencetak teks dan angka ke layar konsol atau terminal suar.',
      en: 'Print text and numbers, including multiple comma-separated values.',
    },
    practicalExplain: {
      id: 'print() menampilkan nilai ke layar konsol sehingga pesan atau hasil perhitungan bisa dibaca.',
      en: 'print() displays a value on the console or terminal screen.',
    },
    inGameApplication: {
      id: 'Setiap perintah print memulihkan modul suara NEO dan tampil di layar Suar.',
      en: 'Each print restores a piece of NEO’s voice and appears on the Beacon screen.',
    },
    prerequisites: ['F1'],
    practicedIn: ['m1_s1', 'm1_s2', 'm1_s4', 'm1_s5', 'final_c'],
  },
  {
    id: 'F3',
    homeRegion: 'awakening',
    r1Tier: 'T2',
    title: { id: 'Teks dan Tanda Kutip (String)', en: 'String Literals Basics' },
    description: {
      id: 'Mengapit teks dengan tanda kutip dan membedakan "5" dari 5.',
      en: 'Quote text properly and distinguish "5" from 5.',
    },
    practicalExplain: {
      id: 'Tanda kutip menandai teks (str) agar Python tidak menganggapnya sebagai perintah atau nama variabel.',
      en: 'Quotes mark text so Python does not treat it as a command or variable name.',
    },
    inGameApplication: {
      id: 'Menulis pesan pada papan tanda kayu di Beacon Point.',
      en: 'Writing signboard messages at Beacon Point.',
    },
    prerequisites: ['F2'],
    practicedIn: ['m1_s1', 'm1_s4'],
  },
  {
    id: 'F4',
    homeRegion: 'awakening',
    r1Tier: 'T2',
    title: { id: 'Komentar Arsitek (#)', en: 'Comments (#)' },
    description: {
      id: 'Menulis catatan untuk manusia dan menonaktifkan baris kode dengan #.',
      en: 'Write human notes and disable lines with #.',
    },
    practicalExplain: {
      id: 'Python melewati semua teks setelah tanda # pada satu baris. Berguna untuk catatan atau menonaktifkan baris bermasalah.',
      en: 'Python skips everything after # on a line; comments are for humans.',
    },
    inGameApplication: {
      id: 'Menonaktifkan perintah lampu merah yang rusak pada Terminal Suar.',
      en: 'Commenting out faulty red-flash lines on the Beacon Terminal.',
    },
    prerequisites: ['F2'],
    practicedIn: ['m1_s3'],
  },
  {
    id: 'F5',
    homeRegion: 'awakening',
    r1Tier: 'T2',
    title: { id: 'Karakter Escape (\\n, \\t, \\")', en: 'Escape Characters & Newlines' },
    description: {
      id: 'Menggunakan \\n untuk baris baru, \\t untuk tab, dan \\" untuk tanda kutip.',
      en: 'Use \\n, \\t, \\", and \\\\ inside strings.',
    },
    practicalExplain: {
      id: 'Garis miring terbalik (\\) memberi arti khusus pada huruf berikutnya, seperti \\n untuk pindah baris dan \\t untuk jarak tab.',
      en: 'A backslash gives the next character a special meaning such as newline (\\n) or tab (\\t).',
    },
    inGameApplication: {
      id: 'Membuat papan tanda kayu multi-baris menggunakan satu perintah print().',
      en: 'Creating a multi-line wooden signpost with a single print call.',
    },
    prerequisites: ['F3'],
    practicedIn: ['m1_s4', 'm1_bonus'],
  },
  {
    id: 'F6',
    homeRegion: 'awakening',
    r1Tier: 'T2',
    title: { id: 'Membaca Masukan dengan input()', en: 'Reading Input with input()' },
    description: {
      id: 'Membaca teks dari pengguna ke dalam variabel dan memahami bahwa hasilnya selalu str.',
      en: 'Read user text into a variable and understand it always returns str.',
    },
    practicalExplain: {
      id: 'input() menjeda program sejenak untuk menunggu jawaban pengguna, lalu mengembalikan teks.',
      en: 'The program pauses, waits for an answer, and returns it as text.',
    },
    inGameApplication: {
      id: 'Suar menanyakan nama Arsitek dan mengukirkannya pada prasasti batu.',
      en: 'The Beacon asks your name and engraves it onto the stone.',
    },
    prerequisites: ['F2', 'V1'],
    practicedIn: ['m1_s5'],
  },
  {
    id: 'F7',
    homeRegion: 'awakening',
    r1Tier: 'T2',
    title: { id: 'Urutan Eksekusi & Indentasi', en: 'Program Order & Indentation' },
    description: {
      id: 'Memprediksi urutan eksekusi dari atas ke bawah dan mengenal indentasi blok.',
      en: 'Predict top-to-bottom execution order and recognize block indentation.',
    },
    practicalExplain: {
      id: 'Python menjalankan setiap baris dari atas ke bawah; spasi di awal baris mengelompokkan blok kode.',
      en: 'Python runs lines in order from top to bottom; leading indentation groups code blocks.',
    },
    inGameApplication: {
      id: 'Menyusun urutan boot sistem NEO dan struktur blok robot.',
      en: 'Ordering NEO boot checklist lines and robot block structures.',
    },
    prerequisites: ['F2'],
    practicedIn: ['m1_s2', 'm3_s2', 'm4_s2', 'm5_s1'],
  },
  {
    id: 'F8',
    homeRegion: 'awakening',
    r1Tier: 'T2',
    title: { id: 'Membaca Pesan Error', en: 'Reading Error Messages' },
    description: {
      id: 'Menemukan nomor baris, jenis error, dan arti pesan kesalahan.',
      en: 'Identify error line, type, and meaning.',
    },
    practicalExplain: {
      id: 'Error adalah petunjuk dari Python tentang bagian yang perlu diperbaiki, bukan kegagalan.',
      en: 'An error is a helpful message from Python, not a personal failure.',
    },
    inGameApplication: {
      id: 'NEO menerjemahkan keluhan mesin menjadi panduan perbaikan yang jelas.',
      en: 'NEO translates machine complaints into clear fix cues.',
    },
    prerequisites: ['F2'],
    practicedIn: ['m1_s3', 'm2_s3'],
    isAdditional: true,
  },
  {
    id: 'V1',
    homeRegion: 'data_valley',
    r1Tier: 'T1',
    title: { id: 'Variabel Dasar (T1)', en: 'Variables Basics (T1)' },
    description: {
      id: 'Menyimpan dan memperbarui nilai di dalam kotak bernama.',
      en: 'Store and reassign values in named boxes.',
    },
    practicalExplain: {
      id: 'Variabel adalah kotak berlabel untuk menyimpan data; tanda = memasukkan nilai ke dalamnya.',
      en: 'A variable is a labeled box holding a value; = puts a value inside it.',
    },
    inGameApplication: {
      id: 'Menyimpan jumlah langkah BIT dan mengukur lebar celah jembatan.',
      en: 'Storing BIT step counts and bridge gap measurements.',
    },
    prerequisites: ['F2'],
    practicedIn: ['m1_s5', 'm2_s1', 'm2_s2', 'm2_s4', 'final_a'],
  },

  // =========================================================================
  // Region 2 — Data Valley: Data Types & Structures (D1-D14)
  // =========================================================================
  {
    id: 'D1',
    homeRegion: 'data_valley',
    r1Tier: 'locked',
    title: { id: 'Variabel & Penamaan', en: 'Variables & Naming' },
    description: {
      id: 'Membuat, mengubah ulang, dan memberi nama variabel yang deskriptif.',
      en: 'Assign, reassign, name clearly, and understand references.',
    },
    practicalExplain: {
      id: 'Variabel menunjuk ke nilai di memori. Mengubah nilainya akan memperbarui kotak label tersebut.',
      en: 'A variable name points to a value; reassigning updates what the label points to.',
    },
    inGameApplication: {
      id: 'Bot katalog melacak jumlah peti di rak arsip.',
      en: 'Cataloguing bots track crate counts in labeled boxes.',
    },
    prerequisites: ['F2', 'V1'],
    practicedIn: ['r2_m1'],
  },
  {
    id: 'D2',
    homeRegion: 'data_valley',
    r1Tier: 'T1',
    title: { id: 'Bilangan Bulat (int)', en: 'Integers (int)' },
    description: {
      id: 'Menggunakan bilangan bulat untuk menghitung objek dan langkah.',
      en: 'Use whole numbers in counting and arithmetic.',
    },
    practicalExplain: {
      id: 'int adalah bilangan bulat tanpa koma desimal, cocok untuk jumlah langkah atau balok.',
      en: 'Integers are whole numbers without decimals, ideal for counts and steps.',
    },
    inGameApplication: {
      id: 'Menghitung langkah robot.move() dan panjang jembatan.',
      en: 'Counting robot.move() steps and bridge lengths.',
    },
    prerequisites: ['V1'],
    practicedIn: ['m2_s1', 'm2_s2', 'm2_s3'],
  },
  {
    id: 'D3',
    homeRegion: 'data_valley',
    r1Tier: 'T1',
    title: { id: 'Bilangan Desimal (float)', en: 'Floating-Point Numbers (float)' },
    description: {
      id: 'Menggunakan bilangan berkoma untuk berat dan pengukuran.',
      en: 'Use decimal numbers and know that / returns a float.',
    },
    practicalExplain: {
      id: 'float adalah bilangan dengan titik desimal, misalnya 1.5 atau 2.5.',
      en: 'Numbers with a decimal point for measurements.',
    },
    inGameApplication: {
      id: 'Menghitung total berat papan jembatan (jarak * 1.5).',
      en: 'Calculating total bridge plank weight (jarak * 1.5).',
    },
    prerequisites: ['D2'],
    practicedIn: ['m2_s4'],
  },
  {
    id: 'D4',
    homeRegion: 'data_valley',
    r1Tier: 'locked',
    title: { id: 'String Mendalam', en: 'Strings Deep Dive' },
    description: {
      id: 'Menggabungkan, mengukur panjang, mengiris, method string, dan f-string.',
      en: 'Concatenation, len, indexing, slicing, string methods, and f-strings.',
    },
    practicalExplain: {
      id: 'Teks adalah urutan karakter yang bisa diukur dengan len() dan diformat dengan f-string.',
      en: 'Text is a sequence of characters you can measure, slice, and format.',
    },
    inGameApplication: {
      id: 'Merapikan label arsip dan membuat laporan status.',
      en: 'Normalizing archive labels and formatting reports.',
    },
    prerequisites: ['F3', 'D1'],
    practicedIn: ['m2_bonus', 'r2_m1'],
  },
  {
    id: 'D5',
    homeRegion: 'data_valley',
    r1Tier: 'T1',
    title: { id: 'Boolean (True / False)', en: 'Booleans (bool)' },
    description: {
      id: 'Memahami nilai kebenaran True dan False dari sensor robot.',
      en: 'Understand True/False values and bool().',
    },
    practicalExplain: {
      id: 'Boolean hanya memiliki dua nilai: True (benar/ya) atau False (salah/tidak).',
      en: 'A yes/no value representing True or False.',
    },
    inGameApplication: {
      id: 'Memeriksa robot.can_move() sebelum dan sesudah jembatan dibangun.',
      en: 'Checking robot.can_move() before and after building the bridge.',
    },
    prerequisites: ['V1'],
    practicedIn: ['m2_s4', 'm3_s1'],
  },
  {
    id: 'D6',
    homeRegion: 'data_valley',
    r1Tier: 'T1',
    title: { id: 'Konversi Tipe (int(), str())', en: 'Type Inspection & Conversion' },
    description: {
      id: 'Mengubah teks angka menjadi integer dengan int() dan memahami TypeError/ValueError.',
      en: 'Inspect types and convert with int(), float(), str().',
    },
    practicalExplain: {
      id: 'Teks "12" dan angka 12 berbeda tipe. Gunakan int("12") agar bisa dijumlahkan dengan angka lain.',
      en: 'Values have types; int("12") converts numeric text into an integer.',
    },
    inGameApplication: {
      id: 'Mengonversi hasil robot.scan() ("12") agar bisa ditambah 3.',
      en: 'Converting robot.scan() text ("12") before adding 3.',
    },
    prerequisites: ['D2', 'D3', 'D5'],
    practicedIn: ['m2_s3'],
  },
  {
    id: 'D7',
    homeRegion: 'data_valley',
    r1Tier: 'locked',
    title: { id: 'Nilai Kosong (None)', en: 'None Value' },
    description: {
      id: 'Memahami None sebagai penanda tidak adanya nilai.',
      en: 'Understand None as representing no value.',
    },
    practicalExplain: {
      id: 'None menandakan slot kosong atau fungsi yang tidak mengembalikan nilai.',
      en: 'None marks an empty slot or missing return value.',
    },
    inGameApplication: {
      id: 'Mengecek sel kosong saat robot.scan() mengembalikan None.',
      en: 'Checking empty slots when robot.scan() returns None.',
    },
    prerequisites: ['D1'],
    practicedIn: ['r2_m2'],
    isAdditional: true,
  },
  {
    id: 'D8',
    homeRegion: 'data_valley',
    r1Tier: 'locked',
    title: { id: 'List (Daftar Berurut)', en: 'Lists' },
    description: {
      id: 'Membuat list, mengakses indeks, append, remove, len, dan in.',
      en: 'Create lists, index, append, remove, len, and membership.',
    },
    practicalExplain: {
      id: 'List adalah deretan kotak berurutan yang isinya bisa ditambah atau diubah.',
      en: 'An ordered row of boxes you can inspect and modify.',
    },
    inGameApplication: {
      id: 'Mengelola rak kristal di Lembah Data.',
      en: 'Managing crystal shelves in Data Valley.',
    },
    prerequisites: ['D1'],
    practicedIn: ['r2_m2'],
  },
  {
    id: 'D9',
    homeRegion: 'data_valley',
    r1Tier: 'locked',
    title: { id: 'Method List & Slicing', en: 'List Methods & Slicing' },
    description: {
      id: 'Mengurutkan, mengambil, menyisipkan, dan mengiris list.',
      en: 'Use sort, pop, insert, and slicing.',
    },
    practicalExplain: {
      id: 'List memiliki method bawaan untuk mengurutkan atau mengambil bagian tertentu.',
      en: 'Lists provide built-in methods to sort, insert, and slice ranges.',
    },
    inGameApplication: {
      id: 'Mesin penyortir kristal di Lembah Data.',
      en: 'Crystal sorting mill.',
    },
    prerequisites: ['D8'],
    practicedIn: ['r2_m2'],
    isAdditional: true,
  },
  {
    id: 'D10',
    homeRegion: 'data_valley',
    r1Tier: 'locked',
    title: { id: 'Tuple (Pasangan Tetap)', en: 'Tuples' },
    description: {
      id: 'Memahami urutan tak berubah dan tuple unpacking.',
      en: 'Immutable sequences and unpacking.',
    },
    practicalExplain: {
      id: 'Tuple mirip list tetapi isinya tetap dan tidak bisa diubah setelah dibuat.',
      en: 'A fixed group of values that cannot be changed.',
    },
    inGameApplication: {
      id: 'Koordinat batu (x, y) dari robot.position().',
      en: 'Carved stone coordinates (x, y) from robot.position().',
    },
    prerequisites: ['D8'],
    practicedIn: ['r2_m3'],
  },
  {
    id: 'D11',
    homeRegion: 'data_valley',
    r1Tier: 'locked',
    title: { id: 'Set (Himpunan Unik)', en: 'Sets' },
    description: {
      id: 'Menyimpan elemen unik serta operasi union dan intersection.',
      en: 'Unique items, membership, union, and intersection.',
    },
    practicalExplain: {
      id: 'Set otomatis membuang duplikat sehingga setiap item hanya muncul satu kali.',
      en: 'A collection with no duplicates.',
    },
    inGameApplication: {
      id: 'Brankas benih yang hanya menyimpan satu jenis per benih.',
      en: 'Seed vault holding unique seed varieties.',
    },
    prerequisites: ['D8'],
    practicedIn: ['r2_m4'],
  },
  {
    id: 'D12',
    homeRegion: 'data_valley',
    r1Tier: 'locked',
    title: { id: 'Dictionary (Kamus Kunci-Nilai)', en: 'Dictionaries' },
    description: {
      id: 'Memetakan kunci ke nilai dengan get/set, in, .items(), dan .get().',
      en: 'Key-value mapping with get/set, in, .items(), and .get().',
    },
    practicalExplain: {
      id: 'Dictionary seperti lemari laci berlabel: kamu mengambil isi berdasarkan nama kuncinya.',
      en: 'A labeled drawer cabinet mapping keys to values.',
    },
    inGameApplication: {
      id: 'Katalog Arsip Agung dan robot.inventory().',
      en: 'The Great Archive catalog and robot.inventory().',
    },
    prerequisites: ['D8'],
    practicedIn: ['r2_m5'],
  },
  {
    id: 'D13',
    homeRegion: 'data_valley',
    r1Tier: 'locked',
    title: { id: 'Pengenalan Objek & Titik', en: 'Objects Intro' },
    description: {
      id: 'Memahami bahwa nilai membawa data dan kemampuan lewat notasi titik.',
      en: 'Understand attributes and methods via dot notation.',
    },
    practicalExplain: {
      id: 'Setiap nilai adalah objek yang memiliki data dan kemampuan (.method()).',
      en: 'Values carry data and abilities accessed with dot notation.',
    },
    inGameApplication: {
      id: 'Memeriksa kemampuan robot dan method teks.',
      en: 'Inspecting archive automatons and string methods.',
    },
    prerequisites: ['D4', 'D8'],
    practicedIn: ['r2_m6'],
  },
  {
    id: 'D14',
    homeRegion: 'data_valley',
    r1Tier: 'locked',
    title: { id: 'Mutabilitas', en: 'Mutability' },
    description: {
      id: 'Membedakan tipe yang bisa diubah (list) dan tidak bisa diubah (str, tuple).',
      en: 'Understand mutable lists vs immutable strings and tuples.',
    },
    practicalExplain: {
      id: 'List bisa diubah langsung di tempat, sedangkan string dan tuple selalu membuat nilai baru.',
      en: 'Lists change in place; strings and tuples do not.',
    },
    inGameApplication: {
      id: 'Label arsip hidup vs label pahatan batu.',
      en: 'Living vs carved archive labels.',
    },
    prerequisites: ['D4', 'D8', 'D10'],
    practicedIn: ['r2_m6'],
    isAdditional: true,
  },

  // =========================================================================
  // Region 3 — Arithmetic Mines: Operators (O1-O7)
  // =========================================================================
  {
    id: 'O1',
    homeRegion: 'arithmetic_mines',
    r1Tier: 'locked',
    title: { id: 'Operator Aritmetika (+ - * /)', en: 'Arithmetic Operators (+ - * /)' },
    description: {
      id: 'Menghitung nilai numerik menggunakan variabel dan operator dasar.',
      en: 'Compute with variables using +, -, *, /.',
    },
    practicalExplain: {
      id: 'Operator matematika bekerja langsung pada angka maupun variabel yang berisi angka.',
      en: 'Math operators work with numbers and numeric variables.',
    },
    inGameApplication: {
      id: 'Menyeimbangkan beban lift penyeimbang di tambang.',
      en: 'Balancing mine counterweight lifts.',
    },
    prerequisites: ['D2', 'D3'],
    practicedIn: ['m2_s4', 'r3_m1'],
  },
  {
    id: 'O2',
    homeRegion: 'arithmetic_mines',
    r1Tier: 'locked',
    title: { id: 'Pembagian Bulat (//) & Sisa (%)', en: 'Floor Division (//) & Modulo (%)' },
    description: {
      id: 'Menghitung hasil bagi bulat dan sisa pembagian.',
      en: 'Use floor division // and remainder %.',
    },
    practicalExplain: {
      id: '// membuang pecahan hasil bagi, sedangkan % memberi sisa pembagian.',
      en: '// gives whole quotients and % gives the remainder.',
    },
    inGameApplication: {
      id: 'Membagi bijih tambang ke peti dan memindahkan rel setiap gerobak ke-2.',
      en: 'Splitting ore into crates and alternating rails every 2nd cart.',
    },
    prerequisites: ['O1'],
    practicedIn: ['r3_m2'],
  },
  {
    id: 'O3',
    homeRegion: 'arithmetic_mines',
    r1Tier: 'locked',
    title: { id: 'Pangkat (**)', en: 'Exponentiation (**)' },
    description: {
      id: 'Menghitung perpangkatan dengan operator **.',
      en: 'Compute powers with **.',
    },
    practicalExplain: {
      id: 'a ** b mengalikan a dengan dirinya sendiri sebanyak b kali.',
      en: 'Raises a number to a power.',
    },
    inGameApplication: {
      id: 'Menghitung pertumbuhan energi kristal kuadrat.',
      en: 'Calculating squared crystal power.',
    },
    prerequisites: ['O1'],
    practicedIn: ['r3_m3'],
  },
  {
    id: 'O4',
    homeRegion: 'arithmetic_mines',
    r1Tier: 'locked',
    title: { id: 'Operator Penugasan (+= -= *= /=)', en: 'Assignment Operators' },
    description: {
      id: 'Memperbarui total berjalan secara ringkas.',
      en: 'Update running totals with +=, -=, *=, /=.',
    },
    practicalExplain: {
      id: 'total += 3 adalah bentuk singkat dari total = total + 3.',
      en: 'total += 3 is shorthand for total = total + 3.',
    },
    inGameApplication: {
      id: 'Penghitung bijih tambang saat gerobak lewat.',
      en: 'Mine counter totaling passing carts.',
    },
    prerequisites: ['O1', 'D1'],
    practicedIn: ['r3_m4'],
  },
  {
    id: 'O5',
    homeRegion: 'arithmetic_mines',
    r1Tier: 'T1',
    title: { id: 'Operator Perbandingan (== != < > <= >=)', en: 'Comparison Operators' },
    description: {
      id: 'Membandingkan dua nilai untuk menghasilkan True atau False.',
      en: 'Compare values to produce a boolean.',
    },
    practicalExplain: {
      id: 'Operator perbandingan menanyakan hubungan dua nilai (sama, berbeda, lebih besar/kecil) dan dijawab True atau False.',
      en: 'Comparison operators evaluate relationships and return True or False.',
    },
    inGameApplication: {
      id: 'Teka-teki pilar rune Kakek Tamo dan pemeriksaan berat gerbang.',
      en: 'Old Tamo’s rune riddles and gate weight threshold.',
    },
    prerequisites: ['D5'],
    practicedIn: ['m3_s1', 'm3_s5', 'r3_m1'],
  },
  {
    id: 'O6',
    homeRegion: 'arithmetic_mines',
    r1Tier: 'locked',
    title: { id: 'Prioritas Operator', en: 'Operator Precedence' },
    description: {
      id: 'Memprediksi urutan evaluasi dan memakai tanda kurung ().',
      en: 'Predict evaluation order and group with parentheses.',
    },
    practicalExplain: {
      id: 'Perkalian dan pembagian dikerjakan sebelum penjumlahan; tanda kurung selalu didahulukan.',
      en: 'Multiplication precedes addition; parentheses evaluate first.',
    },
    inGameApplication: {
      id: 'Menentukan urutan peledakan dinding tambang.',
      en: 'Blasting sequence formulas.',
    },
    prerequisites: ['O1', 'O2', 'O3', 'O4'],
    practicedIn: ['r3_m5'],
  },
  {
    id: 'O7',
    homeRegion: 'arithmetic_mines',
    r1Tier: 'locked',
    title: { id: 'Modul math, round, abs', en: 'math Module, round & abs' },
    description: {
      id: 'Menggunakan fungsi pembantu matematika standar.',
      en: 'Import math and use round() and abs().',
    },
    practicalExplain: {
      id: 'Python menyediakan modul math serta fungsi round() dan abs() untuk perhitungan presisi.',
      en: 'Built-in math helpers for rounding, absolute distance, and square roots.',
    },
    inGameApplication: {
      id: 'Alat ukur juru survei tambang.',
      en: 'Mine surveyor tools.',
    },
    prerequisites: ['O1'],
    practicedIn: ['r3_m6'],
    isAdditional: true,
  },

  // =========================================================================
  // Region 4 — Logic Fortress: Conditions (B1-B8)
  // =========================================================================
  {
    id: 'B1',
    homeRegion: 'logic_fortress',
    r1Tier: 'T1',
    title: { id: 'Perbandingan ke Boolean', en: 'Comparison to Boolean' },
    description: {
      id: 'Mengevaluasi ekspresi perbandingan menjadi True atau False.',
      en: 'Evaluate comparison expressions to True or False.',
    },
    practicalExplain: {
      id: 'Setiap perbandingan seperti 5 > 3 atau warna == "blue" menghasilkan True atau False.',
      en: 'Every comparison is a question Python answers with True or False.',
    },
    inGameApplication: {
      id: 'Menyalakan pilar rune hijau atau merah di Gerbang Terkunci.',
      en: 'Lighting rune pillars green or red at Gatehouse Rock.',
    },
    prerequisites: ['D5', 'O5'],
    practicedIn: ['m3_s1'],
  },
  {
    id: 'B2',
    homeRegion: 'logic_fortress',
    r1Tier: 'T1',
    title: { id: 'Percabangan if', en: 'if Statement' },
    description: {
      id: 'Menjalankan blok kode berindentasi hanya saat kondisi bernilai True.',
      en: 'Run an indented block only when a condition is true.',
    },
    practicalExplain: {
      id: '"Jika kondisi ini benar, jalankan blok di dalamnya." Jangan lupa titik dua : dan 4 spasi.',
      en: '"If this is true, run this indented block."',
    },
    inGameApplication: {
      id: 'Membuka gerbang hanya saat sensor membaca kristal biru.',
      en: 'Opening the gate only when the sensor reads a blue crystal.',
    },
    prerequisites: ['B1', 'F7'],
    practicedIn: ['m3_s2', 'final_a'],
  },
  {
    id: 'B3',
    homeRegion: 'logic_fortress',
    r1Tier: 'T1',
    title: { id: 'Cabang Alternatif else', en: 'else Branch' },
    description: {
      id: 'Menangani keadaan ketika kondisi if bernilai False.',
      en: 'Handle the alternative branch when if is false.',
    },
    practicalExplain: {
      id: 'else berjalan otomatis jika kondisi if di atasnya tidak terpenuhi.',
      en: 'else runs whenever the preceding if condition is false.',
    },
    inGameApplication: {
      id: 'Menyalakan lampu merah gerbang ketika akses ditolak.',
      en: 'Turning on the red gate lamp when access is denied.',
    },
    prerequisites: ['B2'],
    practicedIn: ['m3_s3'],
  },
  {
    id: 'B4',
    homeRegion: 'logic_fortress',
    r1Tier: 'T1',
    title: { id: 'Cabang Majemuk elif', en: 'elif Multi-Branch' },
    description: {
      id: 'Memeriksa beberapa kondisi berurutan secara eksklusif.',
      en: 'Check several exclusive branches in order.',
    },
    practicalExplain: {
      id: 'elif memeriksa pilihan berikutnya hanya jika kondisi sebelumnya salah. Urutan pengecekan sangat penting.',
      en: 'elif checks additional conditions in order until one matches.',
    },
    inGameApplication: {
      id: 'Mengatur respons gerbang untuk kristal biru, hijau, dan lainnya.',
      en: 'Three crystal colors triggering three gate responses.',
    },
    prerequisites: ['B3'],
    practicedIn: ['m3_s4'],
  },
  {
    id: 'B5',
    homeRegion: 'logic_fortress',
    r1Tier: 'T1',
    title: { id: 'Operator Logika and', en: 'Logical and' },
    description: {
      id: 'Menggabungkan dua syarat yang keduanya wajib bernilai True.',
      en: 'Combine two conditions where both must be true.',
    },
    practicalExplain: {
      id: 'and bernilai True hanya jika syarat di kiri DAN kanan sama-sama True.',
      en: 'and is true only when both sides are true.',
    },
    inGameApplication: {
      id: 'Kunci ganda gerbang: warna harus "blue" dan beban minimal 2.',
      en: 'Double-lock gate: crystal must be blue and weight >= 2.',
    },
    prerequisites: ['B2'],
    practicedIn: ['m3_s5'],
  },
  {
    id: 'B6',
    homeRegion: 'logic_fortress',
    r1Tier: 'T1',
    title: { id: 'Operator Logika or', en: 'Logical or' },
    description: {
      id: 'Menggabungkan syarat yang cukup salah satunya bernilai True.',
      en: 'Combine conditions where either side being true suffices.',
    },
    practicalExplain: {
      id: 'or bernilai True jika minimal satu dari kedua syarat bernilai True.',
      en: 'or is true when at least one side is true.',
    },
    inGameApplication: {
      id: 'Gerbang dengan dua kunci alternatif.',
      en: 'Alternative key validation.',
    },
    prerequisites: ['B2'],
    practicedIn: ['m3_s5', 'r4_m2'],
  },
  {
    id: 'B7',
    homeRegion: 'logic_fortress',
    r1Tier: 'T1',
    title: { id: 'Operator Logika not', en: 'Logical not' },
    description: {
      id: 'Membalikkan nilai boolean True menjadi False dan sebaliknya.',
      en: 'Invert a boolean value.',
    },
    practicalExplain: {
      id: 'not membalik kebenaran: not True menjadi False, dan not False menjadi True.',
      en: 'not flips True to False and False to True.',
    },
    inGameApplication: {
      id: 'Tantangan bonus gerbang logika terbalik.',
      en: 'Bonus gate logic using negation.',
    },
    prerequisites: ['B2'],
    practicedIn: ['m3_bonus'],
  },
  {
    id: 'B8',
    homeRegion: 'logic_fortress',
    r1Tier: 'locked',
    title: { id: 'Kondisi Bersarang & Truthiness', en: 'Nested Conditionals & Truthiness' },
    description: {
      id: 'Menulis if di dalam if dan memahami nilai falsy ("", 0, []).',
      en: 'Nest if statements and understand falsy values.',
    },
    practicalExplain: {
      id: 'if bersarang memeriksa syarat bertahap; nilai kosong seperti "", 0, dan [] dianggap False.',
      en: 'Nested ifs check staged conditions; empty values are falsy.',
    },
    inGameApplication: {
      id: 'Pos pemeriksaan Benteng Dalam.',
      en: 'Inner Keep checkpoints.',
    },
    prerequisites: ['B4', 'B5', 'B6', 'B7'],
    practicedIn: ['m3_bonus', 'r4_m5'],
  },

  // =========================================================================
  // Region 5 — Automation Forest: Loops (L1-L8)
  // =========================================================================
  {
    id: 'L1',
    homeRegion: 'automation_forest',
    r1Tier: 'T1',
    title: { id: 'Perulangan for & range()', en: 'for Loops & range()' },
    description: {
      id: 'Mengulang blok kode sebanyak N kali dan memanfaatkan variabel loop.',
      en: 'Repeat N times with range(n) and range(a, b).',
    },
    practicalExplain: {
      id: 'for i in range(6): menjalankan blok di dalamnya berulang kali untuk setiap angka dalam rentang.',
      en: 'Repeats the indented block once per number in the range.',
    },
    inGameApplication: {
      id: 'Menanam satu baris penuh benih gandum di Ladang Terasering.',
      en: 'Planting a row of wheat in Terrace Farm.',
    },
    prerequisites: ['F7', 'D2'],
    practicedIn: ['m4_s2', 'm4_s3', 'final_b'],
  },
  {
    id: 'L2',
    homeRegion: 'automation_forest',
    r1Tier: 'locked',
    title: { id: 'for pada List & String', en: 'for Over Collections' },
    description: {
      id: 'Mengiterasi setiap elemen pada list atau karakter pada string.',
      en: 'Iterate directly over lists and strings.',
    },
    practicalExplain: {
      id: 'for item in daftar: mengambil setiap isi daftar satu per satu tanpa perlu indeks angka.',
      en: 'Visits each element of a collection in sequence.',
    },
    inGameApplication: {
      id: 'Antrean kayu di Penggergajian Agung.',
      en: 'Lumber queue at the Great Sawmill.',
    },
    prerequisites: ['L1', 'D8'],
    practicedIn: ['r5_m1'],
  },
  {
    id: 'L3',
    homeRegion: 'automation_forest',
    r1Tier: 'T1',
    title: { id: 'Perulangan while', en: 'while Loops' },
    description: {
      id: 'Mengulang selama kondisi bernilai True dan mencegah loop tak terbatas.',
      en: 'Repeat while a condition holds and avoid infinite loops.',
    },
    practicalExplain: {
      id: 'while terus mengulang selama syaratnya True. Pastikan kondisi bisa menjadi False agar berhenti!',
      en: 'Keeps repeating as long as the condition remains True.',
    },
    inGameApplication: {
      id: 'Menanam baris yang panjangnya tidak diketahui dengan while robot.can_move().',
      en: 'Planting unknown-length rows with while robot.can_move().',
    },
    prerequisites: ['L1', 'B2'],
    practicedIn: ['m4_s4', 'final_a'],
  },
  {
    id: 'L4',
    homeRegion: 'automation_forest',
    r1Tier: 'locked',
    title: { id: 'Keluar Lebih Awal dengan break', en: 'Early Exit with break' },
    description: {
      id: 'Menghentikan perulangan seketika saat kondisi darurat terjadi.',
      en: 'Exit a loop immediately with break.',
    },
    practicalExplain: {
      id: 'break langsung menghentikan perulangan saat itu juga dan melanjutkan kode setelah loop.',
      en: 'break exits the innermost loop immediately.',
    },
    inGameApplication: {
      id: 'Katup darurat konveyor saat terjadi gangguan.',
      en: 'Conveyor emergency valve on fault.',
    },
    prerequisites: ['L3'],
    practicedIn: ['r5_m3'],
  },
  {
    id: 'L5',
    homeRegion: 'automation_forest',
    r1Tier: 'T1',
    title: { id: 'Lewati Iterasi dengan continue', en: 'Skip Iteration with continue' },
    description: {
      id: 'Melompati sisa blok pada iterasi saat ini dan lanjut ke iterasi berikutnya.',
      en: 'Skip the current iteration without stopping the loop.',
    },
    practicalExplain: {
      id: 'continue melewatkan langkah tersisa untuk putaran ini saja, lalu lanjut ke putaran berikutnya.',
      en: 'continue skips to the next loop iteration.',
    },
    inGameApplication: {
      id: 'Melewati petak berbatu di ladang tanpa menghentikan BIT.',
      en: 'Skipping rock cells while planting the terrace row.',
    },
    prerequisites: ['L1', 'B2'],
    practicedIn: ['m4_bonus'],
  },
  {
    id: 'L6',
    homeRegion: 'automation_forest',
    r1Tier: 'T1',
    title: { id: 'Perulangan Bersarang (Nested Loops)', en: 'Nested Loops (2D Grids)' },
    description: {
      id: 'Meletakkan loop di dalam loop untuk memproses grid baris × kolom.',
      en: 'Loops inside loops for rows × columns grids.',
    },
    practicalExplain: {
      id: 'Loop luar berpindah baris, sedangkan loop dalam menyelesaikan seluruh kolom pada baris tersebut.',
      en: 'Outer loop steps through rows; inner loop handles columns.',
    },
    inGameApplication: {
      id: 'Menanam seluruh ladang farm.rows × farm.cols secara otomatis.',
      en: 'Planting full farm.rows × farm.cols grids automatically.',
    },
    prerequisites: ['L1'],
    practicedIn: ['m4_s5'],
  },
  {
    id: 'L7',
    homeRegion: 'automation_forest',
    r1Tier: 'locked',
    title: { id: 'Akumulator & Penghitung', en: 'Accumulators & Counters' },
    description: {
      id: 'Menjumlahkan atau menghitung kejadian di dalam perulangan.',
      en: 'Build running totals inside loops.',
    },
    practicalExplain: {
      id: 'Inisialisasi variabel penghitung sebelum loop, lalu perbarui di dalam setiap putaran.',
      en: 'Initialize before the loop and update inside each iteration.',
    },
    inGameApplication: {
      id: 'Menghitung total hasil penggergajian.',
      en: 'Totaling sawmill output.',
    },
    prerequisites: ['L1', 'O4'],
    practicedIn: ['final_a', 'r5_m5'],
  },
  {
    id: 'L8',
    homeRegion: 'automation_forest',
    r1Tier: 'locked',
    title: { id: 'enumerate & zip', en: 'enumerate & zip' },
    description: {
      id: 'Mengambil indeks dan nilai secara bersamaan saat iterasi.',
      en: 'Pair indices or multiple collections during iteration.',
    },
    practicalExplain: {
      id: 'enumerate() memberi nomor urut otomatis, sedangkan zip() memasangkan dua daftar.',
      en: 'enumerate yields index-value pairs; zip pairs multiple iterables.',
    },
    inGameApplication: {
      id: 'Memberi label bernomor pada peti kayu.',
      en: 'Numbering warehouse crates.',
    },
    prerequisites: ['L2'],
    practicedIn: ['r5_m6'],
    isAdditional: true,
  },

  // =========================================================================
  // Region 6 — Function Kingdom: Functions (N1-N9)
  // =========================================================================
  {
    id: 'N1',
    homeRegion: 'function_kingdom',
    r1Tier: 'T1',
    title: { id: 'Membuat & Memanggil Fungsi (def)', en: 'Defining & Calling Functions (def)' },
    description: {
      id: 'Mendefinisikan resep kode sekali dan memanggilnya berkali-kali.',
      en: 'Define once with def and call multiple times.',
    },
    practicalExplain: {
      id: 'def hanya menyimpan resep — isinya baru berjalan saat kamu memanggil nama fungsi dengan tanda ().',
      en: 'Defining a function stores a recipe; calling it with () runs the body.',
    },
    inGameApplication: {
      id: 'Membuat resep pasang_tiang() di Bengkel BOLT.',
      en: 'Defining pasang_tiang() in BOLT’s Workshop.',
    },
    prerequisites: ['F7', 'L1'],
    practicedIn: ['m5_s1', 'm5_s4', 'final_b'],
  },
  {
    id: 'N2',
    homeRegion: 'function_kingdom',
    r1Tier: 'T1',
    title: { id: 'Parameter & Argumen Posisional', en: 'Parameters & Positional Arguments' },
    description: {
      id: 'Mengirimkan nilai masukan agar fungsi menjadi fleksibel.',
      en: 'Pass values into functions via parameters.',
    },
    practicalExplain: {
      id: 'Parameter adalah variabel penerima di dalam tanda kurung def agar fungsi bisa bekerja untuk ukuran berbeda.',
      en: 'Parameters let one function behave differently based on input arguments.',
    },
    inGameApplication: {
      id: 'Membangun tiang dengan tinggi berbeda: pasang_tiang(2), pasang_tiang(4).',
      en: 'Building pillars of different heights: pasang_tiang(2), pasang_tiang(4).',
    },
    prerequisites: ['N1'],
    practicedIn: ['m5_s2', 'm5_s4', 'final_b'],
  },
  {
    id: 'N3',
    homeRegion: 'function_kingdom',
    r1Tier: 'T1',
    title: { id: 'Argumen Default & Kata Kunci', en: 'Keyword & Default Arguments' },
    description: {
      id: 'Memberikan nilai bawaan pada parameter dan memanggil dengan nama parameter.',
      en: 'Provide default values and call by keyword.',
    },
    practicalExplain: {
      id: 'Nilai default dipakai otomatis jika pemanggil tidak mengirim argumen untuk parameter itu.',
      en: 'Default parameters apply automatically when omitted by the caller.',
    },
    inGameApplication: {
      id: 'Bonus Bengkel BOLT: def pasang_tiang(tinggi=3, blok="stone").',
      en: 'BOLT Workshop bonus: def pasang_tiang(tinggi=3, blok="stone").',
    },
    prerequisites: ['N2'],
    practicedIn: ['m5_bonus'],
  },
  {
    id: 'N4',
    homeRegion: 'function_kingdom',
    r1Tier: 'T1',
    title: { id: 'Nilai Kembali (return)', en: 'Return Values (return)' },
    description: {
      id: 'Mengembalikan hasil perhitungan dari fungsi dan membedakannya dari print().',
      en: 'Produce values with return and distinguish return from print.',
    },
    practicalExplain: {
      id: 'print() hanya menampilkan ke layar, sedangkan return mengirim hasil balik ke kode pemanggil.',
      en: 'print displays to console; return hands a value back to the caller.',
    },
    inGameApplication: {
      id: 'Kalkulator balok hitung_balok(lebar, tinggi) untuk memesan batu di depot.',
      en: 'hitung_balok(lebar, tinggi) returning exact block counts for depot.request().',
    },
    prerequisites: ['N2'],
    practicedIn: ['m5_s3'],
  },
  {
    id: 'N5',
    homeRegion: 'function_kingdom',
    r1Tier: 'locked',
    title: { id: 'Scope Lokal vs Global', en: 'Local vs Global Scope' },
    description: {
      id: 'Memahami batas hidup variabel di dalam fungsi.',
      en: 'Understand local function scope vs global scope.',
    },
    practicalExplain: {
      id: 'Variabel yang dibuat di dalam fungsi bersifat lokal dan tidak terlihat dari luar.',
      en: 'Variables created inside a function stay local to that function.',
    },
    inGameApplication: {
      id: 'Dinding kastel tempat data tetap berada di ruang fungsi.',
      en: 'Castle walls keeping local state isolated.',
    },
    prerequisites: ['N4'],
    practicedIn: ['r6_m4'],
  },
  {
    id: 'N6',
    homeRegion: 'function_kingdom',
    r1Tier: 'locked',
    title: { id: 'Fungsi Bersarang', en: 'Nested Functions' },
    description: {
      id: 'Menulis fungsi pembantu di dalam fungsi lain.',
      en: 'Define helper functions inside functions.',
    },
    practicalExplain: {
      id: 'Fungsi pembantu bisa dibuat di dalam fungsi utama untuk memecah langkah kecil.',
      en: 'Helper functions defined locally inside a parent function.',
    },
    inGameApplication: {
      id: 'Bengkel kecil di dalam bengkel guild.',
      en: 'A workshop inside a guild workshop.',
    },
    prerequisites: ['N5'],
    practicedIn: ['r6_m5'],
  },
  {
    id: 'N7',
    homeRegion: 'function_kingdom',
    r1Tier: 'locked',
    title: { id: 'Docstring & Penamaan Jelas', en: 'Docstrings & Naming' },
    description: {
      id: 'Mendokumentasikan tujuan fungsi dengan docstring.',
      en: 'Document function intent clearly.',
    },
    practicalExplain: {
      id: 'Teks di baris pertama fungsi menjelaskan apa yang dilakukan fungsi tersebut.',
      en: 'Triple-quoted strings document what a function does.',
    },
    inGameApplication: {
      id: 'Kartu arsip Perpustakaan Cetak Biru.',
      en: 'Blueprint Library index cards.',
    },
    prerequisites: ['N1'],
    practicedIn: ['r6_m6'],
    isAdditional: true,
  },
  {
    id: 'N8',
    homeRegion: 'function_kingdom',
    r1Tier: 'locked',
    title: { id: 'Modul & import', en: 'Modules & import' },
    description: {
      id: 'Menggunakan fungsi dari modul standar dan cetak biru.',
      en: 'Import and reuse functions from modules.',
    },
    practicalExplain: {
      id: 'import memuat kumpulan fungsi siap pakai dari berkas atau modul lain.',
      en: 'import loads reusable functions from another module.',
    },
    inGameApplication: {
      id: 'Perpustakaan Cetak Biru Kerajaan Fungsi.',
      en: 'Function Kingdom Blueprint Library.',
    },
    prerequisites: ['N4'],
    practicedIn: ['r6_m7'],
  },
  {
    id: 'N9',
    homeRegion: 'function_kingdom',
    r1Tier: 'locked',
    title: { id: 'Penanganan Error (try / except)', en: 'Error Handling (try / except)' },
    description: {
      id: 'Menangkap kesalahan dengan aman agar mesin tidak berhenti mendadak.',
      en: 'Handle runtime errors gracefully with try / except.',
    },
    practicalExplain: {
      id: 'Blok try mencoba kode berisiko, dan except menangani jika terjadi error.',
      en: 'try attempts risky code and except handles failures.',
    },
    inGameApplication: {
      id: 'Mesin aman yang tidak mogok saat pemindaian gagal.',
      en: 'Fail-safe machines when a scan fails.',
    },
    prerequisites: ['N4', 'D6'],
    practicedIn: ['r6_m8'],
    isAdditional: true,
  },

  // =========================================================================
  // Region 7 — Object Realm: OOP (P1-P9)
  // =========================================================================
  {
    id: 'P1',
    homeRegion: 'object_realm',
    r1Tier: 'locked',
    title: { id: 'Class & Objek', en: 'Classes & Objects' },
    description: {
      id: 'Membuat cetak biru class dan mencetak beberapa objek instance.',
      en: 'Define a class and create instances.',
    },
    practicalExplain: {
      id: 'Class adalah cetakan robot, sedangkan objek adalah robot nyata yang dibuat darinya.',
      en: 'A class is a blueprint; objects are concrete instances created from it.',
    },
    inGameApplication: {
      id: 'Pabrik Perunggu mencetak skuad robot pekerja.',
      en: 'Bronze Foundry spawning worker bots.',
    },
    prerequisites: ['N1', 'N2', 'N3', 'N4', 'D13'],
    practicedIn: ['r7_m1'],
  },
  {
    id: 'P2',
    homeRegion: 'object_realm',
    r1Tier: 'locked',
    title: { id: 'Atribut Objek', en: 'Object Attributes' },
    description: {
      id: 'Menyimpan data khusus untuk setiap instance objek.',
      en: 'Store per-object data attributes.',
    },
    practicalExplain: {
      id: 'Setiap objek bisa memiliki nilai atribut berbeda seperti warna dan kecepatan.',
      en: 'Each instance stores its own attribute values.',
    },
    inGameApplication: {
      id: 'Lembar spesifikasi warna dan kecepatan robot.',
      en: 'Robot spec sheets for color and speed.',
    },
    prerequisites: ['P1'],
    practicedIn: ['r7_m2'],
  },
  {
    id: 'P3',
    homeRegion: 'object_realm',
    r1Tier: 'locked',
    title: { id: 'Method & self', en: 'Methods & self' },
    description: {
      id: 'Menulis aksi milik objek dan memahami parameter self.',
      en: 'Bind behavior to objects with methods and self.',
    },
    practicalExplain: {
      id: 'self merujuk pada objek yang sedang memanggil method tersebut.',
      en: 'self refers to the specific instance calling the method.',
    },
    inGameApplication: {
      id: 'Memerintahkan bot tertentu dengan bot.kerja().',
      en: 'Directing a specific bot via bot.kerja().',
    },
    prerequisites: ['P2'],
    practicedIn: ['r7_m3'],
  },
  {
    id: 'P4',
    homeRegion: 'object_realm',
    r1Tier: 'locked',
    title: { id: 'Konstruktor __init__', en: 'Constructor __init__' },
    description: {
      id: 'Menginisialisasi keadaan awal objek otomatis saat dibuat.',
      en: 'Initialize object state automatically on creation.',
    },
    practicalExplain: {
      id: '__init__ berjalan otomatis setiap kali objek baru dicetak dari class.',
      en: '__init__ runs automatically when a new object is instantiated.',
    },
    inGameApplication: {
      id: 'Parameter lini perakitan robot otomatis.',
      en: 'Assembly-line constructor parameters.',
    },
    prerequisites: ['P2'],
    practicedIn: ['r7_m4'],
  },
  {
    id: 'P5',
    homeRegion: 'object_realm',
    r1Tier: 'locked',
    title: { id: 'Pewarisan & super()', en: 'Inheritance & super()' },
    description: {
      id: 'Membuat class turunan yang mewarisi dan memperluas class induk.',
      en: 'Specialize classes and reuse parent behavior with super().',
    },
    practicalExplain: {
      id: 'Class anak mewarisi kemampuan class induk dan dapat menambahkan kemampuan khusus.',
      en: 'Subclasses inherit parent methods and extend or override them.',
    },
    inGameApplication: {
      id: 'Keluarga robot penambang mewarisi sifat pekerja.',
      en: 'Miner robots inheriting from Worker.',
    },
    prerequisites: ['P4'],
    practicedIn: ['r7_m5'],
  },
  {
    id: 'P6',
    homeRegion: 'object_realm',
    r1Tier: 'locked',
    title: { id: 'Enkapsulasi', en: 'Encapsulation' },
    description: {
      id: 'Melindungi data internal objek dan memvalidasi perubahan nilai.',
      en: 'Protect internal state with conventions and validation.',
    },
    practicalExplain: {
      id: 'Menjaga agar data sensitif hanya diubah lewat method yang memeriksa keabsahan nilai.',
      en: 'Keep internal state valid behind controlled methods/properties.',
    },
    inGameApplication: {
      id: 'Inti tersegel yang menolak nilai energi tidak valid.',
      en: 'Sealed robot cores rejecting invalid energy values.',
    },
    prerequisites: ['P4'],
    practicedIn: ['r7_m6'],
  },
  {
    id: 'P7',
    homeRegion: 'object_realm',
    r1Tier: 'locked',
    title: { id: 'Polimorfisme', en: 'Polymorphism' },
    description: {
      id: 'Memanggil nama method yang sama pada jenis objek berbeda.',
      en: 'Use the same method interface across different classes.',
    },
    practicalExplain: {
      id: 'Satu loop bisa memanggil .kerja() pada berbagai jenis robot dengan hasil masing-masing.',
      en: 'One loop calls .kerja() on a mixed squad of objects.',
    },
    inGameApplication: {
      id: 'Skuad campuran di Aula Silsilah.',
      en: 'Mixed squad operations in the Hall of Lineage.',
    },
    prerequisites: ['P5'],
    practicedIn: ['r7_m7'],
  },
  {
    id: 'P8',
    homeRegion: 'object_realm',
    r1Tier: 'locked',
    title: { id: 'Representasi __str__', en: '__str__ Representation' },
    description: {
      id: 'Mengatur tampilan teks yang mudah dibaca saat objek dicetak.',
      en: 'Define readable string formatting for objects.',
    },
    practicalExplain: {
      id: '__str__ menentukan teks yang muncul ketika print(objek) dipanggil.',
      en: '__str__ customizes how an object prints.',
    },
    inGameApplication: {
      id: 'Plakat status robot di pabrik.',
      en: 'Robot status plaques.',
    },
    prerequisites: ['P3'],
    practicedIn: ['r7_m8'],
    isAdditional: true,
  },
  {
    id: 'P9',
    homeRegion: 'object_realm',
    r1Tier: 'locked',
    title: { id: 'Komposisi Objek', en: 'Object Composition' },
    description: {
      id: 'Menyusun objek yang menyimpan objek-objek lain di dalamnya.',
      en: 'Build objects composed of other objects.',
    },
    practicalExplain: {
      id: 'Sebuah skuad memiliki daftar objek robot dan mengoordinasikan tugas mereka.',
      en: 'A squad holds and coordinates a list of robot instances.',
    },
    inGameApplication: {
      id: 'Skuad robot penambang terpadu.',
      en: 'Coordinated robot squad.',
    },
    prerequisites: ['P4'],
    practicedIn: ['r7_m9'],
    isAdditional: true,
  },

  // =========================================================================
  // Region 8 — Core Citadel: Integration (X1-X3)
  // =========================================================================
  {
    id: 'X1',
    homeRegion: 'core_citadel',
    r1Tier: 'locked',
    title: { id: 'Dekomposisi Masalah', en: 'Problem Decomposition' },
    description: {
      id: 'Memecah tantangan besar menjadi fungsi dan class yang terstruktur.',
      en: 'Split complex problems into clean functions and classes.',
    },
    practicalExplain: {
      id: 'Pecah masalah besar menjadi bagian kecil yang masing-masing punya satu tanggung jawab jelas.',
      en: 'Break large goals into focused, testable building blocks.',
    },
    inGameApplication: {
      id: 'Ujian Penjaga Benteng Inti.',
      en: 'The Guardian’s Core Citadel trials.',
    },
    prerequisites: ['P7'],
    practicedIn: ['r8_m1'],
  },
  {
    id: 'X2',
    homeRegion: 'core_citadel',
    r1Tier: 'locked',
    title: { id: 'Strategi Debugging', en: 'Debugging Strategy' },
    description: {
      id: 'Membaca jejak eksekusi, mengisolasi sumber bug, dan menguji skenario.',
      en: 'Read traces, isolate root causes, and test edge cases.',
    },
    practicalExplain: {
      id: 'Gunakan linimasa variabel dan skenario uji untuk menemukan di baris mana asumsi meleset.',
      en: 'Use trace timelines and scenario checks to pinpoint mistakes.',
    },
    inGameApplication: {
      id: 'Memulihkan simpul Code Core yang retak.',
      en: 'Repairing fractured Code Core nodes.',
    },
    prerequisites: ['X1'],
    practicedIn: ['r8_m2'],
  },
  {
    id: 'X3',
    homeRegion: 'core_citadel',
    r1Tier: 'locked',
    title: { id: 'Desain Sistem Otonom', en: 'Autonomous System Design' },
    description: {
      id: 'Merancang siklus sense-decide-act dengan objek dan logika penuh.',
      en: 'Build sense-decide-act loops combining objects, logic, and functions.',
    },
    practicalExplain: {
      id: 'Sistem otonom membaca lingkungan, mengambil keputusan, dan menjalankan aksi berulang kali.',
      en: 'Combine sensors, decisions, loops, and abstractions into a resilient system.',
    },
    inGameApplication: {
      id: 'Membangun kembali Jantung Code Core Aetheria.',
      en: 'Rebuilding the Code Core Heart of Aetheria.',
    },
    prerequisites: ['X2'],
    practicedIn: ['r8_m3'],
  },
] as const;

export const KC_MAP: ReadonlyMap<string, KnowledgeComponent> = new Map(
  KC_LIST.map((kc) => [kc.id, kc])
);

export function getKC(kcId: string): KnowledgeComponent | undefined {
  return KC_MAP.get(kcId);
}

export function getKCsByRegion(regionId: RegionId): KnowledgeComponent[] {
  return KC_LIST.filter((kc) => kc.homeRegion === regionId);
}

export function getR1ActiveKCs(): KnowledgeComponent[] {
  return KC_LIST.filter((kc) => kc.r1Tier !== 'locked');
}

export function arePrerequisitesMet(
  kcId: string,
  masteredOrPracticedIds: Set<string>
): boolean {
  const kc = KC_MAP.get(kcId);
  if (!kc) return false;
  return kc.prerequisites.every((pre) => masteredOrPracticedIds.has(pre));
}

export function getPrerequisiteEdges(): Array<{ from: string; to: string }> {
  const edges: Array<{ from: string; to: string }> = [];
  for (const kc of KC_LIST) {
    for (const pre of kc.prerequisites) {
      edges.push({ from: pre, to: kc.id });
    }
  }
  return edges;
}
