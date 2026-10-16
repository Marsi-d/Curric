/**
 * Main Application Entry & IDE Workspace Container.
 *
 * Implements:
 * - Authentic IDE architecture with bottom Activity Bar
 * - Sleek Top Bar with title and quick search palette
 * - Collapsible Explorer Tree Panel
 * - Tabbed workspace editor with breadcrumbs
 * - Dedicated Study Roadmap planning layer
 * - Topic Ranking workspace
 * - AI Extraction & Import hub
 * - Settings & Universal App Size Adjuster
 */

import React, { useMemo, useRef, useEffect } from 'react';
import {
  FolderTree,
  ChevronRight,
} from 'lucide-react';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { VSCodeActivityBar } from './components/workspace/ActivityBar';
import ExplorerPanel from './components/workspace/ExplorerPanel';
import WorkspaceTabs from './components/workspace/WorkspaceTabs';
import CurriculumOverviewTab from './components/workspace/CurriculumOverviewTab';
import SubjectViewTab from './components/workspace/SubjectViewTab';
import TopicEditorTab from './components/workspace/TopicEditorTab';
import GlobalSearchModal from './components/workspace/GlobalSearchModal';
import RankingWorkspaceView from './components/workspace/RankingWorkspaceView';
import RoadmapWorkspaceView from './components/roadmap/RoadmapWorkspaceView';
import FlashcardWorkspaceView from './components/workspace/FlashcardWorkspaceView';
import AILearningWorkspaceView from './components/workspace/AILearningWorkspaceView';
import DevArchitectureView from './components/workspace/DevArchitectureView';
import ImportPage from './components/ImportPage';
import SettingsPage from './components/SettingsPage';

