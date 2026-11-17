import React, { useEffect, useState } from 'react';
import { AWAKENING_QUESTS } from '@/content/awakening/quests';
import type { QuestDefinition } from '@/game/quests/types';
import { KC_LIST } from '@/learning/kcRegistry';
import {
  RANK_THRESHOLDS,
  useGameStore,
  useSettingsStore,
  useUIStore,
  type JournalTab,
} from '@/stores';
import { IconCheck, IconClose, IconLock, IconSpark } from '../icons';

export interface JournalModalProps {
  onPracticeKC?: (kcId: string, stepId: string) => void;
}

export interface ActDefinition {
  actNumber: number;
  title: { id: string; en: string };
  subtitle: { id: string; en: string };
  islandSummary: { id: string; en: string };
  questIds: readonly string[];
}

export const AWAKENING_ACTS: readonly ActDefinition[] = [
  {
    actNumber: 1,
    title: { id: 'Babak 1: Prolog & Menara Suar', en: 'Act 1: Prologue & Beacon Tower' },
    subtitle: { id: 'Awal Kebangkitan & Suara Pertama', en: 'The Awakening & First Words' },
    islandSummary: { id: 'Kuil Stasis & Titik Suar', en: 'Stasis Shrine & Beacon Point' },
    questIds: ['prologue', 'm1_hello_architect'],
  },
  {
    actNumber: 2,
    title: { id: 'Babak 2: Hutan Pasokan & BIT', en: 'Act 2: Supply Grove & BIT' },
    subtitle: { id: 'Zaman Kesunyian & Pengumpul Data', en: 'Age of Silence & Data Collector' },
    islandSummary: { id: 'Hutan Pasokan', en: 'Supply Grove' },
    questIds: ['interlude_find_bit', 'm2_data_collector'],
  },
  {
    actNumber: 3,
    title: { id: 'Babak 3: Gerbang Terkunci & Ladang', en: 'Act 3: Locked Gate & Farm' },
    subtitle: { id: 'Logika Gerbang & Ladang Otomatis', en: 'Logic Gates & Automated Farm' },
    islandSummary: { id: 'Batu Gerbang & Ladang Terasering', en: 'Gatehouse Rock & Terrace Farm' },
    questIds: ['m3_locked_gate', 'm4_automated_farm'],
  },
  {
    actNumber: 4,
    title: { id: 'Babak 4: Bengkel & Puncak Inti', en: 'Act 4: Workshop & Core Spire' },
    subtitle: { id: 'Cetak Biru Fungsi & Serpihan Inti', en: 'Function Blueprints & Core Shard' },
    islandSummary: { id: 'Bengkel BOLT & Puncak Serpihan Inti', en: "BOLT's Workshop & Core Spire" },
    questIds: ['m5_blueprint', 'final_core_shard'],
  },
];

const ISLAND_LABELS: Record<string, { id: string; en: string }> = {
  stasis_shrine: { id: 'Kuil Stasis', en: 'Stasis Shrine' },
  beacon_point: { id: 'Titik Suar', en: 'Beacon Point' },
  supply_grove: { id: 'Hutan Pasokan', en: 'Supply Grove' },
  gatehouse_rock: { id: 'Batu Gerbang', en: 'Gatehouse Rock' },
  terrace_farm: { id: 'Ladang Terasering', en: 'Terrace Farm' },
  bolts_workshop: { id: 'Bengkel BOLT', en: "BOLT's Workshop" },
  core_spire: { id: 'Puncak Serpihan Inti', en: 'Core Shard Spire' },
};

