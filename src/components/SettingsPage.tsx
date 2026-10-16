import React, { useState, useMemo, useRef, useEffect } from 'react';
import ExplorerSquareButton from './workspace/ExplorerSquareButton';
import {
  Sun,
  Moon,
  Sliders,
  Maximize2,
  Minimize2,
  RotateCcw,
  Download,
  Copy,
  Check,
  FileCode,
  FileSpreadsheet,
  FileText,
  Sparkles,
  Layers,
  Brain,
  CheckCircle2,
  HardDrive,
  Award,
  Activity,
  Database,
  ShieldCheck,
  CheckCircle,
  Plus,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  ExportFormatType,
  generateAIRoadmapJson,
  generateRankedCurriculumJson,
  generateRankedCurriculumCsv,
  generateFlatRankingCsv,
  generateAIPromptWithPayload,
  downloadFile as downloadExportFile,
} from '../utils/rankingExportUtils';
import {
  exportRoadmapMarkdown,
  exportRoadmapJson,
  exportRoadmapCsv,
  loadRoadmapFromStorage,
  generateInitialRoadmap,
} from '../utils/roadmapUtils';
import { TIER_PRESETS } from '../utils/rankingUtils';
import { TierListIcon, SettingsIcon, ImportIcon } from './workspace/ActivityBar';

