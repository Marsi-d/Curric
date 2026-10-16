/**
 * Global Search Modal (Command Palette / Quick Open Style).
 *
 * Implements:
 * - Search across all Subjects, Grades, Units, Topics, Subtopics
 * - Clear hierarchical path visualization in results:
 *   e.g. Quadratic Equations › Mathematics › Grade 10 › Unit 3 — Algebra
 * - Keyboard navigation (Up/Down arrows, Enter to select, Esc to close)
 * - Mobile friendly full-screen or sheet modal
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  FileText,
  BookOpen,
  Folder,
  Layers,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { CurriculumSearchResult } from '../../types/workspace';
import QuickRankTiles from './QuickRankTiles';

export default function GlobalSearchModal() {
  const {
    theme,
    isSearchModalOpen,
    setIsSearchModalOpen,
    searchCurriculum,
    openTab,
    expandToItem,
  } = useWorkspace();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results: CurriculumSearchResult[] = searchCurriculum(query);

  // Focus on open
  useEffect(() => {
    if (isSearchModalOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [isSearchModalOpen]);

  // Keyboard shortcut listener (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(!isSearchModalOpen);
      }
      if (e.key === 'Escape' && isSearchModalOpen) {
        setIsSearchModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchModalOpen, setIsSearchModalOpen]);

  // Arrow key navigation inside modal
  const handleKeyDownInList = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelectResult(results[selectedIndex]);
    }
  };

  const handleSelectResult = (item: CurriculumSearchResult) => {
    setIsSearchModalOpen(false);

    if (item.topicId) {
      expandToItem(item.topicId);
      openTab(
        {
          id: `topic-${item.topicId}`,
          title: item.name,
          type: 'topic',
          subjectId: item.subjectId,
          groupId: item.groupId,
          unitId: item.unitId,
          topicId: item.topicId,
          isPinned: true,
        },
        true
      );
    } else if (item.subjectId) {
      expandToItem(item.subjectId);
      openTab(
        {
          id: `subject-${item.subjectId}`,
          title: item.name,
          type: 'subject',
          subjectId: item.subjectId,
          isPinned: true,
        },
        true
      );
    } else {
      expandToItem(item.id);
    }
  };

  if (!isSearchModalOpen) return null;

  return (
    <div
      id="global-search-modal"
      className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-20 px-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100"
      onClick={() => setIsSearchModalOpen(false)}
    >
      <div
        className={`w-full max-w-2xl rounded-lg shadow-2xl border overflow-hidden flex flex-col max-h-[80vh] ${
          theme === 'dark'
            ? 'bg-[#1f1f1f] border-[#3c3c3c] text-[#cccccc]'
            : 'bg-[#ffffff] border-[#d0d7de] text-[#1e1e1e]'
        }`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDownInList}
      >
        {/* Search Input Bar */}
        <div
          className={`flex items-center px-3.5 py-2.5 border-b gap-2.5 shrink-0 ${
            theme === 'dark' ? 'border-[#333333]' : 'border-[#e5e5e5]'
          }`}
        >
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            id="global-search-input"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search subjects, grades, units, topics, subtopics... (e.g. Algebra, Calculus)"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500 font-sans"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsSearchModalOpen(false)}
            className="p-1 text-slate-400 hover:text-white rounded cursor-pointer transition-colors"
            title="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
          {query.trim() === '' ? (
            <div className="py-8 text-center text-slate-500 space-y-1">
              <p className="font-medium text-xs">Search your entire curriculum</p>
              <p className="text-[11px]">Type keywords to find topics, units, or grades</p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              No curriculum elements matching <span className="font-semibold text-inherit">&quot;{query}&quot;</span>
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={`${item.entityType}-${item.id}-${idx}`}
                  id={`search-result-${item.id}`}
                  onClick={() => handleSelectResult(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3 py-2 rounded cursor-pointer transition-colors flex items-center justify-between ${
                    isSelected
                      ? theme === 'dark'
                        ? 'bg-[#094771] text-white'
                        : 'bg-[#007acc] text-white'
                      : theme === 'dark'
                      ? 'hover:bg-[#2a2d2e]'
                      : 'hover:bg-[#f0f0f0]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate pr-2">
                    <span className="shrink-0">
                      {item.entityType === 'subject' && <Folder className="w-4 h-4 text-amber-400" />}
                      {item.entityType === 'group' && <Folder className="w-4 h-4 text-amber-300" />}
                      {item.entityType === 'unit' && <BookOpen className="w-4 h-4 text-sky-400" />}
                      {item.entityType === 'topic' && <FileText className="w-4 h-4 text-[#007acc]" />}
                      {item.entityType === 'subtopic' && <Layers className="w-4 h-4 text-indigo-400" />}
                    </span>

                    <div className="truncate">
                      <div className="font-semibold text-xs truncate">{item.name}</div>
                      <div
                        className={`text-[10px] truncate flex items-center gap-1 mt-0.5 ${
                          isSelected ? 'text-blue-100' : 'text-[#888888]'
                        }`}
                      >
                        {item.pathSegments.join(' › ')}
                      </div>
                      {item.entityType === 'topic' && (
                        <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
                          <QuickRankTiles
                            topicId={item.id}
                            topicName={item.name}
                            size="sm"
                            showLabel={true}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1 ml-2">
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-700/20 text-slate-400'
                      }`}
                    >
                      {item.entityType}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div
          className={`px-3 py-1.5 border-t text-[10px] text-slate-500 flex items-center justify-between font-mono shrink-0 ${
            theme === 'dark' ? 'border-[#333333] bg-[#1a1a1a]' : 'border-[#e5e5e5] bg-[#f9f9f9]'
          }`}
        >
          <span>Tap or click any item to open in workspace</span>
          <span>{results.length} result(s)</span>
        </div>
      </div>
    </div>
  );
}
