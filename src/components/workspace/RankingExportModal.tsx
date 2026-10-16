/**
 * VS Code-inspired Ranked Curriculum Export & AI Roadmap Studio.
 *
 * Provides:
 * - Clean, AI-readable JSON export specifically designed for LLMs (Gemini, Claude, ChatGPT)
 *   to generate personalized study roadmaps without hallucinating or merging topics.
 * - Tabular CSV export preserving stable IDs, subjects, curriculum locations, and rankings.
 * - Full canonical JSON export preserving the complete curriculum structure.
 * - Pure client-side browser downloads and clipboard copy.
 * - 100% offline and local, zero backend services.
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  Download,
  Copy,
  Check,
  FileCode,
  FileSpreadsheet,
  Sparkles,
  Bot,
  Filter,
  Layers,
  X,
  CheckCircle2,
  ExternalLink,
  Info,
  ArrowUpDown,
  FileJson,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  ExportFormatType,
  generateAIRoadmapJson,
  generateRankedCurriculumJson,
  generateRankedCurriculumCsv,
  generateFlatRankingCsv,
  generateAIPromptWithPayload,
  downloadFile,
} from '../../utils/rankingExportUtils';

interface RankingExportModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  isEmbeddedView?: boolean; // if rendered full-screen inside Import/Export hub
}

export default function RankingExportModal({
  isOpen = true,
  onClose,
  isEmbeddedView = false,
}: RankingExportModalProps) {
  const { theme, curriculumDoc, activeRankingProfileId } = useWorkspace();

  // Export configurations
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    activeRankingProfileId || curriculumDoc.rankingProfiles?.[0]?.id || 'profile-priority'
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [includeUnranked, setIncludeUnranked] = useState<boolean>(false);
  const [activeFormat, setActiveFormat] = useState<ExportFormatType>('ai_roadmap_json');

  // Copy feedbacks
  const [copiedContent, setCopiedContent] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);

  const previewTextareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  // Active profile object
  const activeProfile = useMemo(() => {
    return (
      curriculumDoc.rankingProfiles?.find((p) => p.id === selectedProfileId) ||
      curriculumDoc.rankingProfiles?.[0]
    );
  }, [curriculumDoc.rankingProfiles, selectedProfileId]);

  // Generate output content based on chosen options and format
  const exportContent = useMemo(() => {
    const opts = {
      profileId: selectedProfileId,
      subjectId: selectedSubjectId,
      includeUnranked,
    };

    switch (activeFormat) {
      case 'ai_roadmap_json':
        return generateAIRoadmapJson(curriculumDoc, opts);
      case 'canonical_ranked_json':
        return generateRankedCurriculumJson(curriculumDoc, opts);
      case 'csv':
        return generateRankedCurriculumCsv(curriculumDoc, opts);
      case 'flat_relational_csv':
        return generateFlatRankingCsv(curriculumDoc, opts);
      default:
        return '';
    }
  }, [curriculumDoc, selectedProfileId, selectedSubjectId, includeUnranked, activeFormat]);

  // Compute line numbers for the preview gutter
  const lineNumbers = useMemo(() => {
    const lines = exportContent.split('\n').length;
    return Array.from({ length: Math.min(lines, 400) }, (_, i) => i + 1);
  }, [exportContent]);

  // Synchronize scroll between gutter and textarea
  const handleScroll = () => {
    if (previewTextareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = previewTextareaRef.current.scrollTop;
    }
  };

  // Stats for the current export
  const stats = useMemo(() => {
    const profileAssignments = (curriculumDoc.rankingAssignments || []).filter(
      (a) => a.rankingProfileId === selectedProfileId
    );
    const sizeInKb = (new Blob([exportContent]).size / 1024).toFixed(1);
    const lineCount = exportContent.split('\n').length;

    return {
      rankedCount: profileAssignments.length,
      sizeInKb,
      lineCount,
    };
  }, [curriculumDoc.rankingAssignments, selectedProfileId, exportContent]);

  // Handle Download File
  const handleDownload = () => {
    const safeDocTitle = (curriculumDoc.title || 'curriculum')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .slice(0, 24);
    const safeProfileName = (activeProfile?.name || 'ranked')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_');

    let filename = '';
    let mimeType = '';

    if (activeFormat === 'ai_roadmap_json') {
      filename = `${safeDocTitle}_${safeProfileName}_ai_roadmap.json`;
      mimeType = 'application/json';
    } else if (activeFormat === 'canonical_ranked_json') {
      filename = `${safeDocTitle}_${safeProfileName}_ranked_curriculum.json`;
      mimeType = 'application/json';
    } else if (activeFormat === 'csv') {
      filename = `${safeDocTitle}_${safeProfileName}_ranked_table.csv`;
      mimeType = 'text/csv';
    } else {
      filename = `${safeDocTitle}_${safeProfileName}_flat_rankings.csv`;
      mimeType = 'text/csv';
    }

    downloadFile(exportContent, filename, mimeType);
  };

  // Handle Copy Raw Content
  const handleCopyContent = () => {
    navigator.clipboard.writeText(exportContent);
    setCopiedContent(true);
    setTimeout(() => setCopiedContent(false), 2000);
  };

  // Handle Copy Full Prompt with AI Payload
  const handleCopyAIPrompt = () => {
    const promptText = generateAIPromptWithPayload(curriculumDoc, {
      profileId: selectedProfileId,
      subjectId: selectedSubjectId,
      includeUnranked,
    });
    navigator.clipboard.writeText(promptText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  if (!isOpen && !isEmbeddedView) return null;

  const contentElement = (
    <div
      id="ranking-export-studio"
      className={`flex flex-col h-full w-full select-none text-xs min-h-0 ${
        isEmbeddedView ? 'overflow-y-auto md:overflow-hidden' : 'overflow-hidden'
      } ${
        isEmbeddedView
          ? 'bg-[#1e1e1e] text-[#cccccc]'
          : theme === 'dark'
          ? 'bg-[#1e1e1e] text-[#cccccc]'
          : 'bg-[#f8f9fa] text-[#333333]'
      }`}
    >
      {/* 1. Header Bar */}
      <div
        className={`px-4 py-2.5 border-b shrink-0 flex items-center justify-between gap-3 ${
          theme === 'dark' || isEmbeddedView
            ? 'bg-[#252526] border-[#333333]'
            : 'bg-[#ffffff] border-[#e0e0e0]'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-xs text-inherit">Export Ranked Curriculum</h2>
              <span className="text-[11px] text-slate-400 font-mono">
                · Stable IDs · Canonical Intact
              </span>
            </div>
            <p className="text-[11px] text-[#888888]">
              Generate JSON or CSV exports faithful to actual imported topics and user priority rankings.
            </p>
          </div>
        </div>

        {!isEmbeddedView && onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
            title="Close Export Studio"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. Format Selection Tabs */}
      <div
        className={`px-4 py-1.5 border-b shrink-0 flex flex-wrap items-center justify-between gap-2 text-xs ${
          theme === 'dark' || isEmbeddedView
            ? 'bg-[#1e1e1e] border-[#2d2d2d]'
            : 'bg-[#f3f4f6] border-[#e5e7eb]'
        }`}
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-[#888888] mr-1">Format:</span>

          {/* AI Roadmap JSON Tab */}
          <button
            id="format-btn-ai-roadmap"
            onClick={() => setActiveFormat('ai_roadmap_json')}
            className={`px-2.5 py-1.5 rounded flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${
              activeFormat === 'ai_roadmap_json'
                ? 'bg-[#007acc] text-white font-medium shadow-xs'
                : 'hover:bg-slate-700/30 text-[#888888] hover:text-inherit'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-amber-300" />
            <span>AI Study Roadmap (Clean JSON)</span>
          </button>

          {/* Canonical Full JSON Tab */}
          <button
            id="format-btn-canonical-json"
            onClick={() => setActiveFormat('canonical_ranked_json')}
            className={`px-2.5 py-1.5 rounded flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${
              activeFormat === 'canonical_ranked_json'
                ? 'bg-[#007acc] text-white font-medium shadow-xs'
                : 'hover:bg-slate-700/30 text-[#888888] hover:text-inherit'
            }`}
          >
            <FileJson className="w-3.5 h-3.5 text-sky-300" />
            <span>Complete Curriculum (JSON)</span>
          </button>

          {/* Tabular CSV Tab */}
          <button
            id="format-btn-csv"
            onClick={() => setActiveFormat('csv')}
            className={`px-2.5 py-1.5 rounded flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${
              activeFormat === 'csv'
                ? 'bg-[#007acc] text-white font-medium shadow-xs'
                : 'hover:bg-slate-700/30 text-[#888888] hover:text-inherit'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
            <span>Spreadsheet Table (CSV)</span>
          </button>

          {/* Flat Relational CSV Tab */}
          <button
            id="format-btn-flat-csv"
            onClick={() => setActiveFormat('flat_relational_csv')}
            className={`px-2.5 py-1.5 rounded flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${
              activeFormat === 'flat_relational_csv'
                ? 'bg-[#007acc] text-white font-medium shadow-xs'
                : 'hover:bg-slate-700/30 text-[#888888] hover:text-inherit'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-300" />
            <span>Flat Relational (CSV)</span>
          </button>
        </div>

        {/* Live Payload Metrics */}
        <div className="flex items-center gap-2 font-mono text-[11px] text-[#888888]">
          <span className="text-emerald-400 font-semibold">{stats.rankedCount} ranked</span>
          <span>•</span>
          <span>{stats.lineCount} lines</span>
          <span>•</span>
          <span>~{stats.sizeInKb} KB</span>
        </div>
      </div>

      {/* 3. Scope Controls & Filters Toolbar */}
      <div
        className={`px-4 py-2 border-b shrink-0 flex flex-wrap items-center justify-between gap-3 text-xs ${
          theme === 'dark' || isEmbeddedView
            ? 'bg-[#252526] border-[#333333]'
            : 'bg-[#ffffff] border-[#e0e0e0]'
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          {/* Ranking Profile Selector */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="export-profile-select" className="text-[#888888] text-[11px]">
              Profile:
            </label>
            <select
              id="export-profile-select"
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className={`text-xs px-2 py-1 rounded border outline-none font-medium cursor-pointer ${
                theme === 'dark' || isEmbeddedView
                  ? 'bg-[#1e1e1e] border-[#3c3c3c] text-white focus:border-[#007acc]'
                  : 'bg-white border-[#cccccc] text-[#1e1e1e] focus:border-[#007acc]'
              }`}
            >
              {curriculumDoc.rankingProfiles?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.type === 'ordered' ? 'Ordered' : 'Tier'})
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter Scope */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="export-subject-select" className="text-[#888888] text-[11px]">
              Subject:
            </label>
            <select
              id="export-subject-select"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className={`text-xs px-2 py-1 rounded border outline-none cursor-pointer ${
                theme === 'dark' || isEmbeddedView
                  ? 'bg-[#1e1e1e] border-[#3c3c3c] text-white focus:border-[#007acc]'
                  : 'bg-white border-[#cccccc] text-[#1e1e1e] focus:border-[#007acc]'
              }`}
            >
              <option value="all">All Subjects (Entire Curriculum)</option>
              {curriculumDoc.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.type})
                </option>
              ))}
            </select>
          </div>

          {/* Include Unranked Checkbox */}
          {(activeFormat === 'ai_roadmap_json' || activeFormat === 'csv') && (
            <label className="flex items-center gap-1.5 cursor-pointer text-[#888888] hover:text-inherit text-[11px]">
              <input
                type="checkbox"
                checked={includeUnranked}
                onChange={(e) => setIncludeUnranked(e.target.checked)}
                className="rounded text-[#007acc] focus:ring-0 cursor-pointer"
              />
              <span>Include all other syllabus topics in export</span>
            </label>
          )}
        </div>

        {/* Primary Action Buttons: Download & Copy */}
        <div className="flex items-center gap-2">
          {activeFormat === 'ai_roadmap_json' && (
            <button
              id="btn-copy-ai-prompt"
              onClick={handleCopyAIPrompt}
              className={`px-3 py-1.5 rounded border flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
                copiedPrompt
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                  : theme === 'dark' || isEmbeddedView
                  ? 'bg-amber-950/30 border-amber-800/60 hover:bg-amber-900/40 text-amber-300'
                  : 'bg-amber-50 border-amber-300 hover:bg-amber-100 text-amber-800'
              }`}
              title="Copy formatted prompt instructions + JSON payload ready for ChatGPT, Claude, or Gemini"
            >
              {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{copiedPrompt ? 'Prompt Copied!' : 'Copy AI Prompt'}</span>
            </button>
          )}

          <button
            id="btn-copy-raw-content"
            onClick={handleCopyContent}
            className={`px-3 py-1.5 rounded border flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
              copiedContent
                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500'
                : theme === 'dark' || isEmbeddedView
                ? 'bg-[#1e1e1e] border-[#3c3c3c] hover:bg-[#2d2d2d] text-slate-200'
                : 'bg-white border-[#cccccc] hover:bg-slate-100 text-slate-800'
            }`}
            title="Copy payload to clipboard"
          >
            {copiedContent ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedContent ? 'Copied!' : activeFormat.includes('csv') ? 'Copy CSV' : 'Copy JSON'}</span>
          </button>

          <button
            id="btn-download-export-file"
            onClick={handleDownload}
            className="px-3.5 py-1.5 rounded bg-[#007acc] text-white hover:bg-[#0066b8] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Download export file to your device"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download {activeFormat.includes('csv') ? '.csv' : '.json'}</span>
          </button>
        </div>
      </div>

      {/* 4. Format Description & Integrity Guarantee Callout */}
      <div
        className={`px-4 py-1.5 border-b text-[11px] flex items-center justify-between shrink-0 font-mono ${
          theme === 'dark' || isEmbeddedView
            ? 'bg-[#1b1b1c] border-[#292929] text-[#888888]'
            : 'bg-[#f1f3f5] border-[#e2e4e7] text-[#555555]'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <Info className="w-3 h-3 text-[#007acc] shrink-0" />
          <span className="truncate">
            {activeFormat === 'ai_roadmap_json' &&
              'AI Study Roadmap: Clean, un-hallucinated JSON containing sequential ranks, prerequisites, and ancestral locations for external LLMs.'}
            {activeFormat === 'canonical_ranked_json' &&
              'Complete Curriculum JSON: Bundles active rankings alongside the unchanged canonical curriculum schema.'}
            {activeFormat === 'csv' &&
              'Tabular CSV: Human-readable spreadsheet table with Topic Stable IDs, subjects, units, order, and notes.'}
            {activeFormat === 'flat_relational_csv' &&
              'Flat Relational CSV: Machine-friendly schema matching the import parser for relational database round-trips.'}
          </span>
        </div>
        <span className="shrink-0 text-emerald-400">Canonical Curriculum Untouched ✓</span>
      </div>

      {/* 5. Live Code & Data Preview Box */}
      <div className="flex-1 min-h-[280px] md:min-h-0 flex bg-[#1e1e1e] text-[#d4d4d4] font-mono text-xs overflow-hidden shrink-0 md:shrink">
        {/* Line Numbers Gutter */}
        <div
          ref={gutterRef}
          className="w-12 py-3 bg-[#1e1e1e] border-r border-[#2d2d2d] text-[#858585] text-right pr-2 select-none overflow-hidden shrink-0 font-mono"
        >
          {lineNumbers.map((line) => (
            <div key={line} className="h-5 leading-5 text-[11px]">
              {line}
            </div>
          ))}
        </div>

        {/* Textarea Code Preview */}
        <textarea
          ref={previewTextareaRef}
          value={exportContent}
          readOnly
          onScroll={handleScroll}
          className="flex-1 h-full w-full p-3 bg-transparent text-[#e0e0e0] font-mono text-xs leading-5 resize-none outline-none overflow-auto select-text selection:bg-[#264f78]"
          spellCheck={false}
          aria-label="Export Payload Preview"
        />
      </div>
    </div>
  );

  // If embedded in a tab or page, return directly
  if (isEmbeddedView) {
    return contentElement;
  }

  // Otherwise, return in a centered IDE dialog overlay
  return (
    <div
      id="ranking-export-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl h-[85vh] max-h-[85vh] rounded-lg shadow-2xl overflow-hidden border border-[#3c3c3c] flex flex-col min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        {contentElement}
      </div>
    </div>
  );
}
