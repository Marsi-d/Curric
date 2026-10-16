/**
 * Canonical Data Architecture for Curriculum Mapping and Study Planning.
 *
 * Design Principles:
 * 1. Normalized Hierarchy: Subject -> Grade/Category (CurriculumGroup) -> Unit -> Topic -> Subtopic.
 * 2. Independent Ranking Layer: Rankings reference items by stable ID without mutating canonical location.
 * 3. Stable IDs: Independent of display labels, supporting renames without breaking relationships.
 * 4. Dual Structure Support: Academic Grade-based hierarchy + Flexible Aptitude/Modular hierarchy.
 * 5. Multi-Profile Ranking: Supports Tier-based (S/A/B/C/D) and Ordered (1, 2, 3...) ranking independently.
 * 6. Isolated Study Metadata: Mastery, difficulty, and review records are distinct from ranking prioritization.
 * 7. AI Extraction Resilience: Tolerates missing optional fields while upholding strong data integrity.
 */

export const CURRENT_SCHEMA_VERSION = 1 as const;

/**
 * Provenance / AI extraction tracking information.
 * Preserves the source context without enforcing artificial constraints.
 */
export interface SourceInfo {
  /** Source file, textbook title, or document identifier */
  fileOrBook?: string;
  /** Specific page number, range, or section index in source */
  page?: number | string;
  /** Original chapter number, title, or syllabus section */
  chapterOrUnit?: string;
  /** Raw notes or snippets generated during AI syllabus parsing */
  extractionNotes?: string;
  /** Confidence score between 0.0 and 1.0 if provided by extractor */
  confidence?: number;
}

/**
 * Optional study progress and metacognitive metadata.
 * Note: These fields are intentionally SEPARATED from ranking priority.
 */
export interface StudyMetadata {
  /** User's self-assessed mastery level */
  mastery?: 'novice' | 'learning' | 'proficient' | 'mastered' | string;
  /** Perceived topic difficulty */
  difficulty?: 'easy' | 'medium' | 'hard' | 'extreme' | string;
  /** Academic/exam syllabus weight or importance */
  importance?: 'low' | 'medium' | 'high' | 'critical' | string;
  /** Estimated study time in minutes */
  estimatedStudyMinutes?: number;
  /** Current learning status */
  status?: 'not_started' | 'in_progress' | 'completed' | 'on_hold' | string;
  /** Personal learning or study notes */
  notes?: string;
  /** Custom categorization tags (e.g. ["formula-heavy", "theory", "calc-required"]) */
  tags?: string[];
  /** ISO date string of last review */
  lastReviewedAt?: string;
  /** ISO date string of target next review */
  nextReviewDate?: string;
  /** Count of completed review sessions */
  reviewHistoryCount?: number;
}

/**
 * Subtopic - Lowest standard hierarchical curriculum node.
 */
export interface Subtopic {
  /** Unique permanent ID (e.g., 'math-g09-u01-t01-s01') */
  id: string;
  /** Display title */
  name: string;
  /** Display/sequence order within parent topic */
  order?: number;
  /** Detailed description or syllabus objective */
  description?: string;
  /** IDs of prerequisite topics or subtopics */
  prerequisites?: string[];
  /** Textbook or extraction provenance */
  source?: SourceInfo;
  /** Optional personal study progress metrics */
  studyMetadata?: StudyMetadata;
  /** Extensible key-value pairs to avoid discarding unknown AI fields */
  metadata?: Record<string, unknown>;
}

/**
 * Topic - Primary study concept entity.
 * Topics are the main unit for ranking, scheduling, and prerequisite mapping.
 */
export interface Topic {
  /** Unique permanent ID (e.g., 'math-g10-u03-t04') */
  id: string;
  /** Display title (e.g., 'Quadratic Equations') */
  name: string;
  /** Display/sequence order within parent unit or group */
  order?: number;
  /** Detailed concept overview or syllabus syllabus description */
  description?: string;
  /** Child subtopics (can be empty if curriculum doesn't specify sub-levels) */
  subtopics: Subtopic[];
  /**
   * IDs of prerequisite topics or subtopics.
   * Can reference any item across grades or subjects (e.g., Physics depending on Math).
   */
  prerequisites?: string[];
  /** Textbook or extraction provenance */
  source?: SourceInfo;
  /** Optional personal study progress metrics */
  studyMetadata?: StudyMetadata;
  /** Extensible key-value pairs to avoid discarding unknown AI fields */
  metadata?: Record<string, unknown>;
}

