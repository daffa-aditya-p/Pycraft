import React, { useState } from 'react';
import { KC_LIST, REGIONS, type RegionId } from '@/learning/kcRegistry';
import { useGameStore, useSettingsStore, useUIStore } from '@/stores';
import { IconBack, IconCheck, IconLock } from '../icons';

const AWAKENING_MISSIONS = [
  { id: 'prologue', titleId: 'Prolog: Bangun', titleEn: 'Prologue: Wake', island: 'Stasis Shrine' },
  { id: 'm1_hello_architect', titleId: 'M1: Halo Arsitek', titleEn: 'M1: Hello Architect', island: 'Beacon Point' },
  { id: 'interlude_find_bit', titleId: 'Sela: Mencari BIT', titleEn: 'Interlude: Find BIT', island: 'Supply Grove' },
  { id: 'm2_data_collector', titleId: 'M2: Pengumpul Data', titleEn: 'M2: Data Collector', island: 'Supply Grove' },
  { id: 'm3_locked_gate', titleId: 'M3: Gerbang Terkunci', titleEn: 'M3: The Locked Gate', island: 'Gatehouse Rock' },
  { id: 'm4_automated_farm', titleId: 'M4: Ladang Otomatis', titleEn: 'M4: Automated Farm', island: 'Terrace Farm' },
  { id: 'm5_blueprint', titleId: 'M5: Cetak Biru', titleEn: 'M5: The Blueprint', island: "BOLT's Workshop" },
  { id: 'final_core_shard', titleId: 'Final: Inti yang Terbangun', titleEn: 'Final: Awakened Core', island: 'Core Shard Spire' },
];

