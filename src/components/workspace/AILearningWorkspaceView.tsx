/**
 * Google Gemini-Inspired AI Study Tutor & Learning Workspace.
 *
 * Implements:
 * - Real Gemini website look and feel (signature floating rounded pill input, clean conversation stream, sparkle branding)
 * - Persistent chat sessions saved in LocalStorage (switching between saved chats, renaming, deleting, "+ New chat")
 * - Fresh new chat created by default on page refresh (Item 8)
 * - Removed circular purple AI icons on response and thinking indicator (Item 8)
 * - Interactive Quiz Engine (Item 4):
 *   - Identifies quiz requests and passes isQuizRequest to AI
 *   - Renders a horizontal rectangle card in chat to enter dedicated quiz page
 *   - Dedicated hidden quiz app view with clickable left arrow to exit
 *   - "Done" button that replies to AI in background and gives real-time feedback without leaving app
 *   - Background replies and AI feedback are visible when returning to the chat page
 * - Hides bottom activity bar when typing or digital keyboard is open (Item 5)
 * - Message container internal scrolling fix to prevent top bar from ever hiding (Item 3)
 * - Explorer button sits flush at top-left corner
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Plus,
  Check,
  CheckCircle2,
  X,
  Edit2,
  Trash2,
  Copy,
  RefreshCw,
  MessageSquare,
  PanelLeft,
  Lightbulb,
  HelpCircle,
  AlertCircle,
  BookOpen,
  ChevronDown,
  ArrowLeft,
  ArrowRight,
  Award,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import ExplorerSquareButton from './ExplorerSquareButton';

export interface AIChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  isError?: boolean;
}

export interface AIChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  focusTopicId?: string;
  messages: AIChatMessage[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface QuizPayload {
  id: string;
  title: string;
  topic: string;
  questions: QuizQuestion[];
}

const STORAGE_KEY = 'gemini_saved_chats_v2';

/**
 * Robust extractor for structured quizzes from assistant text.
 * Handles ```quiz ... ```, ```json ... ```, and standard formatted multiple choice text.
 */