export default function SettingsPage() {
  const {
    theme,
    setTheme,
    appScale,
    setAppScale,
    activityBarIconSize,
    setActivityBarIconSize,
    activityBarIconSizes,
    setIndividualActivityBarIconSize,
    resetActivityBarIconSizes,
    selectedTierPresetId,
    applyTierPreset,
    curriculumDoc,
    setCurriculumDoc,
    activeRankingProfileId,
    flashcards,
    deckStats,
    reviewLogs,
  } = useWorkspace();

  // Custom Tier Creation state
  const [newTierLabel, setNewTierLabel] = useState('');
  const [newTierColor, setNewTierColor] = useState('#60a5fa');
  const [tierAddedSuccess, setTierAddedSuccess] = useState<string | null>(null);

  // Copy Tier Summary state (moved from ranking workspace)
  const [copiedTierSummary, setCopiedTierSummary] = useState(false);

  // AI Knowledge Gap & Diagnostics state (moved from AI page)
  const [isAnalyzingGaps, setIsAnalyzingGaps] = useState(false);
  const [gapAnalysisText, setGapAnalysisText] = useState<string | null>(null);
  const [gapAnalysisError, setGapAnalysisError] = useState<string | null>(null);

  const handleAddNewTier = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newTierLabel.trim() || !activeProfile) return;

    const trimmedLabel = newTierLabel.trim();
    const cleanId = `tier-custom-${Date.now().toString(36)}`;
    const existingTiers = activeProfile.tiers || [];
    const newTier = {
      id: cleanId,
      label: trimmedLabel,
      order: existingTiers.length + 1,
      color: newTierColor,
      description: `Custom ${trimmedLabel} tier`,
    };

    const updatedProfiles = (curriculumDoc.rankingProfiles || []).map((p) => {
      if (p.id === activeProfile.id) {
        return {
          ...p,
          tiers: [...existingTiers, newTier],
        };
      }
      return p;
    });

    setCurriculumDoc({
      ...curriculumDoc,
      rankingProfiles: updatedProfiles,
      updatedAt: new Date().toISOString(),
    });

    setTierAddedSuccess(`Added '${trimmedLabel}' tier successfully!`);
    setNewTierLabel('');
    setTimeout(() => setTierAddedSuccess(null), 3000);
  };

  const activeProfile = useMemo(() => {
    return (
      curriculumDoc.rankingProfiles?.find((p) => p.id === activeRankingProfileId) ||
      curriculumDoc.rankingProfiles?.find((p) => p.type === 'tier') ||
      curriculumDoc.rankingProfiles?.[0]
    );
  }, [curriculumDoc.rankingProfiles, activeRankingProfileId]);

  const roadmap = useMemo(() => {
    return (
      loadRoadmapFromStorage(activeProfile?.id || 'profile-tier-list', curriculumDoc) ||
      generateInitialRoadmap(curriculumDoc, activeProfile?.id || 'profile-tier-list')
    );
  }, [curriculumDoc, activeProfile]);

  // Quick text summary copy for tier rankings (Moved from ranking page)
  const handleCopyTierSummary = () => {
    if (!activeProfile) return;
    const lines = [`=== ${activeProfile.name} Tier List Summary ===`];
    const tiers = activeProfile.tiers || [];
    const assignmentMap = new Map<string, string>();
    (curriculumDoc.rankingAssignments || []).forEach((a) => {
      if (a.rankingProfileId === activeProfile.id && a.rank) {
        assignmentMap.set(a.itemId, a.rank);
      }
    });

    const topicsByTier = new Map<string, string[]>();
    tiers.forEach((t) => topicsByTier.set(t.id, []));
    let unrankedCount = 0;

    curriculumDoc.subjects?.forEach((s) => {
      s.groups?.forEach((g) => {
        g.units?.forEach((u) => {
          u.topics?.forEach((t) => {
            const tierId = assignmentMap.get(t.id);
            if (tierId && topicsByTier.has(tierId)) {
              topicsByTier.get(tierId)!.push(t.name);
            } else {
              unrankedCount++;
            }
          });
        });
        g.directTopics?.forEach((t) => {
          const tierId = assignmentMap.get(t.id);
          if (tierId && topicsByTier.has(tierId)) {
            topicsByTier.get(tierId)!.push(t.name);
          } else {
            unrankedCount++;
          }
        });
      });
    });

    tiers.forEach((tier) => {
      const names = topicsByTier.get(tier.id) || [];
      lines.push(`[${tier.label}]: ${names.length > 0 ? names.join(', ') : '(empty)'}`);
    });
    lines.push(`\nUnranked: ${unrankedCount} topics`);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedTierSummary(true);
    setTimeout(() => setCopiedTierSummary(false), 2000);
  };

  // Run AI Study Diagnostics & Knowledge Gap Analysis
  const handleRunDiagnostics = async () => {
    setIsAnalyzingGaps(true);
    setGapAnalysisText(null);
    setGapAnalysisError(null);

    const weakCardTopics = flashcards
      .filter((c) => c.lapses > 0)
      .map((c) => c.topicName || c.topicId);
    const uniqueWeakTopics = Array.from(new Set(weakCardTopics)).slice(0, 5);

    const topicNames: string[] = [];
    curriculumDoc.subjects?.forEach((s) => {
      s.groups?.forEach((g) => {
        g.units?.forEach((u) => u.topics?.forEach((t) => topicNames.push(t.name)));
        g.directTopics?.forEach((t) => topicNames.push(t.name));
      });
    });

    try {
      const res = await fetch('/api/ai/analyze-gaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stats: deckStats,
          weakTopics: uniqueWeakTopics,
          topicsSummary: topicNames.slice(0, 10),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || 'Failed to analyze study gaps');
      }
      const data = await res.json();
      setGapAnalysisText(data.analysis || 'Diagnostics completed successfully.');
    } catch (err: any) {
      console.error(err);
      setGapAnalysisError(err.message || 'Error running diagnostics. Please try again.');
    } finally {
      setIsAnalyzingGaps(false);
    }
  };

  // Tab navigation state
  const [activeTab, setActiveTab] = useState<'appearance' | 'export' | 'system'>('appearance');

  // Export state
  const [exportScope, setExportScope] = useState<'ranking' | 'roadmap' | 'backup'>('ranking');
  const [rankingFormat, setRankingFormat] = useState<ExportFormatType>('ai_roadmap_json');
  const [roadmapFormat, setRoadmapFormat] = useState<'markdown' | 'json' | 'csv'>('markdown');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [includeUnranked, setIncludeUnranked] = useState<boolean>(true);
  const [copiedStatus, setCopiedStatus] = useState<boolean>(false);

  // Quick scale presets
  const scalePresets = [
    { label: 'Compact', value: 75, tag: 'Dense layout' },
    { label: 'Small', value: 85, tag: 'More screen real estate' },
    { label: 'Default', value: 100, tag: 'Standard baseline (16px)' },
    { label: 'Comfortable', value: 115, tag: 'Easy reading' },
    { label: 'Large', value: 125, tag: 'Higher visibility' },
    { label: 'Maximum', value: 140, tag: 'Presentation mode' },
  ];

  // Document diagnostics
  const stats = useMemo(() => {
    let groupCount = 0;
    let unitCount = 0;
    let topicCount = 0;
    curriculumDoc.subjects?.forEach((s) => {
      groupCount += s.groups?.length || 0;
      s.groups?.forEach((g) => {
        unitCount += g.units?.length || 0;
        topicCount += g.directTopics?.length || 0;
        g.units?.forEach((u) => {
          topicCount += u.topics?.length || 0;
        });
      });
    });
    return {
      subjects: curriculumDoc.subjects?.length || 0,
      groups: groupCount,
      units: unitCount,
      topics: topicCount,
      ranked: curriculumDoc.rankingAssignments?.length || 0,
    };
  }, [curriculumDoc]);

  // Generated export preview text
  const exportPreviewContent = useMemo(() => {
    if (exportScope === 'ranking') {
      const options = {
        profileId: activeProfile?.id || 'profile-tier-list',
        subjectId: selectedSubjectId,
        includeUnranked,
      };
      switch (rankingFormat) {
        case 'ai_roadmap_json':
          return generateAIRoadmapJson(curriculumDoc, options);
        case 'canonical_ranked_json':
          return generateRankedCurriculumJson(curriculumDoc, options);
        case 'csv':
          return generateRankedCurriculumCsv(curriculumDoc, options);
        case 'flat_relational_csv':
          return generateFlatRankingCsv(curriculumDoc, options);
        default:
          return generateAIPromptWithPayload(curriculumDoc, options);
      }
    } else if (exportScope === 'roadmap') {
      if (!roadmap) return '// No active study roadmap generated yet.';
      switch (roadmapFormat) {
        case 'markdown':
          return exportRoadmapMarkdown(roadmap, curriculumDoc);
        case 'json':
          return exportRoadmapJson(roadmap, curriculumDoc);
        case 'csv':
          return exportRoadmapCsv(roadmap, curriculumDoc);
      }
    } else {
      // Full master backup
      return JSON.stringify(curriculumDoc, null, 2);
    }
  }, [
    exportScope,
    rankingFormat,
    roadmapFormat,
    curriculumDoc,
    activeProfile,
    roadmap,
    selectedSubjectId,
    includeUnranked,
  ]);

  const handleDownload = () => {
    if (exportScope === 'ranking') {
      const baseName = `ranked-curriculum-${selectedSubjectId}-${new Date().toISOString().slice(0, 10)}`;
      if (rankingFormat === 'csv') {
        downloadExportFile(exportPreviewContent, `${baseName}.csv`, 'text/csv');
      } else if (rankingFormat === 'flat_relational_csv') {
        downloadExportFile(exportPreviewContent, `${baseName}-flat.csv`, 'text/csv');
      } else {
        downloadExportFile(exportPreviewContent, `${baseName}.json`, 'application/json');
      }
    } else if (exportScope === 'roadmap') {
      if (!roadmap) return;
      const baseName = `${roadmap.title.toLowerCase().replace(/\s+/g, '-')}-export`;
      if (roadmapFormat === 'markdown') {
        downloadExportFile(exportRoadmapMarkdown(roadmap, curriculumDoc), `${baseName}.md`, 'text/markdown');
      } else if (roadmapFormat === 'json') {
        downloadExportFile(exportRoadmapJson(roadmap, curriculumDoc), `${baseName}.json`, 'application/json');
      } else {
        downloadExportFile(exportRoadmapCsv(roadmap, curriculumDoc), `${baseName}.csv`, 'text/csv');
      }
    } else {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(curriculumDoc, null, 2));
      const a = document.createElement('a');
      a.href = dataStr;
      a.download = `curriculum-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(exportPreviewContent);
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 2000);
  };

  const settingsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    settingsContainerRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeTab]);

  return (
    <div
      id="settings-page"
      ref={settingsContainerRef}
      className={`flex-1 min-h-0 flex flex-col overflow-y-auto select-none font-sans ${
        theme === 'dark' ? 'bg-[#131314] text-[#e3e3e3]' : 'bg-[#f8f9fa] text-[#24292f]'
      }`}
    >
      {/* 1. Top Header Bar with Navigation Tabs: Natural layout with Explorer square button flush on left */}
      <header
        className={`h-11 sm:h-12 border-b shrink-0 flex items-center justify-between transition-colors z-20 pr-3 sm:pr-4 sticky top-0 ${
          theme === 'dark' ? 'bg-[#131314] border-[#222425]' : 'bg-white border-[#e5e7eb]'
        }`}
      >
        {/* Left: Explorer Square Button flush at top-left corner */}
        <div className="flex items-center h-full shrink-0">
          <ExplorerSquareButton />
        </div>

        {/* Clean Segmented Tab Switcher */}
        <div className="flex items-center justify-center shrink-0">
          <div
            className={`flex items-center p-0.5 rounded-lg border text-xs shrink-0 ${
              theme === 'dark' ? 'bg-[#181818] border-[#333333]' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              onClick={() => setActiveTab('appearance')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'appearance'
                  ? 'bg-[#007acc] text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-inherit'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 shrink-0" />
              <span>Appearance</span>
            </button>

            <button
              onClick={() => setActiveTab('export')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'export'
                  ? 'bg-[#007acc] text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-inherit'
              }`}
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>Export</span>
            </button>

            <button
              onClick={() => setActiveTab('system')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'system'
                  ? 'bg-[#007acc] text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-inherit'
              }`}
            >
              <Activity className="w-3.5 h-3.5 shrink-0" />
              <span>Diagnostics</span>
            </button>
          </div>
        </div>

        {/* Right balance spacer */}
        <div className="w-9 shrink-0 hidden sm:block" />
      </header>

      {/* Main Tab Content */}
      <div className="flex-1 p-4 sm:p-8 max-w-5xl w-full mx-auto space-y-6">
        {/* ========================================================================= */}
        {/* 1. APPEARANCE & SCALING TAB */}
        {/* ========================================================================= */}
        {activeTab === 'appearance' && (
          <div className="space-y-6">
            {/* Dark & Light Mode Toggle: Long rectangle with big icons in a box, zero text/labels, cool spring animation */}
            <div className="flex items-center justify-center w-full py-2 sm:py-4">
              <button
                type="button"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className={`relative flex items-center justify-between w-72 sm:w-88 h-18 sm:h-22 p-2 sm:p-2.5 rounded-3xl border-2 cursor-pointer shadow-xl transition-all duration-300 select-none overflow-hidden group focus:outline-none ${
                  theme === 'dark'
                    ? 'bg-[#121213] border-[#2c2d30] shadow-black/60 hover:border-[#3c3e44]'
                    : 'bg-[#f1f3f6] border-[#d8dce2] shadow-slate-300/50 hover:border-slate-400'
                }`}
                aria-label="Toggle Theme"
              >
                {/* Sliding indicator box with fluid spring easing and active glow */}
                <div
                  className={`absolute top-2 bottom-2 sm:top-2.5 sm:bottom-2.5 w-[calc(50%-12px)] rounded-2xl transition-all duration-500 ease-out flex items-center justify-center shadow-lg ${
                    theme === 'dark'
                      ? 'left-[calc(50%+4px)] bg-[#1e2330] border border-indigo-500/40 shadow-indigo-500/20'
                      : 'left-2 sm:left-2.5 bg-white border border-amber-400/50 shadow-amber-500/20'
                  }`}
                />

                {/* Sun (Light Mode) Half */}
                <div
                  className={`relative z-10 w-1/2 h-full flex items-center justify-center transition-all duration-500 ${
                    theme === 'light'
                      ? 'scale-115 opacity-100'
                      : 'scale-85 opacity-30 group-hover:opacity-50'
                  }`}
                >
                  <Sun
                    className={`w-9 h-9 sm:w-11 sm:h-11 transition-all duration-500 ${
                      theme === 'light'
                        ? 'text-amber-500 rotate-45 filter drop-shadow-[0_0_12px_rgba(245,158,11,0.65)]'
                        : 'text-slate-400 rotate-0'
                    }`}
                  />
                </div>

                {/* Moon (Dark Mode) Half */}
                <div
                  className={`relative z-10 w-1/2 h-full flex items-center justify-center transition-all duration-500 ${
                    theme === 'dark'
                      ? 'scale-115 opacity-100'
                      : 'scale-85 opacity-30 group-hover:opacity-50'
                  }`}
                >
                  <Moon
                    className={`w-9 h-9 sm:w-11 sm:h-11 transition-all duration-500 ${
                      theme === 'dark'
                        ? 'text-indigo-400 -rotate-12 filter drop-shadow-[0_0_12px_rgba(129,140,248,0.7)]'
                        : 'text-slate-400 rotate-0'
                    }`}
                  />
                </div>
              </button>
            </div>

            {/* Universal App Size Adjuster Card */}
            <section
              id="app-size-adjuster-card"
              className={`p-5 sm:p-6 rounded-2xl border transition-all space-y-5 ${
                theme === 'dark' ? 'bg-[#1e1e1e] border-[#2b2b2b]' : 'bg-white border-[#e5e7eb] shadow-xs'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Maximize2 className="w-4 h-4 text-[#007acc]" />
                    <h2 className="text-sm font-bold tracking-tight text-inherit">Universal App Size Adjuster</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#007acc]/15 text-[#007acc] border border-[#007acc]/30">
                      {appScale}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Proportionally scales all rem-based font sizes, layout paddings, cards, icons, and buttons simultaneously.
                  </p>
                </div>

                <button
                  onClick={() => setAppScale(100)}
                  disabled={appScale === 100}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                    appScale === 100
                      ? 'opacity-40 cursor-not-allowed border-transparent text-slate-500'
                      : theme === 'dark'
                      ? 'bg-[#252526] hover:bg-[#333333] border-[#3c3c3c] text-slate-200'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  }`}
                  title="Reset universal scale to default 100%"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Baseline (100%)</span>
                </button>
              </div>

              {/* Slider & Quick Steppers */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setAppScale(Math.max(70, appScale - 5))}
                    className={`h-8 px-2.5 rounded-lg border flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                      theme === 'dark'
                        ? 'bg-[#252526] hover:bg-[#333333] border-[#3c3c3c] text-slate-300'
                        : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                    }`}
                    title="Scale Down (-5%)"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>-5%</span>
                  </button>

                  <div className="flex-1 relative flex items-center">
                    <input
                      type="range"
                      min={70}
                      max={150}
                      step={5}
                      value={appScale}
                      onChange={(e) => setAppScale(Number(e.target.value))}
                      className="w-full h-2.5 bg-slate-300 dark:bg-[#2d2d2d] rounded-lg appearance-none cursor-pointer accent-[#007acc]"
                    />
                  </div>

                  <button
                    onClick={() => setAppScale(Math.min(150, appScale + 5))}
                    className={`h-8 px-2.5 rounded-lg border flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                      theme === 'dark'
                        ? 'bg-[#252526] hover:bg-[#333333] border-[#3c3c3c] text-slate-300'
                        : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                    }`}
                    title="Scale Up (+5%)"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>+5%</span>
                  </button>
                </div>

                {/* Preset Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {scalePresets.map((preset) => {
                    const isSelected = appScale === preset.value;
                    return (
                      <button
                        key={preset.value}
                        onClick={() => setAppScale(preset.value)}
                        className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#007acc] border-[#007acc] text-white shadow-sm'
                            : theme === 'dark'
                            ? 'bg-[#222223] hover:bg-[#2a2a2b] border-[#333333] text-slate-300'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="font-bold text-xs">{preset.value}%</div>
                        <div className={`text-[10px] truncate ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                          {preset.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* 2. Universal Bottom Activity Bar Icon Size Adjuster */}
            <section
              id="activity-bar-icon-size-card"
              className={`p-5 sm:p-6 rounded-2xl border transition-all space-y-5 ${
                theme === 'dark' ? 'bg-[#1e1e1e] border-[#2b2b2b]' : 'bg-white border-[#e5e7eb] shadow-xs'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-sm font-bold tracking-tight text-inherit">Bottom Activity Bar Icon Size</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {activityBarIconSize}px
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Adjust the size of all bottom activity bar icons uniformly.
                  </p>
                </div>

                <button
                  onClick={() => setActivityBarIconSize(24)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                    theme === 'dark'
                      ? 'bg-[#252526] hover:bg-[#333333] border-[#3c3c3c] text-slate-200'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  }`}
                  title="Reset all activity bar icon sizes to default 24px"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Default (24px)</span>
                </button>
              </div>

              {/* Universal Master Slider */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActivityBarIconSize(Math.max(16, activityBarIconSize - 2))}
                    className={`h-8 px-2.5 rounded-lg border flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                      theme === 'dark'
                        ? 'bg-[#252526] hover:bg-[#333333] border-[#3c3c3c] text-slate-300'
                        : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                    }`}
                    title="Decrease Icon Size (-2px)"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>-2px</span>
                  </button>

                  <div className="flex-1 relative flex items-center">
                    <input
                      type="range"
                      min={16}
                      max={42}
                      step={2}
                      value={activityBarIconSize}
                      onChange={(e) => setActivityBarIconSize(Number(e.target.value))}
                      className="w-full h-2.5 bg-slate-300 dark:bg-[#2d2d2d] rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      aria-label="Universal activity bar icon size"
                    />
                  </div>

                  <button
                    onClick={() => setActivityBarIconSize(Math.min(42, activityBarIconSize + 2))}
                    className={`h-8 px-2.5 rounded-lg border flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                      theme === 'dark'
                        ? 'bg-[#252526] hover:bg-[#333333] border-[#3c3c3c] text-slate-300'
                        : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                    }`}
                    title="Increase Icon Size (+2px)"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>+2px</span>
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  {[
                    { label: 'Compact', value: 18 },
                    { label: 'Small', value: 20 },
                    { label: 'Default', value: 24 },
                    { label: 'Large', value: 28 },
                    { label: 'Extra Large', value: 34 },
                  ].map((preset) => {
                    const isSelected = activityBarIconSize === preset.value;
                    return (
                      <button
                        key={preset.value}
                        onClick={() => setActivityBarIconSize(preset.value)}
                        className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                            : theme === 'dark'
                            ? 'bg-[#222223] hover:bg-[#2a2a2b] border-[#333333] text-slate-300'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="font-bold text-xs">{preset.value}px</div>
                        <div className={`text-[10px] truncate ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                          {preset.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Preview Box */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
                theme === 'dark' ? 'bg-[#151515] border-[#2d2d2d]' : 'bg-slate-100 border-slate-200'
              }`}>
                <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
                  Live Bar Preview ({activityBarIconSize}px):
                </span>

                <div className="flex items-center gap-6 sm:gap-8 flex-wrap justify-center">
                  <TierListIcon
                    style={{ width: `${activityBarIconSize}px`, height: `${activityBarIconSize}px` }}
                    className="text-amber-400 shrink-0"
                  />
                  <Layers
                    style={{ width: `${activityBarIconSize}px`, height: `${activityBarIconSize}px` }}
                    className="text-indigo-400 shrink-0"
                  />
                  <Brain
                    style={{ width: `${activityBarIconSize}px`, height: `${activityBarIconSize}px` }}
                    className="text-rose-400 shrink-0"
                  />
                  <ImportIcon
                    style={{ width: `${activityBarIconSize}px`, height: `${activityBarIconSize}px` }}
                    className="text-sky-400 shrink-0"
                  />
                  <SettingsIcon
                    style={{ width: `${activityBarIconSize}px`, height: `${activityBarIconSize}px` }}
                    className="text-emerald-400 shrink-0"
                  />
                </div>
              </div>
            </section>

            {/* 3. Tier System Presets Setting (Permanent setting cards, not a dropdown) */}
            <section
              id="tier-system-presets-card"
              className={`p-5 sm:p-6 rounded-2xl border transition-all space-y-5 ${
                theme === 'dark' ? 'bg-[#1e1e1e] border-[#2b2b2b]' : 'bg-white border-[#e5e7eb] shadow-xs'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h2 className="text-sm font-bold tracking-tight text-inherit">Tier System Preset</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      {TIER_PRESETS.find((p) => p.id === selectedTierPresetId)?.name || 'Classic'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Choose your ranking taxonomy and tier criteria. Your selection is permanently locked and persisted across sessions.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Permanent Setting Active</span>
                </div>
              </div>

              {/* Grid of Preset Setting Cards (NOT a dropdown menu!) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {TIER_PRESETS.map((preset) => {
                  const isSelected = selectedTierPresetId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => applyTierPreset(preset.id)}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 relative select-none ${
                        isSelected
                          ? 'border-[#007acc] bg-[#007acc]/10 dark:bg-[#007acc]/15 shadow-md ring-1 ring-[#007acc]'
                          : theme === 'dark'
                          ? 'bg-[#222223] hover:bg-[#282829] border-[#303032] text-slate-300 hover:border-[#404044]'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800 hover:border-slate-300'
                      }`}
                    >
                      {/* Top title and radio/check status */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-xs text-inherit flex items-center gap-2">
                            <span>{preset.name}</span>
                            {isSelected && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#007acc] text-white">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                            {preset.description}
                          </p>
                        </div>

                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          isSelected
                            ? 'border-[#007acc] bg-[#007acc] text-white'
                            : 'border-slate-400/50 text-transparent'
                        }`}>
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      </div>

                      {/* Tier Badges Preview */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-inherit/20">
                        {preset.tiers.map((t, idx) => (
                          <span
                            key={idx}
                            style={{ backgroundColor: t.color }}
                            className="px-2 py-0.5 rounded text-[10.5px] font-bold text-black/85 shadow-2xs ring-1 ring-black/10"
                            title={t.label}
                          >
                            {t.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 4. Add Custom Tier Setting (Moved from tier list header) */}
            <section
              id="add-custom-tier-card"
              className={`p-5 sm:p-6 rounded-2xl border transition-all space-y-4 ${
                theme === 'dark' ? 'bg-[#1e1e1e] border-[#2b2b2b]' : 'bg-white border-[#e5e7eb] shadow-xs'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-sm font-bold tracking-tight text-inherit">Add Custom Tier</h2>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {activeProfile?.name || 'Active Profile'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Append a custom priority tier to your active ranking profile.
                  </p>
                </div>
              </div>

              <form onSubmit={handleAddNewTier} className="space-y-3.5 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-slate-400 text-[11px] font-semibold">Tier Label / Name:</label>
                    <input
                      type="text"
                      value={newTierLabel}
                      onChange={(e) => setNewTierLabel(e.target.value)}
                      placeholder="e.g. S+, Critical Priority, Foundation..."
                      className={`w-full h-9 px-3 rounded-lg border text-xs outline-none ${
                        theme === 'dark'
                          ? 'bg-[#222223] border-[#38383a] text-slate-200 focus:border-[#007acc]'
                          : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[#007acc]'
                      }`}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 text-[11px] font-semibold">Color Accent:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={newTierColor}
                        onChange={(e) => setNewTierColor(e.target.value)}
                        className="w-9 h-9 rounded-lg border border-inherit/40 cursor-pointer p-0.5 bg-transparent"
                      />
                      <div className="flex-1 flex items-center gap-1 overflow-x-auto">
                        {['#ff7f7f', '#ffbf7f', '#ffff7f', '#7fff7f', '#7fbfff', '#bf7fff', '#60a5fa'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setNewTierColor(c)}
                            style={{ backgroundColor: c }}
                            className="w-5 h-5 rounded-full border border-black/30 shrink-0 cursor-pointer hover:scale-110 transition-transform"
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  {tierAddedSuccess ? (
                    <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{tierAddedSuccess}</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      Tiers are saved directly to your profile.
                    </span>
                  )}

                  <button
                    type="submit"
                    disabled={!newTierLabel.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#007acc] hover:bg-[#0066b8] disabled:opacity-40 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Tier to Profile</span>
                  </button>
                </div>
              </form>
            </section>

            {/* Quick Tier Summary Copy (Moved from ranking top bar) */}
            <section
              className={`p-5 sm:p-6 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                theme === 'dark' ? 'bg-[#1e1e1e] border-[#2b2b2b]' : 'bg-white border-[#e5e7eb] shadow-xs'
              }`}
            >
              <div>
                <h3 className="text-sm font-bold tracking-tight text-inherit flex items-center gap-2">
                  <Copy className="w-4 h-4 text-sky-400" />
                  <span>Copy Tier List Summary</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Copy formatted plain text summary of all topics assigned to tiers in the active profile ({activeProfile?.name || 'Default'}).
                </p>
              </div>

              <button
                id="settings-copy-tier-summary-btn"
                onClick={handleCopyTierSummary}
                className={`h-9 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border shrink-0 ${
                  copiedTierSummary
                    ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40 font-bold'
                    : theme === 'dark'
                    ? 'bg-[#252526] hover:bg-[#2e2e30] border-[#38383a] text-slate-200'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-800'
                }`}
                title="Copy tier list text summary to clipboard"
              >
                {copiedTierSummary ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Copy className="w-4 h-4 shrink-0" />
                )}
                <span>{copiedTierSummary ? 'Summary Copied!' : 'Copy Tier Summary'}</span>
              </button>
            </section>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. DATA & EXPORT HUB TAB */}
        {/* ========================================================================= */}
        {activeTab === 'export' && (
          <div className="space-y-6">
            <section
              id="export-backup-hub"
              className={`p-5 sm:p-6 rounded-2xl border transition-all space-y-5 ${
                theme === 'dark' ? 'bg-[#1e1e1e] border-[#2b2b2b]' : 'bg-white border-[#e5e7eb] shadow-xs'
              }`}
            >
              <div>
                <h2 className="text-sm font-bold tracking-tight text-inherit flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#007acc]" />
                  Curriculum Data Export Center
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Export ranked topic tier lists, generated sequential study roadmaps, or create a complete JSON document backup.
                </p>
              </div>

              {/* Scope Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => setExportScope('ranking')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    exportScope === 'ranking'
                      ? 'bg-[#007acc] border-[#007acc] text-white shadow-sm'
                      : theme === 'dark'
                      ? 'bg-[#222223] hover:bg-[#2a2a2b] border-[#333333] text-slate-300'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <Award className="w-4 h-4 mb-2" />
                  <div className="font-bold text-xs">Topic Tier List</div>
                  <div className={`text-[10px] mt-0.5 ${exportScope === 'ranking' ? 'text-white/80' : 'text-slate-400'}`}>
                    Prioritized rankings by tier
                  </div>
                </button>

                <button
                  onClick={() => setExportScope('roadmap')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    exportScope === 'roadmap'
                      ? 'bg-[#007acc] border-[#007acc] text-white shadow-sm'
                      : theme === 'dark'
                      ? 'bg-[#222223] hover:bg-[#2a2a2b] border-[#333333] text-slate-300'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <Layers className="w-4 h-4 mb-2" />
                  <div className="font-bold text-xs">Study Roadmap</div>
                  <div className={`text-[10px] mt-0.5 ${exportScope === 'roadmap' ? 'text-white/80' : 'text-slate-400'}`}>
                    Sequential learning phases
                  </div>
                </button>

                <button
                  onClick={() => setExportScope('backup')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    exportScope === 'backup'
                      ? 'bg-[#007acc] border-[#007acc] text-white shadow-sm'
                      : theme === 'dark'
                      ? 'bg-[#222223] hover:bg-[#2a2a2b] border-[#333333] text-slate-300'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <HardDrive className="w-4 h-4 mb-2" />
                  <div className="font-bold text-xs">Full Document Backup</div>
                  <div className={`text-[10px] mt-0.5 ${exportScope === 'backup' ? 'text-white/80' : 'text-slate-400'}`}>
                    Canonical raw JSON archive
                  </div>
                </button>
              </div>

              {/* Format Selectors and Filters */}
              {exportScope === 'ranking' && (
                <div className="p-4 rounded-xl border space-y-3 bg-black/10 border-inherit">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">Export Format:</span>
                    <button
                      onClick={() => setRankingFormat('ai_roadmap_json')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                        rankingFormat === 'ai_roadmap_json'
                          ? 'bg-[#007acc] text-white'
                          : 'bg-black/20 hover:bg-black/40 text-slate-300'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>AI Prompt JSON</span>
                    </button>

                    <button
                      onClick={() => setRankingFormat('canonical_ranked_json')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                        rankingFormat === 'canonical_ranked_json'
                          ? 'bg-[#007acc] text-white'
                          : 'bg-black/20 hover:bg-black/40 text-slate-300'
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5 text-sky-400" />
                      <span>Canonical JSON</span>
                    </button>

                    <button
                      onClick={() => setRankingFormat('csv')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                        rankingFormat === 'csv'
                          ? 'bg-[#007acc] text-white'
                          : 'bg-black/20 hover:bg-black/40 text-slate-300'
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Tabular CSV</span>
                    </button>

                    <button
                      onClick={() => setRankingFormat('flat_relational_csv')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                        rankingFormat === 'flat_relational_csv'
                          ? 'bg-[#007acc] text-white'
                          : 'bg-black/20 hover:bg-black/40 text-slate-300'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Flat Database CSV</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs pt-1 border-t border-inherit/40">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Subject Filter:</span>
                      <select
                        value={selectedSubjectId}
                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                        className={`px-2.5 py-1 rounded-md border text-xs outline-none cursor-pointer ${
                          theme === 'dark'
                            ? 'bg-[#181818] border-[#3c3c3c] text-white'
                            : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      >
                        <option value="all">All Subjects</option>
                        {curriculumDoc.subjects?.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-inherit">
                      <input
                        type="checkbox"
                        checked={includeUnranked}
                        onChange={(e) => setIncludeUnranked(e.target.checked)}
                        className="rounded accent-[#007acc]"
                      />
                      <span>Include unranked topics in export</span>
                    </label>
                  </div>
                </div>
              )}

              {exportScope === 'roadmap' && (
                <div className="p-4 rounded-xl border space-y-3 bg-black/10 border-inherit">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">Roadmap Format:</span>
                    <button
                      onClick={() => setRoadmapFormat('markdown')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                        roadmapFormat === 'markdown'
                          ? 'bg-[#007acc] text-white'
                          : 'bg-black/20 hover:bg-black/40 text-slate-300'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 text-sky-400" />
                      <span>Markdown Study Plan (.md)</span>
                    </button>

                    <button
                      onClick={() => setRoadmapFormat('json')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                        roadmapFormat === 'json'
                          ? 'bg-[#007acc] text-white'
                          : 'bg-black/20 hover:bg-black/40 text-slate-300'
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5 text-amber-400" />
                      <span>Roadmap JSON</span>
                    </button>

                    <button
                      onClick={() => setRoadmapFormat('csv')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                        roadmapFormat === 'csv'
                          ? 'bg-[#007acc] text-white'
                          : 'bg-black/20 hover:bg-black/40 text-slate-300'
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Study Schedule CSV</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Code Preview Box & Action Toolbar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-medium text-slate-400 flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-[#007acc]" />
                    <span>EXPORT PAYLOAD PREVIEW</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopy}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border ${
                        copiedStatus
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : theme === 'dark'
                          ? 'bg-[#252526] hover:bg-[#333333] border-[#3c3c3c] text-white'
                          : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                      }`}
                    >
                      {copiedStatus ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedStatus ? 'Copied!' : 'Copy to Clipboard'}</span>
                    </button>

                    <button
                      onClick={handleDownload}
                      className="px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-[#007acc] hover:bg-[#0062a3] text-white transition-colors cursor-pointer shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download File</span>
                    </button>
                  </div>
                </div>

                <div
                  className={`max-h-96 p-4 rounded-xl border font-mono text-xs leading-relaxed overflow-y-auto whitespace-pre-wrap select-text ${
                    theme === 'dark'
                      ? 'bg-[#141414] border-[#2b2b2b] text-[#9cdcfe]'
                      : 'bg-slate-900 border-slate-700 text-sky-200'
                  }`}
                >
                  {exportPreviewContent}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. SYSTEM & SHORTCUTS TAB */}
        {/* ========================================================================= */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            {/* Live Inventory & Document Diagnostics Card */}
            <section
              className={`p-5 sm:p-6 rounded-2xl border transition-all space-y-4 ${
                theme === 'dark' ? 'bg-[#1e1e1e] border-[#2b2b2b]' : 'bg-white border-[#e5e7eb] shadow-xs'
              }`}
            >
              <div>
                <h2 className="text-sm font-bold tracking-tight text-inherit flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Curriculum Document Diagnostics
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Current document entity count and local storage persistence health.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-[#181818] border-[#2b2b2b]' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-[10px] text-slate-400 font-mono">SUBJECTS</div>
                  <div className="text-lg font-bold text-inherit mt-1">{stats.subjects}</div>
                </div>

                <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-[#181818] border-[#2b2b2b]' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-[10px] text-slate-400 font-mono">GRADE GROUPS</div>
                  <div className="text-lg font-bold text-inherit mt-1">{stats.groups}</div>
                </div>

                <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-[#181818] border-[#2b2b2b]' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-[10px] text-slate-400 font-mono">UNITS</div>
                  <div className="text-lg font-bold text-inherit mt-1">{stats.units}</div>
                </div>

                <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-[#181818] border-[#2b2b2b]' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-[10px] text-slate-400 font-mono">TOTAL TOPICS</div>
                  <div className="text-lg font-bold text-inherit mt-1">{stats.topics}</div>
                </div>

                <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-[#181818] border-[#2b2b2b]' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-[10px] text-slate-400 font-mono">RANKED IN TIERS</div>
                  <div className="text-lg font-bold text-[#007acc] mt-1">{stats.ranked}</div>
                </div>
              </div>

              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                  theme === 'dark' ? 'bg-[#181818] border-[#2b2b2b]' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-sky-400" />
                  <span>Storage Engine: <strong>Browser LocalStorage</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Synchronized &amp; Offline Ready</span>
                </div>
              </div>
            </section>

            {/* AI Memory Retention & Knowledge Gap Diagnostics Card (Moved from AI page) */}
            <section
              className={`p-5 sm:p-6 rounded-2xl border transition-all space-y-4 ${
                theme === 'dark' ? 'bg-[#1e1e1e] border-[#2b2b2b]' : 'bg-white border-[#e5e7eb] shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-inherit flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    Memory Retention &amp; Knowledge Gap Diagnostics
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    AI analyzes your FSRS review logs, lapse frequencies, and retention rates to recommend target priorities.
                  </p>
                </div>

                <button
                  id="settings-run-diagnostics-btn"
                  onClick={handleRunDiagnostics}
                  disabled={isAnalyzingGaps}
                  className="px-4 py-2 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-2 transition-all cursor-pointer shadow-md shrink-0 disabled:opacity-50"
                >
                  {isAnalyzingGaps ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing Performance...</span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Run Diagnostic Analysis</span>
                    </>
                  )}
                </button>
              </div>

              {/* Metric stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-1">
                <div className={`p-3 rounded-xl border text-center ${theme === 'dark' ? 'bg-[#181818] border-[#2b2b2b]' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Retention</div>
                  <div className="text-lg font-bold text-emerald-400 mt-0.5">{deckStats.retentionRate}%</div>
                </div>
                <div className={`p-3 rounded-xl border text-center ${theme === 'dark' ? 'bg-[#181818] border-[#2b2b2b]' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Lapsed Cards</div>
                  <div className="text-lg font-bold text-rose-400 mt-0.5">
                    {flashcards.filter((c) => c.lapses > 0).length}
                  </div>
                </div>
                <div className={`p-3 rounded-xl border text-center ${theme === 'dark' ? 'bg-[#181818] border-[#2b2b2b]' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Total Reviewed</div>
                  <div className="text-lg font-bold text-sky-400 mt-0.5">{reviewLogs.length}</div>
                </div>
                <div className={`p-3 rounded-xl border text-center ${theme === 'dark' ? 'bg-[#181818] border-[#2b2b2b]' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Active Streak</div>
                  <div className="text-lg font-bold text-amber-400 mt-0.5">{deckStats.streakDays}d</div>
                </div>
              </div>

              {gapAnalysisError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs">
                  {gapAnalysisError}
                </div>
              )}

              {gapAnalysisText && (
                <div
                  className={`p-5 rounded-xl border space-y-2.5 leading-relaxed ${
                    theme === 'dark' ? 'bg-[#181818] border-[#2b2b2b]' : 'bg-slate-50 border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="font-bold text-xs text-emerald-400 border-b pb-2 border-inherit/30 flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>AI Study Plan &amp; Retention Recommendations</span>
                  </div>
                  <div className="whitespace-pre-wrap text-xs text-inherit leading-relaxed font-sans">
                    {gapAnalysisText}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
