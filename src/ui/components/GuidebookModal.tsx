import React, { useEffect, useState } from 'react';
import { useSettingsStore } from '@/stores';
import {
  IconCamera,
  IconClose,
  IconFolder,
  IconHint,
  IconJournal,
  IconKeyboard,
  IconMap,
  IconSpark,
  IconTerminal,
} from '../icons';

export interface GuidebookModalProps {
  open: boolean;
  onClose: () => void;
}

type GuidebookTab =
  | 'overview'
  | 'save_json'
  | 'controls'
  | 'camera'
  | 'bit_api'
  | 'missions'
  | 'mentor';

export const GuidebookModal: React.FC<GuidebookModalProps> = ({ open, onClose }) => {
  const locale = useSettingsStore((s) => s.locale);
  const [activeTab, setActiveTab] = useState<GuidebookTab>('overview');

  // Handle Escape key to close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const tabs: Array<{ id: GuidebookTab; labelId: string; labelEn: string; icon: React.ReactNode }> = [
    {
      id: 'overview',
      labelId: 'Kisah Aetheria',
      labelEn: 'Aetheria Lore',
      icon: <IconSpark size={16} />,
    },
    {
      id: 'save_json',
      labelId: 'Kenapa Ada .json?',
      labelEn: 'Why .json Saves?',
      icon: <IconFolder size={16} />,
    },
    {
      id: 'controls',
      labelId: 'Kontrol & Tombol',
      labelEn: 'Controls & Keys',
      icon: <IconKeyboard size={16} />,
    },
    {
      id: 'camera',
      labelId: 'Kamera Ganda',
      labelEn: 'Dual Camera',
      icon: <IconCamera size={16} />,
    },
    {
      id: 'bit_api',
      labelId: 'Robot BIT & Python',
      labelEn: 'BIT Robot & Python',
      icon: <IconTerminal size={16} />,
    },
    {
      id: 'missions',
      labelId: 'Kurikulum Misi',
      labelEn: 'Mission Curriculum',
      icon: <IconMap size={16} />,
    },
    {
      id: 'mentor',
      labelId: 'Mentor & Bantuan',
      labelEn: 'Mentor & Hints',
      icon: <IconHint size={16} />,
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guidebook-title"
      data-testid="guidebook-modal"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        backgroundColor: 'rgba(14, 50, 78, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        pointerEvents: 'auto',
      }}
    >
      <div
        className="surface-slate"
        style={{
          width: '100%',
          maxWidth: '920px',
          height: '85dvh',
          maxHeight: '740px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFDF7',
          border: '2px solid #7CC4DF',
          boxShadow: '0 20px 44px rgba(15, 52, 76, 0.25)',
          borderRadius: '14px',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <header
          style={{
            padding: '14px 20px',
            background: 'linear-gradient(135deg, #0E7490 0%, #0284C7 100%)',
            borderBottom: '2px solid #0369A1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: '#FDE68A', display: 'inline-flex' }}>
              <IconJournal size={22} />
            </span>
            <div>
              <h2
                id="guidebook-title"
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  letterSpacing: '0.03em',
                }}
              >
                {locale === 'id' ? 'Buku Panduan Resmi Arsitek' : 'Architect Official Guidebook'}
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-code)',
                  color: '#BAE6FD',
                }}
              >
                PYCRAFT v0.1.0 // AETHERIA CODING MANUAL
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-slate touch-target-48"
            aria-label={locale === 'id' ? 'Tutup Panduan' : 'Close Guidebook'}
            onClick={onClose}
            style={{ minWidth: '40px', minHeight: '40px', padding: '6px' }}
          >
            <IconClose size={18} />
          </button>
        </header>

        {/* Modal Body: Sidebar Tabs + Content Panel */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Navigation Sidebar */}
          <nav
            aria-label="Guidebook Sections"
            style={{
              width: '230px',
              backgroundColor: '#EEF7FB',
              borderRight: '1.5px solid #B6DCEB',
              display: 'flex',
              flexDirection: 'column',
              padding: '10px',
              gap: '6px',
              overflowY: 'auto',
              flexShrink: 0,
            }}
          >
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    backgroundColor: active ? '#FFFFFF' : 'transparent',
                    color: active ? '#0E7490' : '#335267',
                    border: '1.5px solid',
                    borderColor: active ? '#7CC4DF' : 'transparent',
                    borderLeft: active ? '4px solid #F59E0B' : '4px solid transparent',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    fontWeight: active ? 700 : 500,
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 120ms ease',
                  }}
                >
                  <span style={{ color: active ? '#F59E0B' : '#4C697C' }}>{tab.icon}</span>
                  <span>{locale === 'id' ? tab.labelId : tab.labelEn}</span>
                </button>
              );
            })}
          </nav>

          {/* Main Article Content Panel */}
          <article
            style={{
              flex: 1,
              padding: '24px 32px',
              overflowY: 'auto',
              color: '#172B3A',
              fontSize: '0.9375rem',
              lineHeight: 1.6,
            }}
          >
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <section>
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: '#FEF3C7',
                    borderLeft: '4px solid #F59E0B',
                    marginBottom: '16px',
                    borderRadius: '0 8px 8px 0',
                  }}
                >
                  <strong style={{ color: '#B45309' }}>
                    {locale === 'id' ? 'Selamat Datang di Aetheria!' : 'Welcome to Aetheria!'}
                  </strong>
                  <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#451A03' }}>
                    {locale === 'id'
                      ? 'Dunia voxel terapung di mana bahasa pemrograman Python adalah sihir nyata yang menghidupkan alam semesta.'
                      : 'A floating voxel realm where real Python programming code is the magic that awakens the universe.'}
                  </p>
                </div>

                <h3 style={{ color: '#0E7490', marginTop: 0 }}>
                  {locale === 'id' ? 'Kisah Sang Arsitek' : 'The Tale of the Architect'}
                </h3>
                <p>
                  {locale === 'id'
                    ? 'Aetheria dulunya adalah peradaban megah yang ditenagai oleh Menara Inti (Core Spire). Ketika Inti melemah, pulau-pulau terpecah menjadi 8 wilayah terapung yang tertidur dan kehilangan energinya. Anda adalah Sang Arsitek yang ditakdirkan untuk membangunkan kembali pulau-pulau ini dengan memprogram ulang sistem monolit kuno.'
                    : 'Aetheria was once a majestic realm powered by the Core Spire. When the Core faded, islands drifted apart into 8 floating dormant sectors. You are the Architect destined to awaken these islands by reprogramming ancient monolith systems with real Python code.'}
                </p>

                <h4 style={{ color: '#B45309', marginTop: '20px' }}>
                  {locale === 'id' ? 'Mekanisme Permainan' : 'Core Game Loop'}
                </h4>
                <ul style={{ paddingLeft: '20px', color: '#335267' }}>
                  <li>
                    <strong style={{ color: '#172B3A' }}>
                      {locale === 'id' ? 'Jelajahi Pulau 3D:' : 'Explore 3D Islands:'}
                    </strong>{' '}
                    {locale === 'id'
                      ? 'Berjalan, melompat antar tebing terapung, dan temukan pedestal monolit tersembunyi.'
                      : 'Walk, jump across floating cliffs, and discover ancient puzzle pedestals.'}
                  </li>
                  <li>
                    <strong style={{ color: '#172B3A' }}>
                      {locale === 'id' ? 'Pecahkan Puzzle dengan Python:' : 'Solve Puzzles with Python:'}
                    </strong>{' '}
                    {locale === 'id'
                      ? 'Tulis kode Python nyata di editor untuk menggerakkan automaton BIT, membangun jembatan, dan membuka gerbang.'
                      : 'Write real Python in the editor to control BIT the automaton, build bridges, and unlock logic gates.'}
                  </li>
                  <li>
                    <strong style={{ color: '#172B3A' }}>
                      {locale === 'id' ? 'Restorasi Dunia:' : 'Restore the Realm:'}
                    </strong>{' '}
                    {locale === 'id'
                      ? 'Setiap kali kode Anda berhasil, pulau tersebut dipulihkan seketika dengan air terjun yang mengalir dan vegetasi yang mekar!'
                      : 'Every puzzle passed restores the island with flowing waters and blooming flora in real-time!'}
                  </li>
                </ul>
              </section>
            )}

            {/* TAB 2: WHY .JSON */}
            {activeTab === 'save_json' && (
              <section>
                <h3 style={{ color: '#0E7490', marginTop: 0 }}>
                  {locale === 'id'
                    ? 'Kenapa Ada Fitur Impor & Ekspor .json?'
                    : 'Why Does PyCraft Have .json Import/Export?'}
                </h3>
                <p>
                  {locale === 'id'
                    ? 'Banyak pemain bertanya mengapa ada format berkas .json di PyCraft. Hal ini berakar pada prinsip utama kami: Local-First & Zero Lock-In.'
                    : 'Many players ask why .json files exist in PyCraft. This stems directly from our core philosophy: Local-First & Zero Lock-In.'}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                  <div
                    style={{
                      padding: '12px 16px',
                      backgroundColor: '#F0F9FF',
                      border: '1.5px solid #BAE6FD',
                      borderRadius: '10px',
                    }}
                  >
                    <strong style={{ color: '#0E7490' }}>
                      {locale === 'id'
                        ? '1. 100% Bebas Akun & Tanpa Server Cloud'
                        : '1. 100% No Account & No Cloud Server'}
                    </strong>
                    <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#335267' }}>
                      {locale === 'id'
                        ? 'Semua data petualangan Anda disimpan langsung di memori browser Anda (IndexedDB). Anda tidak perlu mendaftar akun, tidak ada kata sandi, dan data Anda tidak pernah dikirim ke pihak ketiga.'
                        : 'All adventure data lives directly inside your browser storage (IndexedDB). No sign-up required, zero passwords, and your data is never uploaded to third parties.'}
                    </p>
                  </div>

                  <div
                    style={{
                      padding: '12px 16px',
                      backgroundColor: '#F0F9FF',
                      border: '1.5px solid #BAE6FD',
                      borderRadius: '10px',
                    }}
                  >
                    <strong style={{ color: '#0E7490' }}>
                      {locale === 'id'
                        ? '2. Pindah Komputer & Browser Tanpa Batasan'
                        : '2. Switch Devices & Browsers Seamlessly'}
                    </strong>
                    <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#335267' }}>
                      {locale === 'id'
                        ? 'Ingin bermain di komputer sekolah lalu lanjut di rumah? Cukup klik "Ekspor (.pycraft.json)" untuk mengunduh save game Anda. Di komputer lain, klik "Impor .json" untuk melanjutkan langsung!'
                        : 'Playing on a school laptop and want to continue at home? Simply click "Export (.pycraft.json)" to download your save. On another computer, click "Import .json" to resume immediately!'}
                    </p>
                  </div>

                  <div
                    style={{
                      padding: '12px 16px',
                      backgroundColor: '#F0F9FF',
                      border: '1.5px solid #BAE6FD',
                      borderRadius: '10px',
                    }}
                  >
                    <strong style={{ color: '#0E7490' }}>
                      {locale === 'id'
                        ? '3. Keamanan SHA-256 & Proteksi Tahan 1.5 Detik'
                        : '3. SHA-256 Checksums & 1.5s Hold Guard'}
                    </strong>
                    <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#335267' }}>
                      {locale === 'id'
                        ? 'Setiap berkas .json diverifikasi dengan sidik jari SHA-256 untuk memastikan data tidak korup. Jika Anda menimpa slot yang sudah ada, game mewajibkan Anda menahan tombol 1,5 detik dan secara otomatis membuat cadangan darurat terlebih dahulu.'
                        : 'Every .json file is verified with a SHA-256 fingerprint to ensure it is not corrupted. Overwriting an occupied slot requires holding for 1.5 seconds and generates an automatic safety backup first.'}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* TAB 3: CONTROLS */}
            {activeTab === 'controls' && (
              <section>
                <h3 style={{ color: '#0E7490', marginTop: 0 }}>
                  {locale === 'id' ? 'Panduan Kontrol Lengkap' : 'Complete Controls Guide'}
                </h3>

                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    marginTop: '12px',
                    fontSize: '0.875rem',
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#E0F2FE', borderBottom: '2px solid #7DD3FC' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', color: '#0E7490' }}>
                        {locale === 'id' ? 'Tombol' : 'Key'}
                      </th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', color: '#0E7490' }}>
                        {locale === 'id' ? 'Fungsi' : 'Action'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #E2EEF4' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-code)', fontWeight: 700, color: '#0E7490' }}>
                        W, A, S, D / Panah
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {locale === 'id' ? 'Bergerak / Berjalan' : 'Move character'}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #E2EEF4' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-code)', fontWeight: 700, color: '#0E7490' }}>
                        Shift (Tahan)
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {locale === 'id' ? 'Berlari cepat (Sprint)' : 'Sprint'}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #E2EEF4' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-code)', fontWeight: 700, color: '#0E7490' }}>
                        Spasi (Space)
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {locale === 'id' ? 'Melompat' : 'Jump'}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #E2EEF4' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-code)', fontWeight: 700, color: '#B45309' }}>
                        E
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <strong>{locale === 'id' ? 'Interaksi Pedestal / NPC / Item' : 'Interact (Pedestal / NPC)'}</strong>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #E2EEF4' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-code)', fontWeight: 700, color: '#B45309' }}>
                        Tab
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <strong>{locale === 'id' ? 'Buka / Tutup Editor Kode Python' : 'Open / Close Python Editor'}</strong>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #E2EEF4' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-code)', fontWeight: 700, color: '#0E7490' }}>
                        V
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {locale === 'id' ? 'Beralih Kamera (Orang Ketiga ↔ Isometrik)' : 'Toggle Camera (3rd Person ↔ Isometric)'}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #E2EEF4' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-code)', fontWeight: 700, color: '#0E7490' }}>
                        Z / C
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {locale === 'id' ? 'Putar kamera isometrik 90° ke kiri / kanan' : 'Rotate isometric view 90° left / right'}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #E2EEF4' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-code)', fontWeight: 700, color: '#0E7490' }}>
                        J / I / K
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {locale === 'id' ? 'Buka Jurnal Arsitek (Teori & Catatan Belajar)' : 'Open Architect Journal'}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #E2EEF4' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-code)', fontWeight: 700, color: '#0E7490' }}>
                        M
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {locale === 'id' ? 'Buka Peta Dunia 8 Wilayah' : 'Open 8-Region World Map'}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #E2EEF4' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-code)', fontWeight: 700, color: '#DC2626' }}>
                        Esc / P
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {locale === 'id' ? 'Jeda / Menu Pause' : 'Pause Menu'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </section>
            )}

            {/* TAB 4: CAMERA */}
            {activeTab === 'camera' && (
              <section>
                <h3 style={{ color: '#0E7490', marginTop: 0 }}>
                  {locale === 'id' ? 'Sistem Kamera Ganda PyCraft' : 'PyCraft Dual-Camera System'}
                </h3>
                <p>
                  {locale === 'id'
                    ? 'PyCraft memiliki dua perspektif kamera yang dirancang untuk dua tujuan berbeda:'
                    : 'PyCraft features two camera perspectives purpose-built for different needs:'}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: '#FEF3C7',
                      border: '1.5px solid #FCD34D',
                      borderRadius: '10px',
                    }}
                  >
                    <h4 style={{ color: '#B45309', margin: '0 0 8px' }}>
                      {locale === 'id' ? '1. Mode Orang Ketiga (V)' : '1. Third-Person View (V)'}
                    </h4>
                    <p style={{ fontSize: '0.875rem', color: '#451A03', margin: 0 }}>
                      {locale === 'id'
                        ? 'Perspektif dinamis mengikuti karakter Anda dengan lensa 46° FOV. Sangat nyaman untuk berlari, menjelajahi alam Aetheria, melompat antar pulau, dan menikmati visual 3D.'
                        : 'Dynamic following camera with 46° FOV. Ideal for navigating islands, platforming, and enjoying scenery.'}
                    </p>
                  </div>

                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: '#ECFEFF',
                      border: '1.5px solid #67E8F9',
                      borderRadius: '10px',
                    }}
                  >
                    <h4 style={{ color: '#0E7490', margin: '0 0 8px' }}>
                      {locale === 'id' ? '2. Mode Isometrik Grid (V)' : '2. True-Grid Isometric (V)'}
                    </h4>
                    <p style={{ fontSize: '0.875rem', color: '#155E75', margin: 0 }}>
                      {locale === 'id'
                        ? 'Sudut kemiringan presisi ~35.264° dengan lensa ortografis semu 16° FOV. Menghilangkan distorsi perspektif dan menampilkan grid kotak-kotak sempurna saat Anda memprogram langkah BIT.'
                        : 'True ~35.264° isometric angle with 16° FOV. Eliminates perspective distortion for precise grid coordinate planning.'}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '16px',
                    padding: '10px 14px',
                    backgroundColor: '#FFFBEB',
                    border: '1.5px solid #FDE68A',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    color: '#92400E',
                  }}
                >
                  <strong style={{ color: '#B45309' }}>💡 {locale === 'id' ? 'Tips' : 'Tip'}:</strong>{' '}
                  {locale === 'id'
                    ? 'Saat dalam mode Isometrik, tekan Z untuk memutar pandangan 90° ke kiri, dan C untuk memutar 90° ke kanan!'
                    : 'While in Isometric mode, press Z to rotate 90° left and C to rotate 90° right!'}
                </div>
              </section>
            )}

            {/* TAB 5: BIT ROBOT & PYTHON */}
            {activeTab === 'bit_api' && (
              <section>
                <h3 style={{ color: '#0E7490', marginTop: 0 }}>
                  {locale === 'id' ? 'Robot BIT & Perintah Python' : 'BIT Robot & Python Commands'}
                </h3>
                <p>
                  {locale === 'id'
                    ? 'BIT adalah automaton cerdas yang mengeksekusi instruksi Python Anda di dunia 3D. Kode yang Anda jalankan dieksekusi secara nyata oleh mesin Python 3.12 (Pyodide WebAssembly).'
                    : 'BIT is your automaton companion who executes Python commands in the 3D world. Your code is executed natively by Python 3.12 via WebAssembly.'}
                </p>

                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid #B6DCEB',
                    borderLeft: '4px solid #0891B2',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    fontFamily: 'var(--font-code)',
                    fontSize: '0.8125rem',
                    color: '#0F172A',
                    lineHeight: 1.7,
                  }}
                >
                  <div style={{ color: '#15803D' }}># 1. Menggerakkan BIT</div>
                  <div>bit.move()          <span style={{ color: '#15803D' }}># Maju 1 petak</span></div>
                  <div>bit.turn_left()     <span style={{ color: '#15803D' }}># Belok kiri 90°</span></div>
                  <div>bit.turn_right()    <span style={{ color: '#15803D' }}># Belok kanan 90°</span></div>
                  <br />
                  <div style={{ color: '#15803D' }}># 2. Manipulasi Blok & Item</div>
                  <div>bit.place("wood")   <span style={{ color: '#15803D' }}># Tempatkan balok kayu</span></div>
                  <div>bit.plant("seed")   <span style={{ color: '#15803D' }}># Tanam bibit energi</span></div>
                  <div>bit.collect()       <span style={{ color: '#15803D' }}># Ambil kristal di petak</span></div>
                  <br />
                  <div style={{ color: '#15803D' }}># 3. Sensor Lingkungan</div>
                  <div>if bit.is_blocked():</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;bit.turn_left()</div>
                </div>
              </section>
            )}

            {/* TAB 6: MISSIONS CURRICULUM */}
            {activeTab === 'missions' && (
              <section>
                <h3 style={{ color: '#0E7490', marginTop: 0 }}>
                  {locale === 'id' ? 'Kurikulum Misi Wilayah Kebangkitan' : 'Awakening Mission Curriculum'}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                  <div style={{ padding: '12px 14px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderLeft: '4px solid #F59E0B', borderRadius: '8px' }}>
                    <strong style={{ color: '#B45309' }}>Misi 1: Halo Arsitek (Hello Architect)</strong>
                    <div style={{ fontSize: '0.8125rem', color: '#451A03', marginTop: '4px' }}>
                      {locale === 'id'
                        ? 'Pengenalan fungsi print(), string teks, eksekusi kode atas ke bawah, dan penulisan komentar #'
                        : 'Introduction to print(), string literals, top-to-bottom execution order, and comments #'}
                    </div>
                  </div>

                  <div style={{ padding: '12px 14px', backgroundColor: '#ECFEFF', border: '1px solid #A5F3FC', borderLeft: '4px solid #0891B2', borderRadius: '8px' }}>
                    <strong style={{ color: '#0E7490' }}>Misi 2: Pengumpul Data (Data Collector)</strong>
                    <div style={{ fontSize: '0.8125rem', color: '#155E75', marginTop: '4px' }}>
                      {locale === 'id'
                        ? 'Variabel, angka integer & float, operasi aritmetika (+, -, *, /), dan pembangunan jembatan kayu'
                        : 'Variables, numeric types (int, float), arithmetic operators, and bridge building'}
                    </div>
                  </div>

                  <div style={{ padding: '12px 14px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderLeft: '4px solid #16A34A', borderRadius: '8px' }}>
                    <strong style={{ color: '#15803D' }}>Misi 3: Gerbang Terkunci (The Locked Gate)</strong>
                    <div style={{ fontSize: '0.8125rem', color: '#14532D', marginTop: '4px' }}>
                      {locale === 'id'
                        ? 'Percabangan logika if, elif, else, operator perbandingan (==, !=, <, >), dan operator boolean (and, or, not)'
                        : 'Conditional branching with if, elif, else, comparison operators, and boolean logic'}
                    </div>
                  </div>

                  <div style={{ padding: '12px 14px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderLeft: '4px solid #F59E0B', borderRadius: '8px' }}>
                    <strong style={{ color: '#B45309' }}>Misi 4: Ladang Otomatis (Automated Farm)</strong>
                    <div style={{ fontSize: '0.8125rem', color: '#451A03', marginTop: '4px' }}>
                      {locale === 'id'
                        ? 'Perulangan terhitung for i in range(), perulangan while, serta otomasi menanam & memanen di petak grid'
                        : 'Count-controlled for loops with range(), while loops, and grid automation'}
                    </div>
                  </div>

                  <div style={{ padding: '12px 14px', backgroundColor: '#F3E8FF', border: '1px solid #D8B4FE', borderLeft: '4px solid #7C3AED', borderRadius: '8px' }}>
                    <strong style={{ color: '#6D28D9' }}>Misi 5: Cetak Biru (The Blueprint)</strong>
                    <div style={{ fontSize: '0.8125rem', color: '#4C1D95', marginTop: '4px' }}>
                      {locale === 'id'
                        ? 'Fungsi kustom def nama():, nilai kembalian return, modularitas kode, dan aktivasi Menara Inti (Core Spire)'
                        : 'Custom functions def fn():, return values, modular code architecture, and restoring Core Spire'}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* TAB 7: MENTOR & HINTS */}
            {activeTab === 'mentor' && (
              <section>
                <h3 style={{ color: '#0E7490', marginTop: 0 }}>
                  {locale === 'id' ? 'Mentor AI Lokal & Bantuan Galat' : 'Curated Mentor & Friendly Errors'}
                </h3>
                <p>
                  {locale === 'id'
                    ? 'PyCraft dilengkapi sistem pembelajaran cerdas yang mendampingi Anda tanpa perlu koneksi internet:'
                    : 'PyCraft features an offline pedagogical mentor designed to guide you through errors:'}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                  <div style={{ padding: '12px 14px', backgroundColor: '#ECFEFF', border: '1.5px solid #A5F3FC', borderRadius: '10px' }}>
                    <strong style={{ color: '#0E7490' }}>
                      {locale === 'id' ? '1. Terjemahan Galat Bahasa Indonesia' : '1. Friendly Error Translator'}
                    </strong>
                    <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#155E75' }}>
                      {locale === 'id'
                        ? 'Pesan galat teknis Python (seperti SyntaxError, NameError, IndentationError) diterjemahkan ke penjelasan yang santun dan mudah dipahami.'
                        : 'Cryptic Python tracebacks are automatically converted into friendly, constructive explanations.'}
                    </p>
                  </div>

                  <div style={{ padding: '12px 14px', backgroundColor: '#FEF3C7', border: '1.5px solid #FDE68A', borderRadius: '10px' }}>
                    <strong style={{ color: '#B45309' }}>
                      {locale === 'id' ? '2. Tangga Petunjuk 4 Tingkat (Hint Ladder)' : '2. 4-Rung Hint Ladder'}
                    </strong>
                    <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#451A03' }}>
                      {locale === 'id'
                        ? 'Tombol petunjuk memberikan bantuan bertahap: (1) Konsep dasar -> (2) Arah perbaikan -> (3) Contoh kode serupa -> (4) Solusi lengkap jika Anda benar-benar buntu.'
                        : 'Hints unlock progressively: (1) Concept reminder -> (2) Directional hint -> (3) Pseudocode example -> (4) Full solution fallback.'}
                    </p>
                  </div>
                </div>
              </section>
            )}
          </article>
        </div>

        {/* Modal Footer */}
        <footer
          style={{
            padding: '12px 20px',
            backgroundColor: '#F0F9FF',
            borderTop: '1.5px solid #B6DCEB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: '#4C697C',
          }}
        >
          <span>
            {locale === 'id'
              ? 'Tekan [Esc] untuk menutup panduan'
              : 'Press [Esc] to close guidebook'}
          </span>
          <button
            type="button"
            className="btn-primary-chamfer"
            onClick={onClose}
            style={{ padding: '8px 20px', minHeight: '36px', fontSize: '0.875rem' }}
          >
            {locale === 'id' ? 'Mengerti' : 'Got it'}
          </button>
        </footer>
      </div>
    </div>
  );
};
