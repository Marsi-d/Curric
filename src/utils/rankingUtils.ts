import {
  CurriculumDocument,
  RankingProfile,
  RankingAssignment,
  RankingTier,
  Topic,
  SubjectType,
  Unit,
} from '../types/curriculum';

export interface TopicWithContext {
  topic: Topic;
  topicId: string;
  topicName: string;
  topicDescription?: string;
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  subjectType?: SubjectType;
  groupId: string;
  groupName: string;
  groupType: string;
  unitId?: string;
  unitName?: string;
  path: string;
}

export interface RankedTopicItem {
  assignment: RankingAssignment;
  topicContext: TopicWithContext;
  order: number;
  notes?: string;
}

export const DEFAULT_TIERS: RankingTier[] = [
  { id: 'tier-s', label: 'S', order: 1, color: '#ff7f7f' },
  { id: 'tier-a', label: 'A', order: 2, color: '#ffbf7f' },
  { id: 'tier-b', label: 'B', order: 3, color: '#ffdf7f' },
  { id: 'tier-c', label: 'C', order: 4, color: '#ffff7f' },
  { id: 'tier-d', label: 'D', order: 5, color: '#bfff7f' },
  { id: 'tier-f', label: 'F', order: 6, color: '#7fbfff' },
];

export const TIER_COLOR_PALETTE = [
  '#ff7f7f', // Red / Salmon (Classic S)
  '#ffbf7f', // Orange (Classic A)
  '#ffdf7f', // Amber / Warm Yellow (Classic B)
  '#ffff7f', // Yellow (Classic C)
  '#bfff7f', // Lime / Light Green (Classic D)
  '#7fbfff', // Light Blue (Classic F)
  '#bf7fff', // Violet / Purple
  '#ff7fbf', // Pink / Magenta
  '#38bdf8', // Sky Blue
  '#34d399', // Emerald Green
  '#f43f5e', // Rose
  '#a855f7', // Purple
  '#94a3b8', // Slate / Gray
];

export interface TierPreset {
  id: string;
  name: string;
  description: string;
  tiers: { label: string; color: string }[];
}

export const TIER_PRESETS: TierPreset[] = [
  {
    id: 'preset-classic',
    name: 'Classic Tier List (S, A, B, C, D, F)',
    description: 'Standard tier-maker grading scheme from S to F',
    tiers: [
      { label: 'S', color: '#ff7f7f' },
      { label: 'A', color: '#ffbf7f' },
      { label: 'B', color: '#ffdf7f' },
      { label: 'C', color: '#ffff7f' },
      { label: 'D', color: '#bfff7f' },
      { label: 'F', color: '#7fbfff' },
    ],
  },
  {
    id: 'preset-understanding',
    name: 'Comprehension & Understanding',
    description: 'Mastered to unfamiliar personal learning levels',
    tiers: [
      { label: 'Mastered', color: '#34d399' },
      { label: 'I understand it', color: '#38bdf8' },
      { label: 'I know it but can hardly understand it', color: '#fbbf24' },
      { label: "I don't know it", color: '#f87171' },
    ],
  },
  {
    id: 'preset-exam-priority',
    name: 'Exam Weight & Priority',
    description: 'High-yield to low-yield study allocation',
    tiers: [
      { label: 'Must Know (Critical)', color: '#ef4444' },
      { label: 'High Yield', color: '#f97316' },
      { label: 'Moderate Yield', color: '#eab308' },
      { label: 'Low Yield / Supplementary', color: '#94a3b8' },
    ],
  },
  {
    id: 'preset-difficulty',
    name: 'Personal Difficulty',
    description: 'Most challenging concepts down to easiest',
    tiers: [
      { label: 'Extremely Hard', color: '#dc2626' },
      { label: 'Difficult', color: '#ea580c' },
      { label: 'Moderate', color: '#ca8a04' },
      { label: 'Easy / Intuitive', color: '#16a34a' },
    ],
  },
];

