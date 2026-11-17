# 📘 PYCRAFT — Panduan Resmi Arsitek (Official Guidebook)

> **"Code Your World — Bangkitkan Aetheria dengan Kekuatan Kode Python Nyata."**

Selamat datang di **PyCraft**! Dokumen ini adalah panduan lengkap bagi pemain, arsitek, dan pendidik untuk memahami dunia Aetheria, mekanisme permainan, kontrol, kurikulum pemrograman Python, hingga sistem penyimpanan lokal (*local-first save system*).

---

## 📑 Daftar Isi

1. [Tentang PyCraft & Dunia Aetheria](#1-tentang-pycraft--dunia-aetheria)
2. [Kenapa Ada Fitur "Impor .json"? (Sistem Penyimpanan Lokal)](#2-kenapa-ada-fitur-impor-json-sistem-penyimpanan-lokal)
3. [Panduan Kontrol Permainan](#3-panduan-kontrol-permainan)
4. [Sistem Kamera Ganda (Dual-Camera System)](#4-sistem-kamera-ganda-dual-camera-system)
5. [Mengenal BIT — Sahabat Otomasi Anda](#5-mengenal-bit--sahabat-otomasi-anda)
6. [Kurikulum & Misi Wilayah Kebangkitan (R1 Awakening)](#6-kurikulum--misi-wilayah-kebangkitan-r1-awakening)
7. [Editor Kode & Mentor AI Lokal](#7-editor-kode--mentor-ai-lokal)
8. [Tips & Trik Menyelesaikan Puzzle](#8-tips--trik-menyelesaikan-puzzle)
9. [Spesifikasi Teknis & Mode Offline](#9-spesifikasi-teknis--mode-offline)

---

## 1. Tentang PyCraft & Dunia Aetheria

**Aetheria** adalah kepulauan voxel terapung yang tertidur setelah Menara Inti (*Core Spire*) kehilangan energinya. Sebagai seorang **Arsitek**, tugas Anda adalah menjelajahi pulau demi pulau, memecahkan teka-teki kuno, dan memprogram kembali sistem dunia menggunakan **bahasa pemrograman Python asli**.

Setiap blok, gerbang logika, jembatan energi, dan tanaman di Aetheria merespons kode yang Anda tulis. Ketika kode Anda benar, pulau yang semula redup akan kembali bersinar dengan air terjun yang mengalir dan vegetasi yang bermekaran.

### 🎬 Sinematik Prolog & Suara Narator Aetheria (Cinematic Intro)
Saat pemain memulai petualangan baru, PyCraft secara otomatis memutar animasi sinematik kamera 3D yang memperkenalkan lore dan keindahan kepulauan Aetheria:
1. **Prolog Aetheria**: Kamera mengorbit tinggi di atas samudra awan menampakkan siluet kepulauan voxel.
2. **Bab I • Menara Inti**: Sorotan megah Menara Inti (*Core Spire*) yang dahulunya menjadi sumber daya kehidupan.
3. **Bab II • Zaman Kesunyian**: Glide kamera menyusuri jembatan langit yang retak dan terminal suar yang tertidur.
4. **Bab III • Kedatangan Sang Arsitek**: Kamera meluncur turun ke Kuil Stasis (*Stasis Shrine*), membingkai karakter Arsitek pilihan Anda.
5. **Bab IV • Kebangkitan Logika**: Kamera memperlihatkan Arsitek dan robot BIT yang terbangun bersama dengan kicauan ceria.

#### 🎙️ Fitur Narator & Kontrol Sinematik:
- **Suara Narator Real-Time**: Narasi disuarakan secara lokal via Web Speech Synthesis (bahasa Indonesia & Inggris sesuai pengaturan pemain) dipadukan dengan *chord drone* harmonik Web Audio.
- **Lewati Cepat (*Fast Skip*)**: Pemain dapat menekan tombol **Lewati**, tombol **[Spasi]**, atau **[Esc]** kapan saja untuk langsung melompat ke dunia petualangan interaktif.
- **Navigasi Bab**: Tombol panah **[ ← ]** dan **[ → ]** memungkinkan navigasi antar babak cerita.
- **Tonton Ulang Kapan Saja**: Sinematik dapat diputar ulang sewaktu-waktu dari **Menu Jeda (Pause) > Tonton Ulang Sinematik**.

---

## 2. Kenapa Ada Fitur "Impor .json"? (Sistem Penyimpanan Lokal)

Di layar **Pilih Petualangan** (*Save Management*) dan menu **Pause**, Anda akan melihat tombol **"Impor .json"** dan **"Ekspor (.pycraft.json)"**. 

### ❓ Mengapa fitur ini ada?

1. **100% Bebas Akun & Privasi Penuh (*Local-First*)**:
   - PyCraft dirancang dengan filosofi *local-first*. Semua data petualangan (nama pemain, rank, kode Python yang Anda tulis, inventaris, dan status restorasi pulau) disimpan langsung di peramban Anda (**IndexedDB**) tanpa memerlukan login akun, server cloud pihak ketiga, atau pelacakan internet.
2. **Pindah Perangkat & Browser dengan Mudah**:
   - Jika Anda bermain di laptop sekolah, lalu ingin melanjutkan di PC rumah, Anda cukup menekan tombol **Ekspor** untuk mengunduh berkas `.pycraft.json`. Di komputer lain, cukup klik **"Impor .json"** untuk memuat petualangan Anda seketika.
3. **Pencadangan (*Backup*) Mandiri**:
   - Menghindari kehilangan data jika cache browser Anda terhapus atau dibersihkan. Anda dapat menyimpan berkas cadangan kapan saja.
4. **Berbagi Puzzle & Tugas Belajar**:
   - Guru atau mentor dapat membagikan template save file kepada siswa, atau siswa dapat mengumpulkan berkas petualangan mereka sebagai bukti keberhasilan menyelesaikan misi.

### 🛡️ Mekanisme Keamanan Impor Data

- **Pemeriksaan Integritas SHA-256**: Setiap berkas `.pycraft.json` memiliki sidik jari kriptografi (hash SHA-256). PyCraft memverifikasi berkas sebelum dimuat untuk mencegah data korup atau rusak.
- **Proteksi Tahan 1.5 Detik (*Hold-to-Confirm*)**: Jika Anda mengimpor data ke slot yang sudah terisi, game mewajibkan Anda menahan tombol konfirmasi selama 1,5 detik guna mencegah penimpaan yang tidak disengaja.
- **Pencadangan Otomatis (*Auto-Rollback Backup*)**: Sebelum slot yang ada ditimpa oleh berkas impor, sistem secara otomatis mencadangkan data lama ke memori lokal.

---

## 3. Panduan Kontrol Permainan

PyCraft mendukung kontrol penuh melalui **Keyboard + Mouse** (Desktop) maupun **Layar Sentuh** (Tablet/Smartphone).

### ⌨️ Kontrol Desktop (Keyboard & Mouse)

| Tombol / Aksi | Fungsi |
| :--- | :--- |
| **`W`, `A`, `S`, `D`** atau **Panah** | Berjalan / Menggerakkan karakter |
| **`Shift` (Tahan)** | Berlari cepat (*Sprint*) |
| **`Spasi`** | Melompat (*Jump*) |
| **`E`** | **Interaksi** (Bicara dengan NPC, aktifkan pedestal kode, ambil item, baca lore) |
| **`Tab`** | **Buka / Tutup Editor Kode Python** |
| **`V`** | **Beralih Kamera** (Orang Ketiga ↔ Isometrik Grid) |
| **`Z` / `C`** | Putar kamera isometrik 90° ke kiri / kanan |
| **`J` / `I` / `K`** | Buka **Jurnal & Catatan Belajar** (*Architect Journal*) |
| **`M`** | Buka **Peta Dunia & Progres Wilayah** |
| **`Esc`** atau **`P`** | Jeda permainan / Buka Menu Pause |
| **Klik Kanan + Tarik Mouse** | Memutar sudut kamera bebas (*Orbit*) |
| **Roda Mouse (*Scroll*)** | Memperbesar / memperkecil tampilan (*Zoom In / Out*) |

### 📱 Kontrol Perangkat Sentuh (Mobile / Tablet)

- **Joystick Virtual (Kiri Bawah)**: Tarik joystick untuk bergerak; tarik hingga batas terluar untuk otomatis berlari.
- **Tombol Aksi Kanan**:
  - Tombol **Lompat** (*Jump*).
  - Tombol **Interaksi (`E`)** kontekstual ketika mendekati objek interaktif.
  - Tombol **Editor Kode (`</>`)** di pojok kanan layar.
  - Tombol **Kamera (`V`)** untuk alih mode pandang.
- **Sentuh & Geser Layar Bebas**: Mengorbit dan memutar sudut pandang kamera 3D.
- **Cubit Layar (*Pinch*)**: Memperbesar atau memperkecil sudut pandang (*zoom*).

---

## 4. Sistem Kamera Ganda (Dual-Camera System)

PyCraft menghadirkan sistem kamera revolusioner untuk kenyamanan eksplorasi sekaligus presisi *coding*:

1. **Mode Orang Ketiga (*Third-Person Exploration*)**:
   - Kamera mengikuti di belakang karakter arsitek dengan perspektif dinamis 46° FOV.
   - Sempurna untuk menjelajahi alam Aetheria, berlari, melompat antar pulau terapung, dan menikmati pemandangan.
2. **Mode Isometrik True-Grid (*Puzzle Isometric Angle*)**:
   - Sudut pandang isometrik presisi ~35.264° dengan lensa ortografis semu (16° FOV).
   - Menyelaraskan seluruh blok dan petak dunia ke grid kotak-kotak yang jelas.
   - **Tombol `Z` dan `C`**: Memutar sudut pandang tepat 90 derajat searah/berlawanan jarum jam.
   - Sangat membantu saat Anda memprogram robot BIT untuk bergerak, menanam, atau menghitung koordinat blok.

---

## 5. Mengenal BIT — Sahabat Otomasi Anda

**BIT** (*Binary Intelligent Tracker*) adalah automaton kecil setia berbentuk kubus voxel cerdas yang menemani petualangan Anda. Saat Anda menulis skrip Python, BIT adalah entitas yang secara nyata menjalankan kode tersebut di dunia 3D.

### Contoh Perintah Dasar BIT di Python:

```python
# Menggerakkan BIT maju satu langkah
bit.move()

# Memutar arah hadap BIT ('left' atau 'right')
bit.turn_left()
bit.turn_right()

# Menempatkan blok voxel di petak saat ini
bit.place("stone")

# Memanen / mengambil item di depan BIT
bit.collect()

# Memeriksa kondisi petak di depan BIT
if bit.is_blocked():
    bit.turn_left()
```

BIT memiliki simulasi fisik terisolasi: ia tidak akan rusak jika terjadi galat (*error*), melainkan akan membunyikan kicauan ramah (*chirp*) dan menampilkan balon dialog petunjuk untuk membantu Anda memperbaiki kode!

---

## 6. Kurikulum & Misi Wilayah Kebangkitan (R1 Awakening)

Wilayah **Kebangkitan** (*The Awakening*) terdiri dari 7 pulau terapung dengan kurikulum Python terstruktur yang dirancang dari nol hingga mahir:

```
[Pulau Kuil] ➔ [Pulau Jembatan] ➔ [Pulau Kristal] ➔ [Pulau Ladang] ➔ [Menara Inti]
   (Misi 1)         (Misi 2)          (Misi 3)         (Misi 4)        (Misi 5)
```

### 🔹 Misi 1: Halo Arsitek (*Hello Architect*)
- **Konsep Inti**: Fungsi dasar `print()`, tipe data string (`"Halo Dunia"`), urutan eksekusi instruksi dari atas ke bawah, serta penulisan komentar kode `#`.
- **Objektif Dunia**: Mengaktifkan pedestal pertama di Kuil Kuno untuk menyalakan mercusuar energi.

### 🔹 Misi 2: Pengumpul Data (*Data Collector*)
- **Konsep Inti**: Variabel, penamaan identifier, tipe data angka (`int`, `float`), operasi matematika aritmetika (`+`, `-`, `*`, `/`, `//`, `%`), dan re-assignment variabel.
- **Objektif Dunia**: Mengukur bentang jurang dan membangun jembatan kayu untuk menghubungkan pulau terisolasi.

### 🔹 Misi 3: Gerbang Terkunci (*The Locked Gate*)
- **Konsep Inti**: Percabangan kondisi `if`, `elif`, `else`, operator relasional (`==`, `!=`, `<`, `>`, `<=`, `>=`), dan operator logika gabungan (`and`, `or`, `not`).
- **Objektif Dunia**: Memprogram mekanisme gerbang kristal agar terbuka hanya ketika sensor menerima bobot dan warna kristal yang sesuai.

### 🔹 Misi 4: Ladang Otomatis (*Automated Farm*)
- **Konsep Inti**: Perulangan terhitung `for i in range(n):`, perulangan kondisi `while`, navigasi grid 2 dimensi, dan penanganan pola berulang.
- **Objektif Dunia**: Memprogram robot BIT untuk membajak tanah, menanam benih energi, dan menyiram seluruh ladang dalam hitungan detik.

### 🔹 Misi 5: Cetak Biru (*The Blueprint*)
- **Konsep Inti**: Deklarasi fungsi mandiri `def nama_fungsi(parameter):`, nilai kembali (*return values*), pengkapsulan logika, dan modularitas kode.
- **Objektif Dunia**: Menghubungkan seluruh jaringan monolit dan menyalakan kembali Menara Inti (*Core Spire*) untuk memulihkan seluruh Aetheria!

---

## 7. Editor Kode & Mentor AI Lokal

Menekan tombol **`Tab`** akan membuka **Editor Kode PyCraft** (didukung oleh CodeMirror 6 dengan tema Slate khusus):

- **Pewarnaan Sintaks Khusus**: Kata kunci Python berwarna amber cerah, string hijau lumut, angka oranye, dan fungsi bawaan biru toska.
- **Eksekusi Langkah Demi Langkah (*Step Playback*)**: Anda dapat memutar ulang jalannya kode Anda baris demi baris, melihat perubahan nilai variabel secara langsung, dan menyaksikan pergerakan BIT secara bersamaan.
- **Mentor Bahasa Indonesia Kuno (*Curated Mentor*)**:
  - Jika kode Anda mengalami eror (seperti `SyntaxError`, `IndentationError`, atau `NameError`), PyCraft tidak sekadar menampilkan pesan teknis yang membingungkan.
  - Pesan eror diterjemahkan secara offline ke dalam **Bahasa Indonesia yang bersahabat dan mendidik**.
  - Dilengkapi **Tangga Petunjuk 4 Tingkat (*4-Rung Hint Ladder*)**:
    1. *Petunjuk Konsep*: Mengingatkan aturan dasar.
    2. *Petunjuk Arah*: Menunjukkan baris atau logika yang perlu diperiksa.
    3. *Contoh Serupa*: Memberikan potongan contoh kode yang relevan.
    4. *Solusi Lengkap*: Menampilkan solusi referensi jika Anda benar-benar buntu.

---

## 8. Tips & Trik Menyelesaikan Puzzle

1. **Gunakan Mode Kamera Isometrik (`V`) saat Coding**:
   - Sudut isometrik mempermudah Anda menghitung jumlah petak yang perlu dilalui BIT tanpa distorsi perspektif.
2. **Perhatikan Indentasi**:
   - Python sangat mengutamakan spasi di awal baris pada blok `if`, `for`, `while`, dan `def`. Gunakan 4 spasi atau tombol Tab.
3. **Cek Jurnal Arsitek (`J`)**:
   - Jurnal menyimpan ringkasan semua konsep Python yang telah Anda pelajari beserta contoh kodenya yang bisa Anda intip sewaktu-waktu.
4. **Manfaatkan Tombol Reset**:
   - Jika simulasi berjalan ke arah yang salah, tombol reset mengembalikan posisi BIT dan dunia ke kondisi awal puzzle seketika.

---

## 9. Spesifikasi Teknis & Mode Offline

- **Mesin Eksekusi Python**: Menggunakan **Pyodide (Python 3.12)** yang dikompilasi ke WebAssembly (WASM). Berjalan 100% di dalam mesin lokal komputer Anda tanpa memerlukan instalasi Python terpisah di sistem operasi!
- **Rendering 3D**: Didukung oleh **Three.js** dan WebGL dengan shader voxel deterministik yang ringan bahkan untuk laptop terintegrasi.
- **Dukungan PWA (Progressive Web App)**: PyCraft dapat diinstal ke desktop/ponsel Anda dan dimainkan sepenuhnya saat bepergian tanpa sambungan internet.
- **Pintasan Cepat Menu Utama**:
  - `[1]` Pilih Petualangan (Kelola Slot & Impor/Ekspor)
  - `[2]` Petualangan Baru
  - `[3]` Mode Permainan
  - `[4]` Dunia & Progres
  - `[5]` Pengaturan Sistem
  - `[L]` Ganti Bahasa (Indonesia ↔ English)
  - `[M]` Bisukan / Bunyikan Suara

---

*Selamat berpetualang, Sang Arsitek. Dunia Aetheria menanti sentuhan kodemu!*
