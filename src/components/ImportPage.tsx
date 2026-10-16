/**
 * AI Syllabus Extraction & JSON Import Hub.
 *
 * Implements:
 * - Direct destination selector
 * - Full-width line-numbered JSON code editor
 * - Collapsible AI Extraction prompt at the bottom
 * - High-contrast IDE styling
 */

import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Copy,
  Check,
  UploadCloud,
  FileCode,
  FolderInput,
  AlertCircle,
  Trash2,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Save,
  RotateCcw,
} from 'lucide-react';
import {
  CurriculumDocument,
  Subject,
  Unit,
  CurriculumGroup,
} from '../types/curriculum';
import {
  validateCurriculumDocument,
  ValidationResult,
} from '../schema/validation';
import { generateAIExtractionPrompt } from '../schema/promptGenerator';
import { useWorkspace } from '../context/WorkspaceContext';
import ExplorerSquareButton from './workspace/ExplorerSquareButton';

interface ImportPageProps {
  currentDocument: CurriculumDocument;
  onImportSuccess: (importedDoc: CurriculumDocument, destination: string) => void;
  defaultDestination?: string;
}

export default function ImportPage({
  currentDocument,
  onImportSuccess,
  defaultDestination = 'root',
}: ImportPageProps) {
  const { theme } = useWorkspace();
  const [jsonInput, setJsonInput] = useState<string>('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<string>(defaultDestination);
  const [autoDetectedLabel, setAutoDetectedLabel] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [isPromptDropdownOpen, setIsPromptDropdownOpen] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Synchronize scroll between textarea and line numbers
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Generate line numbers
  const lineNumbers = useMemo(() => {
    const lines = jsonInput.split('\n');
    return Array.from({ length: Math.max(lines.length, 1) }, (_, i) => i + 1);
  }, [jsonInput]);

  // Destination Options: Ensure Grades are ALWAYS available and prominently selectable for every subject
  const destinationOptions = useMemo(() => {
    const options: { value: string; label: string; type: 'root' | 'subject' | 'grade' | 'unit'; subjectName?: string }[] = [
      { value: 'root', label: 'Entire Curriculum (Merge/Append to Root)', type: 'root' },
    ];

    currentDocument.subjects?.forEach((subject: Subject) => {
      // Grade / Group Containers
      const groups: CurriculumGroup[] = subject.groups && subject.groups.length > 0
        ? subject.groups
        : [
            { id: `${subject.id}-g09`, name: 'Grade 9', type: 'grade' as const, gradeLevel: 9, units: [] },
            { id: `${subject.id}-g10`, name: 'Grade 10', type: 'grade' as const, gradeLevel: 10, units: [] },
            { id: `${subject.id}-g11`, name: 'Grade 11', type: 'grade' as const, gradeLevel: 11, units: [] },
            { id: `${subject.id}-g12`, name: 'Grade 12', type: 'grade' as const, gradeLevel: 12, units: [] },
          ];

      groups.forEach((group: CurriculumGroup) => {
        const groupLabel = group.name.toLowerCase().includes('grade') || group.name.toLowerCase().includes('year')
          ? group.name
          : `Grade: ${group.name}`;

        options.push({
          value: `grade:${subject.id}:${group.id}`,
          label: `${subject.name} › ${groupLabel}`,
          type: 'grade',
          subjectName: subject.name,
        });

        // 3. Unit Container
        group.units?.forEach((unit: Unit) => {
          options.push({
            value: `unit:${subject.id}:${group.id}:${unit.id}`,
            label: `${subject.name} › ${groupLabel} › Unit: ${unit.name}`,
            type: 'unit',
            subjectName: subject.name,
          });
        });
      });
    });

    return options;
  }, [currentDocument]);

  // Target selector resolution: Subject and Grade helpers
  const targetSubjectId = useMemo(() => {
    if (selectedDestination.startsWith('grade:')) return selectedDestination.split(':')[1];
    if (selectedDestination.startsWith('subject:')) return selectedDestination.split(':')[1];
    if (selectedDestination.startsWith('unit:')) return selectedDestination.split(':')[1];
    return 'root';
  }, [selectedDestination]);

  const targetGroupId = useMemo(() => {
    if (selectedDestination.startsWith('grade:')) return selectedDestination.split(':')[2];
    if (selectedDestination.startsWith('unit:')) return selectedDestination.split(':')[2];
    return 'all';
  }, [selectedDestination]);

  const currentSubject = useMemo(() => {
    return currentDocument.subjects?.find((s) => s.id === targetSubjectId);
  }, [currentDocument, targetSubjectId]);

  const availableGradeOptions = useMemo(() => {
    if (!currentSubject) return [];
    if (currentSubject.groups && currentSubject.groups.length > 0) {
      return currentSubject.groups;
    }
    return [
      { id: `${currentSubject.id}-g09`, name: 'Grade 9', type: 'grade' as const, gradeLevel: 9, units: [] },
      { id: `${currentSubject.id}-g10`, name: 'Grade 10', type: 'grade' as const, gradeLevel: 10, units: [] },
      { id: `${currentSubject.id}-g11`, name: 'Grade 11', type: 'grade' as const, gradeLevel: 11, units: [] },
      { id: `${currentSubject.id}-g12`, name: 'Grade 12', type: 'grade' as const, gradeLevel: 12, units: [] },
    ];
  }, [currentSubject]);

  const handleSubjectChange = (newSubjectId: string) => {
    if (newSubjectId === 'root') {
      setSelectedDestination('root');
    } else {
      setSelectedDestination(`subject:${newSubjectId}`);
    }
  };

  const handleGradeChange = (newGroupId: string) => {
    if (newGroupId === 'all') {
      setSelectedDestination(`subject:${targetSubjectId}`);
    } else {
      setSelectedDestination(`grade:${targetSubjectId}:${newGroupId}`);
    }
  };

  const targetDisplayBadge = useMemo(() => {
    if (selectedDestination === 'root') {
      return 'Entire Curriculum (Root)';
    }
    if (selectedDestination.startsWith('subject:')) {
      const s = currentDocument.subjects?.find((sub) => sub.id === targetSubjectId);
      return `${s?.name || targetSubjectId} (All Grades)`;
    }
    if (selectedDestination.startsWith('grade:')) {
      const s = currentDocument.subjects?.find((sub) => sub.id === targetSubjectId);
      const g = availableGradeOptions.find((grp) => grp.id === targetGroupId);
      return `${s?.name || targetSubjectId} › ${g?.name || targetGroupId}`;
    }
    return selectedDestination;
  }, [selectedDestination, targetSubjectId, targetGroupId, currentDocument, availableGradeOptions]);

  const handleJsonChange = (val: string) => {
    setJsonInput(val);
    setStatusMessage(null);
    if (!val.trim()) {
      setValidationResult(null);
      setAutoDetectedLabel(null);
      return;
    }

    try {
      const parsed = JSON.parse(val);
      const res = validateCurriculumDocument(parsed);
      setValidationResult(res);

      if (res.valid) {
        if (Array.isArray(parsed.subjects)) {
          setAutoDetectedLabel(`Full Curriculum (${parsed.subjects.length} subjects detected)`);
        } else if (parsed.type === 'subject' || parsed.units) {
          setAutoDetectedLabel(`Subject Document (${parsed.name || 'Untitled'})`);
        } else if (parsed.topics || Array.isArray(parsed)) {
          setAutoDetectedLabel(`Unit Document (${parsed.name || 'Topics List'})`);
        }
      } else {
        setAutoDetectedLabel(null);
      }
    } catch {
      setValidationResult({
        valid: false,
        errors: [{ level: 'error', code: 'JSON_SYNTAX_ERROR', path: '$', message: 'Invalid JSON syntax. Ensure matching brackets and quotation marks.' }],
        warnings: [],
        info: [],
        stats: {
          subjectCount: 0,
          groupCount: 0,
          unitCount: 0,
          topicCount: 0,
          subtopicCount: 0,
          totalCurriculumEntities: 0,
          rankingProfileCount: 0,
          rankingAssignmentCount: 0,
          prerequisiteCount: 0,
          crossGradePrerequisiteCount: 0,
          crossSubjectPrerequisiteCount: 0,
          bySubject: {},
        },
      });
      setAutoDetectedLabel(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleJsonChange(content);
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    const sample = {
      title: "Science & Engineering Foundations",
      subjects: [
        {
          id: "sub_phys_core",
          name: "Physics (Advanced Placement)",
          code: "PHYS",
          units: [
            {
              id: "unit_mechanics_1",
              name: "Classical Mechanics",
              topics: [
                {
                  id: "top_kinematics",
                  name: "1D & 2D Kinematics and Projectile Motion",
                  difficulty: "medium",
                  importance: "high",
                  hours: 6
                },
                {
                  id: "top_newton_laws",
                  name: "Newton's Laws of Motion & Free Body Analysis",
                  difficulty: "medium",
                  importance: "high",
                  hours: 8
                }
              ]
            }
          ]
        }
      ]
    };
    handleJsonChange(JSON.stringify(sample, null, 2));
  };

  // Base AI Extraction Prompt (looks on kehulum.com)
  const defaultPromptText = useMemo(() => {
    return generateAIExtractionPrompt({
      subjectHint: selectedDestination !== 'root' ? selectedDestination : undefined,
      includeTemplate: true,
    });
  }, [selectedDestination]);

  // Editable prompt state with localStorage persistence
  const [customPrompt, setCustomPrompt] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('curriculum_custom_ai_prompt');
      if (saved && saved.trim()) return saved;
    } catch {
      // ignore
    }
    return '';
  });

  const [promptSavedStatus, setPromptSavedStatus] = useState<boolean>(false);

  // Active prompt is either the user's saved/edited prompt or the default kehulum.com prompt
  const activePromptText = customPrompt || defaultPromptText;

  const handleSaveCustomPrompt = () => {
    try {
      localStorage.setItem('curriculum_custom_ai_prompt', activePromptText);
      setPromptSavedStatus(true);
      setTimeout(() => setPromptSavedStatus(false), 2200);
    } catch {
      // ignore
    }
  };

  const handleResetCustomPrompt = () => {
    try {
      localStorage.removeItem('curriculum_custom_ai_prompt');
    } catch {
      // ignore
    }
    setCustomPrompt('');
    setPromptSavedStatus(false);
  };

  // Single dedicated Copy Prompt handler
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(activePromptText);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleExecuteImport = () => {
    if (!validationResult || !validationResult.valid) {
      setStatusMessage({
        type: 'error',
        text: 'Cannot import: Payload contains JSON or schema errors.',
      });
      return;
    }

    try {
      const parsed = JSON.parse(jsonInput);
      onImportSuccess(parsed, selectedDestination);
      setStatusMessage({
        type: 'success',
        text: 'Imported successfully into curriculum workspace!',
      });
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Unexpected error processing import.',
      });
    }
  };

  // Always open from the top
  useEffect(() => {
    textareaRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  return (
    <div
      id="vscode-import-workspace"
      className={`flex flex-col h-full w-full font-sans select-none overflow-hidden min-h-0 ${
        theme === 'dark' ? 'bg-[#131314] text-[#e3e3e3]' : 'bg-[#f8f9fa] text-[#24292f]'
      }`}
    >
      {/* 1. Destination Selector & Action Toolbar: Clean single-line layout with Explorer square button flush at top-left */}
      <div
        className={`h-11 sm:h-12 border-b shrink-0 flex items-center justify-between gap-2 text-xs transition-colors z-20 pr-2.5 sm:pr-4 overflow-x-auto scrollbar-none ${
          theme === 'dark' ? 'bg-[#131314] border-[#222425]' : 'bg-white border-[#e5e7eb]'
        }`}
      >
        {/* Left: Explorer Square Button & Target Selector */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 h-full">
          <ExplorerSquareButton />

          <div className="flex items-center gap-1.5 font-semibold text-inherit shrink-0 pl-1">
            <FolderInput className="w-6 h-6 sm:w-6.5 sm:h-6.5 text-[#007acc] shrink-0" />
            <span className="hidden xs:inline">Target:</span>
          </div>

          {/* Unified Target Selection Dropdown Menu */}
          <select
            id="destination-dropdown"
            value={selectedDestination}
            onChange={(e) => setSelectedDestination(e.target.value)}
            className={`h-8 px-2 border rounded-lg text-xs font-medium focus:border-[#007acc] outline-none cursor-pointer w-32 xs:w-44 sm:w-56 md:w-64 truncate shrink-0 ${
              theme === 'dark'
                ? 'bg-[#252526] border-[#38383a] text-slate-200'
                : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
            title="Choose target curriculum container, subject, or grade level"
          >
            <option value="root">Entire Curriculum (All Subjects / Root)</option>
            {currentDocument.subjects?.map((subject) => {
              const groups: CurriculumGroup[] =
                subject.groups && subject.groups.length > 0
                  ? subject.groups
                  : [
                      { id: `${subject.id}-g09`, name: 'Grade 9', type: 'grade' as const, gradeLevel: 9, units: [] },
                      { id: `${subject.id}-g10`, name: 'Grade 10', type: 'grade' as const, gradeLevel: 10, units: [] },
                      { id: `${subject.id}-g11`, name: 'Grade 11', type: 'grade' as const, gradeLevel: 11, units: [] },
                      { id: `${subject.id}-g12`, name: 'Grade 12', type: 'grade' as const, gradeLevel: 12, units: [] },
                    ];

              return (
                <optgroup key={subject.id} label={`Subject: ${subject.name}`}>
                  {groups.map((group) => {
                    const groupLabel =
                      group.name.toLowerCase().includes('grade') || group.name.toLowerCase().includes('year')
                        ? group.name
                        : `Grade: ${group.name}`;

                    return (
                      <option key={group.id} value={`grade:${subject.id}:${group.id}`}>
                        &nbsp;&nbsp;↳ {groupLabel}
                      </option>
                    );
                  })}
                </optgroup>
              );
            })}
          </select>
        </div>

        {/* Center: Live Schema Status & Destination Badge */}
        <div className="flex-1 min-w-0 hidden lg:flex items-center justify-center px-2">
          {validationResult && validationResult.valid ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 truncate">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {autoDetectedLabel || `${validationResult.stats.topicCount} topics ready to import`}
              </span>
            </div>
          ) : jsonInput.trim() ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/25 truncate">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">JSON syntax or schema error</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] text-slate-400 border border-inherit/20 truncate">
              <span>Target: {targetDisplayBadge}</span>
            </div>
          )}
        </div>

        {/* Right: Upload File and Primary Import Action on the same line */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 justify-end">
          <label className={`h-8 px-2.5 sm:px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
            theme === 'dark'
              ? 'bg-[#252526] hover:bg-[#2d2d2e] border-[#38383a] text-slate-200'
              : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
          }`}>
            <UploadCloud className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="hidden xs:inline">Upload File</span>
            <input
              type="file"
              accept=".json,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            id="import-execute-btn"
            onClick={handleExecuteImport}
            disabled={!validationResult || !validationResult.valid}
            className={`h-8 px-3 sm:px-3.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs shrink-0 ${
              validationResult && validationResult.valid
                ? 'bg-[#007acc] hover:bg-[#0066b8] text-white cursor-pointer shadow-sm'
                : 'bg-slate-200 text-slate-400 dark:bg-[#252526] dark:text-slate-600 cursor-not-allowed border border-transparent'
            }`}
          >
            <FolderInput className="w-3.5 h-3.5 shrink-0" />
            <span>Import</span>
          </button>
        </div>
      </div>

      {/* Status banner if present */}
      {statusMessage && (
        <div
          className={`flex items-center gap-2 px-4 py-1.5 border-b text-xs font-mono shrink-0 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-800/60 text-emerald-300'
              : statusMessage.type === 'error'
              ? 'bg-rose-950/80 border-rose-800/60 text-rose-300'
              : 'bg-sky-950/80 border-sky-800/60 text-sky-300'
          }`}
        >
          {statusMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* 2. Full-Width Line-Numbered JSON Payload Editor (Main body) */}
      <div className={`flex-1 min-h-0 flex flex-col overflow-hidden ${
        theme === 'dark' ? 'bg-[#181818]' : 'bg-[#ffffff]'
      }`}>
        {/* Editor Header Bar */}
        <div className={`flex items-center justify-between px-4 py-2 border-b text-[11px] shrink-0 font-mono ${
          theme === 'dark'
            ? 'bg-[#1f1f1f] border-[#2b2b2b] text-slate-400'
            : 'bg-slate-100 border-slate-200 text-slate-600'
        }`}>
          <span className="flex items-center gap-1.5 font-semibold text-inherit">
            <FileCode className="w-3.5 h-3.5 text-[#007acc]" />
            JSON PAYLOAD EDITOR
          </span>
          <div className="flex items-center gap-3">
            <span>{jsonInput.split('\n').length} lines</span>
            {jsonInput && (
              <button
                onClick={() => handleJsonChange('')}
                className="text-rose-400 hover:text-rose-500 hover:underline flex items-center gap-1 cursor-pointer font-sans text-xs ml-1 transition-colors"
                title="Clear all editor text"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Editor Container with Line Numbers */}
        <div className="flex-1 min-h-0 flex overflow-hidden relative">
          {/* Line Numbers Gutter */}
          <div
            ref={lineNumbersRef}
            className={`w-11 select-none py-2.5 px-2 text-right font-mono text-xs overflow-hidden shrink-0 border-r ${
              theme === 'dark'
                ? 'bg-[#1a1a1a] border-[#2b2b2b] text-slate-500'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
            aria-hidden="true"
          >
            {lineNumbers.map((num) => (
              <div key={num} className="leading-5 h-5">
                {num}
              </div>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            id="syllabus-json-textarea"
            value={jsonInput}
            onChange={(e) => handleJsonChange(e.target.value)}
            onScroll={handleScroll}
            placeholder={`// Paste the JSON returned by the AI here.
// 1. Expand the "AI Extraction prompt" dropdown below.
// 2. Click "Copy Prompt" and paste into Gemini, ChatGPT, or Claude to look up the course on kehulum.com.
// 3. The AI will look up the syllabus on kehulum.com and output the curriculum JSON inside a copy box (\`\`\`json). Click "Copy code" in the AI chat and paste it here!
// 4. Click the "Import" button in the top toolbar.`}
            spellCheck={false}
            className={`flex-1 h-full w-full p-2.5 font-mono text-xs outline-none resize-none leading-5 overflow-auto selection:bg-[#007acc]/30 ${
              theme === 'dark'
                ? 'bg-[#181818] text-[#d4d4d4]'
                : 'bg-white text-slate-800'
            }`}
          />
        </div>
      </div>

      {/* 3. Collapsible AI Extraction Prompt Drawer AT THE BOTTOM */}
      <div className={`border-t shrink-0 ${
        theme === 'dark' ? 'bg-[#1f1f1f] border-[#2b2b2b]' : 'bg-white border-slate-200'
      }`}>
        <div
          onClick={() => setIsPromptDropdownOpen(!isPromptDropdownOpen)}
          className={`w-full px-4 py-2.5 flex items-center justify-between cursor-pointer transition-colors text-xs select-none ${
            theme === 'dark' ? 'hover:bg-[#252526]' : 'hover:bg-slate-50'
          }`}
          title="Click to toggle AI syllabus extraction prompt (Look up on kehulum.com)"
        >
          {/* Left: AI Icon and Title */}
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="font-semibold text-xs sm:text-sm text-inherit">AI Extraction Prompt</span>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20 hidden sm:inline">
              kehulum.com
            </span>
          </div>

          {/* Right: The SINGLE Copy Prompt Button & Chevron (No duplicate anywhere) */}
          <div className="flex items-center gap-2">
            <button
              id="import-copy-prompt-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleCopyPrompt();
              }}
              className={`h-7 px-3 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs ${
                copiedPrompt
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#007acc] hover:bg-[#0066b8] text-white'
              }`}
              title="Copy extraction prompt to clipboard"
            >
              {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedPrompt ? 'Copied' : 'Copy Prompt'}</span>
            </button>
            <div className="p-0.5 rounded text-slate-400">
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isPromptDropdownOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </div>

        {/* Dropdown Content - Fully Editable and Saveable */}
        {isPromptDropdownOpen && (
          <div className="p-3.5 border-t border-[#2d2d2d] bg-[#1a1a1a] flex flex-col gap-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-[11.5px] text-[#9cdcfe]">
                The syllabus is online on <strong>kehulum.com</strong> (no file attachment needed). Edit the prompt below if desired, save your changes, or click <strong>Copy Prompt</strong> above:
              </p>

              {/* Action buttons: Save Prompt and Reset */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  id="import-save-prompt-btn"
                  onClick={handleSaveCustomPrompt}
                  className={`px-3 py-1 text-xs font-semibold rounded flex items-center gap-1.5 transition-all cursor-pointer ${
                    promptSavedStatus
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30'
                  }`}
                  title="Save edited prompt to local storage"
                >
                  {promptSavedStatus ? <Check className="w-3 h-3 text-white" /> : <Save className="w-3 h-3" />}
                  <span>{promptSavedStatus ? 'Saved!' : 'Save Prompt'}</span>
                </button>

                {customPrompt && (
                  <button
                    onClick={handleResetCustomPrompt}
                    className="px-2.5 py-1 text-xs font-medium rounded text-slate-400 hover:text-slate-200 bg-[#252526] hover:bg-[#2d2d2e] border border-[#38383a] flex items-center gap-1 transition-colors cursor-pointer"
                    title="Reset prompt back to default kehulum.com prompt"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Editable Prompt Textarea */}
            <div className="relative">
              <textarea
                id="ai-editable-prompt-box"
                value={activePromptText}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={9}
                className="w-full p-3 rounded-lg bg-[#141414] border border-[#2d2d2d] focus:border-sky-500/60 font-mono text-[11px] leading-relaxed text-[#9cdcfe] outline-none resize-y select-text selection:bg-[#264f78]"
                placeholder="Type or customize your AI syllabus extraction prompt..."
              />
            </div>
            <div className="flex items-center justify-between text-[10.5px] text-slate-500 font-mono px-0.5">
              <span>Characters: {activePromptText.length}</span>
              <span>AI output instruction: JSON enclosed inside ```json copy box</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
