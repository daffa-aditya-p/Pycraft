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
import { ArchitectAvatarPreview } from '../components/ArchitectAvatarPreview';
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
  { id: 'moss', label: 'Lumut (Moss)', unlockId: 'bit_paint_moss', hex: '#64923C' },
  { id: 'clay', label: 'Terakota (Clay)', unlockId: 'bit_paint_clay', hex: '#B4533C' },
  { id: 'slate', label: 'Batu Sabak (Slate)', unlockId: 'bit_paint_slate', hex: '#55595D' },
  { id: 'sky', label: 'Langit (Sky)', unlockId: 'bit_paint_sky', hex: '#0284C7' },
];

const BIT_ACCESSORIES = [
  { id: null, label: 'Tanpa Aksesori', unlockId: null },
  { id: 'lantern', label: 'Lentera (M4 Bonus)', unlockId: 'bit_acc_lantern' },
  { id: 'flag', label: 'Bendera Antena (M5 Bonus)', unlockId: 'bit_acc_flag' },
];

const NEO_VISORS = [
  { id: 'turquoise', label: 'Turquoise Inti', unlockId: 'neo_visor_turquoise', hex: '#06B6D4' },
  { id: 'amber', label: 'Amber Suar', unlockId: 'neo_visor_amber', hex: '#F59E0B' },
];

