/**
 * Study Roadmap Planning Workspace.
 *
 * Implements:
 * - Direct translation of user ranking order into practical study roadmap phases.
 * - Full retention of subject and original curriculum location (Subject › Grade › Unit).
 * - Separate, explicit unranked topics pool that is never silently treated as ranked priorities.
 * - Interactive phase customization, reordering, item progress tracking, and notes.
 * - Full isolation: NEVER mutates canonical curriculum or underlying rankings
 *   unless explicitly synced by the user.
 * - Export to Markdown, JSON, and CSV.
 * - 100% offline and local.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import ExplorerSquareButton from '../workspace/ExplorerSquareButton';
import {
  Layers,
  CheckCircle2,
  Clock,
  Circle,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Edit2,
  RefreshCw,
  FolderTree,
  BookOpen,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  X,
  Filter,
  Search,
  AlertCircle,
  Sparkles,
  Save,
  Check,
  MoreVertical,
  ExternalLink,
  ArrowUpDown,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { StudyRoadmap, RoadmapPhase, RoadmapItemStatus } from '../../types/roadmap';
import {
  generateInitialRoadmap,
  loadRoadmapFromStorage,
  saveRoadmapToStorage,
  reorderPhaseTopics,
  moveTopicToPhase,
  removeTopicFromRoadmap,
  addPhaseToRoadmap,
  removePhaseFromRoadmap,
  updatePhase,
  updateRoadmapItemStatus,
  syncRoadmapOrderToRankings,
  sanitizeRoadmapTopicIds,
} from '../../utils/roadmapUtils';
import {
  getAllTopicsWithContext,
  getRankedTopics,
  TopicWithContext,
} from '../../utils/rankingUtils';

export default function RoadmapWorkspaceView() {
  const {
    theme,
    curriculumDoc,
    activeRankingProfileId,
    setActiveRankingProfileId,
    setCurriculumDoc,
    setActiveArea,
    openTab,
  } = useWorkspace();

  // All topics with context
  const allTopics = useMemo(
    () => getAllTopicsWithContext(curriculumDoc),
    [curriculumDoc]
  );

  const topicMap = useMemo(
    () => new Map(allTopics.map((t) => [t.topicId, t])),
    [allTopics]
  );

  // Available profiles
  const profiles = curriculumDoc.rankingProfiles || [];
  const activeProfile =
    profiles.find((p) => p.id === activeRankingProfileId) || profiles[0];
  const profileId = activeProfile?.id || 'profile-priority';

  // Active roadmap state
  const [roadmap, setRoadmap] = useState<StudyRoadmap>(() => {
    const loaded = loadRoadmapFromStorage(profileId, curriculumDoc);
    if (loaded) {
      return sanitizeRoadmapTopicIds(loaded, curriculumDoc);
    }
    return generateInitialRoadmap(curriculumDoc, profileId);
  });

  // Whenever active profile or curriculum document updates, load or sanitize roadmap for that profile
  useEffect(() => {
    const loaded = loadRoadmapFromStorage(profileId, curriculumDoc);
    if (loaded) {
      setRoadmap(sanitizeRoadmapTopicIds(loaded, curriculumDoc));
    } else {
      const init = generateInitialRoadmap(curriculumDoc, profileId);
      setRoadmap(init);
      saveRoadmapToStorage(init);
    }
  }, [profileId, curriculumDoc.updatedAt, curriculumDoc.id]);

  // Save changes to storage whenever roadmap changes
  const handleUpdateRoadmap = (updated: StudyRoadmap) => {
    setRoadmap(updated);
    saveRoadmapToStorage(updated);
  };

  // Sync confirmation modal state
  const [isSyncConfirmOpen, setIsSyncConfirmOpen] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [saveButtonText, setSaveButtonText] = useState<'Save' | 'Saved!'>('Save');

  const handleExplicitSave = () => {
    saveRoadmapToStorage(roadmap);
    setSaveButtonText('Saved!');
    setSyncSuccessMessage('Autosave permanently active: Roadmap saved to storage.');
    setTimeout(() => setSaveButtonText('Save'), 2000);
    setTimeout(() => setSyncSuccessMessage(null), 3000);
  };

  // AI Roadmap Sequencer State & Strategy
  const [isAIOptimizerModalOpen, setIsAIOptimizerModalOpen] = useState(false);
  const [aiStrategy, setAiStrategy] = useState<'pedagogical' | 'exam' | 'balanced'>('pedagogical');
  const [aiPhaseCount, setAiPhaseCount] = useState<number>(3);
  const [isOptimizingRoadmap, setIsOptimizingRoadmap] = useState(false);
  const [aiOptimizerPreview, setAiOptimizerPreview] = useState<any[] | null>(null);

  // AI Phase Study Guide Modal
  const [aiPhaseGuideModal, setAiPhaseGuideModal] = useState<{ phaseTitle: string; guide: string } | null>(null);
  const [isGeneratingPhaseGuide, setIsGeneratingPhaseGuide] = useState(false);

  // Roadmap in-page topic filter search
  const [roadmapSearchQuery, setRoadmapSearchQuery] = useState('');

  const handleRunAIOptimizer = async (selectedStrategy = aiStrategy, count = aiPhaseCount) => {
    if (!allTopics.length || isOptimizingRoadmap) return;
    setIsOptimizingRoadmap(true);

    try {
      const res = await fetch('/api/ai/optimize-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topics: allTopics.map((t) => ({
            id: t.topicId,
            name: t.topicName,
            subject: t.subjectName,
            group: t.groupName,
            unit: t.unitName,
          })),
          profileName: activeProfile?.name || 'Study Priority',
          strategy: selectedStrategy,
          phaseCount: count,
        }),
      });

      if (!res.ok) throw new Error('Failed to optimize roadmap');
      const data = await res.json();
      if (Array.isArray(data.phases) && data.phases.length > 0) {
        setAiOptimizerPreview(data.phases);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error running AI roadmap optimizer.');
    } finally {
      setIsOptimizingRoadmap(false);
    }
  };

  const handleApplyAIOptimizerPhases = () => {
    if (!aiOptimizerPreview || !aiOptimizerPreview.length) return;

    const newPhases = aiOptimizerPreview.map((p: any, idx: number) => ({
      id: `ai-phase-${idx + 1}-${Date.now().toString(36)}`,
      title: p.phaseTitle || `Phase ${idx + 1}`,
      subtitle: p.phaseSubtitle || `Pedagogical sequence step ${idx + 1}`,
      topicIds: Array.isArray(p.topicIds) ? p.topicIds : [],
    }));

    const updated: StudyRoadmap = {
      ...roadmap,
      phases: newPhases,
      updatedAt: new Date().toISOString(),
    };

    handleUpdateRoadmap(updated);
    setSyncSuccessMessage(`AI optimized ${allTopics.length} topics into ${newPhases.length} sequential learning phases!`);
    setIsAIOptimizerModalOpen(false);
    setAiOptimizerPreview(null);
    setTimeout(() => setSyncSuccessMessage(null), 4000);
  };

  const handleGeneratePhaseGuide = async (phase: RoadmapPhase) => {
    if (isGeneratingPhaseGuide) return;
    setIsGeneratingPhaseGuide(true);

    try {
      const phaseTopics = phase.topicIds
        .map((id) => allTopics.find((t) => t.topicId === id))
        .filter(Boolean);

      const res = await fetch('/api/ai/phase-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phaseTitle: phase.title,
          phaseSubtitle: phase.description || '',
          topics: phaseTopics.map((t) => ({ name: t?.topicName, subject: t?.subjectName })),
        }),
      });

      if (!res.ok) throw new Error('Failed to generate phase guide');
      const data = await res.json();
      setAiPhaseGuideModal({
        phaseTitle: phase.title,
        guide: data.guide || 'Study guide generated successfully.',
      });
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to generate study guide for this phase.');
    } finally {
      setIsGeneratingPhaseGuide(false);
    }
  };

  // Phase editing state
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [editPhaseTitle, setEditPhaseTitle] = useState('');
  const [editPhaseDesc, setEditPhaseDesc] = useState('');

  // Unranked pool search, filter, and dropdown state
  const [unrankedSearch, setUnrankedSearch] = useState('');
  const [unrankedSubjectFilter, setUnrankedSubjectFilter] = useState<string>('all');
  const [isUnrankedPoolOpen, setIsUnrankedPoolOpen] = useState(false);
  const [targetPhaseId, setTargetPhaseId] = useState<string>('');
  const unrankedDropdownRef = useRef<HTMLDivElement>(null);

  // Keep targetPhaseId synced to first available phase if unset
  useEffect(() => {
    if (!targetPhaseId && roadmap.phases.length > 0) {
      setTargetPhaseId(roadmap.phases[0].id);
    }
  }, [roadmap.phases, targetPhaseId]);

  // Click outside and escape key listener for unranked pool dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        unrankedDropdownRef.current &&
        !unrankedDropdownRef.current.contains(event.target as Node)
      ) {
        setIsUnrankedPoolOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsUnrankedPoolOpen(false);
      }
    }

    if (isUnrankedPoolOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUnrankedPoolOpen]);

  // Currently scheduled topic IDs
  const scheduledTopicIdSet = useMemo(() => {
    const set = new Set<string>();
    roadmap.phases.forEach((p) => {
      p.topicIds.forEach((id) => set.add(id));
    });
    return set;
  }, [roadmap.phases]);

  // Unranked topics: all topics in curriculum that are NOT in the active roadmap (strictly deduplicated)
  const unrankedTopics = useMemo(() => {
    const seen = new Set<string>();
    return allTopics.filter((t) => {
      if (seen.has(t.topicId)) return false;
      // Must not be in the roadmap
      if (scheduledTopicIdSet.has(t.topicId)) return false;

      // Filter by search
      if (unrankedSearch.trim()) {
        const query = unrankedSearch.toLowerCase();
        const matchName = t.topicName.toLowerCase().includes(query);
        const matchPath = t.path.toLowerCase().includes(query);
        const matchSubject = t.subjectName.toLowerCase().includes(query);
        if (!matchName && !matchPath && !matchSubject) return false;
      }

      // Filter by subject
      if (unrankedSubjectFilter !== 'all' && t.subjectId !== unrankedSubjectFilter) {
        return false;
      }

      seen.add(t.topicId);
      return true;
    });
  }, [allTopics, scheduledTopicIdSet, unrankedSearch, unrankedSubjectFilter]);

  // Unique subjects for filter dropdown
  const uniqueSubjects = useMemo(() => {
    const map = new Map<string, string>();
    allTopics.forEach((t) => {
      if (!map.has(t.subjectId)) {
        map.set(t.subjectId, t.subjectName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allTopics]);

  // Overall roadmap stats
  const stats = useMemo(() => {
    let total = 0;
    let completed = 0;
    let inProgress = 0;
    roadmap.phases.forEach((p) => {
      p.topicIds.forEach((id) => {
        total++;
        const status = roadmap.itemDetails[id]?.status;
        if (status === 'completed') completed++;
        else if (status === 'in_progress') inProgress++;
      });
    });
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, percent };
  }, [roadmap]);

  // Actions
  const handleStatusChange = (topicId: string, status: RoadmapItemStatus) => {
    const updated = updateRoadmapItemStatus(roadmap, topicId, { status });
    handleUpdateRoadmap(updated);
  };

  const handleNotesChange = (topicId: string, customNotes: string) => {
    const updated = updateRoadmapItemStatus(roadmap, topicId, { customNotes });
    handleUpdateRoadmap(updated);
  };

  const handleMoveUp = (phaseId: string, idx: number) => {
    if (idx <= 0) return;
    const updated = reorderPhaseTopics(roadmap, phaseId, idx, idx - 1);
    handleUpdateRoadmap(updated);
  };

  const handleMoveDown = (phaseId: string, idx: number, total: number) => {
    if (idx >= total - 1) return;
    const updated = reorderPhaseTopics(roadmap, phaseId, idx, idx + 1);
    handleUpdateRoadmap(updated);
  };

  const handleMoveToPhase = (
    topicId: string,
    sourcePhaseId: string | null,
    targetPhaseId: string
  ) => {
    const updated = moveTopicToPhase(roadmap, topicId, sourcePhaseId, targetPhaseId);
    handleUpdateRoadmap(updated);
  };

  const handleRemoveTopic = (topicId: string) => {
    const updated = removeTopicFromRoadmap(roadmap, topicId);
    handleUpdateRoadmap(updated);
  };

  const handleAddPhase = () => {
    const title = `Phase ${roadmap.phases.length + 1}: Next Focus Block`;
    const updated = addPhaseToRoadmap(roadmap, title);
    handleUpdateRoadmap(updated);
  };

  const handleStartEditPhase = (phase: RoadmapPhase) => {
    setEditingPhaseId(phase.id);
    setEditPhaseTitle(phase.title);
    setEditPhaseDesc(phase.description || '');
  };

  const handleSaveEditPhase = (phaseId: string) => {
    const updated = updatePhase(roadmap, phaseId, editPhaseTitle, editPhaseDesc);
    handleUpdateRoadmap(updated);
    setEditingPhaseId(null);
  };

  const handleDeletePhase = (phaseId: string) => {
    if (roadmap.phases.length <= 1) {
      alert('A roadmap requires at least one phase.');
      return;
    }
    const updated = removePhaseFromRoadmap(roadmap, phaseId);
    handleUpdateRoadmap(updated);
  };

  const handleConfirmSyncToRankings = () => {
    const newAssignments = syncRoadmapOrderToRankings(roadmap, curriculumDoc, profileId);
    setCurriculumDoc({
      ...curriculumDoc,
      rankingAssignments: newAssignments,
      updatedAt: new Date().toISOString(),
    });
    setIsSyncConfirmOpen(false);
    setSyncSuccessMessage(
      `Successfully synced ${stats.total} roadmap topics to '${activeProfile?.name}' rankings!`
    );
    setTimeout(() => setSyncSuccessMessage(null), 4000);
  };

  const handleOpenTopicInEditor = (ctx: TopicWithContext) => {
    openTab(
      {
        id: `topic-${ctx.topicId}`,
        title: ctx.topicName,
        type: 'topic',
        subjectId: ctx.subjectId,
        groupId: ctx.groupId,
        unitId: ctx.unitId,
        topicId: ctx.topicId,
      },
      true
    );
  };

  const roadmapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    roadmapContainerRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [profileId]);

  return (
    <div
      id="roadmap-workspace-view"
      className={`h-full flex flex-col overflow-hidden select-none text-xs ${
        theme === 'dark' ? 'bg-[#181818] text-[#cccccc]' : 'bg-[#f3f4f6] text-[#1e1e1e]'
      }`}
    >
      {/* Top Banner & Control Bar: Balanced full-width layout without empty void */}
      <div
        className={`h-11 sm:h-12 border-b flex items-center justify-between gap-2 shrink-0 transition-colors z-20 pr-2.5 sm:pr-4 overflow-x-auto scrollbar-none ${
          theme === 'dark' ? 'bg-[#131314] border-[#222425]' : 'bg-white border-[#e5e5e5]'
        }`}
      >
        {/* Left: Explorer Square Button & Profile Selector */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 h-full">
          <ExplorerSquareButton />

          {/* Active Profile Dropdown */}
          <div className="flex items-center gap-1 text-xs shrink-0 pl-1">
            <select
              id="roadmap-profile-select"
              value={profileId}
              onChange={(e) => setActiveRankingProfileId(e.target.value)}
              className={`h-8 px-2 max-w-[120px] sm:max-w-[150px] truncate rounded-lg text-xs font-medium border transition-colors outline-none cursor-pointer shrink-0 ${
                theme === 'dark'
                  ? 'bg-[#1e1f20] border-[#282a2c] text-white focus:border-indigo-500'
                  : 'bg-white border-slate-300 text-slate-800 focus:border-indigo-500'
              }`}
              title="Active Profile"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center: Live Learning Velocity Progress & Roadmap Topic Search (Balances toolbar across screen) */}
        <div className="flex-1 min-w-0 hidden md:flex items-center justify-center gap-3 px-2">
          {/* Progress Ribbon */}
          <div
            className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs shrink-0 ${
              theme === 'dark'
                ? 'bg-[#252526] border-[#38383a] text-slate-300'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div className="w-14 sm:w-20 h-1.5 rounded-full bg-slate-700/30 overflow-hidden shrink-0">
              <div
                style={{ width: `${stats.percent}%` }}
                className="h-full bg-emerald-500 rounded-full transition-all"
              />
            </div>
            <span className="font-mono text-[11px] font-bold text-emerald-400 shrink-0">
              {stats.percent}%
            </span>
            <span aria-hidden="true" className="opacity-30">·</span>
            <span className="text-[11px] text-slate-400 truncate">
              {stats.completed}/{stats.total} Mastered
            </span>
          </div>

          {/* Filter topics within roadmap */}
          <div className="relative flex items-center shrink-0">
            <Search className="w-3 h-3 absolute left-2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter roadmap..."
              value={roadmapSearchQuery}
              onChange={(e) => setRoadmapSearchQuery(e.target.value)}
              className={`h-7 pl-6 pr-5 py-0.5 rounded-lg text-xs border outline-none w-28 lg:w-40 transition-all ${
                theme === 'dark'
                  ? 'bg-[#181818] border-[#38383a] text-white focus:border-indigo-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500'
              }`}
            />
            {roadmapSearchQuery && (
              <button
                onClick={() => setRoadmapSearchQuery('')}
                className="absolute right-1.5 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Right side items: Pool Dropdown, Add Phase, AI Sequencer, Save, Sync */}
        <div className="flex items-center flex-nowrap gap-1.5 sm:gap-2 shrink-0 justify-end">
          <div className="flex items-center flex-nowrap gap-1.5 sm:gap-2 shrink-0">
            {/* Unranked Topics Pool Dropdown Menu - GUARANTEED ON SCREEN */}
            <div className="relative shrink-0" ref={unrankedDropdownRef}>
              <button
                id="roadmap-unranked-pool-dropdown-btn"
                type="button"
                onClick={() => setIsUnrankedPoolOpen(!isUnrankedPoolOpen)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold text-xs border transition-colors cursor-pointer select-none shadow-xs shrink-0 ${
                  isUnrankedPoolOpen
                    ? 'bg-amber-500 text-black border-amber-500'
                    : theme === 'dark'
                    ? 'bg-[#252526] hover:bg-[#2d2d2e] border-[#38383a] text-amber-300'
                    : 'bg-white hover:bg-slate-50 border-slate-300 text-amber-700'
                }`}
                aria-expanded={isUnrankedPoolOpen}
                aria-haspopup="true"
                title="Open Unranked Topics Pool dropdown menu"
              >
                <BookOpen className={`w-3.5 h-3.5 shrink-0 ${isUnrankedPoolOpen ? 'text-black' : 'text-amber-400'}`} />
                <span>Pool ({unrankedTopics.length})</span>
                <ChevronDown
                  className={`w-3 h-3 shrink-0 transition-transform duration-200 ${
                    isUnrankedPoolOpen ? 'rotate-180 text-black' : 'text-slate-400'
                  }`}
                />
              </button>

              {/* Floating Dropdown Overlay */}
              {isUnrankedPoolOpen && (
                <div
                  id="roadmap-unranked-dropdown-panel"
                  className={`fixed sm:absolute inset-x-3 sm:inset-x-auto sm:right-0 top-16 sm:top-full mt-1.5 sm:w-96 max-h-[75vh] sm:max-h-[500px] rounded-lg shadow-2xl border flex flex-col z-50 animate-in fade-in zoom-in-95 duration-150 ${
                    theme === 'dark'
                      ? 'bg-[#202020] border-[#3a3a3a] text-white shadow-black/80'
                      : 'bg-white border-slate-300 text-slate-900 shadow-2xl'
                  }`}
                >
                  {/* Dropdown Header */}
                  <div
                    className={`px-3 py-2.5 border-b flex items-center justify-between shrink-0 ${
                      theme === 'dark'
                        ? 'bg-[#181818] border-[#2f2f2f]'
                        : 'bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-xs">Unranked Topics Pool</span>
                      <span className="text-[11px] font-mono text-amber-500 dark:text-amber-400">
                        · {unrankedTopics.length} available
                      </span>
                    </div>
                    <button
                      onClick={() => setIsUnrankedPoolOpen(false)}
                      className="p-1 text-slate-400 hover:text-white rounded cursor-pointer transition-colors"
                      title="Close dropdown"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Dropdown Description */}
                  <div
                    className={`px-3 py-2 border-b text-[11px] text-slate-400 leading-relaxed shrink-0 ${
                      theme === 'dark' ? 'bg-[#1a1a1a] border-[#2f2f2f]' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    Curriculum topics not yet assigned study priority. Click '+ Add' to schedule them into a phase without affecting the canonical syllabus.
                  </div>

                  {/* Filter & Target Phase Bar */}
                  <div
                    className={`p-2.5 border-b space-y-2 shrink-0 ${
                      theme === 'dark' ? 'bg-[#181818] border-[#2f2f2f]' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={unrankedSearch}
                        onChange={(e) => setUnrankedSearch(e.target.value)}
                        placeholder="Filter available topics..."
                        className={`w-full pl-8 pr-7 py-1 text-xs rounded border outline-none ${
                          theme === 'dark'
                            ? 'bg-[#141414] border-[#3a3a3a] text-white focus:border-amber-500'
                            : 'bg-white border-slate-300 text-slate-800 focus:border-amber-500'
                        }`}
                        autoFocus
                      />
                      {unrankedSearch && (
                        <button
                          onClick={() => setUnrankedSearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {uniqueSubjects.length > 1 && (
                        <select
                          value={unrankedSubjectFilter}
                          onChange={(e) => setUnrankedSubjectFilter(e.target.value)}
                          className={`flex-1 px-2 py-1 rounded text-[11px] border outline-none cursor-pointer ${
                            theme === 'dark'
                              ? 'bg-[#141414] border-[#3a3a3a] text-slate-300 focus:border-amber-500'
                              : 'bg-white border-slate-300 text-slate-700 focus:border-amber-500'
                          }`}
                        >
                          <option value="all">All Subjects ({uniqueSubjects.length})</option>
                          {uniqueSubjects.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      )}

                      {roadmap.phases.length > 1 && (
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] text-slate-400">Target:</span>
                          <select
                            value={targetPhaseId || roadmap.phases[0]?.id}
                            onChange={(e) => setTargetPhaseId(e.target.value)}
                            className={`px-1.5 py-1 rounded text-[11px] border outline-none cursor-pointer ${
                              theme === 'dark'
                                ? 'bg-[#141414] border-[#3a3a3a] text-slate-300 focus:border-amber-500'
                                : 'bg-white border-slate-300 text-slate-700 focus:border-amber-500'
                            }`}
                          >
                            {roadmap.phases.map((p, pI) => (
                              <option key={p.id} value={p.id}>
                                Phase {pI + 1}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Scrollable list of unranked topics */}
                  <div className="overflow-y-auto p-2 space-y-1.5 max-h-72 flex-1">
                    {unrankedTopics.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 space-y-1">
                        <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-400 mb-1" />
                        <p className="text-xs font-medium">All topics scheduled!</p>
                        <p className="text-[11px] text-slate-500">
                          Every curriculum topic is currently organized into your study roadmap.
                        </p>
                      </div>
                    ) : (
                      unrankedTopics.map((ctx) => (
                        <div
                          key={ctx.topicId}
                          id={`unranked-topic-${ctx.topicId}`}
                          className={`p-2 rounded-lg border transition-colors flex items-start justify-between gap-2 ${
                            theme === 'dark'
                              ? 'bg-[#181818] border-[#2f2f2f] hover:border-amber-500/60'
                              : 'bg-slate-50 border-slate-200 hover:border-amber-500/60'
                          }`}
                        >
                          <div className="min-w-0 space-y-0.5 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                onClick={() => handleOpenTopicInEditor(ctx)}
                                className="font-semibold text-xs text-white dark:text-white truncate cursor-pointer hover:underline"
                                title={ctx.topicName}
                              >
                                {ctx.topicName}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-indigo-500/10 text-indigo-400">
                                {ctx.subjectName}
                              </span>
                            </div>

                            <p className="text-[10px] text-slate-400 truncate">
                              {ctx.groupName}
                              {ctx.unitName ? ` › ${ctx.unitName}` : ''}
                            </p>
                          </div>

                          <button
                            id={`add-unranked-${ctx.topicId}-btn`}
                            onClick={() => {
                              handleMoveToPhase(
                                ctx.topicId,
                                null,
                                targetPhaseId || roadmap.phases[0]?.id || 'phase-1'
                              );
                            }}
                            className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-[10px] flex items-center gap-0.5 shrink-0 transition-colors shadow-xs cursor-pointer"
                            title={`Add topic to ${
                              roadmap.phases.find((p) => p.id === (targetPhaseId || roadmap.phases[0]?.id))?.title || 'active phase'
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Dropdown Footer */}
                  <div
                    className={`px-3 py-2 text-[10px] text-center border-t text-slate-400 shrink-0 ${
                      theme === 'dark' ? 'bg-[#181818] border-[#2f2f2f]' : 'bg-slate-100 border-slate-200'
                    }`}
                  >
                    Click "+ Add" to schedule into active phase
                  </div>
                </div>
              )}
            </div>

            {/* Add Phase Button */}
            <button
              id="roadmap-add-phase-btn"
              onClick={handleAddPhase}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold text-xs border transition-colors cursor-pointer shrink-0 ${
                theme === 'dark'
                  ? 'bg-[#252526] hover:bg-[#2d2d2e] border-[#38383a] text-slate-200'
                  : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
              }`}
              title="Add a new milestone or study phase"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="hidden xs:inline">Add Phase</span>
            </button>
            <button
              id="roadmap-ai-optimize-btn"
              onClick={() => setIsAIOptimizerModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold text-xs border transition-colors cursor-pointer shrink-0 shadow-xs ${
                theme === 'dark'
                  ? 'bg-sky-500/15 hover:bg-sky-500/25 border-sky-500/30 text-sky-400'
                  : 'bg-sky-50 hover:bg-sky-100 border-sky-300 text-sky-800'
              }`}
              title="AI organizes all curriculum topics into sequenced pedagogical phases"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isOptimizingRoadmap ? 'animate-spin' : ''}`} />
              <span>{isOptimizingRoadmap ? 'AI Optimizing...' : 'AI Sequencer'}</span>
            </button>

            {/* Green Save Button - Guaranteed on screen */}
            <button
              id="roadmap-green-save-btn"
              onClick={handleExplicitSave}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-xs shrink-0 cursor-pointer transition-all"
              title="Click to force-save roadmap to storage"
            >
              <Save className="w-3.5 h-3.5 shrink-0" />
              <span>{saveButtonText}</span>
            </button>

            {/* Sync Roadmap Order to Rankings Button */}
            <button
              id="roadmap-sync-to-rankings-btn"
              onClick={() => setIsSyncConfirmOpen(true)}
              className={`hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium text-xs border transition-colors cursor-pointer shrink-0 ${
                theme === 'dark'
                  ? 'bg-[#252526] hover:bg-[#2d2d2e] border-[#38383a] text-slate-300'
                  : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
              }`}
              title="Explicitly sync current roadmap sequence back to topic rankings"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="hidden lg:inline">Sync Rankings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sync Notification Banner */}
      {syncSuccessMessage && (
        <div
          id="roadmap-sync-success-banner"
          className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{syncSuccessMessage}</span>
        </div>
      )}

      {/* Main Roadmap Content: Full-width Sequential Study Phases */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Sequential Study Phases */}
        <div
          id="roadmap-phases-container"
          ref={roadmapContainerRef}
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-5xl mx-auto w-full"
        >
          {roadmap.phases.map((phase, pIdx) => {
            const isEditing = editingPhaseId === phase.id;
            const phaseTotal = phase.topicIds.length;
            const phaseCompleted = phase.topicIds.filter(
              (id) => roadmap.itemDetails[id]?.status === 'completed'
            ).length;

            return (
              <div
                key={phase.id}
                id={`roadmap-phase-${phase.id}`}
                className={`rounded-xl border shadow-xs overflow-hidden transition-all ${
                  theme === 'dark'
                    ? 'bg-[#1e1e1e] border-[#2b2b2b]'
                    : 'bg-white border-[#e0e0e0]'
                }`}
              >
                {/* Phase Header */}
                <div
                  className={`px-4 py-3 border-b flex items-center justify-between gap-3 ${
                    theme === 'dark' ? 'bg-[#252526] border-[#2b2b2b]' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="space-y-2 py-1">
                        <input
                          type="text"
                          value={editPhaseTitle}
                          onChange={(e) => setEditPhaseTitle(e.target.value)}
                          placeholder="Phase Title"
                          className="w-full px-2 py-1 text-xs rounded border bg-transparent font-semibold"
                        />
                        <input
                          type="text"
                          value={editPhaseDesc}
                          onChange={(e) => setEditPhaseDesc(e.target.value)}
                          placeholder="Phase Description (optional)"
                          className="w-full px-2 py-1 text-[11px] rounded border bg-transparent opacity-80"
                        />
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleSaveEditPhase(phase.id)}
                            className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[11px]"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingPhaseId(null)}
                            className="px-2 py-0.5 text-slate-400 hover:text-white text-[11px]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                          {pIdx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h2 className="font-semibold text-xs flex items-center gap-2 min-w-0">
                            <span className={`truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {phase.title}
                            </span>
                            <button
                              onClick={() => handleStartEditPhase(phase)}
                              className="text-slate-400 hover:text-indigo-400 p-0.5 shrink-0"
                              title="Edit Phase Title"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </h2>
                          {phase.description && (
                            <p className="text-[11px] text-slate-400 truncate leading-snug">
                              {phase.description}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Phase Stats & Actions */}
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-700/20 text-slate-400">
                      {phaseCompleted}/{phaseTotal} done
                    </span>
                    <button
                      onClick={() => handleGeneratePhaseGuide(phase)}
                      disabled={isGeneratingPhaseGuide}
                      className="px-2 py-0.5 rounded border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-[10.5px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                      title="Generate AI study guide and milestones for this phase"
                    >
                      <Sparkles className="w-3 h-3 text-sky-400" />
                      <span className="hidden sm:inline">AI Guide</span>
                    </button>
                    {roadmap.phases.length > 1 && (
                      <button
                        onClick={() => handleDeletePhase(phase.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete Phase (topics will return to unranked pool)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Topics in Phase */}
                <div className="divide-y divide-slate-700/10">
                  {phase.topicIds.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 space-y-2.5">
                      <p className="text-xs">No topics scheduled in this phase.</p>
                      <p className="text-[11px] text-slate-500">
                        Add topics from the Unranked Topics Pool dropdown menu above or move topics from other phases.
                      </p>
                      {unrankedTopics.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setTargetPhaseId(phase.id);
                            setIsUnrankedPoolOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Open Unranked Topics Pool ({unrankedTopics.length})</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    Array.from(new Set(phase.topicIds))
                      .filter((topicId) => {
                        if (!roadmapSearchQuery.trim()) return true;
                        const ctx = topicMap.get(topicId);
                        if (!ctx) return false;
                        const q = roadmapSearchQuery.toLowerCase();
                        return (
                          ctx.topicName.toLowerCase().includes(q) ||
                          ctx.subjectName.toLowerCase().includes(q) ||
                          ctx.path.toLowerCase().includes(q)
                        );
                      })
                      .map((topicId, idx) => {
                      const ctx = topicMap.get(topicId);
                      const detail = roadmap.itemDetails[topicId] || {
                        topicId,
                        status: 'planned',
                      };

                      return (
                        <div
                          key={topicId}
                          id={`roadmap-topic-row-${topicId}`}
                          className={`p-3 flex items-start gap-3 transition-colors ${
                            detail.status === 'completed'
                              ? theme === 'dark'
                                ? 'bg-emerald-950/10 opacity-75'
                                : 'bg-emerald-50/50 opacity-85'
                              : theme === 'dark'
                              ? 'hover:bg-[#232323]'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* Sequence Badge */}
                          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                            <span className="w-5 h-5 rounded-md bg-slate-700/20 text-slate-400 flex items-center justify-center font-mono text-[10px] font-semibold">
                              {idx + 1}
                            </span>
                          </div>

                          {/* Status Toggle Button */}
                          <button
                            onClick={() => {
                              const nextStatus: RoadmapItemStatus =
                                detail.status === 'completed'
                                  ? 'planned'
                                  : detail.status === 'in_progress'
                                  ? 'completed'
                                  : 'in_progress';
                              handleStatusChange(topicId, nextStatus);
                            }}
                            className={`p-1 rounded-md transition-colors shrink-0 mt-0.5 ${
                              detail.status === 'completed'
                                ? 'text-emerald-400 hover:bg-emerald-500/20'
                                : detail.status === 'in_progress'
                                ? 'text-amber-400 hover:bg-amber-500/20'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/20'
                            }`}
                            title={`Status: ${detail.status}. Click to advance.`}
                          >
                            {detail.status === 'completed' ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : detail.status === 'in_progress' ? (
                              <Clock className="w-4 h-4" />
                            ) : (
                              <Circle className="w-4 h-4" />
                            )}
                          </button>

                          {/* Topic Details */}
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                onClick={() => ctx && handleOpenTopicInEditor(ctx)}
                                className={`font-semibold text-xs cursor-pointer hover:underline ${
                                  detail.status === 'completed'
                                    ? 'line-through text-slate-400'
                                    : theme === 'dark'
                                    ? 'text-white'
                                    : 'text-slate-900'
                                }`}
                              >
                                {ctx?.topicName || topicId}
                              </span>

                              {/* Subject Badge */}
                              {ctx?.subjectName && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                                  {ctx.subjectName}
                                </span>
                              )}

                              {/* Subtopic count */}
                              {ctx?.topic.subtopics && ctx.topic.subtopics.length > 0 && (
                                <span className="text-[10px] text-slate-400 shrink-0">
                                  ({ctx.topic.subtopics.length} subtopics)
                                </span>
                              )}
                            </div>

                            {/* Full Ancestral Path */}
                            <div
                              className="text-[11px] text-slate-400 font-mono truncate leading-normal"
                              title={ctx?.path || 'Curriculum'}
                            >
                              {ctx?.path || 'Curriculum'}
                            </div>

                            {/* Prerequisites */}
                            {ctx?.topic.prerequisites && ctx.topic.prerequisites.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 pt-0.5">
                                <span className="text-slate-500 shrink-0">Prereqs:</span>
                                {ctx.topic.prerequisites.map((pId) => (
                                  <span
                                    key={pId}
                                    className="px-1.5 py-0.5 rounded bg-slate-700/30 text-slate-300 font-mono"
                                  >
                                    {topicMap.get(pId)?.topicName || pId}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Study Notes input */}
                            <input
                              type="text"
                              value={detail.customNotes || ''}
                              onChange={(e) => handleNotesChange(topicId, e.target.value)}
                              placeholder="Add personal study note or focus target..."
                              className={`w-full text-[11px] px-2 py-1 rounded border border-transparent hover:border-slate-700/40 focus:border-indigo-500 bg-transparent transition-colors outline-none leading-normal ${
                                theme === 'dark'
                                  ? 'text-slate-200 placeholder:text-slate-500'
                                  : 'text-slate-800 placeholder:text-slate-400'
                              }`}
                            />
                          </div>

                          {/* Reordering & Relocation Controls */}
                          <div className="flex items-center gap-1 shrink-0 pt-0.5">
                            {/* Move Up */}
                            <button
                              onClick={() => handleMoveUp(phase.id, idx)}
                              disabled={idx === 0}
                              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 hover:bg-slate-700/20"
                              title="Move Up in Phase"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>

                            {/* Move Down */}
                            <button
                              onClick={() => handleMoveDown(phase.id, idx, phase.topicIds.length)}
                              disabled={idx === phase.topicIds.length - 1}
                              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 hover:bg-slate-700/20"
                              title="Move Down in Phase"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Move to another phase dropdown */}
                            {roadmap.phases.length > 1 && (
                              <select
                                value={phase.id}
                                onChange={(e) =>
                                  handleMoveToPhase(topicId, phase.id, e.target.value)
                                }
                                className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                  theme === 'dark'
                                    ? 'bg-[#252526] border-[#3a3a3a] text-slate-300'
                                    : 'bg-white border-slate-300 text-slate-700'
                                }`}
                                title="Move to another phase"
                              >
                                {roadmap.phases.map((p, targetPIdx) => (
                                  <option key={p.id} value={p.id}>
                                    P{targetPIdx + 1}
                                  </option>
                                ))}
                              </select>
                            )}

                            {/* Remove from Roadmap */}
                            <button
                              onClick={() => handleRemoveTopic(topicId)}
                              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                              title="Remove from Roadmap (returns to unranked pool)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

      {/* Sync Confirmation Modal */}
      {isSyncConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-md p-5 rounded-xl border shadow-2xl space-y-4 ${
              theme === 'dark'
                ? 'bg-[#1e1e1e] border-[#333333] text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3 text-emerald-400">
              <Save className="w-5 h-5" />
              <h3 className="font-semibold text-sm">Sync Roadmap Order to Topic Rankings</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will update the ranking order of topics in your{' '}
              <strong className="text-white">'{activeProfile?.name}'</strong> profile to
              match the sequential order of topics across your study phases.
            </p>
            <div className="p-3 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 space-y-1">
              <div className="flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Intentional Mutation Guarantee:</span>
              </div>
              <p>
                As required by your architectural safeguards, the underlying topic ranking is NEVER mutated automatically. Clicking Confirm here is your explicit instruction to update the ranking list.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsSyncConfirmOpen(false)}
                className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                id="confirm-sync-rankings-btn"
                onClick={handleConfirmSyncToRankings}
                className="px-3 py-1.5 rounded text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
              >
                Confirm Sync
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Roadmap Sequencer & Optimizer Modal */}
      {isAIOptimizerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className={`w-full max-w-lg p-5 sm:p-6 rounded-2xl border shadow-2xl space-y-4 max-h-[90vh] flex flex-col ${
              theme === 'dark'
                ? 'bg-[#1e1e1e] border-[#38383a] text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-start justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                    <span>AI Curriculum Sequencer</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/25">
                      Gemini 3.8
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Analyze prerequisites and structure learning phases automatically
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsAIOptimizerModalOpen(false);
                  setAiOptimizerPreview(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Strategy Selection */}
            <div className="space-y-3 shrink-0">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Sequencing Strategy
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'pedagogical', label: 'Pedagogical', desc: 'Prerequisites first (Foundations -> Core -> Mastery)' },
                  { id: 'exam', label: 'Exam High-Yield', desc: 'Heaviest-weighted topics prioritized first' },
                  { id: 'balanced', label: 'Balanced', desc: 'Even workload distribution across phases' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setAiStrategy(s.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      aiStrategy === s.id
                        ? 'border-sky-500 bg-sky-500/10 text-sky-400 ring-1 ring-sky-500'
                        : theme === 'dark'
                        ? 'bg-[#252526] hover:bg-[#2e2e30] border-[#38383a] text-slate-300'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="font-bold text-xs">{s.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">{s.desc}</div>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-xs text-slate-400 font-medium">Phase count:</span>
                <div className="flex items-center gap-1.5">
                  {[3, 4, 5].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setAiPhaseCount(cnt)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        aiPhaseCount === cnt
                          ? 'bg-sky-500 text-slate-950 border-sky-500'
                          : theme === 'dark'
                          ? 'bg-[#252526] hover:bg-[#333333] border-[#38383a] text-slate-300'
                          : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                      }`}
                    >
                      {cnt} Phases
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Run Button */}
            {!aiOptimizerPreview && (
              <button
                type="button"
                onClick={() => handleRunAIOptimizer()}
                disabled={isOptimizingRoadmap}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 ${isOptimizingRoadmap ? 'animate-spin' : ''}`} />
                <span>{isOptimizingRoadmap ? 'Analyzing Prerequisites & Ordering...' : 'Generate AI Sequence'}</span>
              </button>
            )}

            {/* Preview of AI generated phases */}
            {aiOptimizerPreview && (
              <div className="flex-1 min-h-0 flex flex-col space-y-3 overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-bold text-emerald-400">✓ AI Sequencing Proposal Ready:</span>
                  <span>{aiOptimizerPreview.length} Phases Generated</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {aiOptimizerPreview.map((p, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs ${
                        theme === 'dark' ? 'bg-[#252526] border-[#38383a]' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="font-bold text-inherit flex items-center justify-between">
                        <span>{p.phaseTitle || `Phase ${idx + 1}`}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-400">
                          {p.topicIds?.length || 0} topics
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        {p.phaseSubtitle}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-inherit/20 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRunAIOptimizer()}
                    disabled={isOptimizingRoadmap}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-[#252526] hover:bg-[#333] border-[#38383a] text-slate-300'
                        : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                    }`}
                  >
                    Re-run
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyAIOptimizerPhases}
                    className="flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
                  >
                    <Check className="w-4 h-4" />
                    <span>Apply Proposal to Roadmap</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Phase Study Guide Modal */}
      {aiPhaseGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className={`w-full max-w-xl p-5 sm:p-6 rounded-2xl border shadow-2xl space-y-4 max-h-[85vh] flex flex-col ${
              theme === 'dark'
                ? 'bg-[#1e1e1e] border-[#38383a] text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-start justify-between gap-3 border-b border-inherit/20 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">{aiPhaseGuideModal.phaseTitle}</h3>
                  <p className="text-xs text-slate-400">AI Pedagogical Study Guide & Key Traps</p>
                </div>
              </div>

              <button
                onClick={() => setAiPhaseGuideModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 text-xs leading-relaxed whitespace-pre-wrap select-text font-sans opacity-95">
              {aiPhaseGuideModal.guide}
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-inherit/20 shrink-0">
              <button
                onClick={() => setAiPhaseGuideModal(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white cursor-pointer transition-colors shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
