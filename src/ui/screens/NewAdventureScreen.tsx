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

export interface NewAdventureScreenProps {
  onStartNewAdventure?: (
    slotId: SlotId,
    playerName: string,
    appearance: ArchitectAppearance
  ) => void | Promise<void>;
  onExportSlot?: (slotId: SlotId) => void | Promise<void>;
  onPreviewAppearance?: (appearance: ArchitectAppearance) => void;
}

const SKIN_TONES = [
  { id: 0, label: 'Pucat', hex: '#F3D2B8' },
  { id: 1, label: 'Cerah', hex: '#E6B894' },
  { id: 2, label: 'Sawo Terang', hex: '#CF9A6E' },
  { id: 3, label: 'Sawo Matang', hex: '#B57B4F' },
  { id: 4, label: 'Cokelat Hangat', hex: '#8C5835' },
  { id: 5, label: 'Gelap', hex: '#5D3822' },
];

const HAIR_STYLES = ['Pendek Rapi', 'Belah Tengah', 'Kuncir Belakang', 'Ikal Berombak'];

const HAIR_COLORS = [
  { id: 0, label: 'Hitam Arang', hex: '#26292B' },
  { id: 1, label: 'Cokelat Tua', hex: '#543A28' },
  { id: 2, label: 'Kastanye', hex: '#8A4F30' },
  { id: 3, label: 'Pirang Pasir', hex: '#D4B06A' },
  { id: 4, label: 'Perak Abu', hex: '#A9B8BD' },
  { id: 5, label: 'Teal Arsitek', hex: '#2F7F86' },
];

const SCARF_COLORS = [
  { id: 0, label: 'Teal Aetheria', hex: '#2F7F86' },
  { id: 1, label: 'Amber Suar', hex: '#F2B544' },
  { id: 2, label: 'Terakota', hex: '#B4533C' },
  { id: 3, label: 'Lumut', hex: '#64923C' },
  { id: 4, label: 'Batu Sabak', hex: '#55595D' },
  { id: 5, label: 'Turquoise Inti', hex: '#3CC4C0' },
];

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
        backgroundColor: 'rgba(28, 36, 39, 0.72)',
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
              backgroundColor: '#3B2C1B',
              border: '1px solid #E9A23B',
              borderRadius: '2px',
              color: '#E8EEF0',
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
              color: '#E8EEF0',
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
                    backgroundColor: isSelected ? '#2C3A3F' : '#1C2427',
                    border: isSelected ? '2px solid #F2B544' : '1px solid #33434A',
                    borderRadius: '4px',
                    color: '#E8EEF0',
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
                      color: isSelected ? '#F2B544' : '#A9B8BD',
                    }}
                  >
                    <span>Slot {slotId}</span>
                    {isSelected && <IconCheck size={16} />}
                  </div>
                  {isOccupied && summary ? (
                    <>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>{summary.playerName}</div>
                      <div style={{ fontSize: '0.8125rem', color: '#A9B8BD' }}>
                        {rankName} · {summary.xp} XP
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#8FA3A9' }}>
                        {formatRelativeTime(summary.updatedAt, locale)}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '0.875rem', color: '#8FA3A9', marginTop: '4px' }}>
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
              padding: '10px 12px',
              backgroundColor: '#1A2225',
              color: '#E8EEF0',
              border: '1px solid #33434A',
              borderRadius: '2px',
              fontSize: '1rem',
              fontFamily: 'var(--font-body)',
            }}
          />
        </section>

        {/* Step 3: Live 3D Architect Appearance Customizer */}
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

          {/* Skin Tones */}
          <div>
            <div style={{ fontSize: '0.875rem', color: '#A9B8BD', marginBottom: '6px' }}>
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
                        ? '3px solid #F2B544'
                        : '1px solid #33434A',
                    borderRadius: '2px',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Hair Styles */}
          <div>
            <div style={{ fontSize: '0.875rem', color: '#A9B8BD', marginBottom: '6px' }}>
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
                    borderColor: appearance.hairStyle === idx ? '#F2B544' : '#33434A',
                    color: appearance.hairStyle === idx ? '#F2B544' : '#E8EEF0',
                  }}
                >
                  {styleName}
                </button>
              ))}
            </div>
          </div>

          {/* Hair Colors */}
          <div>
            <div style={{ fontSize: '0.875rem', color: '#A9B8BD', marginBottom: '6px' }}>
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
                        ? '3px solid #F2B544'
                        : '1px solid #33434A',
                    borderRadius: '2px',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Scarf Colors */}
          <div>
            <div style={{ fontSize: '0.875rem', color: '#A9B8BD', marginBottom: '6px' }}>
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
                        ? '3px solid #F2B544'
                        : '1px solid #33434A',
                    borderRadius: '2px',
                    cursor: 'pointer',
                  }}
                />
              ))}
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