export const WorldProgressScreen: React.FC = () => {
  const locale = useSettingsStore((s) => s.locale);
  const goBack = useUIStore((s) => s.goBack);
  const activeSlotId = useGameStore((s) => s.activeSlotId);
  const questStates = useGameStore((s) => s.quests.states);
  const kcMastery = useGameStore((s) => s.learning.kcMastery);
  const [selectedRegion, setSelectedRegion] = useState<RegionId>('awakening');

  const regionMeta = REGIONS.find((r) => r.id === selectedRegion) ?? REGIONS[0]!;
  const regionKCs = KC_LIST.filter((kc) => kc.homeRegion === selectedRegion);

  return (
    <main
      data-testid="world-progress-screen"
      style={{
        position: 'fixed',
        inset: 0,
        overflowY: 'auto',
        padding: '24px',
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
          maxWidth: '960px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
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
              fontSize: '1.75rem',
              color: '#0E7490',
            }}
          >
            {locale === 'id' ? 'Dunia & Progres Aetheria' : 'Aetheria World & Progress'}
          </h1>
          <div style={{ width: '90px' }} />
        </div>

        {activeSlotId === null && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#E0F2FE',
              border: '1.5px solid #7DD3FC',
              borderRadius: '8px',
              color: '#075985',
              fontSize: '0.875rem',
            }}
          >
            {locale === 'id'
              ? 'Mulai atau muat petualangan untuk melacak progres pribadimu di peta.'
              : 'Start or load an adventure to track your personal progress on the map.'}
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {/* Left: 8 Aetheria Spiral Regions */}
          <section aria-label={locale === 'id' ? 'Daftar Wilayah' : 'Regions List'}>
            <h2
              style={{
                margin: '0 0 10px',
                fontFamily: 'var(--font-display)',
                fontSize: '1.125rem',
                color: '#172B3A',
              }}
            >
              {locale === 'id' ? '8 Wilayah Aetheria' : '8 Aetheria Regions'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {REGIONS.map((region) => {
                const isR1 = region.id === 'awakening';
                const isSelected = selectedRegion === region.id;
                return (
                  <button
                    key={region.id}
                    type="button"
                    data-testid={`region-item-${region.id}`}
                    aria-current={isSelected ? 'true' : undefined}
                    onClick={() => setSelectedRegion(region.id)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      textAlign: 'left',
                      backgroundColor: isSelected ? '#FEF3C7' : '#FFFFFF',
                      border: isSelected ? '2px solid #F59E0B' : '1.5px solid #CFE3EE',
                      borderRadius: '10px',
                      color: '#172B3A',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                        {region.order}. {region.title[locale]}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#4C697C' }}>
                        {isR1
                          ? locale === 'id'
                            ? 'Aktif (R1)'
                            : 'Active (R1)'
                          : `${region.release} · ${locale === 'id' ? 'Terkunci' : 'Locked'}`}
                      </div>
                    </div>
                    <span style={{ color: isR1 ? '#16A34A' : '#64748B' }}>
                      {isR1 ? <IconCheck size={16} /> : <IconLock size={16} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Right: Selected Region Details, Missions & KC Breakdown */}
          <section
            className="surface-slate-raised"
            style={{
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              borderRadius: '12px',
            }}
          >
            <div>
              <div style={{ fontSize: '0.8125rem', color: '#0891B2', fontWeight: 700 }}>
                {locale === 'id' ? `Wilayah ${regionMeta.order}` : `Region ${regionMeta.order}`} ·{' '}
                {regionMeta.release}
              </div>
              <h2
                style={{
                  margin: '4px 0',
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.5rem',
                  color: '#B45309',
                }}
              >
                {regionMeta.title[locale]}
              </h2>
              <p style={{ margin: 0, color: '#335267', fontSize: '0.9375rem', lineHeight: 1.5 }}>
                {regionMeta.subtitle[locale]}
              </p>
              <div style={{ marginTop: '8px', fontSize: '0.8125rem', color: '#4C697C' }}>
                {locale === 'id' ? 'Syarat Buka: ' : 'Unlock: '}
                {regionMeta.unlockCondition[locale]}
              </div>
              {regionMeta.id !== 'awakening' && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    backgroundColor: '#F1F5F9',
                    border: '1.5px solid #CBD5E1',
                    borderRadius: '8px',
                    color: '#475569',
                    fontSize: '0.8125rem',
                  }}
                >
                  {locale === 'id'
                    ? 'Hadir di pembaruan mendatang'
                    : 'Upcoming in a future update'}
                </div>
              )}
            </div>

            {regionMeta.id === 'awakening' && (
              <div>
                <h3
                  style={{
                    margin: '0 0 8px',
                    fontFamily: 'var(--font-display)',
                    fontSize: '1rem',
                    color: '#172B3A',
                  }}
                >
                  {locale === 'id' ? 'Misi Kebangkitan' : 'Awakening Missions'}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {AWAKENING_MISSIONS.map((m) => {
                    const st = questStates[m.id] ?? 'locked';
                    const badge =
                      st === 'completed'
                        ? locale === 'id'
                          ? 'Selesai'
                          : 'Done'
                        : st === 'active'
                          ? locale === 'id'
                            ? 'Aktif'
                            : 'Active'
                          : locale === 'id'
                            ? 'Belum'
                            : 'Locked';
                    return (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          backgroundColor: '#FFFFFF',
                          border:
                            st === 'completed'
                              ? '1.5px solid #86EFAC'
                              : st === 'active'
                                ? '1.5px solid #7DD3FC'
                                : '1.5px solid #E2E8F0',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                        }}
                      >
                        <span>
                          {locale === 'id' ? m.titleId : m.titleEn}{' '}
                          <span style={{ color: '#4C697C', fontSize: '0.75rem' }}>
                            ({m.island})
                          </span>
                        </span>
                        <span
                          style={{
                            color:
                              st === 'completed'
                                ? '#15803D'
                                : st === 'active'
                                  ? '#0E7490'
                                  : '#64748B',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}
                        >
                          {badge}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h3
                style={{
                  margin: '0 0 8px',
                  fontFamily: 'var(--font-display)',
                  fontSize: '1rem',
                  color: '#172B3A',
                }}
              >
                {locale === 'id' ? 'Komponen Pengetahuan (KC)' : 'Knowledge Components'}
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {regionKCs.map((kc) => {
                  const rec = kcMastery[kc.id];
                  const score = rec?.score ?? 0;
                  return (
                    <div
                      key={kc.id}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: score >= 85 ? '#DCFCE7' : '#F8FAFC',
                        border: score >= 85 ? '1.5px solid #4ADE80' : '1.5px solid #CBD5E1',
                        borderRadius: '999px',
                        fontSize: '0.8125rem',
                        color: score >= 85 ? '#166534' : '#172B3A',
                      }}
                    >
                      <strong>{kc.id}</strong>: {kc.title[locale]}
                      {regionMeta.id === 'awakening' ? ` (${score}%)` : ''}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};
