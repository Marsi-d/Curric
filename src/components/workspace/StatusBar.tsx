/**
 * Bottom IDE Status Bar.
 */

import React, { useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  FolderTree,
  FileText,
  Sun,
  Moon,
  Database,
  Layers,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { validateCurriculumDocument } from '../../schema/validation';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export default function StatusBar() {
  const isOnline = useOnlineStatus();
  const {
    theme,
    toggleTheme,
    curriculumDoc,
    selectedItemId,
    isExplorerCollapsed,
    toggleExplorer,
    isMobileDrawerOpen,
    setIsMobileDrawerOpen,
  } = useWorkspace();

  const validation = useMemo(
    () => validateCurriculumDocument(curriculumDoc),
    [curriculumDoc]
  );

  return (
    <footer
      id="workspace-status-bar"
      className={`h-6 px-3 border-t flex items-center justify-between text-[11px] select-none shrink-0 font-mono z-20 ${
        theme === 'dark'
          ? 'bg-[#007acc] text-white border-[#0066b8]'
          : 'bg-[#007acc] text-white border-[#0066b8]'
      }`}
      aria-label="Status Bar"
    >
      {/* Left side items */}
      <div className="flex items-center gap-3 truncate">
        {/* Mobile Explorer Drawer Trigger */}
        <button
          onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
          className="md:hidden flex items-center gap-1 hover:bg-white/10 px-1.5 py-0.5 rounded transition-colors"
          title="Toggle Explorer Drawer"
        >
          <FolderTree className="w-3 h-3" />
          <span>Explorer</span>
        </button>

        {/* Desktop Explorer Toggle */}
        <button
          onClick={toggleExplorer}
          className="hidden md:flex items-center gap-1 hover:bg-white/10 px-1.5 py-0.5 rounded transition-colors"
          title="Toggle Explorer Panel"
        >
          <FolderTree className="w-3 h-3" />
          <span>{isExplorerCollapsed ? 'Show Tree' : 'Hide Tree'}</span>
        </button>

        <span className="hidden sm:inline opacity-70">|</span>

        {/* Schema Version */}
        <div className="flex items-center gap-1">
          <Database className="w-3 h-3" />
          <span>Schema v{curriculumDoc.schemaVersion}</span>
        </div>

        <span className="hidden sm:inline opacity-70">|</span>

        {/* Topic stats */}
        <div className="flex items-center gap-1 truncate">
          <Layers className="w-3 h-3" />
          <span>{validation.stats.topicCount} Topics</span>
          <span className="hidden sm:inline text-white/80">
            ({validation.stats.subjectCount} Subjects)
          </span>
        </div>
      </div>

      {/* Right side items */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Offline Status */}
        <div
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
            isOnline
              ? 'bg-white/10 text-white/90'
              : 'bg-amber-400 text-slate-900 font-semibold'
          }`}
          title={isOnline ? 'Online & Offline Ready (PWA Cache active)' : 'Offline Mode — Changes saved locally in browser storage'}
        >
          {isOnline ? (
            <>
              <ShieldCheck className="w-3 h-3 text-emerald-200" />
              <span className="hidden sm:inline">Offline Ready</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-slate-900" />
              <span>Offline</span>
            </>
          )}
        </div>

        <span className="hidden sm:inline opacity-70">|</span>

        {/* Validation indicator */}
        <div className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-200" />
          <span>{validation.valid ? 'Validated' : 'Issues'}</span>
        </div>

        <span className="hidden sm:inline opacity-70">|</span>

        {/* Quick Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1 hover:bg-white/10 px-1.5 py-0.5 rounded transition-colors"
          title="Toggle Theme"
        >
          {theme === 'dark' ? (
            <>
              <Moon className="w-3 h-3" />
              <span className="hidden sm:inline">Dark</span>
            </>
          ) : (
            <>
              <Sun className="w-3 h-3 text-amber-200" />
              <span className="hidden sm:inline">Light</span>
            </>
          )}
        </button>
      </div>
    </footer>
  );
}
