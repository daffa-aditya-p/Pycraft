import React, { useState } from 'react';
import {
  RANK_THRESHOLDS,
  useGameStore,
  useSettingsStore,
  useUIStore,
  type ArchitectAppearance,
  type SlotId,
} from '@/stores';
import { IconBack, IconCheck, IconPlay, IconWarning } from '../icons';
import { formatRelativeTime } from '../layout';
import { HoldConfirmModal } from '../components/HoldConfirmModal';
import {
  ArchitectAvatarPreview,
  HAIR_COLORS,
  HAIR_STYLES,
  SCARF_COLORS,
  SKIN_TONES,
} from '../components/ArchitectAvatarPreview';

export interface NewAdventureScreenProps {
  onStartNewAdventure?: (
    slotId: SlotId,
    playerName: string,
    appearance: ArchitectAppearance
  ) => void | Promise<void>;
  onExportSlot?: (slotId: SlotId) => void | Promise<void>;
  onPreviewAppearance?: (appearance: ArchitectAppearance) => void;
}

export const NewAdventureScreen: React.FC<NewAdventureScreenProps> = ({
  onStartNewAdventure,
  onExportSlot,
  onPreviewAppearance,
}) => {
  const locale = useSettingsStore((s) => s.locale);
  const slotSummaries = useUIStore((s) => s.slotSummaries);
  const idbAvailable = useUIStore((s) => s.idbAvailable);
  const navigateTo = useUIStore((s) => s.navigateTo);
  const goBack = useUIStore((s) => s.goBack);
  const resetForNewAdventure = useGameStore((s) => s.resetForNewAdventure);

  const firstEmptySlot =
    ([1, 2, 3] as SlotId[]).find(
      (id) => !slotSummaries.some((s) => s.slotId === id && s.occupied)
    ) ?? 1;

  const [selectedSlot, setSelectedSlot] = useState<SlotId>(firstEmptySlot);
  const [playerName, setPlayerName] = useState('Arsitek');
  const [appearance, setAppearance] = useState<ArchitectAppearance>({
    skinTone: 2,
    hairStyle: 0,
    hairColor: 1,
    scarfColor: 0,
  });
  const [overwriteModalOpen, setOverwriteModalOpen] = useState(false);

  const occupiedTarget = slotSummaries.find(
    (s) => s.slotId === selectedSlot && s.occupied
  );

  const updateAppearance = (patch: Partial<ArchitectAppearance>) => {
    const next = { ...appearance, ...patch };
    setAppearance(next);
    onPreviewAppearance?.(next);
  };

  const commitStart = async () => {
    const cleanName = playerName.trim().slice(0, 16) || 'Arsitek';
    setOverwriteModalOpen(false);
    if (onStartNewAdventure) {
      await onStartNewAdventure(selectedSlot, cleanName, appearance);
    } else {
      resetForNewAdventure(selectedSlot, cleanName, appearance);
      useSettingsStore.getState().setLastActiveSlotId(selectedSlot);
      useUIStore.getState().setInGameOverlay('cinematic');
      navigateTo('loading_world');
    }
  };

  const handleStartClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    if (occupiedTarget) {
      setOverwriteModalOpen(true);
      return;
    }
    void commitStart();
  };

  return (
    <main
      data-testid="new-adventure-screen"
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
      <form
        onSubmit={handleStartClick}
        className="surface-slate"
        style={{
          width: '100%',
          maxWidth: '780px',
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
            {locale === 'id' ? 'Petualangan Baru' : 'New Adventure'}
          </h1>
          <div style={{ width: '90px' }} />
        </div>

        {!idbAvailable && (
          <div
            role="status"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              backgroundColor: '#FEF3C7',
              border: '1.5px solid #F59E0B',
              borderRadius: '8px',
              color: '#92400E',
              fontSize: '0.875rem',
            }}
          >
            <IconWarning size={18} />
            <span>
              {locale === 'id'
                ? 'Penyimpanan tidak tersedia — progres hilang saat tab ditutup'
                : 'Storage unavailable — progress will be lost when the tab closes'}
            </span>
          </div>
        )}

        {/* Step 1: 3 Stone-Tablet Save Slots */}
        <section aria-label="Pilih Slot Simpanan">
          <h2
            style={{
              margin: '0 0 10px',
              fontFamily: 'var(--font-display)',
              fontSize: '1.125rem',
              color: '#172B3A',
            }}
          >
            {locale === 'id' ? '1. Pilih Prasasti Simpanan' : '1. Choose Save Tablet'}
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '12px',
            }}
          >
            {([1, 2, 3] as SlotId[]).map((slotId) => {
              const summary = slotSummaries.find((s) => s.slotId === slotId);
              const isOccupied = Boolean(summary?.occupied);
              const isSelected = selectedSlot === slotId;
              const rankName = summary
                ? RANK_THRESHOLDS.find((r) => r.rank === summary.architectRank)?.[locale] ??
                  `Rank ${summary.architectRank}`
                : '';

              return (
                <button
                  key={slotId}
                  type="button"
                  data-testid={`slot-tablet-${slotId}`}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedSlot(slotId)}
                  style={{
                    textAlign: 'left',
                    padding: '14px',
                    backgroundColor: isSelected ? '#FEF3C7' : '#F0F9FF',
                    border: isSelected ? '2px solid #F59E0B' : '1.5px solid #B6DCEB',
                    borderRadius: '10px',
                    color: '#172B3A',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    minHeight: '96px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      color: isSelected ? '#B45309' : '#0E7490',
                    }}
                  >
                    <span>Slot {slotId}</span>
                    {isSelected && <IconCheck size={16} />}
                  </div>
                  {isOccupied && summary ? (
                    <>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>{summary.playerName}</div>
                      <div style={{ fontSize: '0.8125rem', color: '#335267' }}>
                        {rankName} · {summary.xp} XP
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#4C697C' }}>
                        {formatRelativeTime(summary.updatedAt, locale)}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '0.875rem', color: '#4C697C', marginTop: '4px' }}>
                      {locale === 'id' ? 'Slot Kosong' : 'Empty Slot'}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 2: Name Input */}
        <section>
          <label
            htmlFor="architect-name-input"
            style={{
              display: 'block',
              marginBottom: '8px',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '1.125rem',
            }}
          >
            {locale === 'id' ? '2. Nama Arsitek (maks. 16 karakter)' : '2. Architect Name (max 16 chars)'}
          </label>
          <input
            id="architect-name-input"
            type="text"
            maxLength={16}
            required
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value.slice(0, 16))}
            placeholder={locale === 'id' ? 'Masukkan nama…' : 'Enter name…'}
            style={{
              width: '100%',
              minHeight: '44px',
              padding: '10px 14px',
              backgroundColor: '#FFFFFF',
              color: '#172B3A',
              border: '2px solid #7CC4DF',
              borderRadius: '8px',
              fontSize: '1rem',
              fontFamily: 'var(--font-body)',
            }}
          />
        </section>

        {/* Step 3: Live Architect Appearance Customizer */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: '1.125rem',
            }}
          >
            {locale === 'id' ? '3. Penampilan Arsitek' : '3. Architect Appearance'}
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '18px',
              alignItems: 'start',
            }}
          >
            <ArchitectAvatarPreview
              appearance={appearance}
              playerName={playerName.trim() || 'Arsitek'}
              locale={locale}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Skin Tones */}
          <div>
            <div style={{ fontSize: '0.875rem', color: '#335267', fontWeight: 600, marginBottom: '6px' }}>
              {locale === 'id' ? 'Warna Kulit' : 'Skin Tone'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {SKIN_TONES.map((tone) => (
                <button
                  key={tone.id}
                  type="button"
                  aria-label={tone.label}
                  aria-pressed={appearance.skinTone === tone.id}
                  onClick={() => updateAppearance({ skinTone: tone.id })}
                  style={{
                    width: '44px',
                    height: '44px',
                    backgroundColor: tone.hex,
                    border:
                      appearance.skinTone === tone.id
                        ? '3px solid #F59E0B'
                        : '1.5px solid #94B8CA',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Hair Styles */}
          <div>
            <div style={{ fontSize: '0.875rem', color: '#335267', fontWeight: 600, marginBottom: '6px' }}>
              {locale === 'id' ? 'Gaya Rambut' : 'Hair Style'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {HAIR_STYLES.map((styleName, idx) => (
                <button
                  key={styleName}
                  type="button"
                  aria-pressed={appearance.hairStyle === idx}
                  className="btn-slate"
                  onClick={() => updateAppearance({ hairStyle: idx })}
                  style={{
                    backgroundColor: appearance.hairStyle === idx ? '#FEF3C7' : '#FFFFFF',
                    borderColor: appearance.hairStyle === idx ? '#F59E0B' : '#94B8CA',
                    color: appearance.hairStyle === idx ? '#B45309' : '#172B3A',
                  }}
                >
                  {styleName}
                </button>
              ))}
            </div>
          </div>

          {/* Hair Colors */}
          <div>
            <div style={{ fontSize: '0.875rem', color: '#335267', fontWeight: 600, marginBottom: '6px' }}>
              {locale === 'id' ? 'Warna Rambut' : 'Hair Color'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {HAIR_COLORS.map((hc) => (
                <button
                  key={hc.id}
                  type="button"
                  aria-label={hc.label}
                  aria-pressed={appearance.hairColor === hc.id}
                  onClick={() => updateAppearance({ hairColor: hc.id })}
                  style={{
                    width: '44px',
                    height: '44px',
                    backgroundColor: hc.hex,
                    border:
                      appearance.hairColor === hc.id
                        ? '3px solid #F59E0B'
                        : '1.5px solid #94B8CA',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Scarf Colors */}
          <div>
            <div style={{ fontSize: '0.875rem', color: '#335267', fontWeight: 600, marginBottom: '6px' }}>
              {locale === 'id' ? 'Warna Syal' : 'Scarf Color'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {SCARF_COLORS.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  aria-label={sc.label}
                  aria-pressed={appearance.scarfColor === sc.id}
                  onClick={() => updateAppearance({ scarfColor: sc.id })}
                  style={{
                    width: '44px',
                    height: '44px',
                    backgroundColor: sc.hex,
                    border:
                      appearance.scarfColor === sc.id
                        ? '3px solid #F59E0B'
                        : '1.5px solid #94B8CA',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>
          </div>
          </div>
        </section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="submit"
            data-testid="btn-start-adventure"
            className="btn-primary-chamfer"
            disabled={!playerName.trim()}
            style={{ minWidth: '180px' }}
          >
            <IconPlay size={18} />
            <span>{locale === 'id' ? 'Mulai Petualangan' : 'Start Adventure'}</span>
          </button>
        </div>
      </form>

      <HoldConfirmModal
        open={overwriteModalOpen}
        title={
          locale === 'id'
            ? `Timpa Slot ${selectedSlot}?`
            : `Overwrite Slot ${selectedSlot}?`
        }
        description={
          occupiedTarget
            ? locale === 'id'
              ? `Slot ${selectedSlot} saat ini berisi petualangan "${occupiedTarget.playerName}" (${occupiedTarget.xp} XP, diperbarui ${formatRelativeTime(occupiedTarget.updatedAt, locale)}). Data lama akan digantikan.`
              : `Slot ${selectedSlot} currently holds "${occupiedTarget.playerName}" (${occupiedTarget.xp} XP). Existing progress will be overwritten.`
            : ''
        }
        confirmLabel={locale === 'id' ? 'Timpa & Mulai Baru' : 'Overwrite & Start'}
        secondaryActionLabel={
          onExportSlot
            ? locale === 'id'
              ? 'Ekspor Dulu (.pycraft.json)'
              : 'Export First (.pycraft.json)'
            : undefined
        }
        onSecondaryAction={
          onExportSlot ? () => void onExportSlot(selectedSlot) : undefined
        }
        onConfirm={() => void commitStart()}
        onCancel={() => setOverwriteModalOpen(false)}
      />
    </main>
  );
};
