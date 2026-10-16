/**
 * 15 Specific Test Scenarios for Curriculum Import & AI Extraction Workflow.
 *
 * Each scenario tests a critical boundary condition, error state, or data variation
 * specified in the architectural requirements.
 */

import { ImportStatus, DetectedFormat } from '../schema/importParser';
import { canonicalCurriculumDataset } from './canonicalExample';
import { curriculumToCsv } from '../schema/csvMapping';

export interface ImportTestScenario {
  id: string;
  name: string;
  category: 'json' | 'csv' | 'ai_envelope' | 'sanitization' | 'validation' | 'edge_case';
  description: string;
  payload: string;
  expectedStatus: ImportStatus;
  expectedFormat: DetectedFormat;
  canImport: boolean;
  notes: string;
}

export const IMPORT_TEST_SCENARIOS: ImportTestScenario[] = [
  // 1. Valid JSON
  {
    id: 'case-01-valid-json',
    name: '1. Valid Canonical JSON',
    category: 'json',
    description: 'Standard multi-subject canonical curriculum document with full structure.',
    payload: JSON.stringify(canonicalCurriculumDataset, null, 2),
    expectedStatus: 'success',
    expectedFormat: 'canonical_json',
    canImport: true,
    notes: 'Should validate cleanly with zero errors and recognize full subject hierarchy.',
  },

  // 2. Invalid JSON
  {
    id: 'case-02-invalid-json',
    name: '2. Invalid JSON Syntax',
    category: 'json',
    description: 'Malformed JSON payload with unclosed curly braces and broken commas.',
    payload: `{\n  "schemaVersion": 1,\n  "id": "broken-doc",\n  "title": "Broken JSON",\n  "subjects": [\n    { "id": "math", "name": "Mathematics",\n  // missing closing brackets`,
    expectedStatus: 'syntax_error',
    expectedFormat: 'unknown',
    canImport: false,
    notes: 'Should immediately report JSON_SYNTAX_ERROR and highlight syntax failure.',
  },

  // 3. Valid CSV
  {
    id: 'case-03-valid-csv',
    name: '3. Valid RFC 4180 CSV',
    category: 'csv',
    description: 'Flat tabular curriculum rows with ancestor pointers and quoted descriptions.',
    payload: curriculumToCsv(canonicalCurriculumDataset),
    expectedStatus: 'success',
    expectedFormat: 'csv',
    canImport: true,
    notes: 'Should parse CSV, reconstruct full hierarchy, and preserve entity relationships.',
  },

  // 4. Invalid CSV
  {
    id: 'case-04-invalid-csv',
    name: '4. Invalid CSV Header',
    category: 'csv',
    description: 'CSV text missing mandatory entityType and entityId header columns.',
    payload: `randomHeaderA,randomHeaderB,randomHeaderC\nfoo,bar,baz\n1,2,3`,
    expectedStatus: 'syntax_error',
    expectedFormat: 'csv',
    canImport: false,
    notes: 'Should fail gracefully reporting missing required CSV columns.',
  },

  // 5. AI-generated successful extraction
  {
    id: 'case-05-ai-success',
    name: '5. AI-Generated Successful Extraction',
    category: 'ai_envelope',
    description: 'AI extraction envelope with status=success, textbook metadata, and extracted chapters.',
    payload: JSON.stringify(
      {
        extractionStatus: 'success',
        schemaVersion: 1,
        source: {
          textbookTitle: 'University Physics with Modern Physics',
          subject: 'Physics',
          grade: 12,
          edition: '15th Edition',
          publisher: 'Pearson Education',
          totalPages: 1600,
          analyzedPages: 'pp. 670-715 Electromagnetic Induction TOC',
          extractionNotes: 'Complete table of contents analyzed with full chapter fidelity.',
          confidence: 0.98,
        },
        warnings: [],
        errors: [],
        curriculum: {
          schemaVersion: 1,
          id: 'ai-phys-g12',
          title: 'Physics Grade 12 - Electromagnetism',
          createdAt: '2026-03-15T10:00:00Z',
          updatedAt: '2026-03-15T10:00:00Z',
          subjects: [
            {
              id: 'physics',
              name: 'Physics',
              type: 'academic',
              groups: [
                {
                  id: 'physics-g12',
                  name: 'Grade 12',
                  type: 'grade',
                  gradeLevel: 12,
                  units: [
                    {
                      id: 'phys-g12-u01',
                      name: 'Electromagnetic Induction',
                      order: 1,
                      source: { chapterOrUnit: 'Chapter 29', page: 672 },
                      topics: [
                        {
                          id: 'phys-g12-u01-t01',
                          name: "Faraday's Law of Induction",
                          order: 1,
                          subtopics: [
                            {
                              id: 'phys-g12-u01-t01-s01',
                              name: 'Magnetic Flux Calculation',
                              order: 1,
                              source: { page: 675 },
                            },
                          ],
                          prerequisites: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      null,
      2
    ),
    expectedStatus: 'success',
    expectedFormat: 'ai_envelope',
    canImport: true,
    notes: 'Should recognize AI envelope format, store source metadata provenance, and allow import.',
  },

  // 6. AI-generated partial extraction
  {
    id: 'case-06-ai-partial',
    name: '6. AI-Generated Partial Extraction',
    category: 'ai_envelope',
    description: 'AI extraction envelope with status=partial, warnings for illegible pages, and extracted units.',
    payload: JSON.stringify(
      {
        extractionStatus: 'partial',
        schemaVersion: 1,
        source: {
          textbookTitle: 'Advanced Organic Chemistry',
          subject: 'Chemistry',
          grade: 'University / AP',
          edition: '5th Edition',
          publisher: 'Springer',
          analyzedPages: 'pp. 1-120 (Chapters 1-3)',
          extractionNotes: 'Chapters 1 and 2 extracted successfully. Chapter 3 scan was partially cut off.',
        },
        warnings: [
          {
            type: 'missing_pages',
            message: 'Pages 85-92 were missing from scan. Carbonyl reaction mechanism subtopics could not be read.',
            page: '85-92',
            section: 'Chapter 3: Carbonyl Compounds',
          },
          {
            type: 'unclear_hierarchy',
            message: 'Stereochemistry subtopic numbering was inconsistent in table of contents.',
            page: 44,
            section: 'Chapter 2',
          },
        ],
        errors: [],
        curriculum: {
          schemaVersion: 1,
          id: 'chem-adv-partial',
          title: 'Advanced Organic Chemistry (Partial Extract)',
          subjects: [
            {
              id: 'chemistry',
              name: 'Chemistry',
              type: 'academic',
              groups: [
                {
                  id: 'chem-adv-g12',
                  name: 'Grade 12 / AP',
                  type: 'grade',
                  gradeLevel: 12,
                  units: [
                    {
                      id: 'chem-adv-u01',
                      name: 'Structure and Bonding in Organic Molecules',
                      order: 1,
                      source: { chapterOrUnit: 'Chapter 1', page: 2 },
                      topics: [
                        {
                          id: 'chem-adv-u01-t01',
                          name: 'Orbital Hybridization and Molecular Geometry',
                          order: 1,
                          subtopics: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      null,
      2
    ),
    expectedStatus: 'partial',
    expectedFormat: 'ai_envelope',
    canImport: true,
    notes: 'Should surface the 2 AI warnings prominently and allow user to choose whether to import.',
  },

  // 7. AI-generated failed extraction
  {
    id: 'case-07-ai-failed',
    name: '7. AI-Generated Failed Extraction',
    category: 'ai_envelope',
    description: 'AI extraction envelope with status=failed, explaining why extraction was impossible.',
    payload: JSON.stringify(
      {
        extractionStatus: 'failed',
        schemaVersion: 1,
        source: {
          textbookTitle: 'Calculus Early Transcendentals',
          analyzedPages: 'Cover and First 5 Pages',
        },
        warnings: [],
        errors: [
          {
            type: 'unreadable_source',
            message: 'The uploaded PDF appears to be a password-protected or encrypted document without readable text.',
            page: 1,
          },
          {
            type: 'no_syllabus_found',
            message: 'No table of contents, syllabus matrix, or chapter breakdown could be found in the document.',
          },
        ],
        curriculum: null,
      },
      null,
      2
    ),
    expectedStatus: 'failed',
    expectedFormat: 'ai_envelope',
    canImport: false,
    notes: 'Must prohibit import, display failure alert, and present all model-reported errors clearly.',
  },

  // 8. JSON wrapped in Markdown code fences
  {
    id: 'case-08-fenced-json',
    name: '8. JSON Wrapped in Markdown Code Fences',
    category: 'sanitization',
    description: 'Valid curriculum JSON enclosed in ```json ... ``` code fences.',
    payload: `\`\`\`json
{
  "schemaVersion": 1,
  "id": "fenced-curriculum",
  "title": "Markdown Fenced Curriculum",
  "createdAt": "2026-04-01T00:00:00Z",
  "updatedAt": "2026-04-01T00:00:00Z",
  "subjects": [
    {
      "id": "english",
      "name": "English Literature",
      "type": "academic",
      "groups": [
        {
          "id": "eng-g10",
          "name": "Grade 10",
          "type": "grade",
          "gradeLevel": 10,
          "units": [
            {
              "id": "eng-g10-u01",
              "name": "Literary Analysis & Critical Reading",
              "order": 1,
              "topics": [
                {
                  "id": "eng-g10-u01-t01",
                  "name": "Theme Identification in Classic Novels",
                  "order": 1,
                  "subtopics": []
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
\`\`\``,
    expectedStatus: 'success',
    expectedFormat: 'canonical_json',
    canImport: true,
    notes: 'Should safely detect and strip markdown code fences before parsing.',
  },

  // 9. AI response containing explanatory text around JSON
  {
    id: 'case-09-prose-wrapped',
    name: '9. AI Response with Surrounding Prose',
    category: 'sanitization',
    description: 'Conversational greetings and sign-offs wrapping a valid JSON extraction object.',
    payload: `Hello! I have reviewed the uploaded textbook "Biology Concepts & Connections".
Here is the structured JSON syllabus matching your Schema v1 specification:

{
  "extractionStatus": "success",
  "schemaVersion": 1,
  "source": {
    "textbookTitle": "Biology Concepts & Connections",
    "subject": "Biology",
    "grade": 11,
    "publisher": "Campbell"
  },
  "warnings": [],
  "errors": [],
  "curriculum": {
    "schemaVersion": 1,
    "id": "bio-g11",
    "title": "Grade 11 Biology",
    "subjects": [
      {
        "id": "biology",
        "name": "Biology",
        "groups": [
          {
            "id": "bio-g11",
            "name": "Grade 11",
            "type": "grade",
            "gradeLevel": 11,
            "units": [
              {
                "id": "bio-g11-u01",
                "name": "Cellular Respiration and Photosynthesis",
                "topics": [
                  {
                    "id": "bio-g11-u01-t01",
                    "name": "Glycolysis and the Krebs Cycle",
                    "subtopics": []
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}

I hope this helps! Please let me know if you need any additional chapters extracted.`,
    expectedStatus: 'success',
    expectedFormat: 'ai_envelope',
    canImport: true,
    notes: 'Should scan and isolate the JSON object from preamble and sign-off prose safely.',
  },

  // 10. Duplicate IDs
  {
    id: 'case-10-duplicate-ids',
    name: '10. Duplicate Entity IDs',
    category: 'validation',
    description: 'Curriculum document where two distinct topics share the identical ID.',
    payload: JSON.stringify(
      {
        schemaVersion: 1,
        id: 'dup-id-doc',
        title: 'Document with Duplicate IDs',
        subjects: [
          {
            id: 'math',
            name: 'Mathematics',
            groups: [
              {
                id: 'math-g09',
                name: 'Grade 9',
                type: 'grade',
                gradeLevel: 9,
                units: [
                  {
                    id: 'math-g09-u01',
                    name: 'Algebra',
                    topics: [
                      { id: 'math-topic-01', name: 'Linear Equations', subtopics: [] },
                      { id: 'math-topic-01', name: 'Quadratic Expressions', subtopics: [] }, // DUPLICATE ID
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      null,
      2
    ),
    expectedStatus: 'validation_error',
    expectedFormat: 'canonical_json',
    canImport: false,
    notes: 'Should fail validation with DUPLICATE_ID error and pinpoint conflicting paths.',
  },

  // 11. Missing source information
  {
    id: 'case-11-missing-source',
    name: '11. Missing Source Information (Valid)',
    category: 'edge_case',
    description: 'Completely valid curriculum where source page, chapter, and file are omitted/null.',
    payload: JSON.stringify(
      {
        schemaVersion: 1,
        id: 'no-source-doc',
        title: 'Curriculum Without Source Attribution',
        subjects: [
          {
            id: 'chemistry',
            name: 'Chemistry',
            groups: [
              {
                id: 'chem-g10',
                name: 'Grade 10',
                type: 'grade',
                gradeLevel: 10,
                units: [
                  {
                    id: 'chem-g10-u01',
                    name: 'Chemical Reactions and Equations',
                    topics: [
                      {
                        id: 'chem-g10-u01-t01',
                        name: 'Balancing Chemical Equations',
                        subtopics: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      null,
      2
    ),
    expectedStatus: 'success',
    expectedFormat: 'canonical_json',
    canImport: true,
    notes: 'Source metadata is optional in schema; omission should pass cleanly without errors.',
  },

  // 12. Missing optional fields
  {
    id: 'case-12-missing-optional-fields',
    name: '12. Minimal Curriculum (Missing Optional Fields)',
    category: 'edge_case',
    description: 'Bare-bones curriculum containing only strictly required schema fields.',
    payload: JSON.stringify(
      {
        schemaVersion: 1,
        id: 'minimal-doc',
        title: 'Minimal Subject',
        subjects: [
          {
            id: 'history',
            name: 'World History',
            groups: [
              {
                id: 'hist-g10',
                name: 'Grade 10',
                type: 'grade',
                units: [
                  {
                    id: 'hist-g10-u01',
                    name: 'Ancient Civilizations',
                    topics: [
                      {
                        id: 'hist-g10-u01-t01',
                        name: 'Mesopotamian City-States',
                        subtopics: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      null,
      2
    ),
    expectedStatus: 'success',
    expectedFormat: 'canonical_json',
    canImport: true,
    notes: 'Absence of descriptions, order numbers, prerequisites, and rankings must pass.',
  },

  // 13. Missing required fields
  {
    id: 'case-13-missing-required-fields',
    name: '13. Missing Required Fields (Invalid)',
    category: 'validation',
    description: 'Subject object missing required "name" and topic missing required "id".',
    payload: JSON.stringify(
      {
        schemaVersion: 1,
        id: 'missing-req-doc',
        title: 'Missing Required Fields Document',
        subjects: [
          {
            id: 'bad-subject',
            // MISSING NAME
            groups: [
              {
                id: 'bad-group',
                name: 'Grade 10',
                units: [
                  {
                    id: 'bad-unit',
                    name: 'Unit 1',
                    topics: [
                      {
                        // MISSING ID
                        name: 'Nameless Topic ID',
                        subtopics: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      null,
      2
    ),
    expectedStatus: 'validation_error',
    expectedFormat: 'canonical_json',
    canImport: false,
    notes: 'Should fail with MISSING_REQUIRED_FIELD errors for missing subject.name and topic.id.',
  },

  // 14. An empty extraction
  {
    id: 'case-14-empty-extraction',
    name: '14. Empty Extraction (0 Subjects)',
    category: 'edge_case',
    description: 'AI envelope returning status=success but an empty subjects list.',
    payload: JSON.stringify(
      {
        extractionStatus: 'success',
        schemaVersion: 1,
        source: {
          textbookTitle: 'Empty Document Sample',
        },
        warnings: [],
        errors: [],
        curriculum: {
          schemaVersion: 1,
          id: 'empty-doc',
          title: 'Empty Syllabus',
          subjects: [],
        },
      },
      null,
      2
    ),
    expectedStatus: 'failed',
    expectedFormat: 'ai_envelope',
    canImport: false,
    notes: 'Should detect that 0 curriculum subjects were extracted and prohibit empty import.',
  },

  // 15. A textbook extraction containing only one subject
  {
    id: 'case-15-single-subject',
    name: '15. Single-Subject Textbook Extraction',
    category: 'edge_case',
    description: 'Real-world case of extracting a textbook that covers only one single subject (e.g. Grade 10 Math).',
    payload: JSON.stringify(
      {
        extractionStatus: 'success',
        schemaVersion: 1,
        source: {
          textbookTitle: 'Complete Pure Mathematics 1 for Cambridge International AS & A Level',
          subject: 'Mathematics',
          grade: 11,
          publisher: 'Oxford University Press',
          analyzedPages: 'pp. v-viii Syllabus Matrix',
        },
        warnings: [],
        errors: [],
        curriculum: {
          schemaVersion: 1,
          id: 'cambridge-pure-math-1',
          title: 'Cambridge AS Level Pure Mathematics 1',
          description: 'Single-subject syllabus for Pure Mathematics 1 (Paper 1)',
          subjects: [
            {
              id: 'math-pure-1',
              name: 'Pure Mathematics 1',
              type: 'academic',
              groups: [
                {
                  id: 'math-p1-as',
                  name: 'AS Level',
                  type: 'grade',
                  gradeLevel: 11,
                  units: [
                    {
                      id: 'math-p1-u01',
                      name: 'Quadratics',
                      order: 1,
                      source: { chapterOrUnit: 'Chapter 1', page: 1 },
                      topics: [
                        {
                          id: 'math-p1-u01-t01',
                          name: 'Completing the Square',
                          order: 1,
                          subtopics: [
                            { id: 'math-p1-u01-t01-s01', name: 'Expressing in form a(x+b)^2 + c', order: 1 },
                            { id: 'math-p1-u01-t01-s02', name: 'Finding maximum and minimum values', order: 2 },
                          ],
                        },
                        {
                          id: 'math-p1-u01-t02',
                          name: 'Quadratic Equations and Discriminants',
                          order: 2,
                          subtopics: [
                            { id: 'math-p1-u01-t02-s01', name: 'b^2 - 4ac conditions for real roots', order: 1 },
                          ],
                        },
                      ],
                    },
                    {
                      id: 'math-p1-u02',
                      name: 'Coordinate Geometry',
                      order: 2,
                      source: { chapterOrUnit: 'Chapter 2', page: 28 },
                      topics: [
                        {
                          id: 'math-p1-u02-t01',
                          name: 'Equation of a Straight Line',
                          order: 1,
                          subtopics: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      null,
      2
    ),
    expectedStatus: 'success',
    expectedFormat: 'ai_envelope',
    canImport: true,
    notes: 'Single subject textbook is valid, normal, and should import seamlessly.',
  },
];
