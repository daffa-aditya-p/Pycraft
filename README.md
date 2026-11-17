# 🏰 PYCRAFT — Code Your World

> **A local-first 3D voxel adventure game where real Python code brings Aetheria back to life.**

PyCraft menggabungkan keajaiban petualangan voxel 3D dengan kekuatan pembelajaran pemrograman Python nyata (*in-browser WebAssembly* via Pyodide). Pemain berperan sebagai seorang Arsitek yang memulihkan kepulauan terapung Aetheria dengan memprogram automaton pendamping bernama **BIT**.

---

## 🚀 Memulai (Quick Start)

### Persyaratan
- Node.js (v20+ disarankan)
- Browser modern (Chrome, Edge, Firefox, Safari)

### Menjalankan Game Secara Lokal

```bash
# Pasang dependensi
npm install

# Jalankan server pengembangan
npm run dev
```

Buka peramban Anda di **http://localhost:5173/**.

---

## 📖 Panduan Lengkap (Guidebook)

Panduan komprehensif untuk pemain, kontrol, kurikulum misi Python, dan mekanisme penyimpanan lokal tersedia di:
👉 **[docs/GUIDEBOOK.md](file:///c:/Proyek%20Coding/PyCraft/Pycraft/docs/GUIDEBOOK.md)**

---

## 🛠️ Fitur Unggulan

- 🎮 **3D Voxel World**: Rendering isometrik dan third-person berbasis Three.js dengan palet warna terkalibrasi.
- 🐍 **Real Python Runtime**: Eksekusi Python 3.12 nyata di browser via Pyodide WebAssembly tanpa server backend.
- 💾 **Local-First & Offline**: 100% data tersimpan di IndexedDB lokal dengan fitur **Ekspor/Impor berkas `.json`** yang aman (verifikasi SHA-256 & proteksi hold-to-confirm).
- 🎬 **Cinematic Intro & Voiceover**: Animasi kamera sinematik 3D saat pertama kali memasuki dunia Aetheria, dilengkapi suara narator dan alunan pad audio harmonik lokal.
- 🤖 **BIT Companion**: Automaton interaktif yang menjalankan perintah kode di dunia 3D.
- 🧭 **Curated Mentor**: Penerjemah galat ramah pemula berbahasa Indonesia dan tangga petunjuk 4 tingkat (*4-rung hint ladder*).

---

## 🧪 Perintah Pengujian & Build

```bash
# Typecheck TypeScript
npm run typecheck

# Jalankan Unit & Integration Test
npm test

# Build untuk Produksi (PWA siap offline)
npm run build
```