export const DEFAULT_RANKING_PROFILES: RankingProfile[] = [
  {
    id: 'profile-tier-list',
    name: 'Topic Tier List',
    type: 'tier',
    scope: 'all_subjects',
    description: 'Tier-list editor for ranking topics by understanding, difficulty, or priority.',
    tiers: DEFAULT_TIERS,
  },
  {
    id: 'profile-priority',
    name: 'Study Priority',
    type: 'ordered',
    scope: 'all_subjects',
    description: 'Topics prioritized by study urgency, revision order, or exam weight.',
  },
  {
    id: 'profile-difficulty',
    name: 'Personal Difficulty',
    type: 'ordered',
    scope: 'all_subjects',
    description: 'Topics ordered from most challenging to easiest based on personal understanding.',
  },
];

/**
 * Traverses the curriculum document to extract all topics with full ancestral context.
 * The original document hierarchy remains completely untouched.
 * Deduplicates by topicId to guarantee unique entries across all views.
 */
export function getAllTopicsWithContext(doc: CurriculumDocument): TopicWithContext[] {
  const result: TopicWithContext[] = [];
  const seenTopicIds = new Set<string>();

  if (!doc || !Array.isArray(doc.subjects)) return result;

  for (const subject of doc.subjects) {
    if (!Array.isArray(subject.groups)) continue;

    for (const group of subject.groups) {
      // Topics inside units
      if (Array.isArray(group.units)) {
        for (const unit of group.units) {
          if (Array.isArray(unit.topics)) {
            for (const topic of unit.topics) {
              if (topic && topic.id && !seenTopicIds.has(topic.id)) {
                seenTopicIds.add(topic.id);
                result.push({
                  topic,
                  topicId: topic.id,
                  topicName: topic.name,
                  topicDescription: topic.description,
                  subjectId: subject.id,
                  subjectName: subject.name,
                  subjectCode: subject.code,
                  subjectType: subject.type,
                  groupId: group.id,
                  groupName: group.name,
                  groupType: group.type,
                  unitId: unit.id,
                  unitName: unit.name,
                  path: `${subject.name} › ${group.name} › ${unit.name}`,
                });
              }
            }
          }
        }
      }

      // Direct topics inside groups (e.g. modular or aptitude)
      if (Array.isArray(group.directTopics)) {
        for (const topic of group.directTopics) {
          if (topic && topic.id && !seenTopicIds.has(topic.id)) {
            seenTopicIds.add(topic.id);
            result.push({
              topic,
              topicId: topic.id,
              topicName: topic.name,
              topicDescription: topic.description,
              subjectId: subject.id,
              subjectName: subject.name,
              subjectCode: subject.code,
              subjectType: subject.type,
              groupId: group.id,
              groupName: group.name,
              groupType: group.type,
              path: `${subject.name} › ${group.name}`,
            });
          }
        }
      }
    }
  }

  return result;
}

/**
 * Returns all ranked topics for a given profile, sorted by order ascending.
 * Strictly deduplicates so each topic ID appears at most once in the ranking.
 */
export function getRankedTopics(
  profileId: string,
  assignments: RankingAssignment[],
  allTopics: TopicWithContext[]
): RankedTopicItem[] {
  const topicMap = new Map<string, TopicWithContext>();
  for (const t of allTopics) {
    if (!topicMap.has(t.topicId)) {
      topicMap.set(t.topicId, t);
    }
  }

  const profileAssignments = assignments
    .filter((a) => a.rankingProfileId === profileId)
    .sort((a, b) => (a.order ?? 999999) - (b.order ?? 999999));

  const rankedItems: RankedTopicItem[] = [];
  const seenTopicIds = new Set<string>();

  profileAssignments.forEach((assignment) => {
    if (!assignment.itemId || seenTopicIds.has(assignment.itemId)) {
      return;
    }
    const topicContext = topicMap.get(assignment.itemId);
    if (topicContext) {
      seenTopicIds.add(assignment.itemId);
      rankedItems.push({
        assignment,
        topicContext,
        order: rankedItems.length + 1,
        notes: assignment.notes,
      });
    }
  });

  return rankedItems;
}

/**
 * Returns all topics that are unranked in the specified profile.
 * Strictly guarantees unique topic items.
 */
export function getUnrankedTopics(
  profileId: string,
  assignments: RankingAssignment[],
  allTopics: TopicWithContext[],
  isTierProfile = false
): TopicWithContext[] {
  const rankedItemIds = new Set(
    assignments
      .filter((a) => a.rankingProfileId === profileId && (isTierProfile ? !!a.rank : true))
      .map((a) => a.itemId)
  );

  const seenIds = new Set<string>();
  const unranked: TopicWithContext[] = [];

  for (const t of allTopics) {
    if (!rankedItemIds.has(t.topicId) && !seenIds.has(t.topicId)) {
      seenIds.add(t.topicId);
      unranked.push(t);
    }
  }

  return unranked;
}

