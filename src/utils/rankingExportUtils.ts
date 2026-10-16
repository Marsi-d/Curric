/**
 * Export utilities for Ranked Curriculum.
 *
 * Supports:
 * 1. Clean, AI-readable JSON export designed for downstream LLMs (Gemini, Claude, ChatGPT)
 *    to generate personalized study roadmaps with stable IDs and hierarchy preserved.
 * 2. Complete, lossless Ranked Curriculum JSON export with full canonical curriculum.
 * 3. Tabular CSV export preserving stable ID, subject, group, unit, rank, and notes.
 * 4. Flat Relational CSV export matching the import schema.
 * 5. Pure client-side browser file downloads (100% offline, zero backend required).
 */

import { CurriculumDocument, RankingProfile, RankingAssignment, Topic } from '../types/curriculum';
import { getAllTopicsWithContext, getRankedTopics, getUnrankedTopics, TopicWithContext, RankedTopicItem } from './rankingUtils';

export type ExportFormatType = 'ai_roadmap_json' | 'canonical_ranked_json' | 'csv' | 'flat_relational_csv';

export interface ExportOptions {
  profileId: string;
  subjectId?: string; // 'all' or specific subject ID
  includeUnranked?: boolean;
}

/**
 * Escapes a single string field for RFC 4180 compliant CSV output.
 */
function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  // If string contains comma, quote, or newline, escape quotes with "" and wrap in quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Generates a clean, AI-readable JSON study roadmap payload.
 * Strictly faithful to the imported curriculum and user rankings;
 * does NOT invent, merge, or reinterpret topics.
 */
