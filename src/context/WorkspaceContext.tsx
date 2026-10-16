/**
 * Workspace State & Context Provider.
 *
 * Manages:
 * - Single source of truth canonical curriculum document
 * - LocalStorage persistence for document edits, theme, expanded nodes, and tabs
 * - IDE layout state: Activity bar, Explorer drawer (desktop & mobile), Workspace tabs
 * - Tree node expansion and selective rendering
 * - Dark & Light mode theme management
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  CurriculumDocument,
  Subject,
  CurriculumGroup,
  Unit,
  Topic,
  RankingProfile,
  RankingAssignment,
  RankingTier,
  RankingProfileType,
  RankingProfileScope,
  CurriculumGroupType,
} from '../types/curriculum';
import { WorkspaceTab, NavigationArea, CurriculumSearchResult } from '../types/workspace';
import { Flashcard, ReviewLog, FSRSRating, DeckStats } from '../types/flashcards';
import { createNewFlashcard, scheduleFSRSCard } from '../utils/fsrsScheduler';
import { canonicalCurriculumDataset } from '../data/canonicalExample';
import { defaultEmptyCurriculum } from '../data/emptyCurriculum';
import {
  DEFAULT_RANKING_PROFILES,
  DEFAULT_TIERS,
  TIER_PRESETS,
  TierPreset,
  addTopicAssignment,
  removeTopicAssignment,
  moveTopicAssignment,
  setTopicOrder,
  updateAssignmentNotes,
  clearProfileAssignments,
  assignTopicToTier,
  reorderTopicInTier,
  removeTopicFromTier,
  clearTierTopics,
  seedStarterTopics,
} from '../utils/rankingUtils';

export interface ImportDestinationConfig {
  mode: 'replace' | 'append' | 'merge' | 'new_folder';
  targetSubjectId?: string;
  targetGroupId?: string;
  newFolderName?: string;
}

interface WorkspaceContextType {
  // Theme
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;

  // Universal App Size / Scale
  appScale: number;
  setAppScale: (scale: number) => void;

  // Bottom Activity Bar Icon Size (separate adjustment per icon or master)
  activityBarIconSize: number;
  setActivityBarIconSize: (size: number) => void;
  activityBarIconSizes: {
    ranking: number;
    roadmap: number;
    flashcards: number;
    ai: number;
    import: number;
    settings: number;
  };
  setIndividualActivityBarIconSize: (
    area: 'ranking' | 'roadmap' | 'flashcards' | 'ai' | 'import' | 'settings',
    size: number
  ) => void;
  resetActivityBarIconSizes: () => void;

  // Tier System Preset Setting (permanently persisted setting)
  selectedTierPresetId: string;
  setSelectedTierPresetId: (presetId: string) => void;
  applyTierPreset: (presetId: string) => void;

  // Active Document
  curriculumDoc: CurriculumDocument;
  setCurriculumDoc: (doc: CurriculumDocument) => void;
  resetToSampleData: () => void;
  clearCurriculum: () => void;
  updateTopic: (topicId: string, updates: Partial<Topic>) => void;
  updateUnit: (unitId: string, updates: Partial<Unit>) => void;
  updateSubject: (subjectId: string, updates: Partial<Subject>) => void;
  addFolderManually: (name: string, type?: 'academic' | 'aptitude') => string;
  addUnitManually: (groupId: string, name?: string) => string;
  addTopicManually: (target: { groupId?: string; unitId?: string }, name?: string, description?: string) => string;
  deleteTopic: (topicId: string) => void;
  deleteUnit: (unitId: string) => void;
  deleteGroup: (groupId: string) => void;
  deleteSubject: (subjectId: string) => void;
  renameItem: (type: 'subject' | 'group' | 'unit' | 'topic', id: string, newName: string) => void;
  importToDestination: (importedDoc: CurriculumDocument, destination: ImportDestinationConfig) => void;

  // Ranking Profiles & Ordered Assignments
  activeRankingProfileId: string;
  setActiveRankingProfileId: (id: string) => void;
  addTopicToRanking: (profileId: string, topicId: string, position?: number) => void;
  removeTopicFromRanking: (profileId: string, topicId: string) => void;
  moveTopicRanking: (profileId: string, topicId: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;
  reorderTopicRanking: (profileId: string, topicId: string, newOrder: number) => void;
  updateTopicRankingNotes: (profileId: string, topicId: string, notes: string) => void;
  createRankingProfile: (name: string, type?: RankingProfileType, scope?: RankingProfileScope, targetSubjectId?: string, description?: string, tiers?: RankingTier[]) => string;
  deleteRankingProfile: (profileId: string) => void;
  clearRankingProfile: (profileId: string) => void;

  // Tier-Based Ranking Operations
  assignTopicToTier: (profileId: string, topicId: string, tierId: string, targetIndex?: number) => void;
  reorderTopicInTier: (profileId: string, tierId: string, topicId: string, targetIndex: number) => void;
  removeTopicFromTier: (profileId: string, topicId: string) => void;
  clearTierTopics: (profileId: string, tierId: string) => void;
  updateProfileTiers: (profileId: string, tiers: RankingTier[]) => void;
  updateTierLabel: (profileId: string, tierId: string, newLabel: string) => void;
  updateTierColor: (profileId: string, tierId: string, newColor: string) => void;
  addTierToProfile: (profileId: string, newTier: RankingTier, position?: number) => void;
  deleteTierFromProfile: (profileId: string, tierId: string) => void;
  seedStarterCurriculum: () => void;

  // Navigation & Panels
  activeArea: NavigationArea;
  setActiveArea: (area: NavigationArea) => void;
  isExplorerCollapsed: boolean;
  setIsExplorerCollapsed: (collapsed: boolean) => void;
  toggleExplorer: () => void;
  isMobileDrawerOpen: boolean;
  setIsMobileDrawerOpen: (open: boolean) => void;
  isAITyping: boolean;
  setIsAITyping: (typing: boolean) => void;

  // Tabs
  openTabs: WorkspaceTab[];
  activeTabId: string;
  openTab: (tab: WorkspaceTab, makeActive?: boolean) => void;
  closeTab: (tabId: string) => void;
  setActiveTabId: (tabId: string) => void;

  // Tree Expansion
  expandedNodes: Set<string>;
  toggleNode: (nodeId: string) => void;
  expandNode: (nodeId: string) => void;
  collapseNode: (nodeId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  expandToItem: (itemId: string) => void;

  // Selected item (preview or active)
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;

  // Global Search Modal
  isSearchModalOpen: boolean;
  setIsSearchModalOpen: (open: boolean) => void;
  searchCurriculum: (query: string) => CurriculumSearchResult[];

  // Spaced Repetition Flashcards & Reviews (FSRS Engine)
  flashcards: Flashcard[];
  reviewLogs: ReviewLog[];
  deckStats: DeckStats;
  addFlashcard: (card: Omit<Flashcard, 'id' | 'createdAt' | 'updatedAt' | 'state' | 'due' | 'stability' | 'difficulty' | 'elapsedDays' | 'scheduledDays' | 'reps' | 'lapses'>) => Flashcard;
  batchAddFlashcards: (cards: Array<{ front: string; back: string; topicId: string; topicName?: string; subjectId?: string; subjectName?: string; cardType?: 'standard' | 'cloze' }>) => number;
  updateFlashcard: (cardId: string, updates: Partial<Flashcard>) => void;
  deleteFlashcard: (cardId: string) => void;
  suspendFlashcard: (cardId: string, suspended?: boolean) => void;
  rateFlashcard: (cardId: string, rating: FSRSRating) => void;
  getCardsForTopic: (topicId: string) => Flashcard[];
  getDueCards: () => Flashcard[];
  exportFlashcardsJSON: () => string;
  importFlashcardsJSON: (jsonStr: string) => { added: number; errors: number };
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

const STORAGE_KEYS = {
  DOC: 'curriculum_workspace_doc_v1',
  THEME: 'curriculum_theme',
  EXPANDED: 'curriculum_expanded_nodes',
  TABS: 'curriculum_open_tabs',
  ACTIVE_TAB: 'curriculum_active_tab_id',
  ACTIVE_RANKING_PROFILE: 'curriculum_active_ranking_profile',
  APP_SCALE: 'curriculum_app_scale',
  ACTIVITY_BAR_ICON_SIZE: 'curriculum_activity_bar_icon_size',
  ACTIVITY_BAR_ICON_SIZES: 'curriculum_activity_bar_icon_sizes',
  SELECTED_TIER_PRESET: 'curriculum_selected_tier_preset',
  FLASHCARDS: 'curriculum_flashcards_v1',
  REVIEW_LOGS: 'curriculum_review_logs_v1',
};

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Theme State (Dark mode default per requirement)
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // ignore
    }
    return 'dark';
  });

  const setTheme = useCallback((newTheme: 'dark' | 'light') => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  // Universal App Size / Scale State (Default 100%, 70% to 150%)
  const [appScale, setAppScaleState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.APP_SCALE);
      if (saved) {
        const val = Number(saved);
        if (!isNaN(val) && val >= 70 && val <= 160) return val;
      }
    } catch {
      // ignore
    }
    return 100;
  });

  const setAppScale = useCallback((scale: number) => {
    const clamped = Math.max(70, Math.min(160, Math.round(scale)));
    setAppScaleState(clamped);
    try {
      localStorage.setItem(STORAGE_KEYS.APP_SCALE, String(clamped));
    } catch {
      // ignore
    }
  }, []);

  // Universal UI Scale effect: update root font-size so all rem-based typography,
  // controls, paddings, gaps, and component sizes scale proportionally across the entire app
  // without distorting aspect ratios or letterboxing the viewport
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      // Baseline 100% scale reduced to what 95% was previously (15.2px instead of 16px)
      const basePx = (appScale / 100) * 15.2;
      root.style.fontSize = `${basePx}px`;
      root.style.setProperty('--app-scale', `${(appScale / 100) * 0.95}`);
    }
  }, [appScale]);

  // Bottom Activity Bar Icon Size State (master/fallback, default 24px, range 16px to 44px)
  const [activityBarIconSize, setActivityBarIconSizeState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVITY_BAR_ICON_SIZE);
      if (saved) {
        const val = Number(saved);
        if (!isNaN(val) && val >= 16 && val <= 44) return val;
      }
    } catch {
      // ignore
    }
    return 24;
  });

  // Separate Icon Sizes State for bottom activity bar icons
  const [activityBarIconSizes, setActivityBarIconSizesState] = useState<{
    ranking: number;
    roadmap: number;
    flashcards: number;
    ai: number;
    import: number;
    settings: number;
  }>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVITY_BAR_ICON_SIZES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) {
          return {
            ranking: Number(parsed.ranking) || 24,
            roadmap: Number(parsed.roadmap) || 24,
            flashcards: Number(parsed.flashcards) || 24,
            ai: Number(parsed.ai) || 24,
            import: Number(parsed.import) || 24,
            settings: Number(parsed.settings) || 24,
          };
        }
      }
    } catch {
      // ignore
    }
    return {
      ranking: 24,
      roadmap: 24,
      flashcards: 24,
      ai: 24,
      import: 24,
      settings: 24,
    };
  });

  // Master setter (updates all icons together)
  const setActivityBarIconSize = useCallback((size: number) => {
    const clamped = Math.max(16, Math.min(44, Math.round(size)));
    setActivityBarIconSizeState(clamped);
    const updated = {
      ranking: clamped,
      roadmap: clamped,
      flashcards: clamped,
      ai: clamped,
      import: clamped,
      settings: clamped,
    };
    setActivityBarIconSizesState(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVITY_BAR_ICON_SIZE, String(clamped));
      localStorage.setItem(STORAGE_KEYS.ACTIVITY_BAR_ICON_SIZES, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }, []);

  // Separate setter for adjusting a single activity bar icon size individually
  const setIndividualActivityBarIconSize = useCallback(
    (area: 'ranking' | 'roadmap' | 'flashcards' | 'ai' | 'import' | 'settings', size: number) => {
      const clamped = Math.max(16, Math.min(44, Math.round(size)));
      setActivityBarIconSizesState((prev) => {
        const updated = { ...prev, [area]: clamped };
        try {
          localStorage.setItem(STORAGE_KEYS.ACTIVITY_BAR_ICON_SIZES, JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
    },
    []
  );

  const resetActivityBarIconSizes = useCallback(() => {
    const defaults = { ranking: 24, roadmap: 24, flashcards: 24, ai: 24, import: 24, settings: 24 };
    setActivityBarIconSizesState(defaults);
    setActivityBarIconSizeState(24);
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVITY_BAR_ICON_SIZE, '24');
      localStorage.setItem(STORAGE_KEYS.ACTIVITY_BAR_ICON_SIZES, JSON.stringify(defaults));
    } catch {
      // ignore
    }
  }, []);

  // Selected Tier System Preset Setting (permanently persisted setting)
  const [selectedTierPresetId, setSelectedTierPresetIdState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_TIER_PRESET);
      if (saved && TIER_PRESETS.some((p) => p.id === saved)) return saved;
    } catch {
      // ignore
    }
    return 'preset-classic';
  });

  const setSelectedTierPresetId = useCallback((presetId: string) => {
    setSelectedTierPresetIdState(presetId);
    try {
      localStorage.setItem(STORAGE_KEYS.SELECTED_TIER_PRESET, presetId);
    } catch {
      // ignore
    }
  }, []);

  // Helper to ensure clean structure without destroying units
  const cleanCurriculumStructure = useCallback((doc: CurriculumDocument): CurriculumDocument => {
    return doc;
  }, []);

  // 2. Curriculum Document State (persisted to localStorage)
  const [curriculumDoc, setCurriculumDocState] = useState<CurriculumDocument>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DOC);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.subjects) && parsed.id) {
          if (!Array.isArray(parsed.rankingProfiles) || parsed.rankingProfiles.length === 0) {
            parsed.rankingProfiles = DEFAULT_RANKING_PROFILES;
          } else if (!parsed.rankingProfiles.some((p: any) => p.type === 'tier' && Array.isArray(p.tiers) && p.tiers.length > 0)) {
            // Ensure a tier-based profile exists so tier editor works immediately
            parsed.rankingProfiles = [
              DEFAULT_RANKING_PROFILES[0],
              ...parsed.rankingProfiles.filter((p: any) => p.id !== 'profile-tier-list'),
            ];
          }
          if (!Array.isArray(parsed.rankingAssignments)) {
            parsed.rankingAssignments = [];
          }
          // Validate and ensure subjects, groups, and units are properly structured without wiping data
          const validatedSubjects = parsed.subjects.map((subj: any) => ({
            ...subj,
            groups: Array.isArray(subj.groups)
              ? subj.groups.map((grp: any) => ({
                  ...grp,
                  units: Array.isArray(grp.units) ? grp.units : [],
                  directTopics: Array.isArray(grp.directTopics) ? grp.directTopics : undefined,
                }))
              : [],
          }));
          return { ...parsed, subjects: validatedSubjects };
        }
      }
    } catch (e) {
      console.warn('Failed to load saved curriculum from storage:', e);
    }
    return canonicalCurriculumDataset;
  });

  const setCurriculumDoc = useCallback((doc: CurriculumDocument) => {
    setCurriculumDocState(doc);
    try {
      localStorage.setItem(STORAGE_KEYS.DOC, JSON.stringify(doc));
    } catch (e) {
      console.warn('Failed to persist curriculum doc to localStorage:', e);
    }
  }, []);

  const resetToSampleData = useCallback(() => {
    const preset = TIER_PRESETS.find((p) => p.id === selectedTierPresetId);
    if (preset) {
      const newTiers: RankingTier[] = preset.tiers.map((t, idx) => ({
        id: `tier-${idx + 1}`,
        label: t.label,
        color: t.color,
        order: idx + 1,
      }));
      const docWithSelectedPreset = {
        ...canonicalCurriculumDataset,
        rankingProfiles: canonicalCurriculumDataset.rankingProfiles.map((p) =>
          p.type === 'tier' ? { ...p, tiers: newTiers } : p
        ),
      };
      setCurriculumDoc(docWithSelectedPreset);
    } else {
      setCurriculumDoc(canonicalCurriculumDataset);
    }
  }, [setCurriculumDoc, selectedTierPresetId]);

  const clearCurriculum = useCallback(() => {
    setCurriculumDoc(defaultEmptyCurriculum);
  }, [setCurriculumDoc]);

  // 3. Navigation & Panels State - Default to 'ranking' as the primary workspace destination per requirements
  const [activeArea, setActiveArea] = useState<NavigationArea>('ranking');
  const [isExplorerCollapsed, setIsExplorerCollapsed] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [isAITyping, setIsAITyping] = useState<boolean>(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const toggleExplorer = useCallback(() => {
    setIsExplorerCollapsed((prev) => !prev);
  }, []);

  // 4. Tabs State
  const [openTabs, setOpenTabs] = useState<WorkspaceTab[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TABS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(
            (t: WorkspaceTab) => t.type !== 'curriculum' && t.id !== 'curriculum-overview'
          );
          return valid;
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [activeTabId, setActiveTabIdState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB);
      if (saved && saved !== 'curriculum-overview') return saved;
    } catch {
      // ignore
    }
    return '';
  });

  const setActiveTabId = useCallback((id: string) => {
    setActiveTabIdState(id);
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, id);
    } catch {
      // ignore
    }
  }, []);

  const persistTabs = useCallback((tabs: WorkspaceTab[]) => {
    setOpenTabs(tabs);
    try {
      localStorage.setItem(STORAGE_KEYS.TABS, JSON.stringify(tabs));
    } catch {
      // ignore
    }
  }, []);

  const openTab = useCallback(
    (tab: WorkspaceTab, makeActive = true) => {
      setOpenTabs((prev) => {
        const existingIndex = prev.findIndex((t) => t.id === tab.id);
        let updated: WorkspaceTab[];
        if (existingIndex !== -1) {
          // Update existing tab
          updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], ...tab };
        } else {
          updated = [...prev, tab];
        }
        persistTabs(updated);
        return updated;
      });

      if (makeActive) {
        setActiveTabId(tab.id);
        setActiveArea('explorer');
      }
    },
    [persistTabs, setActiveTabId, setActiveArea]
  );

  const closeTab = useCallback(
    (tabId: string) => {
      setOpenTabs((prev) => {
        const filtered = prev.filter((t) => t.id !== tabId);
        persistTabs(filtered);

        // If closed active tab, switch to adjacent or last tab
        if (activeTabId === tabId) {
          const nextActive = filtered[filtered.length - 1]?.id || '';
          setActiveTabId(nextActive);
        }
        return filtered;
      });
    },
    [activeTabId, persistTabs, setActiveTabId]
  );

  // 5. Tree Expansion State
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EXPANDED);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return new Set(parsed);
      }
    } catch {
      // ignore
    }
    // Default: expand base folder and subjects so Grade 9-12 are visible
    return new Set<string>([
      'root-base-folder',
      'subj-mathematics',
      'subj-physics',
      'subj-chemistry',
      'subj-biology',
      'subj-english',
      'subj-aptitude',
    ]);
  });

  const persistExpanded = useCallback((nodes: Set<string>) => {
    setExpandedNodes(nodes);
    try {
      localStorage.setItem(STORAGE_KEYS.EXPANDED, JSON.stringify(Array.from(nodes)));
    } catch {
      // ignore
    }
  }, []);

  const toggleNode = useCallback(
    (nodeId: string) => {
      const next = new Set(expandedNodes);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      persistExpanded(next);
    },
    [expandedNodes, persistExpanded]
  );

  const expandNode = useCallback(
    (nodeId: string) => {
      if (!expandedNodes.has(nodeId)) {
        const next = new Set(expandedNodes);
        next.add(nodeId);
        persistExpanded(next);
      }
    },
    [expandedNodes, persistExpanded]
  );

  const collapseNode = useCallback(
    (nodeId: string) => {
      if (expandedNodes.has(nodeId)) {
        const next = new Set(expandedNodes);
        next.delete(nodeId);
        persistExpanded(next);
      }
    },
    [expandedNodes, persistExpanded]
  );

  const expandAll = useCallback(() => {
    const all = new Set<string>();
    all.add('root-base-folder');
    for (const sub of curriculumDoc.subjects) {
      all.add(sub.id);
      for (const grp of sub.groups) {
        all.add(grp.id);
        for (const u of grp.units) {
          all.add(u.id);
          for (const t of u.topics) {
            all.add(t.id);
            if (t.subtopics) {
              for (const st of t.subtopics) {
                all.add(st.id);
              }
            }
          }
        }
        if (grp.directTopics) {
          for (const t of grp.directTopics) {
            all.add(t.id);
            if (t.subtopics) {
              for (const st of t.subtopics) {
                all.add(st.id);
              }
            }
          }
        }
      }
    }
    persistExpanded(all);
  }, [curriculumDoc, persistExpanded]);

  const collapseAll = useCallback(() => {
    // Keep root-base-folder expanded so subjects remain visible at root level, but collapse all nested branches
    persistExpanded(new Set<string>(['root-base-folder']));
  }, [persistExpanded]);

  const expandToItem = useCallback(
    (targetId: string) => {
      const toExpand = new Set(expandedNodes);
      for (const sub of curriculumDoc.subjects) {
        if (sub.id === targetId) {
          toExpand.add(sub.id);
          break;
        }
        for (const grp of sub.groups) {
          if (grp.id === targetId) {
            toExpand.add(sub.id);
            toExpand.add(grp.id);
            break;
          }
          for (const u of grp.units) {
            if (u.id === targetId) {
              toExpand.add(sub.id);
              toExpand.add(grp.id);
              toExpand.add(u.id);
              break;
            }
            for (const t of u.topics) {
              if (t.id === targetId) {
                toExpand.add(sub.id);
                toExpand.add(grp.id);
                toExpand.add(u.id);
                break;
              }
              for (const st of t.subtopics) {
                if (st.id === targetId) {
                  toExpand.add(sub.id);
                  toExpand.add(grp.id);
                  toExpand.add(u.id);
                  toExpand.add(t.id);
                  break;
                }
              }
            }
          }
          if (grp.directTopics) {
            for (const t of grp.directTopics) {
              if (t.id === targetId) {
                toExpand.add(sub.id);
                toExpand.add(grp.id);
                break;
              }
            }
          }
        }
      }
      persistExpanded(toExpand);
    },
    [curriculumDoc, expandedNodes, persistExpanded]
  );

  // 6. Canonical Entity In-Place Editing
  const updateTopic = useCallback(
    (topicId: string, updates: Partial<Topic>) => {
      let found = false;
      const newSubjects = curriculumDoc.subjects.map((sub) => ({
        ...sub,
        groups: sub.groups.map((grp) => ({
          ...grp,
          units: grp.units.map((u) => ({
            ...u,
            topics: u.topics.map((t) => {
              if (t.id === topicId) {
                found = true;
                return { ...t, ...updates, id: t.id }; // Stable ID strictly preserved
              }
              return t;
            }),
          })),
          directTopics: grp.directTopics?.map((t) => {
            if (t.id === topicId) {
              found = true;
              return { ...t, ...updates, id: t.id };
            }
            return t;
          }),
        })),
      }));

      if (found) {
        const updatedDoc: CurriculumDocument = {
          ...curriculumDoc,
          updatedAt: new Date().toISOString(),
          subjects: newSubjects,
        };
        setCurriculumDoc(updatedDoc);

        // Update active tab title if current topic tab
        if (updates.name) {
          setOpenTabs((prev) =>
            prev.map((t) =>
              t.topicId === topicId ? { ...t, title: updates.name || t.title } : t
            )
          );
        }
      }
    },
    [curriculumDoc, setCurriculumDoc]
  );

  const updateUnit = useCallback(
    (unitId: string, updates: Partial<Unit>) => {
      const newSubjects = curriculumDoc.subjects.map((sub) => ({
        ...sub,
        groups: sub.groups.map((grp) => ({
          ...grp,
          units: grp.units.map((u) => {
            if (u.id === unitId) {
              return { ...u, ...updates, id: u.id };
            }
            return u;
          }),
        })),
      }));

      const updatedDoc: CurriculumDocument = {
        ...curriculumDoc,
        updatedAt: new Date().toISOString(),
        subjects: newSubjects,
      };
      setCurriculumDoc(updatedDoc);
    },
    [curriculumDoc, setCurriculumDoc]
  );

  const updateSubject = useCallback(
    (subjectId: string, updates: Partial<Subject>) => {
      const newSubjects = curriculumDoc.subjects.map((sub) => {
        if (sub.id === subjectId) {
          return { ...sub, ...updates, id: sub.id };
        }
        return sub;
      });

      const updatedDoc: CurriculumDocument = {
        ...curriculumDoc,
        updatedAt: new Date().toISOString(),
        subjects: newSubjects,
      };
      setCurriculumDoc(updatedDoc);
    },
    [curriculumDoc, setCurriculumDoc]
  );

  const renameItem = useCallback(
    (type: 'subject' | 'group' | 'unit' | 'topic', id: string, newName: string) => {
      const cleanName = newName.trim();
      if (!cleanName) return;

      if (type === 'subject') {
        updateSubject(id, { name: cleanName });
      } else if (type === 'unit') {
        updateUnit(id, { name: cleanName });
      } else if (type === 'topic') {
        updateTopic(id, { name: cleanName });
      } else if (type === 'group') {
        const updatedSubjects = curriculumDoc.subjects.map((s) => ({
          ...s,
          groups: s.groups.map((g) => (g.id === id ? { ...g, name: cleanName } : g)),
        }));
        setCurriculumDoc({
          ...curriculumDoc,
          subjects: updatedSubjects,
          updatedAt: new Date().toISOString(),
        });
      }
    },
    [curriculumDoc, setCurriculumDoc, updateSubject, updateUnit, updateTopic]
  );

  const deleteTopic = useCallback(
    (topicId: string) => {
      const updatedSubjects = curriculumDoc.subjects.map((sub) => ({
        ...sub,
        groups: sub.groups.map((grp) => ({
          ...grp,
          units: grp.units.map((u) => ({
            ...u,
            topics: u.topics
              .filter((t) => t.id !== topicId)
              .map((t) => ({
                ...t,
                prerequisites: t.prerequisites?.filter((p) => p !== topicId),
              })),
          })),
          directTopics: grp.directTopics
            ?.filter((t) => t.id !== topicId)
            .map((t) => ({
              ...t,
              prerequisites: t.prerequisites?.filter((p) => p !== topicId),
            })),
        })),
      }));

      // Filter out ranking assignments
      const updatedAssignments = (curriculumDoc.rankingAssignments || []).filter(
        (a) => a.itemId !== topicId
      );

      // Close open tabs for this topic
      setOpenTabs((prev) =>
        prev.filter(
          (t) =>
            t.topicId !== topicId &&
            t.id !== `topic-${topicId}` &&
            t.id !== `tab-topic-${topicId}`
        )
      );

      // If activeTab was this topic, reset
      if (activeTabId === `topic-${topicId}` || activeTabId === `tab-topic-${topicId}`) {
        setActiveTabId('');
      }

      if (selectedItemId === topicId) {
        setSelectedItemId(null);
      }

      const updatedDoc: CurriculumDocument = {
        ...curriculumDoc,
        subjects: updatedSubjects,
        rankingAssignments: updatedAssignments,
        updatedAt: new Date().toISOString(),
      };

      setCurriculumDoc(updatedDoc);
    },
    [curriculumDoc, activeTabId, selectedItemId, setCurriculumDoc, setActiveTabId]
  );

  const deleteUnit = useCallback(
    (unitId: string) => {
      // Collect topic IDs inside this unit to scrub rankings, prerequisites, tabs
      const topicIdsToDelete: string[] = [];
      for (const s of curriculumDoc.subjects) {
        for (const g of s.groups) {
          const u = g.units.find((unit) => unit.id === unitId);
          if (u) {
            u.topics.forEach((t) => topicIdsToDelete.push(t.id));
          }
        }
      }

      const updatedSubjects = curriculumDoc.subjects.map((sub) => ({
        ...sub,
        groups: sub.groups.map((grp) => ({
          ...grp,
          units: grp.units
            .filter((u) => u.id !== unitId)
            .map((u) => ({
              ...u,
              topics: u.topics.map((t) => ({
                ...t,
                prerequisites: t.prerequisites?.filter((p) => !topicIdsToDelete.includes(p)),
              })),
            })),
          directTopics: grp.directTopics?.map((t) => ({
            ...t,
            prerequisites: t.prerequisites?.filter((p) => !topicIdsToDelete.includes(p)),
          })),
        })),
      }));

      const updatedAssignments = (curriculumDoc.rankingAssignments || []).filter(
        (a) => !topicIdsToDelete.includes(a.itemId)
      );

      // Close open tabs for this unit or any of its child topics
      setOpenTabs((prev) =>
        prev.filter(
          (t) =>
            t.unitId !== unitId &&
            (!t.topicId || !topicIdsToDelete.includes(t.topicId))
        )
      );

      if (selectedItemId === unitId || (selectedItemId && topicIdsToDelete.includes(selectedItemId))) {
        setSelectedItemId(null);
      }

      const updatedDoc: CurriculumDocument = {
        ...curriculumDoc,
        subjects: updatedSubjects,
        rankingAssignments: updatedAssignments,
        updatedAt: new Date().toISOString(),
      };

      setCurriculumDoc(updatedDoc);
    },
    [curriculumDoc, selectedItemId, setCurriculumDoc]
  );

  const deleteGroup = useCallback(
    (groupId: string) => {
      const topicIdsToDelete: string[] = [];
      for (const s of curriculumDoc.subjects) {
        const g = s.groups.find((grp) => grp.id === groupId);
        if (g) {
          g.units.forEach((u) => u.topics.forEach((t) => topicIdsToDelete.push(t.id)));
          g.directTopics?.forEach((t) => topicIdsToDelete.push(t.id));
        }
      }

      const updatedSubjects = curriculumDoc.subjects.map((sub) => ({
        ...sub,
        groups: sub.groups.filter((g) => g.id !== groupId),
      }));

      const updatedAssignments = (curriculumDoc.rankingAssignments || []).filter(
        (a) => !topicIdsToDelete.includes(a.itemId)
      );

      setOpenTabs((prev) =>
        prev.filter(
          (t) =>
            t.groupId !== groupId &&
            (!t.topicId || !topicIdsToDelete.includes(t.topicId))
        )
      );

      if (selectedItemId === groupId || (selectedItemId && topicIdsToDelete.includes(selectedItemId))) {
        setSelectedItemId(null);
      }

      const updatedDoc: CurriculumDocument = {
        ...curriculumDoc,
        subjects: updatedSubjects,
        rankingAssignments: updatedAssignments,
        updatedAt: new Date().toISOString(),
      };

      setCurriculumDoc(updatedDoc);
    },
    [curriculumDoc, selectedItemId, setCurriculumDoc]
  );

  const deleteSubject = useCallback(
    (subjectId: string) => {
      const topicIdsToDelete: string[] = [];
      const s = curriculumDoc.subjects.find((sub) => sub.id === subjectId);
      if (s) {
        s.groups.forEach((g) => {
          g.units.forEach((u) => u.topics.forEach((t) => topicIdsToDelete.push(t.id)));
          g.directTopics?.forEach((t) => topicIdsToDelete.push(t.id));
        });
      }

      const updatedSubjects = curriculumDoc.subjects.filter((sub) => sub.id !== subjectId);

      const updatedAssignments = (curriculumDoc.rankingAssignments || []).filter(
        (a) => !topicIdsToDelete.includes(a.itemId)
      );

      setOpenTabs((prev) =>
        prev.filter(
          (t) =>
            t.subjectId !== subjectId &&
            (!t.topicId || !topicIdsToDelete.includes(t.topicId))
        )
      );

      if (selectedItemId === subjectId || (selectedItemId && topicIdsToDelete.includes(selectedItemId))) {
        setSelectedItemId(null);
      }

      const updatedDoc: CurriculumDocument = {
        ...curriculumDoc,
        subjects: updatedSubjects,
        rankingAssignments: updatedAssignments,
        updatedAt: new Date().toISOString(),
      };

      setCurriculumDoc(updatedDoc);
    },
    [curriculumDoc, selectedItemId, setCurriculumDoc]
  );

  const addUnitManually = useCallback(
    (groupId: string, name?: string) => {
      const unitName = name?.trim() || `Unit ${(Math.floor(Math.random() * 900) + 100)}`;
      const newUnitId = `unit-${Date.now()}`;
      let subjectIdForExpand = '';

      const updatedSubjects = curriculumDoc.subjects.map((sub) => {
        const groupExists = sub.groups.some((g) => g.id === groupId);
        if (groupExists) {
          subjectIdForExpand = sub.id;
          return {
            ...sub,
            groups: sub.groups.map((grp) => {
              if (grp.id !== groupId) return grp;
              const newUnit: Unit = {
                id: newUnitId,
                name: unitName,
                order: grp.units.length + 1,
                topics: [
                  {
                    id: `top-${Date.now()}`,
                    name: 'Initial Topic',
                    order: 1,
                    subtopics: [],
                  },
                ],
              };
              return {
                ...grp,
                units: [...grp.units, newUnit],
              };
            }),
          };
        }
        return sub;
      });

      const updatedDoc: CurriculumDocument = {
        ...curriculumDoc,
        subjects: updatedSubjects,
        updatedAt: new Date().toISOString(),
      };

      setCurriculumDoc(updatedDoc);

      setExpandedNodes((prev) => {
        const next = new Set(prev);
        next.add('root-base-folder');
        if (subjectIdForExpand) next.add(subjectIdForExpand);
        next.add(groupId);
        next.add(newUnitId);
        return next;
      });

      setSelectedItemId(newUnitId);
      return newUnitId;
    },
    [curriculumDoc, setCurriculumDoc]
  );

  const addTopicManually = useCallback(
    (target: { groupId?: string; unitId?: string }, name?: string, description?: string) => {
      const topicName = name?.trim() || 'New Topic';
      const newTopicId = `topic-${Date.now()}`;
      let targetSubject: Subject | undefined;
      let targetGroup: CurriculumGroup | undefined;
      let targetUnit: Unit | undefined;

      const newTopic: Topic = {
        id: newTopicId,
        name: topicName,
        description: description?.trim() || undefined,
        subtopics: [],
      };

      const updatedSubjects = curriculumDoc.subjects.map((sub) => {
        let modified = false;
        const newGroups = sub.groups.map((grp) => {
          if (target.unitId) {
            const unitMatch = grp.units.find((u) => u.id === target.unitId);
            if (unitMatch) {
              modified = true;
              targetSubject = sub;
              targetGroup = grp;
              targetUnit = unitMatch;
              return {
                ...grp,
                units: grp.units.map((u) => {
                  if (u.id !== target.unitId) return u;
                  return {
                    ...u,
                    topics: [...u.topics, { ...newTopic, order: u.topics.length + 1 }],
                  };
                }),
              };
            }
          } else if (target.groupId && grp.id === target.groupId) {
            modified = true;
            targetSubject = sub;
            targetGroup = grp;
            return {
              ...grp,
              directTopics: [
                ...(grp.directTopics || []),
                { ...newTopic, order: (grp.directTopics?.length || 0) + 1 },
              ],
            };
          }
          return grp;
        });

        if (modified) {
          return { ...sub, groups: newGroups };
        }
        return sub;
      });

      const updatedDoc: CurriculumDocument = {
        ...curriculumDoc,
        subjects: updatedSubjects,
        updatedAt: new Date().toISOString(),
      };

      setCurriculumDoc(updatedDoc);

      setExpandedNodes((prev) => {
        const next = new Set(prev);
        next.add('root-base-folder');
        if (targetSubject) next.add(targetSubject.id);
        if (targetGroup) next.add(targetGroup.id);
        if (targetUnit) next.add(targetUnit.id);
        return next;
      });

      setSelectedItemId(newTopicId);

      if (targetSubject && targetGroup) {
        openTab(
          {
            id: `topic-${newTopicId}`,
            title: topicName,
            type: 'topic',
            subjectId: targetSubject.id,
            groupId: targetGroup.id,
            unitId: targetUnit?.id,
            topicId: newTopicId,
            isPinned: true,
          },
          true
        );
      }

      return newTopicId;
    },
    [curriculumDoc, openTab, setCurriculumDoc]
  );

  // 7. Ranking Profiles & Ordered Assignments
  const [activeRankingProfileId, setActiveRankingProfileIdState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_RANKING_PROFILE);
      if (saved) return saved;
    } catch {
      // ignore
    }
    const tierProfile = curriculumDoc.rankingProfiles?.find((p) => p.type === 'tier');
    return tierProfile?.id || curriculumDoc.rankingProfiles?.[0]?.id || 'profile-tier-list';
  });

  const setActiveRankingProfileId = useCallback((id: string) => {
    setActiveRankingProfileIdState(id);
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_RANKING_PROFILE, id);
    } catch {
      // ignore
    }
  }, []);

  const addTopicToRanking = useCallback(
    (profileId: string, topicId: string, position?: number) => {
      const updatedAssignments = addTopicAssignment(
        curriculumDoc.rankingAssignments,
        profileId,
        topicId,
        position
      );
      setCurriculumDoc({
        ...curriculumDoc,
        rankingAssignments: updatedAssignments,
        updatedAt: new Date().toISOString(),
      });
    },
    [curriculumDoc, setCurriculumDoc]
  );

  const removeTopicFromRanking = useCallback(
    (profileId: string, topicId: string) => {
      const updatedAssignments = removeTopicAssignment(
        curriculumDoc.rankingAssignments,
        profileId,
        topicId
      );
      setCurriculumDoc({
        ...curriculumDoc,
        rankingAssignments: updatedAssignments,
        updatedAt: new Date().toISOString(),
      });
    },
    [curriculumDoc, setCurriculumDoc]
  );

  const moveTopicRanking = useCallback(
    (profileId: string, topicId: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
      const updatedAssignments = moveTopicAssignment(
        curriculumDoc.rankingAssignments,
        profileId,
        topicId,
        direction
      );
      setCurriculumDoc({
        ...curriculumDoc,
        rankingAssignments: updatedAssignments,
        updatedAt: new Date().toISOString(),
      });
    },
    [curriculumDoc, setCurriculumDoc]
  );

  const reorderTopicRanking = useCallback(
    (profileId: string, topicId: string, newOrder: number) => {
      const updatedAssignments = setTopicOrder(
        curriculumDoc.rankingAssignments,
        profileId,
        topicId,
        newOrder
      );
      setCurriculumDoc({
        ...curriculumDoc,
        rankingAssignments: updatedAssignments,
        updatedAt: new Date().toISOString(),
      });
    },
    [curriculumDoc, setCurriculumDoc]
  );

  const updateTopicRankingNotes = useCallback(
    (profileId: string, topicId: string, notes: string) => {
      const updatedAssignments = updateAssignmentNotes(
        curriculumDoc.rankingAssignments,
        profileId,
        topicId,
        notes
      );
      setCurriculumDoc({
        ...curriculumDoc,
        rankingAssignments: updatedAssignments,
        updatedAt: new Date().toISOString(),
      });
    },
    [curriculumDoc, setCurriculumDoc]
  );

  const createRankingProfile = useCallback(
    (
      name: string,
      type: RankingProfileType = 'tier',
      scope: RankingProfileScope = 'all_subjects',
      targetSubjectId?: string,
      description?: string,
      tiers?: RankingTier[]
    ) => {
      const id = `profile-${Date.now()}`;
      const newProfile: RankingProfile = {
        id,
        name,
        type,
        scope,
        targetSubjectId,
        description: description || `Ranking profile: ${name}`,
        tiers:
          type === 'tier'
            ? tiers ||
              (TIER_PRESETS.find((p) => p.id === selectedTierPresetId)?.tiers.map((t, idx) => ({
                id: `tier-${idx + 1}`,
                label: t.label,
                color: t.color,
                order: idx + 1,
              })) ||
                DEFAULT_TIERS)
            : undefined,
      };
      setCurriculumDoc({
        ...curriculumDoc,
        rankingProfiles: [...(curriculumDoc.rankingProfiles || []), newProfile],
        updatedAt: new Date().toISOString(),
      });
      setActiveRankingProfileId(id);
      return id;
    },
    [curriculumDoc, setCurriculumDoc, setActiveRankingProfileId, selectedTierPresetId]
  );

  const deleteRankingProfile = useCallback(
    (profileId: string) => {
      const updatedProfiles = (curriculumDoc.rankingProfiles || []).filter(
        (p) => p.id !== profileId
      );
      const updatedAssignments = (curriculumDoc.rankingAssignments || []).filter(
        (a) => a.rankingProfileId !== profileId
      );
      setCurriculumDoc({
        ...curriculumDoc,
        rankingProfiles: updatedProfiles,
        rankingAssignments: updatedAssignments,
        updatedAt: new Date().toISOString(),
      });
      if (activeRankingProfileId === profileId) {
        setActiveRankingProfileId(updatedProfiles[0]?.id || '');
      }
    },
    [curriculumDoc, setCurriculumDoc, activeRankingProfileId, setActiveRankingProfileId]
  );

  const clearRankingProfile = useCallback(
    (profileId: string) => {
      const updatedAssignments = clearProfileAssignments(
        curriculumDoc.rankingAssignments || [],
        profileId
      );
      setCurriculumDoc({
        ...curriculumDoc,
        rankingAssignments: updatedAssignments,
        updatedAt: new Date().toISOString(),
      });
    },
    [curriculumDoc, setCurriculumDoc]
  );

  // Tier-Based Ranking Operations
  const assignTopicToTierContext = useCallback(
    (profileId: string, topicId: string, tierId: string, targetIndex?: number) => {
      const updatedAssignments = assignTopicToTier(
        curriculumDoc.rankingAssignments || [],
        profileId,
        topicId,
        tierId,
        targetIndex
      );
      setCurriculumDoc({
        ...curriculumDoc,
        rankingAssignments: updatedAssignments,
        updatedAt: new Date().toISOString(),
      });
    },
    [curriculumDoc, setCurriculumDoc]
  );

  const reorderTopicInTierContext = useCallback(
    (profileId: string, tierId: string, topicId: string, targetIndex: number) => {
      const updatedAssignments = reorderTopicInTier(
        curriculumDoc.rankingAssignments || [],
        profileId,
        tierId,
        topicId,
        targetIndex
      );
      setCurriculumDoc({
        ...curriculumDoc,
        rankingAssignments: updatedAssignments,
        updatedAt: new Date().toISOString(),
      });
    },
    [curriculumDoc, setCurriculumDoc]
  );

  const removeTopicFromTierContext = useCallback(
    (profileId: string, topicId: string) => {
      const updatedAssignments = removeTopicFromTier(
        curriculumDoc.rankingAssignments || [],
        profileId,
        topicId
      );
      setCurriculumDoc({
        ...curriculumDoc,
        rankingAssignments: updatedAssignments,
        updatedAt: new Date().toISOString(),
      });
    },
    [curriculumDoc, setCurriculumDoc]
  );

  const clearTierTopicsContext = useCallback(
    (profileId: string, tierId: string) => {
      const updatedAssignments = clearTierTopics(
        curriculumDoc.rankingAssignments || [],
        profileId,
        tierId
      );
      setCurriculumDoc({
        ...curriculumDoc,
        rankingAssignments: updatedAssignments,
        updatedAt: new Date().toISOString(),
      });
    },
    [curriculumDoc, setCurriculumDoc]
  );

  const updateProfileTiersContext = useCallback(
    (profileId: string, newTiers: RankingTier[]) => {
      const updatedProfiles = (curriculumDoc.rankingProfiles || []).map((p) => {
        if (p.id === profileId) {
          return {
            ...p,
            tiers: newTiers,
          };
        }
        return p;
      });
      setCurriculumDoc({
        ...curriculumDoc,
        rankingProfiles: updatedProfiles,
        updatedAt: new Date().toISOString(),
      });
    },
    [curriculumDoc, setCurriculumDoc]
  );

  const updateTierLabel = useCallback(
    (profileId: string, tierId: string, newLabel: string) => {
      const updatedProfiles = (curriculumDoc.rankingProfiles || []).map((p) => {
        if (p.id === profileId && p.tiers) {
          return {
            ...p,
            tiers: p.tiers.map((t) => (t.id === tierId ? { ...t, label: newLabel } : t)),
          };
        }
        return p;
      });
      setCurriculumDoc({
        ...curriculumDoc,
        rankingProfiles: updatedProfiles,
        updatedAt: new Date().toISOString(),
      });
    },
    [curriculumDoc, setCurriculumDoc]
  );

  const updateTierColor = useCallback(
    (profileId: string, tierId: string, newColor: string) => {
      const updatedProfiles = (curriculumDoc.rankingProfiles || []).map((p) => {
        if (p.id === profileId && p.tiers) {
          return {
            ...p,
            tiers: p.tiers.map((t) => (t.id === tierId ? { ...t, color: newColor } : t)),
          };
        }
        return p;
      });
      setCurriculumDoc({
        ...curriculumDoc,
        rankingProfiles: updatedProfiles,
        updatedAt: new Date().toISOString(),
      });
    },
    [curriculumDoc, setCurriculumDoc]
  );

  const addTierToProfile = useCallback(
    (profileId: string, newTier: RankingTier, position?: number) => {
      const updatedProfiles = (curriculumDoc.rankingProfiles || []).map((p) => {
        if (p.id === profileId) {
          const currentTiers = p.tiers ? [...p.tiers] : [];
          if (position !== undefined && position >= 0 && position <= currentTiers.length) {
            currentTiers.splice(position, 0, newTier);
          } else {
            currentTiers.push(newTier);
          }
          const reordered = currentTiers.map((t, idx) => ({ ...t, order: idx + 1 }));
          return { ...p, tiers: reordered };
        }
        return p;
      });
      setCurriculumDoc({
        ...curriculumDoc,
        rankingProfiles: updatedProfiles,
        updatedAt: new Date().toISOString(),
      });
    },
    [curriculumDoc, setCurriculumDoc]
  );

  const deleteTierFromProfile = useCallback(
    (profileId: string, tierId: string) => {
      const updatedProfiles = (curriculumDoc.rankingProfiles || []).map((p) => {
        if (p.id === profileId && p.tiers) {
          const filtered = p.tiers.filter((t) => t.id !== tierId);
          const reordered = filtered.map((t, idx) => ({ ...t, order: idx + 1 }));
          return { ...p, tiers: reordered };
        }
        return p;
      });
      // Also unrank topics that were assigned to this tier
      const updatedAssignments = (curriculumDoc.rankingAssignments || []).filter(
        (a) => !(a.rankingProfileId === profileId && a.rank === tierId)
      );
      setCurriculumDoc({
        ...curriculumDoc,
        rankingProfiles: updatedProfiles,
        rankingAssignments: updatedAssignments,
        updatedAt: new Date().toISOString(),
      });
    },
    [curriculumDoc, setCurriculumDoc]
  );

  const seedStarterCurriculum = useCallback(() => {
    const updated = seedStarterTopics(curriculumDoc);
    setCurriculumDoc(updated);
  }, [curriculumDoc, setCurriculumDoc]);

  // Apply a Tier System Preset and persist choice permanently
  const applyTierPreset = useCallback(
    (presetId: string) => {
      const preset = TIER_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;
      setSelectedTierPresetId(presetId);

      const activeProfile =
        curriculumDoc.rankingProfiles?.find((p) => p.id === activeRankingProfileId) ||
        curriculumDoc.rankingProfiles?.find((p) => p.type === 'tier') ||
        curriculumDoc.rankingProfiles?.[0];

      if (activeProfile) {
        const newTiers: RankingTier[] = preset.tiers.map((t, idx) => ({
          id: `tier-${idx + 1}`,
          label: t.label,
          color: t.color,
          order: idx + 1,
        }));
        updateProfileTiersContext(activeProfile.id, newTiers);
      }
    },
    [curriculumDoc.rankingProfiles, activeRankingProfileId, setSelectedTierPresetId, updateProfileTiersContext]
  );

  // 8. Global Search Implementation
  const searchCurriculum = useCallback(
    (query: string): CurriculumSearchResult[] => {
      const q = query.trim().toLowerCase();
      if (!q) return [];

      const results: CurriculumSearchResult[] = [];

      for (const sub of curriculumDoc.subjects) {
        if (sub.name.toLowerCase().includes(q) || sub.id.toLowerCase().includes(q)) {
          results.push({
            entityType: 'subject',
            id: sub.id,
            name: sub.name,
            description: sub.description,
            pathSegments: [sub.name],
            subjectId: sub.id,
          });
        }

        for (const grp of sub.groups) {
          if (grp.name.toLowerCase().includes(q) || grp.id.toLowerCase().includes(q)) {
            results.push({
              entityType: 'group',
              id: grp.id,
              name: grp.name,
              description: grp.description,
              pathSegments: [sub.name, grp.name],
              subjectId: sub.id,
              groupId: grp.id,
            });
          }

          for (const u of grp.units) {
            if (u.name.toLowerCase().includes(q) || u.id.toLowerCase().includes(q)) {
              results.push({
                entityType: 'unit',
                id: u.id,
                name: u.name,
                description: u.description,
                pathSegments: [sub.name, grp.name, u.name],
                subjectId: sub.id,
                groupId: grp.id,
                unitId: u.id,
              });
            }

            for (const t of u.topics) {
              const matchesTopic =
                t.name.toLowerCase().includes(q) ||
                t.id.toLowerCase().includes(q) ||
                t.description?.toLowerCase().includes(q);

              if (matchesTopic) {
                results.push({
                  entityType: 'topic',
                  id: t.id,
                  name: t.name,
                  description: t.description,
                  pathSegments: [sub.name, grp.name, u.name, t.name],
                  subjectId: sub.id,
                  groupId: grp.id,
                  unitId: u.id,
                  topicId: t.id,
                });
              }

              for (const st of t.subtopics) {
                if (st.name.toLowerCase().includes(q) || st.id.toLowerCase().includes(q)) {
                  results.push({
                    entityType: 'subtopic',
                    id: st.id,
                    name: st.name,
                    description: st.description,
                    pathSegments: [sub.name, grp.name, u.name, t.name, st.name],
                    subjectId: sub.id,
                    groupId: grp.id,
                    unitId: u.id,
                    topicId: t.id,
                    subtopicId: st.id,
                  });
                }
              }
            }
          }

          if (grp.directTopics) {
            for (const t of grp.directTopics) {
              if (t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)) {
                results.push({
                  entityType: 'topic',
                  id: t.id,
                  name: t.name,
                  description: t.description,
                  pathSegments: [sub.name, grp.name, t.name],
                  subjectId: sub.id,
                  groupId: grp.id,
                  topicId: t.id,
                });
              }
            }
          }
        }
      }

      return results.slice(0, 50); // Limit to top 50 matches for performance
    },
    [curriculumDoc]
  );

  // 8. Manual Folder Creation
  const addFolderManually = useCallback(
    (name: string, type: 'academic' | 'aptitude' = 'academic') => {
      const cleanName = name.trim() || 'New Folder';
      const newSubId = `folder-${Date.now()}`;
      const newSubject: Subject = {
        id: newSubId,
        name: cleanName,
        type: type,
        description: `Manually created ${type} curriculum folder.`,
        groups: [
          {
            id: `${newSubId}-grp-1`,
            name: type === 'academic' ? 'Grade 1' : 'Section 1',
            type: type === 'academic' ? 'grade' : 'category',
            units: [
              {
                id: `${newSubId}-unit-1`,
                name: 'Unit 1: Overview',
                order: 1,
                topics: [
                  {
                    id: `${newSubId}-top-1`,
                    name: 'Initial Topic',
                    order: 1,
                    subtopics: [],
                  },
                ],
              },
            ],
          },
        ],
      };

      const updatedDoc: CurriculumDocument = {
        ...curriculumDoc,
        updatedAt: new Date().toISOString(),
        subjects: [...curriculumDoc.subjects, newSubject],
      };

      setCurriculumDoc(updatedDoc);

      setExpandedNodes((prev) => {
        const next = new Set(prev);
        next.add('root-base-folder');
        next.add(newSubId);
        next.add(`${newSubId}-grp-1`);
        return next;
      });

      return newSubId;
    },
    [curriculumDoc, setCurriculumDoc]
  );

  // 9. Destination-Aware JSON Structure Import
  const importToDestination = useCallback(
    (
      importedDoc: CurriculumDocument,
      destination: ImportDestinationConfig
    ) => {
      const { mode, targetSubjectId, newFolderName } = destination;

      if (mode === 'replace') {
        const newDoc: CurriculumDocument = {
          ...importedDoc,
          id: importedDoc.id || `curr-${Date.now()}`,
          title: importedDoc.title || curriculumDoc.title || 'Curriculum',
          updatedAt: new Date().toISOString(),
        };
        setCurriculumDoc(newDoc);

        const newExpanded = new Set<string>(['root-base-folder']);
        newDoc.subjects.forEach((s) => {
          newExpanded.add(s.id);
          if (s.groups[0]) newExpanded.add(s.groups[0].id);
        });
        persistExpanded(newExpanded);
        return;
      }

      if (mode === 'append') {
        const existingIds = new Set(curriculumDoc.subjects.map((s) => s.id));
        const deduplicated = importedDoc.subjects.map((sub, idx) => {
          if (existingIds.has(sub.id)) {
            return {
              ...sub,
              id: `${sub.id}-imp-${Date.now()}-${idx}`,
            };
          }
          return sub;
        });

        const newDoc: CurriculumDocument = {
          ...curriculumDoc,
          updatedAt: new Date().toISOString(),
          subjects: [...curriculumDoc.subjects, ...deduplicated],
        };
        setCurriculumDoc(newDoc);

        const newExpanded = new Set(expandedNodes);
        newExpanded.add('root-base-folder');
        deduplicated.forEach((s) => newExpanded.add(s.id));
        persistExpanded(newExpanded);
        return;
      }

      if (mode === 'merge' && targetSubjectId) {
        const targetSubject = curriculumDoc.subjects.find((s) => s.id === targetSubjectId);
        if (!targetSubject) return;

        const { targetGroupId } = destination;

        // If targetGroupId is specified, merge units directly into that specific grade / group
        if (targetGroupId) {
          const importedUnits: Unit[] = [];
          const importedDirectTopics: Topic[] = [];

          // Prefer group that matches targetGroupId, otherwise take all groups in the imported doc
          let sourceGroups = importedDoc.subjects.flatMap((s) =>
            s.groups.filter((g) => g.id === targetGroupId)
          );
          if (sourceGroups.length === 0) {
            sourceGroups = importedDoc.subjects.flatMap((s) => s.groups);
          }

          sourceGroups.forEach((g) => {
            if (g.units && g.units.length > 0) {
              importedUnits.push(...g.units);
            }
            if (g.directTopics && g.directTopics.length > 0) {
              importedDirectTopics.push(...g.directTopics);
            }
          });

          const updatedSubjects = curriculumDoc.subjects.map((sub) => {
            if (sub.id !== targetSubjectId) return sub;
            const existingGroup = sub.groups.find((g) => g.id === targetGroupId);
            if (existingGroup) {
              return {
                ...sub,
                groups: sub.groups.map((grp) => {
                  if (grp.id !== targetGroupId) return grp;
                  return {
                    ...grp,
                    units: [...grp.units, ...importedUnits],
                    directTopics: [...(grp.directTopics || []), ...importedDirectTopics],
                  };
                }),
              };
            } else {
              const gradeNum = parseInt(targetGroupId.replace(/\D/g, ''), 10) || (sub.groups.length + 9);
              const newGroup: CurriculumGroup = {
                id: targetGroupId,
                name: `Grade ${gradeNum}`,
                type: 'grade',
                gradeLevel: gradeNum,
                order: sub.groups.length + 1,
                units: importedUnits,
                directTopics: importedDirectTopics,
              };
              return {
                ...sub,
                groups: [...sub.groups, newGroup],
              };
            }
          });

          const newDoc: CurriculumDocument = {
            ...curriculumDoc,
            updatedAt: new Date().toISOString(),
            subjects: updatedSubjects,
          };
          setCurriculumDoc(newDoc);

          const newExpanded = new Set(expandedNodes);
          newExpanded.add('root-base-folder');
          newExpanded.add(targetSubjectId);
          newExpanded.add(targetGroupId);
          persistExpanded(newExpanded);
          return;
        }

        // Otherwise merge into subject
        const importedGroups: CurriculumGroup[] = [];
        importedDoc.subjects.forEach((s) => {
          importedGroups.push(...s.groups);
        });

        const updatedSubjects = curriculumDoc.subjects.map((sub) => {
          if (sub.id !== targetSubjectId) return sub;
          // If subject has no groups yet (e.g. Aptitude), add the imported groups
          return {
            ...sub,
            groups: [...sub.groups, ...importedGroups],
          };
        });

        const newDoc: CurriculumDocument = {
          ...curriculumDoc,
          updatedAt: new Date().toISOString(),
          subjects: updatedSubjects,
        };
        setCurriculumDoc(newDoc);

        const newExpanded = new Set(expandedNodes);
        newExpanded.add('root-base-folder');
        newExpanded.add(targetSubjectId);
        importedGroups.forEach((g) => newExpanded.add(g.id));
        persistExpanded(newExpanded);
        return;
      }

      if (mode === 'new_folder') {
        const folderName = newFolderName?.trim() || 'Imported Section';
        const newSubjectId = `folder-${Date.now()}`;
        const importedGroups: CurriculumGroup[] = [];
        importedDoc.subjects.forEach((s) => {
          importedGroups.push(...s.groups);
        });

        const newSubject: Subject = {
          id: newSubjectId,
          name: folderName,
          type: 'academic',
          description: `Imported structure: ${folderName}`,
          groups:
            importedGroups.length > 0
              ? importedGroups
              : [
                  {
                    id: `${newSubjectId}-grp-1`,
                    name: 'Grade 1',
                    type: 'grade',
                    units: [],
                  },
                ],
        };

        const newDoc: CurriculumDocument = {
          ...curriculumDoc,
          updatedAt: new Date().toISOString(),
          subjects: [...curriculumDoc.subjects, newSubject],
        };
        setCurriculumDoc(newDoc);

        const newExpanded = new Set(expandedNodes);
        newExpanded.add('root-base-folder');
        newExpanded.add(newSubjectId);
        persistExpanded(newExpanded);
        return;
      }
    },
    [curriculumDoc, expandedNodes, persistExpanded, setCurriculumDoc]
  );

  // 10. Spaced Repetition (FSRS Flashcards & Review Logs)
  const [flashcards, setFlashcardsState] = useState<Flashcard[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FLASHCARDS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [reviewLogs, setReviewLogsState] = useState<ReviewLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.REVIEW_LOGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const persistFlashcards = useCallback((cards: Flashcard[]) => {
    setFlashcardsState(cards);
    try {
      localStorage.setItem(STORAGE_KEYS.FLASHCARDS, JSON.stringify(cards));
    } catch {
      // ignore
    }
  }, []);

  const persistReviewLogs = useCallback((logs: ReviewLog[]) => {
    setReviewLogsState(logs);
    try {
      localStorage.setItem(STORAGE_KEYS.REVIEW_LOGS, JSON.stringify(logs));
    } catch {
      // ignore
    }
  }, []);

  const addFlashcard = useCallback(
    (cardData: Omit<Flashcard, 'id' | 'createdAt' | 'updatedAt' | 'state' | 'due' | 'stability' | 'difficulty' | 'elapsedDays' | 'scheduledDays' | 'reps' | 'lapses'>) => {
      const newCard = createNewFlashcard(cardData);
      const next = [newCard, ...flashcards];
      persistFlashcards(next);
      return newCard;
    },
    [flashcards, persistFlashcards]
  );

  const batchAddFlashcards = useCallback(
    (cards: Array<{ front: string; back: string; topicId: string; topicName?: string; subjectId?: string; subjectName?: string; cardType?: 'standard' | 'cloze' }>) => {
      if (!cards.length) return 0;
      const newCards = cards.map((c) => createNewFlashcard(c));
      const next = [...newCards, ...flashcards];
      persistFlashcards(next);
      return newCards.length;
    },
    [flashcards, persistFlashcards]
  );

  const updateFlashcard = useCallback(
    (cardId: string, updates: Partial<Flashcard>) => {
      const next = flashcards.map((c) =>
        c.id === cardId ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
      );
      persistFlashcards(next);
    },
    [flashcards, persistFlashcards]
  );

  const deleteFlashcard = useCallback(
    (cardId: string) => {
      const next = flashcards.filter((c) => c.id !== cardId);
      persistFlashcards(next);
    },
    [flashcards, persistFlashcards]
  );

  const suspendFlashcard = useCallback(
    (cardId: string, suspended: boolean = true) => {
      const next = flashcards.map((c) =>
        c.id === cardId ? { ...c, suspended, updatedAt: new Date().toISOString() } : c
      );
      persistFlashcards(next);
    },
    [flashcards, persistFlashcards]
  );

  const rateFlashcard = useCallback(
    (cardId: string, rating: FSRSRating) => {
      const target = flashcards.find((c) => c.id === cardId);
      if (!target) return;

      const now = new Date();
      const result = scheduleFSRSCard(target, rating, now);

      const nextCards = flashcards.map((c) => (c.id === cardId ? result.card : c));
      const nextLogs = [result.log, ...reviewLogs];

      persistFlashcards(nextCards);
      persistReviewLogs(nextLogs);
    },
    [flashcards, reviewLogs, persistFlashcards, persistReviewLogs]
  );

  const getCardsForTopic = useCallback(
    (topicId: string) => {
      return flashcards.filter((c) => c.topicId === topicId);
    },
    [flashcards]
  );

  const getDueCards = useCallback(() => {
    const now = new Date().toISOString();
    return flashcards.filter((c) => !c.suspended && (c.due <= now || c.state === 0));
  }, [flashcards]);

  const deckStats = useMemo<DeckStats>(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const activeCards = flashcards.filter((c) => !c.suspended);
    const newCount = activeCards.filter((c) => c.state === 0).length;
    const learningCount = activeCards.filter((c) => c.state === 1 || c.state === 3).length;
    const dueCount = activeCards.filter(
      (c) => c.state !== 0 && c.due <= now.toISOString()
    ).length;

    const todayLogs = reviewLogs.filter((l) => l.reviewTime.startsWith(todayStr));
    const reviewedToday = todayLogs.length;

    // Retention rate: % of Good (3) and Easy (4) ratings over last 100 reviews
    const recentLogs = reviewLogs.slice(0, 100);
    const successfulRecalls = recentLogs.filter((l) => l.rating >= 3).length;
    const retentionRate =
      recentLogs.length > 0 ? Math.round((successfulRecalls / recentLogs.length) * 100) : 100;

    // Calculate streak days
    const uniqueDays = new Set(reviewLogs.map((l) => l.reviewTime.split('T')[0]));
    let streakDays = 0;
    const checkDate = new Date();
    while (true) {
      const dateKey = checkDate.toISOString().split('T')[0];
      if (uniqueDays.has(dateKey)) {
        streakDays += 1;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (streakDays === 0 && dateKey === todayStr) {
        // Today hasn't been reviewed yet, check if yesterday was reviewed
        checkDate.setDate(checkDate.getDate() - 1);
        const yestKey = checkDate.toISOString().split('T')[0];
        if (uniqueDays.has(yestKey)) {
          streakDays += 1;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      } else {
        break;
      }
    }

    return {
      newCount,
      learningCount,
      dueCount,
      totalCards: flashcards.length,
      reviewedToday,
      retentionRate,
      streakDays,
    };
  }, [flashcards, reviewLogs]);

  const exportFlashcardsJSON = useCallback(() => {
    return JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        cards: flashcards,
      },
      null,
      2
    );
  }, [flashcards]);

  const importFlashcardsJSON = useCallback(
    (jsonStr: string) => {
      try {
        const parsed = JSON.parse(jsonStr);
        const list: any[] = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.cards)
          ? parsed.cards
          : [];

        let added = 0;
        let errors = 0;
        const validCards: Flashcard[] = [];

        list.forEach((item) => {
          if (item && item.front && item.back) {
            const card = createNewFlashcard({
              topicId: item.topicId || 'general',
              topicName: item.topicName,
              subjectId: item.subjectId,
              subjectName: item.subjectName,
              front: String(item.front),
              back: String(item.back),
              cardType: item.cardType === 'cloze' ? 'cloze' : 'standard',
              tags: Array.isArray(item.tags) ? item.tags : [],
            });
            validCards.push(card);
            added += 1;
          } else {
            errors += 1;
          }
        });

        if (validCards.length > 0) {
          const next = [...validCards, ...flashcards];
          persistFlashcards(next);
        }

        return { added, errors };
      } catch {
        return { added: 0, errors: 1 };
      }
    },
    [flashcards, persistFlashcards]
  );

  return (
    <WorkspaceContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        appScale,
        setAppScale,
        activityBarIconSize,
        setActivityBarIconSize,
        activityBarIconSizes,
        setIndividualActivityBarIconSize,
        resetActivityBarIconSizes,
        selectedTierPresetId,
        setSelectedTierPresetId,
        applyTierPreset,
        curriculumDoc,
        setCurriculumDoc,
        resetToSampleData,
        clearCurriculum,
        updateTopic,
        updateUnit,
        updateSubject,
        renameItem,
        deleteTopic,
        deleteUnit,
        deleteGroup,
        deleteSubject,
        addFolderManually,
        addUnitManually,
        addTopicManually,
        importToDestination,
        activeRankingProfileId,
        setActiveRankingProfileId,
        addTopicToRanking,
        removeTopicFromRanking,
        moveTopicRanking,
        reorderTopicRanking,
        updateTopicRankingNotes,
        createRankingProfile,
        deleteRankingProfile,
        clearRankingProfile,
        assignTopicToTier: assignTopicToTierContext,
        reorderTopicInTier: reorderTopicInTierContext,
        removeTopicFromTier: removeTopicFromTierContext,
        clearTierTopics: clearTierTopicsContext,
        updateProfileTiers: updateProfileTiersContext,
        updateTierLabel,
        updateTierColor,
        addTierToProfile,
        deleteTierFromProfile,
        seedStarterCurriculum,
        activeArea,
        setActiveArea,
        isExplorerCollapsed,
        setIsExplorerCollapsed,
        toggleExplorer,
        isMobileDrawerOpen,
        setIsMobileDrawerOpen,
        isAITyping,
        setIsAITyping,
        openTabs,
        activeTabId,
        openTab,
        closeTab,
        setActiveTabId,
        expandedNodes,
        toggleNode,
        expandNode,
        collapseNode,
        expandAll,
        collapseAll,
        expandToItem,
        selectedItemId,
        setSelectedItemId,
        isSearchModalOpen,
        setIsSearchModalOpen,
        searchCurriculum,
        flashcards,
        reviewLogs,
        deckStats,
        addFlashcard,
        batchAddFlashcards,
        updateFlashcard,
        deleteFlashcard,
        suspendFlashcard,
        rateFlashcard,
        getCardsForTopic,
        getDueCards,
        exportFlashcardsJSON,
        importFlashcardsJSON,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return ctx;
};
