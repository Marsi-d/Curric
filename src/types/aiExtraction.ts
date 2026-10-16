/**
 * AI Extraction Envelope and Provenance Types.
 *
 * Implements the contract between external AI syllabus extractors
 * and the canonical curriculum data architecture.
 */

import { CurriculumDocument, Subject } from './curriculum';

export type ExtractionStatus = 'success' | 'partial' | 'failed';

export interface ExtractionWarning {
  /** Categorical type (e.g. 'missing_pages', 'unclear_hierarchy', 'illegible_scan') */
  type: string;
  /** Human-readable explanation of the issue */
  message: string;
  /** Page or page range affected if known (e.g. '41-47', 12) */
  page?: number | string;
  /** Section, unit, or chapter affected */
  section?: string;
}

export interface ExtractionError {
  /** Categorical error code (e.g. 'unreadable_source', 'corrupted_file', 'no_syllabus_found') */
  type: string;
  /** Human-readable failure explanation */
  message: string;
  /** Page number or range if relevant */
  page?: number | string;
  /** Section affected if known */
  section?: string;
}

export interface TextbookSourceMetadata {
  /** Official title of the textbook or document */
  textbookTitle?: string;
  /** Primary subject name (e.g. 'Physics', 'Mathematics') */
  subject?: string;
  /** Target grade level or cohort (e.g. 'Grade 10', 10, 'AP / High School') */
  grade?: string | number;
  /** Edition identifier (e.g. '3rd Edition', '2024 Revised') */
  edition?: string;
  /** Publishing house or authoring organization */
  publisher?: string;
  /** Total page count of the source document */
  totalPages?: number;
  /** Specific pages or chapters analyzed by the AI (e.g. 'pp. 1-38 Table of Contents') */
  analyzedPages?: string;
  /** Original ISBN or catalog number if present */
  isbn?: string;
  /** Extraction notes or confidence remarks from the external model */
  extractionNotes?: string;
  /** Model confidence score (0.0 to 1.0) */
  confidence?: number;
}

/**
 * Top-level contract returned by external AI when extracting a textbook.
 * Strictly separates extraction status, warnings, errors, and curriculum data.
 */
export interface AIExtractionEnvelope {
  /** High-level outcome of the extraction */
  extractionStatus: ExtractionStatus;
  /** Schema version targeted by the extractor (must match CURRENT_SCHEMA_VERSION) */
  schemaVersion: number;
  /** Source textbook metadata captured from title pages / table of contents */
  source?: TextbookSourceMetadata;
  /**
   * Extracted curriculum hierarchy.
   * Can be a complete CurriculumDocument or an object containing subjects.
   */
  curriculum?: Partial<CurriculumDocument> & {
    subjects?: Subject[];
  };
  /** Explicit list of warnings when extraction is partial or uncertain */
  warnings?: ExtractionWarning[];
  /** Explicit list of errors when extraction failed or suffered critical flaws */
  errors?: ExtractionError[];
  /** Model or system notes */
  metadata?: Record<string, unknown>;
}

/**
 * Data provenance preserved on imported documents.
 * Marks unverified external data as requiring human review.
 */
export interface ImportProvenance {
  /** Ingestion vector */
  sourceType: 'external_ai' | 'json_file' | 'json_paste' | 'csv_file' | 'csv_paste';
  /** Timestamp of ingestion */
  importedAt: string;
  /** Extraction outcome reported by AI if applicable */
  aiExtractionStatus?: ExtractionStatus;
  /** Captured textbook metadata */
  textbookMetadata?: TextbookSourceMetadata;
  /** Flag emphasizing that imported data is source data needing human review */
  unverifiedSourceData: boolean;
  /** Warnings reported during extraction */
  warnings?: ExtractionWarning[];
  /** System notes */
  notes?: string;
}