/**
 * Unit - Conceptual grouping of topics (e.g., "Unit 1: Algebra & Functions").
 */
export interface Unit {
  /** Unique permanent ID (e.g., 'math-g10-u03') */
  id: string;
  /** Display title */
  name: string;
  /** Unit index or sequence order */
  order?: number;
  /** Unit description or overarching objectives */
  description?: string;
  /** Topics contained in this unit */
  topics: Topic[];
  /** Textbook or extraction provenance */
  source?: SourceInfo;
  /** Optional personal study progress metrics */
  studyMetadata?: StudyMetadata;
  /** Extensible key-value pairs to avoid discarding unknown AI fields */
  metadata?: Record<string, unknown>;
}

/**
 * Group Type discriminator.
 * Allows academic subjects to use 'grade', and Aptitude or specialized courses
 * to use 'category', 'module', or 'domain' without forced conventions.
 */
export type CurriculumGroupType = 'grade' | 'category' | 'module' | 'domain' | 'general';

/**
 * CurriculumGroup - Represents either a Grade (e.g., Grade 9) or an Aptitude Category
 * (e.g., Quantitative Reasoning).
 *
 * Flexibility note: While typical academic grades contain units, certain modular
 * categories can either contain units OR contain topics directly.
 */
export interface CurriculumGroup {
  /** Unique permanent ID (e.g., 'math-g09' or 'apt-quant') */
  id: string;
  /** Display title (e.g., 'Grade 9' or 'Quantitative Reasoning') */
  name: string;
  /** Semantic type of this group */
  type: CurriculumGroupType;
  /** Numeric grade level (e.g., 9, 10, 11, 12) if applicable */
  gradeLevel?: number;
  /** Sequence order within the subject */
  order?: number;
  /** Short identifier or abbreviation (e.g., 'G9', 'QR') */
  code?: string;
  /** Description or scope */
  description?: string;
  /** Units contained within this group */
  units: Unit[];
  /**
   * Direct topics when an intermediate "Unit" level is unnatural (common in Aptitude).
   * Either units or direct topics (or both) may be populated.
   */
  directTopics?: Topic[];
  /** Textbook or extraction provenance */
  source?: SourceInfo;
  /** Extensible key-value pairs to avoid discarding unknown AI fields */
  metadata?: Record<string, unknown>;
}

/**
 * Subject Type classification.
 */
export type SubjectType = 'academic' | 'aptitude' | 'vocational' | 'custom';

/**
 * Subject - Top-level academic or aptitude branch.
 * Acts as the conceptual top-level folder (e.g. Mathematics, Physics, Aptitude).
 */
export interface Subject {
  /** Unique permanent ID (e.g., 'math', 'physics', 'aptitude') */
  id: string;
  /** Display title */
  name: string;
  /** Short name (e.g. 'MATH') */
  shortName?: string;
  /** Subject code or number (e.g., '101', 'PHY-SEC') */
  code?: string;
  /** Classification of the subject */
  type?: SubjectType;
  /** Subject description */
  description?: string;
  /** Child curriculum groups (Grades for academic subjects, Categories for Aptitude) */
  groups: CurriculumGroup[];
  /** Extensible key-value pairs to avoid discarding unknown AI fields */
  metadata?: Record<string, unknown>;
}

/**
 * Individual tier definition inside a Tier-based Ranking Profile.
 */
export interface RankingTier {
  /** Unique tier ID within the profile (e.g., 's', 'a', 'b', 'c', 'd', 'high', 'low') */
  id: string;
  /** Display label (e.g., 'S-Tier', 'Critical Focus', 'A') */
  label: string;
  /** Numeric rank order (1 = highest priority, 2 = next, etc.) */
  order: number;
  /** Optional hex or semantic color token for UI rendering */
  color?: string;
  /** Description or criteria for items assigned to this tier */
  description?: string;
}

/**
 * Ranking Profile Type.
 * - 'tier': Topics are grouped into defined tiers (e.g. S, A, B, C, D; multiple topics per tier).
 * - 'ordered': Topics are ranked in an absolute sequence (1, 2, 3...; one topic per position).
 */
export type RankingProfileType = 'tier' | 'ordered';

/**
 * Scope of a ranking profile.
 * - 'all_subjects': Mixed ranking spanning multiple subjects.
 * - 'subject_specific': Restricted to topics within a single subject.
 * - 'custom': Arbitrary or filter-driven topic subset.
 */
