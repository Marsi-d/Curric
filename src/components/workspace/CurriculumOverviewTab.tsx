/**
 * Curriculum Overview Tab (Concise, Developer-Tool Aesthetic).
 *
 * Displays:
 * - High-level summary of active curriculum
 * - Number of subjects, grades/categories, units, topics, subtopics
 * - Schema version, import provenance, last saved timestamp
 * - Scoped subject navigation links
 * - Empty state with clear "Open Import" and "Load Sample Dataset" triggers
 */

import React, { useMemo, useRef, useEffect } from 'react';
import {
  Layers,
  BookOpen,
  Folder,
  FileText,
  Clock,
  ShieldCheck,
  UploadCloud,
  RotateCcw,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { validateCurriculumDocument } from '../../schema/validation';

export default function CurriculumOverviewTab() {
  const {
    theme,
    curriculumDoc,
    openTab,
    setActiveArea,
    resetToSampleData,
  } = useWorkspace();

  const validation = useMemo(
    () => validateCurriculumDocument(curriculumDoc),
    [curriculumDoc]
  );

  const stats = validation.stats;
  const hasData = curriculumDoc.subjects.length > 0;

  if (!hasData) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center text-slate-400">
          <Layers className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-semibold">No Curriculum Imported Yet</h2>
          <p className="text-xs text-slate-400 mt-1">
            Import a syllabus via JSON/CSV or load the canonical curriculum dataset to begin exploring.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            id="empty-open-import-btn"
            onClick={() => setActiveArea('import')}
            className="px-4 py-2 bg-[#007acc] text-white text-xs font-medium rounded hover:bg-[#0066b8] transition-colors flex items-center gap-1.5"
          >
            <UploadCloud className="w-4 h-4" />
            Open Import Hub
          </button>
          <button
            id="empty-load-sample-btn"
            onClick={resetToSampleData}
            className={`px-4 py-2 text-xs font-medium rounded border transition-colors flex items-center gap-1.5 ${
              theme === 'dark'
                ? 'bg-[#252526] border-[#3c3c3c] text-[#cccccc] hover:bg-[#2d2d2d]'
                : 'bg-[#ffffff] border-[#cccccc] text-[#1e1e1e] hover:bg-[#f0f0f0]'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            Load Sample Dataset
          </button>
        </div>
      </div>
    );
  }

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  return (
    <div
      id="curriculum-overview-view"
      ref={containerRef}
      className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 max-w-5xl space-y-6 text-xs leading-relaxed"
    >
      {/* Top Meta Bar */}
      <div
        className={`p-4 rounded border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          theme === 'dark'
            ? 'bg-[#252526] border-[#333333]'
            : 'bg-[#ffffff] border-[#e0e0e0]'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold tracking-tight text-inherit">
              {curriculumDoc.title || 'Academic Curriculum Master'}
            </h1>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#007acc]/15 text-[#007acc] border border-[#007acc]/30">
              v{curriculumDoc.schemaVersion}
            </span>
            {validation.valid && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Validated
              </span>
            )}
          </div>
          <p className="text-[#888888] text-xs">
            {curriculumDoc.description || 'Structured hierarchical syllabus mapping.'}
          </p>
        </div>

        <div className="text-[11px] text-[#888888] shrink-0 space-y-1 sm:text-right">
          <div className="flex items-center sm:justify-end gap-1 font-mono">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Last Saved: {new Date(curriculumDoc.updatedAt || Date.now()).toLocaleTimeString()}</span>
          </div>
          <div className="font-mono text-[10px]">
            Doc ID: <span className="text-inherit">{curriculumDoc.id}</span>
          </div>
        </div>
      </div>

      {/* Dense Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        <div
          className={`p-3 rounded border text-center ${
            theme === 'dark' ? 'bg-[#252526] border-[#333333]' : 'bg-[#ffffff] border-[#e0e0e0]'
          }`}
        >
          <div className="text-lg font-bold text-[#007acc] font-mono">{stats.subjectCount}</div>
          <div className="text-[11px] text-[#888888] font-medium uppercase tracking-wider mt-0.5">
            Subjects
          </div>
        </div>

        <div
          className={`p-3 rounded border text-center ${
            theme === 'dark' ? 'bg-[#252526] border-[#333333]' : 'bg-[#ffffff] border-[#e0e0e0]'
          }`}
        >
          <div className="text-lg font-bold text-amber-400 font-mono">{stats.groupCount}</div>
          <div className="text-[11px] text-[#888888] font-medium uppercase tracking-wider mt-0.5">
            Grades/Cats
          </div>
        </div>

        <div
          className={`p-3 rounded border text-center ${
            theme === 'dark' ? 'bg-[#252526] border-[#333333]' : 'bg-[#ffffff] border-[#e0e0e0]'
          }`}
        >
          <div className="text-lg font-bold text-sky-400 font-mono">{stats.unitCount}</div>
          <div className="text-[11px] text-[#888888] font-medium uppercase tracking-wider mt-0.5">
            Units
          </div>
        </div>

        <div
          className={`p-3 rounded border text-center ${
            theme === 'dark' ? 'bg-[#252526] border-[#333333]' : 'bg-[#ffffff] border-[#e0e0e0]'
          }`}
        >
          <div className="text-lg font-bold text-emerald-400 font-mono">{stats.topicCount}</div>
          <div className="text-[11px] text-[#888888] font-medium uppercase tracking-wider mt-0.5">
            Topics
          </div>
        </div>

        <div
          className={`p-3 rounded border text-center ${
            theme === 'dark' ? 'bg-[#252526] border-[#333333]' : 'bg-[#ffffff] border-[#e0e0e0]'
          }`}
        >
          <div className="text-lg font-bold text-indigo-400 font-mono">{stats.subtopicCount}</div>
          <div className="text-[11px] text-[#888888] font-medium uppercase tracking-wider mt-0.5">
            Subtopics
          </div>
        </div>

        <div
          className={`p-3 rounded border text-center ${
            theme === 'dark' ? 'bg-[#252526] border-[#333333]' : 'bg-[#ffffff] border-[#e0e0e0]'
          }`}
        >
          <div className="text-lg font-bold text-purple-400 font-mono">{stats.prerequisiteCount}</div>
          <div className="text-[11px] text-[#888888] font-medium uppercase tracking-wider mt-0.5">
            Prereqs
          </div>
        </div>
      </div>
    </div>
  );
}
