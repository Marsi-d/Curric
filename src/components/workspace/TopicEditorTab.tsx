/**
 * Topic Detail View & In-Place Canonical Editor.
 *
 * Implements:
 * - Interactive breadcrumb trail (Mathematics › Grade 10 › Unit 3 › Topic)
 * - Stable ID display with 1-click clipboard copy
 * - Editable topic name & description directly mutating canonical store
 * - Subtopics list with count and ordering
 * - Source attribution (textbook, chapter, page)
 * - Prerequisites with cross-referencing and interactive links to target topics
 * - Ranking assignments display
 * - Developer-tool aesthetics (VS Code property/editor pane style)
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ChevronRight,
  Copy,
  Check,
  Edit3,
  Save,
  BookOpen,
  Layers,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Tag,
  Hash,
  ArrowUpDown,
  Plus,
  X,
  Trash2,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Topic, Subject, CurriculumGroup, Unit } from '../../types/curriculum';
import QuickRankTiles from './QuickRankTiles';

interface TopicEditorTabProps {
  topicId: string;
}

export default function TopicEditorTab({ topicId }: TopicEditorTabProps) {
  const {
    theme,
    curriculumDoc,
    updateTopic,
    deleteTopic,
    openTab,
    expandToItem,
    setActiveArea,
    activeRankingProfileId,
    addTopicToRanking,
    removeTopicFromRanking,
  } = useWorkspace();

  // Locate topic and its full structural ancestry in canonical document
  const { topic, subject, group, unit } = useMemo(() => {
    for (const s of curriculumDoc.subjects) {
      for (const g of s.groups) {
        for (const u of g.units) {
          const found = u.topics.find((t) => t.id === topicId);
          if (found) {
            return { topic: found, subject: s, group: g, unit: u };
          }
        }
        if (g.directTopics) {
          const found = g.directTopics.find((t) => t.id === topicId);
          if (found) {
            return { topic: found, subject: s, group: g, unit: undefined };
          }
        }
      }
    }
    return { topic: undefined, subject: undefined, group: undefined, unit: undefined };
  }, [curriculumDoc, topicId]);

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (topic) {
      setEditName(topic.name);
      setEditDescription(topic.description || '');
      setIsEditing(false);
    }
  }, [topic]);

  if (!topic || !subject || !group) {
    return (
      <div className="p-8 text-xs text-rose-400">
        Topic with ID <code className="font-mono">{topicId}</code> was not found in the active curriculum.
      </div>
    );
  }

  // Find ranking assignments for this topic
  const assignments = curriculumDoc.rankingAssignments.filter(
    (a) => a.itemId === topic.id
  );

  // Find prerequisite topics in canonical document
  const prerequisiteTopics = useMemo(() => {
    if (!topic.prerequisites || topic.prerequisites.length === 0) {
      return [];
    }
    const list: { id: string; name: string; path: string }[] = [];
    for (const prereqId of topic.prerequisites) {
      let resolved = false;
      for (const s of curriculumDoc.subjects) {
        for (const g of s.groups) {
          for (const u of g.units) {
            const match = u.topics.find((t) => t.id === prereqId);
            if (match) {
              list.push({
                id: match.id,
                name: match.name,
                path: `${s.name} › ${g.name} › ${u.name}`,
              });
              resolved = true;
              break;
            }
          }
          if (resolved) break;
          if (g.directTopics) {
            const match = g.directTopics.find((t) => t.id === prereqId);
            if (match) {
              list.push({
                id: match.id,
                name: match.name,
                path: `${s.name} › ${g.name}`,
              });
              resolved = true;
              break;
            }
          }
        }
        if (resolved) break;
      }
      if (!resolved) {
        list.push({
          id: prereqId,
          name: prereqId,
          path: 'Unresolved / External',
        });
      }
    }
    return list;
  }, [topic, curriculumDoc]);

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(topic.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1200);
    } catch {
      // ignore
    }
  };

  const handleSaveEdits = () => {
    updateTopic(topic.id, {
      name: editName.trim() || topic.name,
      description: editDescription.trim() || undefined,
    });
    setIsEditing(false);
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  };

  const handleNavigateBreadcrumb = (type: 'subject' | 'group' | 'unit') => {
    if (type === 'subject') {
      openTab(
        {
          id: `subject-${subject.id}`,
          title: subject.name,
          type: 'subject',
          subjectId: subject.id,
          isPinned: true,
        },
        true
      );
    } else {
      expandToItem(type === 'group' ? group.id : unit?.id || group.id);
    }
  };

  const handleOpenPrerequisite = (prereqId: string) => {
    expandToItem(prereqId);
    openTab(
      {
        id: `topic-${prereqId}`,
        title: prereqId,
        type: 'topic',
        topicId: prereqId,
        isPinned: true,
      },
      true
    );
  };

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [topicId]);

  return (
    <div
      id={`topic-editor-${topic.id}`}
      ref={containerRef}
      className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 max-w-4xl space-y-5 text-xs leading-relaxed"
    >
      {/* Interactive Breadcrumb Bar */}
      <nav
        id="topic-breadcrumb"
        className={`px-3 py-2 rounded border flex flex-wrap items-center gap-1.5 text-xs font-medium select-none ${
          theme === 'dark'
            ? 'bg-[#252526] border-[#333333] text-[#cccccc]'
            : 'bg-[#ffffff] border-[#e0e0e0] text-[#555555]'
        }`}
        aria-label="Hierarchy Breadcrumbs"
      >
        <button
          onClick={() => handleNavigateBreadcrumb('subject')}
          className="hover:text-[#007acc] transition-colors truncate"
          title={`View all of ${subject.name}`}
        >
          {subject.name}
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />

        <button
          onClick={() => handleNavigateBreadcrumb('group')}
          className="hover:text-[#007acc] transition-colors truncate"
        >
          {group.name}
        </button>

        {unit && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <button
              onClick={() => handleNavigateBreadcrumb('unit')}
              className="hover:text-[#007acc] transition-colors truncate"
            >
              {unit.name}
            </button>
          </>
        )}

        <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span className="font-semibold text-inherit truncate">
          {topic.name}
        </span>
      </nav>

      {/* Main Header / Editor Card */}
      <div
        className={`p-4 rounded border space-y-3 ${
          theme === 'dark' ? 'bg-[#252526] border-[#333333]' : 'bg-[#ffffff] border-[#e0e0e0]'
        }`}
      >
        {/* Title & Action Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-1">
            {isEditing ? (
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-wider text-[#888888]">
                  Topic Name (Canonical)
                </label>
                <input
                  id="topic-edit-name-input"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={`w-full px-2.5 py-1.5 text-sm font-semibold rounded border outline-none ${
                    theme === 'dark'
                      ? 'bg-[#1e1e1e] border-[#3c3c3c] text-white focus:border-[#007acc]'
                      : 'bg-[#ffffff] border-[#cccccc] text-[#1e1e1e] focus:border-[#007acc]'
                  }`}
                />
              </div>
            ) : (
              <h1 className="text-base font-bold text-inherit tracking-tight">
                {topic.name}
              </h1>
            )}

            {/* Stable ID Badge & Location */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800/40 text-[#888888] border border-slate-700/50">
                <Hash className="w-3 h-3 text-amber-400" />
                <span>{topic.id}</span>
                <button
                  id="topic-copy-id-btn"
                  onClick={handleCopyId}
                  className="ml-1 text-slate-400 hover:text-white"
                  title="Copy Stable ID"
                >
                  {copiedId ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </span>

              {topic.order !== undefined && (
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-700/20 text-[#888888]">
                  Order: #{topic.order}
                </span>
              )}

              {saveFeedback && (
                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" /> Saved to canonical store
                </span>
              )}
            </div>
          </div>

          {/* Edit / Save Buttons */}
          <div className="shrink-0 flex items-center gap-1.5">
            {isEditing ? (
              <>
                <button
                  id="topic-cancel-edit-btn"
                  onClick={() => {
                    setEditName(topic.name);
                    setEditDescription(topic.description || '');
                    setIsEditing(false);
                  }}
                  className={`px-3 py-1.5 rounded border text-xs font-medium transition-colors ${
                    theme === 'dark'
                      ? 'border-[#3c3c3c] hover:bg-[#333333]'
                      : 'border-[#cccccc] hover:bg-[#eeeeee]'
                  }`}
                >
                  Cancel
                </button>
                <button
                  id="topic-save-edit-btn"
                  onClick={handleSaveEdits}
                  className="px-3 py-1.5 rounded bg-[#007acc] text-white text-xs font-medium hover:bg-[#0066b8] transition-colors flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Edits
                </button>
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  id="topic-start-edit-btn"
                  onClick={() => setIsEditing(true)}
                  className={`px-3 py-1.5 rounded border text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                    theme === 'dark'
                      ? 'border-[#3c3c3c] hover:bg-[#2d2d2d] text-[#cccccc]'
                      : 'border-[#cccccc] hover:bg-[#f0f0f0] text-[#333333]'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Topic</span>
                </button>
                <button
                  id="topic-delete-btn"
                  onClick={() => setShowDeleteConfirm(true)}
                  className={`px-3 py-1.5 rounded border text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                    theme === 'dark'
                      ? 'border-rose-900/60 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300'
                      : 'border-rose-300 hover:bg-rose-50 text-rose-600 hover:text-rose-700'
                  }`}
                  title="Delete this topic manually"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Delete Topic</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="pt-2 border-t border-inherit space-y-1">
          <label className="text-[10px] font-mono uppercase tracking-wider text-[#888888]">
            Description
          </label>
          {isEditing ? (
            <textarea
              id="topic-edit-desc-input"
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Enter canonical syllabus topic description..."
              className={`w-full px-2.5 py-1.5 text-xs rounded border outline-none font-sans ${
                theme === 'dark'
                  ? 'bg-[#1e1e1e] border-[#3c3c3c] text-white focus:border-[#007acc]'
                  : 'bg-[#ffffff] border-[#cccccc] text-[#1e1e1e] focus:border-[#007acc]'
              }`}
            />
          ) : (
            <p className="text-xs text-[#999999]">
              {topic.description || (
                <span className="italic text-slate-500">No description provided for this topic.</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Subtopics Section */}
      <div
        className={`p-4 rounded border space-y-2.5 ${
          theme === 'dark' ? 'bg-[#252526] border-[#333333]' : 'bg-[#ffffff] border-[#e0e0e0]'
        }`}
      >
        <div className="flex items-center justify-between border-b pb-1.5 border-inherit">
          <div className="font-semibold text-xs flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#007acc]" />
            Subtopics ({topic.subtopics.length})
          </div>
          <span className="text-[10px] font-mono text-[#888888]">
            {topic.subtopics.length > 0 ? 'Structured sub-elements' : 'No subtopics defined'}
          </span>
        </div>

        {topic.subtopics.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-1">
            This topic does not specify granular subtopics.
          </p>
        ) : (
          <div className="space-y-1.5 pt-1">
            {topic.subtopics.map((st, idx) => (
              <div
                key={st.id}
                className={`px-2.5 py-1.5 rounded border flex items-center justify-between text-xs ${
                  theme === 'dark'
                    ? 'bg-[#1e1e1e] border-[#2e2e2e]'
                    : 'bg-[#f8f9fa] border-[#e9ecef]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                    {idx + 1}.
                  </span>
                  <span className="font-medium truncate text-inherit">{st.name}</span>
                </div>
                <span className="font-mono text-[10px] text-[#888888] shrink-0">
                  {st.id}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two-Column Grid: Source Info & Prerequisites */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source Attribution Card */}
        <div
          className={`p-4 rounded border space-y-2.5 ${
            theme === 'dark' ? 'bg-[#252526] border-[#333333]' : 'bg-[#ffffff] border-[#e0e0e0]'
          }`}
        >
          <div className="flex items-center gap-1.5 font-semibold text-xs border-b pb-1.5 border-inherit">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            Source Attribution
          </div>

          {topic.source ? (
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#888888]">Textbook / File:</span>
                <span className="text-inherit font-medium">
                  {topic.source.fileOrBook || 'Standard Syllabus'}
                </span>
              </div>
              {topic.source.chapterOrUnit && (
                <div className="flex items-center justify-between">
                  <span className="text-[#888888]">Chapter/Unit:</span>
                  <span className="text-inherit">{topic.source.chapterOrUnit}</span>
                </div>
              )}
              {topic.source.page !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-[#888888]">Page / Range:</span>
                  <span className="text-inherit">
                    p. {topic.source.page}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic py-1">
              No specific textbook or page attribution recorded.
            </p>
          )}
        </div>

        {/* Prerequisites Card */}
        <div
          className={`p-4 rounded border space-y-2.5 ${
            theme === 'dark' ? 'bg-[#252526] border-[#333333]' : 'bg-[#ffffff] border-[#e0e0e0]'
          }`}
        >
          <div className="flex items-center justify-between border-b pb-1.5 border-inherit">
            <div className="flex items-center gap-1.5 font-semibold text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              Prerequisites ({prerequisiteTopics.length})
            </div>
            <span className="text-[10px] font-mono text-[#888888]">Cross-grade &amp; subject</span>
          </div>

          {prerequisiteTopics.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-1">
              No foundational prerequisites mapped for this topic.
            </p>
          ) : (
            <div className="space-y-1 pt-0.5">
              {prerequisiteTopics.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleOpenPrerequisite(p.id)}
                  className={`p-2 rounded border cursor-pointer group flex items-center justify-between transition-colors ${
                    theme === 'dark'
                      ? 'bg-[#1e1e1e] border-[#2e2e2e] hover:border-[#007acc]'
                      : 'bg-[#f8f9fa] border-[#e9ecef] hover:border-[#007acc]'
                  }`}
                  title={`Open prerequisite: ${p.name}`}
                >
                  <div className="truncate pr-2">
                    <div className="font-medium text-xs group-hover:text-[#007acc] truncate">
                      {p.name}
                    </div>
                    <div className="text-[10px] text-[#888888] truncate">{p.path}</div>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-[#007acc] shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Topic Ranking & Prioritization Card (Decoupled Stable-ID Assignment) */}
      <div
        className={`p-4 rounded border space-y-3 ${
          theme === 'dark' ? 'bg-[#252526] border-[#333333]' : 'bg-[#ffffff] border-[#e0e0e0]'
        }`}
      >
        <div className="flex items-center justify-between border-b pb-2 border-inherit">
          <div className="font-semibold text-xs flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
            Topic Ranking &amp; Priority Status
          </div>
          <button
            onClick={() => setActiveArea('ranking')}
            className="text-[11px] text-[#007acc] hover:underline flex items-center gap-1 font-sans"
          >
            <span>Open Ranking Workspace</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* Active Profile Status */}
        {(() => {
          const activeProfile = curriculumDoc.rankingProfiles?.find(
            (p) => p.id === activeRankingProfileId
          ) || curriculumDoc.rankingProfiles?.[0];
          const activeAssignment = assignments.find(
            (a) => a.rankingProfileId === (activeProfile?.id || '')
          );

          return (
            <div className="space-y-2">
              <div
                className={`p-3 rounded border flex items-center justify-between text-xs ${
                  theme === 'dark'
                    ? 'bg-[#1e1e1e] border-[#2e2e2e]'
                    : 'bg-[#f8f9fa] border-[#e9ecef]'
                }`}
              >
                <div>
                  <div className="font-medium flex items-center gap-2">
                    <span>Active Profile:</span>
                    <span className="text-[#007acc] font-semibold">{activeProfile?.name}</span>
                  </div>
                  <div className="text-[11px] text-[#888888] mt-0.5">
                    {activeAssignment ? (
                      <span className="text-emerald-400 font-mono font-medium">
                        Ranked position #{activeAssignment.order}
                        {activeAssignment.notes ? ` • Note: "${activeAssignment.notes}"` : ''}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">
                        Currently unranked in this profile
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setActiveArea('ranking')}
                    className={`px-2 py-1 text-[11px] rounded border transition-colors flex items-center gap-1 ${
                      theme === 'dark'
                        ? 'border-[#3c3c3c] hover:bg-[#2e2e2e] text-slate-300'
                        : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                    }`}
                    title="Open Ranking Workspace"
                  >
                    <ArrowUpDown className="w-3 h-3 text-sky-400" />
                    <span>View in Rankings</span>
                  </button>

                  {activeAssignment ? (
                    <button
                      onClick={() =>
                        activeProfile &&
                        removeTopicFromRanking(activeProfile.id, topic.id)
                      }
                      className="px-2.5 py-1 text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 rounded border border-rose-900/40 transition-colors flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      <span>Unrank</span>
                    </button>
                  ) : (
                    activeProfile && (
                      <button
                        onClick={() => addTopicToRanking(activeProfile.id, topic.id)}
                        className="px-2.5 py-1 text-[11px] bg-[#007acc] hover:bg-[#0066b8] text-white rounded font-medium transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Rank Topic</span>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* 1-Tap Quick Ranking Horizontal Tiles */}
              <div className="pt-2 px-1 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">Quick Tier Assignment:</span>
                <QuickRankTiles
                  topicId={topic.id}
                  topicName={topic.name}
                  size="md"
                  showLabel={false}
                />
              </div>

              {/* Other Profile Assignments (if any) */}
              {assignments.length > (activeAssignment ? 1 : 0) && (
                <div className="pt-1">
                  <div className="text-[10px] uppercase font-mono text-[#888888] mb-1">
                    Other Profiles:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {assignments
                      .filter((a) => a.rankingProfileId !== activeProfile?.id)
                      .map((a) => {
                        const prof = curriculumDoc.rankingProfiles?.find(
                          (p) => p.id === a.rankingProfileId
                        );
                        return (
                          <div
                            key={a.id}
                            className="px-2 py-1 rounded bg-[#1e1e1e] border border-[#2e2e2e] flex items-center justify-between text-[11px] font-mono"
                          >
                            <span className="text-slate-400">{prof?.name || a.rankingProfileId}:</span>
                            <span className="text-amber-400 font-bold">
                              {a.order !== undefined ? `#${a.order}` : a.rank ? `Tier ${a.rank}` : 'Ranked'}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Delete Topic Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          id="topic-delete-confirmation-backdrop"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            id="topic-delete-confirmation-dialog"
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm p-4 rounded-lg shadow-2xl border space-y-3 ${
              theme === 'dark'
                ? 'bg-[#252526] border-[#3a3a3a] text-white shadow-black/80'
                : 'bg-white border-slate-300 text-slate-900 shadow-xl'
            }`}
          >
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
              <Trash2 className="w-4 h-4" />
              <span>Delete Topic: {topic.name}?</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-white">"{topic.name}"</strong>?
              This will remove its associations, ranking assignments, and prerequisite links from the active syllabus.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-inherit">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className={`px-3 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                  theme === 'dark' ? 'hover:bg-[#333333] text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteTopic(topic.id);
                  setShowDeleteConfirm(false);
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Topic</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