export function generateAIRoadmapJson(
  doc: CurriculumDocument,
  options: ExportOptions
): string {
  const profile = doc.rankingProfiles?.find((p) => p.id === options.profileId) || doc.rankingProfiles?.[0];
  const allTopics = getAllTopicsWithContext(doc);
  const rankedItems = getRankedTopics(profile?.id || '', doc.rankingAssignments || [], allTopics);
  const unrankedItems = getUnrankedTopics(profile?.id || '', doc.rankingAssignments || [], allTopics);

  // Apply subject filter if requested
  const filteredRanked = options.subjectId && options.subjectId !== 'all'
    ? rankedItems.filter((item) => item.topicContext.subjectId === options.subjectId)
    : rankedItems;

  const filteredUnranked = options.subjectId && options.subjectId !== 'all'
    ? unrankedItems.filter((item) => item.subjectId === options.subjectId)
    : unrankedItems;

  const payload = {
    $schema: 'https://curriculum-roadmap/ai-export-v1.json',
    exportType: 'ranked_curriculum_study_roadmap',
    generatedAt: new Date().toISOString(),
    aiPromptInstruction:
      'This payload contains the student’s authentic curriculum syllabus with verified stable topic IDs, ancestral curriculum locations, and user-defined ranking priorities. Use this ordered sequence and prerequisite relationships to construct a personalized, sequential study roadmap and learning schedule. Do not invent new topics, do not merge or omit topics, and respect the explicit priority rankings and prerequisite dependencies.',
    curriculumMetadata: {
      documentId: doc.id,
      title: doc.title || 'Curriculum Master',
      description: doc.description || '',
      schemaVersion: doc.schemaVersion,
      totalTopicsInCurriculum: allTopics.length,
      rankedTopicsCount: filteredRanked.length,
      unrankedTopicsCount: filteredUnranked.length,
    },
    rankingProfile: {
      id: profile?.id || options.profileId,
      name: profile?.name || 'Study Priority',
      type: profile?.type || 'ordered',
      scope: profile?.scope || 'all_subjects',
      description: profile?.description || '',
    },
    rankedTopics: filteredRanked.map((item) => {
      const ctx = item.topicContext;
      const t = ctx.topic;

      return {
        rank: item.order,
        stableId: ctx.topicId,
        topicName: ctx.topicName,
        description: t.description || undefined,
        curriculumLocation: {
          subjectId: ctx.subjectId,
          subjectName: ctx.subjectName,
          subjectType: ctx.subjectType,
          groupId: ctx.groupId,
          groupName: ctx.groupName,
          groupType: ctx.groupType,
          unitId: ctx.unitId,
          unitName: ctx.unitName,
          fullPath: ctx.path,
        },
        ranking: {
          profileId: item.assignment.rankingProfileId,
          profileName: profile?.name || item.assignment.rankingProfileId,
          order: item.order,
          notes: item.notes || undefined,
          updatedAt: item.assignment.updatedAt,
        },
        prerequisites: Array.isArray(t.prerequisites) ? t.prerequisites : [],
        subtopics: Array.isArray(t.subtopics)
          ? t.subtopics.map((st) => ({
              id: st.id,
              name: st.name,
              order: st.order,
            }))
          : [],
        studyMetadata: t.studyMetadata
          ? {
              difficulty: t.studyMetadata.difficulty,
              mastery: t.studyMetadata.mastery,
              importance: t.studyMetadata.importance,
              estimatedStudyMinutes: t.studyMetadata.estimatedStudyMinutes,
              status: t.studyMetadata.status,
              tags: t.studyMetadata.tags,
            }
          : undefined,
      };
    }),
    ...(options.includeUnranked
      ? {
          unrankedTopics: filteredUnranked.map((ctx) => ({
            stableId: ctx.topicId,
            topicName: ctx.topicName,
            description: ctx.topicDescription || undefined,
            curriculumLocation: {
              subjectId: ctx.subjectId,
              subjectName: ctx.subjectName,
              groupId: ctx.groupId,
              groupName: ctx.groupName,
              unitId: ctx.unitId,
              unitName: ctx.unitName,
              fullPath: ctx.path,
            },
            prerequisites: Array.isArray(ctx.topic.prerequisites) ? ctx.topic.prerequisites : [],
            subtopicsCount: Array.isArray(ctx.topic.subtopics) ? ctx.topic.subtopics.length : 0,
          })),
        }
      : {}),
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Generates a complete, canonical JSON export that bundles user rankings
 * alongside the full canonical curriculum structure for lossless round-tripping.
 */
export function generateRankedCurriculumJson(
  doc: CurriculumDocument,
  options: ExportOptions
): string {
  const profile = doc.rankingProfiles?.find((p) => p.id === options.profileId) || doc.rankingProfiles?.[0];
  const allTopics = getAllTopicsWithContext(doc);
  const rankedItems = getRankedTopics(profile?.id || '', doc.rankingAssignments || [], allTopics);

  const filteredRanked = options.subjectId && options.subjectId !== 'all'
    ? rankedItems.filter((item) => item.topicContext.subjectId === options.subjectId)
    : rankedItems;

  const exportDoc = {
    $schema: 'https://curriculum-schema/ranked-curriculum-v1.json',
    schemaVersion: doc.schemaVersion,
    exportDate: new Date().toISOString(),
    document: {
      id: doc.id,
      title: doc.title,
      description: doc.description,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    },
    activeRankingProfile: profile,
    rankingAssignments: filteredRanked.map((r) => ({
      order: r.order,
      topicId: r.topicContext.topicId,
      topicName: r.topicContext.topicName,
      subjectId: r.topicContext.subjectId,
      subjectName: r.topicContext.subjectName,
      groupId: r.topicContext.groupId,
      groupName: r.topicContext.groupName,
      unitId: r.topicContext.unitId,
      unitName: r.topicContext.unitName,
      path: r.topicContext.path,
      notes: r.notes || '',
      updatedAt: r.assignment.updatedAt,
    })),
    allRankingProfiles: doc.rankingProfiles,
    canonicalCurriculum: doc,
  };

  return JSON.stringify(exportDoc, null, 2);
}

/**
 * Generates a human-friendly, tabular CSV export of the ranked curriculum.
 * Preserves each topic's stable ID, subject, curriculum location, order, and notes.
 */
export function generateRankedCurriculumCsv(
  doc: CurriculumDocument,
  options: ExportOptions
): string {
  const profile = doc.rankingProfiles?.find((p) => p.id === options.profileId) || doc.rankingProfiles?.[0];
  const allTopics = getAllTopicsWithContext(doc);
  const rankedItems = getRankedTopics(profile?.id || '', doc.rankingAssignments || [], allTopics);
  const unrankedItems = getUnrankedTopics(profile?.id || '', doc.rankingAssignments || [], allTopics);

  const filteredRanked = options.subjectId && options.subjectId !== 'all'
    ? rankedItems.filter((item) => item.topicContext.subjectId === options.subjectId)
    : rankedItems;

  const filteredUnranked = options.subjectId && options.subjectId !== 'all'
    ? unrankedItems.filter((item) => item.subjectId === options.subjectId)
    : unrankedItems;

  const headers = [
    'Rank Order',
    'Topic Stable ID',
    'Topic Name',
    'Subject ID',
    'Subject Name',
    'Group / Grade ID',
    'Group / Grade Name',
    'Unit ID',
    'Unit Name',
    'Full Curriculum Path',
    'Ranking Profile ID',
    'Ranking Profile Name',
    'Ranking Notes / Rationale',
    'Prerequisites',
    'Subtopics Count',
    'Difficulty',
    'Mastery',
    'Estimated Minutes',
    'Topic Description',
    'Last Updated',
  ];

  const rows: string[] = [];
  rows.push(headers.map(escapeCsvField).join(','));

  // Ranked topics
  for (const item of filteredRanked) {
    const ctx = item.topicContext;
    const t = ctx.topic;
    const prereqs = Array.isArray(t.prerequisites) ? t.prerequisites.join('; ') : '';
    const subtopicsCount = Array.isArray(t.subtopics) ? t.subtopics.length : 0;

    const row = [
      item.order,
      ctx.topicId,
      ctx.topicName,
      ctx.subjectId,
      ctx.subjectName,
      ctx.groupId,
      ctx.groupName,
      ctx.unitId || '',
      ctx.unitName || '',
      ctx.path,
      item.assignment.rankingProfileId,
      profile?.name || item.assignment.rankingProfileId,
      item.notes || '',
      prereqs,
      subtopicsCount,
      t.studyMetadata?.difficulty || '',
      t.studyMetadata?.mastery || '',
      t.studyMetadata?.estimatedStudyMinutes || '',
      t.description || '',
      item.assignment.updatedAt || '',
    ];

    rows.push(row.map(escapeCsvField).join(','));
  }

  // Unranked topics (if enabled)
  if (options.includeUnranked) {
    for (const ctx of filteredUnranked) {
      const t = ctx.topic;
      const prereqs = Array.isArray(t.prerequisites) ? t.prerequisites.join('; ') : '';
      const subtopicsCount = Array.isArray(t.subtopics) ? t.subtopics.length : 0;

      const row = [
        'UNRANKED',
        ctx.topicId,
        ctx.topicName,
        ctx.subjectId,
        ctx.subjectName,
        ctx.groupId,
        ctx.groupName,
        ctx.unitId || '',
        ctx.unitName || '',
        ctx.path,
        profile?.id || options.profileId,
        profile?.name || '',
        '',
        prereqs,
        subtopicsCount,
        t.studyMetadata?.difficulty || '',
        t.studyMetadata?.mastery || '',
        t.studyMetadata?.estimatedStudyMinutes || '',
        t.description || '',
        '',
      ];

      rows.push(row.map(escapeCsvField).join(','));
    }
  }

  return rows.join('\r\n');
}

/**
 * Generates a flat relational CSV export matching FlatRankingRow schema.
 */
export function generateFlatRankingCsv(
  doc: CurriculumDocument,
  options: ExportOptions
): string {
  const profile = doc.rankingProfiles?.find((p) => p.id === options.profileId) || doc.rankingProfiles?.[0];
  const allTopics = getAllTopicsWithContext(doc);
  const rankedItems = getRankedTopics(profile?.id || '', doc.rankingAssignments || [], allTopics);

  const filteredRanked = options.subjectId && options.subjectId !== 'all'
    ? rankedItems.filter((item) => item.topicContext.subjectId === options.subjectId)
    : rankedItems;

  const headers = [
    'assignmentId',
    'rankingProfileId',
    'profileName',
    'itemId',
    'itemName',
    'subjectId',
    'rankTierId',
    'orderedPosition',
    'notes',
    'updatedAt',
  ];

  const rows: string[] = [];
  rows.push(headers.map(escapeCsvField).join(','));

  for (const r of filteredRanked) {
    const row = [
      r.assignment.id,
      r.assignment.rankingProfileId,
      profile?.name || r.assignment.rankingProfileId,
      r.topicContext.topicId,
      r.topicContext.topicName,
      r.topicContext.subjectId,
      r.assignment.rank || '',
      r.order,
      r.notes || '',
      r.assignment.updatedAt || '',
    ];
    rows.push(row.map(escapeCsvField).join(','));
  }

  return rows.join('\r\n');
}

/**
 * Generates ready-to-use AI Prompt text containing the instructions and the AI-readable JSON payload.
 */
export function generateAIPromptWithPayload(
  doc: CurriculumDocument,
  options: ExportOptions
): string {
  const jsonPayload = generateAIRoadmapJson(doc, options);
  const profile = doc.rankingProfiles?.find((p) => p.id === options.profileId) || doc.rankingProfiles?.[0];

  return `### AI STUDY ROADMAP GENERATION PROMPT

You are an expert academic tutor and curriculum planner. 
I have provided my verified, prioritized curriculum syllabus below in structured JSON.
Each topic includes a permanent stable ID, full curriculum path (Subject › Grade/Category › Unit), 
and an explicit ranking order according to my "${profile?.name || 'Study Priority'}" profile.

TASK:
1. Analyze the ranked topics and their prerequisite relationships.
2. Formulate a realistic, sequential study roadmap structured into clear learning phases or weekly milestones.
3. Keep strictly faithful to the syllabus: DO NOT hallucinate, invent, merge, or omit any topics.
4. Always reference each topic by its exact Name and permanent Stable ID.
5. Provide actionable revision advice for high-priority topics with user notes.
6. Crucially, ALSO provide the complete study roadmap structured into phases as clean, valid JSON enclosed in a markdown copy box (\`\`\`json ... \`\`\`) so it can be easily copied and imported back directly into the application.

CURRICULUM ROADMAP PAYLOAD:
\`\`\`json
${jsonPayload}
\`\`\``;
}

/**
 * Pure client-side browser file download utility.
 * Creates an in-memory blob and triggers download without server requests.
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
