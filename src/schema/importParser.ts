/**
 * Curriculum Import Parser & Sanitizer.
 *
 * Ingests external AI extraction envelopes, canonical JSON files, pasted strings,
 * and RFC 4180 CSV tables. Strips Markdown fences safely, extracts JSON from
 * surrounding conversational prose, and normalizes into canonical CurriculumDocuments
 * with full provenance tracking.
 */

import {
  CurriculumDocument,
  CURRENT_SCHEMA_VERSION,
  Subject,
  FlatCurriculumRow,
} from '../types/curriculum';
import {
  AIExtractionEnvelope,
  ImportProvenance,
  ExtractionWarning,
  ExtractionError,
  TextbookSourceMetadata,
} from '../types/aiExtraction';
import { validateCurriculumDocument, ValidationResult, ValidationIssue } from './validation';
import { flatRowsToCurriculum, CSV_COLUMN_HEADERS } from './csvMapping';

export type DetectedFormat = 'ai_envelope' | 'canonical_json' | 'csv' | 'unknown';
export type ImportStatus = 'success' | 'partial' | 'failed' | 'syntax_error' | 'validation_error';

export interface NormalizedImportResult {
  status: ImportStatus;
  detectedFormat: DetectedFormat;
  rawInputSanitized: string;
  curriculum?: CurriculumDocument;
  envelope?: AIExtractionEnvelope;
  provenance: ImportProvenance;
  validation?: ValidationResult;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  aiWarnings: ExtractionWarning[];
  aiErrors: ExtractionError[];
  sourceMetadata?: TextbookSourceMetadata;
  canImport: boolean;
  message: string;
}

/**
 * Strips Markdown code fences (e.g. ```json ... ``` or ``` ... ```) safely.
 */
export function stripMarkdownFences(raw: string): string {
  const trimmed = raw.trim();
  // Check for ```json ... ``` or ``` ... ```
  const fenceRegex = /^```(?:json|csv)?\s*([\s\S]*?)\s*```$/i;
  const match = trimmed.match(fenceRegex);
  if (match && match[1]) {
    return match[1].trim();
  }
  return trimmed;
}

/**
 * Extracts a JSON object/array from surrounding prose safely using balanced bracket scanning.
 * Used when an external AI precedes or follows the JSON with conversational text.
 */
export function extractJsonFromProse(text: string): string | null {
  const trimmed = text.trim();

  // If it starts with { or [, try parsing directly first
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed);
      return trimmed;
    } catch {
      // Might have trailing junk, continue to bracket finder
    }
  }

  // Find first opening bracket
  const firstCurly = trimmed.indexOf('{');
  const firstSquare = trimmed.indexOf('[');

  let startIdx = -1;
  let isObject = true;

  if (firstCurly !== -1 && (firstSquare === -1 || firstCurly < firstSquare)) {
    startIdx = firstCurly;
    isObject = true;
  } else if (firstSquare !== -1) {
    startIdx = firstSquare;
    isObject = false;
  }

  if (startIdx === -1) return null;

  // Scan balanced brackets
  let depth = 0;
  let inString = false;
  let isEscaped = false;
  const openChar = isObject ? '{' : '[';
  const closeChar = isObject ? '}' : ']';

  for (let i = startIdx; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (char === '\\') {
      isEscaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === openChar) {
        depth++;
      } else if (char === closeChar) {
        depth--;
        if (depth === 0) {
          const candidate = trimmed.substring(startIdx, i + 1);
          try {
            JSON.parse(candidate);
            return candidate;
          } catch {
            // keep searching if syntax was invalid
          }
        }
      }
    }
  }

  return null;
}

/**
 * Robust RFC 4180 CSV parser.
 * Handles quoted fields, embedded commas, escaped double-quotes (""), and line breaks.
 */
