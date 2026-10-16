# Canonical Data Architecture & Specification

## 1. System Overview & Philosophy

This architecture defines the canonical data model for an academic curriculum-mapping and study-planning application.

### Fundamental Invariant: The Separation of Curriculum Location and Ranking Priority
Curriculum structure and ranking priority operate in two distinct, decoupled planes:
- **Curriculum Location (Canonical Tree):** A topic's physical location is determined solely by its academic hierarchy (e.g., `Mathematics` → `Grade 10` → `Unit 3: Quadratic Functions` → `Quadratic Equations`). This location is immutable with respect to user prioritization.
- **Ranking Priority (Independent Relational Layer):** A user's ranking of "Quadratic Equations" (e.g., S-tier, Priority 1, or Challenging) is stored in a separate `RankingAssignment` record referencing the topic's stable ID (`math-g10-u03-t04`). The topic is **never** moved out of its unit or duplicated across views.

This architecture enables:
1. A topic to appear simultaneously in its syllabus tree, in a subject-specific ranking view (e.g., Math Only), in a global All-Subjects ranking view, and in custom study sprint views without data duplication.
2. Multiple independent ranking profiles (e.g., *Entrance Exam Priority*, *Personal Difficulty*, *Review Priority*, *Sprint Study Sequence*) to co-exist without collision.
3. Complete compatibility with future VS-Code-style syllabus explorer trees, kanban tier boards, and priority lists.

---

## 2. Canonical JSON Schema Hierarchy

The primary source of truth is hierarchical JSON adhering to `curriculum.schema.json`.

```
CurriculumDocument
│
├── schemaVersion: 1
├── id: string
├── title: string
├── subjects: Subject[]
│   ├── id: string ("math", "physics", "aptitude", ...)
│   ├── name: string
│   ├── type: "academic" | "aptitude" | "custom"
│   └── groups: CurriculumGroup[]
│       ├── id: string ("math-g10", "apt-quant", ...)
│       ├── name: string ("Grade 10" or "Quantitative Reasoning")
│       ├── type: "grade" | "category" | "module" | "domain"
│       ├── units: Unit[] (Standard academic subjects)
│       │   ├── id: string ("math-g10-u03")
│       │   ├── name: string ("Unit 3: Quadratic Functions")
│       │   └── topics: Topic[]
│       │       ├── id: string ("math-g10-u03-t04")
│       │       ├── name: string ("Quadratic Equations")
│       │       ├── prerequisites: string[] (stable IDs, can cross grade/subject)
│       │       ├── source?: SourceInfo
│       │       ├── studyMetadata?: StudyMetadata
│       │       └── subtopics: Subtopic[]
│       │           ├── id: string ("math-g10-u03-t04-s01")
│       │           └── name: string
│       └── directTopics?: Topic[] (Aptitude & flat categories without intermediate units)
│
├── rankingProfiles: RankingProfile[]
│   ├── id: string ("profile-entrance-exam", "profile-sprint-order")
│   ├── name: string
│   ├── type: "tier" | "ordered"
│   ├── scope: "all_subjects" | "subject_specific" | "custom"
│   ├── targetSubjectId?: string (e.g., "math")
│   └── tiers?: RankingTier[] (for tier-based profiles: [{ id: "s", label: "S" }, ...])
│
└── rankingAssignments: RankingAssignment[]
    ├── id: string
    ├── rankingProfileId: string (references RankingProfile.id)
    ├── itemId: string (references Topic.id or Subtopic.id)
    ├── rank?: string (Tier ID, e.g. "s", for tier-based profiles)
    └── order?: number (Positive integer, e.g. 1, for ordered profiles)
```

---

## 3. Stable ID Conventions

Entities use immutable, human-readable semantic IDs to ensure readability and stability across renames:

| Entity | Pattern | Example |
| :--- | :--- | :--- |
| **Subject** | `[subject-code]` | `math`, `physics`, `aptitude` |
| **Grade (Group)** | `[subject]-g[grade]` | `math-g09`, `math-g10`, `math-g12` |
| **Category (Group)** | `apt-[category-slug]` | `apt-quant`, `apt-logic`, `apt-spatial` |
| **Unit** | `[group-id]-u[unit-num]` | `math-g10-u03` |
| **Topic** | `[unit-or-group]-t[num]` | `math-g10-u03-t04`, `apt-quant-t01` |
| **Subtopic** | `[topic-id]-s[num]` | `math-g10-u03-t04-s01` |
| **Ranking Profile** | `profile-[slug]` | `profile-entrance-exam`, `profile-math-focus` |
| **Ranking Assignment** | `ra-[profile-slug]-[hash/id]` | `ra-001`, `ra-math-02` |