export type RankingProfileScope = 'all_subjects' | 'subject_specific' | 'custom';

/**
 * RankingProfile - Defines an independent ranking criteria / priority system.
 * Multiple profiles can exist simultaneously (e.g., Entrance Exam Priority vs Personal Difficulty).
 */
export interface RankingProfile {
  /** Unique permanent profile ID (e.g., 'exam-priority', 'math-focus', 'study-order') */
  id: string;
  /** Display title of this ranking profile */
  name: string;
  /** Type of ranking system */
  type: RankingProfileType;
  /** Scope of ranking */
  scope: RankingProfileScope;
  /** If subject-specific, the target subject ID (e.g., 'math') */
  targetSubjectId?: string;
  /** Purpose or description of this ranking */
  description?: string;
  /**
   * Defined tiers when type === 'tier'.
   * Required for tier profiles, empty or omitted for ordered profiles.
   */
  tiers?: RankingTier[];
  /** Extensible metadata */
  metadata?: Record<string, unknown>;
}

/**
 * RankingAssignment - Associates a curriculum item (Topic or Subtopic) with a rank.
 *
 * CRITICAL ARCHITECTURAL GUARANTEE:
 * Does NOT copy or move the topic. It references the item by stable ID.
 */
export interface RankingAssignment {
  /** Unique permanent assignment ID (e.g., 'ra-exam-math-g10-u03-t04') */
  id: string;
  /** ID of the RankingProfile this assignment belongs to */
  rankingProfileId: string;
  /** Stable ID of the curriculum item (Topic or Subtopic) being ranked */
  itemId: string;
  /**
   * Assigned tier ID (e.g., 's', 'a', 'high') when profile type === 'tier'.
   */
  rank?: string;
  /**
   * Absolute integer position (1, 2, 3...) when profile type === 'ordered'.
   */
  order?: number;
  /** Contextual rationale or notes for this ranking */
  notes?: string;
  /** ISO timestamp when this assignment was last modified */
  updatedAt?: string;
  /** Extensible metadata */
  metadata?: Record<string, unknown>;
}

/**
 * CurriculumDocument - Canonical Root Document.
 * Top-level container representing the complete curriculum, its subjects,
 * and all decoupled ranking profiles & assignments.
 */
export interface CurriculumDocument {
  /** Schema version number for backwards compatibility and forward migrations */
  schemaVersion: number;
  /** Unique document identifier */
  id: string;
  /** Title of this curriculum or study project (e.g. 'National Syllabus 2026') */
  title: string;
  /** Optional summary or description */
  description?: string;
  /** ISO timestamp when created */
  createdAt: string;
  /** ISO timestamp when last updated */
  updatedAt: string;
  /**
   * Canonical curriculum hierarchy:
   * Subject -> Grade/Category -> Unit -> Topic -> Subtopic
   */
  subjects: Subject[];
  /**
   * Decoupled ranking profiles (e.g., "Entrance Exam Priority", "Personal Difficulty")
   */
  rankingProfiles: RankingProfile[];
  /**
   * Normalized ranking assignments referencing topic/subtopic IDs
   */
  rankingAssignments: RankingAssignment[];
  /** Top-level project metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Flattened row representation for CSV / spreadsheet interoperability.
 * Contains explicit parent pointers to ensure 100% loss-free reconstruction.
 */
export interface FlatCurriculumRow {
  entityType: 'subject' | 'group' | 'unit' | 'topic' | 'subtopic';
  entityId: string;
  parentId: string;
  subjectId: string;
  subjectName: string;
  groupId: string;
  groupName: string;
  groupType: string;
  unitId: string;
  unitName: string;
  topicId: string;
  topicName: string;
  subtopicId: string;
  subtopicName: string;
  name: string;
  order: string | number;
  description: string;
  prerequisites: string; // Semicolon or comma separated IDs
  sourceFileOrBook: string;
  sourcePage: string;
  sourceChapter: string;
  studyDifficulty: string;
  studyEstimatedMinutes: string | number;
  studyTags: string; // Semicolon separated
  customMetadataJson: string;
}

/**
 * Flattened ranking assignment row for CSV export/import.
 */
export interface FlatRankingRow {
  assignmentId: string;
  rankingProfileId: string;
  profileName: string;
  itemId: string;
  itemName: string;
  subjectId: string;
  rankTierId: string;
  orderedPosition: string | number;
  notes: string;
  updatedAt: string;
}
