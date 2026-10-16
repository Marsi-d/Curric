/**
 * Study Roadmap Export Modal.
 *
 * Provides instant preview, 1-click clipboard copy, and file download
 * for Markdown (.md), structured JSON (.json), and CSV (.csv).
 * 100% offline via standard browser Blobs.
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  FileCode,
  FileSpreadsheet,
  FileText,
  Layers,
  Sparkles,
} from 'lucide-react';
import { StudyRoadmap } from '../../types/roadmap';
import { CurriculumDocument } from '../../types/curriculum';
import {
  exportRoadmapMarkdown,
  exportRoadmapJson,
  exportRoadmapCsv,
} from '../../utils/roadmapUtils';

interface RoadmapExportModalProps {
  roadmap: StudyRoadmap;
  doc: CurriculumDocument;
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
}

type ExportFormat = 'markdown' | 'json' | 'csv';

export default function RoadmapExportModal({
  roadmap,
  doc,
  isOpen,
  onClose,
  theme,
}: RoadmapExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [copied, setCopied] = useState(false);

  const previewText = useMemo(() => {
    switch (format) {
      case 'markdown':
        return exportRoadmapMarkdown(roadmap, doc);
      case 'json':
        return exportRoadmapJson(roadmap, doc);
      case 'csv':
        return exportRoadmapCsv(roadmap, doc);
    }
  }, [format, roadmap, doc]);

  if (!isOpen) return null;

  const getFileExtension = () => {
    switch (format) {
      case 'markdown':
        return 'md';
      case 'json':
        return 'json';
      case 'csv':
        return 'csv';
    }
  };

  const getMimeType = () => {
    switch (format) {
      case 'markdown':
        return 'text/markdown;charset=utf-8';
      case 'json':
        return 'application/json;charset=utf-8';
      case 'csv':
        return 'text/csv;charset=utf-8';
    }
  };

  const handleDownload = () => {
    const ext = getFileExtension();
    const mime = getMimeType();
    const blob = new Blob([previewText], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = roadmap.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    link.href = url;
    link.download = `${safeName}-${new Date().toISOString().slice(0, 10)}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(previewText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback copy
      const textArea = document.createElement('textarea');
      textArea.value = previewText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const totalTopics = roadmap.phases.reduce((acc, p) => acc + p.topicIds.length, 0);

  return (
    <div
      id="roadmap-export-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        id="roadmap-export-modal-dialog"
        className={`w-full max-w-3xl rounded-xl shadow-2xl border flex flex-col max-h-[85vh] overflow-hidden ${
          theme === 'dark'
            ? 'bg-[#1e1e1e] border-[#333333] text-white'
            : 'bg-white border-[#e5e5e5] text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between shrink-0 ${
            theme === 'dark' ? 'border-[#2d2d2d] bg-[#252526]' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight">Export Study Roadmap</h2>
              <p className="text-xs text-slate-400">
                {roadmap.phases.length} Phases • {totalTopics} Scheduled Topics
              </p>
            </div>
          </div>
          <button
            id="roadmap-export-close-btn"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'hover:bg-[#333333] text-slate-400 hover:text-white'
                : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format Selector Pills */}
        <div
          className={`px-5 py-3 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
            theme === 'dark' ? 'border-[#2d2d2d] bg-[#1e1e1e]' : 'border-slate-200 bg-slate-100/50'
          }`}
        >
          <div className="flex items-center gap-2">
            <button
              id="roadmap-export-format-markdown"
              onClick={() => setFormat('markdown')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                format === 'markdown'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : theme === 'dark'
                  ? 'bg-[#2a2a2a] text-slate-300 hover:bg-[#333333]'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Markdown (.md)</span>
            </button>
            <button
              id="roadmap-export-format-json"
              onClick={() => setFormat('json')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                format === 'json'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : theme === 'dark'
                  ? 'bg-[#2a2a2a] text-slate-300 hover:bg-[#333333]'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>JSON (.json)</span>
            </button>
            <button
              id="roadmap-export-format-csv"
              onClick={() => setFormat('csv')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                format === 'csv'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : theme === 'dark'
                  ? 'bg-[#2a2a2a] text-slate-300 hover:bg-[#333333]'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>CSV (.csv)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="roadmap-copy-btn"
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                theme === 'dark'
                  ? 'bg-[#2d2d2d] hover:bg-[#3d3d3d] text-slate-200'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
            <button
              id="roadmap-download-btn"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#007acc] hover:bg-[#0066b8] text-white transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .{getFileExtension()}</span>
            </button>
          </div>
        </div>

        {/* Code / Text Preview */}
        <div className="flex-1 p-4 overflow-hidden flex flex-col">
          <div className="text-[11px] font-mono text-slate-400 mb-2 flex items-center justify-between">
            <span>PREVIEW</span>
            <span>{previewText.split('\n').length} lines</span>
          </div>
          <pre
            id="roadmap-export-preview"
            className={`flex-1 overflow-auto p-3.5 rounded-lg text-[11px] font-mono leading-relaxed border select-text ${
              theme === 'dark'
                ? 'bg-[#141414] border-[#2d2d2d] text-slate-300'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            {previewText}
          </pre>
        </div>
      </div>
    </div>
  );
}
