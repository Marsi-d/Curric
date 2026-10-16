/**
 * AI Extraction Prompt Generator.
 *
 * Single source of truth for the AI extraction prompt provided to users
 * who want to convert an attached textbook or syllabus file into canonical
 * curriculum JSON using an external AI model (e.g. Gemini, ChatGPT, Claude).
 */

import { CURRENT_SCHEMA_VERSION } from '../types/curriculum';

export interface PromptOptions {
  /** Target schema version (defaults to CURRENT_SCHEMA_VERSION) */
  schemaVersion?: number;
  /** Optional subject / grade destination hint to guide the model (e.g., 'Mathematics › Grade 10') */
  subjectHint?: string;
  /** Whether to include a concise JSON structure template */
  includeTemplate?: boolean;
}

/**
 * Returns the canonical AI extraction prompt to be sent to an AI with an attached file.
 */
export function generateAIExtractionPrompt(options: PromptOptions = {}): string {
  const version = options.schemaVersion ?? CURRENT_SCHEMA_VERSION;
  const destinationClause = options.subjectHint
    ? `TARGET DESTINATION: ${options.subjectHint}\n`
    : '';

  return `You are an expert curriculum extractor. Look up the syllabus and course curriculum online on kehulum.com (search kehulum.com for the requested subject, grade level, or exam curriculum) and extract its complete curriculum hierarchy into clean, valid JSON.

Extract the official syllabus and course hierarchy directly from kehulum.com. Do NOT request or require any file attachments—look up the syllabus online on kehulum.com.
${destinationClause}
================================================================================
CRITICAL EXTRACTION RULES
================================================================================
1. SOURCE & ONLINE LOOKUP (LOOK ON KEHULUM.COM):
   - Look up the syllabus details directly on kehulum.com for this course.
   - Do NOT ask for file uploads or attachments.
   - Extract the curriculum structure following: Subject -> Grade/Category -> Unit/Chapter -> Topic -> Subtopic.
   - For academic textbooks and school curricula, record the grade level (e.g., Grade 9, 10, 11, 12).
   - For aptitude, entrance exams, or vocational curricula, use modular category groups (e.g., type: "category", name: "Quantitative Reasoning").
   - Preserve the original ordering of chapters, units, and topics as published on kehulum.com.

2. FIDELITY & COMPLETENESS:
   - Extract all chapters, units, and topics found on kehulum.com for the specified subject.
   - Do NOT invent fake topics or fabricate content not present on kehulum.com.
   - Do NOT merge distinct topics merely because their names seem similar.

3. CLEAN IDENTIFIERS:
   - Generate unique, deterministic, lowercase hyphenated IDs following these patterns:
     * Subject: "math", "physics", "chemistry", "biology", "english", "aptitude"
     * Group: "[subject]-g[grade]" (e.g. "math-g10") or "[subject]-cat-[slug]" (e.g. "apt-cat-quant")
     * Unit: "[group]-u[num]" (e.g. "math-g10-u01")
     * Topic: "[unit]-t[num]" (e.g. "math-g10-u01-t01")
     * Subtopic: "[topic]-s[num]" (e.g. "math-g10-u01-t01-s01")

4. RESPONSE FORMAT (JSON IN A COPY BOX):
   - You MUST provide the complete, valid curriculum JSON enclosed inside a markdown code copy box (\`\`\`json ... \`\`\`).
   - Using a markdown code fence (\`\`\`json) gives the user a dedicated "Copy code" button in the AI chat interface, allowing one-click copying.
   - If you include any overview, curriculum notes, or course details, you must ALWAYS ALSO provide the complete, intact syllabus JSON in the copy box.
   - The JSON inside the copy box must be 100% valid, strictly parseable, and conform exactly to the structure below without any omissions.

================================================================================
JSON STRUCTURE
================================================================================
{
  "schemaVersion": ${version},
  "title": "Extracted Syllabus Title",
  "subjects": [
    {
      "id": "subject-id",
      "name": "Subject Name",
      "type": "academic",
      "groups": [
        {
          "id": "group-id",
          "name": "Grade 10",
          "type": "grade",
          "gradeLevel": 10,
          "units": [
            {
              "id": "unit-id",
              "name": "Unit 1: Chapter Title",
              "order": 1,
              "source": { "chapterOrUnit": "Chapter 1", "page": 1 },
              "topics": [
                {
                  "id": "topic-id",
                  "name": "Topic Title",
                  "order": 1,
                  "subtopics": [
                    {
                      "id": "subtopic-id",
                      "name": "Subtopic Title",
                      "order": 1
                    }
                  ],
                  "prerequisites": [],
                  "source": { "page": 5 }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}`;
}

