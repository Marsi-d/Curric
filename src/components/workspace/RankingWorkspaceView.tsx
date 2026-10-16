/**
 * Customizable Curriculum Tier-List Editor & Topic Ranking Workspace.
 *
 * Implements:
 * - Authentic tier-list editor (horizontal tiers stacked vertically with vibrant colored headers).
 * - Default tier labels: S, A, B, C, D, F.
 * - Fully editable tier labels (e.g., "Mastered", "I understand it", "I know it but can hardly understand it", "I don't know it").
 * - Dynamic tiers: add, delete, reorder, and color-customize tiers without hardcoded limits.
 * - Drag-and-drop topics between tiers, reorder within a tier, or drag to/from the unranked pool.
 * - Touch & mobile friendly: includes 1-click "Move to..." popover and arrow reordering for non-drag environments.
 * - Unranked curriculum topics tray on the same page with instant search, subject filter, and grade filter.
 * - Shows full context (subject badge, grade, unit) on every card without altering canonical curriculum data.
 * - Preset styles: Classic S-F, Comprehension/Understanding, Exam Yield, and Personal Difficulty.
 * - Zero mutation to canonical syllabus hierarchy: uses stable topic IDs decoupled in ranking assignments.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import ExplorerSquareButton from './ExplorerSquareButton';
import {
  ArrowUpDown,
  Search,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  FileText,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Layers,
  Copy,
  Check,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Hash,
  Palette,
  Edit2,
  MoreVertical,
  ChevronRight,
  Filter,
  ArrowRight,
  ArrowLeft,
  Move,
  FolderTree,
  BookOpen,
  GripVertical,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  getAllTopicsWithContext,
  getTopicsByTier,
  getUnrankedTopics,
  TopicWithContext,
  RankedTopicItem,
  DEFAULT_TIERS,
  TIER_COLOR_PALETTE,
} from '../../utils/rankingUtils';
import QuickRankTiles from './QuickRankTiles';
import { RankingProfile, RankingTier } from '../../types/curriculum';

interface DragPayload {
  topicId: string;
  sourceTierId: string | 'unranked';
  sourceIndex?: number;
}

export default function RankingWorkspaceView() {
  const {
    theme,
    curriculumDoc,
    activeRankingProfileId,
    setActiveRankingProfileId,
    createRankingProfile,
    deleteRankingProfile,
    clearRankingProfile,
    assignTopicToTier,
    reorderTopicInTier,
    removeTopicFromTier,
    clearTierTopics,
    updateProfileTiers,
    updateTierLabel,
    updateTierColor,
    addTierToProfile,
    deleteTierFromProfile,
    seedStarterCurriculum,
    updateTopicRankingNotes,
    openTab,
    expandToItem,
    addTopicManually,
    addUnitManually,
  } = useWorkspace();

  // Active ranking profile (must be tier-based)
  const activeProfile = useMemo(() => {
    const list = curriculumDoc.rankingProfiles || [];
    const current = list.find((p) => p.id === activeRankingProfileId);
    if (current && current.type === 'tier' && current.tiers && current.tiers.length > 0) {
      return current;
    }
    const fallbackTier = list.find((p) => p.type === 'tier' && p.tiers && p.tiers.length > 0);
    if (fallbackTier) return fallbackTier;
    return list[0] || null;
  }, [curriculumDoc.rankingProfiles, activeRankingProfileId]);

  // Synchronize active profile ID if needed
  useEffect(() => {
    if (activeProfile && activeProfile.id !== activeRankingProfileId) {
      setActiveRankingProfileId(activeProfile.id);
    }
  }, [activeProfile, activeRankingProfileId, setActiveRankingProfileId]);

  // Tiers for active profile (guarantee default S, A, B, C, D, F fallback)
  const tiers: RankingTier[] = useMemo(() => {
    if (activeProfile?.tiers && activeProfile.tiers.length > 0) {
      return [...activeProfile.tiers].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    return DEFAULT_TIERS;
  }, [activeProfile]);

  // All topics extracted with ancestral context (stable IDs preserved)
  const allTopics = useMemo(() => {
    return getAllTopicsWithContext(curriculumDoc);
  }, [curriculumDoc]);

  // Topics mapped by tier ID
  const topicsByTier = useMemo(() => {
    if (!activeProfile) return new Map<string, RankedTopicItem[]>();
    return getTopicsByTier(
      activeProfile.id,
      curriculumDoc.rankingAssignments || [],
      allTopics
    );
  }, [activeProfile, curriculumDoc.rankingAssignments, allTopics]);

  // Filtered topics in tiers based on search
  const [tierSearchQuery, setTierSearchQuery] = useState('');

  // Unranked topics
  const unrankedTopics = useMemo(() => {
    if (!activeProfile) return [];
    return getUnrankedTopics(
      activeProfile.id,
      curriculumDoc.rankingAssignments || [],
      allTopics,
      true
    );
  }, [activeProfile, curriculumDoc.rankingAssignments, allTopics]);

  // Unranked filters & collapsible dropdown state
  const [isUnrankedOpen, setIsUnrankedOpen] = useState(false);
  const [unrankedSearchQuery, setUnrankedSearchQuery] = useState('');
  const [unrankedSubjectFilter, setUnrankedSubjectFilter] = useState('all');
  const [unrankedGradeFilter, setUnrankedGradeFilter] = useState('all');

  const filteredUnrankedTopics = useMemo(() => {
    let list = unrankedTopics;

    if (unrankedSubjectFilter !== 'all') {
      list = list.filter((t) => t.subjectId === unrankedSubjectFilter);
    }

    if (unrankedGradeFilter !== 'all') {
      list = list.filter(
        (t) =>
          t.groupId === unrankedGradeFilter ||
          t.groupName === unrankedGradeFilter ||
          t.groupName?.toLowerCase().includes(unrankedGradeFilter.toLowerCase())
      );
    }

    if (unrankedSearchQuery.trim()) {
      const q = unrankedSearchQuery.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.topicName.toLowerCase().includes(q) ||
          t.path.toLowerCase().includes(q) ||
          t.subjectName.toLowerCase().includes(q)
      );
    }

    return list;
  }, [unrankedTopics, unrankedSubjectFilter, unrankedGradeFilter, unrankedSearchQuery]);

  // Inline Tier Label Editing State
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState<string>('');
  const labelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTierId && labelInputRef.current) {
      labelInputRef.current.focus();
      labelInputRef.current.select();
    }
  }, [editingTierId]);

  const handleStartEditTier = (tier: RankingTier) => {
    setEditingTierId(tier.id);
    setEditingLabelValue(tier.label);
  };

  const handleSaveTierLabel = (tierId: string) => {
    if (activeProfile && editingLabelValue.trim()) {
      updateTierLabel(activeProfile.id, tierId, editingLabelValue.trim());
    }
    setEditingTierId(null);
  };

  const handleCancelTierLabel = () => {
    setEditingTierId(null);
  };

  // Tier Color Picker Popover
  const [colorPickerTierId, setColorPickerTierId] = useState<string | null>(null);

  // Tier Settings / Options Dropdown
  const [openSettingsTierId, setOpenSettingsTierId] = useState<string | null>(null);

  // Mobile / Click-to-Move Popover
  const [moveMenuTopic, setMoveMenuTopic] = useState<{ topicId: string; currentTierId?: string } | null>(null);

  // Notes Modal State
  const [notesTopicItem, setNotesTopicItem] = useState<{
    topicId: string;
    topicName: string;
    notes: string;
  } | null>(null);
  const [notesInput, setNotesInput] = useState<string>('');

  // Quick Add Topic Modal State
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicSubjectId, setNewTopicSubjectId] = useState('');
  const [newTopicGroupId, setNewTopicGroupId] = useState('');
  const [newTopicUnitName, setNewTopicUnitName] = useState('Unit 1: Foundations');
  const [newTopicDesc, setNewTopicDesc] = useState('');

  const [copiedSummary, setCopiedSummary] = useState(false);

  // Scroll management & auto-scroll on drag
  const tierBoxScrollRef = useRef<HTMLDivElement>(null);
  const unrankedScrollRef = useRef<HTMLDivElement>(null);
  const [isScrolledDown, setIsScrolledDown] = useState(false);

  const scrollToTop = () => {
    tierBoxScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToTier = (tierId: string) => {
    const el = document.getElementById(`tier-row-${tierId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  // Drag & Drop State
  const [draggedPayload, setDraggedPayload] = useState<DragPayload | null>(null);
  const [dragOverTierId, setDragOverTierId] = useState<string | null>(null);
  const [dragOverTargetIndex, setDragOverTargetIndex] = useState<number | null>(null);
  const [isDragOverUnranked, setIsDragOverUnranked] = useState(false);

  // Smooth continuous auto-scroll during drag via requestAnimationFrame
  useEffect(() => {
    if (!draggedPayload) return;

    let animFrameId: number | null = null;
    let currentDelta = 0;
    let targetContainer: HTMLDivElement | null = null;

    const scrollLoop = () => {
      if (currentDelta !== 0 && targetContainer) {
        targetContainer.scrollTop += currentDelta;
        animFrameId = requestAnimationFrame(scrollLoop);
      } else {
        animFrameId = null;
      }
    };

    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
      // Check tier box container
      if (tierBoxScrollRef.current) {
        const rect = tierBoxScrollRef.current.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right) {
          const threshold = 60;
          if (e.clientY < rect.top + threshold && e.clientY >= rect.top - 20) {
            targetContainer = tierBoxScrollRef.current;
            const factor = Math.max(0.1, 1 - Math.max(0, e.clientY - rect.top) / threshold);
            currentDelta = -Math.ceil(18 * factor);
            if (!animFrameId) animFrameId = requestAnimationFrame(scrollLoop);
            return;
          } else if (e.clientY > rect.bottom - threshold && e.clientY <= rect.bottom + 40) {
            targetContainer = tierBoxScrollRef.current;
            const factor = Math.max(0.1, Math.min(1, (e.clientY - (rect.bottom - threshold)) / threshold));
            currentDelta = Math.ceil(18 * factor);
            if (!animFrameId) animFrameId = requestAnimationFrame(scrollLoop);
            return;
          }
        }
      }

      // Check unranked container
      if (unrankedScrollRef.current) {
        const rect = unrankedScrollRef.current.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right) {
          const threshold = 50;
          if (e.clientY < rect.top + threshold && e.clientY >= rect.top - 20) {
            targetContainer = unrankedScrollRef.current;
            const factor = Math.max(0.1, 1 - Math.max(0, e.clientY - rect.top) / threshold);
            currentDelta = -Math.ceil(16 * factor);
            if (!animFrameId) animFrameId = requestAnimationFrame(scrollLoop);
            return;
          } else if (e.clientY > rect.bottom - threshold && e.clientY <= rect.bottom + 40) {
            targetContainer = unrankedScrollRef.current;
            const factor = Math.max(0.1, Math.min(1, (e.clientY - (rect.bottom - threshold)) / threshold));
            currentDelta = Math.ceil(16 * factor);
            if (!animFrameId) animFrameId = requestAnimationFrame(scrollLoop);
            return;
          }
        }
      }

      currentDelta = 0;
    };

    const handleWindowDragEnd = () => {
      currentDelta = 0;
      targetContainer = null;
      if (animFrameId) cancelAnimationFrame(animFrameId);
    };

    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('dragend', handleWindowDragEnd);
    window.addEventListener('drop', handleWindowDragEnd);

    return () => {
      currentDelta = 0;
      targetContainer = null;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('dragend', handleWindowDragEnd);
      window.removeEventListener('drop', handleWindowDragEnd);
    };
  }, [draggedPayload]);

  // Handle Drag Start
  const handleDragStart = (
    e: React.DragEvent,
    topicId: string,
    sourceTierId: string | 'unranked',
    sourceIndex?: number
  ) => {
    const payload: DragPayload = { topicId, sourceTierId, sourceIndex };
    setDraggedPayload(payload);
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedPayload(null);
    setDragOverTierId(null);
    setDragOverTargetIndex(null);
    setIsDragOverUnranked(false);
  };

  const handleDragOverTier = (e: React.DragEvent, tierId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTierId !== tierId) {
      setDragOverTierId(tierId);
    }
  };

  const handleDragLeaveTier = (e: React.DragEvent, tierId: string) => {
    e.preventDefault();
    if (dragOverTierId === tierId) {
      setDragOverTierId(null);
      setDragOverTargetIndex(null);
    }
  };

  // Drop card into a tier
  const handleDropOnTier = (e: React.DragEvent, targetTierId: string, insertIndex?: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTierId(null);
    setDragOverTargetIndex(null);

    let payload = draggedPayload;
    if (!payload) {
      try {
        const raw = e.dataTransfer.getData('application/json');
        if (raw) payload = JSON.parse(raw);
      } catch {
        // ignore
      }
    }

    if (!payload || !activeProfile) return;

    const { topicId, sourceTierId } = payload;

    if (sourceTierId === targetTierId && insertIndex !== undefined) {
      // Reorder within the same tier
      reorderTopicInTier(activeProfile.id, targetTierId, topicId, insertIndex);
    } else {
      // Move from another tier or unranked pool
      assignTopicToTier(activeProfile.id, topicId, targetTierId, insertIndex);
    }

    setDraggedPayload(null);
  };

  // Drop card back into unranked pool
  const handleDropOnUnranked = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverUnranked(false);

    let payload = draggedPayload;
    if (!payload) {
      try {
        const raw = e.dataTransfer.getData('application/json');
        if (raw) payload = JSON.parse(raw);
      } catch {
        // ignore
      }
    }

    if (!payload || !activeProfile) return;

    if (payload.sourceTierId !== 'unranked') {
      removeTopicFromTier(activeProfile.id, payload.topicId);
    }

    setDraggedPayload(null);
  };

  // Tier operations
  const handleAddTier = (position?: number) => {
    if (!activeProfile) return;
    const newTierId = `tier-${Date.now().toString(36)}`;
    const randomColor =
      TIER_COLOR_PALETTE[tiers.length % TIER_COLOR_PALETTE.length] || '#38bdf8';
    const newTier: RankingTier = {
      id: newTierId,
      label: 'NEW',
      order: position !== undefined ? position + 1 : tiers.length + 1,
      color: randomColor,
    };
    addTierToProfile(activeProfile.id, newTier, position);
  };

  const handleDeleteTier = (tierId: string) => {
    if (!activeProfile) return;
    if (tiers.length <= 1) {
      alert('A tier list must contain at least one tier.');
      return;
    }
    deleteTierFromProfile(activeProfile.id, tierId);
    setOpenSettingsTierId(null);
  };

  const handleMoveTier = (tierId: string, direction: 'up' | 'down') => {
    if (!activeProfile) return;
    const idx = tiers.findIndex((t) => t.id === tierId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= tiers.length) return;

    const newTiers = [...tiers];
    const [moved] = newTiers.splice(idx, 1);
    newTiers.splice(targetIdx, 0, moved);

    const reordered = newTiers.map((t, i) => ({ ...t, order: i + 1 }));
    updateProfileTiers(activeProfile.id, reordered);
    setOpenSettingsTierId(null);
  };

  const handleClearTier = (tierId: string) => {
    if (!activeProfile) return;
    clearTierTopics(activeProfile.id, tierId);
    setOpenSettingsTierId(null);
  };

  // Inspect topic in canonical editor tab
  const handleInspectTopic = (context: TopicWithContext) => {
    expandToItem(context.topicId);
    openTab({
      id: `tab-topic-${context.topicId}`,
      title: context.topicName,
      type: 'topic',
      subjectId: context.subjectId,
      groupId: context.groupId,
      unitId: context.unitId,
      topicId: context.topicId,
      isPinned: true,
    });
  };

  // Commit notes
  const handleOpenNotes = (topicId: string, topicName: string, existingNotes?: string) => {
    setNotesTopicItem({ topicId, topicName, notes: existingNotes || '' });
    setNotesInput(existingNotes || '');
  };

  const handleSaveNotes = () => {
    if (activeProfile && notesTopicItem) {
      updateTopicRankingNotes(activeProfile.id, notesTopicItem.topicId, notesInput);
    }
    setNotesTopicItem(null);
    setNotesInput('');
  };

  // Quick text summary copy
  const handleCopyTierSummary = () => {
    if (!activeProfile) return;
    const lines = [`=== ${activeProfile.name} ===`];
    for (const tier of tiers) {
      const items = topicsByTier.get(tier.id) || [];
      const topicTitles = items.map((it) => it.topicContext.topicName).join(', ');
      lines.push(`[${tier.label}]: ${items.length > 0 ? topicTitles : '(empty)'}`);
    }
    lines.push(`\nUnranked: ${unrankedTopics.length} topics`);
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  // Quick Add Topic submit
  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim()) return;

    let subId = newTopicSubjectId;
    if (!subId && curriculumDoc.subjects.length > 0) {
      subId = curriculumDoc.subjects[0].id;
    }

    const sub = curriculumDoc.subjects.find((s) => s.id === subId);
    let grpId = newTopicGroupId;
    if (!grpId && sub && sub.groups.length > 0) {
      grpId = sub.groups[0].id;
    }

    const grp = sub?.groups.find((g) => g.id === grpId);

    let targetUnitId: string | undefined = undefined;
    if (grp && grp.units && grp.units.length > 0) {
      targetUnitId = grp.units[0].id;
    } else if (grp) {
      // Create unit first
      targetUnitId = addUnitManually(grp.id, newTopicUnitName || 'Unit 1: Foundations');
    }

    addTopicManually(
      { groupId: grpId, unitId: targetUnitId },
      newTopicName.trim(),
      newTopicDesc.trim() || undefined
    );

    setNewTopicName('');
    setNewTopicDesc('');
    setIsQuickAddOpen(false);
  };

  // Subject pill color helper
  const getSubjectBadge = (code?: string, name?: string) => {
    const c = (code || name || '').toUpperCase();
    if (c.includes('MATH')) {
      return { bg: 'bg-sky-500/20 text-sky-400 border-sky-500/30', label: 'MATH' };
    }
    if (c.includes('PHYS')) {
      return { bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', label: 'PHYS' };
    }
    if (c.includes('CHEM')) {
      return { bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', label: 'CHEM' };
    }
    if (c.includes('BIO')) {
      return { bg: 'bg-teal-500/20 text-teal-300 border-teal-500/30', label: 'BIO' };
    }
    if (c.includes('ENG')) {
      return { bg: 'bg-rose-500/20 text-rose-300 border-rose-500/30', label: 'ENG' };
    }
    return { bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30', label: code || 'APT' };
  };

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.tier-settings-trigger') && !target.closest('.tier-settings-menu')) {
        setOpenSettingsTierId(null);
      }
      if (!target.closest('.tier-color-trigger') && !target.closest('.tier-color-menu')) {
        setColorPickerTierId(null);
      }
      if (!target.closest('.move-menu-trigger') && !target.closest('.move-menu-popover')) {
        setMoveMenuTopic(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Always open from the top
  useEffect(() => {
    tierBoxScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeRankingProfileId]);

  return (
    <div
      id="tier-list-editor"
      className={`flex-1 min-h-0 flex flex-col min-w-0 overflow-hidden text-xs ${
        theme === 'dark' ? 'bg-[#181818] text-[#cccccc]' : 'bg-[#f4f4f5] text-[#24292f]'
      }`}
    >
      {/* 1. Top Control Bar: Natural balanced layout with Explorer square button flush at top-left corner */}
      <header
        id="tier-list-toolbar"
        className={`h-11 sm:h-12 border-b shrink-0 flex items-center justify-between z-30 sticky top-0 transition-colors pr-2.5 sm:pr-4 ${
          theme === 'dark' ? 'bg-[#131314] border-[#222425]' : 'bg-white border-[#e5e7eb]'
        }`}
      >
        {/* Left: Explorer Button - sits as square flush at top-left corner */}
        <div className="flex items-center h-full shrink-0">
          <ExplorerSquareButton />
        </div>

        {/* Right: Search in Tiers */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 justify-end">
          {/* Quick filter within ranked items */}
          <div className="relative flex items-center shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search topics..."
              value={tierSearchQuery}
              onChange={(e) => setTierSearchQuery(e.target.value)}
              className={`h-8 pl-8 pr-7 py-1 rounded-lg text-xs border outline-none w-32 sm:w-48 transition-colors ${
                theme === 'dark'
                  ? 'bg-[#1e1f20] border-[#282a2c] text-white focus:border-[#007acc]'
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[#007acc]'
              }`}
            />
            {tierSearchQuery && (
              <button
                onClick={() => setTierSearchQuery('')}
                className="absolute right-2 text-slate-400 hover:text-slate-200 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. Main Workspace Layout: Unified Whole Page Scrollable Container */}
      <div
        id="ranking-page-container"
        ref={tierBoxScrollRef}
        onScroll={(e) => setIsScrolledDown(e.currentTarget.scrollTop > 100)}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-custom px-3 sm:px-6 pb-6 pt-0 space-y-5"
      >
        {/* Box 1: Dedicated Tier Ranking Box */}
        <div
          id="tier-box-container"
          className={`flex flex-col border rounded-xl shadow-xs transition-all duration-200 mt-3 sm:mt-4 overflow-hidden ${
            theme === 'dark' ? 'border-[#282a2c] bg-[#131314]' : 'border-[#d0d7de] bg-[#eaecef]'
          }`}
        >
          {/* Tier Box Header (sticks flush to the top bar with zero hole when scrolled) */}
          <div
            className={`min-h-11 py-1.5 px-3 sm:px-4 border-b shrink-0 flex flex-wrap items-center justify-between gap-2 select-none sticky top-0 z-20 rounded-t-xl ${
              theme === 'dark' ? 'bg-[#1e1f20] border-[#282a2c]' : 'bg-slate-100 border-[#e0e0e0]'
            }`}
          >
            <div className="flex items-center gap-2 shrink-0">
              <Layers className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-[11px] text-slate-400 font-mono shrink-0">
                {tiers.length} tiers
              </span>
            </div>

            {/* Direct Jump Shortcuts in Tier Box Header */}
            <div className="flex items-center gap-1 shrink-0 ml-auto">
              <span className="text-[10px] text-slate-400 font-mono hidden lg:inline mr-1 shrink-0">
                Jump:
              </span>
              {tiers.map((t) => (
                <button
                  key={t.id}
                  onClick={() => scrollToTier(t.id)}
                  className="w-5.5 h-5.5 rounded-md text-[10px] font-black flex items-center justify-center transition-transform hover:scale-110 text-slate-950 cursor-pointer shadow-2xs shrink-0 ring-1 ring-black/10"
                  style={{ backgroundColor: t.color || '#ff7f7f' }}
                  title={`Scroll down directly to ${t.label} tier in this box`}
                >
                  {t.label.slice(0, 1)}
                </button>
              ))}
            </div>
          </div>

          {/* Tier Box Rows Stack (rendered naturally in page flow without nested scroll trap) */}
          <div
            id="tier-rows-stack"
            className="flex flex-col divide-y divide-inherit/20"
          >
          {tiers.map((tier, tierIndex) => {
            const allItemsInTier = topicsByTier.get(tier.id) || [];
            const items = tierSearchQuery.trim()
              ? allItemsInTier.filter(
                  (it) =>
                    it.topicContext.topicName.toLowerCase().includes(tierSearchQuery.toLowerCase()) ||
                    it.topicContext.path.toLowerCase().includes(tierSearchQuery.toLowerCase())
                )
              : allItemsInTier;

            const isDragOver = dragOverTierId === tier.id;

            return (
              <div
                key={tier.id}
                id={`tier-row-${tier.id}`}
                onDragOver={(e) => handleDragOverTier(e, tier.id)}
                onDragLeave={(e) => handleDragLeaveTier(e, tier.id)}
                onDrop={(e) => handleDropOnTier(e, tier.id)}
                className={`flex flex-col sm:flex-row border-b last:border-b-0 min-h-[82px] sm:min-h-[88px] transition-colors relative group ${
                  theme === 'dark' ? 'border-[#282828]' : 'border-[#e0e0e0]'
                } ${isDragOver ? 'ring-2 ring-sky-500/80 bg-sky-500/5' : ''}`}
              >
                {/* A. Left Tier Header Block (Spans full width top on mobile, compact left block on desktop) */}
                <div
                  className="w-full sm:w-28 md:w-32 py-2 px-3 sm:p-2 shrink-0 flex sm:flex-col items-center justify-between sm:justify-center relative text-slate-950 font-extrabold select-none transition-all shadow-inner text-center"
                  style={{ backgroundColor: tier.color || '#ff7f7f' }}
                >
                  {/* Inline Editable Label */}
                  {editingTierId === tier.id ? (
                    <div className="w-full flex flex-col items-center gap-1.5">
                      <input
                        ref={labelInputRef}
                        type="text"
                        value={editingLabelValue}
                        onChange={(e) => setEditingLabelValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveTierLabel(tier.id);
                          if (e.key === 'Escape') handleCancelTierLabel();
                        }}
                        onBlur={() => handleSaveTierLabel(tier.id)}
                        className="w-full text-center px-1 py-1 rounded bg-black/80 text-white font-bold text-xs sm:text-sm border border-white/60 outline-none shadow-sm"
                        placeholder="Tier name..."
                      />
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSaveTierLabel(tier.id)}
                          className="p-1 rounded bg-black text-white hover:bg-black/80 text-[10px]"
                          title="Save"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={handleCancelTierLabel}
                          className="p-1 rounded bg-black/50 text-white hover:bg-black text-[10px]"
                          title="Cancel"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => handleStartEditTier(tier)}
                      className="cursor-pointer w-full h-full flex flex-col items-center justify-center group/label px-1"
                      title="Click to rename tier"
                    >
                      <span
                        className={`leading-tight tracking-tight break-words max-w-full text-center ${
                          tier.label.length <= 2
                            ? 'text-2xl sm:text-3xl font-black'
                            : tier.label.length <= 8
                            ? 'text-sm sm:text-base font-extrabold'
                            : 'text-xs sm:text-xs font-bold'
                        }`}
                      >
                        {tier.label}
                      </span>
                      <span className="opacity-0 group-hover/label:opacity-80 transition-opacity mt-0.5 text-[9px] font-mono tracking-wider flex items-center gap-0.5">
                        <Edit2 className="w-2.5 h-2.5" /> edit
                      </span>
                    </div>
                  )}

                  {/* Tier Controls Dropdown Trigger (Top-Right of Tier Header) */}
                  <div className="absolute top-1 right-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenSettingsTierId(openSettingsTierId === tier.id ? null : tier.id);
                      }}
                      className="tier-settings-trigger p-1 rounded-full bg-black/20 hover:bg-black/40 text-black transition-colors cursor-pointer"
                      title="Tier settings: reorder, color, delete"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {/* Tier Context Menu */}
                    {openSettingsTierId === tier.id && (
                      <div
                        className={`tier-settings-menu absolute left-full top-0 ml-1 w-44 rounded-md shadow-2xl border z-50 p-1 font-normal text-xs text-left ${
                          theme === 'dark' ? 'bg-[#252526] border-[#3c3c3c] text-white' : 'bg-white border-[#d0d7de] text-slate-800'
                        }`}
                      >
                        <button
                          onClick={() => {
                            setOpenSettingsTierId(null);
                            handleStartEditTier(tier);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded flex items-center gap-2 cursor-pointer ${
                            theme === 'dark' ? 'hover:bg-[#333333]' : 'hover:bg-slate-100'
                          }`}
                        >
                          <Edit2 className="w-3.5 h-3.5 text-sky-400" />
                          <span>Rename Label</span>
                        </button>

                        <button
                          onClick={() => {
                            setColorPickerTierId(colorPickerTierId === tier.id ? null : tier.id);
                          }}
                          className={`tier-color-trigger w-full text-left px-2.5 py-1.5 rounded flex items-center gap-2 cursor-pointer ${
                            theme === 'dark' ? 'hover:bg-[#333333]' : 'hover:bg-slate-100'
                          }`}
                        >
                          <Palette className="w-3.5 h-3.5 text-amber-400" />
                          <span>Change Color</span>
                        </button>

                        {/* Inline color palette */}
                        {colorPickerTierId === tier.id && (
                          <div className="tier-color-menu grid grid-cols-4 gap-1 p-1.5 my-1 bg-black/15 rounded">
                            {TIER_COLOR_PALETTE.map((c) => (
                              <button
                                key={c}
                                onClick={() => {
                                  if (activeProfile) updateTierColor(activeProfile.id, tier.id, c);
                                  setColorPickerTierId(null);
                                }}
                                className="w-6 h-6 rounded-sm border border-black/40 hover:scale-110 transition-transform cursor-pointer"
                                style={{ backgroundColor: c }}
                                title={c}
                              />
                            ))}
                          </div>
                        )}

                        <div className="h-px bg-inherit opacity-20 my-1" />

                        <button
                          onClick={() => handleMoveTier(tier.id, 'up')}
                          disabled={tierIndex === 0}
                          className={`w-full text-left px-2.5 py-1.5 rounded flex items-center gap-2 cursor-pointer disabled:opacity-30 ${
                            theme === 'dark' ? 'hover:bg-[#333333]' : 'hover:bg-slate-100'
                          }`}
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                          <span>Move Tier Up</span>
                        </button>

                        <button
                          onClick={() => handleMoveTier(tier.id, 'down')}
                          disabled={tierIndex === tiers.length - 1}
                          className={`w-full text-left px-2.5 py-1.5 rounded flex items-center gap-2 cursor-pointer disabled:opacity-30 ${
                            theme === 'dark' ? 'hover:bg-[#333333]' : 'hover:bg-slate-100'
                          }`}
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                          <span>Move Tier Down</span>
                        </button>

                        <button
                          onClick={() => {
                            handleAddTier(tierIndex);
                            setOpenSettingsTierId(null);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded flex items-center gap-2 cursor-pointer ${
                            theme === 'dark' ? 'hover:bg-[#333333]' : 'hover:bg-slate-100'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Add Tier Above</span>
                        </button>

                        <button
                          onClick={() => {
                            handleAddTier(tierIndex + 1);
                            setOpenSettingsTierId(null);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded flex items-center gap-2 cursor-pointer ${
                            theme === 'dark' ? 'hover:bg-[#333333]' : 'hover:bg-slate-100'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Add Tier Below</span>
                        </button>

                        <div className="h-px bg-inherit opacity-20 my-1" />

                        <button
                          onClick={() => handleClearTier(tier.id)}
                          className={`w-full text-left px-2.5 py-1.5 rounded flex items-center gap-2 cursor-pointer text-amber-400 ${
                            theme === 'dark' ? 'hover:bg-[#333333]' : 'hover:bg-slate-100'
                          }`}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Clear Topics</span>
                        </button>

                        <button
                          onClick={() => handleDeleteTier(tier.id)}
                          className={`w-full text-left px-2.5 py-1.5 rounded flex items-center gap-2 cursor-pointer text-rose-400 ${
                            theme === 'dark' ? 'hover:bg-[#333333]' : 'hover:bg-slate-100'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Tier</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* B. Right Card Tray (Topic Cards Container) */}
                <div
                  className={`flex-1 p-2 flex flex-wrap items-center content-start gap-2 overflow-visible min-h-0 ${
                    theme === 'dark' ? 'bg-[#181818]' : 'bg-[#ffffff]'
                  }`}
                >
                  {items.length === 0 ? (
                    <div className="h-full w-full min-h-[58px] flex items-center justify-center text-slate-500 font-mono text-[11px] border border-dashed border-current/20 rounded p-3 select-none">
                      <span>Drag topics here or use card actions</span>
                    </div>
                  ) : (
                    items.map((item, itemIdx) => {
                      const badge = getSubjectBadge(
                        item.topicContext.subjectCode,
                        item.topicContext.subjectName
                      );

                      return (
                        <div
                          key={item.topicContext.topicId}
                          draggable={true}
                          onDragStart={(e) =>
                            handleDragStart(e, item.topicContext.topicId, tier.id, itemIdx)
                          }
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => {
                            e.preventDefault();
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDropOnTier(e, tier.id, itemIdx);
                          }}
                          className={`group/card relative flex flex-col justify-between p-2.5 sm:p-2 rounded-lg border shadow-xs transition-all cursor-grab active:cursor-grabbing w-full sm:w-44 md:w-48 shrink-0 select-none ${
                            theme === 'dark'
                              ? 'bg-[#222223] hover:bg-[#282829] border-[#363636] hover:border-sky-500/50'
                              : 'bg-white hover:bg-slate-50 border-[#d8d8d8] hover:border-sky-500/50'
                          }`}
                        >
                          {/* Card Top: Subject Badge & Controls */}
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${badge.bg}`}
                            >
                              {badge.label}
                            </span>

                            <div className="flex items-center gap-0.5 opacity-60 group-hover/card:opacity-100 transition-opacity">
                              {/* Reorder Left */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (itemIdx > 0 && activeProfile) {
                                    reorderTopicInTier(
                                      activeProfile.id,
                                      tier.id,
                                      item.topicContext.topicId,
                                      itemIdx - 1
                                    );
                                  }
                                }}
                                disabled={itemIdx === 0}
                                className="p-0.5 rounded hover:bg-black/20 disabled:opacity-20 cursor-pointer"
                                title="Move left within tier"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>

                              {/* Reorder Right */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (itemIdx < items.length - 1 && activeProfile) {
                                    reorderTopicInTier(
                                      activeProfile.id,
                                      tier.id,
                                      item.topicContext.topicId,
                                      itemIdx + 1
                                    );
                                  }
                                }}
                                disabled={itemIdx === items.length - 1}
                                className="p-0.5 rounded hover:bg-black/20 disabled:opacity-20 cursor-pointer"
                                title="Move right within tier"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>

                              {/* Unrank / Remove from tier */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (activeProfile) {
                                    removeTopicFromTier(activeProfile.id, item.topicContext.topicId);
                                  }
                                }}
                                className="p-0.5 rounded hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                                title="Remove from tier (unrank)"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Card Body: Topic Title */}
                          <div
                            className="font-medium text-[11px] leading-tight line-clamp-2 text-inherit mb-1"
                            title={item.topicContext.topicName}
                          >
                            {item.topicContext.topicName}
                          </div>

                          {/* Card Sub: Breadcrumb path */}
                          <div
                            className="text-[9px] text-slate-400 font-mono truncate"
                            title={item.topicContext.path}
                          >
                            {item.topicContext.groupName}
                            {item.topicContext.unitName ? ` › ${item.topicContext.unitName}` : ''}
                          </div>

                          {/* Card Footer: Quick Actions */}
                          <div className="flex items-center justify-between border-t border-inherit/20 pt-1 mt-1.5">
                            {/* Mobile / Click-to-Move dropdown trigger */}
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMoveMenuTopic(
                                    moveMenuTopic?.topicId === item.topicContext.topicId
                                      ? null
                                      : { topicId: item.topicContext.topicId, currentTierId: tier.id }
                                  );
                                }}
                                className="move-menu-trigger px-1 py-0.5 rounded text-[9px] font-medium bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 flex items-center gap-0.5 cursor-pointer"
                                title="Quick move to another tier"
                              >
                                <Move className="w-2.5 h-2.5" />
                                <span>Move</span>
                              </button>

                              {/* Move Popover */}
                              {moveMenuTopic?.topicId === item.topicContext.topicId && (
                                <div
                                  className={`move-menu-popover absolute left-0 bottom-full mb-1 w-36 rounded shadow-xl border z-50 p-1 ${
                                    theme === 'dark'
                                      ? 'bg-[#252526] border-[#3c3c3c]'
                                      : 'bg-white border-[#d0d7de]'
                                  }`}
                                >
                                  <div className="text-[9px] font-semibold opacity-60 px-1 py-0.5">
                                    Send to Tier:
                                  </div>
                                  {tiers.map((t) => (
                                    <button
                                      key={t.id}
                                      onClick={() => {
                                        if (activeProfile) {
                                          assignTopicToTier(
                                            activeProfile.id,
                                            item.topicContext.topicId,
                                            t.id
                                          );
                                        }
                                        setMoveMenuTopic(null);
                                      }}
                                      className={`w-full text-left px-2 py-1 rounded text-[10px] flex items-center justify-between cursor-pointer ${
                                        t.id === tier.id
                                          ? 'font-bold opacity-50'
                                          : theme === 'dark'
                                          ? 'hover:bg-[#333333]'
                                          : 'hover:bg-slate-100'
                                      }`}
                                    >
                                      <span>{t.label}</span>
                                      <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: t.color }}
                                      />
                                    </button>
                                  ))}
                                  <div className="h-px bg-inherit opacity-20 my-0.5" />
                                  <button
                                    onClick={() => {
                                      if (activeProfile) {
                                        removeTopicFromTier(
                                          activeProfile.id,
                                          item.topicContext.topicId
                                        );
                                      }
                                      setMoveMenuTopic(null);
                                    }}
                                    className="w-full text-left px-2 py-1 rounded text-[10px] text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                                  >
                                    Unrank Topic
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              {/* Notes icon */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenNotes(
                                    item.topicContext.topicId,
                                    item.topicContext.topicName,
                                    item.notes
                                  );
                                }}
                                className={`p-0.5 rounded cursor-pointer ${
                                  item.notes
                                    ? 'text-amber-400 bg-amber-400/10'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                                title={item.notes ? `Note: "${item.notes}"` : 'Add note'}
                              >
                                <MessageSquare className="w-3 h-3" />
                              </button>

                              {/* Inspect topic */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInspectTopic(item.topicContext);
                                }}
                                className="p-0.5 rounded text-slate-400 hover:text-sky-400 cursor-pointer"
                                title="Inspect topic details in editor tab"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Quick Ranking Tiles (horizontal 1-tap reassignment or unrank) */}
                          <div className="mt-1.5 pt-1.5 border-t border-inherit/20">
                            <QuickRankTiles
                              topicId={item.topicContext.topicId}
                              topicName={item.topicContext.topicName}
                              size="sm"
                              showLabel={false}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

        {/* Box 2: Collapsible Unranked Curriculum Topics Dropdown Menu */}
        <section
          id="unranked-topics-pool"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setIsDragOverUnranked(true);
          }}
          onDragLeave={() => setIsDragOverUnranked(false)}
          onDrop={handleDropOnUnranked}
          className={`flex flex-col border rounded-lg shadow-sm transition-all duration-200 ${
            theme === 'dark' ? 'bg-[#1e1e1e] border-[#333333]' : 'bg-white border-[#d0d7de]'
          } ${isDragOverUnranked ? 'ring-2 ring-rose-500/80 bg-rose-500/5' : ''}`}
        >
          {/* Unranked Tray Header (Collapsible Dropdown Menu with Single Chevron Toggle) */}
          <header
            onClick={() => setIsUnrankedOpen(!isUnrankedOpen)}
            className={`h-auto min-h-[44px] py-1.5 px-3 sm:px-4 border-b shrink-0 flex flex-wrap items-center justify-between gap-2 cursor-pointer select-none transition-colors overflow-x-auto scrollbar-none ${
              theme === 'dark' ? 'bg-[#222223] hover:bg-[#282829] border-[#2d2d2d]' : 'bg-slate-50 hover:bg-slate-100 border-[#e0e0e0]'
            }`}
            title="Click to toggle unranked topics dropdown menu"
          >
            <div className="flex items-center gap-2 shrink-0">
              <div className="p-1 rounded-md text-slate-400 hover:text-sky-400 transition-colors">
                {isUnrankedOpen ? (
                  <ChevronDown className="w-4 h-4 text-sky-400" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </div>
              <BookOpen className="w-4 h-4 text-sky-400 shrink-0" />
              <h2 className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 text-inherit truncate">
                <span>Unranked Topics Pool</span>
                <span className="text-[11px] text-slate-400 font-mono">
                  · {unrankedTopics.length}
                </span>
              </h2>
            </div>

            {/* Unranked Filter Controls & Quick Add */}
            <div
              className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto flex-wrap"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search input */}
              <div className="relative flex items-center shrink-0">
                <Search className="w-3.5 h-3.5 absolute left-2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter..."
                  value={unrankedSearchQuery}
                  onChange={(e) => setUnrankedSearchQuery(e.target.value)}
                  className={`h-7 pl-6.5 pr-5 py-0.5 rounded-lg text-xs border outline-none w-20 xs:w-28 sm:w-36 transition-all focus:w-28 sm:focus:w-44 ${
                    theme === 'dark'
                      ? 'bg-[#181818] border-[#38383a] text-white focus:border-[#007acc]'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-[#007acc]'
                  }`}
                />
                {unrankedSearchQuery && (
                  <button
                    onClick={() => setUnrankedSearchQuery('')}
                    className="absolute right-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Subject Filter */}
              <select
                value={unrankedSubjectFilter}
                onChange={(e) => {
                  setUnrankedSubjectFilter(e.target.value);
                  setUnrankedGradeFilter('all');
                }}
                className={`text-xs px-1.5 py-1 rounded-lg border outline-none cursor-pointer max-w-[100px] sm:max-w-[140px] truncate shrink-0 ${
                  theme === 'dark'
                    ? 'bg-[#181818] border-[#3c3c3c] text-slate-200'
                    : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                <option value="all">All Subjects</option>
                {curriculumDoc.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              {/* Grade Filter */}
              <select
                value={unrankedGradeFilter}
                onChange={(e) => setUnrankedGradeFilter(e.target.value)}
                className={`text-xs px-1.5 py-1 rounded-lg border outline-none cursor-pointer max-w-[90px] sm:max-w-[120px] truncate shrink-0 ${
                  theme === 'dark'
                    ? 'bg-[#181818] border-[#3c3c3c] text-slate-200'
                    : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                <option value="all">All Grades</option>
                {(() => {
                  const subject =
                    unrankedSubjectFilter !== 'all'
                      ? curriculumDoc.subjects.find((s) => s.id === unrankedSubjectFilter)
                      : null;
                  const availableGroups = subject
                    ? subject.groups && subject.groups.length > 0
                      ? subject.groups
                      : [
                          { id: `${subject.id}-g09`, name: 'Grade 9' },
                          { id: `${subject.id}-g10`, name: 'Grade 10' },
                          { id: `${subject.id}-g11`, name: 'Grade 11' },
                          { id: `${subject.id}-g12`, name: 'Grade 12' },
                        ]
                    : Array.from(
                        new Map(
                          curriculumDoc.subjects
                            .flatMap((s) => s.groups)
                            .map((g) => [g.name, g])
                        ).values()
                      );
                  return availableGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ));
                })()}
              </select>

              {/* Quick Add Topic Button */}
              <button
                onClick={() => setIsQuickAddOpen(true)}
                className="px-2 py-1 rounded text-xs flex items-center gap-1 font-medium bg-[#007acc] hover:bg-[#0062a3] text-white cursor-pointer"
                title="Create a new topic in curriculum"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Topic</span>
              </button>
            </div>
          </header>

          {/* Unranked Tray Content - Expanded directly in page flow */}
          {isUnrankedOpen && (
            <div
              ref={unrankedScrollRef}
              className="p-3"
            >
              {allTopics.length === 0 ? (
                <div className="py-8 text-center flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-400">
                    <FolderTree className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-inherit">Curriculum is Empty</h3>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                      Add topics to the curriculum via Curriculum Explorer, Add Topic button, or AI Import.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setIsQuickAddOpen(true)}
                      className={`px-3 py-1.5 rounded-md font-medium text-xs border cursor-pointer ${
                        theme === 'dark'
                          ? 'bg-[#252526] hover:bg-[#333333] border-[#3c3c3c] text-white'
                          : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
                      }`}
                    >
                      + Add Custom Topic
                    </button>
                  </div>
                </div>
              ) : filteredUnrankedTopics.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs font-mono">
                  {unrankedTopics.length === 0
                    ? '🎉 All curriculum topics have been ranked into tiers!'
                    : 'No unranked topics match your filter criteria.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 p-1">
                  {filteredUnrankedTopics.map((topic) => {
                    const badge = getSubjectBadge(topic.subjectCode, topic.subjectName);

                    return (
                      <div
                        key={topic.topicId}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, topic.topicId, 'unranked')}
                        onDragEnd={handleDragEnd}
                        className={`group/item flex flex-col justify-between p-2 rounded-md border shadow-xs transition-all cursor-grab active:cursor-grabbing select-none ${
                          theme === 'dark'
                            ? 'bg-[#252526] hover:bg-[#2b2b2c] border-[#383838] hover:border-sky-500/60'
                            : 'bg-white hover:bg-slate-50 border-[#d0d7de] hover:border-sky-500/60'
                        }`}
                      >
                        <div>
                          {/* Subject & Grip */}
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${badge.bg}`}
                            >
                              {badge.label}
                            </span>
                            <GripVertical className="w-3 h-3 opacity-30 group-hover/item:opacity-80" />
                          </div>

                          {/* Title */}
                          <div
                            className="font-semibold text-xs leading-tight line-clamp-2 text-inherit mb-1"
                            title={topic.topicName}
                          >
                            {topic.topicName}
                          </div>

                          {/* Context Breadcrumb */}
                          <div
                            className="text-[9px] text-slate-400 font-mono truncate mb-2"
                            title={topic.path}
                          >
                            {topic.groupName} › {topic.unitName || 'Direct'}
                          </div>
                        </div>

                        {/* Quick Placement Bar: Buttons for direct tier placement without drag */}
                        <div className="border-t border-inherit/20 pt-1.5 flex items-center justify-between gap-1">
                          <QuickRankTiles
                            topicId={topic.topicId}
                            topicName={topic.topicName}
                            size="sm"
                            showLabel={true}
                          />

                          <button
                            onClick={() => handleInspectTopic(topic)}
                            className="p-1 rounded text-slate-400 hover:text-sky-400 cursor-pointer shrink-0 ml-auto"
                            title="Inspect in editor"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* 4. Notes Modal Popover */}
      {notesTopicItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-lg shadow-2xl border p-4 animate-in zoom-in-95 duration-150 ${
              theme === 'dark' ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white border-[#d0d7de]'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-inherit mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-sky-400" />
                <h3 className="font-semibold text-sm text-inherit">Study Rationale & Notes</h3>
              </div>
              <button
                onClick={() => setNotesTopicItem(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs font-semibold text-sky-400 mb-2 truncate">
              {notesTopicItem.topicName}
            </p>

            <textarea
              rows={4}
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="Add rationale, revision tips, formulas to memorize, or exam weight notes..."
              className={`w-full p-2.5 rounded border text-xs outline-none resize-none mb-4 ${
                theme === 'dark'
                  ? 'bg-[#181818] border-[#3c3c3c] text-white focus:border-[#007acc]'
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[#007acc]'
              }`}
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setNotesTopicItem(null)}
                className={`px-3 py-1.5 rounded text-xs font-medium cursor-pointer ${
                  theme === 'dark'
                    ? 'hover:bg-[#333333] text-slate-300'
                    : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                className="px-3.5 py-1.5 rounded text-xs font-medium bg-[#007acc] hover:bg-[#0062a3] text-white cursor-pointer shadow-sm"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Quick Add Topic Modal */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleQuickAddSubmit}
            className={`w-full max-w-md rounded-lg shadow-2xl border p-4 space-y-3 animate-in zoom-in-95 duration-150 ${
              theme === 'dark' ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white border-[#d0d7de]'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-inherit">
              <h3 className="font-semibold text-sm text-inherit flex items-center gap-2">
                <Plus className="w-4 h-4 text-sky-400" />
                <span>Add Curriculum Topic</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-medium opacity-80 mb-1">Topic Name *</label>
              <input
                type="text"
                required
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                placeholder="e.g. Calculus: Derivatives & Chain Rule"
                className={`w-full px-2.5 py-1.5 rounded border text-xs outline-none ${
                  theme === 'dark'
                    ? 'bg-[#181818] border-[#3c3c3c] text-white focus:border-[#007acc]'
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[#007acc]'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium opacity-80 mb-1">Subject</label>
                <select
                  value={newTopicSubjectId || (curriculumDoc.subjects[0]?.id || '')}
                  onChange={(e) => {
                    setNewTopicSubjectId(e.target.value);
                    const s = curriculumDoc.subjects.find((sub) => sub.id === e.target.value);
                    if (s && s.groups[0]) setNewTopicGroupId(s.groups[0].id);
                  }}
                  className={`w-full px-2 py-1.5 rounded border text-xs outline-none cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-[#181818] border-[#3c3c3c] text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  {curriculumDoc.subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium opacity-80 mb-1">Grade / Level</label>
                <select
                  value={newTopicGroupId}
                  onChange={(e) => setNewTopicGroupId(e.target.value)}
                  className={`w-full px-2 py-1.5 rounded border text-xs outline-none cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-[#181818] border-[#3c3c3c] text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  {(() => {
                    const sub =
                      curriculumDoc.subjects.find((s) => s.id === (newTopicSubjectId || curriculumDoc.subjects[0]?.id)) ||
                      curriculumDoc.subjects[0];
                    return (sub?.groups || []).map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ));
                  })()}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium opacity-80 mb-1">Description (optional)</label>
              <textarea
                rows={2}
                value={newTopicDesc}
                onChange={(e) => setNewTopicDesc(e.target.value)}
                placeholder="Key concepts, syllabus reference..."
                className={`w-full px-2.5 py-1.5 rounded border text-xs outline-none resize-none ${
                  theme === 'dark'
                    ? 'bg-[#181818] border-[#3c3c3c] text-white focus:border-[#007acc]'
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[#007acc]'
                }`}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(false)}
                className={`px-3 py-1.5 rounded text-xs font-medium cursor-pointer ${
                  theme === 'dark' ? 'hover:bg-[#333333] text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded text-xs font-semibold bg-[#007acc] hover:bg-[#0062a3] text-white cursor-pointer shadow-sm"
              >
                Create Topic
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
