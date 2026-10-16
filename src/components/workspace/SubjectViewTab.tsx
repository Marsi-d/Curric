/**
 * Scoped Subject Workspace Tab.
 *
 * Scoped exclusively to a single subject (e.g. Mathematics across Grades 9-12).
 * Strictly isolates content to avoid mixing subjects.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  BookOpen,
  Folder,
  FileText,
  Search,
  ExternalLink,
  Layers,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Subject, Topic, Unit, CurriculumGroup } from '../../types/curriculum';
import QuickRankTiles from './QuickRankTiles';

interface SubjectViewTabProps {
  subjectId: string;
}

export default function SubjectViewTab({ subjectId }: SubjectViewTabProps) {
  const {
    theme,
    curriculumDoc,
    openTab,
    expandToItem,
    deleteTopic,
    deleteUnit,
    deleteGroup,
    addUnitManually,
    addTopicManually,
  } = useWorkspace();
  const [filterQuery, setFilterQuery] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState<{
    nodeType: 'group' | 'unit' | 'topic';
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

  const subject: Subject | undefined = useMemo(() => {
    return curriculumDoc.subjects.find((s) => s.id === subjectId);
  }, [curriculumDoc, subjectId]);

  if (!subject) {
    return (
      <div className="p-6 text-xs text-rose-400">
        Subject not found ({subjectId}). It may have been renamed or removed.
      </div>
    );
  }

  // Calculate subject-level totals
  const totalUnits = subject.groups.reduce((acc, g) => acc + g.units.length, 0);
  const totalTopics = subject.groups.reduce(
    (acc, g) =>
      acc +
      g.units.reduce((uAcc, u) => uAcc + u.topics.length, 0) +
      (g.directTopics?.length || 0),
    0
  );

  const handleOpenTopic = (topic: Topic, group: CurriculumGroup, unit?: Unit) => {
    expandToItem(topic.id);
    openTab(
      {
        id: `topic-${topic.id}`,
        title: topic.name,
        type: 'topic',
        subjectId: subject.id,
        groupId: group.id,
        unitId: unit?.id,
        topicId: topic.id,
        isPinned: true,
      },
      true
    );
  };

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [subjectId]);

  return (
    <div id={`subject-view-${subject.id}`} ref={containerRef} className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 max-w-5xl space-y-5 text-xs">
      {/* Subject Header Banner */}
      <div
        className={`p-4 rounded border ${
          theme === 'dark' ? 'bg-[#252526] border-[#333333]' : 'bg-[#ffffff] border-[#e0e0e0]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400 shrink-0" />
              <h1 className="text-sm font-bold tracking-tight text-inherit">
                {subject.name}
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                {subject.type}
              </span>
              <span className="text-[10px] font-mono text-[#888888]">
                ID: {subject.id}
              </span>
            </div>
            <p className="text-[#888888] text-xs">
              {subject.description || `Canonical syllabus content for ${subject.name}.`}
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono shrink-0">
            <div className="px-2.5 py-1 rounded border border-inherit text-center">
              <span className="text-amber-400 font-bold">{subject.groups.length}</span>{' '}
              <span className="text-[#888888]">Grades</span>
            </div>
            <div className="px-2.5 py-1 rounded border border-inherit text-center">
              <span className="text-sky-400 font-bold">{totalUnits}</span>{' '}
              <span className="text-[#888888]">Units</span>
            </div>
            <div className="px-2.5 py-1 rounded border border-inherit text-center">
              <span className="text-emerald-400 font-bold">{totalTopics}</span>{' '}
              <span className="text-[#888888]">Topics</span>
            </div>
          </div>
        </div>

        {/* Scoped Filter Input */}
        <div className="mt-3 pt-3 border-t border-inherit">
          <div className="relative max-w-sm flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder={`Search topics in ${subject.name}...`}
              className={`w-full pl-8 pr-3 py-1.5 text-xs rounded border outline-none ${
                theme === 'dark'
                  ? 'bg-[#1e1e1e] border-[#3c3c3c] text-[#cccccc] focus:border-[#007acc]'
                  : 'bg-[#f8f9fa] border-[#cccccc] text-[#1e1e1e] focus:border-[#007acc]'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Grades / Categories Layout */}
      <div className="space-y-4">
        {subject.groups.length === 0 ? (
          <div
            className={`p-8 rounded border text-center ${
              theme === 'dark' ? 'bg-[#252526] border-[#333333]' : 'bg-[#ffffff] border-[#e0e0e0]'
            }`}
          >
            <div className="text-xs font-semibold mb-1">
              {subject.name} is currently empty
            </div>
            <div className="text-[11px] text-[#888888]">
              No grade folders or topics are currently defined. Ready for custom syllabus entries.
            </div>
          </div>
        ) : (
          subject.groups.map((group) => {
            const matchesInGroup = (text: string) =>
              !filterQuery.trim() || text.toLowerCase().includes(filterQuery.toLowerCase());

            const hasUnits = group.units && group.units.length > 0;
            const hasDirectTopics = group.directTopics && group.directTopics.length > 0;

            return (
              <div
                key={group.id}
                className={`rounded border overflow-hidden ${
                  theme === 'dark' ? 'bg-[#252526] border-[#333333]' : 'bg-[#ffffff] border-[#e0e0e0]'
                }`}
              >
                {/* Group Title Bar */}
                <div
                  className={`px-3.5 py-2 border-b flex items-center justify-between font-semibold ${
                    theme === 'dark' ? 'bg-[#1e1e1e] border-[#333333]' : 'bg-[#f4f4f4] border-[#e0e0e0]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-amber-300 fill-amber-300/20" />
                    <span className="text-xs">{group.name}</span>
                    {group.type === 'grade' && (
                      <span className="text-[10px] font-mono px-1 rounded bg-slate-700/30 text-[#888888]">
                        Grade Level
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-[#888888]">
                      {hasUnits
                        ? `${group.units.length} Units`
                        : hasDirectTopics
                        ? `${group.directTopics?.length || 0} Topics`
                        : '0 Units (Empty)'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setAddItemDialog({
                          type: 'unit',
                          parentId: group.id,
                          parentName: `${subject.name} › ${group.name}`,
                        })
                      }
                      title="Add Unit to this grade"
                      className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#007acc]/20 text-[#007acc] hover:bg-[#007acc] hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Unit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteConfirm({
                          nodeType: 'group',
                          itemId: group.id,
                          itemName: group.name,
                        })
                      }
                      title="Delete this grade / section folder"
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-900/30 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Units & Topics */}
                <div className="p-3 space-y-3">
                  {!hasUnits && !hasDirectTopics && (
                    <div className="py-4 text-center text-[11px] text-[#888888] italic flex flex-col items-center gap-2">
                      <span>Folder is empty. Ready for syllabus data or topic imports.</span>
                      <button
                        type="button"
                        onClick={() =>
                          setAddItemDialog({
                            type: 'unit',
                            parentId: group.id,
                            parentName: `${subject.name} › ${group.name}`,
                          })
                        }
                        className="px-3 py-1 bg-[#007acc] hover:bg-[#0066b8] text-white rounded text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Unit</span>
                      </button>
                    </div>
                  )}

                  {group.units.map((unit) => {
                  const filteredTopics = unit.topics.filter(
                    (t) => matchesInGroup(t.name) || matchesInGroup(unit.name)
                  );

                  if (filterQuery.trim() && filteredTopics.length === 0) return null;

                  return (
                    <div
                      key={unit.id}
                      className={`p-2.5 rounded border ${
                        theme === 'dark'
                          ? 'bg-[#1e1e1e]/60 border-[#2d2d2d]'
                          : 'bg-[#fafafa] border-[#e5e5e5]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-xs flex items-center gap-1.5 text-inherit">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                          {unit.name}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-[#888888]">
                            {unit.topics.length} topics
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setAddItemDialog({
                                type: 'topic',
                                parentId: unit.id,
                                parentGroupId: group.id,
                                parentName: unit.name,
                              })
                            }
                            title="Add topic to unit"
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#007acc]/20 text-[#007acc] hover:bg-[#007acc] hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            <span>Topic</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteConfirm({
                                nodeType: 'unit',
                                itemId: unit.id,
                                itemName: unit.name,
                              })
                            }
                            title="Delete Unit"
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-900/30 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                        {filteredTopics.map((topic) => (
                          <div
                            key={topic.id}
                            id={`subject-topic-card-${topic.id}`}
                            onClick={() => handleOpenTopic(topic, group, unit)}
                            className={`p-2.5 rounded border transition-colors cursor-pointer flex flex-col justify-between group ${
                              theme === 'dark'
                                ? 'bg-[#252526] border-[#333333] hover:border-[#007acc] hover:bg-[#2c2c2d]'
                                : 'bg-[#ffffff] border-[#e0e0e0] hover:border-[#007acc] hover:bg-[#f0f7ff]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1 mb-1.5">
                              <div className="truncate pr-1">
                                <div className="truncate font-medium text-xs group-hover:text-[#007acc] transition-colors">
                                  {topic.name}
                                </div>
                                <div className="text-[10px] text-[#888888] font-mono truncate">
                                  {topic.id}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
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
                                  className="p-1 opacity-0 group-hover:opacity-100 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 rounded transition-all cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                                <ExternalLink className="w-3 h-3 text-[#888888] group-hover:text-[#007acc] shrink-0" />
                              </div>
                            </div>

                            {/* Horizontal Quick Ranking Tiles */}
                            <div className="pt-1.5 border-t border-inherit/20" onClick={(e) => e.stopPropagation()}>
                              <QuickRankTiles
                                topicId={topic.id}
                                topicName={topic.name}
                                size="sm"
                                showLabel={true}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Direct Topics (Aptitude) */}
                {group.directTopics && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                    {group.directTopics
                      .filter((t) => matchesInGroup(t.name))
                      .map((topic) => (
                        <div
                          key={topic.id}
                          id={`subject-topic-card-${topic.id}`}
                          onClick={() => handleOpenTopic(topic, group, undefined)}
                          className={`p-2.5 rounded border transition-colors cursor-pointer flex flex-col justify-between group ${
                            theme === 'dark'
                              ? 'bg-[#1e1e1e] border-[#333333] hover:border-[#007acc]'
                              : 'bg-[#ffffff] border-[#e0e0e0] hover:border-[#007acc]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1 mb-1.5">
                            <div className="truncate pr-1">
                              <div className="truncate font-medium text-xs group-hover:text-[#007acc]">
                                {topic.name}
                              </div>
                              <div className="text-[10px] text-[#888888] font-mono truncate">
                                {topic.id}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
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
                                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 rounded transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                              <ExternalLink className="w-3 h-3 text-[#888888] group-hover:text-[#007acc] shrink-0" />
                            </div>
                          </div>

                          <div className="pt-1.5 border-t border-inherit/20" onClick={(e) => e.stopPropagation()}>
                            <QuickRankTiles
                              topicId={topic.id}
                              topicName={topic.name}
                              size="sm"
                              showLabel={true}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          );
        }))}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div
          id="subject-view-delete-modal-backdrop"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            id="subject-view-delete-modal"
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
                  ⚠️ This will permanently remove all topics and content within this folder.
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

      {/* Add Unit / Topic Modal */}
      {addItemDialog && (
        <div
          id="subject-view-add-modal-backdrop"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => setAddItemDialog(null)}
        >
          <div
            id="subject-view-add-modal"
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
              Adding to <span className="font-medium text-slate-200">{addItemDialog.parentName}</span>
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
                    ? 'Unit name (e.g. Unit 4: Organic Chemistry)...'
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
    </div>
  );
}