const OBJECTIVE_TYPE_LABELS: Record<string, { id: string; en: string; icon: string }> = {
  talk_to: { id: 'Bicara', en: 'Talk', icon: '🗣️' },
  go_to: { id: 'Eksplorasi', en: 'Explore', icon: '🚶' },
  interact: { id: 'Interaksi', en: 'Interact', icon: '⚙️' },
  collect: { id: 'Koleksi', en: 'Collect', icon: '💎' },
  code_step: { id: 'Kode Python', en: 'Python Code', icon: '💻' },
  cutscene: { id: 'Sinematik', en: 'Cutscene', icon: '🎬' },
};

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
  const objectiveLabel = useGameStore((s) => s.objectiveLabel);
  const learning = useGameStore((s) => s.learning);
  const inventory = useGameStore((s) => s.inventory);
  const world = useGameStore((s) => s.world);
  const equipCosmetic = useGameStore((s) => s.equipCosmetic);

  const [selectedAct, setSelectedAct] = useState<number | 'all'>('all');

  // Close modal with Escape, O, or J keys
  useEffect(() => {
    if (inGameOverlay !== 'journal') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyJ' || e.code === 'KeyO') {
        e.preventDefault();
        setInGameOverlay('explore');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inGameOverlay, setInGameOverlay]);

  if (inGameOverlay !== 'journal') return null;

  const rankMeta =
    RANK_THRESHOLDS.find((r) => r.rank === learning.rank) ?? RANK_THRESHOLDS[0]!;
  const nextRank = RANK_THRESHOLDS.find((r) => r.rank === learning.rank + 1);
  const unlockedSet = new Set(profile.cosmetics.unlockedIds);

  const tabs: Array<{ id: JournalTab; idLabel: string; enLabel: string }> = [
    { id: 'quests', idLabel: 'Objektif & Misi', enLabel: 'Objectives & Quests' },
    { id: 'inventory', idLabel: 'Tas', enLabel: 'Inventory' },
    { id: 'skill_tree', idLabel: 'Pohon Keahlian', enLabel: 'Skill Tree' },
    { id: 'profile', idLabel: 'Profil & Kosmetik', enLabel: 'Profile & Cosmetics' },
  ];

  const inventoryEntries = Object.entries(inventory.items).filter(
    ([, count]) => count > 0
  );

  // Helper to calculate completion & active states for quest objectives
  const getQuestObjectiveBreakdown = (
    quest: QuestDefinition,
    questStatus: 'locked' | 'available' | 'active' | 'completed'
  ) => {
    if (questStatus === 'completed') {
      return quest.objectives.map((obj) => ({
        objective: obj,
        isCompleted: true,
        isActive: false,
        isPending: false,
      }));
    }

    if (questStatus === 'locked') {
      return quest.objectives.map((obj) => ({
        objective: obj,
        isCompleted: false,
        isActive: false,
        isPending: true,
      }));
    }

    // Active quest: determine which objective is current
    let activeIndex = -1;

    // 1. Check if objectiveLabel matches
    if (objectiveLabel) {
      const cleanLabel = objectiveLabel.trim().toLowerCase();
      const matchIdx = quest.objectives.findIndex(
        (o) =>
          o.label.id.trim().toLowerCase() === cleanLabel ||
          o.label.en.trim().toLowerCase() === cleanLabel
      );
      if (matchIdx !== -1) {
        activeIndex = matchIdx;
      }
    }

    // 2. Check activeStepId
    if (activeIndex === -1 && quests.activeStepId) {
      const stepIdx = quest.objectives.findIndex(
        (o) => o.type === 'code_step' && o.targetId === quests.activeStepId
      );
      if (stepIdx !== -1) {
        activeIndex = stepIdx;
      }
    }

    // 3. Fallback: first incomplete code step
    if (activeIndex === -1) {
      const firstIncIdx = quest.objectives.findIndex(
        (o) => o.type === 'code_step' && !quests.completedStepIds.includes(o.targetId)
      );
      if (firstIncIdx !== -1) {
        activeIndex = firstIncIdx;
      }
    }

    // 4. Default to first
    if (activeIndex === -1) {
      activeIndex = 0;
    }

    return quest.objectives.map((obj, idx) => ({
      objective: obj,
      isCompleted: idx < activeIndex,
      isActive: idx === activeIndex,
      isPending: idx > activeIndex,
    }));
  };

  const filteredActs =
    selectedAct === 'all'
      ? AWAKENING_ACTS
      : AWAKENING_ACTS.filter((a) => a.actNumber === selectedAct);

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
      <style>{`
        @keyframes questActiveGlow {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(242, 181, 68, 0.5);
            border-color: #D97706;
          }
          50% {
            box-shadow: 0 0 10px 2px rgba(242, 181, 68, 0.35);
            border-color: #F2B544;
          }
        }
        @keyframes pulseDot {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.65;
          }
        }
      `}</style>
      <div
        className="surface-parchment"
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90dvh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: '4px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.5rem',
                  color: '#2A2420',
                  letterSpacing: '0.02em',
                }}
              >
                {locale === 'id' ? 'Jurnal Arsitek' : 'Architect Journal'}
              </h1>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: '#5C4F47',
                  backgroundColor: '#E2D3B8',
                  padding: '2px 8px',
                  borderRadius: '2px',
                  fontWeight: 700,
                }}
              >
                [ESC / O / J]
              </span>
            </div>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Act Filter Navigation Pills */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexWrap: 'wrap',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #D9C9A8',
                }}
              >
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#5C4F47',
                    marginRight: '4px',
                  }}
                >
                  {locale === 'id' ? 'Pilih Babak:' : 'Select Act:'}
                </span>

                <button
                  type="button"
                  onClick={() => setSelectedAct('all')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    borderRadius: '2px',
                    border: '1px solid',
                    borderColor: selectedAct === 'all' ? '#D97706' : '#D9C9A8',
                    backgroundColor: selectedAct === 'all' ? '#F6EEDB' : '#EFE2CA',
                    color: selectedAct === 'all' ? '#92400E' : '#2A2420',
                  }}
                >
                  {locale === 'id' ? 'Semua Babak (1-4)' : 'All Acts (1-4)'}
                </button>

                {AWAKENING_ACTS.map((act) => {
                  const actQuests = act.questIds
                    .map((qId) => AWAKENING_QUESTS.find((q) => q.id === qId))
                    .filter((q): q is QuestDefinition => q !== undefined);
                  const isDone = actQuests.every(
                    (q) => (quests.states[q.id] ?? (q.prerequisites.length === 0 ? 'active' : 'locked')) === 'completed'
                  );
                  const isActive = actQuests.some(
                    (q) => (quests.states[q.id] ?? (q.prerequisites.length === 0 ? 'active' : 'locked')) === 'active'
                  );
                  const isSelected = selectedAct === act.actNumber;

                  return (
                    <button
                      key={act.actNumber}
                      type="button"
                      onClick={() => setSelectedAct(act.actNumber)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        borderRadius: '2px',
                        border: '1px solid',
                        borderColor: isSelected ? '#D97706' : '#D9C9A8',
                        backgroundColor: isSelected ? '#F6EEDB' : '#EFE2CA',
                        color: isSelected ? '#92400E' : '#2A2420',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>
                        {locale === 'id' ? `Babak ${act.actNumber}` : `Act ${act.actNumber}`}
                      </span>
                      {isDone ? (
                        <span style={{ color: '#2A6E3F', fontSize: '0.75rem' }}>✓</span>
                      ) : isActive ? (
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: '#D97706',
                            display: 'inline-block',
                          }}
                        />
                      ) : (
                        <span style={{ color: '#8A7B70', fontSize: '0.7rem' }}>🔒</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Acts List */}
              {filteredActs.map((act) => {
                const actQuests = act.questIds
                  .map((qId) => AWAKENING_QUESTS.find((q) => q.id === qId))
                  .filter((q): q is QuestDefinition => q !== undefined);

                const completedQuestsCount = actQuests.filter(
                  (q) => (quests.states[q.id] ?? (q.prerequisites.length === 0 ? 'active' : 'locked')) === 'completed'
                ).length;
                const totalXP = actQuests.reduce((sum, q) => sum + q.rewardXP, 0);
                const isActCompleted = completedQuestsCount === actQuests.length;
                const isActActive = actQuests.some(
                  (q) => (quests.states[q.id] ?? (q.prerequisites.length === 0 ? 'active' : 'locked')) === 'active'
                );

                return (
                  <section
                    key={act.actNumber}
                    style={{
                      border: '1px solid #D9C9A8',
                      backgroundColor: '#F3EAD8',
                      borderRadius: '3px',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Act Banner */}
                    <div
                      style={{
                        padding: '12px 16px',
                        backgroundColor: '#EAE0C7',
                        borderBottom: '1px solid #D9C9A8',
                        borderLeft: isActCompleted
                          ? '5px solid #2A6E3F'
                          : isActActive
                            ? '5px solid #D97706'
                            : '5px solid #A8A29E',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'var(--font-display)',
                              fontWeight: 800,
                              fontSize: '1.125rem',
                              color: '#2A2420',
                            }}
                          >
                            {act.title[locale]}
                          </span>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '2px',
                              backgroundColor: isActCompleted
                                ? '#E2F0D9'
                                : isActActive
                                  ? '#FEF3C7'
                                  : '#E7E5E4',
                              color: isActCompleted
                                ? '#1E4620'
                                : isActActive
                                  ? '#92400E'
                                  : '#57534E',
                              border: '1px solid',
                              borderColor: isActCompleted
                                ? '#A3D09E'
                                : isActActive
                                  ? '#FCD34D'
                                  : '#D6D3D1',
                            }}
                          >
                            {isActCompleted
                              ? locale === 'id'
                                ? 'Babak Selesai'
                                : 'Act Completed'
                              : isActActive
                                ? locale === 'id'
                                ? 'Babak Aktif'
                                : 'Act Active'
                                : locale === 'id'
                                ? 'Terkunci'
                                : 'Locked'}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '0.8125rem',
                            color: '#5C4F47',
                            marginTop: '2px',
                          }}
                        >
                          {act.subtitle[locale]} · 📍 {act.islandSummary[locale]}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: '0.8125rem',
                          fontWeight: 700,
                          color: '#5C4F47',
                          backgroundColor: '#E4D6BD',
                          padding: '4px 10px',
                          borderRadius: '2px',
                          border: '1px solid #D1C09E',
                        }}
                      >
                        {completedQuestsCount}/{actQuests.length}{' '}
                        {locale === 'id' ? 'Misi Selesai' : 'Quests Done'} · +{totalXP} XP
                      </div>
                    </div>

                    {/* Quests in Act */}
                    <div
                      style={{
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      {actQuests.map((quest) => {
                        const questStatus =
                          quests.states[quest.id] ??
                          (quest.prerequisites.length === 0 ? 'active' : 'locked');
                        const isQuestCompleted = questStatus === 'completed';
                        const isQuestActive = questStatus === 'active';
                        const isQuestLocked = questStatus === 'locked';

                        const objectiveBreakdown = getQuestObjectiveBreakdown(
                          quest,
                          questStatus
                        );
                        const completedObjCount = objectiveBreakdown.filter(
                          (o) => o.isCompleted
                        ).length;

                        return (
                          <div
                            key={quest.id}
                            style={{
                              backgroundColor: isQuestActive ? '#FDFBF7' : '#EFE2CA',
                              border: '1px solid',
                              borderColor: isQuestActive ? '#D97706' : '#D9C9A8',
                              borderLeft: isQuestCompleted
                                ? '4px solid #2A6E3F'
                                : isQuestActive
                                  ? '4px solid #D97706'
                                  : '4px solid #A8A29E',
                              borderRadius: '2px',
                              padding: '14px 16px',
                              boxShadow: isQuestActive
                                ? '0 2px 8px rgba(217, 119, 6, 0.12)'
                                : 'none',
                            }}
                          >
                            {/* Quest Header */}
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                gap: '10px',
                                flexWrap: 'wrap',
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    flexWrap: 'wrap',
                                  }}
                                >
                                  <strong
                                    style={{
                                      fontFamily: 'var(--font-display)',
                                      fontSize: '1.0625rem',
                                      color: '#2A2420',
                                    }}
                                  >
                                    {quest.title[locale]}
                                  </strong>

                                  {/* Status Chip */}
                                  <span
                                    style={{
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      padding: '2px 8px',
                                      borderRadius: '2px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      backgroundColor: isQuestCompleted
                                        ? '#E2F0D9'
                                        : isQuestActive
                                          ? '#FEF3C7'
                                          : '#E7E5E4',
                                      color: isQuestCompleted
                                        ? '#1E4620'
                                        : isQuestActive
                                          ? '#92400E'
                                          : '#57534E',
                                      border: '1px solid',
                                      borderColor: isQuestCompleted
                                        ? '#A3D09E'
                                        : isQuestActive
                                          ? '#FCD34D'
                                          : '#D6D3D1',
                                    }}
                                  >
                                    {isQuestCompleted && <IconCheck size={13} />}
                                    {isQuestLocked && <IconLock size={13} />}
                                    {isQuestActive && (
                                      <span
                                        style={{
                                          width: '7px',
                                          height: '7px',
                                          borderRadius: '50%',
                                          backgroundColor: '#D97706',
                                          animation: 'pulseDot 1.5s infinite',
                                          display: 'inline-block',
                                        }}
                                      />
                                    )}
                                    <span>
                                      {isQuestCompleted
                                        ? locale === 'id'
                                          ? 'Selesai'
                                          : 'Completed'
                                        : isQuestActive
                                          ? locale === 'id'
                                            ? 'Aktif'
                                            : 'Active'
                                          : locale === 'id'
                                            ? 'Terkunci'
                                            : 'Locked'}
                                    </span>
                                  </span>
                                </div>

                                {/* Summary */}
                                <p
                                  style={{
                                    margin: '6px 0 0',
                                    fontSize: '0.875rem',
                                    color: '#5C4F47',
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {quest.summary[locale]}
                                </p>
                              </div>

                              {/* XP Reward & Objective Progress Chip */}
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    padding: '3px 8px',
                                    backgroundColor: '#FAF3E7',
                                    color: '#92400E',
                                    border: '1px solid #E6D2B5',
                                    borderRadius: '2px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <IconSpark size={13} />
                                  <span>+{quest.rewardXP} XP</span>
                                </span>
                              </div>
                            </div>

                            {/* Unlocks note if applicable */}
                            {(quest.unlocksZoneId || quest.unlocksCosmetics) && (
                              <div
                                style={{
                                  marginTop: '8px',
                                  fontSize: '0.75rem',
                                  color: '#786C64',
                                  display: 'flex',
                                  gap: '12px',
                                  flexWrap: 'wrap',
                                }}
                              >
                                {quest.unlocksZoneId && (
                                  <span>
                                    🔓 {locale === 'id' ? 'Membuka Zona' : 'Unlocks Zone'}:{' '}
                                    <strong>
                                      {ISLAND_LABELS[quest.unlocksZoneId]?.[locale] ??
                                        quest.unlocksZoneId}
                                    </strong>
                                  </span>
                                )}
                                {quest.unlocksCosmetics && (
                                  <span>
                                    🎨 {locale === 'id' ? 'Membuka Kosmetik' : 'Unlocks Cosmetic'}:{' '}
                                    <strong>{quest.unlocksCosmetics.join(', ')}</strong>
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Objective Checklist Breakdown */}
                            <div
                              style={{
                                marginTop: '12px',
                                paddingTop: '10px',
                                borderTop: '1px solid #E4D6BD',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  marginBottom: '8px',
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                    color: '#786C64',
                                  }}
                                >
                                  {locale === 'id' ? 'Daftar Objektif' : 'Objectives Checklist'} (
                                  {completedObjCount}/{quest.objectives.length})
                                </span>
                              </div>

                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '6px',
                                }}
                              >
                                {objectiveBreakdown.map((item, objIdx) => {
                                  const { objective, isCompleted, isActive } = item;
                                  const islandName =
                                    ISLAND_LABELS[objective.islandId]?.[locale] ??
                                    objective.islandId;
                                  const typeInfo = OBJECTIVE_TYPE_LABELS[objective.type] ?? {
                                    id: objective.type,
                                    en: objective.type,
                                    icon: '•',
                                  };

                                  const collectCount =
                                    objective.type === 'collect'
                                      ? inventory.items[objective.targetId] ?? 0
                                      : 0;

                                  return (
                                    <div
                                      key={objective.id || objIdx}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '10px',
                                        padding: '7px 10px',
                                        borderRadius: '2px',
                                        border: isActive
                                          ? '1.5px solid #D97706'
                                          : isCompleted
                                            ? '1px solid #D1E5CD'
                                            : '1px dashed #D9C9A8',
                                        backgroundColor: isActive
                                          ? 'rgba(242, 181, 68, 0.16)'
                                          : isCompleted
                                            ? 'rgba(42, 110, 63, 0.06)'
                                            : '#FAF5EA',
                                        animation: isActive
                                          ? 'questActiveGlow 2s infinite ease-in-out'
                                          : 'none',
                                        transition: 'all 0.15s ease',
                                      }}
                                    >
                                      {/* Left: Checkbox Icon + Label */}
                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '10px',
                                          flex: 1,
                                        }}
                                      >
                                        {/* Status Checkbox Marker */}
                                        <div
                                          aria-hidden="true"
                                          style={{
                                            width: '18px',
                                            height: '18px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '2px',
                                            flexShrink: 0,
                                            backgroundColor: isCompleted
                                              ? '#2A6E3F'
                                              : isActive
                                                ? '#F2B544'
                                                : '#EFE2CA',
                                            border: '1.5px solid',
                                            borderColor: isCompleted
                                              ? '#2A6E3F'
                                              : isActive
                                                ? '#D97706'
                                                : '#A8998A',
                                            color: isCompleted
                                              ? '#FFFFFF'
                                              : isActive
                                                ? '#1C2427'
                                                : 'transparent',
                                          }}
                                        >
                                          {isCompleted ? (
                                            <IconCheck size={12} />
                                          ) : isActive ? (
                                            <span
                                              style={{
                                                width: '6px',
                                                height: '6px',
                                                borderRadius: '50%',
                                                backgroundColor: '#1C2427',
                                              }}
                                            />
                                          ) : null}
                                        </div>

                                        {/* Label text */}
                                        <div style={{ flex: 1 }}>
                                          <span
                                            style={{
                                              fontSize: '0.875rem',
                                              fontWeight: isActive ? 700 : 500,
                                              color: isActive
                                                ? '#1C2427'
                                                : isCompleted
                                                  ? '#4A5B4F'
                                                  : '#6B5E55',
                                              textDecoration: isCompleted
                                                ? 'none'
                                                : 'none',
                                            }}
                                          >
                                            {objective.label[locale]}
                                          </span>

                                          {/* For collect quests, show current inventory count */}
                                          {objective.type === 'collect' && (
                                            <span
                                              style={{
                                                marginLeft: '6px',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                color: isCompleted ? '#2A6E3F' : '#D97706',
                                              }}
                                            >
                                              ({Math.min(objective.requiredCount ?? 1, collectCount)}/
                                              {objective.requiredCount ?? 1})
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Right: Active Pill & Island & Type Badges */}
                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          flexShrink: 0,
                                          flexWrap: 'wrap',
                                          justifyContent: 'flex-end',
                                        }}
                                      >
                                        {isActive && (
                                          <span
                                            style={{
                                              fontSize: '0.6875rem',
                                              fontWeight: 800,
                                              letterSpacing: '0.04em',
                                              color: '#92400E',
                                              backgroundColor: '#FEF3C7',
                                              padding: '2px 6px',
                                              borderRadius: '2px',
                                              border: '1px solid #F59E0B',
                                            }}
                                          >
                                            {locale === 'id' ? '🎯 SEDANG DIKERJAKAN' : '🎯 IN PROGRESS'}
                                          </span>
                                        )}

                                        <span
                                          style={{
                                            fontSize: '0.6875rem',
                                            color: '#5C4F47',
                                            backgroundColor: '#EAE0C7',
                                            padding: '2px 6px',
                                            borderRadius: '2px',
                                            border: '1px solid #D9C9A8',
                                            whiteSpace: 'nowrap',
                                          }}
                                        >
                                          📍 {islandName}
                                        </span>

                                        <span
                                          style={{
                                            fontSize: '0.6875rem',
                                            color: '#5C4F47',
                                            backgroundColor: '#EAE0C7',
                                            padding: '2px 6px',
                                            borderRadius: '2px',
                                            border: '1px solid #D9C9A8',
                                            whiteSpace: 'nowrap',
                                          }}
                                        >
                                          {typeInfo.icon} {typeInfo[locale]}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
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