export function parseCsvToFlatRows(rawCsv: string): { rows: FlatCurriculumRow[]; error?: string } {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  const normalized = rawCsv.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const nextChar = normalized[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++; // skip next quote
        } else {
          // Closing quote
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField);
        if (currentRow.some((field) => field.trim().length > 0)) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  // Push final field if not empty
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((field) => field.trim().length > 0)) {
      lines.push(currentRow);
    }
  }

  if (lines.length < 2) {
    return {
      rows: [],
      error: 'CSV must contain a header line and at least one data row.',
    };
  }

  const rawHeaders = lines[0].map((h) => h.trim());
  const headerIndices = new Map<string, number>();
  rawHeaders.forEach((h, idx) => headerIndices.set(h, idx));

  // Verify critical header columns
  if (!headerIndices.has('entityType') || !headerIndices.has('entityId')) {
    return {
      rows: [],
      error: "Invalid CSV headers: missing required columns 'entityType' and 'entityId'.",
    };
  }

  const resultRows: FlatCurriculumRow[] = [];

  for (let r = 1; r < lines.length; r++) {
    const line = lines[r];
    const getVal = (col: keyof FlatCurriculumRow): string => {
      const idx = headerIndices.get(col as string);
      return idx !== undefined && idx < line.length ? line[idx] : '';
    };

    const rowObj: FlatCurriculumRow = {
      entityType: (getVal('entityType') || 'topic') as FlatCurriculumRow['entityType'],
      entityId: getVal('entityId'),
      parentId: getVal('parentId'),
      subjectId: getVal('subjectId'),
      subjectName: getVal('subjectName'),
      groupId: getVal('groupId'),
      groupName: getVal('groupName'),
      groupType: getVal('groupType'),
      unitId: getVal('unitId'),
      unitName: getVal('unitName'),
      topicId: getVal('topicId'),
      topicName: getVal('topicName'),
      subtopicId: getVal('subtopicId'),
      subtopicName: getVal('subtopicName'),
      name: getVal('name'),
      order: getVal('order'),
      description: getVal('description'),
      prerequisites: getVal('prerequisites'),
      sourceFileOrBook: getVal('sourceFileOrBook'),
      sourcePage: getVal('sourcePage'),
      sourceChapter: getVal('sourceChapter'),
      studyDifficulty: getVal('studyDifficulty'),
      studyEstimatedMinutes: getVal('studyEstimatedMinutes'),
      studyTags: getVal('studyTags'),
      customMetadataJson: getVal('customMetadataJson'),
    };

    if (rowObj.entityId) {
      resultRows.push(rowObj);
    }
  }

  return { rows: resultRows };
}

/**
 * Main parser entry point.
 * Ingests any raw payload, detects format, sanitizes, and evaluates extraction status.
 */