const COSMETIC_LABELS: Record<string, { id: string; en: string }> = {
  bit_paint_moss: { id: 'Cat BIT: Lumut', en: 'BIT Paint: Moss' },
  bit_paint_clay: { id: 'Cat BIT: Terakota', en: 'BIT Paint: Clay' },
  bit_paint_slate: { id: 'Cat BIT: Batu Sabak', en: 'BIT Paint: Slate' },
  bit_paint_sky: { id: 'Cat BIT: Langit', en: 'BIT Paint: Sky' },
  bit_acc_lantern: { id: 'Aksesori BIT: Lentera', en: 'BIT Accessory: Lantern' },
  bit_acc_flag: { id: 'Aksesori BIT: Bendera Antena', en: 'BIT Accessory: Antenna Flag' },
  bit_acc_antenna_flag: { id: 'Aksesori BIT: Bendera Antena', en: 'BIT Accessory: Antenna Flag' },
  neo_visor_turquoise: { id: 'Visor NEO: Turquoise Inti', en: 'NEO Visor: Core Turquoise' },
  neo_visor_amber: { id: 'Visor NEO: Amber Suar', en: 'NEO Visor: Beacon Amber' },
  scarf_amber: { id: 'Syal Arsitek: Amber', en: 'Architect Scarf: Amber' },
};

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
  const [expandedTips, setExpandedTips] = useState<Record<string, boolean>>({});

  const toggleTip = (key: string) => {
    setExpandedTips((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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

    const completedObjs = quests.completedObjectiveIds ?? [];
    const hasExplicitCompletion =
      completedObjs.length > 0 || quests.completedStepIds.length > 0;

    let activeIndex = -1;

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

    if (activeIndex === -1 && quests.activeStepId) {
      const stepIdx = quest.objectives.findIndex(
        (o) => o.type === 'code_step' && o.targetId === quests.activeStepId
      );
      if (stepIdx !== -1) {
        activeIndex = stepIdx;
      }
    }

    if (activeIndex === -1 && hasExplicitCompletion) {
      const firstIncIdx = quest.objectives.findIndex(
        (o) =>
          !completedObjs.includes(o.id) &&
          !(o.type === 'code_step' && quests.completedStepIds.includes(o.targetId))
      );
      if (firstIncIdx !== -1) {
        activeIndex = firstIncIdx;
      }
    }

    if (activeIndex === -1) {
      activeIndex = 0;
    }

    return quest.objectives.map((obj, idx) => {
      const explicitDone =
        completedObjs.includes(obj.id) ||
        (obj.type === 'code_step' && quests.completedStepIds.includes(obj.targetId));
      const isCompleted = explicitDone || idx < activeIndex;
      const isActive = !isCompleted && idx === activeIndex;
      return {
        objective: obj,
        isCompleted,
        isActive,
        isPending: !isCompleted && !isActive,
      };
    });
  };

  // Derive active focus card data
  const allQuestsCompleted = AWAKENING_QUESTS.every(
    (q) =>
      (quests.states[q.id] ?? (q.prerequisites.length === 0 ? 'active' : 'locked')) ===
      'completed'
  );

  const activeQuest = allQuestsCompleted
    ? null
    : AWAKENING_QUESTS.find(
        (q) =>
          (quests.states[q.id] ?? (q.prerequisites.length === 0 ? 'active' : 'locked')) ===
          'active'
      ) ?? AWAKENING_QUESTS[0];

  const getCollectProgress = (targetId: string, requiredCount = 1) =>
    Math.min(
      requiredCount,
      Math.max(
        inventory.items[targetId] ?? 0,
        targetId === 'blue_crystal'
          ? world.collectedWorldItemIds.filter((id) =>
              id.startsWith('awakening_crystal_')
            ).length
          : 0
      )
    );

  const activeFocus = activeQuest
    ? (() => {
        const breakdown = getQuestObjectiveBreakdown(activeQuest, 'active');
        const activeItem = breakdown.find((b) => b.isActive) ?? breakdown[0];
        if (!activeItem) return null;
        const loc =
          ISLAND_LABELS[activeItem.objective.islandId]?.[locale] ??
          activeItem.objective.islandId;
        const rawHint =
          activeItem.objective.hint?.[locale] ?? activeQuest.hint?.[locale] ?? '';
        const conciseHint =
          rawHint.length > 110 ? `${rawHint.slice(0, 107).trimEnd()}…` : rawHint;
        const objLabel =
          activeItem.objective.type === 'collect'
            ? `${activeItem.objective.label[locale].replace(/\s*\(\d+\/\d+\)/g, '')} (${getCollectProgress(activeItem.objective.targetId, activeItem.objective.requiredCount ?? 1)}/${activeItem.objective.requiredCount ?? 1})`
            : activeItem.objective.label[locale];
        return {
          questTitle: activeQuest.title[locale],
          objectiveLabel: objLabel,
          location: loc,
          hint: conciseHint,
        };
      })()
    : null;

  const filteredActs =
    selectedAct === 'all'
      ? AWAKENING_ACTS
      : AWAKENING_ACTS.filter((a) => a.actNumber === selectedAct);

  // Rank progress percentage for Profile tab
  const rankFloorXp = rankMeta.xp;
  const rankCeilingXp = nextRank ? nextRank.xp : rankMeta.xp;
  const rankProgressPct = nextRank
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(((learning.xp - rankFloorXp) / Math.max(1, rankCeilingXp - rankFloorXp)) * 100)
        )
      )
    : 100;

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
        backgroundColor: 'rgba(14, 50, 78, 0.42)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <style>{`
        @keyframes questActiveGlow {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(14, 116, 144, 0.18);
          }
          50% {
            box-shadow: 0 0 12px 2px rgba(14, 116, 144, 0.22);
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
        style={{
          width: '100%',
          maxWidth: '940px',
          maxHeight: '90dvh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: '18px',
          backgroundColor: '#FFFFFF',
          border: '1.5px solid #BAE6FD',
          boxShadow: '0 20px 44px rgba(14, 50, 78, 0.28)',
        }}
      >
        {/* Header + Tabs */}
        <header
          style={{
            padding: '16px 22px 0',
            borderBottom: '1px solid #E0F2FE',
            background: 'linear-gradient(180deg, #F0F9FF 0%, #FFFFFF 100%)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.5rem',
                  color: '#0E7490',
                  letterSpacing: '0.01em',
                }}
              >
                {locale === 'id' ? 'Jurnal Arsitek' : 'Architect Journal'}
              </h1>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: '#0369A1',
                  backgroundColor: '#E0F2FE',
                  padding: '3px 9px',
                  borderRadius: '999px',
                  fontWeight: 700,
                }}
              >
                ESC / O / J
              </span>
            </div>
            <button
              type="button"
              aria-label={locale === 'id' ? 'Tutup Jurnal' : 'Close Journal'}
              onClick={() => setInGameOverlay('explore')}
              style={{
                minWidth: '40px',
                minHeight: '40px',
                padding: '0 10px',
                borderRadius: '10px',
                border: '1px solid #BAE6FD',
                backgroundColor: '#FFFFFF',
                color: '#0E7490',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
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
                    padding: '6px 16px',
                    backgroundColor: active ? '#ECFEFF' : 'transparent',
                    color: active ? '#0E7490' : '#475569',
                    border: '1px solid',
                    borderColor: active ? '#A5F3FC' : 'transparent',
                    borderBottom: active ? '2.5px solid #0891B2' : '2.5px solid transparent',
                    borderRadius: '10px 10px 0 0',
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
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            backgroundColor: '#F8FAFC',
          }}
        >
          {journalTab === 'quests' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Prominent Current Mission Focus Card or Completion Celebration */}
              {allQuestsCompleted ? (
                <section
                  aria-label={locale === 'id' ? 'Semua Misi Kebangkitan Selesai' : 'All Awakening Missions Complete'}
                  style={{
                    background: 'linear-gradient(135deg, #DCFCE7 0%, #ECFEFF 100%)',
                    border: '1.5px solid #4ADE80',
                    borderRadius: '14px',
                    padding: '16px 18px',
                    boxShadow: '0 6px 18px rgba(22, 163, 74, 0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.125rem',
                      fontWeight: 800,
                      color: '#166534',
                    }}
                  >
                    {locale === 'id'
                      ? '🎉 Semua Misi Kebangkitan Selesai!'
                      : '🎉 All Awakening Missions Complete!'}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#15803D', fontWeight: 600 }}>
                    {locale === 'id'
                      ? 'Serpihan Inti Aetheria telah menyala kembali. Kamu dapat mengulang latihan keahlian di tab Pohon Keahlian atau menjelajahi pulau dengan bebas.'
                      : 'The Core Shard of Aetheria is reawakened. You can practice any skill in the Skill Tree tab or explore the islands freely.'}
                  </div>
                </section>
              ) : (
                activeFocus && (
                <section
                  aria-label={locale === 'id' ? 'Fokus Misi Saat Ini' : 'Current Mission Focus'}
                  style={{
                    background: 'linear-gradient(135deg, #ECFEFF 0%, #F0F9FF 100%)',
                    border: '1.5px solid #67E8F9',
                    borderRadius: '14px',
                    padding: '16px 18px',
                    boxShadow: '0 6px 18px rgba(8, 145, 178, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: '#0E7490',
                      }}
                    >
                      {locale === 'id' ? '🎯 Fokus Misi Saat Ini' : '🎯 Current Mission Focus'}
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '999px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #A5F3FC',
                        color: '#0E7490',
                      }}
                    >
                      📍 {activeFocus.location}
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.125rem',
                      fontWeight: 800,
                      color: '#0F172A',
                    }}
                  >
                    {activeFocus.questTitle}
                  </div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#155E75' }}>
                    → {activeFocus.objectiveLabel}
                  </div>
                  {activeFocus.hint && (
                    <div style={{ fontSize: '0.8125rem', color: '#475569' }}>
                      💡 {activeFocus.hint}
                    </div>
                  )}
                </section>
              ))}

              {/* Act Filter Navigation Pills */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexWrap: 'wrap',
                  paddingBottom: '10px',
                  borderBottom: '1px solid #E2E8F0',
                }}
              >
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#64748B',
                    marginRight: '4px',
                  }}
                >
                  {locale === 'id' ? 'Pilih Babak:' : 'Select Act:'}
                </span>

                <button
                  type="button"
                  onClick={() => setSelectedAct('all')}
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    borderRadius: '999px',
                    border: '1px solid',
                    borderColor: selectedAct === 'all' ? '#0891B2' : '#CBD5E1',
                    backgroundColor: selectedAct === 'all' ? '#ECFEFF' : '#FFFFFF',
                    color: selectedAct === 'all' ? '#0E7490' : '#334155',
                  }}
                >
                  {locale === 'id' ? 'Semua Babak (1-4)' : 'All Acts (1-4)'}
                </button>

                {AWAKENING_ACTS.map((act) => {
                  const actQuests = act.questIds
                    .map((qId) => AWAKENING_QUESTS.find((q) => q.id === qId))
                    .filter((q): q is QuestDefinition => q !== undefined);
                  const isDone = actQuests.every(
                    (q) =>
                      (quests.states[q.id] ?? (q.prerequisites.length === 0 ? 'active' : 'locked')) ===
                      'completed'
                  );
                  const isActive = actQuests.some(
                    (q) =>
                      (quests.states[q.id] ?? (q.prerequisites.length === 0 ? 'active' : 'locked')) ===
                      'active'
                  );
                  const isSelected = selectedAct === act.actNumber;

                  return (
                    <button
                      key={act.actNumber}
                      type="button"
                      onClick={() => setSelectedAct(act.actNumber)}
                      style={{
                        padding: '5px 12px',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        borderRadius: '999px',
                        border: '1px solid',
                        borderColor: isSelected ? '#0891B2' : '#CBD5E1',
                        backgroundColor: isSelected ? '#ECFEFF' : '#FFFFFF',
                        color: isSelected ? '#0E7490' : '#334155',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>
                        {locale === 'id' ? `Babak ${act.actNumber}` : `Act ${act.actNumber}`}
                      </span>
                      {isDone ? (
                        <span style={{ color: '#16A34A', fontSize: '0.75rem' }}>✓</span>
                      ) : isActive ? (
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            backgroundColor: '#F59E0B',
                            display: 'inline-block',
                          }}
                        />
                      ) : (
                        <span style={{ color: '#94A3B8', fontSize: '0.7rem' }}>🔒</span>
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
                  (q) =>
                    (quests.states[q.id] ?? (q.prerequisites.length === 0 ? 'active' : 'locked')) ===
                    'completed'
                ).length;
                const totalXP = actQuests.reduce((sum, q) => sum + q.rewardXP, 0);
                const isActCompleted = completedQuestsCount === actQuests.length;
                const isActActive = actQuests.some(
                  (q) =>
                    (quests.states[q.id] ?? (q.prerequisites.length === 0 ? 'active' : 'locked')) ===
                    'active'
                );

                return (
                  <section
                    key={act.actNumber}
                    style={{
                      border: '1px solid #BAE6FD',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      boxShadow: '0 4px 16px rgba(14, 116, 144, 0.06)',
                    }}
                  >
                    {/* Act Banner */}
                    <div
                      style={{
                        padding: '14px 18px',
                        backgroundColor: '#F0F9FF',
                        borderBottom: '1px solid #E0F2FE',
                        borderLeft: isActCompleted
                          ? '5px solid #16A34A'
                          : isActActive
                            ? '5px solid #0891B2'
                            : '5px solid #94A3B8',
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
                            flexWrap: 'wrap',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'var(--font-display)',
                              fontWeight: 800,
                              fontSize: '1.125rem',
                              color: '#0F172A',
                            }}
                          >
                            {act.title[locale]}
                          </span>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '999px',
                              backgroundColor: isActCompleted
                                ? '#DCFCE7'
                                : isActActive
                                  ? '#FEF3C7'
                                  : '#F1F5F9',
                              color: isActCompleted
                                ? '#166534'
                                : isActActive
                                  ? '#92400E'
                                  : '#475569',
                              border: '1px solid',
                              borderColor: isActCompleted
                                ? '#86EFAC'
                                : isActActive
                                  ? '#FCD34D'
                                  : '#CBD5E1',
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
                            color: '#475569',
                            marginTop: '3px',
                          }}
                        >
                          {act.subtitle[locale]} · 📍 {act.islandSummary[locale]}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: '0.8125rem',
                          fontWeight: 700,
                          color: '#0369A1',
                          backgroundColor: '#FFFFFF',
                          padding: '4px 12px',
                          borderRadius: '999px',
                          border: '1px solid #BAE6FD',
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

                        const questTipKey = `quest:${quest.id}`;
                        const isQuestTipOpen = Boolean(expandedTips[questTipKey]);

                        return (
                          <div
                            key={quest.id}
                            style={{
                              backgroundColor: isQuestActive ? '#ECFEFF' : '#FFFFFF',
                              border: '1px solid',
                              borderColor: isQuestActive ? '#67E8F9' : '#E2E8F0',
                              borderLeft: isQuestCompleted
                                ? '4px solid #16A34A'
                                : isQuestActive
                                  ? '4px solid #0891B2'
                                  : '4px solid #CBD5E1',
                              borderRadius: '14px',
                              padding: '14px 16px',
                              boxShadow: isQuestActive
                                ? '0 4px 14px rgba(8, 145, 178, 0.1)'
                                : '0 1px 4px rgba(15, 23, 42, 0.04)',
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
                              <div style={{ flex: '1 1 280px' }}>
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
                                      color: '#0F172A',
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
                                      borderRadius: '999px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      backgroundColor: isQuestCompleted
                                        ? '#DCFCE7'
                                        : isQuestActive
                                          ? '#FEF3C7'
                                          : '#F1F5F9',
                                      color: isQuestCompleted
                                        ? '#166534'
                                        : isQuestActive
                                          ? '#92400E'
                                          : '#475569',
                                      border: '1px solid',
                                      borderColor: isQuestCompleted
                                        ? '#86EFAC'
                                        : isQuestActive
                                          ? '#FCD34D'
                                          : '#CBD5E1',
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

                                <p
                                  style={{
                                    margin: '5px 0 0',
                                    fontSize: '0.875rem',
                                    color: '#475569',
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {quest.summary[locale]}
                                </p>
                              </div>

                              {/* XP Reward & Tips Toggle */}
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  flexWrap: 'wrap',
                                }}
                              >
                                {quest.hint && (
                                  <button
                                    type="button"
                                    aria-expanded={isQuestTipOpen}
                                    onClick={() => toggleTip(questTipKey)}
                                    style={{
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      padding: '4px 10px',
                                      borderRadius: '999px',
                                      border: '1px solid #FCD34D',
                                      backgroundColor: isQuestTipOpen ? '#FEF3C7' : '#FFFBEB',
                                      color: '#92400E',
                                      cursor: 'pointer',
                                      position: 'relative',
                                    }}
                                  >
                                    <span
                                      style={{
                                        position: 'absolute',
                                        width: '1px',
                                        height: '1px',
                                        overflow: 'hidden',
                                        clip: 'rect(0, 0, 0, 0)',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {locale === 'id'
                                        ? 'Petunjuk Quest & Konsep Python:'
                                        : 'Quest Hint & Python Concept:'}
                                    </span>
                                    {isQuestTipOpen
                                      ? locale === 'id'
                                        ? '💡 Tutup Tips'
                                        : '💡 Hide Tips'
                                      : locale === 'id'
                                        ? '💡 Lihat Tips'
                                        : '💡 Show Tips'}
                                  </button>
                                )}

                                <span
                                  style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    padding: '4px 10px',
                                    backgroundColor: '#F0F9FF',
                                    color: '#0369A1',
                                    border: '1px solid #BAE6FD',
                                    borderRadius: '999px',
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

                            {/* Prerequisites Lock Warning */}
                            {isQuestLocked &&
                              quest.prerequisites.length > 0 &&
                              (() => {
                                const unmet = quest.prerequisites
                                  .map((pid) => AWAKENING_QUESTS.find((q) => q.id === pid))
                                  .filter(
                                    (q): q is QuestDefinition =>
                                      q !== undefined &&
                                      (quests.states[q.id] ?? 'locked') !== 'completed'
                                  );
                                if (unmet.length === 0) return null;
                                return (
                                  <div
                                    style={{
                                      marginTop: '10px',
                                      padding: '7px 12px',
                                      borderRadius: '10px',
                                      backgroundColor: '#FEF2F2',
                                      border: '1px solid #FECACA',
                                      color: '#991B1B',
                                      fontSize: '0.8125rem',
                                      fontWeight: 700,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                    }}
                                  >
                                    <span>🔒</span>
                                    <span>
                                      {locale === 'id'
                                        ? `Terkunci: Harus menyelesaikan quest "${unmet.map((p) => p.title.id).join(', ')}" terlebih dahulu.`
                                        : `Locked: Must complete quest "${unmet.map((p) => p.title.en).join(', ')}" first.`}
                                    </span>
                                  </div>
                                );
                              })()}

                            {/* Collapsible Quest Hint */}
                            {quest.hint && isQuestTipOpen && (
                              <div
                                style={{
                                  marginTop: '10px',
                                  padding: '10px 12px',
                                  borderRadius: '10px',
                                  backgroundColor: '#FFFBEB',
                                  border: '1px solid #FDE68A',
                                  fontSize: '0.8125rem',
                                  color: '#78350F',
                                  lineHeight: 1.45,
                                }}
                              >
                                {quest.hint[locale]}
                              </div>
                            )}

                            {/* Unlocks note if applicable */}
                            {(quest.unlocksZoneId || quest.unlocksCosmetics) && (
                              <div
                                style={{
                                  marginTop: '8px',
                                  fontSize: '0.75rem',
                                  color: '#475569',
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
                                    <strong>
                                      {quest.unlocksCosmetics
                                        .map((id) => COSMETIC_LABELS[id]?.[locale] ?? id)
                                        .join(', ')}
                                    </strong>
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Objective Checklist Breakdown */}
                            <div
                              style={{
                                marginTop: '12px',
                                paddingTop: '10px',
                                borderTop: '1px solid #E2E8F0',
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
                                    color: '#64748B',
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

                                  const requiredCount = objective.requiredCount ?? 1;
                                  const collectCount =
                                    objective.type === 'collect'
                                      ? getCollectProgress(objective.targetId, requiredCount)
                                      : 0;

                                  const objTipKey = `obj:${quest.id}:${objective.id || objIdx}`;
                                  const isObjTipOpen = Boolean(expandedTips[objTipKey]);

                                  return (
                                    <div
                                      key={objective.id || objIdx}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '10px',
                                        padding: '8px 12px',
                                        borderRadius: '10px',
                                        border: isActive
                                          ? '1.5px solid #0891B2'
                                          : isCompleted
                                            ? '1px solid #BBF7D0'
                                            : '1px dashed #CBD5E1',
                                        backgroundColor: isActive
                                          ? '#FFFFFF'
                                          : isCompleted
                                            ? '#F0FDF4'
                                            : '#F8FAFC',
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
                                        <div
                                          aria-hidden="true"
                                          style={{
                                            width: '18px',
                                            height: '18px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '6px',
                                            flexShrink: 0,
                                            backgroundColor: isCompleted
                                              ? '#16A34A'
                                              : isActive
                                                ? '#F59E0B'
                                                : '#E2E8F0',
                                            border: '1.5px solid',
                                            borderColor: isCompleted
                                              ? '#16A34A'
                                              : isActive
                                                ? '#D97706'
                                                : '#94A3B8',
                                            color: '#FFFFFF',
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
                                                backgroundColor: '#FFFFFF',
                                              }}
                                            />
                                          ) : null}
                                        </div>

                                        <div style={{ flex: 1 }}>
                                          <span
                                            style={{
                                              fontSize: '0.875rem',
                                              fontWeight: isActive ? 700 : 500,
                                              color: isActive
                                                ? '#0F172A'
                                                : isCompleted
                                                  ? '#166534'
                                                  : '#475569',
                                            }}
                                          >
                                            {objective.type === 'collect'
                                              ? objective.label[locale].replace(/\s*\(\d+\/\d+\)/g, '')
                                              : objective.label[locale]}
                                          </span>

                                          {objective.type === 'collect' && (
                                            <span
                                              style={{
                                                marginLeft: '6px',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                color: isCompleted ? '#16A34A' : '#D97706',
                                              }}
                                            >
                                              ({collectCount}/{requiredCount})
                                            </span>
                                          )}

                                          {objective.hint && isObjTipOpen && (
                                            <div
                                              style={{
                                                marginTop: '4px',
                                                padding: '6px 8px',
                                                borderRadius: '8px',
                                                backgroundColor: '#FFFBEB',
                                                border: '1px solid #FDE68A',
                                                fontSize: '0.75rem',
                                                color: '#78350F',
                                                lineHeight: 1.35,
                                              }}
                                            >
                                              💡 {objective.hint[locale]}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Right: Active Pill, Tip Toggle, Island & Type Badges */}
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
                                        {objective.hint && (
                                          <button
                                            type="button"
                                            aria-expanded={isObjTipOpen}
                                            onClick={() => toggleTip(objTipKey)}
                                            style={{
                                              fontSize: '0.6875rem',
                                              fontWeight: 700,
                                              padding: '2px 7px',
                                              borderRadius: '999px',
                                              border: '1px solid #FCD34D',
                                              backgroundColor: isObjTipOpen ? '#FEF3C7' : '#FFFBEB',
                                              color: '#92400E',
                                              cursor: 'pointer',
                                            }}
                                          >
                                            {isObjTipOpen
                                              ? locale === 'id'
                                                ? '💡 Tutup'
                                                : '💡 Hide'
                                              : locale === 'id'
                                                ? '💡 Lihat Tips'
                                                : '💡 Show Tips'}
                                          </button>
                                        )}

                                        {isActive && (
                                          <span
                                            style={{
                                              fontSize: '0.6875rem',
                                              fontWeight: 800,
                                              letterSpacing: '0.04em',
                                              color: '#92400E',
                                              backgroundColor: '#FEF3C7',
                                              padding: '2px 8px',
                                              borderRadius: '999px',
                                              border: '1px solid #F59E0B',
                                            }}
                                          >
                                            {locale === 'id' ? '🎯 SEDANG DIKERJAKAN' : '🎯 IN PROGRESS'}
                                          </span>
                                        )}

                                        <span
                                          style={{
                                            fontSize: '0.6875rem',
                                            color: '#0369A1',
                                            backgroundColor: '#F0F9FF',
                                            padding: '2px 8px',
                                            borderRadius: '999px',
                                            border: '1px solid #BAE6FD',
                                            whiteSpace: 'nowrap',
                                          }}
                                        >
                                          📍 {islandName}
                                        </span>

                                        <span
                                          style={{
                                            fontSize: '0.6875rem',
                                            color: '#475569',
                                            backgroundColor: '#F1F5F9',
                                            padding: '2px 8px',
                                            borderRadius: '999px',
                                            border: '1px solid #CBD5E1',
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
                <div
                  style={{
                    padding: '24px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #BAE6FD',
                    borderRadius: '14px',
                    color: '#475569',
                    textAlign: 'center',
                  }}
                >
                  {locale === 'id'
                    ? 'Tasmu masih kosong — jelajahi pulau!'
                    : 'Your bag is empty — explore the islands!'}
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '12px',
                  }}
                >
                  {inventoryEntries.map(([itemKey, count]) => (
                    <div
                      key={itemKey}
                      style={{
                        padding: '14px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #BAE6FD',
                        borderRadius: '14px',
                        boxShadow: '0 2px 8px rgba(14, 116, 144, 0.06)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>{itemKey}</span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '999px',
                          backgroundColor: '#ECFEFF',
                          color: '#0E7490',
                          fontWeight: 800,
                          fontSize: '0.8125rem',
                        }}
                      >
                        ×{count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {journalTab === 'skill_tree' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
                gap: '12px',
              }}
            >
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
                        padding: '14px 16px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid',
                        borderColor: mastered ? '#86EFAC' : '#BAE6FD',
                        borderRadius: '14px',
                        boxShadow: '0 2px 10px rgba(14, 116, 144, 0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '10px',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '4px',
                          }}
                        >
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '999px',
                              backgroundColor: '#E0F2FE',
                              color: '#0369A1',
                              fontWeight: 800,
                              fontSize: '0.75rem',
                            }}
                          >
                            {kc.id}
                          </span>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              color: mastered ? '#166534' : '#0E7490',
                            }}
                          >
                            {mastered && <IconCheck size={14} />}
                            {stateLabel} · {score}%
                          </span>
                        </div>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9375rem' }}>
                          {kc.title[locale]}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: '#475569', marginTop: '3px' }}>
                          {kc.description[locale]}
                        </div>
                      </div>

                      <div>
                        <div
                          style={{
                            height: '7px',
                            borderRadius: '999px',
                            backgroundColor: '#E2E8F0',
                            overflow: 'hidden',
                            marginBottom: onPracticeKC && kc.practicedIn[0] ? '10px' : '0',
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(100, Math.max(0, score))}%`,
                              height: '100%',
                              borderRadius: '999px',
                              backgroundColor: mastered ? '#16A34A' : '#0891B2',
                              transition: 'width 0.2s ease',
                            }}
                          />
                        </div>

                        {onPracticeKC && kc.practicedIn[0] && (
                          <button
                            type="button"
                            onClick={() => onPracticeKC(kc.id, kc.practicedIn[0]!)}
                            style={{
                              width: '100%',
                              minHeight: '34px',
                              padding: '5px 10px',
                              borderRadius: '8px',
                              border: '1px solid #BAE6FD',
                              backgroundColor: '#F0F9FF',
                              color: '#0E7490',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                            }}
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
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '16px',
                  alignItems: 'start',
                }}
              >
                <ArchitectAvatarPreview
                  appearance={profile.appearance}
                  playerName={profile.name}
                  locale={locale}
                  compact
                />

                <div
                  style={{
                    padding: '18px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #BAE6FD',
                    borderRadius: '14px',
                    boxShadow: '0 4px 14px rgba(14, 116, 144, 0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.375rem',
                        fontWeight: 800,
                        color: '#0F172A',
                      }}
                    >
                      {profile.name}
                    </div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0E7490' }}>
                      {rankMeta[locale]}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        color: '#334155',
                        marginBottom: '6px',
                      }}
                    >
                      <span>{learning.xp} XP</span>
                      <span>
                        {nextRank
                          ? `${nextRank.xp - learning.xp} XP → ${nextRank[locale]}`
                          : locale === 'id'
                            ? 'Peringkat Tertinggi'
                            : 'Max Rank'}
                      </span>
                    </div>
                    <div
                      style={{
                        height: '9px',
                        borderRadius: '999px',
                        backgroundColor: '#E2E8F0',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${rankProgressPct}%`,
                          height: '100%',
                          borderRadius: '999px',
                          background: 'linear-gradient(90deg, #06B6D4, #0891B2)',
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      backgroundColor: '#F0F9FF',
                      border: '1px solid #E0F2FE',
                      fontSize: '0.8125rem',
                      color: '#334155',
                      fontWeight: 600,
                    }}
                  >
                    📜 {locale === 'id' ? 'Catatan Pengetahuan ditemukan' : 'Lore notes found'}:{' '}
                    <strong>{world.discoveredLoreNoteIds.length}/10</strong>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    padding: '14px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #BAE6FD',
                    borderRadius: '14px',
                  }}
                >
                  <h2 style={{ margin: '0 0 10px', fontFamily: 'var(--font-display)', fontSize: '1rem', color: '#0F172A' }}>
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
                          onClick={() => equipCosmetic({ bitPaint: p.id })}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '999px',
                            border: active ? '2px solid #0891B2' : '1px solid #CBD5E1',
                            backgroundColor: active ? '#ECFEFF' : '#FFFFFF',
                            color: '#0F172A',
                            fontWeight: 600,
                            fontSize: '0.8125rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: unlocked ? 'pointer' : 'not-allowed',
                            opacity: unlocked ? 1 : 0.5,
                          }}
                        >
                          <span
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: p.hex,
                            }}
                          />
                          {!unlocked && <IconLock size={13} />}
                          <span>{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div
                  style={{
                    padding: '14px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #BAE6FD',
                    borderRadius: '14px',
                  }}
                >
                  <h2 style={{ margin: '0 0 10px', fontFamily: 'var(--font-display)', fontSize: '1rem', color: '#0F172A' }}>
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
                          onClick={() => equipCosmetic({ bitAccessory: acc.id })}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '999px',
                            border: active ? '2px solid #0891B2' : '1px solid #CBD5E1',
                            backgroundColor: active ? '#ECFEFF' : '#FFFFFF',
                            color: '#0F172A',
                            fontWeight: 600,
                            fontSize: '0.8125rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: unlocked ? 'pointer' : 'not-allowed',
                            opacity: unlocked ? 1 : 0.5,
                          }}
                        >
                          {!unlocked && <IconLock size={13} />}
                          <span>{acc.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div
                  style={{
                    padding: '14px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #BAE6FD',
                    borderRadius: '14px',
                  }}
                >
                  <h2 style={{ margin: '0 0 10px', fontFamily: 'var(--font-display)', fontSize: '1rem', color: '#0F172A' }}>
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
                          onClick={() => equipCosmetic({ neoVisor: vis.id })}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '999px',
                            border: active ? '2px solid #0891B2' : '1px solid #CBD5E1',
                            backgroundColor: active ? '#ECFEFF' : '#FFFFFF',
                            color: '#0F172A',
                            fontWeight: 600,
                            fontSize: '0.8125rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: unlocked ? 'pointer' : 'not-allowed',
                            opacity: unlocked ? 1 : 0.5,
                          }}
                        >
                          <span
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: vis.hex,
                            }}
                          />
                          {!unlocked && <IconLock size={13} />}
                          <span>{vis.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