export function extractQuizFromText(text: string): { quiz: QuizPayload | null; cleanText: string } {
  // 1. Check for fenced ```quiz or ```json block
  const fencedRegex = /```(?:quiz|json)?\s*([\s\S]*?)\s*```/;
  const match = text.match(fencedRegex);

  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        const quiz: QuizPayload = {
          id: `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: parsed.title || 'Curriculum Mastery Quiz',
          topic: parsed.topic || 'Curriculum Focus',
          questions: parsed.questions.map((q: any, idx: number) => ({
            id: q.id || `q-${idx + 1}`,
            question: q.question || `Question ${idx + 1}`,
            options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['A. True', 'B. False'],
            correctAnswer: (q.correctAnswer || 'A').toString().trim(),
            explanation: q.explanation || 'Review syllabus fundamentals for this question.',
          })),
        };
        const cleanText = text.replace(fencedRegex, '').trim();
        return { quiz, cleanText };
      }
    } catch {
      // not JSON format
    }
  }

  // 2. Check for numbered multiple choice questions (e.g. 1. Question... A. ... B. ...)
  if (/(?:Question\s*1\b|\b1\.\s+).*\n\s*[A-D][\.\)]/i.test(text) && /\bB[\.\)]/i.test(text)) {
    try {
      const parts = text.split(/(?=(?:Question\s*\d+:?|\b\d+\.\s+))/i).filter((p) => p.trim().length > 15);
      if (parts.length >= 2) {
        const questions: QuizQuestion[] = [];
        parts.forEach((block, idx) => {
          const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
          const qText = lines[0]?.replace(/^(?:Question\s*\d+:?|\d+\.\s+)/i, '').trim() || `Question ${idx + 1}`;
          const options = lines.filter((l) => /^[A-D][\.\)]/i.test(l));
          if (options.length >= 2) {
            questions.push({
              id: `q-${idx + 1}`,
              question: qText,
              options,
              correctAnswer: 'A',
              explanation: 'Solidify your understanding by reviewing the core topic definition.',
            });
          }
        });

        if (questions.length >= 2) {
          return {
            quiz: {
              id: `quiz-parsed-${Date.now()}`,
              title: 'Interactive Practice Quiz',
              topic: 'Curriculum Focus',
              questions,
            },
            cleanText: 'Here is your interactive practice quiz! Tap the quiz card below to test your recall.',
          };
        }
      }
    } catch {
      // fallback
    }
  }

  return { quiz: null, cleanText: text };
}

export default function AILearningWorkspaceView() {
  const {
    theme,
    curriculumDoc,
    deckStats,
    setIsAITyping,
  } = useWorkspace();

  // Cleanup typing status when leaving AI view
  useEffect(() => {
    return () => {
      setIsAITyping(false);
    };
  }, [setIsAITyping]);

  // Flattened topic list from curriculum
  const allTopics = useMemo(() => {
    const list: { id: string; name: string; subjectName: string; path: string; description?: string }[] = [];
    curriculumDoc.subjects?.forEach((s) => {
      s.groups?.forEach((g) => {
        g.units?.forEach((u) => {
          u.topics?.forEach((t) => {
            list.push({
              id: t.id,
              name: t.name,
              subjectName: s.name,
              path: `${s.name} › ${g.name} › ${u.name} › ${t.name}`,
              description: t.description,
            });
          });
        });
        g.directTopics?.forEach((t) => {
          list.push({
            id: t.id,
            name: t.name,
            subjectName: s.name,
            path: `${s.name} › ${g.name} › ${t.name}`,
            description: t.description,
          });
        });
      });
    });
    return list;
  }, [curriculumDoc]);

  // Selected focus topic for grounding
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');

  useEffect(() => {
    if (!selectedTopicId && allTopics.length > 0) {
      setSelectedTopicId(allTopics[0].id);
    }
  }, [allTopics, selectedTopicId]);

  const activeTopic = useMemo(() => {
    return allTopics.find((t) => t.id === selectedTopicId) || allTopics[0];
  }, [allTopics, selectedTopicId]);

  // Sidebar toggle state (for saved chats drawer/sidebar)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  // Unique session ID generated on page load/refresh
  const initialSessionId = useMemo(() => `session-${Date.now()}`, []);

  // Saved Chat Sessions State with LocalStorage Persistence
  // Item 8: Open a fresh new chat by default on page refresh, while retaining previous chats in storage
  const [chatSessions, setChatSessions] = useState<AIChatSession[]>(() => {
    const freshNewSession: AIChatSession = {
      id: initialSessionId,
      title: 'New Chat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: `init-msg-${Date.now()}`,
          role: 'model',
          text: 'Hello! I am your Gemini study tutor. I have full context on your curriculum subjects, topics, and spaced repetition progress. How can I help you master your material today?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    };

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return [freshNewSession, ...parsed];
        }
      }
    } catch (e) {
      console.error('Failed to parse saved chats:', e);
    }

    return [freshNewSession];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(initialSessionId);

  // Persist sessions to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chatSessions));
    } catch (e) {
      console.error('Failed to save chats to storage:', e);
    }
  }, [chatSessions]);

  // Current active session
  const activeSession = useMemo(() => {
    return chatSessions.find((s) => s.id === activeSessionId) || chatSessions[0];
  }, [chatSessions, activeSessionId]);

  // Input and sending state
  const [chatInput, setChatInput] = useState<string>('');
  const [isChatSending, setIsChatSending] = useState<boolean>(false);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Chat renaming state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState<string>('');

  // Item 3 Fix: Dedicated inner message container ref to scroll ONLY the chat stream and NEVER scroll the window or push the top bar off screen!
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, [activeSession?.messages, isChatSending]);

  // =========================================================================
  // DEDICATED INTERACTIVE QUIZ ENGINE STATE (Item 4)
  // =========================================================================
  const [activeQuiz, setActiveQuiz] = useState<QuizPayload | null>(null);
  const [currentQuizQuestionIndex, setCurrentQuizQuestionIndex] = useState<number>(0);
  const [userQuizAnswers, setUserQuizAnswers] = useState<Record<string, string>>({});
  const [isQuizSubmitted, setIsQuizSubmitted] = useState<boolean>(false);
  const [isSubmittingQuizToAI, setIsSubmittingQuizToAI] = useState<boolean>(false);
  const [quizRealTimeFeedback, setQuizRealTimeFeedback] = useState<string | null>(null);

  // Launch a quiz into the dedicated hidden page
  const handleLaunchQuiz = (quiz: QuizPayload) => {
    setActiveQuiz(quiz);
    setCurrentQuizQuestionIndex(0);
    setUserQuizAnswers({});
    setIsQuizSubmitted(false);
    setIsSubmittingQuizToAI(false);
    setQuizRealTimeFeedback(null);
  };

  // Exit quiz back to chat
  const handleExitQuiz = () => {
    setActiveQuiz(null);
    setCurrentQuizQuestionIndex(0);
  };

  // Handle Option Selection
  const handleSelectQuizOption = (questionId: string, option: string) => {
    if (isQuizSubmitted) return;
    setUserQuizAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  // Handle Quiz "Done" Button submission
  const handleCompleteQuiz = async () => {
    if (!activeQuiz) return;
    setIsQuizSubmitted(true);
    setIsSubmittingQuizToAI(true);

    const questions = activeQuiz.questions;
    let score = 0;
    const answerBreakdown: string[] = [];

    questions.forEach((q, idx) => {
      const selected = userQuizAnswers[q.id] || 'Skipped';
      const selectedNormalized = selected.trim().toUpperCase();
      const correctNormalized = q.correctAnswer.trim().toUpperCase();

      // Check if selected starts with correct letter or contains correct answer
      const isCorrect =
        selectedNormalized.startsWith(correctNormalized) ||
        (correctNormalized.length === 1 && selectedNormalized.startsWith(`${correctNormalized}.`)) ||
        selectedNormalized.includes(correctNormalized);

      if (isCorrect) {
        score++;
      }

      answerBreakdown.push(
        `${idx + 1}. ${q.question}\n- Chosen Answer: ${selected}\n- Correct Answer: ${q.correctAnswer}\n- Result: ${isCorrect ? 'Correct ✓' : 'Incorrect ✗'}\n- Key Concept: ${q.explanation}`
      );
    });

    const total = questions.length;
    const pct = Math.round((score / total) * 100);

    const quizUserMessageText = `[Interactive Quiz Completed: "${activeQuiz.title}"]\nTopic: ${activeQuiz.topic}\nScore: ${score}/${total} (${pct}%)\n\nDetailed Question Breakdown:\n${answerBreakdown.join('\n\n')}`;

    const userMessage: AIChatMessage = {
      id: `usr-quiz-${Date.now()}`,
      role: 'user',
      text: quizUserMessageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // 1. Immediately store user answers into the active chat session in the background
    setChatSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id
          ? {
              ...s,
              updatedAt: new Date().toISOString(),
              messages: [...s.messages, userMessage],
            }
          : s
      )
    );

    // 2. Reply to the AI in the background to get real-time feedback without leaving app
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `I just completed the quiz on "${activeQuiz.topic}" with a score of ${score}/${total} (${pct}%).\nHere are my answers:\n${answerBreakdown.join('\n')}\n\nPlease give me real-time pedagogical feedback: congratulate my strengths, clearly explain why any missed concepts were wrong, and give me a memorable tip to retain this material!`,
          history: [...(activeSession?.messages || []), userMessage].slice(-6).map((m) => ({ role: m.role, text: m.text })),
          curriculumContext: {
            title: curriculumDoc.title || 'Curriculum',
            focusTopic: activeQuiz.topic,
            focusSubject: activeTopic?.subjectName || '',
            deckStats,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiFeedback =
          data.reply ||
          `Great effort on completing the quiz! You achieved ${score}/${total} (${pct}%). Review your explanations to solidify your memory retention!`;

        setQuizRealTimeFeedback(aiFeedback);

        const modelMessage: AIChatMessage = {
          id: `mod-quiz-${Date.now()}`,
          role: 'model',
          text: aiFeedback,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        // Store AI feedback in active chat session background history
        setChatSessions((prev) =>
          prev.map((s) =>
            s.id === activeSession.id
              ? {
                  ...s,
                  updatedAt: new Date().toISOString(),
                  messages: [...s.messages, modelMessage],
                }
              : s
          )
        );
      } else {
        setQuizRealTimeFeedback(`Quiz completed with ${score}/${total} (${pct}%). Great job testing your recall!`);
      }
    } catch (err) {
      console.error('Failed to get background AI quiz feedback:', err);
      setQuizRealTimeFeedback(`Quiz completed with ${score}/${total} (${pct}%). Keep up the great active study!`);
    } finally {
      setIsSubmittingQuizToAI(false);
    }
  };

  // Create new chat
  const handleCreateNewChat = () => {
    const newSession: AIChatSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: 'New Chat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: `msg-${Date.now()}`,
          role: 'model',
          text: 'Hello! What would you like to explore or learn today?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    };

    setChatSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setChatInput('');
    setLastFailedPrompt(null);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  // Delete chat
  const handleDeleteChat = (idToDelete: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const remaining = chatSessions.filter((s) => s.id !== idToDelete);
    if (remaining.length === 0) {
      const fresh: AIChatSession = {
        id: `session-${Date.now()}`,
        title: 'New Chat',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [
          {
            id: `msg-${Date.now()}`,
            role: 'model',
            text: 'Hello! What would you like to explore or learn today?',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ],
      };
      setChatSessions([fresh]);
      setActiveSessionId(fresh.id);
    } else {
      setChatSessions(remaining);
      if (activeSessionId === idToDelete) {
        setActiveSessionId(remaining[0].id);
      }
    }
  };

  // Start session rename
  const handleStartRename = (session: AIChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitleText(session.title);
  };

  // Save session rename
  const handleSaveRename = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editingSessionId || !editingTitleText.trim()) {
      setEditingSessionId(null);
      return;
    }

    setChatSessions((prev) =>
      prev.map((s) => (s.id === editingSessionId ? { ...s, title: editingTitleText.trim(), updatedAt: new Date().toISOString() } : s))
    );
    setEditingSessionId(null);
  };

  // Send message helper
  const sendMessageWithPrompt = async (promptToSend: string) => {
    if (!promptToSend.trim() || isChatSending) return;

    const trimmedMsg = promptToSend.trim();
    const isQuizReq = /\b(quiz|test me|practice questions|exam questions)\b/i.test(trimmedMsg);

    const userMessage: AIChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text: trimmedMsg,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const currentMessages = activeSession?.messages || [];
    const updatedMessages = [...currentMessages, userMessage];

    // Auto-title chat on first user message if title is default
    let updatedTitle = activeSession?.title || 'New Chat';
    if (updatedTitle === 'New Chat' || updatedTitle === 'Curriculum Study Tutor') {
      updatedTitle = trimmedMsg.length > 28 ? `${trimmedMsg.substring(0, 28)}...` : trimmedMsg;
    }

    setChatSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id
          ? {
              ...s,
              title: updatedTitle,
              updatedAt: new Date().toISOString(),
              messages: updatedMessages,
            }
          : s
      )
    );

    setChatInput('');
    setIsChatSending(true);
    setLastFailedPrompt(null);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedMsg,
          isQuizRequest: isQuizReq,
          history: updatedMessages.slice(-8).map((m) => ({ role: m.role, text: m.text })),
          curriculumContext: {
            title: curriculumDoc.title || 'Curriculum',
            focusTopic: activeTopic?.name || '',
            focusSubject: activeTopic?.subjectName || '',
            topics: allTopics.slice(0, 20).map((t) => ({ name: t.name, subject: t.subjectName })),
            deckStats,
          },
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `Request failed with status ${res.status}`);
      }

      const data = await res.json();
      const modelMessage: AIChatMessage = {
        id: `mod-${Date.now()}`,
        role: 'model',
        text: data.reply || 'I am ready to help you learn.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id
            ? {
                ...s,
                updatedAt: new Date().toISOString(),
                messages: [...s.messages, modelMessage],
              }
            : s
        )
      );
    } catch (err: any) {
      console.error('Chat error:', err);
      setLastFailedPrompt(trimmedMsg);

      const errorMessage: AIChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: err.message || 'Unable to reach the Gemini service. Please check your connection or retry.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };

      setChatSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id
            ? {
                ...s,
                updatedAt: new Date().toISOString(),
                messages: [...s.messages, errorMessage],
              }
            : s
        )
      );
    } finally {
      setIsChatSending(false);
    }
  };

  const handleSendChat = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;
    sendMessageWithPrompt(chatInput);
  };

  // Retry sending the last failed prompt
  const handleRetryPrompt = () => {
    if (lastFailedPrompt) {
      sendMessageWithPrompt(lastFailedPrompt);
    }
  };

  // Copy message text to clipboard
  const handleCopyMessage = async (msgId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(msgId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // Format assistant text with clean paragraphs, code formatting, bullet lists
  const formatGeminiResponse = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('### ')) {
        return (
          <h4 key={i} className="text-sm font-bold text-inherit mt-3 mb-1">
            {line.replace('### ', '')}
          </h4>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h3 key={i} className="text-sm sm:text-base font-bold text-inherit mt-3.5 mb-1.5">
            {line.replace('## ', '')}
          </h3>
        );
      }
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
          <li key={i} className="ml-4 list-disc my-0.5 leading-relaxed">
            {renderBoldFormattedText(line.trim().replace(/^[-*]\s+/, ''))}
          </li>
        );
      }
      if (/^\d+\.\s/.test(line.trim())) {
        return (
          <li key={i} className="ml-4 list-decimal my-0.5 leading-relaxed">
            {renderBoldFormattedText(line.trim().replace(/^\d+\.\s+/, ''))}
          </li>
        );
      }
      if (!line.trim()) {
        return <div key={i} className="h-2" />;
      }
      return (
        <p key={i} className="leading-relaxed">
          {renderBoldFormattedText(line)}
        </p>
      );
    });
  };

  // Helper for bold formatting within lines
  const renderBoldFormattedText = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-semibold text-inherit">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const isConversationEmpty = (activeSession?.messages?.length || 0) <= 1;

  // =========================================================================
  // DEDICATED INTERACTIVE QUIZ VIEW (Hidden page dedicated to the quiz)
  // =========================================================================
  if (activeQuiz) {
    const totalQuestions = activeQuiz.questions.length;
    const currentQ = activeQuiz.questions[currentQuizQuestionIndex] || activeQuiz.questions[0];
    const answeredCount = Object.keys(userQuizAnswers).length;
    const progressPercent = Math.round(((currentQuizQuestionIndex + 1) / totalQuestions) * 100);

    let calculatedScore = 0;
    activeQuiz.questions.forEach((q) => {
      const ans = userQuizAnswers[q.id] || '';
      if (ans.trim().toUpperCase().startsWith(q.correctAnswer.trim().toUpperCase())) {
        calculatedScore++;
      }
    });

    return (
      <div
        id="gemini-dedicated-quiz-view"
        className={`flex-1 min-h-0 flex flex-col h-full overflow-hidden font-sans select-none text-xs ${
          theme === 'dark' ? 'bg-[#131314] text-[#e3e3e3]' : 'bg-[#f8f9fa] text-[#1f1f1f]'
        }`}
      >
        {/* Top Header Bar with Clickable Left Arrow Button to Exit */}
        <header
          className={`h-12 border-b shrink-0 flex items-center justify-between px-3 sm:px-6 transition-colors z-20 ${
            theme === 'dark' ? 'bg-[#1e1f20] border-[#222425]' : 'bg-white border-[#e5e7eb]'
          }`}
        >
          {/* Clickable Left Arrow Button to exit back to chat */}
          <button
            onClick={handleExitQuiz}
            className={`h-8 px-3 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
              theme === 'dark'
                ? 'bg-[#282a2c] hover:bg-[#333537] border-[#383a3c] text-white'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
            }`}
            title="Exit quiz and return to Gemini chat"
          >
            <ArrowLeft className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Back to Chat</span>
          </button>

          {/* Quiz Title & Focus Topic */}
          <div className="flex items-center gap-2 min-w-0 px-2 text-center">
            <span className="font-bold text-xs sm:text-sm truncate">
              {activeQuiz.title}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 hidden md:inline shrink-0">
              {activeQuiz.topic}
            </span>
          </div>

          {/* Question Index Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono font-medium text-slate-400">
              {currentQuizQuestionIndex + 1} / {totalQuestions}
            </span>
          </div>
        </header>

        {/* Progress Bar Indicator */}
        <div className="w-full h-1 bg-slate-800/20 overflow-hidden shrink-0">
          <div
            className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Quiz Canvas Content Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 max-w-2xl mx-auto w-full flex flex-col justify-between">
          <div className="space-y-6">
            {/* Question Counter Pill & Topic Tag */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400 bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20">
                Question {currentQuizQuestionIndex + 1} of {totalQuestions}
              </span>

              {isQuizSubmitted && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  <Award className="w-4 h-4" />
                  <span>Score: {calculatedScore} / {totalQuestions}</span>
                </div>
              )}
            </div>

            {/* Question Text */}
            <h2 className="text-base sm:text-lg font-bold leading-relaxed text-inherit select-text">
              {currentQ.question}
            </h2>

            {/* Multiple Choice Options A, B, C, D */}
            <div className="space-y-2.5 pt-2">
              {currentQ.options.map((option, optIdx) => {
                const isSelected = userQuizAnswers[currentQ.id] === option;
                const optionLetter = String.fromCharCode(65 + optIdx); // A, B, C, D
                const isCorrectOption =
                  currentQ.correctAnswer.trim().toUpperCase() === optionLetter ||
                  option.trim().toUpperCase().startsWith(currentQ.correctAnswer.trim().toUpperCase());

                let optionStyles = '';
                if (!isQuizSubmitted) {
                  optionStyles = isSelected
                    ? 'border-sky-500 bg-sky-500/15 text-sky-200 ring-2 ring-sky-500/30 font-semibold'
                    : theme === 'dark'
                    ? 'bg-[#1e1f20] hover:bg-[#282a2c] border-[#2e3032] text-slate-200'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800';
                } else {
                  if (isCorrectOption) {
                    optionStyles = 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold ring-2 ring-emerald-500/30';
                  } else if (isSelected && !isCorrectOption) {
                    optionStyles = 'border-rose-500 bg-rose-500/20 text-rose-300 line-through ring-1 ring-rose-500/40';
                  } else {
                    optionStyles = theme === 'dark'
                      ? 'bg-[#1e1f20]/50 border-[#2e3032] opacity-50 text-slate-400'
                      : 'bg-white/50 border-slate-200 opacity-50 text-slate-500';
                  }
                }

                return (
                  <button
                    key={optIdx}
                    type="button"
                    disabled={isQuizSubmitted}
                    onClick={() => handleSelectQuizOption(currentQ.id, option)}
                    className={`w-full p-3.5 sm:p-4 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-center justify-between gap-3 cursor-pointer ${optionStyles}`}
                  >
                    <span className="leading-snug select-text">{option}</span>
                    <div className="shrink-0">
                      {isQuizSubmitted && isCorrectOption && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                      {isQuizSubmitted && isSelected && !isCorrectOption && (
                        <X className="w-4 h-4 text-rose-400" />
                      )}
                      {!isQuizSubmitted && isSelected && (
                        <div className="w-3.5 h-3.5 rounded-full bg-sky-400 ring-2 ring-white/20" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Explanation card after submit */}
            {isQuizSubmitted && (
              <div
                className={`p-4 rounded-xl border space-y-1.5 animate-in fade-in duration-200 select-text ${
                  theme === 'dark' ? 'bg-[#1e1f20] border-[#2e3032]' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-sky-400">
                  <Lightbulb className="w-4 h-4" />
                  <span>Concept Explanation</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentQ.explanation}
                </p>
              </div>
            )}

            {/* Real-Time Background AI Coaching Feedback Card */}
            {isQuizSubmitted && (
              <div
                className={`p-4 sm:p-5 rounded-2xl border space-y-2 select-text ${
                  theme === 'dark' ? 'bg-[#1b2230] border-sky-500/30' : 'bg-sky-50/70 border-sky-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs text-sky-400">
                    <Sparkles className="w-4 h-4" />
                    <span>Gemini Real-Time Coaching Feedback</span>
                  </div>
                  {isSubmittingQuizToAI && (
                    <span className="text-[10px] text-sky-400 animate-pulse font-mono">
                      Generating AI feedback...
                    </span>
                  )}
                </div>

                {isSubmittingQuizToAI ? (
                  <div className="py-2 flex items-center gap-2 text-xs text-slate-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                    <span>Analyzing your answers in background...</span>
                  </div>
                ) : (
                  <div className="text-xs text-inherit leading-relaxed whitespace-pre-wrap">
                    {quizRealTimeFeedback}
                  </div>
                )}

                <div className="pt-2 border-t border-inherit/20 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Feedback saved to Gemini chat</span>
                  <button
                    onClick={handleExitQuiz}
                    className="font-semibold text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View in Chat</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Question Navigation & Done Button */}
          <div className="pt-6 border-t border-inherit/20 flex items-center justify-between gap-3 mt-8">
            <button
              onClick={() => setCurrentQuizQuestionIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentQuizQuestionIndex === 0}
              className={`h-9 px-3.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                theme === 'dark'
                  ? 'bg-[#1e1f20] hover:bg-[#282a2c] border-[#333537] text-slate-300'
                  : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {/* Done Button (Triggers background submission and real-time AI feedback) */}
            {!isQuizSubmitted ? (
              <button
                id="quiz-done-button"
                onClick={handleCompleteQuiz}
                disabled={answeredCount === 0}
                className="h-9 px-6 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:cursor-not-allowed active:scale-95"
                title="Finish quiz and get real-time feedback"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Done ({answeredCount}/{totalQuestions})</span>
              </button>
            ) : (
              <button
                onClick={handleExitQuiz}
                className="h-9 px-6 rounded-xl font-bold text-xs bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95"
              >
                <span>Return to Chat</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setCurrentQuizQuestionIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
              disabled={currentQuizQuestionIndex === totalQuestions - 1}
              className={`h-9 px-3.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                theme === 'dark'
                  ? 'bg-[#1e1f20] hover:bg-[#282a2c] border-[#333537] text-slate-300'
                  : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
              }`}
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MAIN GEMINI STUDY TUTOR CHAT WORKSPACE
  // =========================================================================
  return (
    <div
      id="gemini-workspace-view"
      className={`flex-1 min-h-0 flex flex-row overflow-hidden font-sans select-none text-xs ${
        theme === 'dark' ? 'bg-[#131314] text-[#e3e3e3]' : 'bg-[#ffffff] text-[#1f1f1f]'
      }`}
    >
      {/* ========================================================================= */}
      {/* 1. LEFT SIDEBAR: SAVED CHATS & RECENT CONVERSATIONS (Gemini Style)        */}
      {/* ========================================================================= */}
      <aside
        id="gemini-recent-chats-sidebar"
        className={`shrink-0 flex flex-col border-r transition-all duration-200 z-30 ${
          isSidebarOpen ? 'w-64 sm:w-72' : 'w-0 -translate-x-full lg:w-0'
        } overflow-hidden ${
          theme === 'dark'
            ? 'bg-[#1e1f20] border-[#222425] text-[#c4c7c5]'
            : 'bg-[#f0f4f9] border-[#e0e3e7] text-[#444746]'
        }`}
      >
        <div className="p-3 border-b flex items-center justify-between shrink-0 border-inherit/30">
          {/* New Chat Button */}
          <button
            id="gemini-new-chat-btn"
            onClick={handleCreateNewChat}
            className={`flex-1 h-9 px-3.5 rounded-full flex items-center gap-2 font-medium text-xs transition-colors cursor-pointer shadow-xs ${
              theme === 'dark'
                ? 'bg-[#2b2c2e] hover:bg-[#333537] text-white border border-white/10'
                : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-300'
            }`}
          >
            <Plus className="w-4 h-4 text-sky-400 shrink-0" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Saved Sessions List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-none">
          <div className="px-2 py-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Recent Chats
          </div>

          {chatSessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const isEditing = editingSessionId === session.id;

            return (
              <div
                key={session.id}
                onClick={() => {
                  setActiveSessionId(session.id);
                  if (typeof window !== 'undefined' && window.innerWidth < 768) {
                    setIsSidebarOpen(false);
                  }
                }}
                className={`group px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                  isActive
                    ? theme === 'dark'
                      ? 'bg-[#004a77]/40 text-sky-200 font-semibold'
                      : 'bg-[#c2e7ff] text-[#001d35] font-semibold'
                    : theme === 'dark'
                    ? 'hover:bg-[#282a2c] text-slate-300'
                    : 'hover:bg-slate-200/70 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  {isEditing ? (
                    <form onSubmit={handleSaveRename} className="flex-1 mr-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingTitleText}
                        onChange={(e) => setEditingTitleText(e.target.value)}
                        onBlur={() => handleSaveRename()}
                        autoFocus
                        className="w-full px-1.5 py-0.5 rounded text-xs bg-slate-900 text-white outline-none border border-sky-400"
                      />
                    </form>
                  ) : (
                    <span className="truncate">{session.title}</span>
                  )}
                </div>

                {!isEditing && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={(e) => handleStartRename(session, e)}
                      className="p-1 rounded hover:bg-black/20 text-slate-400 hover:text-white"
                      title="Rename chat"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteChat(session.id, e)}
                      className="p-1 rounded hover:bg-black/20 text-slate-400 hover:text-rose-400"
                      title="Delete chat"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer: Curriculum Grounding Context */}
        <div className="p-3 border-t border-inherit/20 shrink-0 text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center gap-1.5 font-medium text-inherit truncate">
            <BookOpen className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="truncate">{curriculumDoc.title || 'Curriculum'}</span>
          </div>
          <div className="text-[10px] opacity-75">
            {allTopics.length} syllabus topics grounded
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN GEMINI CONVERSATION CONTAINER                                     */}
      {/* ========================================================================= */}
      <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">
        {/* Top Header Bar: Clean & Minimal with Explorer Square Button flush on left */}
        <header
          id="gemini-header-bar"
          className={`h-11 sm:h-12 border-b shrink-0 flex items-center justify-between transition-colors z-20 pr-3 sm:pr-4 ${
            theme === 'dark' ? 'bg-[#131314] border-[#222425]' : 'bg-white border-[#f0f0f0]'
          }`}
        >
          {/* Left: Explorer Square Button & Sidebar toggle */}
          <div className="flex items-center h-full shrink-0">
            <ExplorerSquareButton />

            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className={`w-11 sm:w-12 h-full border-r flex items-center justify-center transition-colors cursor-pointer select-none ${
                  theme === 'dark'
                    ? 'hover:bg-[#222] border-[#222425] text-slate-300'
                    : 'hover:bg-slate-100 border-[#e0e0e0] text-slate-700'
                }`}
                title="Open recent chats sidebar"
              >
                <PanelLeft className="w-4.5 h-4.5" />
              </button>
            )}

            {/* Gemini Brand Sparkle Logo */}
            <div className="flex items-center gap-1.5 pl-3">
              <span className="font-bold text-sm sm:text-base tracking-tight bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Gemini
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 hidden xs:inline">
                3.8 Flash
              </span>
            </div>
          </div>

          {/* Right: Grounding Topic Selector & New Chat Button */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 hidden md:inline">Focus Topic:</span>
              <div className="relative flex items-center">
                <select
                  value={selectedTopicId}
                  onChange={(e) => setSelectedTopicId(e.target.value)}
                  className={`h-7.5 pl-2 pr-6 rounded-lg text-xs border outline-none max-w-[130px] sm:max-w-[200px] truncate cursor-pointer appearance-none ${
                    theme === 'dark'
                      ? 'bg-[#1e1f20] border-[#383a3c] text-slate-200'
                      : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                  title="Select topic to ground explanations and quizzes"
                >
                  {allTopics.map((top) => (
                    <option key={top.id} value={top.id}>
                      {top.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 absolute right-2 pointer-events-none text-slate-400" />
              </div>
            </div>

            <button
              onClick={handleCreateNewChat}
              className={`h-7.5 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                theme === 'dark'
                  ? 'bg-[#1e1f20] hover:bg-[#282a2c] border-[#383a3c] text-slate-200'
                  : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800'
              }`}
              title="Start a fresh chat"
            >
              <Plus className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">New</span>
            </button>
          </div>
        </header>

        {/* Message Stream: Item 3 Fix with internal scrolling container */}
        <div
          ref={messageContainerRef}
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-6 max-w-3xl mx-auto w-full"
        >
          {/* Welcome State when conversation is fresh */}
          {isConversationEmpty && (
            <div className="py-8 sm:py-14 text-center max-w-lg mx-auto space-y-5 animate-in fade-in duration-200 select-none">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500/20 via-indigo-500/20 to-purple-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 mx-auto shadow-sm">
                <Sparkles className="w-6 h-6 text-sky-400" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                  Hello, Learner
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  How can I help you master your curriculum today?
                </p>
              </div>

              {/* Gemini Signature Prompt Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-left">
                <button
                  type="button"
                  onClick={() => {
                    const prompt = `Explain the concept of "${activeTopic?.name || 'this topic'}" in simple terms. Break it down step-by-step with an intuitive real-world analogy, common misconceptions to avoid, and 3 key takeaways.`;
                    sendMessageWithPrompt(prompt);
                  }}
                  className={`p-3.5 rounded-2xl border text-xs transition-all cursor-pointer group text-left ${
                    theme === 'dark'
                      ? 'bg-[#1e1f20] hover:bg-[#282a2c] border-[#2e3032] text-slate-200'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-1 text-sky-400 group-hover:text-sky-300">
                    <Lightbulb className="w-4 h-4" />
                    <span>Explain Concept</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    Step-by-step breakdown of "{activeTopic?.name || 'active topic'}" with intuition &amp; analogies.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const prompt = `Generate an interactive practice quiz on "${activeTopic?.name || 'this topic'}".`;
                    sendMessageWithPrompt(prompt);
                  }}
                  className={`p-3.5 rounded-2xl border text-xs transition-all cursor-pointer group text-left ${
                    theme === 'dark'
                      ? 'bg-[#1e1f20] hover:bg-[#282a2c] border-[#2e3032] text-slate-200'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-1 text-indigo-400 group-hover:text-indigo-300">
                    <HelpCircle className="w-4 h-4" />
                    <span>Practice Quiz</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    Launch an interactive quiz to test active recall with instant feedback.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const prompt = `Give me a high-yield study summary of "${activeTopic?.name || 'this topic'}", focusing on core formulas, key terminology, and high-probability exam topics.`;
                    sendMessageWithPrompt(prompt);
                  }}
                  className={`p-3.5 rounded-2xl border text-xs transition-all cursor-pointer group text-left ${
                    theme === 'dark'
                      ? 'bg-[#1e1e20] hover:bg-[#282a2c] border-[#2e3032] text-slate-200'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-1 text-amber-400 group-hover:text-amber-300">
                    <Sparkles className="w-4 h-4" />
                    <span>High-Yield Summary</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    Key formulas, essential definitions, and high-probability test items.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const prompt = `Based on my curriculum, what are the most important prerequisite concepts and foundation topics I should master before tackling "${activeTopic?.name || 'this topic'}"?`;
                    sendMessageWithPrompt(prompt);
                  }}
                  className={`p-3.5 rounded-2xl border text-xs transition-all cursor-pointer group text-left ${
                    theme === 'dark'
                      ? 'bg-[#1e1e20] hover:bg-[#282a2c] border-[#2e3032] text-slate-200'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-1 text-emerald-400 group-hover:text-emerald-300">
                    <BookOpen className="w-4 h-4" />
                    <span>Prerequisites</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    Master key foundations before tackling advanced concepts.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Active Messages List */}
          {activeSession?.messages?.map((msg) => {
            const isUser = msg.role === 'user';
            const isCopied = copiedMessageId === msg.id;

            // Check if model message contains structured quiz (Item 4)
            const extracted = !isUser ? extractQuizFromText(msg.text) : { quiz: null, cleanText: msg.text };

            return (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs sm:text-[13px] leading-relaxed ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* Item 8: Removed circular purple AI avatar when responding */}

                <div
                  className={`max-w-[90%] sm:max-w-[82%] rounded-2xl px-4 py-3 select-text ${
                    isUser
                      ? theme === 'dark'
                        ? 'bg-[#2b2c2e] text-white rounded-br-xs'
                        : 'bg-[#e9eef6] text-[#1f1f1f] rounded-br-xs'
                      : msg.isError
                      ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                      : theme === 'dark'
                      ? 'bg-[#1e1f20]/60 border border-[#2e3032] text-inherit'
                      : 'bg-slate-50 border border-slate-200 text-inherit'
                  }`}
                >
                  {/* Message Content */}
                  <div className="space-y-2 whitespace-pre-wrap select-text">
                    {msg.isError ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-rose-400">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>Request Error</span>
                        </div>
                        <p>{msg.text}</p>
                        <button
                          type="button"
                          onClick={handleRetryPrompt}
                          disabled={isChatSending}
                          className="mt-2 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Retry Request</span>
                        </button>
                      </div>
                    ) : isUser ? (
                      <div className="font-sans whitespace-pre-wrap">{msg.text}</div>
                    ) : (
                      <>
                        <div className="font-sans select-text">
                          {formatGeminiResponse(extracted.cleanText || msg.text)}
                        </div>

                        {/* Item 4: Interactive Quiz Horizontal Rectangle Card */}
                        {extracted.quiz && (
                          <div
                            onClick={() => handleLaunchQuiz(extracted.quiz!)}
                            className={`w-full mt-3 p-4 rounded-xl border flex items-center justify-between gap-4 cursor-pointer transition-all group select-none shadow-sm ${
                              theme === 'dark'
                                ? 'bg-[#1e1f20] hover:bg-[#282a2c] border-[#383a3c] hover:border-sky-500/50'
                                : 'bg-white hover:bg-slate-50 border-slate-300 hover:border-sky-400'
                            }`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                <HelpCircle className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                                    Interactive Quiz
                                  </span>
                                  <span className="text-xs text-slate-400 font-mono">
                                    {extracted.quiz.questions.length} Questions
                                  </span>
                                </div>
                                <div className="font-bold text-sm text-inherit truncate mt-1 group-hover:text-sky-400 transition-colors">
                                  {extracted.quiz.title}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                  Tap to open interactive quiz app
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs font-semibold text-sky-400 hidden xs:inline">
                                Start Quiz
                              </span>
                              <div className="w-8 h-8 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center group-hover:bg-sky-500 group-hover:text-slate-950 transition-colors">
                                <ArrowRight className="w-4 h-4" />
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Message Bottom Action Bar */}
                  {!isUser && !msg.isError && (
                    <div className="mt-2.5 pt-2 border-t border-inherit/20 flex items-center gap-2 text-[11px] text-slate-400">
                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.text)}
                        className="flex items-center gap-1 hover:text-inherit cursor-pointer transition-colors p-1 rounded"
                        title="Copy response to clipboard"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopied ? 'Copied' : 'Copy'}</span>
                      </button>

                      <span className="opacity-40">·</span>
                      <span className="text-[10px]">{msg.timestamp}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Thinking / Sending indicator (Item 8: removed circular purple AI icon) */}
          {isChatSending && (
            <div className="flex gap-2 text-xs justify-start animate-in fade-in duration-150">
              <div className="py-2 px-3 rounded-xl bg-[#1e1f20]/50 border border-[#2e3032] text-slate-400 flex items-center gap-2">
                <RefreshCw className="w-3 h-3 animate-spin text-sky-400" />
                <span>Gemini is generating response...</span>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 3. GEMINI SIGNATURE BOTTOM FLOATING INPUT BOX                             */}
        {/* ========================================================================= */}
        <div className="shrink-0 p-3 sm:p-5 pt-0 max-w-3xl mx-auto w-full">
          {/* Quick suggestions above input */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none text-[11px]">
            <button
              onClick={() => {
                const prompt = `Explain "${activeTopic?.name}" in simple terms with an analogy.`;
                sendMessageWithPrompt(prompt);
              }}
              className={`px-2.5 py-1 rounded-full border shrink-0 transition-colors cursor-pointer ${
                theme === 'dark'
                  ? 'bg-[#1e1f20] hover:bg-[#282a2c] border-[#333537] text-slate-300'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              }`}
            >
              💡 Explain {activeTopic?.name || 'Topic'}
            </button>

            <button
              onClick={() => {
                const prompt = `Generate an interactive quiz on "${activeTopic?.name}".`;
                sendMessageWithPrompt(prompt);
              }}
              className={`px-2.5 py-1 rounded-full border shrink-0 transition-colors cursor-pointer ${
                theme === 'dark'
                  ? 'bg-[#1e1f20] hover:bg-[#282a2c] border-[#333537] text-slate-300'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              }`}
            >
              📝 Quiz me
            </button>

            <button
              onClick={() => {
                const prompt = `Summarize key formulas and high-yield test points for "${activeTopic?.name}".`;
                sendMessageWithPrompt(prompt);
              }}
              className={`px-2.5 py-1 rounded-full border shrink-0 transition-colors cursor-pointer ${
                theme === 'dark'
                  ? 'bg-[#1e1f20] hover:bg-[#282a2c] border-[#333537] text-slate-300'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              }`}
            >
              ⚡ Key formulas
            </button>
          </div>

          {/* Floating Pill Input Box */}
          <form
            onSubmit={handleSendChat}
            className={`rounded-3xl border shadow-lg transition-all flex flex-col p-2.5 sm:p-3 ${
              theme === 'dark'
                ? 'bg-[#1e1f20] border-[#333537] focus-within:border-sky-500/70 focus-within:ring-2 focus-within:ring-sky-500/20 shadow-black/40'
                : 'bg-[#f0f4f9] border-[#e0e3e7] focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 shadow-slate-200/50'
            }`}
          >
            {/* Item 5: onFocus / onBlur to hide bottom activity bar when typing or keyboard opens */}
            <textarea
              ref={textareaRef}
              rows={2}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onFocus={() => setIsAITyping(true)}
              onBlur={() => setIsAITyping(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendChat();
                }
              }}
              placeholder={`Ask Gemini about ${activeTopic?.name || 'any curriculum topic'}...`}
              className="w-full bg-transparent border-none outline-none resize-none text-xs sm:text-sm placeholder:text-slate-400 p-1 font-sans"
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-400 pl-1 font-mono truncate max-w-[200px] sm:max-w-xs">
                Grounded: {activeTopic?.name}
              </span>

              <div className="flex items-center gap-1.5">
                {lastFailedPrompt && (
                  <button
                    type="button"
                    onClick={handleRetryPrompt}
                    disabled={isChatSending}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 flex items-center gap-1 cursor-pointer transition-colors"
                    title="Retry last failed prompt"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                )}

                <button
                  type="submit"
                  disabled={!chatInput.trim() || isChatSending}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    chatInput.trim() && !isChatSending
                      ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-400/20 text-slate-400 cursor-not-allowed opacity-40'
                  }`}
                  title="Send message (Enter)"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </form>

          <p className="text-[10px] text-center text-slate-400 mt-2 select-none">
            Gemini 3.8 Flash • Curriculum grounded study assistant
          </p>
        </div>
      </main>
    </div>
  );
}