export function parseAndNormalizeImport(
  rawInput: string,
  medium: 'external_ai' | 'json_file' | 'json_paste' | 'csv_file' | 'csv_paste'
): NormalizedImportResult {
  const timestamp = new Date().toISOString();
  const baseProvenance: ImportProvenance = {
    sourceType: medium,
    importedAt: timestamp,
    unverifiedSourceData: true,
  };

  const emptyResult = (msg: string, status: ImportStatus = 'syntax_error'): NormalizedImportResult => ({
    status,
    detectedFormat: 'unknown',
    rawInputSanitized: rawInput,
    provenance: baseProvenance,
    errors: [{ level: 'error', code: 'EMPTY_INPUT', path: '$', message: msg }],
    warnings: [],
    aiWarnings: [],
    aiErrors: [],
    canImport: false,
    message: msg,
  });

  if (!rawInput || rawInput.trim().length === 0) {
    return emptyResult('No input provided. Please upload a file or paste data.');
  }

  // Step 1: Strip Markdown fences if present
  let cleaned = stripMarkdownFences(rawInput);

  // Step 2: Test if this looks like CSV
  const looksLikeCsv =
    cleaned.startsWith('entityType,') ||
    cleaned.includes('entityType,entityId') ||
    (cleaned.includes(',') && cleaned.split('\n')[0].includes('entityType'));

  if (looksLikeCsv && !cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    return handleCsvImport(cleaned, medium, baseProvenance);
  }

  // Step 3: Attempt JSON extraction (direct or prose extraction)
  let jsonString = cleaned;
  let parsedJson: unknown = null;

  try {
    parsedJson = JSON.parse(jsonString);
  } catch {
    // Attempt extracting from surrounding prose (e.g. "Here is the JSON:\n{...}")
    const extracted = extractJsonFromProse(jsonString);
    if (extracted) {
      jsonString = extracted;
      try {
        parsedJson = JSON.parse(jsonString);
      } catch (err: unknown) {
        return {
          status: 'syntax_error',
          detectedFormat: 'unknown',
          rawInputSanitized: jsonString,
          provenance: baseProvenance,
          errors: [
            {
              level: 'error',
              code: 'JSON_SYNTAX_ERROR',
              path: '$',
              message: `Malformed JSON: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          warnings: [],
          aiWarnings: [],
          aiErrors: [],
          canImport: false,
          message: 'Malformed JSON syntax. Could not parse document.',
        };
      }
    } else {
      // If still looks like CSV was attempted but failed
      if (cleaned.includes(',')) {
        return handleCsvImport(cleaned, medium, baseProvenance);
      }
      return {
        status: 'syntax_error',
        detectedFormat: 'unknown',
        rawInputSanitized: jsonString,
        provenance: baseProvenance,
        errors: [
          {
            level: 'error',
            code: 'JSON_SYNTAX_ERROR',
            path: '$',
            message: 'Invalid JSON format. Check for unclosed brackets, quotes, or trailing commas.',
          },
        ],
        warnings: [],
        aiWarnings: [],
        aiErrors: [],
        canImport: false,
        message: 'Invalid JSON format. Check for unclosed brackets, quotes, or trailing commas.',
      };
    }
  }

  // Step 4: Analyze parsed JSON structure
  if (!parsedJson || typeof parsedJson !== 'object') {
    return emptyResult('Parsed JSON must be an object or array.', 'syntax_error');
  }

  const candidateObj = parsedJson as Record<string, unknown>;

  // Check if it is an envelope with extractionStatus (for legacy envelope compatibility)
  const isAiEnvelope =
    'extractionStatus' in candidateObj &&
    typeof candidateObj.extractionStatus === 'string';

  if (isAiEnvelope) {
    return handleAiEnvelopeImport(candidateObj as unknown as AIExtractionEnvelope, jsonString, baseProvenance);
  }

  // Check if it is a direct CurriculumDocument with subjects
  const isCurriculumDoc =
    'subjects' in candidateObj && Array.isArray(candidateObj.subjects);

  if (isCurriculumDoc) {
    return handleDirectCurriculumImport(candidateObj as unknown as CurriculumDocument, jsonString, baseProvenance);
  }

  // Check if it is wrapped under a 'curriculum' property
  if (
    'curriculum' in candidateObj &&
    candidateObj.curriculum &&
    typeof candidateObj.curriculum === 'object' &&
    'subjects' in (candidateObj.curriculum as any) &&
    Array.isArray((candidateObj.curriculum as any).subjects)
  ) {
    return handleDirectCurriculumImport(candidateObj.curriculum as unknown as CurriculumDocument, jsonString, baseProvenance);
  }

  // Check if it is a single Subject or array of Subjects
  if (Array.isArray(parsedJson) && parsedJson.length > 0 && 'groups' in parsedJson[0]) {
    const wrappedDoc: CurriculumDocument = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      id: `imported-${Date.now()}`,
      title: 'Imported Subjects',
      createdAt: timestamp,
      updatedAt: timestamp,
      subjects: parsedJson as Subject[],
      rankingProfiles: [],
      rankingAssignments: [],
    };
    return handleDirectCurriculumImport(wrappedDoc, jsonString, baseProvenance);
  }

  // Check if it has units directly: { units: [...] }
  if ('units' in candidateObj && Array.isArray(candidateObj.units)) {
    const units = candidateObj.units;
    const defaultSubject: Subject = {
      id: (candidateObj.subjectId as string) || 'imported-subject',
      name: (candidateObj.subject as string) || (candidateObj.subjectName as string) || 'Imported Curriculum',
      type: 'academic',
      groups: [
        {
          id: (candidateObj.groupId as string) || 'imported-group',
          name: (candidateObj.group as string) || (candidateObj.grade ? `Grade ${candidateObj.grade}` : 'Imported Grade'),
          type: 'grade',
          gradeLevel: typeof candidateObj.grade === 'number' ? candidateObj.grade : 10,
          order: 1,
          units,
        },
      ],
    };
    const wrappedDoc: CurriculumDocument = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      id: `imported-${Date.now()}`,
      title: (candidateObj.title as string) || 'Imported Curriculum',
      createdAt: timestamp,
      updatedAt: timestamp,
      subjects: [defaultSubject],
      rankingProfiles: [],
      rankingAssignments: [],
    };
    return handleDirectCurriculumImport(wrappedDoc, jsonString, baseProvenance);
  }

  return {
    status: 'validation_error',
    detectedFormat: 'unknown',
    rawInputSanitized: jsonString,
    provenance: baseProvenance,
    errors: [
      {
        level: 'error',
        code: 'UNRECOGNIZED_SCHEMA_STRUCTURE',
        path: '$',
        message:
          "Payload does not match canonical schema. Expected a document with 'subjects' or curriculum hierarchy.",
      },
    ],
    warnings: [],
    aiWarnings: [],
    aiErrors: [],
    canImport: false,
    message: "Unrecognized document format. Missing required 'subjects' or curriculum structure.",
  };
}

/**
 * Handles AI Extraction Envelope (success, partial, failed).
 */
function handleAiEnvelopeImport(
  envelope: AIExtractionEnvelope,
  rawJson: string,
  provenance: ImportProvenance
): NormalizedImportResult {
  const aiStatus = envelope.extractionStatus;
  const aiWarnings = envelope.warnings || [];
  const aiErrors = envelope.errors || [];
  const sourceMeta = envelope.source;

  provenance.sourceType = 'external_ai';
  provenance.aiExtractionStatus = aiStatus;
  provenance.textbookMetadata = sourceMeta;
  provenance.warnings = aiWarnings;

  // 1. FAILED EXTRACTION
  if (aiStatus === 'failed') {
    return {
      status: 'failed',
      detectedFormat: 'ai_envelope',
      rawInputSanitized: rawJson,
      envelope,
      provenance,
      errors: aiErrors.map((e) => ({
        level: 'error',
        code: e.type || 'AI_EXTRACTION_FAILURE',
        path: e.page ? `page-${e.page}` : '$',
        message: e.message,
      })),
      warnings: aiWarnings.map((w) => ({
        level: 'warning',
        code: w.type || 'AI_EXTRACTION_WARNING',
        path: w.page ? `page-${w.page}` : '$',
        message: w.message,
      })),
      aiWarnings,
      aiErrors,
      sourceMetadata: sourceMeta,
      canImport: false,
      message:
        'External AI reported that curriculum extraction failed. No valid curriculum data can be imported.',
    };
  }

  // Normalize curriculum payload
  let rawCurriculum = envelope.curriculum;
  if (!rawCurriculum) {
    // Check if subjects was placed at top level by mistake
    const fallbackSubjects = (envelope as unknown as { subjects?: Subject[] }).subjects;
    if (fallbackSubjects && Array.isArray(fallbackSubjects)) {
      rawCurriculum = { subjects: fallbackSubjects };
    }
  }

  if (!rawCurriculum || !rawCurriculum.subjects || rawCurriculum.subjects.length === 0) {
    // Empty curriculum returned
    return {
      status: 'failed',
      detectedFormat: 'ai_envelope',
      rawInputSanitized: rawJson,
      envelope,
      provenance,
      errors: [
        {
          level: 'error',
          code: 'EMPTY_CURRICULUM_EXTRACTION',
          path: '$.curriculum.subjects',
          message: 'The AI returned an empty curriculum without any subjects or topics.',
        },
      ],
      warnings: aiWarnings.map((w) => ({
        level: 'warning',
        code: w.type || 'AI_EXTRACTION_WARNING',
        path: '$',
        message: w.message,
      })),
      aiWarnings,
      aiErrors,
      sourceMetadata: sourceMeta,
      canImport: false,
      message: 'Extraction returned empty curriculum (0 subjects). Nothing to import.',
    };
  }

  // Construct full CurriculumDocument
  const fullDoc: CurriculumDocument = {
    schemaVersion: rawCurriculum.schemaVersion || CURRENT_SCHEMA_VERSION,
    id: rawCurriculum.id || `doc-${Date.now()}`,
    title:
      rawCurriculum.title ||
      sourceMeta?.textbookTitle ||
      (rawCurriculum.subjects[0]?.name ? `${rawCurriculum.subjects[0].name} Curriculum` : 'Extracted Curriculum'),
    description: rawCurriculum.description || sourceMeta?.extractionNotes || 'Extracted via External AI.',
    createdAt: rawCurriculum.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    subjects: rawCurriculum.subjects,
    rankingProfiles: rawCurriculum.rankingProfiles || [],
    rankingAssignments: rawCurriculum.rankingAssignments || [],
    metadata: {
      ...(rawCurriculum.metadata || {}),
      provenance,
    },
  };

  // Run validation
  const validation = validateCurriculumDocument(fullDoc);

  // Combine AI warnings with validation warnings
  const combinedWarnings = [
    ...validation.warnings,
    ...aiWarnings.map((w): ValidationIssue => ({
      level: 'warning',
      code: `AI_${w.type?.toUpperCase() || 'WARNING'}`,
      path: w.page ? `page-${w.page}` : '$',
      message: `AI Note: ${w.message}${w.section ? ` (Section: ${w.section})` : ''}`,
    })),
  ];

  // 2. PARTIAL EXTRACTION
  if (aiStatus === 'partial') {
    return {
      status: validation.valid ? 'partial' : 'validation_error',
      detectedFormat: 'ai_envelope',
      rawInputSanitized: rawJson,
      curriculum: fullDoc,
      envelope,
      provenance,
      validation,
      errors: validation.errors,
      warnings: combinedWarnings,
      aiWarnings,
      aiErrors,
      sourceMetadata: sourceMeta,
      canImport: validation.valid, // User can decide to import partial data if structurally valid
      message: validation.valid
        ? `Partial Extraction: Successfully extracted ${validation.stats.topicCount} topics across ${validation.stats.subjectCount} subject(s), but ${aiWarnings.length} warning(s) were flagged by the AI.`
        : `Partial extraction has ${validation.errors.length} schema validation errors.`,
    };
  }

  // 3. SUCCESSFUL EXTRACTION
  return {
    status: validation.valid ? 'success' : 'validation_error',
    detectedFormat: 'ai_envelope',
    rawInputSanitized: rawJson,
    curriculum: fullDoc,
    envelope,
    provenance,
    validation,
    errors: validation.errors,
    warnings: combinedWarnings,
    aiWarnings,
    aiErrors,
    sourceMetadata: sourceMeta,
    canImport: validation.valid,
    message: validation.valid
      ? `Extraction Succeeded: Extracted ${validation.stats.topicCount} topics across ${validation.stats.subjectCount} subject(s). Ready for import.`
      : `Extraction contains ${validation.errors.length} schema validation error(s).`,
  };
}

/**
 * Handles direct canonical CurriculumDocument JSON.
 */
function handleDirectCurriculumImport(
  doc: CurriculumDocument,
  rawJson: string,
  provenance: ImportProvenance
): NormalizedImportResult {
  // Ensure provenance is stored in document metadata and optional top-level arrays default safely
  const docWithMeta: CurriculumDocument = {
    ...doc,
    schemaVersion: doc.schemaVersion || CURRENT_SCHEMA_VERSION,
    id: doc.id || `doc-${Date.now()}`,
    title: doc.title || 'Imported Curriculum',
    rankingProfiles: Array.isArray(doc.rankingProfiles) ? doc.rankingProfiles : [],
    rankingAssignments: Array.isArray(doc.rankingAssignments) ? doc.rankingAssignments : [],
    metadata: {
      ...(doc.metadata || {}),
      provenance,
    },
  };

  const validation = validateCurriculumDocument(docWithMeta);

  return {
    status: validation.valid ? 'success' : 'validation_error',
    detectedFormat: 'canonical_json',
    rawInputSanitized: rawJson,
    curriculum: docWithMeta,
    provenance,
    validation,
    errors: validation.errors,
    warnings: validation.warnings,
    aiWarnings: [],
    aiErrors: [],
    canImport: validation.valid,
    message: validation.valid
      ? `Valid Curriculum Document: ${validation.stats.subjectCount} subject(s), ${validation.stats.topicCount} topic(s).`
      : `Document has ${validation.errors.length} validation error(s).`,
  };
}

/**
 * Handles tabular CSV text import.
 */
function handleCsvImport(
  csvText: string,
  medium: ImportProvenance['sourceType'],
  provenance: ImportProvenance
): NormalizedImportResult {
  const { rows, error } = parseCsvToFlatRows(csvText);

  provenance.sourceType = medium === 'csv_file' ? 'csv_file' : 'csv_paste';

  if (error || rows.length === 0) {
    return {
      status: 'syntax_error',
      detectedFormat: 'csv',
      rawInputSanitized: csvText,
      provenance,
      errors: [
        {
          level: 'error',
          code: 'CSV_PARSE_ERROR',
          path: '$',
          message: error || 'No valid rows found in CSV.',
        },
      ],
      warnings: [],
      aiWarnings: [],
      aiErrors: [],
      canImport: false,
      message: error || 'CSV parse failed.',
    };
  }

  // Reconstruct full curriculum
  const doc = flatRowsToCurriculum(rows, {
    id: `csv-import-${Date.now()}`,
    title: 'CSV Imported Curriculum',
    description: `Imported from CSV flat table (${rows.length} rows).`,
  });

  doc.metadata = {
    ...(doc.metadata || {}),
    provenance,
    csvRowCount: rows.length,
  };

  const validation = validateCurriculumDocument(doc);

  return {
    status: validation.valid ? 'success' : 'validation_error',
    detectedFormat: 'csv',
    rawInputSanitized: csvText,
    curriculum: doc,
    provenance,
    validation,
    errors: validation.errors,
    warnings: validation.warnings,
    aiWarnings: [],
    aiErrors: [],
    canImport: validation.valid,
    message: validation.valid
      ? `CSV parsed successfully: Reconstructed ${validation.stats.subjectCount} subject(s) and ${validation.stats.topicCount} topic(s) from ${rows.length} flat rows.`
      : `CSV reconstructed hierarchy has ${validation.errors.length} validation error(s).`,
  };
}
