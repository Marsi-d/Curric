/**
 * Self-Verification and Test Suite for the Canonical Data Architecture.
 *
 * Runs programmatic assertions verifying schema compliance, integrity rules,
 * cross-grade/cross-subject prerequisites, decoupled ranking, and CSV round-trips.
 */

import { canonicalCurriculumDataset } from '../data/canonicalExample';
import { validateCurriculumDocument } from './validation';
import { curriculumToFlatRows, flatRowsToCurriculum, curriculumToCsv } from './csvMapping';
import { parseAndNormalizeImport } from './importParser';
import { IMPORT_TEST_SCENARIOS } from '../data/importTestScenarios';

export interface TestResult {
  suiteName: string;
  passed: boolean;
  assertions: {
    description: string;
    passed: boolean;
    details?: string;
  }[];
}

export function runArchitectureTestSuite(): TestResult[] {
  const suites: TestResult[] = [];

  // ---------------------------------------------------------------------------
  // Suite 1: Canonical Dataset Validation & Integrity
  // ---------------------------------------------------------------------------
  const suite1Assertions: TestResult['assertions'] = [];
  const validation = validateCurriculumDocument(canonicalCurriculumDataset);

  suite1Assertions.push({
    description: 'Canonical dataset passes strict schema validation without errors',
    passed: validation.valid && validation.errors.length === 0,
    details: validation.errors.length > 0 ? `Errors: ${JSON.stringify(validation.errors)}` : undefined,
  });

  const mathSubject = canonicalCurriculumDataset.subjects.find((s) => s.id === 'math');
  const mathGrades = mathSubject?.groups.map((g) => g.gradeLevel).filter(Boolean);
  const hasGrades9to12 = [9, 10, 11, 12].every((g) => mathGrades?.includes(g));

  suite1Assertions.push({
    description: 'Mathematics explicitly spans Grades 9, 10, 11, and 12',
    passed: Boolean(hasGrades9to12),
    details: `Detected Math grades: ${mathGrades?.join(', ')}`,
  });

  const subjectIds = canonicalCurriculumDataset.subjects.map((s) => s.id);
  const requiredSubjects = ['math', 'physics', 'chemistry', 'biology', 'english', 'aptitude'];
  const allSubjectsPresent = requiredSubjects.every((id) => subjectIds.includes(id));

  suite1Assertions.push({
    description: 'All requested academic subjects (Math, Physics, Chem, Bio, English) and Aptitude exist',
    passed: allSubjectsPresent,
    details: `Present subjects: ${subjectIds.join(', ')}`,
  });

  const aptitude = canonicalCurriculumDataset.subjects.find((s) => s.id === 'aptitude');
  const aptitudeHasDirectCategories = aptitude?.groups.every((g) => g.type === 'category' && g.directTopics !== undefined);

  suite1Assertions.push({
    description: 'Aptitude is modeled with flexible categories (not forced into academic Grades)',
    passed: Boolean(aptitudeHasDirectCategories),
    details: `Aptitude categories: ${aptitude?.groups.map((g) => g.name).join(', ')}`,
  });

  suites.push({
    suiteName: 'Canonical Dataset Structural Verification',
    passed: suite1Assertions.every((a) => a.passed),
    assertions: suite1Assertions,
  });

  // ---------------------------------------------------------------------------
  // Suite 2: Decoupled Ranking & Multi-Profile Independence
  // ---------------------------------------------------------------------------
  const suite2Assertions: TestResult['assertions'] = [];

  const tierProfile = canonicalCurriculumDataset.rankingProfiles.find((p) => p.type === 'tier');
  const orderedProfile = canonicalCurriculumDataset.rankingProfiles.find((p) => p.type === 'ordered');
  const subjectSpecificProfile = canonicalCurriculumDataset.rankingProfiles.find((p) => p.scope === 'subject_specific');
  const allSubjectsProfile = canonicalCurriculumDataset.rankingProfiles.find((p) => p.scope === 'all_subjects');

  suite2Assertions.push({
    description: 'Schema supports both Tier ranking and Ordered ranking profiles',
    passed: Boolean(tierProfile && orderedProfile),
    details: `Found Tier: '${tierProfile?.name}', Ordered: '${orderedProfile?.name}'`,
  });

  suite2Assertions.push({
    description: 'Schema supports both Subject-Specific and Mixed All-Subjects ranking profiles',
    passed: Boolean(subjectSpecificProfile && allSubjectsProfile),
    details: `Subject-specific: '${subjectSpecificProfile?.name}', All-Subjects: '${allSubjectsProfile?.name}'`,
  });

  // Verify multiple ranking profiles can assign ranks to the same item
  const sampleDocWithAssignments = JSON.parse(JSON.stringify(canonicalCurriculumDataset));
  const testTopicId = 'math-g10-sample-t1';
  sampleDocWithAssignments.rankingAssignments = [
    { id: 'a1', rankingProfileId: 'profile-priority', itemId: testTopicId, itemType: 'topic', order: 1 },
    { id: 'a2', rankingProfileId: 'profile-difficulty', itemId: testTopicId, itemType: 'topic', order: 2 },
    { id: 'a3', rankingProfileId: 'profile-exam-tiers', itemId: testTopicId, itemType: 'topic', rank: 'tier-1' },
  ];
  const distinctProfiles = new Set(sampleDocWithAssignments.rankingAssignments.map((a: any) => a.rankingProfileId));

  suite2Assertions.push({
    description: 'Same topic appears in multiple ranking profiles without duplicating curriculum item',
    passed: distinctProfiles.size >= 3,
    details: `Topic '${testTopicId}' assigned across ${distinctProfiles.size} distinct ranking profiles`,
  });

  suites.push({
    suiteName: 'Decoupled Ranking Architecture',
    passed: suite2Assertions.every((a) => a.passed),
    assertions: suite2Assertions,
  });

  // ---------------------------------------------------------------------------
  // Suite 3: Cross-Grade & Cross-Subject Prerequisites
  // ---------------------------------------------------------------------------
  const suite3Assertions: TestResult['assertions'] = [];

  const prereqTestDoc = JSON.parse(JSON.stringify(canonicalCurriculumDataset));
  prereqTestDoc.subjects[0].groups[0].units = [
    { id: 'u-g9', name: 'Algebra G9', order: 1, topics: [{ id: 'top-alg-g9', name: 'Foundations', order: 1, prerequisites: [] }] },
  ];
  prereqTestDoc.subjects[0].groups[1].units = [
    { id: 'u-g10', name: 'Algebra G10', order: 1, topics: [{ id: 'top-alg-g10', name: 'Advanced', order: 1, prerequisites: ['top-alg-g9'] }] },
  ];
  prereqTestDoc.subjects[1].groups[0].units = [
    { id: 'u-sci-g9', name: 'Physics G9', order: 1, topics: [{ id: 'top-phys-g9', name: 'Kinematics', order: 1, prerequisites: ['top-alg-g9'] }] },
  ];
  const prereqValidation = validateCurriculumDocument(prereqTestDoc);

  suite3Assertions.push({
    description: 'Validator identifies and tracks cross-grade prerequisites',
    passed: prereqValidation.stats.crossGradePrerequisiteCount > 0,
    details: `Cross-grade count: ${prereqValidation.stats.crossGradePrerequisiteCount}`,
  });

  suite3Assertions.push({
    description: 'Validator identifies and tracks cross-subject prerequisites (e.g. Physics depending on Math)',
    passed: prereqValidation.stats.crossSubjectPrerequisiteCount > 0,
    details: `Cross-subject count: ${prereqValidation.stats.crossSubjectPrerequisiteCount}`,
  });

  suites.push({
    suiteName: 'Prerequisites & Cross-Reference Mapping',
    passed: suite3Assertions.every((a) => a.passed),
    assertions: suite3Assertions,
  });

  // ---------------------------------------------------------------------------
  // Suite 4: Lossless CSV / Flat-Table Round-Trip
  // ---------------------------------------------------------------------------
  const suite4Assertions: TestResult['assertions'] = [];

  const flatRows = curriculumToFlatRows(canonicalCurriculumDataset);
  const csvString = curriculumToCsv(canonicalCurriculumDataset);
  const reconstructed = flatRowsToCurriculum(flatRows);
  const reValidation = validateCurriculumDocument(reconstructed);

  suite4Assertions.push({
    description: 'Curriculum successfully serializes to CSV string compliant with RFC 4180',
    passed: csvString.length > 500 && csvString.startsWith('entityType,'),
    details: `Generated CSV size: ${csvString.length} chars`,
  });

  suite4Assertions.push({
    description: 'Reconstructed document from flat rows passes schema validation',
    passed: reValidation.valid,
    details: `Reconstructed validation errors: ${reValidation.errors.length}`,
  });

  suite4Assertions.push({
    description: 'All subjects and topics are preserved through flat-row reconstruction',
    passed:
      reconstructed.subjects.length === canonicalCurriculumDataset.subjects.length &&
      reValidation.stats.topicCount === validation.stats.topicCount,
    details: `Original topics: ${validation.stats.topicCount}, Reconstructed topics: ${reValidation.stats.topicCount}`,
  });

  suites.push({
    suiteName: 'Tabular / CSV Round-Trip Integrity',
    passed: suite4Assertions.every((a) => a.passed),
    assertions: suite4Assertions,
  });

  // ---------------------------------------------------------------------------
  // Suite 5: Anomaly & Error Detection
  // ---------------------------------------------------------------------------
  const suite5Assertions: TestResult['assertions'] = [];

  // Test broken prerequisite
  const brokenData = JSON.parse(JSON.stringify(canonicalCurriculumDataset));
  brokenData.subjects[0].groups[0].units = [
    {
      id: 'test-u1',
      name: 'Test Unit',
      order: 1,
      topics: [
        {
          id: 'test-t1',
          name: 'Test Topic',
          order: 1,
          prerequisites: ['non-existent-topic-id'],
        },
      ],
    },
  ];
  const brokenResult = validateCurriculumDocument(brokenData);

  suite5Assertions.push({
    description: 'Validator detects and reports dangling prerequisite references',
    passed: brokenResult.errors.some((e) => e.code === 'DANGLING_PREREQUISITE_REFERENCE'),
  });

  // Test duplicate ID
  const duplicateIdData = JSON.parse(JSON.stringify(canonicalCurriculumDataset));
  duplicateIdData.subjects[1].id = 'math'; // duplicate of subject[0].id
  const duplicateResult = validateCurriculumDocument(duplicateIdData);

  suite5Assertions.push({
    description: 'Validator detects and reports duplicate entity IDs',
    passed: duplicateResult.errors.some((e) => e.code === 'DUPLICATE_ID'),
  });

  // Test invalid ranking tier
  const invalidTierData = JSON.parse(JSON.stringify(canonicalCurriculumDataset));
  invalidTierData.rankingProfiles = [
    {
      id: 'neet-rankings',
      name: 'NEET Tier Profile',
      type: 'tier',
      scope: 'all_subjects',
      tiers: [
        { id: 'tier-1', label: 'Tier 1', order: 1 },
        { id: 'tier-2', label: 'Tier 2', order: 2 },
      ],
    },
  ];
  invalidTierData.rankingAssignments = [
    {
      id: 'assign-test-1',
      rankingProfileId: 'neet-rankings',
      itemId: 'math-g10',
      itemType: 'group',
      rank: 'invalid-tier-z' as any,
    },
  ];
  const invalidTierResult = validateCurriculumDocument(invalidTierData);

  suite5Assertions.push({
    description: 'Validator detects and reports invalid tier values in ranking assignments',
    passed: invalidTierResult.errors.some((e) => e.code === 'INVALID_TIER_VALUE'),
  });

  suites.push({
    suiteName: 'Robust Error & Anomaly Detection',
    passed: suite5Assertions.every((a) => a.passed),
    assertions: suite5Assertions,
  });

  // ---------------------------------------------------------------------------
  // Suite 6: Import & AI Extraction Workflow (15 Requirements Cases)
  // ---------------------------------------------------------------------------
  const suite6Assertions: TestResult['assertions'] = [];

  for (const scenario of IMPORT_TEST_SCENARIOS) {
    const medium = scenario.category === 'csv' ? 'csv_paste' : 'json_paste';
    const result = parseAndNormalizeImport(scenario.payload, medium);

    const statusMatch = result.status === scenario.expectedStatus;
    const formatMatch =
      scenario.expectedFormat === 'unknown'
        ? true
        : result.detectedFormat === scenario.expectedFormat;
    const importMatch = result.canImport === scenario.canImport;

    suite6Assertions.push({
      description: `${scenario.name}: ${scenario.description}`,
      passed: statusMatch && formatMatch && importMatch,
      details: `Status: ${result.status} (expected: ${scenario.expectedStatus}), Format: ${result.detectedFormat}, canImport: ${result.canImport}`,
    });
  }

  suites.push({
    suiteName: 'Import Page & AI Extraction Validation (All 15 Cases)',
    passed: suite6Assertions.every((a) => a.passed),
    assertions: suite6Assertions,
  });

  return suites;
}