function WorkspaceLayout() {
  const {
    theme,
    appScale,
    activeArea,
    setActiveArea,
    openTabs,
    activeTabId,
    isExplorerCollapsed,
    toggleExplorer,
    isMobileDrawerOpen,
    setIsMobileDrawerOpen,
    curriculumDoc,
    importToDestination,
    openTab,
    expandToItem,
    setIsSearchModalOpen,
  } = useWorkspace();

  const activeTab = openTabs.find((t) => t.id === activeTabId) || openTabs[0];

  const handleImportSuccess = (importedDoc: any, destinationStr: string) => {
    if (destinationStr.startsWith('grade:')) {
      const parts = destinationStr.split(':');
      importToDestination(importedDoc, {
        mode: 'merge',
        targetSubjectId: parts[1],
        targetGroupId: parts[2],
      });
    } else if (destinationStr.startsWith('unit:')) {
      const parts = destinationStr.split(':');
      importToDestination(importedDoc, {
        mode: 'merge',
        targetSubjectId: parts[1],
        targetGroupId: parts[2],
      });
    } else if (destinationStr.startsWith('subject:')) {
      importToDestination(importedDoc, {
        mode: 'append',
        targetSubjectId: destinationStr.replace('subject:', ''),
      });
    } else {
      importToDestination(importedDoc, { mode: 'merge' });
    }
  };

  // Computes the one-line file structure path ONLY when something is opened
  const openedFilePath = useMemo(() => {
    if (activeArea !== 'explorer' || !activeTab) return null;

    const path: { label: string; onClick?: () => void }[] = [];

    if (activeTab.type === 'curriculum') {
      path.push({ label: curriculumDoc.title || 'Curriculum Overview' });
      return path;
    }

    if (activeTab.type === 'validation') {
      path.push({ label: 'Developer Architecture & Validation Spec' });
      return path;
    }

    if (activeTab.subjectId) {
      const subject = curriculumDoc.subjects.find((s) => s.id === activeTab.subjectId);
      if (subject) {
        path.push({
          label: subject.name,
          onClick: () => {
            openTab({
              id: `subject-${subject.id}`,
              title: subject.name,
              type: 'subject',
              subjectId: subject.id,
            });
            expandToItem(subject.id);
          },
        });

        if (activeTab.groupId) {
          const group = subject.groups?.find((g) => g.id === activeTab.groupId);
          if (group) {
            path.push({
              label: group.name,
              onClick: () => {
                expandToItem(group.id);
              },
            });

            if (activeTab.unitId) {
              const unit = group.units?.find((u) => u.id === activeTab.unitId);
              if (unit) {
                path.push({
                  label: unit.name,
                  onClick: () => {
                    expandToItem(unit.id);
                  },
                });

                if (activeTab.topicId) {
                  const topic = unit.topics?.find((top) => top.id === activeTab.topicId);
                  if (topic) {
                    path.push({ label: topic.name });
                    return path;
                  }
                }
              }
            }
          }
        }
      }
    }

    if (activeTab.title) {
      path.push({ label: activeTab.title });
      return path;
    }

    return null;
  }, [activeArea, activeTab, curriculumDoc, openTab, expandToItem]);

  const isExplorerOpen =
    isMobileDrawerOpen || (!isExplorerCollapsed && (typeof window === 'undefined' || window.innerWidth >= 768));

  const handleToggleExplorer = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsMobileDrawerOpen(!isMobileDrawerOpen);
    } else {
      toggleExplorer();
    }
  };

  const mainEditorRef = useRef<HTMLElement>(null);

  // Scroll to top on any tab or area change, or when returning to the app
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
      }
    }
    if (mainEditorRef.current) {
      mainEditorRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    const scrollContainers = document.querySelectorAll(
      '#ranking-page-container, #settings-page, #import-page, #roadmap-container, #curriculum-overview-view'
    );
    scrollContainers.forEach((el) => {
      el.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });
  }, [activeArea, activeTabId]);

  return (
    <div
      id="ide-root-container"
      className={`h-screen w-screen flex flex-col overflow-hidden font-sans select-none text-[1rem] ${
        theme === 'dark' ? 'bg-[#131314] text-[#e3e3e3] dark' : 'bg-[#f3f4f6] text-[#24292f]'
      }`}
    >
      {/* 1. Main Workspace & Explorer Area (Occupies full vertical space above bottom Activity Bar) */}
      <div className="flex-1 min-h-0 flex flex-row overflow-hidden relative">
        {/* Desktop Explorer Panel: Rendered ONLY when opened */}
        {!isExplorerCollapsed && (
          <aside
            id="left-explorer-panel-open"
            className={`hidden md:flex shrink-0 h-full w-72 lg:w-80 border-r overflow-hidden z-20 transition-colors ${
              theme === 'dark' ? 'border-[#222425]' : 'border-[#e5e5e5]'
            }`}
          >
            <ExplorerPanel />
          </aside>
        )}

        {/* Mobile: Drawer when opened */}
        {isMobileDrawerOpen && (
          <div
            id="mobile-drawer-backdrop"
            className="md:hidden fixed inset-0 bottom-14 sm:bottom-16 z-50 bg-black/60 backdrop-blur-xs flex"
            onClick={() => setIsMobileDrawerOpen(false)}
          >
            <div
              className={`w-full max-w-xs h-full shadow-2xl border-r ${
                theme === 'dark'
                  ? 'bg-[#1e1f20] border-[#282a2c]'
                  : 'bg-white border-[#e0e0e0]'
              } animate-in slide-in-from-left duration-200`}
              onClick={(e) => e.stopPropagation()}
            >
              <ExplorerPanel
                isMobileDrawer={true}
                onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Center Workspace Content Area */}
        <main
          id="main-workspace-editor"
          ref={mainEditorRef}
          className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden ${
            theme === 'dark' ? 'bg-[#131314]' : 'bg-[#ffffff]'
          }`}
        >

          {/* Main Area based on active navigation area */}
          {activeArea === 'explorer' && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {openTabs.length === 0 ? (
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  <RankingWorkspaceView />
                </div>
              ) : (
                <>
                  <WorkspaceTabs />

                  {/* One-line file structure breadcrumbs ONLY when something is opened */}
                  {openedFilePath && (
                    <nav
                      id="opened-file-structure-bar"
                      aria-label="Opened File Structure"
                      className={`h-6 sm:h-6.5 px-3 border-b flex items-center justify-center gap-1.5 text-[11px] font-mono select-none overflow-x-auto whitespace-nowrap scrollbar-none shrink-0 ${
                        theme === 'dark'
                          ? 'bg-[#181818] border-[#2b2b2b] text-slate-400'
                          : 'bg-[#f0f0f0] border-[#e0e0e0] text-slate-600'
                      }`}
                    >
                      <FolderTree className="w-3 h-3 text-[#007acc] shrink-0" />
                      {openedFilePath.map((node, index) => {
                        const isLast = index === openedFilePath.length - 1;
                        return (
                          <span key={index} className="inline-flex items-center gap-1.5 shrink-0">
                            {index > 0 && (
                              <ChevronRight className="w-3 h-3 text-slate-500 shrink-0 opacity-60" />
                            )}
                            {node.onClick ? (
                              <button
                                onClick={node.onClick}
                                className={`hover:underline cursor-pointer ${
                                  isLast
                                    ? theme === 'dark'
                                      ? 'text-white font-medium'
                                      : 'text-slate-950 font-medium'
                                    : 'text-inherit opacity-85 hover:opacity-100'
                                }`}
                              >
                                {node.label}
                              </button>
                            ) : (
                              <span
                                className={
                                  isLast
                                    ? theme === 'dark'
                                      ? 'text-white font-medium'
                                      : 'text-slate-950 font-medium'
                                    : 'text-inherit opacity-85'
                                }
                              >
                                {node.label}
                              </span>
                            )}
                          </span>
                        );
                      })}
                    </nav>
                  )}

                  {activeTab?.type === 'curriculum' && <CurriculumOverviewTab />}
                  {activeTab?.type === 'subject' && (
                    <SubjectViewTab subjectId={activeTab.subjectId || ''} />
                  )}
                  {activeTab?.type === 'topic' && (
                    <TopicEditorTab topicId={activeTab.topicId || ''} />
                  )}
                  {activeTab?.type === 'validation' && <DevArchitectureView />}
                  {activeTab?.type === 'ranking' && (
                    <div className="h-full w-full flex flex-col min-h-0 overflow-hidden">
                      <RankingWorkspaceView />
                    </div>
                  )}
                  {activeTab?.type === 'roadmap' && (
                    <div className="h-full w-full flex flex-col min-h-0 overflow-hidden">
                      <RoadmapWorkspaceView />
                    </div>
                  )}
                  {activeTab?.type === 'import' && (
                    <div className="h-full w-full flex flex-col min-h-0 overflow-hidden">
                      <ImportPage
                        currentDocument={curriculumDoc}
                        onImportSuccess={handleImportSuccess}
                      />
                    </div>
                  )}
                  {activeTab?.type === 'settings' && (
                    <div className="h-full w-full flex flex-col min-h-0 overflow-hidden">
                      <SettingsPage />
                    </div>
                  )}
                  {activeTab?.type === 'flashcards' && (
                    <div className="h-full w-full flex flex-col min-h-0 overflow-hidden">
                      <FlashcardWorkspaceView />
                    </div>
                  )}
                  {activeTab?.type === 'ai' && (
                    <div className="h-full w-full flex flex-col min-h-0 overflow-hidden">
                      <AILearningWorkspaceView />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Dedicated Ranking Workspace Area */}
          {activeArea === 'ranking' && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <RankingWorkspaceView />
            </div>
          )}

          {/* Study Roadmap Layer */}
          {activeArea === 'roadmap' && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <RoadmapWorkspaceView />
            </div>
          )}

          {/* Dedicated Spaced Repetition (FSRS) Workspace */}
          {activeArea === 'flashcards' && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <FlashcardWorkspaceView />
            </div>
          )}

          {/* Dedicated Contextual AI Study Suite */}
          {activeArea === 'ai' && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <AILearningWorkspaceView />
            </div>
          )}

          {/* Dedicated Import Hub */}
          {activeArea === 'import' && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <ImportPage
                currentDocument={curriculumDoc}
                onImportSuccess={handleImportSuccess}
              />
            </div>
          )}

          {/* Dedicated Settings Page */}
          {activeArea === 'settings' && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <SettingsPage />
            </div>
          )}
        </main>
      </div>


      {/* 2. Bottom Activity Bar */}
      <VSCodeActivityBar />

      {/* Global Search Command Palette Modal */}
      <GlobalSearchModal />
    </div>
  );
}

export default function App() {
  return (
    <WorkspaceProvider>
      <WorkspaceLayout />
    </WorkspaceProvider>
  );
}
