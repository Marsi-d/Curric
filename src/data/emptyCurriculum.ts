import { CurriculumDocument, CURRENT_SCHEMA_VERSION } from '../types/curriculum';

/**
 * Default Master Curriculum State:
 * 5 Core Academic Subjects with pre-configured main folders (Grade 9, 10, 11, 12)
 * ready to receive imported syllabus data, plus 1 Aptitude subject with no subfolders.
 */
export const defaultEmptyCurriculum: CurriculumDocument = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  id: 'curriculum-master',
  title: 'Curriculum',
  description: 'Master academic syllabus repository.',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  subjects: [
    {
      id: 'subj-mathematics',
      name: 'Mathematics',
      type: 'academic',
      code: 'MATH',
      groups: [
        { id: 'math-g09', name: 'Grade 9', type: 'grade', gradeLevel: 9, order: 1, units: [] },
        { id: 'math-g10', name: 'Grade 10', type: 'grade', gradeLevel: 10, order: 2, units: [] },
        { id: 'math-g11', name: 'Grade 11', type: 'grade', gradeLevel: 11, order: 3, units: [] },
        { id: 'math-g12', name: 'Grade 12', type: 'grade', gradeLevel: 12, order: 4, units: [] },
      ],
    },
    {
      id: 'subj-physics',
      name: 'Physics',
      type: 'academic',
      code: 'PHYS',
      groups: [
        { id: 'phys-g09', name: 'Grade 9', type: 'grade', gradeLevel: 9, order: 1, units: [] },
        { id: 'phys-g10', name: 'Grade 10', type: 'grade', gradeLevel: 10, order: 2, units: [] },
        { id: 'phys-g11', name: 'Grade 11', type: 'grade', gradeLevel: 11, order: 3, units: [] },
        { id: 'phys-g12', name: 'Grade 12', type: 'grade', gradeLevel: 12, order: 4, units: [] },
      ],
    },
    {
      id: 'subj-chemistry',
      name: 'Chemistry',
      type: 'academic',
      code: 'CHEM',
      groups: [
        { id: 'chem-g09', name: 'Grade 9', type: 'grade', gradeLevel: 9, order: 1, units: [] },
        { id: 'chem-g10', name: 'Grade 10', type: 'grade', gradeLevel: 10, order: 2, units: [] },
        { id: 'chem-g11', name: 'Grade 11', type: 'grade', gradeLevel: 11, order: 3, units: [] },
        { id: 'chem-g12', name: 'Grade 12', type: 'grade', gradeLevel: 12, order: 4, units: [] },
      ],
    },
    {
      id: 'subj-biology',
      name: 'Biology',
      type: 'academic',
      code: 'BIO',
      groups: [
        { id: 'bio-g09', name: 'Grade 9', type: 'grade', gradeLevel: 9, order: 1, units: [] },
        { id: 'bio-g10', name: 'Grade 10', type: 'grade', gradeLevel: 10, order: 2, units: [] },
        { id: 'bio-g11', name: 'Grade 11', type: 'grade', gradeLevel: 11, order: 3, units: [] },
        { id: 'bio-g12', name: 'Grade 12', type: 'grade', gradeLevel: 12, order: 4, units: [] },
      ],
    },
    {
      id: 'subj-english',
      name: 'English',
      type: 'academic',
      code: 'ENG',
      groups: [
        { id: 'eng-g09', name: 'Grade 9', type: 'grade', gradeLevel: 9, order: 1, units: [] },
        { id: 'eng-g10', name: 'Grade 10', type: 'grade', gradeLevel: 10, order: 2, units: [] },
        { id: 'eng-g11', name: 'Grade 11', type: 'grade', gradeLevel: 11, order: 3, units: [] },
        { id: 'eng-g12', name: 'Grade 12', type: 'grade', gradeLevel: 12, order: 4, units: [] },
      ],
    },
    {
      id: 'subj-aptitude',
      name: 'Aptitude',
      type: 'aptitude',
      code: 'APT',
      description: 'Non-mandatory modular aptitude domain (no predefined grade subfolders).',
      groups: [], // Main folder without subfolders
    },
  ],
  rankingProfiles: [
    {
      id: 'profile-priority',
      name: 'Priority Ranking',
      type: 'ordered',
      scope: 'all_subjects',
      description: 'Rank topics by urgency, study priority, or exam weight.',
    },
    {
      id: 'profile-difficulty',
      name: 'Difficulty Ranking',
      type: 'ordered',
      scope: 'all_subjects',
      description: 'Rank topics based on personal difficulty, from hardest to easiest.',
    },
  ],
  rankingAssignments: [],
};
