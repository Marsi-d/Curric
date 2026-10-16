/**
 * VS Code-Inspired Curriculum Explorer Panel.
 *
 * Implements:
 * - Dynamic tree structure derived strictly from loaded JSON data under the Base Folder.
 * - By default, no folders are present; only the Base Folder is shown until JSON is imported or added manually.
 * - Base Folder ('root-base-folder') with expand/collapse and manual folder addition.
 * - Zero unnecessary margins or gaps against the left activity bar.
 * - Mobile-friendly responsive drawer with comfortable touch targets (44px+) and close handlers.
 * - Lazy DOM rendering, real-time filtering, and contextual menus.
 */

import React, { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FolderTree,
  FileText,
  Filter,
  X,
  ChevronsDown,
  ChevronsUp,
  Plus,
  Layers,
  BookOpen,
  UploadCloud,
  FolderPlus,
  Compass,
  MoreHorizontal,
  Trash2,
  Edit3,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Subject, CurriculumGroup, Unit, Topic } from '../../types/curriculum';
import ContextMenu, { ContextMenuProps } from './ContextMenu';

interface ExplorerPanelProps {
  isMobileDrawer?: boolean;
  onCloseMobileDrawer?: () => void;
}

export default function ExplorerPanel({
  isMobileDrawer = false,
  onCloseMobileDrawer,
}: ExplorerPanelProps) {
  const {
    theme,
    curriculumDoc,
    expandedNodes,
    toggleNode,
    expandAll,
    collapseAll,
    openTab,
    selectedItemId,
    setSelectedItemId,
    setActiveArea,
    addFolderManually,
    addUnitManually,
    addTopicManually,
    deleteTopic,
    deleteUnit,
    deleteGroup,
    deleteSubject,
    renameItem,
    activeRankingProfileId,
    toggleExplorer,
  } = useWorkspace();

  const [filterText, setFilterText] = useState('');
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuProps | null>(null);

  // Modal dialog states for manual actions
  const [deleteConfirm, setDeleteConfirm] = useState<{
    nodeType: 'subject' | 'group' | 'unit' | 'topic';
    itemId: string;
    itemName: string;
  } | null>(null);

  const [addItemDialog, setAddItemDialog] = useState<{
    type: 'unit' | 'topic';
    parentId: string;
    parentName: string;
    parentGroupId?: string;
  } | null>(null);
  const [newItemName, setNewItemName] = useState('');

  const [renameDialog, setRenameDialog] = useState<{
    type: 'subject' | 'group' | 'unit' | 'topic';
    itemId: string;
    currentName: string;
  } | null>(null);
  const [renameInput, setRenameInput] = useState('');

  // Quick lookup map for topic rank in active profile
  const topicRankMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!activeRankingProfileId || !curriculumDoc.rankingAssignments) return map;
    for (const a of curriculumDoc.rankingAssignments) {
      if (a.rankingProfileId === activeRankingProfileId && a.order !== undefined) {
        map.set(a.itemId, a.order);
      }
    }
    return map;
  }, [curriculumDoc.rankingAssignments, activeRankingProfileId]);

  // Manual folder creation dialog state
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderType, setNewFolderType] = useState<'academic' | 'aptitude'>('academic');

  // Filter evaluation helper
  const matchesFilter = (text: string) => {
    if (!filterText.trim()) return true;
    return text.toLowerCase().includes(filterText.trim().toLowerCase());
  };

  const handleBaseFolderClick = () => {
    setSelectedItemId('root-base-folder');
    toggleNode('root-base-folder');
  };

  // Node opening handlers
  const handleSelectSubject = (subject: Subject, doubleClick = false) => {
    setSelectedItemId(subject.id);
    openTab(
      {
        id: `subject-${subject.id}`,
        title: subject.name,
        type: 'subject',
        subjectId: subject.id,
        isPinned: doubleClick,
      },
      true
    );
    if (isMobileDrawer && onCloseMobileDrawer) {
      onCloseMobileDrawer();
    }
  };

  const handleSelectTopic = (
    topic: Topic,
    subject: Subject,
    group: CurriculumGroup,
    unit?: Unit,
    doubleClick = false
  ) => {
    setSelectedItemId(topic.id);
    openTab(
      {
        id: `topic-${topic.id}`,
        title: topic.name,
        type: 'topic',
        subjectId: subject.id,
        groupId: group.id,
        unitId: unit?.id,
        topicId: topic.id,
        isPinned: doubleClick,
      },
      true
    );
    if (isMobileDrawer && onCloseMobileDrawer) {
      onCloseMobileDrawer();
    }
  };

  const openDropdown = (
    e: React.MouseEvent,
    nodeType: 'subject' | 'group' | 'unit' | 'topic',
    itemId: string,
    itemName: string,
    pathText: string,
    handlers: {
      onOpen?: () => void;
      onAddUnit?: () => void;
      onAddTopic?: () => void;
      onRename?: () => void;
      onDelete?: () => void;
    }
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({
      x: rect.right,
      y: rect.bottom,
      nodeType,
      itemId,
      itemName,
      pathText,
      onClose: () => setContextMenu(null),
      onOpenItem: handlers.onOpen,
      onAddUnit: handlers.onAddUnit,
      onAddTopic: handlers.onAddTopic,
      onRename: handlers.onRename,
      onDelete: handlers.onDelete,
    });
  };

  const handleContextMenu = (
    e: React.MouseEvent,
    nodeType: 'subject' | 'group' | 'unit' | 'topic',
    itemId: string,
    itemName: string,
    pathText: string,
    handlers: {
      onOpen?: () => void;
      onAddUnit?: () => void;
      onAddTopic?: () => void;
      onRename?: () => void;
      onDelete?: () => void;
    }
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      nodeType,
      itemId,
      itemName,
      pathText,
      onClose: () => setContextMenu(null),
      onOpenItem: handlers.onOpen,
      onAddUnit: handlers.onAddUnit,
      onAddTopic: handlers.onAddTopic,
      onRename: handlers.onRename,
      onDelete: handlers.onDelete,
    });
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const createdId = addFolderManually(newFolderName.trim(), newFolderType);
    setNewFolderName('');
    setIsCreatingFolder(false);
    setSelectedItemId(createdId);
  };

  const isBaseExpanded = expandedNodes.has('root-base-folder') || expandedNodes.size === 0;
  const hasSubjects = curriculumDoc.subjects.length > 0;

  return (
    <div
      id={isMobileDrawer ? 'explorer-drawer' : 'explorer-panel'}
      className={`h-full w-full flex flex-col select-none overflow-hidden text-xs border-r transition-colors ${
        theme === 'dark'
          ? 'bg-[#131314] border-[#222425] text-[#e3e3e3]'
          : 'bg-[#f8f9fa] border-[#e5e5e5] text-[#24292f]'
      }`}
    >
      {/* Explorer Header */}
      <div
        className={`h-12 flex items-center justify-between border-b shrink-0 font-semibold tracking-wider text-[11px] select-none ${
          theme === 'dark'
            ? 'bg-[#1e1f20] border-[#222425] text-[#c4c7c5]'
            : 'bg-[#eeeeee] border-[#e0e0e0] text-[#555555]'
        }`}
      >
        {/* Left: Separate Square for the Explorer button */}
        <div className="flex items-center h-full shrink-0">
          <button
            id="explorer-toggle-inside-btn"
            onClick={() => {
              if (isMobileDrawer && onCloseMobileDrawer) {
                onCloseMobileDrawer();
              } else {
                toggleExplorer();
              }
            }}
            className={`w-12 h-12 border-r shrink-0 flex items-center justify-center transition-colors cursor-pointer select-none ${
              theme === 'dark'
                ? 'hover:bg-[#282a2c] border-[#222425] text-[#007acc] hover:text-sky-300'
                : 'hover:bg-[#dddddd] border-[#e0e0e0] text-[#007acc] hover:text-[#005a9e]'
            }`}
            title="Close Curriculum Explorer"
            aria-label="Close Curriculum Explorer"
          >
            <FolderTree className="w-5.5 h-5.5 shrink-0" />
          </button>
          <span className="px-3 font-semibold text-xs tracking-wider uppercase text-inherit truncate">
            Explorer
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0 px-2 ml-auto">
          <button
            id="explorer-add-folder-btn"
            onClick={() => setIsCreatingFolder(true)}
            title="Create New Folder Manually"
            aria-label="Create New Folder Manually"
            className={`p-1 rounded transition-colors ${
              theme === 'dark' ? 'hover:bg-[#333333] text-emerald-400' : 'hover:bg-[#dddddd] text-emerald-600'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            id="explorer-toggle-filter"
            onClick={() => setShowFilterBar(!showFilterBar)}
            title="Filter curriculum tree"
            aria-label="Filter curriculum tree"
            className={`p-1 rounded transition-colors ${
              showFilterBar
                ? 'text-[#007acc] bg-[#007acc]/10'
                : theme === 'dark'
                ? 'hover:bg-[#333333]'
                : 'hover:bg-[#dddddd]'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
          </button>
          <button
            id="explorer-collapse-all"
            onClick={collapseAll}
            title="Collapse All Folders"
            aria-label="Collapse All Folders"
            className={`p-1 rounded transition-colors ${
              theme === 'dark' ? 'hover:bg-[#333333]' : 'hover:bg-[#dddddd]'
            }`}
          >
            <ChevronsUp className="w-3.5 h-3.5" />
          </button>
          <button
            id="explorer-expand-all"
            onClick={expandAll}
            title="Expand All Folders"
            aria-label="Expand All Folders"
            className={`p-1 rounded transition-colors ${
              theme === 'dark' ? 'hover:bg-[#333333]' : 'hover:bg-[#dddddd]'
            }`}
          >
            <ChevronsDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Filter Bar (conditionally shown) */}
      {showFilterBar && (
        <div
          className={`px-2.5 py-1.5 border-b shrink-0 ${
            theme === 'dark' ? 'bg-[#252526] border-[#2d2d2d]' : 'bg-[#e8e8e8] border-[#d8d8d8]'
          }`}
        >
          <div className="relative flex items-center">
            <input
              id="explorer-filter-input"
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter topics, units, grades..."
              className={`w-full px-2 py-1 text-xs rounded border outline-none pr-6 ${
                theme === 'dark'
                  ? 'bg-[#1e1e1e] border-[#3c3c3c] text-[#cccccc] focus:border-[#007acc]'
                  : 'bg-[#ffffff] border-[#cccccc] text-[#1e1e1e] focus:border-[#007acc]'
              }`}
            />
            {filterText && (
              <button
                onClick={() => setFilterText('')}
                className="absolute right-1.5 p-0.5 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Manual Folder Creation Inline Form */}
      {isCreatingFolder && (
        <div
          id="manual-folder-creation-form"
          className={`p-2.5 border-b shrink-0 space-y-2 animate-in fade-in duration-150 ${
            theme === 'dark' ? 'bg-[#252526] border-[#333333]' : 'bg-[#e8edf2] border-[#d0d7de]'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span className="flex items-center gap-1 text-[#007acc]">
              <FolderPlus className="w-3.5 h-3.5" />
              New Curriculum Folder
            </span>
            <button
              onClick={() => setIsCreatingFolder(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <form onSubmit={handleCreateFolderSubmit} className="space-y-2">
            <input
              type="text"
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name (e.g. Physics, Grade 10)..."
              className={`w-full px-2 py-1 text-xs rounded border outline-none ${
                theme === 'dark'
                  ? 'bg-[#1e1e1e] border-[#3c3c3c] text-white focus:border-[#007acc]'
                  : 'bg-white border-[#cccccc] text-[#1e1e1e] focus:border-[#007acc]'
              }`}
            />
            <div className="space-y-1">
              <label htmlFor="manual-folder-type-select" className="text-[10px] text-[#888888] font-medium block">
                Folder Type
              </label>
              <select
                id="manual-folder-type-select"
                value={newFolderType}
                onChange={(e) => setNewFolderType(e.target.value as 'academic' | 'aptitude')}
                className={`w-full px-2 py-1 text-xs rounded border outline-none cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-[#1e1e1e] border-[#3c3c3c] text-white focus:border-[#007acc]'
                    : 'bg-white border-[#cccccc] text-[#1e1e1e] focus:border-[#007acc]'
                }`}
              >
                <option value="academic">Academic Subject (Grade-based Hierarchy)</option>
                <option value="aptitude">Custom / Aptitude (Flexible Sections & Topics)</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={!newFolderName.trim()}
                className="px-2.5 py-1 bg-[#007acc] text-white rounded text-[11px] font-medium disabled:opacity-50 hover:bg-[#0066b8] transition-colors"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingFolder(false)}
                className="px-2.5 py-1 text-slate-400 hover:text-slate-200 text-[11px]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tree Content Area */}
      <div
        id="explorer-tree-scroll"
        className="flex-1 overflow-y-auto overflow-x-hidden p-1 space-y-0.5 focus:outline-none"
        tabIndex={0}
      >
        {/* ========================================================= */}
        {/* 1. PERMANENT BASE FOLDER (Root Container) */}
        {/* ========================================================= */}
        <div id="tree-base-folder-container" className="text-xs">
          <div
            id="tree-base-folder-row"
            onClick={handleBaseFolderClick}
            onDoubleClick={handleBaseFolderClick}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer transition-colors group ${
              selectedItemId === 'root-base-folder'
                ? theme === 'dark'
                  ? 'bg-[#094771] text-white font-medium'
                  : 'bg-[#007acc] text-white font-medium'
                : theme === 'dark'
                ? 'hover:bg-[#2a2d2e] text-[#e0e0e0]'
                : 'hover:bg-[#e4e6f1] text-[#1e1e1e]'
            }`}
            title="Root Curriculum Folder - Click to expand or collapse"
          >
            <span
              className="text-[#858585] hover:text-white p-1 -m-1 rounded hover:bg-slate-700/40 shrink-0 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                toggleNode('root-base-folder');
              }}
              title={isBaseExpanded ? 'Collapse' : 'Expand'}
            >
              {isBaseExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </span>
            <span className="text-sky-400 shrink-0">
              {isBaseExpanded ? (
                <FolderOpen className="w-4 h-4 fill-sky-400/20" />
              ) : (
                <Folder className="w-4 h-4 fill-sky-400/20" />
              )}
            </span>
            <span className="truncate font-semibold tracking-tight text-xs">
              {curriculumDoc.title || 'Curriculum (Base Folder)'}
            </span>

            {/* Folder count badge */}
            <span className="ml-auto text-[11px] text-slate-500 font-mono shrink-0">
              {curriculumDoc.subjects.length} {curriculumDoc.subjects.length === 1 ? 'folder' : 'folders'}
            </span>
          </div>

          {/* ========================================================= */}
          {/* 2. BASE FOLDER CONTENTS */}
          {/* ========================================================= */}
          {isBaseExpanded && (
            <div className="pl-3 ml-2.5 border-l border-slate-700/30 space-y-0.5 mt-0.5">
              {!hasSubjects ? (
                /* Empty state inside Base Folder */
                <div
                  id="base-folder-empty-state"
                  className={`p-3 my-1 rounded border border-dashed space-y-2.5 ${
                    theme === 'dark'
                      ? 'bg-[#222222]/50 border-slate-800 text-slate-400'
                      : 'bg-slate-100/70 border-slate-300 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                    <Compass className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span>No folders extracted yet.</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Import structure from JSON or AI extraction, or build folders manually.
                  </p>
                  <div className="flex flex-col gap-1.5 pt-1">
                    <button
                      id="base-import-btn"
                      onClick={() => {
                        setActiveArea('import');
                        if (isMobileDrawer && onCloseMobileDrawer) onCloseMobileDrawer();
                      }}
                      className="w-full px-2.5 py-1.5 bg-[#007acc] hover:bg-[#0066b8] text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      Import Structure (.JSON / AI)
                    </button>
                    <button
                      id="base-add-manual-btn"
                      onClick={() => setIsCreatingFolder(true)}
                      className={`w-full px-2.5 py-1.5 rounded text-xs font-medium border transition-colors flex items-center justify-center gap-1.5 ${
                        theme === 'dark'
                          ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                          : 'border-slate-300 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Folder Manually
                    </button>
                  </div>
                </div>
              ) : (
                /* Dynamic tree structure extracted from JSON / manual */
                curriculumDoc.subjects.map((subject) => {
                  const isSubExpanded = expandedNodes.has(subject.id);
                  const isSubSelected = selectedItemId === subject.id;

                  const subjectActions = {
                    onOpen: () => handleSelectSubject(subject, true),
                    onAddUnit: () => {
                      // If subject has a group (like Grade 9), add under it, else under subject
                      const targetGroupId = subject.groups[0]?.id;
                      if (targetGroupId) {
                        setAddItemDialog({
                          type: 'unit',
                          parentId: targetGroupId,
                          parentName: `${subject.name} › ${subject.groups[0].name}`,
                        });
                      } else {
                        // Create a section first or unit
                        const newGrpId = addFolderManually(subject.name + ' Module', 'academic');
                      }
                    },
                    onRename: () => {
                      setRenameDialog({
                        type: 'subject',
                        itemId: subject.id,
                        currentName: subject.name,
                      });
                      setRenameInput(subject.name);
                    },
                    onDelete: () => {
                      setDeleteConfirm({
                        nodeType: 'subject',
                        itemId: subject.id,
                        itemName: subject.name,
                      });
                    },
                  };

                  return (
                    <div key={subject.id} className="text-xs">
                      {/* Subject Folder Row */}
                      <div
                        id={`tree-subject-${subject.id}`}
                        onClick={() => handleSelectSubject(subject, false)}
                        onDoubleClick={() => handleSelectSubject(subject, true)}
                        onContextMenu={(e) =>
                          handleContextMenu(
                            e,
                            'subject',
                            subject.id,
                            subject.name,
                            subject.name,
                            subjectActions
                          )
                        }
                        className={`group/row flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer transition-colors ${
                          isSubSelected
                            ? theme === 'dark'
                              ? 'bg-[#094771] text-white font-medium'
                              : 'bg-[#007acc] text-white font-medium'
                            : theme === 'dark'
                            ? 'hover:bg-[#2a2d2e] text-[#e0e0e0]'
                            : 'hover:bg-[#e4e6f1] text-[#1e1e1e]'
                        }`}
                        title={`${subject.name} (${subject.type}) - Click to open, or click arrow to expand`}
                      >
                        <span
                          className="text-[#858585] hover:text-white p-1 -m-1 rounded hover:bg-slate-700/40 shrink-0 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleNode(subject.id);
                          }}
                          title={isSubExpanded ? 'Collapse' : 'Expand'}
                        >
                          {isSubExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </span>
                        <span className="text-amber-400 shrink-0">
                          {isSubExpanded ? (
                            <FolderOpen className="w-4 h-4 fill-amber-400/20" />
                          ) : (
                            <Folder className="w-4 h-4 fill-amber-400/20" />
                          )}
                        </span>
                        <span className="truncate font-semibold tracking-tight">
                          {subject.name}
                        </span>

                        {subject.type === 'aptitude' && (
                          <span className="text-[9px] px-1 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                            Aptitude
                          </span>
                        )}

                        {/* Subject Actions on Hover / Focus / Mobile */}
                        <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (subject.groups[0]) {
                                setAddItemDialog({
                                  type: 'unit',
                                  parentId: subject.groups[0].id,
                                  parentName: `${subject.name} › ${subject.groups[0].name}`,
                                });
                              }
                            }}
                            title="Add Unit"
                            className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) =>
                              openDropdown(e, 'subject', subject.id, subject.name, subject.name, subjectActions)
                            }
                            title="Drop down menu"
                            className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white"
                          >
                            <MoreHorizontal className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm({
                                nodeType: 'subject',
                                itemId: subject.id,
                                itemName: subject.name,
                              });
                            }}
                            title="Delete Folder"
                            className="p-1 rounded hover:bg-rose-900/40 text-slate-400 hover:text-rose-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Subject Children (Lazy rendering: only if expanded) */}
                      {isSubExpanded && (
                        <div className="pl-3 ml-2.5 border-l border-slate-700/30 space-y-0.5 mt-0.5">
                          {subject.groups.map((group) => {
                            const isGrpExpanded = expandedNodes.has(group.id);
                            const isGrpSelected = selectedItemId === group.id;

                            const groupActions = {
                              onOpen: () => toggleNode(group.id),
                              onAddUnit: () => {
                                setAddItemDialog({
                                  type: 'unit',
                                  parentId: group.id,
                                  parentName: `${subject.name} › ${group.name}`,
                                });
                              },
                              onAddTopic: () => {
                                setAddItemDialog({
                                  type: 'topic',
                                  parentId: group.id,
                                  parentName: `${subject.name} › ${group.name}`,
                                });
                              },
                              onRename: () => {
                                setRenameDialog({
                                  type: 'group',
                                  itemId: group.id,
                                  currentName: group.name,
                                });
                                setRenameInput(group.name);
                              },
                              onDelete: () => {
                                setDeleteConfirm({
                                  nodeType: 'group',
                                  itemId: group.id,
                                  itemName: group.name,
                                });
                              },
                            };

                            return (
                              <div key={group.id}>
                                {/* Group Folder Row (Grade or Category) */}
                                <div
                                  id={`tree-group-${group.id}`}
                                  onClick={() => toggleNode(group.id)}
                                  onContextMenu={(e) =>
                                    handleContextMenu(
                                      e,
                                      'group',
                                      group.id,
                                      group.name,
                                      `${subject.name} › ${group.name}`,
                                      groupActions
                                    )
                                  }
                                  className={`group/row flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer transition-colors ${
                                    isGrpSelected
                                      ? theme === 'dark'
                                        ? 'bg-[#094771]/80 text-white'
                                        : 'bg-[#007acc]/80 text-white'
                                      : theme === 'dark'
                                      ? 'hover:bg-[#2a2d2e] text-[#cccccc]'
                                      : 'hover:bg-[#e4e6f1] text-[#333333]'
                                  }`}
                                >
                                  <span
                                    className="text-[#858585] hover:text-white p-0.5 rounded hover:bg-slate-700/40 shrink-0 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleNode(group.id);
                                    }}
                                    title={isGrpExpanded ? 'Collapse' : 'Expand'}
                                  >
                                    {isGrpExpanded ? (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    )}
                                  </span>
                                  <span className="text-amber-300 shrink-0">
                                    {isGrpExpanded ? (
                                      <FolderOpen className="w-3.5 h-3.5" />
                                    ) : (
                                      <Folder className="w-3.5 h-3.5" />
                                    )}
                                  </span>
                                  <span className="truncate font-medium">{group.name}</span>

                                  {/* Group Actions on Hover / Focus */}
                                  <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAddItemDialog({
                                          type: 'unit',
                                          parentId: group.id,
                                          parentName: `${subject.name} › ${group.name}`,
                                        });
                                      }}
                                      title="Add Unit"
                                      className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) =>
                                        openDropdown(
                                          e,
                                          'group',
                                          group.id,
                                          group.name,
                                          `${subject.name} › ${group.name}`,
                                          groupActions
                                        )
                                      }
                                      title="Drop down menu"
                                      className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white"
                                    >
                                      <MoreHorizontal className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirm({
                                          nodeType: 'group',
                                          itemId: group.id,
                                          itemName: group.name,
                                        });
                                      }}
                                      title="Delete Grade / Section"
                                      className="p-1 rounded hover:bg-rose-900/40 text-slate-400 hover:text-rose-400"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {/* Group Children (Units or Direct Topics) */}
                                {isGrpExpanded && (
                                  <div className="pl-3 ml-2.5 border-l border-slate-700/30 space-y-0.5 mt-0.5">
                                    {/* 1. Academic Units */}
                                    {group.units.map((unit) => {
                                      const isUnitExpanded = expandedNodes.has(unit.id);
                                      const isUnitSelected = selectedItemId === unit.id;

                                      const unitActions = {
                                        onOpen: () => toggleNode(unit.id),
                                        onAddTopic: () => {
                                          setAddItemDialog({
                                            type: 'topic',
                                            parentId: unit.id,
                                            parentGroupId: group.id,
                                            parentName: unit.name,
                                          });
                                        },
                                        onRename: () => {
                                          setRenameDialog({
                                            type: 'unit',
                                            itemId: unit.id,
                                            currentName: unit.name,
                                          });
                                          setRenameInput(unit.name);
                                        },
                                        onDelete: () => {
                                          setDeleteConfirm({
                                            nodeType: 'unit',
                                            itemId: unit.id,
                                            itemName: unit.name,
                                          });
                                        },
                                      };

                                      return (
                                        <div key={unit.id}>
                                          {/* Unit Row */}
                                          <div
                                            id={`tree-unit-${unit.id}`}
                                            onClick={() => toggleNode(unit.id)}
                                            onContextMenu={(e) =>
                                              handleContextMenu(
                                                e,
                                                'unit',
                                                unit.id,
                                                unit.name,
                                                `${subject.name} › ${group.name} › ${unit.name}`,
                                                unitActions
                                              )
                                            }
                                            className={`group/row flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer transition-colors ${
                                              isUnitSelected
                                                ? theme === 'dark'
                                                  ? 'bg-[#094771]/60 text-white'
                                                  : 'bg-[#007acc]/60 text-white'
                                                : theme === 'dark'
                                                ? 'hover:bg-[#2a2d2e] text-[#bbbbbb]'
                                                : 'hover:bg-[#e4e6f1] text-[#444444]'
                                            }`}
                                          >
                                            <span
                                              className="text-[#858585] hover:text-white p-0.5 rounded hover:bg-slate-700/40 shrink-0 transition-colors"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggleNode(unit.id);
                                              }}
                                              title={isUnitExpanded ? 'Collapse' : 'Expand'}
                                            >
                                              {isUnitExpanded ? (
                                                <ChevronDown className="w-3 h-3" />
                                              ) : (
                                                <ChevronRight className="w-3 h-3" />
                                              )}
                                            </span>
                                            <span className="text-sky-400 shrink-0">
                                              <BookOpen className="w-3.5 h-3.5" />
                                            </span>
                                            <span className="truncate">{unit.name}</span>
                                            <span className="text-[10px] text-slate-500">
                                              {unit.topics.length}
                                            </span>

                                            {/* Unit Actions on Hover */}
                                            <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setAddItemDialog({
                                                    type: 'topic',
                                                    parentId: unit.id,
                                                    parentGroupId: group.id,
                                                    parentName: unit.name,
                                                  });
                                                }}
                                                title="Add Topic"
                                                className="p-0.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white"
                                              >
                                                <Plus className="w-3 h-3" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={(e) =>
                                                  openDropdown(
                                                    e,
                                                    'unit',
                                                    unit.id,
                                                    unit.name,
                                                    `${subject.name} › ${group.name} › ${unit.name}`,
                                                    unitActions
                                                  )
                                                }
                                                title="Drop down menu"
                                                className="p-0.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white"
                                              >
                                                <MoreHorizontal className="w-3 h-3" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setDeleteConfirm({
                                                    nodeType: 'unit',
                                                    itemId: unit.id,
                                                    itemName: unit.name,
                                                  });
                                                }}
                                                title="Delete Unit"
                                                className="p-0.5 rounded hover:bg-rose-900/40 text-slate-400 hover:text-rose-400"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </div>

                                          {/* Topics inside Unit */}
                                          {isUnitExpanded && (
                                            <div className="pl-3 ml-2.5 border-l border-slate-700/30 space-y-0.5 mt-0.5">
                                              {unit.topics.map((topic) => {
                                                const isTopicSelected = selectedItemId === topic.id;
                                                if (!matchesFilter(topic.name)) return null;

                                                const topicActions = {
                                                  onOpen: () =>
                                                    handleSelectTopic(topic, subject, group, unit, true),
                                                  onRename: () => {
                                                    setRenameDialog({
                                                      type: 'topic',
                                                      itemId: topic.id,
                                                      currentName: topic.name,
                                                    });
                                                    setRenameInput(topic.name);
                                                  },
                                                  onDelete: () => {
                                                    setDeleteConfirm({
                                                      nodeType: 'topic',
                                                      itemId: topic.id,
                                                      itemName: topic.name,
                                                    });
                                                  },
                                                };

                                                return (
                                                  <div
                                                    key={topic.id}
                                                    id={`tree-topic-${topic.id}`}
                                                    onClick={() =>
                                                      handleSelectTopic(topic, subject, group, unit, false)
                                                    }
                                                    onDoubleClick={() =>
                                                      handleSelectTopic(topic, subject, group, unit, true)
                                                    }
                                                    onContextMenu={(e) =>
                                                      handleContextMenu(
                                                        e,
                                                        'topic',
                                                        topic.id,
                                                        topic.name,
                                                        `${subject.name} › ${group.name} › ${unit.name} › ${topic.name}`,
                                                        topicActions
                                                      )
                                                    }
                                                    className={`group/row flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer transition-colors ${
                                                      isTopicSelected
                                                        ? theme === 'dark'
                                                          ? 'bg-[#094771] text-white font-medium'
                                                          : 'bg-[#007acc] text-white font-medium'
                                                        : theme === 'dark'
                                                        ? 'hover:bg-[#2a2d2e] text-[#cccccc]'
                                                        : 'hover:bg-[#e4e6f1] text-[#333333]'
                                                    }`}
                                                    title={topic.name}
                                                  >
                                                    <FileText className="w-3.5 h-3.5 text-[#007acc] shrink-0" />
                                                    <span className="truncate">{topic.name}</span>
                                                    {topicRankMap.has(topic.id) && (
                                                      <span
                                                        className="text-[9px] font-mono px-1 rounded bg-amber-500/25 text-amber-300 font-semibold border border-amber-500/30 shrink-0"
                                                        title={`Ranked #${topicRankMap.get(topic.id)} in active ranking profile`}
                                                      >
                                                        #{topicRankMap.get(topic.id)}
                                                      </span>
                                                    )}
                                                    {topic.subtopics.length > 0 && !topicRankMap.has(topic.id) && (
                                                      <span className="text-[9px] px-1 rounded bg-slate-700/40 text-slate-400">
                                                        {topic.subtopics.length}
                                                      </span>
                                                    )}

                                                    {/* Topic Actions on Hover */}
                                                    <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">
                                                      <button
                                                        type="button"
                                                        onClick={(e) =>
                                                          openDropdown(
                                                            e,
                                                            'topic',
                                                            topic.id,
                                                            topic.name,
                                                            `${subject.name} › ${group.name} › ${unit.name} › ${topic.name}`,
                                                            topicActions
                                                          )
                                                        }
                                                        title="Drop down menu"
                                                        className="p-0.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white"
                                                      >
                                                        <MoreHorizontal className="w-3 h-3" />
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          setDeleteConfirm({
                                                            nodeType: 'topic',
                                                            itemId: topic.id,
                                                            itemName: topic.name,
                                                          });
                                                        }}
                                                        title="Delete Topic"
                                                        className="p-0.5 rounded hover:bg-rose-900/40 text-slate-400 hover:text-rose-400"
                                                      >
                                                        <Trash2 className="w-3 h-3" />
                                                      </button>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}

                                    {/* 2. Direct Topics (Aptitude categories) */}
                                    {group.directTopics &&
                                      group.directTopics.map((topic) => {
                                        const isTopicSelected = selectedItemId === topic.id;
                                        if (!matchesFilter(topic.name)) return null;

                                        const directTopicActions = {
                                          onOpen: () =>
                                            handleSelectTopic(topic, subject, group, undefined, true),
                                          onRename: () => {
                                            setRenameDialog({
                                              type: 'topic',
                                              itemId: topic.id,
                                              currentName: topic.name,
                                            });
                                            setRenameInput(topic.name);
                                          },
                                          onDelete: () => {
                                            setDeleteConfirm({
                                              nodeType: 'topic',
                                              itemId: topic.id,
                                              itemName: topic.name,
                                            });
                                          },
                                        };

                                        return (
                                          <div
                                            key={topic.id}
                                            id={`tree-topic-${topic.id}`}
                                            onClick={() =>
                                              handleSelectTopic(topic, subject, group, undefined, false)
                                            }
                                            onDoubleClick={() =>
                                              handleSelectTopic(topic, subject, group, undefined, true)
                                            }
                                            onContextMenu={(e) =>
                                              handleContextMenu(
                                                e,
                                                'topic',
                                                topic.id,
                                                topic.name,
                                                `${subject.name} › ${group.name} › ${topic.name}`,
                                                directTopicActions
                                              )
                                            }
                                            className={`group/row flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer transition-colors ${
                                              isTopicSelected
                                                ? theme === 'dark'
                                                  ? 'bg-[#094771] text-white font-medium'
                                                  : 'bg-[#007acc] text-white font-medium'
                                                : theme === 'dark'
                                                ? 'hover:bg-[#2a2d2e] text-[#cccccc]'
                                                : 'hover:bg-[#e4e6f1] text-[#333333]'
                                            }`}
                                            title={topic.name}
                                          >
                                            <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                            <span className="truncate">{topic.name}</span>
                                            {topicRankMap.has(topic.id) && (
                                              <span
                                                className="text-[9px] font-mono px-1 rounded bg-amber-500/25 text-amber-300 font-semibold border border-amber-500/30 shrink-0"
                                                title={`Ranked #${topicRankMap.get(topic.id)} in active ranking profile`}
                                              >
                                                #{topicRankMap.get(topic.id)}
                                              </span>
                                            )}

                                            {/* Topic Actions on Hover */}
                                            <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">
                                              <button
                                                type="button"
                                                onClick={(e) =>
                                                  openDropdown(
                                                    e,
                                                    'topic',
                                                    topic.id,
                                                    topic.name,
                                                    `${subject.name} › ${group.name} › ${topic.name}`,
                                                    directTopicActions
                                                  )
                                                }
                                                title="Drop down menu"
                                                className="p-0.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white"
                                              >
                                                <MoreHorizontal className="w-3 h-3" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setDeleteConfirm({
                                                    nodeType: 'topic',
                                                    itemId: topic.id,
                                                    itemName: topic.name,
                                                  });
                                                }}
                                                title="Delete Topic"
                                                className="p-0.5 rounded hover:bg-rose-900/40 text-slate-400 hover:text-rose-400"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}

                                    {/* Empty group hint */}
                                    {group.units.length === 0 &&
                                      (!group.directTopics || group.directTopics.length === 0) && (
                                        <div
                                          onClick={() => {
                                            setAddItemDialog({
                                              type: 'unit',
                                              parentId: group.id,
                                              parentName: `${subject.name} › ${group.name}`,
                                            });
                                          }}
                                          className="px-2 py-1 text-[11px] text-[#858585] hover:text-[#007acc] italic cursor-pointer flex items-center gap-1.5"
                                          title="Click to add unit into this folder"
                                        >
                                          <Plus className="w-3 h-3 text-[#007acc]" />
                                          <span>(Empty — click to add unit)</span>
                                        </div>
                                      )}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Empty Aptitude subject hint */}
                          {subject.groups.length === 0 && (
                            <div
                              onClick={() => {
                                setActiveArea('import');
                                if (isMobileDrawer && onCloseMobileDrawer) onCloseMobileDrawer();
                              }}
                              className="px-2 py-1.5 text-[11px] text-[#858585] hover:text-[#007acc] italic cursor-pointer flex items-center gap-1.5"
                              title="Click to import syllabus into Aptitude"
                            >
                              <UploadCloud className="w-3 h-3 text-[#007acc]" />
                              <span>(Main folder — click to import modules)</span>
                            </div>
                          )}

                          {/* Quick Add Folder inside this subject */}
                          <div className="pt-1">
                            <button
                              onClick={() => setIsCreatingFolder(true)}
                              className="text-[11px] text-[#007acc] hover:underline flex items-center gap-1 px-2 py-1"
                            >
                              <Plus className="w-3 h-3" />
                              Add Section / Folder
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Context / Dropdown Menu Component */}
      {contextMenu && <ContextMenu {...contextMenu} />}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div
          id="delete-confirmation-backdrop"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            id="delete-confirmation-dialog"
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm p-4 rounded-lg shadow-2xl border space-y-3 ${
              theme === 'dark'
                ? 'bg-[#252526] border-[#3a3a3a] text-white shadow-black/80'
                : 'bg-white border-slate-300 text-slate-900 shadow-xl'
            }`}
          >
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
              <Trash2 className="w-4 h-4" />
              <span>Delete {deleteConfirm.nodeType.charAt(0).toUpperCase() + deleteConfirm.nodeType.slice(1)}</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to delete <strong className="text-white">"{deleteConfirm.itemName}"</strong>?
              {deleteConfirm.nodeType !== 'topic' && (
                <span className="block mt-1 text-amber-400/90 text-[11px]">
                  ⚠️ This will permanently remove all nested folders, units, and topics contained under it.
                </span>
              )}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-inherit">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className={`px-3 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                  theme === 'dark' ? 'hover:bg-[#333333] text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirm.nodeType === 'topic') deleteTopic(deleteConfirm.itemId);
                  else if (deleteConfirm.nodeType === 'unit') deleteUnit(deleteConfirm.itemId);
                  else if (deleteConfirm.nodeType === 'group') deleteGroup(deleteConfirm.itemId);
                  else if (deleteConfirm.nodeType === 'subject') deleteSubject(deleteConfirm.itemId);
                  setDeleteConfirm(null);
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Unit / Topic Dialog */}
      {addItemDialog && (
        <div
          id="add-item-backdrop"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => setAddItemDialog(null)}
        >
          <div
            id="add-item-dialog"
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm p-4 rounded-lg shadow-2xl border space-y-3 ${
              theme === 'dark'
                ? 'bg-[#252526] border-[#3a3a3a] text-white shadow-black/80'
                : 'bg-white border-slate-300 text-slate-900 shadow-xl'
            }`}
          >
            <div className="flex items-center gap-2 text-[#007acc] font-semibold text-sm">
              <Plus className="w-4 h-4" />
              <span>Add New {addItemDialog.type === 'unit' ? 'Unit' : 'Topic'}</span>
            </div>
            <p className="text-xs text-slate-400">
              Adding under <span className="font-medium text-slate-200">{addItemDialog.parentName}</span>
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newItemName.trim()) return;
                if (addItemDialog.type === 'unit') {
                  addUnitManually(addItemDialog.parentId, newItemName.trim());
                } else {
                  addTopicManually(
                    addItemDialog.parentGroupId
                      ? { unitId: addItemDialog.parentId, groupId: addItemDialog.parentGroupId }
                      : { groupId: addItemDialog.parentId },
                    newItemName.trim()
                  );
                }
                setNewItemName('');
                setAddItemDialog(null);
              }}
              className="space-y-3"
            >
              <input
                type="text"
                autoFocus
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder={
                  addItemDialog.type === 'unit'
                    ? 'Unit name (e.g. Unit 3: Thermodynamics)...'
                    : 'Topic name...'
                }
                className={`w-full px-2.5 py-1.5 text-xs rounded border outline-none ${
                  theme === 'dark'
                    ? 'bg-[#1e1e1e] border-[#3c3c3c] text-white focus:border-[#007acc]'
                    : 'bg-white border-[#cccccc] text-[#1e1e1e] focus:border-[#007acc]'
                }`}
              />
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-inherit">
                <button
                  type="button"
                  onClick={() => setAddItemDialog(null)}
                  className={`px-3 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                    theme === 'dark' ? 'hover:bg-[#333333] text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newItemName.trim()}
                  className="px-3 py-1.5 bg-[#007acc] hover:bg-[#0066b8] disabled:opacity-50 text-white rounded text-xs font-medium transition-colors cursor-pointer"
                >
                  Add {addItemDialog.type === 'unit' ? 'Unit' : 'Topic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Dialog */}
      {renameDialog && (
        <div
          id="rename-backdrop"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => setRenameDialog(null)}
        >
          <div
            id="rename-dialog"
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm p-4 rounded-lg shadow-2xl border space-y-3 ${
              theme === 'dark'
                ? 'bg-[#252526] border-[#3a3a3a] text-white shadow-black/80'
                : 'bg-white border-slate-300 text-slate-900 shadow-xl'
            }`}
          >
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
              <Edit3 className="w-4 h-4" />
              <span>Rename {renameDialog.type.charAt(0).toUpperCase() + renameDialog.type.slice(1)}</span>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!renameInput.trim()) return;
                renameItem(renameDialog.type, renameDialog.itemId, renameInput.trim());
                setRenameDialog(null);
              }}
              className="space-y-3"
            >
              <input
                type="text"
                autoFocus
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                className={`w-full px-2.5 py-1.5 text-xs rounded border outline-none ${
                  theme === 'dark'
                    ? 'bg-[#1e1e1e] border-[#3c3c3c] text-white focus:border-[#007acc]'
                    : 'bg-white border-[#cccccc] text-[#1e1e1e] focus:border-[#007acc]'
                }`}
              />
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-inherit">
                <button
                  type="button"
                  onClick={() => setRenameDialog(null)}
                  className={`px-3 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                    theme === 'dark' ? 'hover:bg-[#333333] text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!renameInput.trim()}
                  className="px-3 py-1.5 bg-[#007acc] hover:bg-[#0066b8] disabled:opacity-50 text-white rounded text-xs font-medium transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
