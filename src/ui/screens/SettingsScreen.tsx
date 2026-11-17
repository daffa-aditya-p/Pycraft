import React, { useState } from 'react';
import {
  useSettingsStore,
  useUIStore,
  type LocaleCode,
  type QualityPreset,
  type TextScaleOption,
} from '@/stores';
import { IconBack, IconReset } from '../icons';

export type SettingsTab =
  | 'audio'
  | 'graphics'
  | 'controls'
  | 'language'
  | 'accessibility'
  | 'storage';

export interface SettingsScreenProps {
  onResetPythonWorker?: () => void;
  onOpenSaveManagement?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onResetPythonWorker,
  onOpenSaveManagement,
}) => {
  const settings = useSettingsStore();
  const locale = settings.locale;
  const goBack = useUIStore((s) => s.goBack);
  const navigateTo = useUIStore((s) => s.navigateTo);
  const pushToast = useUIStore((s) => s.pushToast);
  const fullscreenSupported = useUIStore((s) => s.fullscreenSupported);
  const layoutClass = useUIStore((s) => s.layoutClass);
  const isCompact = layoutClass === 'L' || layoutClass === 'P';

  const [activeTab, setActiveTab] = useState<SettingsTab>('audio');

  const tabs: Array<{ id: SettingsTab; idLabel: string; enLabel: string }> = [
    { id: 'audio', idLabel: 'Audio', enLabel: 'Audio' },
    { id: 'graphics', idLabel: 'Grafis', enLabel: 'Graphics' },
    { id: 'controls', idLabel: 'Kontrol', enLabel: 'Controls' },
    { id: 'language', idLabel: 'Bahasa', enLabel: 'Language' },
    { id: 'accessibility', idLabel: 'Aksesibilitas', enLabel: 'Accessibility' },
    { id: 'storage', idLabel: 'Penyimpanan & Sistem', enLabel: 'Storage & System' },
  ];

  const handleResetWorker = () => {
    onResetPythonWorker?.();
    pushToast({
      kind: 'info',
      message:
        locale === 'id'
          ? 'Memulai ulang Python Worker…'
          : 'Restarting Python Worker…',
    });
  };

  return (
    <main
      data-testid="settings-screen"
      style={{
        position: 'fixed',
        inset: 0,
        overflowY: 'auto',
        padding: isCompact ? '12px' : '24px',
        backgroundColor: 'rgba(14, 50, 78, 0.42)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
    >
      <div
        className="surface-slate"
        style={{
          width: '100%',
          maxWidth: '920px',
          padding: isCompact ? '14px' : '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: isCompact ? '14px' : '20px',
          borderRadius: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button type="button" className="btn-slate" onClick={() => goBack()}>
            <IconBack size={18} />
            <span>{locale === 'id' ? 'Kembali' : 'Back'}</span>
          </button>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: isCompact ? '1.35rem' : '1.75rem',
              color: '#0E7490',
            }}
          >
            {locale === 'id' ? 'Pengaturan' : 'Settings'}
          </h1>
          <div style={{ width: isCompact ? '48px' : '90px' }} />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isCompact ? '1fr' : '220px 1fr',
            gap: '16px',
            alignItems: 'start',
          }}
        >
          {/* Section List */}
          <nav
            aria-label={locale === 'id' ? 'Kategori Pengaturan' : 'Settings Categories'}
            style={{
              display: 'flex',
              flexDirection: isCompact ? 'row' : 'column',
              flexWrap: isCompact ? 'wrap' : 'nowrap',
              gap: '8px',
            }}
          >
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={`settings-tab-${tab.id}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setActiveTab(tab.id)}
                  className="btn-slate"
                  style={{
                    justifyContent: 'flex-start',
                    borderColor: active ? '#0891B2' : '#CFE3EE',
                    color: active ? '#0E7490' : '#172B3A',
                    backgroundColor: active ? '#E0F2FE' : '#FFFFFF',
                  }}
                >
                  {locale === 'id' ? tab.idLabel : tab.enLabel}
                </button>
              );
            })}
          </nav>

          {/* Right Panel Content */}
          <section
            className="surface-slate-raised"
            style={{
              padding: isCompact ? '14px' : '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {activeTab === 'audio' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>
                    Audio
                  </h2>
                  <button
                    type="button"
                    className="btn-slate"
                    onClick={() => settings.resetSection('audio')}
                  >
                    <IconReset size={16} />
                    <span>{locale === 'id' ? 'Reset ke Default' : 'Reset to Default'}</span>
                  </button>
                </div>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span>
                    {locale === 'id' ? 'Volume Utama' : 'Master Volume'}:{' '}
                    {Math.round(settings.audio.master * 100)}%
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(settings.audio.master * 100)}
                    onChange={(e) =>
                      settings.updateAudio({ master: Number(e.target.value) / 100 })
                    }
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span>
                    {locale === 'id' ? 'Musik' : 'Music'}:{' '}
                    {Math.round(settings.audio.music * 100)}%
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(settings.audio.music * 100)}
                    onChange={(e) =>
                      settings.updateAudio({ music: Number(e.target.value) / 100 })
                    }
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span>
                    {locale === 'id' ? 'Efek Suara (SFX)' : 'Sound Effects (SFX)'}:{' '}
                    {Math.round(settings.audio.sfx * 100)}%
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(settings.audio.sfx * 100)}
                    onChange={(e) =>
                      settings.updateAudio({ sfx: Number(e.target.value) / 100 })
                    }
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '44px' }}>
                  <input
                    type="checkbox"
                    checked={settings.audio.muted}
                    onChange={(e) => settings.updateAudio({ muted: e.target.checked })}
                  />
                  <span>{locale === 'id' ? 'Bisukan Semua Suara' : 'Mute All Audio'}</span>
                </label>
              </>
            )}

            {activeTab === 'graphics' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>
                    {locale === 'id' ? 'Grafis' : 'Graphics'}
                  </h2>
                  <button
                    type="button"
                    className="btn-slate"
                    onClick={() => settings.resetSection('graphics')}
                  >
                    <IconReset size={16} />
                    <span>{locale === 'id' ? 'Reset ke Default' : 'Reset to Default'}</span>
                  </button>
                </div>

                <div>
                  <div style={{ marginBottom: '8px', color: '#335267', fontWeight: 600 }}>
                    {locale === 'id' ? 'Kualitas Render' : 'Render Quality'}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {(['high', 'medium', 'low'] as QualityPreset[]).map((q) => (
                      <button
                        key={q}
                        type="button"
                        aria-pressed={settings.graphics.quality === q}
                        className="btn-slate"
                        onClick={() => settings.updateGraphics({ quality: q }, 'manual')}
                        style={{
                          backgroundColor:
                            settings.graphics.quality === q ? '#FEF3C7' : '#FFFFFF',
                          borderColor:
                            settings.graphics.quality === q ? '#F59E0B' : '#CFE3EE',
                          color:
                            settings.graphics.quality === q ? '#B45309' : '#172B3A',
                        }}
                      >
                        {q === 'high'
                          ? locale === 'id'
                            ? 'Tinggi'
                            : 'High'
                          : q === 'medium'
                            ? locale === 'id'
                              ? 'Sedang'
                              : 'Medium'
                            : locale === 'id'
                              ? 'Rendah'
                              : 'Low'}
                      </button>
                    ))}
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '44px' }}>
                  <input
                    type="checkbox"
                    checked={settings.graphics.showFps}
                    onChange={(e) =>
                      settings.updateGraphics({ showFps: e.target.checked })
                    }
                  />
                  <span>{locale === 'id' ? 'Tampilkan Penghitung FPS' : 'Show FPS Overlay'}</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '44px' }}>
                  <input
                    type="checkbox"
                    checked={settings.graphics.autoDegrade}
                    onChange={(e) =>
                      settings.updateGraphics({ autoDegrade: e.target.checked })
                    }
                  />
                  <span>
                    {locale === 'id'
                      ? 'Penyesuaian kualitas otomatis saat FPS turun'
                      : 'Auto-adjust quality if framerate drops'}
                  </span>
                </label>

                {!fullscreenSupported && (
                  <div
                    style={{
                      padding: '10px 12px',
                      backgroundColor: '#E0F2FE',
                      border: '1.5px solid #7DD3FC',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      color: '#075985',
                    }}
                  >
                    {locale === 'id'
                      ? 'Layar penuh browser tidak tersedia di perangkat ini. Gunakan "Tambahkan ke Layar Utama" untuk bermain dalam mode layar penuh PWA.'
                      : 'Browser fullscreen is unavailable here. Use "Add to Home Screen" for full-screen PWA play.'}
                  </div>
                )}
              </>
            )}

            {activeTab === 'controls' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>
                    {locale === 'id' ? 'Kontrol' : 'Controls'}
                  </h2>
                  <button
                    type="button"
                    className="btn-slate"
                    onClick={() => settings.resetSection('controls')}
                  >
                    <IconReset size={16} />
                    <span>{locale === 'id' ? 'Reset ke Default' : 'Reset to Default'}</span>
                  </button>
                </div>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span>
                    {locale === 'id' ? 'Sensitivitas Kamera' : 'Camera Sensitivity'}:{' '}
                    {settings.controls.cameraSensitivity.toFixed(2)}×
                  </span>
                  <input
                    type="range"
                    min={25}
                    max={250}
                    value={Math.round(settings.controls.cameraSensitivity * 100)}
                    onChange={(e) =>
                      settings.updateControls({
                        cameraSensitivity: Number(e.target.value) / 100,
                      })
                    }
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '44px' }}>
                  <input
                    type="checkbox"
                    checked={settings.controls.invertY}
                    onChange={(e) =>
                      settings.updateControls({ invertY: e.target.checked })
                    }
                  />
                  <span>{locale === 'id' ? 'Balik Sumbu Y Kamera' : 'Invert Camera Y-Axis'}</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '44px' }}>
                  <input
                    type="checkbox"
                    checked={settings.controls.leftHandedTouch}
                    onChange={(e) =>
                      settings.updateControls({ leftHandedTouch: e.target.checked })
                    }
                  />
                  <span>
                    {locale === 'id'
                      ? 'Tata Letak Sentuh Tangan Kiri (Tukar Joystick)'
                      : 'Left-Handed Touch Layout (Mirror Joystick)'}
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '44px' }}>
                  <input
                    type="checkbox"
                    checked={settings.controls.autoIsoInPuzzle}
                    onChange={(e) =>
                      settings.updateControls({ autoIsoInPuzzle: e.target.checked })
                    }
                  />
                  <span>
                    {locale === 'id'
                      ? 'Otomatis kamera isometrik di zona teka-teki'
                      : 'Auto-switch to isometric camera in puzzle zones'}
                  </span>
                </label>

                <div
                  style={{
                    padding: '14px',
                    backgroundColor: '#F0F9FF',
                    border: '1.5px solid #7DD3FC',
                    borderRadius: '10px',
                    fontSize: '0.875rem',
                  }}
                >
                  <strong style={{ color: '#0E7490' }}>
                    {locale === 'id' ? 'Panduan Tombol' : 'Control Reference'}
                  </strong>
                  <ul style={{ margin: '8px 0 0', paddingLeft: '18px', color: '#335267' }}>
                    <li>WASD / Panah: Bergerak · Shift: Lari cepat · Spasi: Lompat</li>
                    <li>E: Interaksi · V: Ganti Kamera · Z/C: Putar Isometrik 90°</li>
                    <li>Tab: Buka Editor · Ctrl/Cmd+Enter: Jalankan · Ctrl+.: Hentikan</li>
                    <li>Sentuh: Joystick kiri, seret kanan untuk kamera, cubit untuk zoom</li>
                  </ul>
                </div>
              </>
            )}

            {activeTab === 'language' && (
              <>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>
                  {locale === 'id' ? 'Bahasa Antarmuka' : 'Interface Language'}
                </h2>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {(['id', 'en'] as LocaleCode[]).map((code) => (
                    <button
                      key={code}
                      type="button"
                      aria-pressed={settings.locale === code}
                      className="btn-slate"
                      onClick={() => settings.setLocale(code)}
                      style={{
                        backgroundColor: settings.locale === code ? '#FEF3C7' : '#FFFFFF',
                        borderColor: settings.locale === code ? '#F59E0B' : '#CFE3EE',
                        color: settings.locale === code ? '#B45309' : '#172B3A',
                      }}
                    >
                      {code === 'id' ? 'Bahasa Indonesia (Default)' : 'English'}
                    </button>
                  ))}
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#335267' }}>
                  {locale === 'id'
                    ? 'Pengenal Python dan API robot tetap menggunakan bahasa Inggris standar.'
                    : 'Python keywords and robot API identifiers remain in standard English.'}
                </p>
              </>
            )}

            {activeTab === 'accessibility' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>
                    {locale === 'id' ? 'Aksesibilitas' : 'Accessibility'}
                  </h2>
                  <button
                    type="button"
                    className="btn-slate"
                    onClick={() => settings.resetSection('accessibility')}
                  >
                    <IconReset size={16} />
                    <span>{locale === 'id' ? 'Reset ke Default' : 'Reset to Default'}</span>
                  </button>
                </div>

                <div>
                  <div style={{ marginBottom: '8px', color: '#335267', fontWeight: 600 }}>
                    {locale === 'id' ? 'Skala Teks' : 'Text Scale'}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {([100, 125, 150] as TextScaleOption[]).map((scale) => (
                      <button
                        key={scale}
                        type="button"
                        data-testid={`text-scale-${scale}`}
                        aria-pressed={settings.accessibility.textScale === scale}
                        className="btn-slate"
                        onClick={() =>
                          settings.updateAccessibility({ textScale: scale })
                        }
                        style={{
                          backgroundColor:
                            settings.accessibility.textScale === scale
                              ? '#FEF3C7'
                              : '#FFFFFF',
                          borderColor:
                            settings.accessibility.textScale === scale
                              ? '#F59E0B'
                              : '#CFE3EE',
                          color:
                            settings.accessibility.textScale === scale
                              ? '#B45309'
                              : '#172B3A',
                        }}
                      >
                        {scale}%
                      </button>
                    ))}
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '44px' }}>
                  <input
                    type="checkbox"
                    checked={settings.accessibility.reducedMotion}
                    onChange={(e) =>
                      settings.updateAccessibility({ reducedMotion: e.target.checked })
                    }
                  />
                  <span>
                    {locale === 'id'
                      ? 'Kurangi Gerakan (Reduced Motion)'
                      : 'Reduced Motion'}
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '44px' }}>
                  <input
                    type="checkbox"
                    checked={settings.accessibility.highContrastOutline}
                    onChange={(e) =>
                      settings.updateAccessibility({
                        highContrastOutline: e.target.checked,
                      })
                    }
                  />
                  <span>
                    {locale === 'id'
                      ? 'Garis tepi kontras tinggi pada objek interaktif'
                      : 'High-contrast outline on interactables'}
                  </span>
                </label>
              </>
            )}

            {activeTab === 'storage' && (
              <>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>
                  {locale === 'id' ? 'Penyimpanan & Sistem' : 'Storage & System'}
                </h2>
                <p style={{ margin: 0, color: '#335267', fontSize: '0.9375rem' }}>
                  {locale === 'id'
                    ? 'Semua progres, kode, dan pengaturan disimpan lokal di IndexedDB perangkat ini.'
                    : 'All progress, code drafts, and settings are stored locally in IndexedDB on this device.'}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn-slate"
                    onClick={() => {
                      if (onOpenSaveManagement) {
                        onOpenSaveManagement();
                      } else {
                        navigateTo('save_management');
                      }
                    }}
                  >
                    {locale === 'id' ? 'Kelola Slot & Cadangan' : 'Manage Slots & Backups'}
                  </button>

                  <button
                    type="button"
                    data-testid="btn-reset-python-worker"
                    className="btn-slate"
                    onClick={handleResetWorker}
                    style={{
                      backgroundColor: '#ECFEFF',
                      borderColor: '#0891B2',
                      color: '#0E7490',
                    }}
                  >
                    <IconReset size={16} />
                    <span>
                      {locale === 'id' ? 'Mulai Ulang Python Worker' : 'Restart Python Worker'}
                    </span>
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};
