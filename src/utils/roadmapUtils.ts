/**
 * Practical Study Roadmap Planning Utilities.
 *
 * Translates the user's ranked curriculum topics into a structured, sequential
 * study roadmap with phases, milestone grouping, and progress tracking.
 *
 * ARCHITECTURAL GUARANTEES:
 * - 100% offline and local (zero backend, zero AI API calls).
 * - Primary input is the user's explicit ranking order.
 * - Retains each topic's subject and original curriculum location (Subject › Grade › Unit).
 * - Unranked topics remain available in a separate pool; never silently treated as ranked priorities.
 * - Changes to roadmap organization/ordering do NOT modify the canonical curriculum or topic rankings,
 *   unless explicitly synced by the user.
 */

import { CurriculumDocument, RankingAssignment } from '../types/curriculum';
import { StudyRoadmap, RoadmapPhase, RoadmapTopicItem } from '../types/roadmap';
import { getAllTopicsWithContext, getRankedTopics, TopicWithContext } from './rankingUtils';

const ROADMAP_STORAGE_KEY_PREFIX = 'curriculum_study_roadmap_';

/**
 * Generates an initial study roadmap from the user's active ranking profile.
 * Divides ranked topics into logical study phases (Foundations, Core, Advanced)
 * while strictly adhering to the ranking order as primary input.
 */
