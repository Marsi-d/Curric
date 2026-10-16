/**
 * Spaced Repetition Flashcard Review & Management Workspace.
 *
 * Implements:
 * - Deck overview with due, new, and learning count cards
 * - Distraction-free Study Session with question reveal (Spacebar or Tap)
 * - 4 FSRS review ratings with real-time interval predictions (<10m, 1d, 3d, 7d)
 * - Keyboard shortcuts (Space = show, 1 = Again, 2 = Hard, 3 = Good, 4 = Easy)
 * - Retention rate, review count, and streak statistics
 * - Create, edit, suspend, delete cards linked to curriculum topics
 * - Import and export card JSON
 * - Mobile optimized touch buttons
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Brain,
  RotateCcw,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Calendar,
  Flame,
  Award,
  Layers,
  Sparkles,
  Download,
  Upload,
  Edit2,
  Trash2,
  X,
  Eye,
  Check,
  Search,
  BookOpen,
  Filter,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Flashcard, FSRSRating } from '../../types/flashcards';
import { getRatingPreviews } from '../../utils/fsrsScheduler';
import ExplorerSquareButton from './ExplorerSquareButton';

export default function FlashcardWorkspaceView() {
  const {
    theme,
    flashcards,
    deckStats,
    addFlashcard,
    updateFlashcard,
    deleteFlashcard,
    suspendFlashcard,
    rateFlashcard,
    getDueCards,
    curriculumDoc,
    exportFlashcardsJSON,
    importFlashcardsJSON,
    batchAddFlashcards,
    setActiveArea,
  } = useWorkspace();

  // Study session mode vs deck management mode
  const [isStudying, setIsStudying] = useState(false);
  const [studyFilterTopicId, setStudyFilterTopicId] = useState<string>('all');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [completedInSession, setCompletedInSession] = useState(0);

  // New Card Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [cardFront, setCardFront] = useState('');
  const [cardBack, setCardBack] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [cardType, setCardType] = useState<'standard' | 'cloze'>('standard');

  // AI Card Generator Modal (moved from AI page)
  const [isAIGenerateModalOpen, setIsAIGenerateModalOpen] = useState(false);
  const [aiGenTopicId, setAiGenTopicId] = useState<string>('');
  const [aiGenCount, setAiGenCount] = useState<number>(5);
  const [aiGenNotes, setAiGenNotes] = useState<string>('');
  const [isGeneratingAICards, setIsGeneratingAICards] = useState<boolean>(false);
  const [aiGenPreview, setAiGenPreview] = useState<Array<{ front: string; back: string; cardType?: string; selected: boolean }>>([]);
  const [aiGenSuccessMsg, setAiGenSuccessMsg] = useState<string | null>(null);
  const [aiGenErrorMsg, setAiGenErrorMsg] = useState<string | null>(null);

  // Import / Export modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Search & filter in manager
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');

  // Flattened topics from curriculum for topic picker
  const allCurriculumTopics = useMemo(() => {
    const list: { id: string; name: string; subjectName: string; path: string }[] = [];
    curriculumDoc.subjects?.forEach((s) => {
      s.groups?.forEach((g) => {
        g.units?.forEach((u) => {
          u.topics?.forEach((t) => {
            list.push({
              id: t.id,
              name: t.name,
              subjectName: s.name,
              path: `${s.name} › ${g.name} › ${u.name} › ${t.name}`,
            });
          });
        });
        g.directTopics?.forEach((t) => {
          list.push({
            id: t.id,
            name: t.name,
            subjectName: s.name,
            path: `${s.name} › ${g.name} › ${t.name}`,
          });
        });
      });
    });
    return list;
  }, [curriculumDoc]);

  // Active study queue
  const studyQueue = useMemo(() => {
    const due = getDueCards();
    if (studyFilterTopicId === 'all') return due;
    return due.filter((c) => c.topicId === studyFilterTopicId);
  }, [getDueCards, studyFilterTopicId]);

  const currentStudyCard = studyQueue[currentCardIndex] || null;

  // Rating interval previews for current active card
  const intervalPreviews = useMemo(() => {
    if (!currentStudyCard) return [];
    return getRatingPreviews(currentStudyCard);
  }, [currentStudyCard]);

  // Keyboard navigation during review
  useEffect(() => {
    if (!isStudying || !currentStudyCard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid firing when user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsAnswerRevealed(true);
      } else if (isAnswerRevealed) {
        if (e.key === '1') {
          e.preventDefault();
          handleRate(1);
        } else if (e.key === '2') {
          e.preventDefault();
          handleRate(2);
        } else if (e.key === '3') {
          e.preventDefault();
          handleRate(3);
        } else if (e.key === '4') {
          e.preventDefault();
          handleRate(4);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStudying, currentStudyCard, isAnswerRevealed]);

  const handleRate = (rating: FSRSRating) => {
    if (!currentStudyCard) return;

    rateFlashcard(currentStudyCard.id, rating);
    setCompletedInSession((prev) => prev + 1);
    setIsAnswerRevealed(false);

    // If there are more cards in the queue, advance or loop
    if (currentCardIndex < studyQueue.length - 1) {
      setCurrentCardIndex((prev) => prev + 1);
    } else {
      // Reached the end of current cycle
      setCurrentCardIndex(0);
    }
  };

  const handleStartReview = (topicId?: string) => {
    if (topicId) setStudyFilterTopicId(topicId);
    else setStudyFilterTopicId('all');
    setCurrentCardIndex(0);
    setIsAnswerRevealed(false);
    setCompletedInSession(0);
    setIsStudying(true);
  };

  const handleCreateCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardFront.trim() || !cardBack.trim()) return;

    const matchedTopic = allCurriculumTopics.find((t) => t.id === selectedTopicId);

    addFlashcard({
      topicId: selectedTopicId || (allCurriculumTopics[0]?.id ?? 'general'),
      topicName: matchedTopic?.name,
      subjectName: matchedTopic?.subjectName,
      front: cardFront,
      back: cardBack,
      cardType,
    });

    setCardFront('');
    setCardBack('');
    setIsCreateModalOpen(false);
  };

  const handleExportDownload = () => {
    const jsonStr = exportFlashcardsJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `curriculum_flashcards_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = () => {
    if (!importJsonText.trim()) return;
    const res = importFlashcardsJSON(importJsonText);
    setImportStatus(`Imported ${res.added} cards successfully! (${res.errors} errors)`);
    setTimeout(() => {
      setIsImportModalOpen(false);
      setImportStatus(null);
      setImportJsonText('');
    }, 1200);
  };

  // Filtered cards for list manager
  const displayedCards = useMemo(() => {
    return flashcards.filter((c) => {
      if (selectedSubjectFilter !== 'all' && c.subjectName !== selectedSubjectFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.front.toLowerCase().includes(q) ||
          c.back.toLowerCase().includes(q) ||
          (c.topicName && c.topicName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [flashcards, selectedSubjectFilter, searchQuery]);

  // AI Card Generation Handlers
  const handleRunAIGenerate = async () => {
    const targetTopic = allCurriculumTopics.find((t) => t.id === aiGenTopicId) || allCurriculumTopics[0];
    if (!targetTopic) return;
    setIsGeneratingAICards(true);
    setAiGenErrorMsg(null);
    setAiGenSuccessMsg(null);

    try {
      const res = await fetch('/api/ai/generate-flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicName: targetTopic.name,
          subjectName: targetTopic.subjectName,
          notes: aiGenNotes,
          count: aiGenCount,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `Failed to generate flashcards (${res.status})`);
      }

      const data = await res.json();
      const cards = (data.cards || []).map((c: any) => ({
        ...c,
        selected: true,
      }));
      setAiGenPreview(cards);
    } catch (err: any) {
      console.error(err);
      setAiGenErrorMsg(err.message || 'Error generating cards. Please try again.');
    } finally {
      setIsGeneratingAICards(false);
    }
  };

  const handleSaveAIGeneratedCards = () => {
    const targetTopic = allCurriculumTopics.find((t) => t.id === aiGenTopicId) || allCurriculumTopics[0];
    if (!targetTopic) return;
    const cardsToSave = aiGenPreview.filter((c) => c.selected);
    if (!cardsToSave.length) return;

    const added = batchAddFlashcards(
      cardsToSave.map((c) => ({
        front: c.front,
        back: c.back,
        cardType: (c.cardType as any) || 'standard',
        topicId: targetTopic.id,
        topicName: targetTopic.name,
        subjectName: targetTopic.subjectName,
      }))
    );

    setAiGenSuccessMsg(`Added ${added} new flashcards to your deck!`);
    setAiGenPreview([]);
    setTimeout(() => {
      setIsAIGenerateModalOpen(false);
      setAiGenSuccessMsg(null);
    }, 1800);
  };

  return (
    <div
      id="flashcard-workspace-view"
      className={`flex-1 min-h-0 flex flex-col overflow-hidden text-xs ${
        theme === 'dark' ? 'bg-[#131314] text-[#e3e3e3]' : 'bg-slate-50 text-slate-800'
      }`}
    >
      {/* 1. Header Toolbar with Clean Modern Aesthetics: All buttons on single top line */}
      <header
        className={`h-11 sm:h-12 border-b flex items-center justify-between gap-2 shrink-0 transition-colors z-20 pr-2.5 sm:pr-4 overflow-x-auto scrollbar-none ${
          theme === 'dark' ? 'bg-[#131314] border-[#222425]' : 'bg-white border-[#e5e5e5]'
        }`}
      >
        {/* Left: Explorer Square Button flush at top-left corner */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 h-full">
          <ExplorerSquareButton />

          {!isStudying && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-medium pl-1">
              <span className="flex items-center gap-1 text-rose-400 font-bold shrink-0">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>{deckStats.dueCount} Due</span>
              </span>
              <span className="opacity-30">·</span>
              <span className="text-sky-400 font-medium shrink-0">{deckStats.newCount} New</span>
              <span className="opacity-30">·</span>
              <span className="text-emerald-400 font-medium shrink-0">{deckStats.retentionRate}% Recall</span>
            </div>
          )}
        </div>

        {/* Right: Action Buttons all on the single top line, guaranteed visible */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 justify-end">
          {!isStudying ? (
            <>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className={`h-8 px-2 sm:px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                  theme === 'dark'
                    ? 'border-[#282a2c] bg-[#1e1f20] hover:bg-[#282a2c] text-slate-300'
                    : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                }`}
                title="Import cards from JSON"
              >
                <Upload className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="hidden sm:inline">Import</span>
              </button>

              <button
                onClick={handleExportDownload}
                className={`h-8 px-2 sm:px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                  theme === 'dark'
                    ? 'border-[#282a2c] bg-[#1e1f20] hover:bg-[#282a2c] text-slate-300'
                    : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                }`}
                title="Export deck to JSON"
              >
                <Download className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="hidden sm:inline">Export</span>
              </button>

              <button
                onClick={() => {
                  setSelectedTopicId(allCurriculumTopics[0]?.id || '');
                  setIsCreateModalOpen(true);
                }}
                className={`h-8 px-2.5 sm:px-3 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                  theme === 'dark'
                    ? 'border-[#282a2c] bg-[#1e1f20] hover:bg-[#282a2c] text-slate-200'
                    : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-800'
                }`}
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden xs:inline">New Card</span>
              </button>

              {/* Primary Start Review Button - ALWAYS visible on screen */}
              <button
                id="flashcard-primary-review-btn"
                onClick={() => handleStartReview()}
                disabled={deckStats.dueCount + deckStats.newCount === 0}
                className="h-8 px-3 sm:px-4 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:cursor-not-allowed shrink-0"
                title="Start active recall session"
              >
                <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                <span>Review ({deckStats.dueCount + deckStats.newCount})</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsStudying(false)}
              className="h-8 px-3.5 rounded-lg text-xs font-semibold border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              <span>Exit Review</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. Main Content Area: Studying Mode VS Deck Hub */}
      {isStudying ? (
        /* STUDY REVIEW CANVAS */
        <div className="flex-1 min-h-0 flex flex-col items-center justify-between p-4 sm:p-8 max-w-3xl mx-auto w-full">
          {/* Study Progress Bar */}
          <div className="w-full flex items-center justify-between mb-4 text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="text-sky-400 font-semibold">
                Card {studyQueue.length > 0 ? currentCardIndex + 1 : 0} of {studyQueue.length}
              </span>
              <span className="text-slate-500">
                • {completedInSession} reviewed this session
              </span>
            </div>
            {currentStudyCard?.topicName && (
              <span className="px-2 py-0.5 rounded bg-slate-700/20 border border-slate-700/40 text-slate-300 text-[10px] truncate max-w-[200px]">
                {currentStudyCard.topicName}
              </span>
            )}
          </div>

          {/* Card Presentation Box with touch-to-flip */}
          {currentStudyCard ? (
            <div
              onClick={() => {
                if (!isAnswerRevealed) setIsAnswerRevealed(true);
              }}
              className={`w-full flex-1 min-h-[320px] max-h-[520px] rounded-2xl border shadow-xl flex flex-col justify-between p-5 sm:p-8 transition-all select-none cursor-pointer ${
                theme === 'dark'
                  ? 'bg-[#18181b] border-[#27272a]'
                  : 'bg-white border-slate-200'
              }`}
            >
              {/* Question / Front */}
              <div className="overflow-y-auto pr-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2">
                  Question / Recall Prompt
                </div>
                <div className="text-base sm:text-lg font-medium leading-relaxed whitespace-pre-wrap text-inherit">
                  {currentStudyCard.front}
                </div>
              </div>

              {/* Answer / Back Reveal */}
              {isAnswerRevealed ? (
                <div className="mt-6 pt-6 border-t border-inherit/20 overflow-y-auto animate-in fade-in duration-150">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 mb-2">
                    Answer / Key Concept
                  </div>
                  <div className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap text-slate-200 font-normal">
                    {currentStudyCard.back}
                  </div>
                </div>
              ) : (
                <div className="mt-8 pt-4 flex flex-col items-center justify-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAnswerRevealed(true);
                    }}
                    className="w-full sm:w-auto min-h-[48px] px-8 py-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-400 font-semibold text-sm transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Show Answer</span>
                    <span className="text-[10px] font-mono opacity-70 ml-1 hidden sm:inline">(Space or Tap)</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              <div className="space-y-1">
                <h3 className="font-bold text-base text-inherit">Review Queue Completed!</h3>
                <p className="text-slate-400 max-w-sm">
                  You have reviewed all due cards for this session. Great job keeping your memory retention high!
                </p>
              </div>
              <button
                onClick={() => setIsStudying(false)}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#007acc] text-white font-medium cursor-pointer shadow-sm"
              >
                Back to Deck Hub
              </button>
            </div>
          )}

          {/* Rating Buttons with Estimated Intervals (FSRS 4-Tier, min 48px touch targets) */}
          {currentStudyCard && isAnswerRevealed && (
            <div className="w-full mt-4 sm:mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
              {intervalPreviews.map((preview) => {
                const buttonStyles: Record<FSRSRating, string> = {
                  1: 'border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400',
                  2: 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400',
                  3: 'border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400',
                  4: 'border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400',
                };

                return (
                  <button
                    key={preview.rating}
                    onClick={() => handleRate(preview.rating)}
                    className={`min-h-[52px] py-2.5 px-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 ${buttonStyles[preview.rating]}`}
                  >
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider mb-0.5">
                      {preview.intervalText}
                    </div>
                    <div className="font-bold text-xs sm:text-sm">{preview.label}</div>
                    <span className="text-[9px] font-mono opacity-60 mt-0.5 hidden sm:inline">
                      ({preview.rating})
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* DECK HUB & CARD MANAGER */
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-6xl mx-auto w-full">
          {/* Deck Statistics Dashboard: Clean Modern Aesthetic */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Due Today */}
            <div
              className={`p-4 rounded-xl border flex flex-col justify-between ${
                theme === 'dark' ? 'bg-[#18181b] border-[#27272a]' : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="font-semibold text-[11px] tracking-wide uppercase">Due for Review</span>
                <Calendar className="w-4 h-4 text-rose-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-rose-400">{deckStats.dueCount}</span>
                <span className="text-[10px] text-slate-400">cards due</span>
              </div>
            </div>

            {/* New Cards */}
            <div
              className={`p-4 rounded-xl border flex flex-col justify-between ${
                theme === 'dark' ? 'bg-[#18181b] border-[#27272a]' : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="font-semibold text-[11px] tracking-wide uppercase">New Cards</span>
                <Sparkles className="w-4 h-4 text-sky-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-sky-400">{deckStats.newCount}</span>
                <span className="text-[10px] text-slate-400">unseen</span>
              </div>
            </div>

            {/* Retention Rate */}
            <div
              className={`p-4 rounded-xl border flex flex-col justify-between ${
                theme === 'dark' ? 'bg-[#18181b] border-[#27272a]' : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="font-semibold text-[11px] tracking-wide uppercase">Retention Rate</span>
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-400">{deckStats.retentionRate}%</span>
                <span className="text-[10px] text-slate-400">success recall</span>
              </div>
            </div>

            {/* Streak */}
            <div
              className={`p-4 rounded-xl border flex flex-col justify-between ${
                theme === 'dark' ? 'bg-[#18181b] border-[#27272a]' : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="font-semibold text-[11px] tracking-wide uppercase">Study Streak</span>
                <Flame className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-400">{deckStats.streakDays}</span>
                <span className="text-[10px] text-slate-400">days streak</span>
              </div>
            </div>
          </div>

          {/* Quick Start Action Card: Clean Modern styling */}
          <div
            className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              theme === 'dark'
                ? 'bg-[#18181b] border-[#27272a]'
                : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="space-y-1">
              <h2 className="font-bold text-sm sm:text-base text-inherit flex items-center gap-2">
                <span>Today&apos;s Review Session</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono font-bold">
                  {deckStats.dueCount + deckStats.newCount} cards ready
                </span>
              </h2>
              <p className="text-slate-400 text-xs">
                Active recall review scheduled using the Free Spaced Repetition Scheduler (FSRS v4.5).
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => setActiveArea('ai')}
                className="px-3 py-2 rounded-xl text-xs font-semibold border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Generate Cards</span>
              </button>

              <button
                onClick={() => handleStartReview()}
                disabled={deckStats.dueCount + deckStats.newCount === 0}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white flex items-center gap-2 transition-all cursor-pointer shadow-sm disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start Review ({deckStats.dueCount + deckStats.newCount})</span>
              </button>
            </div>
          </div>

          {/* Card Management List */}
          <div
            className={`rounded-xl border overflow-hidden ${
              theme === 'dark' ? 'bg-[#252526] border-[#38383a]' : 'bg-white border-slate-200'
            }`}
          >
            {/* Filter Bar */}
            <div className="p-3 border-b border-inherit/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter cards by question or answer..."
                  className="w-full bg-transparent outline-none text-xs placeholder:text-slate-500 font-sans"
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-mono text-[11px]">
                  {displayedCards.length} cards total
                </span>
              </div>
            </div>

            {/* Cards List */}
            <div className="divide-y divide-inherit/20 max-h-[500px] overflow-y-auto">
              {displayedCards.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <BookOpen className="w-8 h-8 mx-auto text-slate-500" />
                  <p className="font-medium text-xs">No flashcards found</p>
                  <p className="text-[11px] text-slate-500">
                    Create cards manually or use the AI Tutor to generate them directly from your curriculum.
                  </p>
                </div>
              ) : (
                displayedCards.map((card) => (
                  <div
                    key={card.id}
                    className={`p-3.5 flex items-start justify-between gap-4 transition-colors ${
                      theme === 'dark' ? 'hover:bg-[#2b2b2c]' : 'hover:bg-slate-50'
                    } ${card.suspended ? 'opacity-50' : ''}`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {card.topicName && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-500/15 text-sky-400 border border-sky-500/30">
                            {card.topicName}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-400">
                          Stability: {card.stability.toFixed(1)}d • Reps: {card.reps}
                        </span>
                        {card.suspended && (
                          <span className="text-[10px] font-mono text-amber-400 uppercase">
                            Suspended
                          </span>
                        )}
                      </div>

                      <div className="font-semibold text-xs text-inherit line-clamp-2">
                        {card.front}
                      </div>
                      <div className="text-slate-400 text-[11px] line-clamp-2">
                        {card.back}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pt-1">
                      <button
                        onClick={() => suspendFlashcard(card.id, !card.suspended)}
                        className={`p-1.5 rounded transition-colors cursor-pointer ${
                          card.suspended
                            ? 'text-amber-400 hover:bg-amber-400/20'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-black/20'
                        }`}
                        title={card.suspended ? 'Unsuspend card' : 'Suspend card from reviews'}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => deleteFlashcard(card.id)}
                        className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                        title="Delete card"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. New Card Dialog Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-lg rounded-2xl border shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150 ${
              theme === 'dark' ? 'bg-[#252526] border-[#38383a]' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-inherit/40">
              <h3 className="font-bold text-sm text-inherit flex items-center gap-2">
                <Plus className="w-4 h-4 text-sky-400" />
                <span>Create Curriculum Flashcard</span>
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCardSubmit} className="space-y-3.5 text-xs">
              {/* Linked Curriculum Topic */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-400 text-[11px]">
                  Link to Curriculum Topic:
                </label>
                <select
                  value={selectedTopicId}
                  onChange={(e) => setSelectedTopicId(e.target.value)}
                  className={`w-full p-2 rounded-lg border text-xs outline-none cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-[#1e1e1e] border-[#38383a] text-slate-200'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  {allCurriculumTopics.map((top) => (
                    <option key={top.id} value={top.id}>
                      {top.path}
                    </option>
                  ))}
                </select>
              </div>

              {/* Front Question */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-400 text-[11px]">
                  Front (Prompt / Question):
                </label>
                <textarea
                  rows={3}
                  value={cardFront}
                  onChange={(e) => setCardFront(e.target.value)}
                  placeholder="e.g. State Newton's Second Law of Motion formula and explain variables."
                  className={`w-full p-2.5 rounded-lg border text-xs outline-none resize-none font-sans ${
                    theme === 'dark'
                      ? 'bg-[#1e1e1e] border-[#38383a] text-slate-200 focus:border-sky-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-sky-500'
                  }`}
                  required
                />
              </div>

              {/* Back Answer */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-400 text-[11px]">
                  Back (Answer / Concept Rationale):
                </label>
                <textarea
                  rows={4}
                  value={cardBack}
                  onChange={(e) => setCardBack(e.target.value)}
                  placeholder="e.g. F = ma (Force equals mass multiplied by acceleration)."
                  className={`w-full p-2.5 rounded-lg border text-xs outline-none resize-none font-sans ${
                    theme === 'dark'
                      ? 'bg-[#1e1e1e] border-[#38383a] text-slate-200 focus:border-sky-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-sky-500'
                  }`}
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-inherit/40">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-500/30 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#007acc] hover:bg-[#0066b8] text-white font-semibold cursor-pointer"
                >
                  Save Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Import JSON Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-lg rounded-2xl border shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150 ${
              theme === 'dark' ? 'bg-[#252526] border-[#38383a]' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-inherit/40">
              <h3 className="font-bold text-sm text-inherit flex items-center gap-2">
                <Upload className="w-4 h-4 text-sky-400" />
                <span>Import Flashcards JSON</span>
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-400">
                Paste JSON array of flashcards (containing <code className="font-mono">front</code> and <code className="font-mono">back</code> fields):
              </p>
              <textarea
                rows={8}
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder='[ { "front": "Question...", "back": "Answer..." } ]'
                className={`w-full p-2.5 rounded-lg border font-mono text-xs outline-none resize-none ${
                  theme === 'dark'
                    ? 'bg-[#1e1e1e] border-[#38383a] text-slate-200'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
              {importStatus && (
                <div className="p-2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px]">
                  {importStatus}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-inherit/40">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-500/30 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleImportSubmit}
                className="px-4 py-1.5 rounded-lg bg-[#007acc] hover:bg-[#0066b8] text-white font-semibold cursor-pointer"
              >
                Import Cards
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Dedicated AI Flashcard Generator Modal (Moved from AI page) */}
      {isAIGenerateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150 overflow-hidden ${
              theme === 'dark' ? 'bg-[#252526] border-[#38383a]' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-inherit/40 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-sky-500/10 text-sky-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-inherit">AI Flashcard Generator</h3>
                  <p className="text-[11px] text-slate-400">Powered by Gemini 3.8 Flash</p>
                </div>
              </div>
              <button
                onClick={() => setIsAIGenerateModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Target topic select */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-400 text-[11px]">Target Curriculum Topic:</label>
                <select
                  value={aiGenTopicId}
                  onChange={(e) => setAiGenTopicId(e.target.value)}
                  className={`w-full p-2 rounded-lg border text-xs outline-none cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-[#1e1e1e] border-[#38383a] text-slate-200'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  {allCurriculumTopics.map((top) => (
                    <option key={top.id} value={top.id}>
                      {top.path}
                    </option>
                  ))}
                </select>
              </div>

              {/* Count & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-400 text-[11px]">Number of Cards:</label>
                  <select
                    value={aiGenCount}
                    onChange={(e) => setAiGenCount(Number(e.target.value))}
                    className={`w-full p-2 rounded-lg border text-xs outline-none cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-[#1e1e1e] border-[#38383a] text-slate-200'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value={3}>3 Cards (Quick overview)</option>
                    <option value={5}>5 Cards (Standard focus)</option>
                    <option value={8}>8 Cards (Deep mastery)</option>
                    <option value={10}>10 Cards (Comprehensive)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-400 text-[11px]">Extra Notes / Focus (Optional):</label>
                  <input
                    type="text"
                    value={aiGenNotes}
                    onChange={(e) => setAiGenNotes(e.target.value)}
                    placeholder="e.g. Focus on key mechanisms and formulas..."
                    className={`w-full p-2 rounded-lg border text-xs outline-none ${
                      theme === 'dark'
                        ? 'bg-[#1e1e1e] border-[#38383a] text-slate-200'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Status messages */}
              {aiGenErrorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs flex items-center justify-between">
                  <span>{aiGenErrorMsg}</span>
                  <button
                    onClick={handleRunAIGenerate}
                    className="underline font-semibold cursor-pointer ml-2 shrink-0"
                  >
                    Retry
                  </button>
                </div>
              )}

              {aiGenSuccessMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{aiGenSuccessMsg}</span>
                </div>
              )}

              {/* Cards Preview */}
              {aiGenPreview.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-inherit/30">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-inherit">Generated Cards Preview ({aiGenPreview.filter((c) => c.selected).length}/{aiGenPreview.length} selected):</span>
                    <button
                      type="button"
                      onClick={() => {
                        const allSelected = aiGenPreview.every((c) => c.selected);
                        setAiGenPreview(aiGenPreview.map((c) => ({ ...c, selected: !allSelected })));
                      }}
                      className="text-sky-400 hover:underline cursor-pointer text-[11px]"
                    >
                      {aiGenPreview.every((c) => c.selected) ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {aiGenPreview.map((card, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setAiGenPreview(
                            aiGenPreview.map((c, i) => (i === idx ? { ...c, selected: !c.selected } : c))
                          );
                        }}
                        className={`p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                          card.selected
                            ? theme === 'dark'
                              ? 'bg-sky-500/10 border-sky-500/40 text-slate-200'
                              : 'bg-sky-50 border-sky-300 text-slate-800'
                            : 'opacity-50 border-inherit/20'
                        }`}
                      >
                        <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                          <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[10px] ${
                            card.selected ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold' : 'border-slate-500'
                          }`}>
                            {card.selected ? '✓' : ''}
                          </span>
                          <span>Q: {card.front}</span>
                        </div>
                        <div className="mt-1 pl-5 text-slate-400 text-[11px]">
                          A: {card.back}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-inherit/40 shrink-0">
              <button
                type="button"
                onClick={() => setIsAIGenerateModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-500/30 text-slate-400 hover:text-slate-200 cursor-pointer text-xs"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRunAIGenerate}
                  disabled={isGeneratingAICards}
                  className="px-3.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAICards ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingAICards ? 'Generating...' : aiGenPreview.length > 0 ? 'Regenerate' : 'Generate'}</span>
                </button>

                {aiGenPreview.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSaveAIGeneratedCards}
                    disabled={!aiGenPreview.some((c) => c.selected)}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-xs disabled:opacity-40"
                  >
                    Add {aiGenPreview.filter((c) => c.selected).length} to Deck
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