/**
 * Adds a topic to a ranking profile and normalizes orders (1-based).
 */
export function addTopicAssignment(
  assignments: RankingAssignment[],
  profileId: string,
  topicId: string,
  position?: number // 1-based index, or undefined to append to end
): RankingAssignment[] {
  // Check if already in ranking
  const existing = assignments.find(
    (a) => a.rankingProfileId === profileId && a.itemId === topicId
  );
  if (existing) {
    return assignments; // already ranked
  }

  const profileAssignments = assignments
    .filter((a) => a.rankingProfileId === profileId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const otherAssignments = assignments.filter(
    (a) => a.rankingProfileId !== profileId
  );

  const newAssignment: RankingAssignment = {
    id: `ra-${profileId}-${topicId}`,
    rankingProfileId: profileId,
    itemId: topicId,
    order: 1,
    updatedAt: new Date().toISOString(),
  };

  let reordered: RankingAssignment[];

  if (position !== undefined && position >= 1 && position <= profileAssignments.length) {
    // Insert at specific 1-based position
    const insertIdx = position - 1;
    profileAssignments.splice(insertIdx, 0, newAssignment);
    reordered = profileAssignments;
  } else {
    // Append to end
    reordered = [...profileAssignments, newAssignment];
  }

  // Renormalize orders
  const normalized = reordered.map((a, idx) => ({
    ...a,
    order: idx + 1,
  }));

  return [...otherAssignments, ...normalized];
}

/**
 * Removes a topic from a ranking profile and normalizes remaining orders.
 */
export function removeTopicAssignment(
  assignments: RankingAssignment[],
  profileId: string,
  topicId: string
): RankingAssignment[] {
  const otherAssignments = assignments.filter(
    (a) => a.rankingProfileId !== profileId
  );

  const profileAssignments = assignments
    .filter(
      (a) => a.rankingProfileId === profileId && a.itemId !== topicId
    )
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const normalized = profileAssignments.map((a, idx) => ({
    ...a,
    order: idx + 1,
  }));

  return [...otherAssignments, ...normalized];
}

/**
 * Moves a ranked topic up, down, to top, or to bottom.
 */
export function moveTopicAssignment(
  assignments: RankingAssignment[],
  profileId: string,
  topicId: string,
  direction: 'up' | 'down' | 'top' | 'bottom'
): RankingAssignment[] {
  const otherAssignments = assignments.filter(
    (a) => a.rankingProfileId !== profileId
  );

  const profileAssignments = assignments
    .filter((a) => a.rankingProfileId === profileId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const index = profileAssignments.findIndex((a) => a.itemId === topicId);
  if (index === -1) return assignments;

  const item = profileAssignments[index];

  if (direction === 'up' && index > 0) {
    profileAssignments[index] = profileAssignments[index - 1];
    profileAssignments[index - 1] = item;
  } else if (direction === 'down' && index < profileAssignments.length - 1) {
    profileAssignments[index] = profileAssignments[index + 1];
    profileAssignments[index + 1] = item;
  } else if (direction === 'top' && index > 0) {
    profileAssignments.splice(index, 1);
    profileAssignments.unshift(item);
  } else if (direction === 'bottom' && index < profileAssignments.length - 1) {
    profileAssignments.splice(index, 1);
    profileAssignments.push(item);
  }

  const normalized = profileAssignments.map((a, idx) => ({
    ...a,
    order: idx + 1,
    updatedAt: a.itemId === topicId ? new Date().toISOString() : a.updatedAt,
  }));

  return [...otherAssignments, ...normalized];
}

/**
 * Explicitly jumps a ranked topic to a specific 1-based order.
 */
export function setTopicOrder(
  assignments: RankingAssignment[],
  profileId: string,
  topicId: string,
  newOrder: number
): RankingAssignment[] {
  const otherAssignments = assignments.filter(
    (a) => a.rankingProfileId !== profileId
  );

  const profileAssignments = assignments
    .filter((a) => a.rankingProfileId === profileId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const currentIndex = profileAssignments.findIndex((a) => a.itemId === topicId);
  if (currentIndex === -1) return assignments;

  const [item] = profileAssignments.splice(currentIndex, 1);
  const targetIndex = Math.max(0, Math.min(newOrder - 1, profileAssignments.length));
  profileAssignments.splice(targetIndex, 0, item);

  const normalized = profileAssignments.map((a, idx) => ({
    ...a,
    order: idx + 1,
    updatedAt: a.itemId === topicId ? new Date().toISOString() : a.updatedAt,
  }));

  return [...otherAssignments, ...normalized];
}

/**
 * Updates contextual study notes on a topic assignment.
 */
export function updateAssignmentNotes(
  assignments: RankingAssignment[],
  profileId: string,
  topicId: string,
  notes: string
): RankingAssignment[] {
  return assignments.map((a) => {
    if (a.rankingProfileId === profileId && a.itemId === topicId) {
      return {
        ...a,
        notes,
        updatedAt: new Date().toISOString(),
      };
    }
    return a;
  });
}

/**
 * Clears all assignments for a specific ranking profile.
 */
export function clearProfileAssignments(
  assignments: RankingAssignment[],
  profileId: string
): RankingAssignment[] {
  return assignments.filter((a) => a.rankingProfileId !== profileId);
}

/**
 * Returns topics grouped by tier for a tier-based ranking profile.
 * Items in each tier are ordered by their assignment order ascending.
 */
export function getTopicsByTier(
  profileId: string,
  assignments: RankingAssignment[],
  allTopics: TopicWithContext[]
): Map<string, RankedTopicItem[]> {
  const topicMap = new Map<string, TopicWithContext>();
  for (const t of allTopics) {
    if (!topicMap.has(t.topicId)) {
      topicMap.set(t.topicId, t);
    }
  }

  const profileAssignments = (assignments || [])
    .filter((a) => a.rankingProfileId === profileId && !!a.rank)
    .sort((a, b) => (a.order ?? 999999) - (b.order ?? 999999));

  const result = new Map<string, RankedTopicItem[]>();
  const seenTopicIds = new Set<string>();

  profileAssignments.forEach((assignment) => {
    if (!assignment.itemId || seenTopicIds.has(assignment.itemId) || !assignment.rank) {
      return;
    }
    const topicContext = topicMap.get(assignment.itemId);
    if (topicContext) {
      seenTopicIds.add(assignment.itemId);
      const tierList = result.get(assignment.rank) || [];
      tierList.push({
        assignment,
        topicContext,
        order: tierList.length + 1,
        notes: assignment.notes,
      });
      result.set(assignment.rank, tierList);
    }
  });

  return result;
}

/**
 * Assigns or moves a topic to a specific tier in a profile.
 * Supports targetIndex insertion (e.g., dropping at a specific position in the tier).
 */
export function assignTopicToTier(
  assignments: RankingAssignment[],
  profileId: string,
  topicId: string,
  targetTierId: string,
  targetIndex?: number
): RankingAssignment[] {
  const currentList = assignments || [];

  // Filter out any other profile's assignments
  const otherAssignments = currentList.filter(
    (a) => a.rankingProfileId !== profileId
  );

  const profileAssignments = currentList.filter(
    (a) => a.rankingProfileId === profileId
  );

  const existingAssignment = profileAssignments.find((a) => a.itemId === topicId);

  // Target tier existing items (excluding the topic being moved)
  const targetTierItems = profileAssignments
    .filter((a) => a.rank === targetTierId && a.itemId !== topicId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const newAssignment: RankingAssignment = {
    id: existingAssignment?.id || `ra-${profileId}-${topicId}`,
    rankingProfileId: profileId,
    itemId: topicId,
    rank: targetTierId,
    notes: existingAssignment?.notes,
    order: 1,
    updatedAt: new Date().toISOString(),
  };

  if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= targetTierItems.length) {
    targetTierItems.splice(targetIndex, 0, newAssignment);
  } else {
    targetTierItems.push(newAssignment);
  }

  // Renormalize orders in the target tier
  const normalizedTarget = targetTierItems.map((a, idx) => ({
    ...a,
    order: idx + 1,
  }));

  // Re-normalize source tier if it was different
  let normalizedSource: RankingAssignment[] = [];
  if (existingAssignment?.rank && existingAssignment.rank !== targetTierId) {
    const sourceTierItems = profileAssignments
      .filter((a) => a.rank === existingAssignment.rank && a.itemId !== topicId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((a, idx) => ({ ...a, order: idx + 1 }));
    normalizedSource = sourceTierItems;
  }

  // Other tiers unchanged
  const otherTierItems = profileAssignments.filter(
    (a) =>
      a.itemId !== topicId &&
      a.rank !== targetTierId &&
      a.rank !== existingAssignment?.rank
  );

  return [
    ...otherAssignments,
    ...otherTierItems,
    ...normalizedSource,
    ...normalizedTarget,
  ];
}

/**
 * Reorders a topic within its tier.
 */
export function reorderTopicInTier(
  assignments: RankingAssignment[],
  profileId: string,
  tierId: string,
  topicId: string,
  targetIndex: number
): RankingAssignment[] {
  const currentList = assignments || [];
  const otherProfileAssignments = currentList.filter(
    (a) => a.rankingProfileId !== profileId
  );
  const profileAssignments = currentList.filter(
    (a) => a.rankingProfileId === profileId
  );

  const tierItems = profileAssignments
    .filter((a) => a.rank === tierId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const fromIndex = tierItems.findIndex((a) => a.itemId === topicId);
  if (fromIndex === -1) return currentList;

  const [movedItem] = tierItems.splice(fromIndex, 1);
  const safeTargetIndex = Math.max(0, Math.min(targetIndex, tierItems.length));
  tierItems.splice(safeTargetIndex, 0, movedItem);

  const normalizedTier = tierItems.map((a, idx) => ({
    ...a,
    order: idx + 1,
    updatedAt: a.itemId === topicId ? new Date().toISOString() : a.updatedAt,
  }));

  const nonTierItems = profileAssignments.filter((a) => a.rank !== tierId);

  return [...otherProfileAssignments, ...nonTierItems, ...normalizedTier];
}

/**
 * Removes a topic from its assigned tier (returns it to unranked pool).
 */
export function removeTopicFromTier(
  assignments: RankingAssignment[],
  profileId: string,
  topicId: string
): RankingAssignment[] {
  const currentList = assignments || [];
  const otherProfileAssignments = currentList.filter(
    (a) => a.rankingProfileId !== profileId
  );
  const profileAssignments = currentList.filter(
    (a) => a.rankingProfileId === profileId
  );

  const target = profileAssignments.find((a) => a.itemId === topicId);
  if (!target) return currentList;

  const remaining = profileAssignments.filter((a) => a.itemId !== topicId);

  // Renormalize orders in the tier the topic left
  if (target.rank) {
    const updated = remaining.map((a) => {
      if (a.rank === target.rank && (a.order ?? 0) > (target.order ?? 0)) {
        return { ...a, order: (a.order ?? 1) - 1 };
      }
      return a;
    });
    return [...otherProfileAssignments, ...updated];
  }

  return [...otherProfileAssignments, ...remaining];
}

/**
 * Clears all topic assignments from a specific tier.
 */
export function clearTierTopics(
  assignments: RankingAssignment[],
  profileId: string,
  tierId: string
): RankingAssignment[] {
  return (assignments || []).filter(
    (a) => !(a.rankingProfileId === profileId && a.rank === tierId)
  );
}

/**
 * Seeds starter units and topics across the core academic subjects
 * if the user has empty units in their curriculum.
 */
export function seedStarterTopics(doc: CurriculumDocument): CurriculumDocument {
  const sampleData: Record<
    string,
    { gradeId: string; unitName: string; topics: { name: string; desc: string }[] }[]
  > = {
    math: [
      {
        gradeId: 'math-g10',
        unitName: 'Unit 1: Algebra & Trigonometry',
        topics: [
          { name: 'Quadratic Equations & Roots', desc: 'Factorization, quadratic formula, and discriminant.' },
          { name: 'Trigonometric Ratios & Identities', desc: 'Sine, cosine, tangent and Pythagorean identities.' },
          { name: 'Coordinate Geometry & Straight Lines', desc: 'Distance formula, slopes, and linear equations.' },
        ],
      },
      {
        gradeId: 'math-g11',
        unitName: 'Unit 1: Calculus Foundations',
        topics: [
          { name: 'Limits & Continuity', desc: 'Epsilon-delta intuition, evaluating limits algebraically.' },
          { name: 'Derivatives & Power Rule', desc: 'Rate of change, tangents, and basic differentiation rules.' },
        ],
      },
    ],
    physics: [
      {
        gradeId: 'phys-g10',
        unitName: 'Unit 1: Optics & Waves',
        topics: [
          { name: 'Reflection & Refraction of Light', desc: 'Snell’s law, refractive index, and lenses.' },
          { name: 'Electric Current & Ohm’s Law', desc: 'Potential difference, resistance, and circuits.' },
        ],
      },
      {
        gradeId: 'phys-g11',
        unitName: 'Unit 1: Classical Mechanics',
        topics: [
          { name: "Newton's Laws of Motion", desc: 'Inertia, F=ma, action-reaction, and free-body diagrams.' },
          { name: 'Work, Energy & Power Theorem', desc: 'Kinetic & potential energy, mechanical work theorem.' },
          { name: 'Universal Law of Gravitation', desc: 'Gravitational field, orbital velocity, and Kepler’s laws.' },
        ],
      },
    ],
    chemistry: [
      {
        gradeId: 'chem-g10',
        unitName: 'Unit 1: Chemical Reactions',
        topics: [
          { name: 'Chemical Reactions & Equations', desc: 'Combination, decomposition, displacement, and redox.' },
          { name: 'Acids, Bases & pH Scale', desc: 'Indicators, neutralization, and salt formation.' },
        ],
      },
      {
        gradeId: 'chem-g11',
        unitName: 'Unit 1: Atomic & Molecular Structure',
        topics: [
          { name: 'Atomic Structure & Quantum Numbers', desc: 'Bohr model, orbitals, and electronic configurations.' },
          { name: 'Chemical Bonding & Hybridization', desc: 'Ionic, covalent bonds, VSEPR theory, and sp/sp2/sp3.' },
        ],
      },
    ],
    biology: [
      {
        gradeId: 'bio-g10',
        unitName: 'Unit 1: Life Processes',
        topics: [
          { name: 'Cellular Respiration & ATP Production', desc: 'Aerobic vs anaerobic pathways, glycolysis.' },
          { name: 'Genetics & Mendelian Inheritance', desc: 'Monohybrid crosses, dominant and recessive alleles.' },
        ],
      },
      {
        gradeId: 'bio-g11',
        unitName: 'Unit 1: Cell Biology',
        topics: [
          { name: 'Cell Membrane Structure & Transport', desc: 'Fluid mosaic model, active and passive transport.' },
          { name: 'Photosynthesis & Light Reactions', desc: 'Chloroplast anatomy, Calvin cycle, and chlorophyll.' },
        ],
      },
    ],
    english: [
      {
        gradeId: 'eng-g10',
        unitName: 'Unit 1: Literary Analysis',
        topics: [
          { name: 'Analytical & Persuasive Essay Writing', desc: 'Thesis formulation, evidence synthesis, and rhetorical flow.' },
          { name: 'Poetic Devices & Figurative Language', desc: 'Metaphor, simile, personification, and meter.' },
        ],
      },
    ],
  };

  const updatedSubjects = doc.subjects.map((sub) => {
    const config = sampleData[sub.id];
    if (!config) return sub;

    const updatedGroups = sub.groups.map((grp) => {
      const match = config.find((c) => c.gradeId === grp.id);
      if (!match) return grp;

      // If unit already exists with topics, keep it
      if (grp.units && grp.units.some((u) => u.topics && u.topics.length > 0)) {
        return grp;
      }

      const newUnit: Unit = {
        id: `unit-${grp.id}-sample`,
        name: match.unitName,
        order: 1,
        topics: match.topics.map((t, idx) => ({
          id: `top-${grp.id}-${idx + 1}`,
          name: t.name,
          description: t.desc,
          order: idx + 1,
          subtopics: [],
        })),
      };

      return {
        ...grp,
        units: [newUnit],
      };
    });

    return {
      ...sub,
      groups: updatedGroups,
    };
  });

  return {
    ...doc,
    subjects: updatedSubjects,
    updatedAt: new Date().toISOString(),
  };
}
