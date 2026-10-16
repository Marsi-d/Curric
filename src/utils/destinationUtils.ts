/**
 * Intelligent Destination Resolver for Curriculum JSON.
 *
 * Inspects any JSON payload (raw text, object, or AI extraction result),
 * extracts subject and grade/group references, and determines the exact
 * matching target destination in the user's CurriculumDocument.
 */

import { CurriculumDocument, Subject, CurriculumGroup } from '../types/curriculum';

export interface DetectedDestination {
  key: string;
  label: string;
  confidence: 'high' | 'medium';
}

/**
 * Strips markdown code fences (```json ... ```) safely.
 */
function cleanJsonText(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  return trimmed;
}

/**
 * Helper to match an input subject string against existing subjects in the document.
 */
function matchSubject(
  identifier: string | undefined,
  subjects: Subject[]
): Subject | undefined {
  if (!identifier || typeof identifier !== 'string') return undefined;
  const clean = identifier.trim().toLowerCase();

  // 1. Exact ID or Name match
  const exact = subjects.find(
    (s) => s.id.toLowerCase() === clean || s.name.toLowerCase() === clean
  );
  if (exact) return exact;

  // 2. Keyword / prefix heuristics
  if (clean.includes('math')) {
    return subjects.find((s) => s.id.includes('math') || s.name.toLowerCase().includes('math'));
  }
  if (clean.includes('physic') || clean.includes('chem') || clean.includes('bio') || clean.includes('sci')) {
    return subjects.find((s) => s.id.includes('sci') || s.name.toLowerCase().includes('sci'));
  }
  if (clean.includes('social') || clean.includes('history') || clean.includes('civic') || clean.includes('geograph')) {
    return subjects.find((s) => s.id.includes('social') || s.name.toLowerCase().includes('social'));
  }
  if (clean.includes('eng') || clean.includes('lit') || clean.includes('gramm')) {
    return subjects.find((s) => s.id.includes('eng') || s.name.toLowerCase().includes('eng'));
  }
  if (clean.includes('apt') || clean.includes('reason') || clean.includes('logic') || clean.includes('quant')) {
    return subjects.find((s) => s.type === 'aptitude' || s.id.includes('apt'));
  }

  // 3. Substring match
  return subjects.find(
    (s) => clean.includes(s.id.toLowerCase()) || s.name.toLowerCase().includes(clean)
  );
}

/**
 * Helper to match a group/grade string or number against groups in a subject.
 */
function matchGroup(
  identifier: string | number | undefined,
  groups: CurriculumGroup[]
): CurriculumGroup | undefined {
  if (identifier === undefined || identifier === null) return undefined;
  if (groups.length === 0) return undefined;

  const rawStr = String(identifier).trim().toLowerCase();

  // Extract numeric grade if present (e.g. "Grade 10", "g10", 10, "10th")
  const gradeMatch = rawStr.match(/\b(9|10|11|12)\b/) || rawStr.match(/g(9|10|11|12)/i);
  const gradeNum = gradeMatch ? parseInt(gradeMatch[1], 10) : undefined;

  // 1. Exact ID match
  const exactId = groups.find((g) => g.id.toLowerCase() === rawStr);
  if (exactId) return exactId;

  // 2. Numeric grade level match
  if (gradeNum !== undefined) {
    const byGrade = groups.find((g) => g.gradeLevel === gradeNum);
    if (byGrade) return byGrade;

    // Match by ID containing grade number (e.g. 'math-g10')
    const byIdGrade = groups.find((g) => g.id.includes(`g${gradeNum}`) || g.id.includes(`g0${gradeNum}`));
    if (byIdGrade) return byIdGrade;

    // Match by group name containing grade number
    const byNameGrade = groups.find((g) => g.name.includes(String(gradeNum)));
    if (byNameGrade) return byNameGrade;
  }

  // 3. Name substring match
  const byName = groups.find((g) => g.name.toLowerCase().includes(rawStr));
  if (byName) return byName;

  return undefined;
}

/**
 * Analyzes the JSON string and attempts to resolve the exact destination
 * within the given curriculum document.
 */
