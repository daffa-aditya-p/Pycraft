import React, { useRef, useState } from 'react';
import { validateAndPreviewImport, type ImportPreview } from '@/persistence/exportImport';
import {
  RANK_THRESHOLDS,
  useSettingsStore,
  useUIStore,
  type SlotId,
  type SlotSummary,
} from '@/stores';
import { IconBack, IconPlay, IconReset, IconSave, IconWarning } from '../icons';
import { formatDuration, formatRelativeTime } from '../layout';
import { HoldConfirmModal } from '../components/HoldConfirmModal';

export interface SaveManagementScreenProps {
  onLoadSlot?: (slotId: SlotId) => void | Promise<void>;
  onExportSlot?: (slotId: SlotId) => void | Promise<void>;
  onImportSlot?: (slotId: SlotId, rawText: string) => void | Promise<void>;
  onRestoreBackup?: (slotId: SlotId) => void | Promise<void>;
  onDeleteSlot?: (slotId: SlotId) => void | Promise<void>;
  onClearAllData?: () => void | Promise<void>;
}

export const SaveManagementScreen: React.FC<SaveManagementScreenProps> = ({
  onLoadSlot,
  onExportSlot,
  onImportSlot,
  onRestoreBackup,
  onDeleteSlot,
  onClearAllData,
}) => {
  const locale = useSettingsStore((s) => s.locale);
  const slotSummaries = useUIStore((s) => s.slotSummaries);
  const saveReadOnlyMode = useUIStore((s) => s.saveReadOnlyMode);
  const goBack = useUIStore((s) => s.goBack);
  const navigateTo = useUIStore((s) => s.navigateTo);
  const pushToast = useUIStore((s) => s.pushToast);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importTargetSlot, setImportTargetSlot] = useState<SlotId | null>(null);
  const [importCandidate, setImportCandidate] = useState<{
    slotId: SlotId;
    rawText: string;
    preview: ImportPreview;
  } | null>(null);
  const [deleteTargetSlot, setDeleteTargetSlot] = useState<SlotId | null>(null);
  const [clearAllModalOpen, setClearAllModalOpen] = useState(false);

  const getSlotSummary = (slotId: SlotId): SlotSummary | undefined =>
    slotSummaries.find((s) => s.slotId === slotId);

  const handleLoad = async (slotId: SlotId) => {
    if (onLoadSlot) {
      await onLoadSlot(slotId);
    } else {
      useSettingsStore.getState().setLastActiveSlotId(slotId);
      navigateTo('loading_world');
    }
  };

  const handleTriggerImport = (slotId: SlotId) => {
    setImportTargetSlot(slotId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || importTargetSlot === null) return;

    const rawText = await file.text();
    const res = await validateAndPreviewImport(rawText);
    if (!res.ok) {
      pushToast({ kind: 'error', message: res.message });
      return;
    }

    setImportCandidate({
      slotId: importTargetSlot,
      rawText,
      preview: res.preview,
    });
  };

  const confirmImport = async () => {
    if (!importCandidate) return;
    const { slotId, rawText } = importCandidate;
    setImportCandidate(null);
    await onImportSlot?.(slotId, rawText);
    pushToast({
      kind: 'success',
      message:
        locale === 'id'
          ? `Slot ${slotId} berhasil diimpor.`
          : `Slot ${slotId} imported successfully.`,
    });
  };

  const confirmDelete = async () => {
    if (deleteTargetSlot === null) return;
    const target = deleteTargetSlot;
    setDeleteTargetSlot(null);
    await onDeleteSlot?.(target);
  };

  const confirmClearAll = async () => {
    setClearAllModalOpen(false);
    await onClearAllData?.();
  };

  return (
    <main
      data-testid="save-management-screen"
      style={{
        position: 'fixed',
        inset: 0,
        overflowY: 'auto',
        padding: '24px',
        backgroundColor: 'rgba(28, 36, 39, 0.85)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.pycraft.json"
        style={{ display: 'none' }}
        onChange={(e) => void handleFileChange(e)}
      />

      <div
        className="surface-slate"
        style={{
          width: '100%',
          maxWidth: '900px',
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
            {locale === 'id' ? 'Pilih & Kelola Petualangan' : 'Select & Manage Saves'}
          </h1>
          <div style={{ width: '90px' }} />
        </div>

        {saveReadOnlyMode && (
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
            }}
          >
            <IconWarning size={18} />
            <span>
              {locale === 'id'
                ? 'Slot ini sedang dimainkan di tab lain (mode baca-saja).'
                : 'This slot is active in another tab (read-only mode).'}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {([1, 2, 3] as SlotId[]).map((slotId) => {
            const summary = getSlotSummary(slotId);
            const occupied = Boolean(summary?.occupied);
            const rankName = summary
              ? RANK_THRESHOLDS.find((r) => r.rank === summary.architectRank)?.[locale] ??
                `Rank ${summary.architectRank}`
              : '';

            return (
              <section
                key={slotId}
                data-testid={`save-slot-card-${slotId}`}
                className="surface-slate-raised"
                style={{
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        fontSize: '1.125rem',
                        color: '#F2B544',
                      }}
                    >
                      Slot {slotId}
                      {occupied && summary ? ` — ${summary.playerName}` : ''}
                    </div>
                    {occupied && summary ? (
                      <div style={{ fontSize: '0.875rem', color: '#A9B8BD', marginTop: '4px' }}>
                        {rankName} · {summary.xp} XP · {summary.completedMissionCount}{' '}
                        {locale === 'id' ? 'misi' : 'missions'} ·{' '}
                        {formatDuration(summary.playtimeSeconds)} ·{' '}
                        {formatRelativeTime(summary.updatedAt, locale)}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.875rem', color: '#8FA3A9', marginTop: '4px' }}>
                        {locale === 'id' ? 'Slot Kosong' : 'Empty Slot'}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {occupied ? (
                      <button
                        type="button"
                        className="btn-primary-chamfer"
                        onClick={() => void handleLoad(slotId)}
                      >
                        <IconPlay size={16} />
                        <span>{locale === 'id' ? 'Muat' : 'Load'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary-chamfer"
                        onClick={() => navigateTo('new_adventure')}
                      >
                        <span>{locale === 'id' ? 'Buat Baru' : 'Create New'}</span>
                      </button>
                    )}

                    {occupied && (
                      <button
                        type="button"
                        className="btn-slate"
                        onClick={() => void onExportSlot?.(slotId)}
                      >
                        <IconSave size={16} />
                        <span>{locale === 'id' ? 'Ekspor' : 'Export'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn-slate"
                      onClick={() => handleTriggerImport(slotId)}
                    >
                      <span>{locale === 'id' ? 'Impor .json' : 'Import .json'}</span>
                    </button>

                    {onRestoreBackup && (
                      <button
                        type="button"
                        className="btn-slate"
                        onClick={() => void onRestoreBackup(slotId)}
                      >
                        <IconReset size={16} />
                        <span>{locale === 'id' ? 'Pulihkan Cadangan' : 'Restore Backup'}</span>
                      </button>
                    )}

                    {occupied && (
                      <button
                        type="button"
                        className="btn-slate"
                        onClick={() => setDeleteTargetSlot(slotId)}
                        style={{ borderColor: '#E0603F', color: '#E0603F' }}
                      >
                        <span>{locale === 'id' ? 'Hapus' : 'Delete'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            paddingTop: '12px',
            borderTop: '1px solid #33434A',
          }}
        >
          <button
            type="button"
            className="btn-slate"
            onClick={() => setClearAllModalOpen(true)}
            style={{ borderColor: '#E0603F', color: '#E0603F' }}
          >
            {locale === 'id' ? 'Hapus Semua Data' : 'Clear All Data'}
          </button>
        </div>
      </div>

      {/* Hold 1.5s to Import over slot */}
      <HoldConfirmModal
        open={importCandidate !== null}
        title={
          importCandidate
            ? locale === 'id'
              ? `Impor ke Slot ${importCandidate.slotId}?`
              : `Import into Slot ${importCandidate.slotId}?`
            : ''
        }
        description={
          importCandidate
            ? `${importCandidate.preview.playerName} · Rank ${importCandidate.preview.architectRank} · ${importCandidate.preview.xp} XP · ${importCandidate.preview.currentRegionId} · ${formatDuration(importCandidate.preview.playtimeSeconds)}. Cadangan otomatis dibuat sebelum menimpa.`
            : ''
        }
        confirmLabel={locale === 'id' ? 'Timpa dengan Berkas Impor' : 'Overwrite with Import'}
        danger={false}
        onConfirm={() => void confirmImport()}
        onCancel={() => setImportCandidate(null)}
      />

      {/* Hold 1.5s to Delete slot */}
      <HoldConfirmModal
        open={deleteTargetSlot !== null}
        title={
          deleteTargetSlot !== null
            ? locale === 'id'
              ? `Hapus Slot ${deleteTargetSlot}?`
              : `Delete Slot ${deleteTargetSlot}?`
            : ''
        }
        description={
          locale === 'id'
            ? 'Semua progres misi, kode tersimpan, dan penguasaan konsep di slot ini akan dihapus permanen.'
            : 'All mission progress, code drafts, and mastery records in this slot will be permanently deleted.'
        }
        confirmLabel={locale === 'id' ? 'Hapus Slot' : 'Delete Slot'}
        secondaryActionLabel={
          deleteTargetSlot !== null && onExportSlot
            ? locale === 'id'
              ? 'Ekspor Dulu'
              : 'Export First'
            : undefined
        }
        onSecondaryAction={
          deleteTargetSlot !== null && onExportSlot
            ? () => void onExportSlot(deleteTargetSlot)
            : undefined
        }
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTargetSlot(null)}
      />

      {/* Hold 1.5s to Clear All Data */}
      <HoldConfirmModal
        open={clearAllModalOpen}
        title={locale === 'id' ? 'Hapus Semua Data Lokal?' : 'Clear All Local Data?'}
        description={
          locale === 'id'
            ? 'Ini akan menghapus seluruh 3 slot simpanan, cadangan, dan pengaturan di perangkat ini.'
            : 'This will permanently erase all 3 save slots, backups, and global settings on this device.'
        }
        confirmLabel={locale === 'id' ? 'Hapus Semua' : 'Clear All'}
        onConfirm={() => void confirmClearAll()}
        onCancel={() => setClearAllModalOpen(false)}
      />
    </main>
  );
};
