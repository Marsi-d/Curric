/**
 * Types for the IDE-Inspired Curriculum Workspace.
 */

export type NavigationArea = 'ranking' | 'explorer' | 'search' | 'roadmap' | 'flashcards' | 'ai' | 'import' | 'settings';

export type WorkspaceTabType = 'curriculum' | 'subject' | 'topic' | 'import' | 'validation' | 'ranking' | 'roadmap' | 'flashcards' | 'ai' | 'settings';

export interface WorkspaceTab {
  id: string;
  title: string;
  type: WorkspaceTabType;
  /** Scoped subject ID */
  subjectId?: string;
  /** Scoped group ID */
  groupId?: string;
  /** Scoped unit ID */
  unitId?: string;
  /** Scoped topic ID */
  topicId?: string;
  /** Whether the tab is pinned (double clicked or opened explicitly) */
  isPinned?: boolean;
}

export interface BreadcrumbSegment {
  id: string;
  label: string;
  type: 'curriculum' | 'subject' | 'group' | 'unit' | 'topic';
  subjectId?: string;
  groupId?: string;
  unitId?: string;
  topicId?: string;
}

export interface CurriculumSearchResult {
  entityType: 'subject' | 'group' | 'unit' | 'topic' | 'subtopic';
  id: string;
  name: string;
  description?: string;
  pathSegments: string[];
  subjectId: string;
  groupId?: string;
  unitId?: string;
  topicId?: string;
  subtopicId?: string;
}
