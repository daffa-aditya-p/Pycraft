import React from 'react';
import { KC_LIST } from '@/learning/kcRegistry';
import {
  RANK_THRESHOLDS,
  useGameStore,
  useSettingsStore,
  useUIStore,
  type JournalTab,
} from '@/stores';
import { IconCheck, IconClose, IconLock } from '../icons';

export interface JournalModalProps {
  onPracticeKC?: (kcId: string, stepId: string) => void;
}

const BIT_PAINTS = [
  { id: 'moss', label: 'Lumut (Moss)', unlockId: 'bit_paint_moss' },
  { id: 'clay', label: 'Terakota (Clay)', unlockId: 'bit_paint_clay' },
  { id: 'slate', label: 'Batu Sabak (Slate)', unlockId: 'bit_paint_slate' },
  { id: 'sky', label: 'Langit (Sky)', unlockId: 'bit_paint_sky' },
];

const BIT_ACCESSORIES = [
  { id: null, label: 'Tanpa Aksesori', unlockId: null },
  { id: 'lantern', label: 'Lentera (M4 Bonus)', unlockId: 'bit_acc_lantern' },
  { id: 'flag', label: 'Bendera Antena (M5 Bonus)', unlockId: 'bit_acc_flag' },
];

const NEO_VISORS = [
  { id: 'turquoise', label: 'Turquoise Inti', unlockId: 'neo_visor_turquoise' },
  { id: 'amber', label: 'Amber Suar', unlockId: 'neo_visor_amber' },
];