export function detectDestinationFromJson(
  jsonText: string,
  doc: CurriculumDocument
): DetectedDestination | null {
  if (!jsonText || !jsonText.trim()) return null;

  try {
    const cleaned = cleanJsonText(jsonText);
    const parsed = JSON.parse(cleaned);

    if (!parsed || typeof parsed !== 'object') return null;

    // Check for explicit targetDestination / destination config in JSON
    if (typeof parsed.destination === 'string') {
      const match = doc.subjects.find((s) => s.id === parsed.destination || parsed.destination.startsWith(`${s.id}:`));
      if (match) {
        return {
          key: parsed.destination,
          label: formatDestinationLabel(parsed.destination, doc),
          confidence: 'high',
        };
      }
    }

    // Check subjects array (direct or under curriculum property)
    const subjectsArray: any[] = Array.isArray(parsed.subjects)
      ? parsed.subjects
      : parsed.curriculum && Array.isArray(parsed.curriculum.subjects)
      ? parsed.curriculum.subjects
      : [];

    if (subjectsArray.length > 1) {
      // Multi-subject document -> destination is base folder append
      return {
        key: 'root:append',
        label: 'Base Folder (Multi-Subject Append)',
        confidence: 'high',
      };
    }

    if (subjectsArray.length === 1) {
      const subjObj = subjectsArray[0];
      const matchedSubject = matchSubject(subjObj.id || subjObj.name || subjObj.code, doc.subjects);

      if (matchedSubject) {
        // Aptitude has no grade groups
        if (matchedSubject.type === 'aptitude' || matchedSubject.groups.length === 0) {
          return {
            key: matchedSubject.id,
            label: `${matchedSubject.name} (Main Folder)`,
            confidence: 'high',
          };
        }

        // Check group in the subject
        if (Array.isArray(subjObj.groups) && subjObj.groups.length > 0) {
          const firstGrp = subjObj.groups[0];
          const matchedGrp = matchGroup(
            firstGrp.id || firstGrp.gradeLevel || firstGrp.name,
            matchedSubject.groups
          );
          if (matchedGrp) {
            return {
              key: `${matchedSubject.id}:${matchedGrp.id}`,
              label: `${matchedSubject.name} › ${matchedGrp.name}`,
              confidence: 'high',
            };
          }
        }

        // If no group in the subject payload, check units inside the group or subject
        if (matchedSubject.groups[0]) {
          return {
            key: `${matchedSubject.id}:${matchedSubject.groups[0].id}`,
            label: `${matchedSubject.name} › ${matchedSubject.groups[0].name}`,
            confidence: 'medium',
          };
        }

        return {
          key: matchedSubject.id,
          label: `${matchedSubject.name}`,
          confidence: 'medium',
        };
      }
    }

    // Top-level subject and grade properties: e.g. { subject: "Science", grade: 10, units: [...] }
    const topSubject = parsed.subject || parsed.subjectId || parsed.subjectName;
    const topGrade = parsed.grade || parsed.gradeLevel || parsed.group || parsed.groupId;

    if (topSubject) {
      const matchedSubject = matchSubject(topSubject, doc.subjects);
      if (matchedSubject) {
        if (matchedSubject.type === 'aptitude' || matchedSubject.groups.length === 0) {
          return {
            key: matchedSubject.id,
            label: `${matchedSubject.name} (Main Folder)`,
            confidence: 'high',
          };
        }

        const matchedGrp = matchGroup(topGrade, matchedSubject.groups);
        if (matchedGrp) {
          return {
            key: `${matchedSubject.id}:${matchedGrp.id}`,
            label: `${matchedSubject.name} › ${matchedGrp.name}`,
            confidence: 'high',
          };
        }

        if (matchedSubject.groups[0]) {
          return {
            key: `${matchedSubject.id}:${matchedSubject.groups[0].id}`,
            label: `${matchedSubject.name} › ${matchedSubject.groups[0].name}`,
            confidence: 'medium',
          };
        }
      }
    }

    // Check unit IDs or topic IDs for group prefix hints (e.g. "math-g10-u01" -> math-g10)
    const allUnits: any[] = Array.isArray(parsed.units) ? parsed.units : [];
    if (allUnits.length > 0 && typeof allUnits[0].id === 'string') {
      const uId = allUnits[0].id.toLowerCase();
      for (const subj of doc.subjects) {
        for (const grp of subj.groups) {
          if (uId.includes(grp.id.toLowerCase())) {
            return {
              key: `${subj.id}:${grp.id}`,
              label: `${subj.name} › ${grp.name}`,
              confidence: 'high',
            };
          }
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Formats destination key into human-readable label.
 */
export function formatDestinationLabel(destinationKey: string, doc: CurriculumDocument): string {
  if (destinationKey === 'root:replace') return 'Base Folder (Replace all)';
  if (destinationKey === 'root:append') return 'Base Folder (Append alongside)';

  const [subjectId, groupId] = destinationKey.split(':');
  const subject = doc.subjects.find((s) => s.id === subjectId);
  if (!subject) return destinationKey;

  if (groupId) {
    const group = subject.groups.find((g) => g.id === groupId);
    return `${subject.name} › ${group?.name || groupId}`;
  }

  return `${subject.name} (Main Folder)`;
}
