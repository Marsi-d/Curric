/**
 * Clean Canonical Dataset for Curriculum Mapping and Study Planning.
 *
 * Requirements:
 * 1. 5 Core Academic Subjects: Mathematics, Physics, Chemistry, Biology, English.
 * 2. Every academic subject has the full list of grade folders: Grade 9, Grade 10, Grade 11, Grade 12.
 * 3. Keep the grade folders but nothing under them (units: []).
 * 4. Aptitude subject is completely empty (groups: []).
 * 5. Independent, decoupled ranking profiles.
 */

import { CurriculumDocument, CURRENT_SCHEMA_VERSION } from '../types/curriculum';
import { DEFAULT_RANKING_PROFILES } from '../utils/rankingUtils';

export const canonicalCurriculumDataset: CurriculumDocument = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  id: 'curr-academic-2026',
  title: 'Curriculum',
  description: 'Academic curriculum and aptitude framework.',
  createdAt: '2026-09-20T00:00:00.000Z',
  updatedAt: new Date().toISOString(),

  subjects: [
    // 1. MATHEMATICS (Grades 9 to 12)
    {
      id: 'math',
      name: 'Mathematics',
      shortName: 'MATH',
      code: '101',
      type: 'academic',
      description: 'Mathematics curriculum across secondary grade levels.',
      groups: [
        { id: 'math-g09', name: 'Grade 9', type: 'grade', gradeLevel: 9, order: 1, units: [] },
        { id: 'math-g10', name: 'Grade 10', type: 'grade', gradeLevel: 10, order: 2, units: [] },
        { id: 'math-g11', name: 'Grade 11', type: 'grade', gradeLevel: 11, order: 3, units: [] },
        { id: 'math-g12', name: 'Grade 12', type: 'grade', gradeLevel: 12, order: 4, units: [] },
      ],
    },
    // 2. PHYSICS (Grades 9 to 12)
    {
      id: 'physics',
      name: 'Physics',
      shortName: 'PHYS',
      code: '102',
      type: 'academic',
      description: 'Physics curriculum across secondary grade levels.',
      groups: [
        { id: 'phys-g09', name: 'Grade 9', type: 'grade', gradeLevel: 9, order: 1, units: [] },
        { id: 'phys-g10', name: 'Grade 10', type: 'grade', gradeLevel: 10, order: 2, units: [] },
        { id: 'phys-g11', name: 'Grade 11', type: 'grade', gradeLevel: 11, order: 3, units: [] },
        { id: 'phys-g12', name: 'Grade 12', type: 'grade', gradeLevel: 12, order: 4, units: [] },
      ],
    },
    // 3. CHEMISTRY (Grades 9 to 12)
    {
      id: 'chemistry',
      name: 'Chemistry',
      shortName: 'CHEM',
      code: '103',
      type: 'academic',
      description: 'Chemistry curriculum across secondary grade levels.',
      groups: [
        { id: 'chem-g09', name: 'Grade 9', type: 'grade', gradeLevel: 9, order: 1, units: [] },
        { id: 'chem-g10', name: 'Grade 10', type: 'grade', gradeLevel: 10, order: 2, units: [] },
        { id: 'chem-g11', name: 'Grade 11', type: 'grade', gradeLevel: 11, order: 3, units: [] },
        { id: 'chem-g12', name: 'Grade 12', type: 'grade', gradeLevel: 12, order: 4, units: [] },
      ],
    },
    // 4. BIOLOGY (Grades 9 to 12)
    {
      id: 'biology',
      name: 'Biology',
      shortName: 'BIO',
      code: '104',
      type: 'academic',
      description: 'Biology curriculum across secondary grade levels.',
      groups: [
        { id: 'bio-g09', name: 'Grade 9', type: 'grade', gradeLevel: 9, order: 1, units: [] },
        { id: 'bio-g10', name: 'Grade 10', type: 'grade', gradeLevel: 10, order: 2, units: [] },
        { id: 'bio-g11', name: 'Grade 11', type: 'grade', gradeLevel: 11, order: 3, units: [] },
        { id: 'bio-g12', name: 'Grade 12', type: 'grade', gradeLevel: 12, order: 4, units: [] },
      ],
    },
    // 5. ENGLISH (Grades 9 to 12)
    {
      id: 'english',
      name: 'English',
      shortName: 'ENG',
      code: '105',
      type: 'academic',
      description: 'English curriculum across secondary grade levels.',
      groups: [
        { id: 'eng-g09', name: 'Grade 9', type: 'grade', gradeLevel: 9, order: 1, units: [] },
        { id: 'eng-g10', name: 'Grade 10', type: 'grade', gradeLevel: 10, order: 2, units: [] },
        { id: 'eng-g11', name: 'Grade 11', type: 'grade', gradeLevel: 11, order: 3, units: [] },
        { id: 'eng-g12', name: 'Grade 12', type: 'grade', gradeLevel: 12, order: 4, units: [] },
      ],
    },
    // 6. APTITUDE (Modular, completely empty)
    {
      id: 'aptitude',
      name: 'Aptitude',
      shortName: 'APT',
      code: '201',
      type: 'aptitude',
      description: 'Modular aptitude domain (empty, ready for custom entries).',
      groups: [],
    },
  ],

  rankingProfiles: DEFAULT_RANKING_PROFILES,
  rankingAssignments: [],
};