> **Rename Safety:** If a user renames "Quadratic Equations" to "Second-Degree Polynomial Equations", only `topic.name` changes. The ID `math-g10-u03-t04` remains constant, preserving all rankings, prerequisites, and historical records.

---

## 4. Subject Hierarchy vs. Aptitude Flexibility

The data model supports two distinct organizational paradigms:

1. **Academic Subjects (Math, Physics, Chemistry, Biology, English):**
   Follows the natural progression: `Subject` → `Grade` (e.g., Grades 9–12) → `Unit` → `Topic` → `Subtopic`.
2. **Aptitude & Modular Learning:**
   Aptitude is **not** forced into artificial grades. Instead, it utilizes `CurriculumGroup` with `type: 'category'` (e.g., *Quantitative Reasoning*, *Logical Reasoning*, *Verbal Reasoning*, *Pattern Recognition*, *Data Interpretation*) and directly hosts topics without demanding artificial unit layers.

---

## 5. Prerequisite Architecture

Prerequisites are modeled as arrays of stable IDs (`prerequisites: string[]`):
- **Cross-Grade Dependencies:** A Grade 12 Calculus topic (`math-g12-u03-t03`) references Grade 10 Quadratic Equations (`math-g10-u03-t04`) and Grade 11 Trigonometry (`math-g11-u04-t02`).
- **Cross-Subject Dependencies:** A Grade 12 Physics Electromagnetic Induction topic (`phy-g12-u04-t02`) references Math Grade 11 Vectors (`math-g11-u02-t01`) and Math Grade 12 Calculus (`math-g12-u03-t03`).
- **Validation:** Circular dependencies and self-references are detected and rejected by `validateCurriculumDocument`.

---

## 6. Ranking System Architecture

### Tier Ranking vs. Ordered Ranking
The schema natively supports both paradigms:
- **Tier Ranking (`type: 'tier'`):**
  Defines arbitrary tiers (e.g., `S`, `A`, `B`, `C`, `D` or `High`, `Medium`, `Low`). Multiple topics can occupy the same tier.
- **Ordered Ranking (`type: 'ordered'`):**
  Defines a strict sequential progression ($1, 2, 3, \dots, N$) for day-by-day revision sprints where each position is unique.

### Multiple Ranking Profiles Example
The same topic `math-g10-u03-t04` (Quadratic Equations) simultaneously has:
1. `profile-entrance-exam` → `rank: "s"` (All-subjects tier ranking)
2. `profile-math-focus` → `rank: "tier-core"` (Math-only tier ranking)
3. `profile-sprint-order` → `order: 1` (Sprint sequential study ranking)
4. `profile-personal-difficulty` → `rank: "diff-med"` (Personal difficulty assessment)

---

## 7. Isolated Study & Source Metadata

Fields such as `mastery`, `difficulty`, `estimatedStudyMinutes`, `lastReviewedAt`, and `source` information (book title, page, OCR confidence) are encapsulated in `studyMetadata` and `source`. They are **never** treated as rank priorities, ensuring clean separation between curriculum attributes, learning telemetry, and manual prioritization.

---

## 8. Bidirectional CSV / Flat-Table Mapping Rules

While JSON is the canonical internal format, flat tabular formats (CSV) are supported losslessly via explicit parent linkage:

```csv
entityType,entityId,parentId,subjectId,groupId,unitId,topicId,subtopicId,name,order,prerequisites,customMetadataJson
subject,math,,math,,,,,,Mathematics,,,
group,math-g10,math,math,math-g10,,,,Grade 10,2,,
unit,math-g10-u03,math-g10,math,math-g10,math-g10-u03,,,Unit 3: Quadratic Functions,3,,
topic,math-g10-u03-t04,math-g10-u03,math,math-g10,math-g10-u03,math-g10-u03-t04,,Quadratic Equations,4,math-g09-u03-t02,
```

- **Lossless round-trip:** `curriculumToFlatRows()` and `flatRowsToCurriculum()` guarantee that importing a previously exported CSV reproduces the original hierarchy without orphaned nodes.
- **Prerequisites in CSV:** Represented as semicolon-separated IDs (e.g., `math-g10-u03-t04;math-g11-u04-t02`).
