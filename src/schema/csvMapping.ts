/**
 * Bidirectional JSON <-> CSV / Flat-Table Mapping Rules and Conversion Engine.
 *
 * Design Rule:
 * CSV flattens hierarchical data, but to ensure 100% loss-free round-trip reconstruction,
 * every row carries:
 * 1. An explicit entityType ('subject', 'group', 'unit', 'topic', 'subtopic').
 * 2. Stable IDs and Parent IDs.
 * 3. Ancestor context columns (subjectId, groupId, unitId, topicId).
 * 4. Structured metadata preserved as serialized JSON when necessary.
 */

import {
  CurriculumDocument,
  CurriculumGroup,
  FlatCurriculumRow,
  FlatRankingRow,
  Subject,
  Subtopic,
  Topic,
  Unit,
  CURRENT_SCHEMA_VERSION,
} from '../types/curriculum';

export const CSV_COLUMN_HEADERS: (keyof FlatCurriculumRow)[] = [
  'entityType',
  'entityId',
  'parentId',
  'subjectId',
  'subjectName',
  'groupId',
  'groupName',
  'groupType',
  'unitId',
  'unitName',
  'topicId',
  'topicName',
  'subtopicId',
  'subtopicName',
  'name',
  'order',
  'description',
  'prerequisites',
  'sourceFileOrBook',
  'sourcePage',
  'sourceChapter',
  'studyDifficulty',
  'studyEstimatedMinutes',
  'studyTags',
  'customMetadataJson',
];

/**
 * Escapes a single field value for RFC 4180 CSV compliance.
 */
function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts a canonical CurriculumDocument into flattened rows.
 */
export function curriculumToFlatRows(doc: CurriculumDocument): FlatCurriculumRow[] {
  const rows: FlatCurriculumRow[] = [];

  for (const subject of doc.subjects) {
    // Subject Row
    rows.push({
      entityType: 'subject',
      entityId: subject.id,
      parentId: '',
      subjectId: subject.id,
      subjectName: subject.name,
      groupId: '',
      groupName: '',
      groupType: '',
      unitId: '',
      unitName: '',
      topicId: '',
      topicName: '',
      subtopicId: '',
      subtopicName: '',
      name: subject.name,
      order: '',
      description: subject.description || '',
      prerequisites: '',
      sourceFileOrBook: '',
      sourcePage: '',
      sourceChapter: '',
      studyDifficulty: '',
      studyEstimatedMinutes: '',
      studyTags: '',
      customMetadataJson: subject.metadata ? JSON.stringify(subject.metadata) : '',
    });

    for (const group of subject.groups) {
      // Group Row (Grade or Category)
      rows.push({
        entityType: 'group',
        entityId: group.id,
        parentId: subject.id,
        subjectId: subject.id,
        subjectName: subject.name,
        groupId: group.id,
        groupName: group.name,
        groupType: group.type,
        unitId: '',
        unitName: '',
        topicId: '',
        topicName: '',
        subtopicId: '',
        subtopicName: '',
        name: group.name,
        order: group.order ?? '',
        description: group.description || '',
        prerequisites: '',
        sourceFileOrBook: group.source?.fileOrBook || '',
        sourcePage: group.source?.page?.toString() || '',
        sourceChapter: group.source?.chapterOrUnit || '',
        studyDifficulty: '',
        studyEstimatedMinutes: '',
        studyTags: '',
        customMetadataJson: group.metadata ? JSON.stringify(group.metadata) : '',
      });

      // Units
      for (const unit of group.units) {
        rows.push({
          entityType: 'unit',
          entityId: unit.id,
          parentId: group.id,
          subjectId: subject.id,
          subjectName: subject.name,
          groupId: group.id,
          groupName: group.name,
          groupType: group.type,
          unitId: unit.id,
          unitName: unit.name,
          topicId: '',
          topicName: '',
          subtopicId: '',
          subtopicName: '',
          name: unit.name,
          order: unit.order ?? '',
          description: unit.description || '',
          prerequisites: '',
          sourceFileOrBook: unit.source?.fileOrBook || '',
          sourcePage: unit.source?.page?.toString() || '',
          sourceChapter: unit.source?.chapterOrUnit || '',
          studyDifficulty: unit.studyMetadata?.difficulty || '',
          studyEstimatedMinutes: unit.studyMetadata?.estimatedStudyMinutes ?? '',
          studyTags: unit.studyMetadata?.tags?.join(';') || '',
          customMetadataJson: unit.metadata ? JSON.stringify(unit.metadata) : '',
        });

        // Topics inside Unit
        for (const topic of unit.topics) {
          pushTopicAndSubtopics(topic, subject, group, unit);
        }
      }

      // Direct Topics in Group (Aptitude categories)
      if (group.directTopics) {
        for (const topic of group.directTopics) {
          pushTopicAndSubtopics(topic, subject, group, undefined);
        }
      }
    }
  }

  function pushTopicAndSubtopics(
    topic: Topic,
    subject: Subject,
    group: CurriculumGroup,
    unit: Unit | undefined
  ) {
    const parentId = unit ? unit.id : group.id;

    rows.push({
      entityType: 'topic',
      entityId: topic.id,
      parentId,
      subjectId: subject.id,
      subjectName: subject.name,
      groupId: group.id,
      groupName: group.name,
      groupType: group.type,
      unitId: unit?.id || '',
      unitName: unit?.name || '',
      topicId: topic.id,
      topicName: topic.name,
      subtopicId: '',
      subtopicName: '',
      name: topic.name,
      order: topic.order ?? '',
      description: topic.description || '',
      prerequisites: topic.prerequisites?.join(';') || '',
      sourceFileOrBook: topic.source?.fileOrBook || '',
      sourcePage: topic.source?.page?.toString() || '',
      sourceChapter: topic.source?.chapterOrUnit || '',
      studyDifficulty: topic.studyMetadata?.difficulty || '',
      studyEstimatedMinutes: topic.studyMetadata?.estimatedStudyMinutes ?? '',
      studyTags: topic.studyMetadata?.tags?.join(';') || '',
      customMetadataJson: topic.metadata ? JSON.stringify(topic.metadata) : '',
    });

    for (const subtopic of topic.subtopics) {
      rows.push({
        entityType: 'subtopic',
        entityId: subtopic.id,
        parentId: topic.id,
        subjectId: subject.id,
        subjectName: subject.name,
        groupId: group.id,
        groupName: group.name,
        groupType: group.type,
        unitId: unit?.id || '',
        unitName: unit?.name || '',
        topicId: topic.id,
        topicName: topic.name,
        subtopicId: subtopic.id,
        subtopicName: subtopic.name,
        name: subtopic.name,
        order: subtopic.order ?? '',
        description: subtopic.description || '',
        prerequisites: subtopic.prerequisites?.join(';') || '',
        sourceFileOrBook: subtopic.source?.fileOrBook || '',
        sourcePage: subtopic.source?.page?.toString() || '',
        sourceChapter: subtopic.source?.chapterOrUnit || '',
        studyDifficulty: subtopic.studyMetadata?.difficulty || '',
        studyEstimatedMinutes: subtopic.studyMetadata?.estimatedStudyMinutes ?? '',
        studyTags: subtopic.studyMetadata?.tags?.join(';') || '',
        customMetadataJson: subtopic.metadata ? JSON.stringify(subtopic.metadata) : '',
      });
    }
  }

  return rows;
}

