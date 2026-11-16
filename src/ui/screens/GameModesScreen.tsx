import React from 'react';
import { useSettingsStore, useUIStore } from '@/stores';
import { IconBack, IconLock, IconPlay } from '../icons';

interface FutureModeSpec {
  id: string;
  titleId: string;
  titleEn: string;
  descId: string;
  descEn: string;
  accentColor: string;
}

const FUTURE_MODES: FutureModeSpec[] = [
  {
    id: 'automation',
    titleId: 'Mode Otomasi',
    titleEn: 'Automation Mode',
    descId: 'Rancang jalur logistik antar-pulau dengan banyak robot BIT yang bekerja serempak.',
    descEn: 'Design multi-island logistics pipelines with coordinated BIT fleets.',
    accentColor: '#76BF31',
  },
  {
    id: 'sandbox',
    titleId: 'Kotak Pasir Kreatif',
    titleEn: 'Creative Sandbox',
    descId: 'Bangun struktur voxel bebas menggunakan skrip Python dan API bangunan tanpa batas misi.',
    descEn: 'Freely construct voxel structures with Python scripts and building APIs.',
    accentColor: '#3CC4C0',
  },
  {
    id: 'challenge',
    titleId: 'Mode Tantangan',
    titleEn: 'Challenge Mode',
    descId: 'Pecahkan teka-teki efisiensi kode dengan batas baris dan jumlah langkah optimal.',
    descEn: 'Solve code efficiency puzzles under strict line and step budgets.',
    accentColor: '#E59A6B',
  },
];

export const GameModesScreen: React.FC = () => {
  const locale = useSettingsStore((s) => s.locale);
  const navigateTo = useUIStore((s) => s.navigateTo);
  const goBack = useUIStore((s) => s.goBack);

  return (
    <main
      data-testid="game-modes-screen"
      style={{
        position: 'fixed',
        inset: 0,
        overflowY: 'auto',
        padding: '24px',
        backgroundColor: 'rgba(28, 36, 39, 0.78)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
    >
      <div
        className="surface-slate"
        style={{
          width: '100%',
          maxWidth: '820px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
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
              fontSize: '1.75rem',
              color: '#F2B544',
            }}
          >
            {locale === 'id' ? 'Mode Permainan' : 'Game Modes'}
          </h1>
          <div style={{ width: '90px' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Row 1: Playable Adventure Mode */}
          <button
            type="button"
            data-testid="mode-row-adventure"
            onClick={() => navigateTo('new_adventure')}
            className="surface-slate-raised"
            style={{
              width: '100%',
              minHeight: '88px',
              padding: '16px 20px',
              textAlign: 'left',
              border: '2px solid #F2B544',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 260px' }}>
              <div
                aria-hidden="true"
                style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: '#243034',
                  border: '2px solid #F2B544',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#F2B544',
                  flexShrink: 0,
                }}
              >
                <IconPlay size={22} />
              </div>
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: '1.25rem',
                      color: '#E8EEF0',
                    }}
                  >
                    {locale === 'id' ? 'Mode Petualangan' : 'Adventure Mode'}
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: '#274025',
                      color: '#6DBE4B',
                      border: '1px solid #6DBE4B',
                      borderRadius: '2px',
                    }}
                  >
                    {locale === 'id' ? 'Tersedia' : 'Available'}
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.9375rem', color: '#A9B8BD' }}>
                  {locale === 'id'
                    ? 'Jelajahi kepulauan Aetheria, program BIT untuk memulihkan mesin kuno, dan pelajari Python dari awal.'
                    : 'Explore Aetheria, program BIT to restore ancient machines, and learn Python from scratch.'}
                </p>
              </div>
            </div>
            <span
              className="btn-primary-chamfer"
              style={{ pointerEvents: 'none', minWidth: '120px' }}
            >
              {locale === 'id' ? 'Mainkan' : 'Play'}
            </span>
          </button>

          {/* Rows 2-4: Strictly non-interactive static future mode rows */}
          {FUTURE_MODES.map((mode) => (
            <div
              key={mode.id}
              data-testid={`mode-row-${mode.id}`}
              aria-disabled="true"
              tabIndex={-1}
              style={{
                width: '100%',
                minHeight: '84px',
                padding: '16px 20px',
                backgroundColor: '#192023',
                border: '1px solid #2A363B',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                flexWrap: 'wrap',
                opacity: 0.72,
                cursor: 'default',
                userSelect: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 260px' }}>
                <div
                  aria-hidden="true"
                  style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: '#1F292C',
                    border: `1px solid ${mode.accentColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#8FA3A9',
                    flexShrink: 0,
                  }}
                >
                  <IconLock size={20} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        fontSize: '1.125rem',
                        color: '#A9B8BD',
                      }}
                    >
                      {locale === 'id' ? mode.titleId : mode.titleEn}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: '#243034',
                        color: '#8FA3A9',
                        border: '1px solid #33434A',
                        borderRadius: '2px',
                      }}
                    >
                      [Segera Hadir]
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#8FA3A9' }}>
                    {locale === 'id' ? mode.descId : mode.descEn}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};