export const JournalModal: React.FC<JournalModalProps> = ({ onPracticeKC }) => {
  const locale = useSettingsStore((s) => s.locale);
  const inGameOverlay = useUIStore((s) => s.inGameOverlay);
  const setInGameOverlay = useUIStore((s) => s.setInGameOverlay);
  const journalTab = useUIStore((s) => s.journalTab);
  const setJournalTab = useUIStore((s) => s.setJournalTab);

  const profile = useGameStore((s) => s.profile);
  const quests = useGameStore((s) => s.quests);
  const learning = useGameStore((s) => s.learning);
  const inventory = useGameStore((s) => s.inventory);
  const world = useGameStore((s) => s.world);
  const equipCosmetic = useGameStore((s) => s.equipCosmetic);

  if (inGameOverlay !== 'journal') return null;

  const rankMeta =
    RANK_THRESHOLDS.find((r) => r.rank === learning.rank) ?? RANK_THRESHOLDS[0]!;
  const nextRank = RANK_THRESHOLDS.find((r) => r.rank === learning.rank + 1);
  const unlockedSet = new Set(profile.cosmetics.unlockedIds);

  const tabs: Array<{ id: JournalTab; idLabel: string; enLabel: string }> = [
    { id: 'quests', idLabel: 'Misi', enLabel: 'Quests' },
    { id: 'inventory', idLabel: 'Tas', enLabel: 'Inventory' },
    { id: 'skill_tree', idLabel: 'Pohon Keahlian', enLabel: 'Skill Tree' },
    { id: 'profile', idLabel: 'Profil & Kosmetik', enLabel: 'Profile & Cosmetics' },
  ];

  const inventoryEntries = Object.entries(inventory.items).filter(
    ([, count]) => count > 0
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={locale === 'id' ? 'Jurnal Arsitek' : 'Architect Journal'}
      data-testid="journal-modal"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 85,
        backgroundColor: 'rgba(28, 36, 39, 0.78)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="surface-parchment"
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '88dvh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header + Tabs */}
        <header
          style={{
            padding: '16px 20px 0',
            borderBottom: '1px solid #D9C9A8',
            backgroundColor: '#EFE2CA',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: '1.5rem',
                color: '#2A2420',
              }}
            >
              {locale === 'id' ? 'Jurnal Arsitek' : 'Architect Journal'}
            </h1>
            <button
              type="button"
              className="btn-parchment"
              aria-label={locale === 'id' ? 'Tutup Jurnal' : 'Close Journal'}
              onClick={() => setInGameOverlay('explore')}
              style={{ minWidth: '44px', minHeight: '44px', padding: '0 10px' }}
            >
              <IconClose size={18} />
            </button>
          </div>

          <div
            role="tablist"
            style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}
          >
            {tabs.map((tab) => {
              const active = journalTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setJournalTab(tab.id)}
                  style={{
                    minHeight: '40px',
                    padding: '6px 14px',
                    backgroundColor: active ? '#F3EAD8' : 'transparent',
                    color: '#2A2420',
                    border: '1px solid',
                    borderColor: active ? '#D9C9A8' : 'transparent',
                    borderBottom: active ? '2px solid #F2B544' : '2px solid transparent',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {locale === 'id' ? tab.idLabel : tab.enLabel}
                </button>
              );
            })}
          </div>
        </header>

        {/* Tab Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {journalTab === 'quests' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(quests.states).map(([qId, status]) => (
                <div
                  key={qId}
                  style={{
                    padding: '10px 14px',
                    backgroundColor: '#EFE2CA',
                    border: '1px solid #D9C9A8',
                    borderRadius: '2px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <strong style={{ color: '#2A2420' }}>{qId}</strong>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#5C4F47' }}>
                    {status === 'completed'
                      ? locale === 'id'
                        ? 'Selesai'
                        : 'Completed'
                      : status === 'active'
                        ? locale === 'id'
                          ? 'Aktif'
                          : 'Active'
                        : locale === 'id'
                          ? 'Terkunci'
                          : 'Locked'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {journalTab === 'inventory' && (
            <div>
              {inventoryEntries.length === 0 ? (
                <p style={{ color: '#5C4F47', margin: 0 }}>
                  {locale === 'id'
                    ? 'Tasmu masih kosong — jelajahi pulau!'
                    : 'Your bag is empty — explore the islands!'}
                </p>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '10px',
                  }}
                >
                  {inventoryEntries.map(([itemKey, count]) => (
                    <div
                      key={itemKey}
                      style={{
                        padding: '12px',
                        backgroundColor: '#EFE2CA',
                        border: '1px solid #D9C9A8',
                        borderRadius: '2px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>{itemKey}</span>
                      <span>×{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {journalTab === 'skill_tree' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {KC_LIST.filter((kc) => kc.homeRegion === 'awakening' || kc.r1Tier !== 'locked').map(
                (kc) => {
                  const rec = learning.kcMastery[kc.id];
                  const score = rec?.score ?? 0;
                  const mastered =
                    score >= 85 && (rec?.distinctContextsPassed.length ?? 0) >= 2;
                  const stateLabel = mastered
                    ? locale === 'id'
                      ? 'Dikuasai'
                      : 'Mastered'
                    : (rec?.attempts ?? 0) > 0
                      ? locale === 'id'
                        ? 'Diproses'
                        : 'Learning'
                      : locale === 'id'
                        ? 'Tersedia'
                        : 'Available';

                  return (
                    <div
                      key={kc.id}
                      style={{
                        padding: '10px 14px',
                        backgroundColor: '#EFE2CA',
                        border: '1px solid #D9C9A8',
                        borderRadius: '2px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ flex: '1 1 240px' }}>
                        <div style={{ fontWeight: 700 }}>
                          {kc.id}: {kc.title[locale]}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: '#5C4F47' }}>
                          {kc.description[locale]}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 700,
                            fontSize: '0.8125rem',
                          }}
                        >
                          {mastered && <IconCheck size={14} />}
                          {stateLabel} ({score}%)
                        </span>
                        {onPracticeKC && kc.practicedIn[0] && (
                          <button
                            type="button"
                            className="btn-parchment"
                            onClick={() => onPracticeKC(kc.id, kc.practicedIn[0]!)}
                            style={{ minHeight: '34px', padding: '4px 10px', fontSize: '0.75rem' }}
                          >
                            {locale === 'id' ? 'Latihan ulang' : 'Practice'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}

          {journalTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  padding: '14px',
                  backgroundColor: '#EFE2CA',
                  border: '1px solid #D9C9A8',
                  borderRadius: '2px',
                }}
              >
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.375rem', fontWeight: 700 }}>
                  {profile.name} — {rankMeta[locale]}
                </div>
                <div style={{ fontSize: '0.9375rem', color: '#5C4F47', marginTop: '4px' }}>
                  {learning.xp} XP
                  {nextRank
                    ? ` · ${nextRank.xp - learning.xp} XP menuju ${nextRank[locale]}`
                    : ' · Peringkat Tertinggi'}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#5C4F47', marginTop: '4px' }}>
                  {locale === 'id' ? 'Catatan Pengetahuan ditemukan' : 'Lore notes found'}:{' '}
                  {world.discoveredLoreNoteIds.length}/10
                </div>
              </div>

              <div>
                <h2 style={{ margin: '0 0 8px', fontFamily: 'var(--font-display)', fontSize: '1.125rem' }}>
                  {locale === 'id' ? 'Cat BIT' : 'BIT Paint'}
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {BIT_PAINTS.map((p) => {
                    const unlocked = unlockedSet.has(p.unlockId);
                    const active = profile.cosmetics.bitPaint === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={!unlocked}
                        className="btn-parchment"
                        onClick={() => equipCosmetic({ bitPaint: p.id })}
                        style={{
                          borderColor: active ? '#F2B544' : '#D9C9A8',
                          opacity: unlocked ? 1 : 0.5,
                        }}
                      >
                        {!unlocked && <IconLock size={14} />}
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h2 style={{ margin: '0 0 8px', fontFamily: 'var(--font-display)', fontSize: '1.125rem' }}>
                  {locale === 'id' ? 'Aksesori BIT' : 'BIT Accessory'}
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {BIT_ACCESSORIES.map((acc) => {
                    const unlocked = acc.unlockId === null || unlockedSet.has(acc.unlockId);
                    const active = profile.cosmetics.bitAccessory === acc.id;
                    return (
                      <button
                        key={acc.id ?? 'none'}
                        type="button"
                        disabled={!unlocked}
                        className="btn-parchment"
                        onClick={() => equipCosmetic({ bitAccessory: acc.id })}
                        style={{
                          borderColor: active ? '#F2B544' : '#D9C9A8',
                          opacity: unlocked ? 1 : 0.5,
                        }}
                      >
                        {!unlocked && <IconLock size={14} />}
                        <span>{acc.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h2 style={{ margin: '0 0 8px', fontFamily: 'var(--font-display)', fontSize: '1.125rem' }}>
                  {locale === 'id' ? 'Visor NEO' : 'NEO Visor'}
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {NEO_VISORS.map((vis) => {
                    const unlocked = unlockedSet.has(vis.unlockId);
                    const active = profile.cosmetics.neoVisor === vis.id;
                    return (
                      <button
                        key={vis.id}
                        type="button"
                        disabled={!unlocked}
                        className="btn-parchment"
                        onClick={() => equipCosmetic({ neoVisor: vis.id })}
                        style={{
                          borderColor: active ? '#F2B544' : '#D9C9A8',
                          opacity: unlocked ? 1 : 0.5,
                        }}
                      >
                        {!unlocked && <IconLock size={14} />}
                        <span>{vis.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
