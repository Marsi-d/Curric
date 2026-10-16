/**
 * Runtime Data Integrity and Validation Engine for Curriculum Documents.
 *
 * Enforces canonical constraints, checks cross-references, validates prerequisites,
 * verifies decoupled ranking assignments, and detects AI extraction anomalies.
 */

import {
  CurriculumDocument,
  CurriculumGroup,
  RankingAssignment,
  RankingProfile,
  Subject,
  Subtopic,
  Topic,
  Unit,
  CURRENT_SCHEMA_VERSION,
} from '../types/curriculum';

export type IssueLevel = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  level: IssueLevel;
  code: string;
  path: string;
  entityId?: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface CurriculumStats {
  subjectCount: number;
  groupCount: number;
  unitCount: number;
  topicCount: number;
  subtopicCount: number;
  totalCurriculumEntities: number;
  rankingProfileCount: number;
  rankingAssignmentCount: number;
  prerequisiteCount: number;
  crossGradePrerequisiteCount: number;
  crossSubjectPrerequisiteCount: number;
  bySubject: Record<
    string,
    {
      name: string;
      groupCount: number;
      unitCount: number;
      topicCount: number;
      subtopicCount: number;
    }
  >;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
  stats: CurriculumStats;
}

interface EntityIndexEntry {
  id: string;
  type: 'subject' | 'group' | 'unit' | 'topic' | 'subtopic';
  path: string;
  name: string;
  subjectId: string;
  groupId?: string;
  unitId?: string;
  topicId?: string;
  gradeLevel?: number;
}

/**
 * Validates a curriculum document against canonical architectural constraints.
 */