export function generateInitialRoadmap(
  doc: CurriculumDocument,
  profileId: string
): StudyRoadmap {
  const allTopics = getAllTopicsWithContext(doc);
  const rankedItems = getRankedTopics(profileId, doc.rankingAssignments || [], allTopics);
  const profile = doc.rankingProfiles?.find((p) => p.id === profileId);

  // Unique ranked topic IDs in order
  const uniqueRankedTopicIds: string[] = [];
  const seenRankedIds = new Set<string>();
  for (const r of rankedItems) {
    if (r.topicContext.topicId && !seenRankedIds.has(r.topicContext.topicId)) {
      seenRankedIds.add(r.topicContext.topicId);
      uniqueRankedTopicIds.push(r.topicContext.topicId);
    }
  }

  const totalRanked = uniqueRankedTopicIds.length;
  const itemDetails: Record<string, RoadmapTopicItem> = {};

  // Initialize status for each ranked topic
  rankedItems.forEach((item) => {
    if (!itemDetails[item.topicContext.topicId]) {
      itemDetails[item.topicContext.topicId] = {
        topicId: item.topicContext.topicId,
        status: 'planned',
        customNotes: item.notes || '',
      };
    }
  });

  let phases: RoadmapPhase[] = [];

  if (totalRanked === 0) {
    phases = [
      {
        id: 'phase-1',
        title: 'Phase 1: Initial Study Goals',
        description: 'Add topics from the unranked pool or rank topics in the Ranking Workspace.',
        topicIds: [],
      },
    ];
  } else if (totalRanked <= 6) {
    // Single phase for small curriculum
    phases = [
      {
        id: 'phase-1',
        title: 'Phase 1: Core Priority Topics',
        description: 'Highest ranked concepts based on your study profile.',
        topicIds: uniqueRankedTopicIds,
      },
    ];
  } else if (totalRanked <= 15) {
    // 2 phases: Foundation & Advanced
    const mid = Math.ceil(totalRanked / 2);
    phases = [
      {
        id: 'phase-1',
        title: 'Phase 1: High Priority Foundations',
        description: 'First block of prioritized study topics.',
        topicIds: uniqueRankedTopicIds.slice(0, mid),
      },
      {
        id: 'phase-2',
        title: 'Phase 2: Mastery & Application',
        description: 'Second block of prioritized study topics.',
        topicIds: uniqueRankedTopicIds.slice(mid),
      },
    ];
  } else {
    // 3 phases: Foundation, Core Mastery, Advanced/Consolidation
    const step1 = Math.ceil(totalRanked * 0.35);
    const step2 = Math.ceil(totalRanked * 0.70);

    phases = [
      {
        id: 'phase-1',
        title: 'Phase 1: High Priority Foundations',
        description: 'Essential starting topics ranked with highest study urgency.',
        topicIds: uniqueRankedTopicIds.slice(0, step1),
      },
      {
        id: 'phase-2',
        title: 'Phase 2: Core Topic Mastery',
        description: 'Subsequent priority concepts building on foundations.',
        topicIds: uniqueRankedTopicIds.slice(step1, step2),
      },
      {
        id: 'phase-3',
        title: 'Phase 3: Advanced Applications & Review',
        description: 'In-depth topics and final review concepts.',
        topicIds: uniqueRankedTopicIds.slice(step2),
      },
    ];
  }

  return {
    id: `roadmap-${profileId}-${Date.now()}`,
    title: `${profile?.name || 'Curriculum'} Study Roadmap`,
    description: `Structured study plan generated from ${profile?.name || 'ranked topics'}.`,
    basedOnProfileId: profileId,
    phases,
    itemDetails,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Saves a study roadmap to local storage.
 */
export function saveRoadmapToStorage(roadmap: StudyRoadmap): void {
  try {
    localStorage.setItem(
      `${ROADMAP_STORAGE_KEY_PREFIX}${roadmap.basedOnProfileId}`,
      JSON.stringify(roadmap)
    );
  } catch {
    // ignore
  }
}

/**
 * Loads a study roadmap from local storage if one exists.
 */
export function loadRoadmapFromStorage(
  profileId: string,
  doc: CurriculumDocument
): StudyRoadmap | null {
  try {
    const raw = localStorage.getItem(`${ROADMAP_STORAGE_KEY_PREFIX}${profileId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.phases)) {
        return parsed as StudyRoadmap;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Cleans, validates, and strictly deduplicates roadmap topic IDs
 * against current curriculum doc topics. Guarantees a topic ID
 * appears at most once across the entire roadmap.
 */
export function sanitizeRoadmapTopicIds(
  roadmap: StudyRoadmap,
  doc: CurriculumDocument
): StudyRoadmap {
  const allTopicMap = new Map(getAllTopicsWithContext(doc).map((t) => [t.topicId, t]));
  const seenTopicIds = new Set<string>();

  const updatedPhases = roadmap.phases.map((phase) => {
    const uniquePhaseTopicIds: string[] = [];
    for (const id of phase.topicIds) {
      if (allTopicMap.has(id) && !seenTopicIds.has(id)) {
        seenTopicIds.add(id);
        uniquePhaseTopicIds.push(id);
      }
    }
    return {
      ...phase,
      topicIds: uniquePhaseTopicIds,
    };
  });

  return {
    ...roadmap,
    phases: updatedPhases,
  };
}

/**
 * Reorders a topic within a phase.
 */
export function reorderPhaseTopics(
  roadmap: StudyRoadmap,
  phaseId: string,
  fromIndex: number,
  toIndex: number
): StudyRoadmap {
  const phases = roadmap.phases.map((phase) => {
    if (phase.id !== phaseId) return phase;

    const list = [...phase.topicIds];
    const [moved] = list.splice(fromIndex, 1);
    if (!moved) return phase;
    list.splice(toIndex, 0, moved);

    return {
      ...phase,
      topicIds: list,
    };
  });

  return {
    ...roadmap,
    phases,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Moves a topic to another phase (or inserts from unranked pool).
 */
export function moveTopicToPhase(
  roadmap: StudyRoadmap,
  topicId: string,
  sourcePhaseId: string | null,
  targetPhaseId: string,
  targetIndex?: number
): StudyRoadmap {
  const phases = roadmap.phases.map((phase) => {
    let list = [...phase.topicIds];

    // Remove from source phase if present
    if (sourcePhaseId && phase.id === sourcePhaseId) {
      list = list.filter((id) => id !== topicId);
    } else if (!sourcePhaseId) {
      // Remove any unintentional duplicate
      list = list.filter((id) => id !== topicId);
    }

    // Add to target phase
    if (phase.id === targetPhaseId) {
      if (typeof targetIndex === 'number' && targetIndex >= 0) {
        list.splice(targetIndex, 0, topicId);
      } else {
        list.push(topicId);
      }
    }

    return {
      ...phase,
      topicIds: list,
    };
  });

  // Ensure item details exist
  const itemDetails = { ...roadmap.itemDetails };
  if (!itemDetails[topicId]) {
    itemDetails[topicId] = {
      topicId,
      status: 'planned',
    };
  }

  return {
    ...roadmap,
    phases,
    itemDetails,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Removes a topic from the roadmap (making it unassigned in the roadmap).
 * Note: Does NOT touch canonical curriculum or ranking assignments!
 */
export function removeTopicFromRoadmap(
  roadmap: StudyRoadmap,
  topicId: string
): StudyRoadmap {
  const phases = roadmap.phases.map((phase) => ({
    ...phase,
    topicIds: phase.topicIds.filter((id) => id !== topicId),
  }));

  return {
    ...roadmap,
    phases,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Adds a new custom phase to the roadmap.
 */
export function addPhaseToRoadmap(
  roadmap: StudyRoadmap,
  title: string,
  description?: string
): StudyRoadmap {
  const newPhase: RoadmapPhase = {
    id: `phase-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: title.trim() || `Phase ${roadmap.phases.length + 1}`,
    description: description?.trim() || '',
    topicIds: [],
  };

  return {
    ...roadmap,
    phases: [...roadmap.phases, newPhase],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Removes a phase from the roadmap.
 * Any topics inside that phase are returned to the unassigned pool.
 */
export function removePhaseFromRoadmap(
  roadmap: StudyRoadmap,
  phaseId: string
): StudyRoadmap {
  return {
    ...roadmap,
    phases: roadmap.phases.filter((p) => p.id !== phaseId),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Renames or updates metadata of a phase.
 */
export function updatePhase(
  roadmap: StudyRoadmap,
  phaseId: string,
  title: string,
  description?: string
): StudyRoadmap {
  return {
    ...roadmap,
    phases: roadmap.phases.map((p) =>
      p.id === phaseId ? { ...p, title, description } : p
    ),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Updates a topic's status or notes within the roadmap.
 */
export function updateRoadmapItemStatus(
  roadmap: StudyRoadmap,
  topicId: string,
  updates: Partial<RoadmapTopicItem>
): StudyRoadmap {
  const existing = roadmap.itemDetails[topicId] || {
    topicId,
    status: 'planned',
  };

  return {
    ...roadmap,
    itemDetails: {
      ...roadmap.itemDetails,
      [topicId]: {
        ...existing,
        ...updates,
      },
    },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Explicitly synchronizes the user's current roadmap sequence back into Topic Rankings.
 * ONLY called when user explicitly clicks "Sync Roadmap Order to Rankings".
 */
export function syncRoadmapOrderToRankings(
  roadmap: StudyRoadmap,
  doc: CurriculumDocument,
  profileId: string
): RankingAssignment[] {
  // Collect all topic IDs in linear phase order
  const orderedTopicIds: string[] = [];
  for (const phase of roadmap.phases) {
    for (const id of phase.topicIds) {
      if (!orderedTopicIds.includes(id)) {
        orderedTopicIds.push(id);
      }
    }
  }

  // Build a map of existing assignments for this profile to retain existing notes/ids where possible
  const existingMap = new Map<string, RankingAssignment>();
  for (const a of doc.rankingAssignments || []) {
    if (a.rankingProfileId === profileId) {
      existingMap.set(a.itemId, a);
    }
  }

  const now = new Date().toISOString();
  const updatedAssignments: RankingAssignment[] = [];

  // 1. Keep assignments for other profiles untouched
  for (const a of doc.rankingAssignments || []) {
    if (a.rankingProfileId !== profileId) {
      updatedAssignments.push(a);
    }
  }

  // 2. Add sequential assignments for roadmap topics
  orderedTopicIds.forEach((topicId, idx) => {
    const existing = existingMap.get(topicId);
    const itemDetail = roadmap.itemDetails[topicId];
    updatedAssignments.push({
      id: existing?.id || `ra-${profileId}-${topicId}`,
      rankingProfileId: profileId,
      itemId: topicId,
      order: idx + 1,
      notes: itemDetail?.customNotes || existing?.notes || '',
      updatedAt: now,
    });
  });

  return updatedAssignments;
}

// ============================================================================
// EXPORT FORMATTERS (Markdown, JSON, CSV)
// ============================================================================

/**
 * Exports study roadmap as a beautifully formatted, structured Markdown document.
 */
export function exportRoadmapMarkdown(
  roadmap: StudyRoadmap,
  doc: CurriculumDocument
): string {
  const allTopicMap = new Map(
    getAllTopicsWithContext(doc).map((ctx) => [ctx.topicId, ctx])
  );

  const lines: string[] = [];
  lines.push(`# ${roadmap.title}`);
  if (roadmap.description) lines.push(`> ${roadmap.description}\n`);
  lines.push(`**Generated From Profile:** \`${roadmap.basedOnProfileId}\``);
  lines.push(`**Curriculum Document:** ${doc.title || 'Curriculum'}`);
  lines.push(`**Export Date:** ${new Date().toLocaleDateString()}\n`);

  let totalTopics = 0;
  let totalCompleted = 0;

  roadmap.phases.forEach((p) => {
    p.topicIds.forEach((id) => {
      totalTopics++;
      if (roadmap.itemDetails[id]?.status === 'completed') totalCompleted++;
    });
  });

  lines.push(`### Overview: ${totalCompleted}/${totalTopics} Topics Completed\n`);
  lines.push('---');

  roadmap.phases.forEach((phase, phaseIdx) => {
    lines.push(`\n## ${phase.title}`);
    if (phase.description) lines.push(`*${phase.description}*\n`);

    if (phase.topicIds.length === 0) {
      lines.push('_No topics scheduled in this phase yet._\n');
      return;
    }

    phase.topicIds.forEach((topicId, idx) => {
      const ctx = allTopicMap.get(topicId);
      const detail = roadmap.itemDetails[topicId];
      const isDone = detail?.status === 'completed';
      const checkMark = isDone ? '[x]' : '[ ]';
      const name = ctx?.topicName || topicId;
      const path = ctx?.path || 'Curriculum';

      lines.push(
        `${idx + 1}. ${checkMark} **${name}** \`${topicId}\` - *${path}*`
      );

      if (detail?.status && detail.status !== 'planned') {
        lines.push(`   - **Status:** ${detail.status}`);
      }

      if (detail?.customNotes) {
        lines.push(`   - **Notes:** ${detail.customNotes}`);
      }

      if (ctx?.topic.prerequisites && ctx.topic.prerequisites.length > 0) {
        lines.push(
          `   - **Prerequisites:** ${ctx.topic.prerequisites.join(', ')}`
        );
      }
    });
  });

  return lines.join('\n');
}

/**
 * Exports study roadmap as a clean, machine-readable JSON structure.
 */
export function exportRoadmapJson(
  roadmap: StudyRoadmap,
  doc: CurriculumDocument
): string {
  const allTopicMap = new Map(
    getAllTopicsWithContext(doc).map((ctx) => [ctx.topicId, ctx])
  );

  const payload = {
    $schema: 'https://curriculum-roadmap/study-plan-v1.json',
    roadmapId: roadmap.id,
    title: roadmap.title,
    description: roadmap.description,
    basedOnProfileId: roadmap.basedOnProfileId,
    exportedAt: new Date().toISOString(),
    phases: roadmap.phases.map((phase, pIdx) => ({
      phaseNumber: pIdx + 1,
      phaseId: phase.id,
      title: phase.title,
      description: phase.description,
      topicsCount: phase.topicIds.length,
      topics: phase.topicIds.map((topicId, tIdx) => {
        const ctx = allTopicMap.get(topicId);
        const detail = roadmap.itemDetails[topicId];
        return {
          orderInPhase: tIdx + 1,
          topicId,
          topicName: ctx?.topicName || topicId,
          curriculumPath: ctx?.path || '',
          subjectId: ctx?.subjectId || '',
          subjectName: ctx?.subjectName || '',
          groupId: ctx?.groupId || '',
          groupName: ctx?.groupName || '',
          unitId: ctx?.unitId || '',
          unitName: ctx?.unitName || '',
          status: detail?.status || 'planned',
          customNotes: detail?.customNotes || '',
          prerequisites: ctx?.topic.prerequisites || [],
        };
      }),
    })),
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Exports study roadmap as a tabular CSV.
 */
export function exportRoadmapCsv(
  roadmap: StudyRoadmap,
  doc: CurriculumDocument
): string {
  const allTopicMap = new Map(
    getAllTopicsWithContext(doc).map((ctx) => [ctx.topicId, ctx])
  );

  const headers = [
    'Phase Number',
    'Phase Title',
    'Order in Phase',
    'Overall Sequence',
    'Topic ID',
    'Topic Name',
    'Subject Name',
    'Group / Grade',
    'Unit Name',
    'Full Path',
    'Status',
    'Study Notes',
    'Prerequisites',
  ];

  const escape = (val: unknown) => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const rows: string[] = [headers.map(escape).join(',')];
  let overallSeq = 1;

  roadmap.phases.forEach((phase, pIdx) => {
    phase.topicIds.forEach((topicId, tIdx) => {
      const ctx = allTopicMap.get(topicId);
      const detail = roadmap.itemDetails[topicId];
      const prereqs = ctx?.topic.prerequisites?.join('; ') || '';

      const row = [
        pIdx + 1,
        phase.title,
        tIdx + 1,
        overallSeq++,
        topicId,
        ctx?.topicName || topicId,
        ctx?.subjectName || '',
        ctx?.groupName || '',
        ctx?.unitName || '',
        ctx?.path || '',
        detail?.status || 'planned',
        detail?.customNotes || '',
        prereqs,
      ];
      rows.push(row.map(escape).join(','));
    });
  });

  return rows.join('\r\n');
}
