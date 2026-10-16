/**
 * Workspace Tabs Component.
 *
 * Implements:
 * - IDE-style horizontal tab bar
 * - Active tab highlight & top accent indicator
 * - Tab close buttons (x)
 * - Mobile horizontal touch scrolling
 * - Distinct icons for Curriculum overview, Subject view, and Topic editor
 */

import React, { useRef, useEffect } from 'react';
import {
  X,
  Layers,
  BookOpen,
  FileText,
  UploadCloud,
  CheckCircle2,
  MoreHorizontal,
} from 'lucide-react';
import ExplorerSquareButton from './ExplorerSquareButton';
import { useWorkspace } from '../../context/WorkspaceContext';
import { WorkspaceTab } from '../../types/workspace';

export default function WorkspaceTabs() {
  const {
    theme,
    openTabs,
    activeTabId,
    setActiveTabId,
    closeTab,
  } = useWorkspace();

  const activeTabRef = useRef<HTMLDivElement>(null);

  // Auto-scroll tab into view when active tab changes
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [activeTabId]);

  const getTabIcon = (type: WorkspaceTab['type']) => {
    switch (type) {
      case 'curriculum':
        return <Layers className="w-3.5 h-3.5 text-[#007acc]" />;
      case 'subject':
        return <BookOpen className="w-3.5 h-3.5 text-amber-400" />;
      case 'topic':
        return <FileText className="w-3.5 h-3.5 text-sky-400" />;
      case 'import':
        return <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />;
      case 'validation':
        return <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <FileText className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div
      id="workspace-tabs-bar"
      className={`h-11 border-b flex items-center shrink-0 select-none overflow-x-auto scrollbar-none ${
        theme === 'dark'
          ? 'bg-[#181818] border-[#2b2b2b]'
          : 'bg-[#ececec] border-[#d8d8d8]'
      }`}
    >
      {/* 1. Explorer Square Button flush at top-left corner */}
      <div className="flex items-center h-full shrink-0">
        <ExplorerSquareButton />
      </div>

      {/* 2. Tabs Container */}
      <div className="flex-1 flex items-center h-full overflow-x-auto scrollbar-none">
        <div className="flex items-center h-full shrink-0">
          {openTabs.map((tab) => {
          const isActive = tab.id === activeTabId;

          return (
            <div
              key={tab.id}
              ref={isActive ? activeTabRef : null}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTabId(tab.id)}
              className={`group relative h-full flex items-center gap-1.5 px-3 border-r cursor-pointer text-xs transition-colors shrink-0 max-w-[200px] sm:max-w-[240px] ${
                isActive
                  ? theme === 'dark'
                    ? 'bg-[#1e1e1e] text-white border-r-[#2b2b2b] font-medium'
                    : 'bg-[#ffffff] text-[#1e1e1e] border-r-[#d8d8d8] font-medium'
                  : theme === 'dark'
                  ? 'bg-[#181818] text-[#969696] hover:bg-[#1f1f1f] hover:text-[#cccccc] border-r-[#2b2b2b]'
                  : 'bg-[#ececec] text-[#616161] hover:bg-[#e0e0e0] hover:text-[#1e1e1e] border-r-[#d8d8d8]'
              }`}
              title={tab.title}
            >
              {/* Active top line indicator */}
              {isActive && (
                <span className="absolute top-0 left-0 right-0 h-[2px] bg-[#007acc]" />
              )}

              {/* Tab Icon */}
              <span className="shrink-0">{getTabIcon(tab.type)}</span>

              {/* Tab Title */}
              <span className="truncate text-xs">{tab.title}</span>

              {/* Close Button */}
              <button
                id={`tab-close-${tab.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className={`ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                  isActive ? 'opacity-70 hover:opacity-100' : ''
                } ${
                  theme === 'dark'
                    ? 'hover:bg-[#333333] text-slate-400 hover:text-white'
                    : 'hover:bg-[#dddddd] text-slate-600 hover:text-black'
                }`}
                title="Close (Ctrl+W)"
                aria-label={`Close ${tab.title} tab`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
