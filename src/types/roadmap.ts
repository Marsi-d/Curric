/**
 * Study Roadmap Planning Types.
 *
 * Isolated study-planning data model built directly on the canonical curriculum
 * and user ranking order.
 *
 * GUARANTEES:
 * - Decoupled from canonical curriculum and ranking assignments.
 * - Changes here NEVER mutate canonical hierarchy or underlying rankings
 *   unless explicitly synced by user command.
 * - 100% offline and local.
 */

export type RoadmapItemStatus = 'planned' | 'in_progress' | 'completed' | 'skipped';

export interface RoadmapTopicItem {
  topicId: string;
  status: RoadmapItemStatus;
  customNotes?: string;
  targetDate?: string;
  completedAt?: string;
}

export interface RoadmapPhase {
  id: string;
  title: string;
  description?: string;
  topicIds: string[]; // Ordered stable IDs
}

export interface StudyRoadmap {
  id: string;
  title: string;
  description?: string;
  basedOnProfileId: string;
  phases: RoadmapPhase[];
  itemDetails: Record<string, RoadmapTopicItem>; // Keyed by topicId
  updatedAt: string;
  createdAt: string;
}