/**
 * Serializes flat curriculum rows to CSV string.
 */
export function curriculumToCsv(doc: CurriculumDocument): string {
  const rows = curriculumToFlatRows(doc);
  const headerLine = CSV_COLUMN_HEADERS.join(',');
  const lines = rows.map((r) =>
    CSV_COLUMN_HEADERS.map((col) => escapeCsvField(r[col])).join(',')
  );
  return [headerLine, ...lines].join('\n');
}

/**
 * Reconstructs a full nested CurriculumDocument from flat rows without loss.
 */
export function flatRowsToCurriculum(
  rows: FlatCurriculumRow[],
  docMetadata?: { id?: string; title?: string; description?: string }
): CurriculumDocument {
  const subjectsMap = new Map<string, Subject>();
  const groupsMap = new Map<string, CurriculumGroup>();
  const unitsMap = new Map<string, Unit>();
  const topicsMap = new Map<string, Topic>();

  // Pass 1: Instantiate all entities
  for (const row of rows) {
    let customMeta: Record<string, unknown> | undefined;
    if (row.customMetadataJson) {
      try {
        customMeta = JSON.parse(row.customMetadataJson);
      } catch {
        // preserve as string if malformed
        customMeta = { rawMetadata: row.customMetadataJson };
      }
    }

    const prereqs = row.prerequisites
      ? row.prerequisites.split(/[;,]/).map((s) => s.trim()).filter(Boolean)
      : undefined;

    const source =
      row.sourceFileOrBook || row.sourcePage || row.sourceChapter
        ? {
            fileOrBook: row.sourceFileOrBook || undefined,
            page: row.sourcePage || undefined,
            chapterOrUnit: row.sourceChapter || undefined,
          }
        : undefined;

    const studyMeta =
      row.studyDifficulty || row.studyEstimatedMinutes || row.studyTags
        ? {
            difficulty: row.studyDifficulty || undefined,
            estimatedStudyMinutes: row.studyEstimatedMinutes ? Number(row.studyEstimatedMinutes) : undefined,
            tags: row.studyTags ? row.studyTags.split(/[;,]/).map((t) => t.trim()).filter(Boolean) : undefined,
          }
        : undefined;

    switch (row.entityType) {
      case 'subject':
        subjectsMap.set(row.entityId, {
          id: row.entityId,
          name: row.name || row.subjectName,
          description: row.description || undefined,
          groups: [],
          metadata: customMeta,
        });
        break;

      case 'group':
        groupsMap.set(row.entityId, {
          id: row.entityId,
          name: row.name || row.groupName,
          type: (row.groupType as CurriculumGroup['type']) || 'grade',
          order: row.order !== '' ? Number(row.order) : undefined,
          description: row.description || undefined,
          units: [],
          directTopics: [],
          source,
          metadata: customMeta,
        });
        break;

      case 'unit':
        unitsMap.set(row.entityId, {
          id: row.entityId,
          name: row.name || row.unitName,
          order: row.order !== '' ? Number(row.order) : undefined,
          description: row.description || undefined,
          topics: [],
          source,
          studyMetadata: studyMeta,
          metadata: customMeta,
        });
        break;

      case 'topic':
        topicsMap.set(row.entityId, {
          id: row.entityId,
          name: row.name || row.topicName,
          order: row.order !== '' ? Number(row.order) : undefined,
          description: row.description || undefined,
          subtopics: [],
          prerequisites: prereqs,
          source,
          studyMetadata: studyMeta,
          metadata: customMeta,
        });
        break;

      case 'subtopic': {
        const subtopic: Subtopic = {
          id: row.entityId,
          name: row.name || row.subtopicName,
          order: row.order !== '' ? Number(row.order) : undefined,
          description: row.description || undefined,
          prerequisites: prereqs,
          source,
          studyMetadata: studyMeta,
          metadata: customMeta,
        };
        const parentTopic = topicsMap.get(row.parentId || row.topicId);
        if (parentTopic) {
          parentTopic.subtopics.push(subtopic);
        }
        break;
      }
    }
  }

  // Pass 2: Assemble Hierarchy based on parent links
  for (const row of rows) {
    if (row.entityType === 'topic') {
      const topic = topicsMap.get(row.entityId);
      if (!topic) continue;

      if (row.unitId && unitsMap.has(row.unitId)) {
        unitsMap.get(row.unitId)!.topics.push(topic);
      } else if (row.groupId && groupsMap.has(row.groupId)) {
        const grp = groupsMap.get(row.groupId)!;
        grp.directTopics = grp.directTopics || [];
        grp.directTopics.push(topic);
      }
    } else if (row.entityType === 'unit') {
      const unit = unitsMap.get(row.entityId);
      if (!unit) continue;

      if (row.groupId && groupsMap.has(row.groupId)) {
        groupsMap.get(row.groupId)!.units.push(unit);
      }
    } else if (row.entityType === 'group') {
      const group = groupsMap.get(row.entityId);
      if (!group) continue;

      if (row.subjectId && subjectsMap.has(row.subjectId)) {
        subjectsMap.get(row.subjectId)!.groups.push(group);
      }
    }
  }

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: docMetadata?.id || 'imported-curriculum',
    title: docMetadata?.title || 'Imported Curriculum',
    description: docMetadata?.description || 'Reconstructed from tabular/CSV export.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    subjects: Array.from(subjectsMap.values()),
    rankingProfiles: [],
    rankingAssignments: [],
  };
}