export function validateCurriculumDocument(raw: unknown): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const info: ValidationIssue[] = [];

  const stats: CurriculumStats = {
    subjectCount: 0,
    groupCount: 0,
    unitCount: 0,
    topicCount: 0,
    subtopicCount: 0,
    totalCurriculumEntities: 0,
    rankingProfileCount: 0,
    rankingAssignmentCount: 0,
    prerequisiteCount: 0,
    crossGradePrerequisiteCount: 0,
    crossSubjectPrerequisiteCount: 0,
    bySubject: {},
  };

  // Top-level object structure check
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      valid: false,
      errors: [
        {
          level: 'error',
          code: 'INVALID_ROOT_OBJECT',
          path: '$',
          message: 'Curriculum document must be a non-null object.',
        },
      ],
      warnings: [],
      info: [],
      stats,
    };
  }

  const doc = raw as Partial<CurriculumDocument>;

  // 1. Schema Version Check
  if (doc.schemaVersion === undefined) {
    errors.push({
      level: 'error',
      code: 'MISSING_SCHEMA_VERSION',
      path: '$.schemaVersion',
      message: `Top-level schemaVersion is required (current: ${CURRENT_SCHEMA_VERSION}).`,
    });
  } else if (doc.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    warnings.push({
      level: 'warning',
      code: 'UNSUPPORTED_SCHEMA_VERSION',
      path: '$.schemaVersion',
      message: `Document schemaVersion (${doc.schemaVersion}) differs from current (${CURRENT_SCHEMA_VERSION}). Migration may be required.`,
      context: { documentVersion: doc.schemaVersion, currentVersion: CURRENT_SCHEMA_VERSION },
    });
  }

  // 2. Document Identity
  if (!doc.id || typeof doc.id !== 'string') {
    errors.push({
      level: 'error',
      code: 'MISSING_DOCUMENT_ID',
      path: '$.id',
      message: 'Document id is required and must be a string.',
    });
  }

  if (!doc.title || typeof doc.title !== 'string') {
    errors.push({
      level: 'error',
      code: 'MISSING_DOCUMENT_TITLE',
      path: '$.title',
      message: 'Document title is required and must be a string.',
    });
  }

  // Global ID registry for uniqueness and reference verification
  const idRegistry = new Map<string, EntityIndexEntry>();
  const allIds = new Set<string>();

  function registerEntity(
    id: unknown,
    type: EntityIndexEntry['type'],
    path: string,
    name: string,
    subjectId: string,
    groupId?: string,
    unitId?: string,
    topicId?: string,
    gradeLevel?: number
  ): boolean {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      errors.push({
        level: 'error',
        code: 'INVALID_OR_EMPTY_ID',
        path,
        message: `Entity of type '${type}' has a missing or empty ID.`,
      });
      return false;
    }

    if (allIds.has(id)) {
      const existing = idRegistry.get(id);
      errors.push({
        level: 'error',
        code: 'DUPLICATE_ID',
        path,
        entityId: id,
        message: `Duplicate ID detected: '${id}' is already registered at path '${existing?.path || 'unknown'}'.`,
        context: { duplicateId: id, firstOccurrencePath: existing?.path },
      });
      return false;
    }

    allIds.add(id);
    const entry: EntityIndexEntry = {
      id,
      type,
      path,
      name,
      subjectId,
      groupId,
      unitId,
      topicId,
      gradeLevel,
    };
    idRegistry.set(id, entry);
    stats.totalCurriculumEntities++;
    return true;
  }

  // 3. Subjects Validation
  if (!Array.isArray(doc.subjects)) {
    errors.push({
      level: 'error',
      code: 'MISSING_SUBJECTS_ARRAY',
      path: '$.subjects',
      message: 'Document must contain a subjects array.',
    });
  } else {
    stats.subjectCount = doc.subjects.length;

    doc.subjects.forEach((subject: Subject, sIdx: number) => {
      const sPath = `$.subjects[${sIdx}]`;

      if (!subject.name) {
        errors.push({
          level: 'error',
          code: 'MISSING_SUBJECT_NAME',
          path: `${sPath}.name`,
          message: `Subject at index ${sIdx} is missing a name.`,
        });
      }

      registerEntity(subject.id, 'subject', sPath, subject.name || '', subject.id);

      stats.bySubject[subject.id || `unknown-${sIdx}`] = {
        name: subject.name || 'Unnamed',
        groupCount: 0,
        unitCount: 0,
        topicCount: 0,
        subtopicCount: 0,
      };

      const subjStats = stats.bySubject[subject.id || `unknown-${sIdx}`];

      if (!Array.isArray(subject.groups)) {
        errors.push({
          level: 'error',
          code: 'INVALID_GROUPS_ARRAY',
          path: `${sPath}.groups`,
          entityId: subject.id,
          message: `Subject '${subject.name || subject.id}' must contain a groups array.`,
        });
        return;
      }

      subjStats.groupCount = subject.groups.length;
      stats.groupCount += subject.groups.length;

      // Validate Groups (Grades or Categories)
      subject.groups.forEach((group: CurriculumGroup, gIdx: number) => {
        const gPath = `${sPath}.groups[${gIdx}]`;

        if (!group.name) {
          errors.push({
            level: 'error',
            code: 'MISSING_GROUP_NAME',
            path: `${gPath}.name`,
            message: `Group at ${gPath} is missing a name.`,
          });
        }

        if (!group.type) {
          errors.push({
            level: 'error',
            code: 'MISSING_GROUP_TYPE',
            path: `${gPath}.type`,
            message: `Group '${group.name || group.id}' is missing a type ('grade', 'category', 'module', etc.).`,
          });
        }

        registerEntity(
          group.id,
          'group',
          gPath,
          group.name || '',
          subject.id,
          group.id,
          undefined,
          undefined,
          group.gradeLevel
        );

        // Group might contain units OR direct topics (for Aptitude flexibility)
        const hasUnits = Array.isArray(group.units) && group.units.length > 0;
        const hasDirectTopics = Array.isArray(group.directTopics) && group.directTopics.length > 0;

        if (!hasUnits && !hasDirectTopics) {
          warnings.push({
            level: 'warning',
            code: 'EMPTY_GROUP',
            path: gPath,
            entityId: group.id,
            message: `Group '${group.name || group.id}' contains neither units nor direct topics.`,
          });
        }

        // Validate Units if present
        if (Array.isArray(group.units)) {
          subjStats.unitCount += group.units.length;
          stats.unitCount += group.units.length;

          group.units.forEach((unit: Unit, uIdx: number) => {
            const uPath = `${gPath}.units[${uIdx}]`;

            if (!unit.name) {
              errors.push({
                level: 'error',
                code: 'MISSING_UNIT_NAME',
                path: `${uPath}.name`,
                message: `Unit at ${uPath} is missing a name.`,
              });
            }

            registerEntity(
              unit.id,
              'unit',
              uPath,
              unit.name || '',
              subject.id,
              group.id,
              unit.id,
              undefined,
              group.gradeLevel
            );

            if (!Array.isArray(unit.topics)) {
              errors.push({
                level: 'error',
                code: 'INVALID_TOPICS_ARRAY',
                path: `${uPath}.topics`,
                entityId: unit.id,
                message: `Unit '${unit.name || unit.id}' must contain a topics array.`,
              });
              return;
            }

            if (unit.topics.length === 0) {
              warnings.push({
                level: 'warning',
                code: 'EMPTY_UNIT',
                path: uPath,
                entityId: unit.id,
                message: `Unit '${unit.name || unit.id}' has 0 topics.`,
              });
            }

            // Track topic names inside unit to detect duplicate AI extractions
            const topicNamesInUnit = new Set<string>();

            unit.topics.forEach((topic: Topic, tIdx: number) => {
              const tPath = `${uPath}.topics[${tIdx}]`;
              validateTopic(
                topic,
                tPath,
                subject.id,
                group.id,
                unit.id,
                group.gradeLevel,
                subjStats,
                topicNamesInUnit
              );
            });
          });
        }

        // Validate Direct Topics if present (e.g. Aptitude categories)
        if (Array.isArray(group.directTopics)) {
          const directTopicNames = new Set<string>();
          group.directTopics.forEach((topic: Topic, dtIdx: number) => {
            const dtPath = `${gPath}.directTopics[${dtIdx}]`;
            validateTopic(
              topic,
              dtPath,
              subject.id,
              group.id,
              undefined,
              group.gradeLevel,
              subjStats,
              directTopicNames
            );
          });
        }
      });
    });
  }

  // Topic validation helper function
  function validateTopic(
    topic: Topic,
    tPath: string,
    subjectId: string,
    groupId: string,
    unitId: string | undefined,
    gradeLevel: number | undefined,
    subjStats: CurriculumStats['bySubject'][string],
    topicNamesInParent: Set<string>
  ) {
    subjStats.topicCount++;
    stats.topicCount++;

    if (!topic.name) {
      errors.push({
        level: 'error',
        code: 'MISSING_TOPIC_NAME',
        path: `${tPath}.name`,
        message: `Topic at ${tPath} is missing a name.`,
      });
    } else {
      const normalizedName = topic.name.trim().toLowerCase();
      if (topicNamesInParent.has(normalizedName)) {
        warnings.push({
          level: 'warning',
          code: 'POSSIBLE_DUPLICATE_TOPIC_NAME',
          path: `${tPath}.name`,
          entityId: topic.id,
          message: `Topic name '${topic.name}' appears multiple times within the same parent container.`,
        });
      }
      topicNamesInParent.add(normalizedName);
    }

    registerEntity(
      topic.id,
      'topic',
      tPath,
      topic.name || '',
      subjectId,
      groupId,
      unitId,
      topic.id,
      gradeLevel
    );

    // Subtopics
    if (Array.isArray(topic.subtopics)) {
      subjStats.subtopicCount += topic.subtopics.length;
      stats.subtopicCount += topic.subtopics.length;

      topic.subtopics.forEach((subtopic: Subtopic, stIdx: number) => {
        const stPath = `${tPath}.subtopics[${stIdx}]`;

        if (!subtopic.name) {
          errors.push({
            level: 'error',
            code: 'MISSING_SUBTOPIC_NAME',
            path: `${stPath}.name`,
            message: `Subtopic at ${stPath} is missing a name.`,
          });
        }

        registerEntity(
          subtopic.id,
          'subtopic',
          stPath,
          subtopic.name || '',
          subjectId,
          groupId,
          unitId,
          topic.id,
          gradeLevel
        );
      });
    }
  }

  // 4. Prerequisites Cross-Reference Validation
  // Every referenced prerequisite must exist in the ID registry as a topic or subtopic
  function checkPrerequisites(
    prereqs: string[] | undefined,
    itemPath: string,
    itemId: string,
    itemSubjectId: string,
    itemGrade?: number
  ) {
    if (!Array.isArray(prereqs) || prereqs.length === 0) return;

    prereqs.forEach((prereqId, pIdx) => {
      stats.prerequisiteCount++;

      if (prereqId === itemId) {
        errors.push({
          level: 'error',
          code: 'SELF_REFERENTIAL_PREREQUISITE',
          path: `${itemPath}.prerequisites[${pIdx}]`,
          entityId: itemId,
          message: `Item '${itemId}' cannot declare itself as its own prerequisite.`,
        });
        return;
      }

      const target = idRegistry.get(prereqId);
      if (!target) {
        errors.push({
          level: 'error',
          code: 'DANGLING_PREREQUISITE_REFERENCE',
          path: `${itemPath}.prerequisites[${pIdx}]`,
          entityId: itemId,
          message: `Prerequisite ID '${prereqId}' referenced by item '${itemId}' does not exist in the curriculum.`,
          context: { referencedId: prereqId, sourceItemId: itemId },
        });
        return;
      }

      if (target.type !== 'topic' && target.type !== 'subtopic') {
        warnings.push({
          level: 'warning',
          code: 'UNUSUAL_PREREQUISITE_TARGET',
          path: `${itemPath}.prerequisites[${pIdx}]`,
          entityId: itemId,
          message: `Prerequisite '${prereqId}' references a ${target.type} ('${target.name}') instead of a topic or subtopic.`,
        });
      }

      // Check cross-subject or cross-grade prerequisite
      if (target.subjectId !== itemSubjectId) {
        stats.crossSubjectPrerequisiteCount++;
        info.push({
          level: 'info',
          code: 'CROSS_SUBJECT_PREREQUISITE',
          path: `${itemPath}.prerequisites[${pIdx}]`,
          entityId: itemId,
          message: `Cross-subject prerequisite: '${itemId}' (${itemSubjectId}) depends on '${prereqId}' (${target.subjectId}).`,
        });
      } else if (itemGrade !== undefined && target.gradeLevel !== undefined && target.gradeLevel !== itemGrade) {
        stats.crossGradePrerequisiteCount++;
        info.push({
          level: 'info',
          code: 'CROSS_GRADE_PREREQUISITE',
          path: `${itemPath}.prerequisites[${pIdx}]`,
          entityId: itemId,
          message: `Cross-grade prerequisite: '${itemId}' (Grade ${itemGrade}) depends on '${prereqId}' (Grade ${target.gradeLevel}).`,
        });
      }
    });
  }

  // Iterate to verify prerequisites on all topics and subtopics
  if (Array.isArray(doc.subjects)) {
    doc.subjects.forEach((subject, sIdx) => {
      subject.groups?.forEach((group, gIdx) => {
        group.units?.forEach((unit, uIdx) => {
          unit.topics?.forEach((topic, tIdx) => {
            const tPath = `$.subjects[${sIdx}].groups[${gIdx}].units[${uIdx}].topics[${tIdx}]`;
            checkPrerequisites(topic.prerequisites, tPath, topic.id, subject.id, group.gradeLevel);

            topic.subtopics?.forEach((subtopic, stIdx) => {
              const stPath = `${tPath}.subtopics[${stIdx}]`;
              checkPrerequisites(subtopic.prerequisites, stPath, subtopic.id, subject.id, group.gradeLevel);
            });
          });
        });

        group.directTopics?.forEach((topic, dtIdx) => {
          const dtPath = `$.subjects[${sIdx}].groups[${gIdx}].directTopics[${dtIdx}]`;
          checkPrerequisites(topic.prerequisites, dtPath, topic.id, subject.id, group.gradeLevel);

          topic.subtopics?.forEach((subtopic, stIdx) => {
            const stPath = `${dtPath}.subtopics[${stIdx}]`;
            checkPrerequisites(subtopic.prerequisites, stPath, subtopic.id, subject.id, group.gradeLevel);
          });
        });
      });
    });
  }

  // 5. Ranking Profiles Validation
  const profileMap = new Map<string, RankingProfile>();

  if (!Array.isArray(doc.rankingProfiles)) {
    errors.push({
      level: 'error',
      code: 'MISSING_RANKING_PROFILES_ARRAY',
      path: '$.rankingProfiles',
      message: 'Document must contain a rankingProfiles array.',
    });
  } else {
    stats.rankingProfileCount = doc.rankingProfiles.length;

    doc.rankingProfiles.forEach((profile: RankingProfile, pIdx: number) => {
      const pPath = `$.rankingProfiles[${pIdx}]`;

      if (!profile.id || typeof profile.id !== 'string') {
        errors.push({
          level: 'error',
          code: 'MISSING_PROFILE_ID',
          path: `${pPath}.id`,
          message: `Ranking profile at index ${pIdx} is missing an ID.`,
        });
        return;
      }

      if (profileMap.has(profile.id)) {
        errors.push({
          level: 'error',
          code: 'DUPLICATE_PROFILE_ID',
          path: `${pPath}.id`,
          entityId: profile.id,
          message: `Duplicate ranking profile ID: '${profile.id}'.`,
        });
        return;
      }

      profileMap.set(profile.id, profile);

      if (!profile.name) {
        errors.push({
          level: 'error',
          code: 'MISSING_PROFILE_NAME',
          path: `${pPath}.name`,
          entityId: profile.id,
          message: `Ranking profile '${profile.id}' is missing a name.`,
        });
      }

      if (profile.type !== 'tier' && profile.type !== 'ordered') {
        errors.push({
          level: 'error',
          code: 'INVALID_PROFILE_TYPE',
          path: `${pPath}.type`,
          entityId: profile.id,
          message: `Ranking profile '${profile.id}' type must be 'tier' or 'ordered' (found: '${profile.type}').`,
        });
      }

      // If scope is subject_specific, ensure targetSubjectId is valid
      if (profile.scope === 'subject_specific') {
        if (!profile.targetSubjectId) {
          errors.push({
            level: 'error',
            code: 'MISSING_TARGET_SUBJECT',
            path: `${pPath}.targetSubjectId`,
            entityId: profile.id,
            message: `Subject-specific ranking profile '${profile.id}' must specify 'targetSubjectId'.`,
          });
        } else if (!idRegistry.has(profile.targetSubjectId)) {
          errors.push({
            level: 'error',
            code: 'INVALID_TARGET_SUBJECT_ID',
            path: `${pPath}.targetSubjectId`,
            entityId: profile.id,
            message: `Target subject ID '${profile.targetSubjectId}' does not exist in subjects.`,
          });
        }
      }

      // Tier Profile specific validation
      if (profile.type === 'tier') {
        if (!Array.isArray(profile.tiers) || profile.tiers.length === 0) {
          errors.push({
            level: 'error',
            code: 'EMPTY_TIERS_ARRAY',
            path: `${pPath}.tiers`,
            entityId: profile.id,
            message: `Tier ranking profile '${profile.id}' must define at least one tier in 'tiers'.`,
          });
        } else {
          const tierIds = new Set<string>();
          profile.tiers.forEach((tier, tIdx) => {
            const tierPath = `${pPath}.tiers[${tIdx}]`;
            if (!tier.id) {
              errors.push({
                level: 'error',
                code: 'MISSING_TIER_ID',
                path: `${tierPath}.id`,
                message: `Tier at ${tierPath} has no ID.`,
              });
            } else if (tierIds.has(tier.id)) {
              errors.push({
                level: 'error',
                code: 'DUPLICATE_TIER_ID',
                path: `${tierPath}.id`,
                message: `Duplicate tier ID '${tier.id}' in profile '${profile.id}'.`,
              });
            } else {
              tierIds.add(tier.id);
            }

            if (!tier.label) {
              errors.push({
                level: 'error',
                code: 'MISSING_TIER_LABEL',
                path: `${tierPath}.label`,
                message: `Tier '${tier.id}' is missing a display label.`,
              });
            }
          });
        }
      }
    });
  }

  // 6. Ranking Assignments Validation
  if (!Array.isArray(doc.rankingAssignments)) {
    errors.push({
      level: 'error',
      code: 'MISSING_RANKING_ASSIGNMENTS_ARRAY',
      path: '$.rankingAssignments',
      message: 'Document must contain a rankingAssignments array.',
    });
  } else {
    stats.rankingAssignmentCount = doc.rankingAssignments.length;

    const assignmentIds = new Set<string>();
    // profileId -> (itemId -> assignmentIndex)
    const profileItemTracker = new Map<string, Map<string, number>>();
    // profileId -> Set of used order integers (for ordered profiles)
    const orderedPositionTracker = new Map<string, Set<number>>();

    doc.rankingAssignments.forEach((assignment: RankingAssignment, aIdx: number) => {
      const aPath = `$.rankingAssignments[${aIdx}]`;

      if (!assignment.id) {
        errors.push({
          level: 'error',
          code: 'MISSING_ASSIGNMENT_ID',
          path: `${aPath}.id`,
          message: `Ranking assignment at index ${aIdx} is missing an ID.`,
        });
      } else if (assignmentIds.has(assignment.id)) {
        errors.push({
          level: 'error',
          code: 'DUPLICATE_ASSIGNMENT_ID',
          path: `${aPath}.id`,
          entityId: assignment.id,
          message: `Duplicate assignment ID: '${assignment.id}'.`,
        });
      } else {
        assignmentIds.add(assignment.id);
      }

      // Check referenced Profile
      const profile = profileMap.get(assignment.rankingProfileId);
      if (!profile) {
        errors.push({
          level: 'error',
          code: 'DANGLING_RANKING_PROFILE_REF',
          path: `${aPath}.rankingProfileId`,
          entityId: assignment.id,
          message: `Assignment '${assignment.id}' references non-existent rankingProfileId '${assignment.rankingProfileId}'.`,
        });
        return;
      }

      // Check referenced Item
      const targetItem = idRegistry.get(assignment.itemId);
      if (!targetItem) {
        errors.push({
          level: 'error',
          code: 'DANGLING_RANKING_ITEM_REF',
          path: `${aPath}.itemId`,
          entityId: assignment.id,
          message: `Assignment '${assignment.id}' references non-existent curriculum itemId '${assignment.itemId}'.`,
        });
        return;
      }

      // Ensure item is a topic or subtopic
      if (targetItem.type !== 'topic' && targetItem.type !== 'subtopic') {
        warnings.push({
          level: 'warning',
          code: 'RANKING_NON_TOPIC_ENTITY',
          path: `${aPath}.itemId`,
          entityId: assignment.id,
          message: `Assignment '${assignment.id}' ranks a ${targetItem.type} ('${targetItem.name}') instead of a topic/subtopic.`,
        });
      }

      // Ensure item conforms to profile scope if subject_specific
      if (profile.scope === 'subject_specific' && profile.targetSubjectId) {
        if (targetItem.subjectId !== profile.targetSubjectId) {
          errors.push({
            level: 'error',
            code: 'SUBJECT_MISMATCH_IN_RANKING',
            path: `${aPath}.itemId`,
            entityId: assignment.id,
            message: `Item '${assignment.itemId}' belongs to subject '${targetItem.subjectId}', but profile '${profile.id}' is restricted to '${profile.targetSubjectId}'.`,
          });
        }
      }

      // Duplicate item assignment check in same profile
      if (!profileItemTracker.has(profile.id)) {
        profileItemTracker.set(profile.id, new Map());
      }
      const itemMap = profileItemTracker.get(profile.id)!;
      if (itemMap.has(assignment.itemId)) {
        warnings.push({
          level: 'warning',
          code: 'DUPLICATE_ITEM_ASSIGNMENT_IN_PROFILE',
          path: `${aPath}.itemId`,
          entityId: assignment.id,
          message: `Item '${assignment.itemId}' is assigned multiple times inside ranking profile '${profile.id}'.`,
        });
      } else {
        itemMap.set(assignment.itemId, aIdx);
      }

      // Value validation according to profile type
      if (profile.type === 'tier') {
        if (!assignment.rank) {
          errors.push({
            level: 'error',
            code: 'MISSING_TIER_RANK_VALUE',
            path: `${aPath}.rank`,
            entityId: assignment.id,
            message: `Assignment '${assignment.id}' for tier profile '${profile.id}' is missing a 'rank' tier ID.`,
          });
        } else {
          const tierExists = profile.tiers?.some((t) => t.id === assignment.rank);
          if (!tierExists) {
            errors.push({
              level: 'error',
              code: 'INVALID_TIER_VALUE',
              path: `${aPath}.rank`,
              entityId: assignment.id,
              message: `Tier rank '${assignment.rank}' does not exist in profile '${profile.id}'. Valid tiers: ${profile.tiers?.map((t) => t.id).join(', ')}.`,
            });
          }
        }
      } else if (profile.type === 'ordered') {
        if (assignment.order === undefined || assignment.order === null || typeof assignment.order !== 'number') {
          errors.push({
            level: 'error',
            code: 'MISSING_ORDER_VALUE',
            path: `${aPath}.order`,
            entityId: assignment.id,
            message: `Assignment '${assignment.id}' for ordered profile '${profile.id}' requires an integer 'order'.`,
          });
        } else if (assignment.order < 1 || !Number.isInteger(assignment.order)) {
          errors.push({
            level: 'error',
            code: 'INVALID_ORDER_INTEGER',
            path: `${aPath}.order`,
            entityId: assignment.id,
            message: `Order position must be a positive integer (>= 1), got ${assignment.order}.`,
          });
        } else {
          if (!orderedPositionTracker.has(profile.id)) {
            orderedPositionTracker.set(profile.id, new Set());
          }
          const orderSet = orderedPositionTracker.get(profile.id)!;
          if (orderSet.has(assignment.order)) {
            warnings.push({
              level: 'warning',
              code: 'DUPLICATE_ORDER_POSITION',
              path: `${aPath}.order`,
              entityId: assignment.id,
              message: `Order position ${assignment.order} is assigned to multiple items in profile '${profile.id}'.`,
            });
          } else {
            orderSet.add(assignment.order);
          }
        }
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info,
    stats,
  };
}