/**
 * Converts Ranking Assignments to flat rows for CSV export.
 */
export function rankingAssignmentsToFlatRows(doc: CurriculumDocument): FlatRankingRow[] {
  const profileMap = new Map(doc.rankingProfiles.map((p) => [p.id, p]));

  // Build ID lookup for item details
  const itemLookup = new Map<string, { name: string; subjectId: string }>();
  for (const subject of doc.subjects) {
    for (const group of subject.groups) {
      for (const unit of group.units) {
        for (const topic of unit.topics) {
          itemLookup.set(topic.id, { name: topic.name, subjectId: subject.id });
          for (const subtopic of topic.subtopics) {
            itemLookup.set(subtopic.id, { name: subtopic.name, subjectId: subject.id });
          }
        }
      }
      if (group.directTopics) {
        for (const topic of group.directTopics) {
          itemLookup.set(topic.id, { name: topic.name, subjectId: subject.id });
          for (const subtopic of topic.subtopics) {
            itemLookup.set(subtopic.id, { name: subtopic.name, subjectId: subject.id });
          }
        }
      }
    }
  }

  return doc.rankingAssignments.map((assignment) => {
    const profile = profileMap.get(assignment.rankingProfileId);
    const item = itemLookup.get(assignment.itemId);

    return {
      assignmentId: assignment.id,
      rankingProfileId: assignment.rankingProfileId,
      profileName: profile?.name || assignment.rankingProfileId,
      itemId: assignment.itemId,
      itemName: item?.name || assignment.itemId,
      subjectId: item?.subjectId || '',
      rankTierId: assignment.rank || '',
      orderedPosition: assignment.order ?? '',
      notes: assignment.notes || '',
      updatedAt: assignment.updatedAt || '',
    };
  });
}
