# Refinement Plan: UI Polish, AI Integration & Layout Consolidation

Address the 6 specific UI, layout, and feature refinements requested:

---

## 1. Top Bar Removal
- Remove `MobileTopBar` from `src/App.tsx` and delete/clean up the file.
- Restore the clean edge-to-edge layout without the extra header overhead.

---

## 2. Relocate "Add Tier" to Settings Page Near Presets
- On `src/components/workspace/RankingWorkspaceView.tsx`: remove the standalone "Add Tier" button from the top toolbar (while retaining inline "Add Tier Above/Below" in tier context menus).
- On `src/components/SettingsPage.tsx`: Add a dedicated, prominent **"Add Custom Tier"** action card directly adjacent to the **Tier System Preset** section.
  - Allows specifying the tier label (e.g., "S+", "Must Know", "Tier 1") and color palette picker.
  - Automatically appends the tier to the active ranking profile with instant persistence.

---

## 3. Roadmap & Import Top Bar Fixes + AI Roadmap Integration + Remove "on"
- **Roadmap Page (`src/components/roadmap/RoadmapWorkspaceView.tsx`)**:
  - Fix top bar layout: eliminate the large empty whitespace gap by rebalancing elements into a streamlined, high-density toolbar containing:
    - Profile selector
    - Phase sequencing progress
    - Unranked pool counter
    - **New Feature: AI Roadmap Generator & Optimizer**: Add an "AI Optimize Sequence" button directly into the roadmap toolbar. Clicking it opens a modal/sheet that analyzes curriculum prerequisites and automatically orders topics into sequenced learning phases (Fundamentals $\to$ Core $\to$ Advanced) via Gemini.
- **Import Page (`src/components/ImportPage.tsx`)**:
  - Fix top bar layout: expand destination selector and action tools across the header to eliminate empty gaps.
  - **Remove the useless "on" text/button** in the syllabus extraction prompt area.

---

## 4. Flashcards & AI Pages Visual Redesign + Direct AI Chat Access
- **Flashcards Page (`src/components/workspace/FlashcardWorkspaceView.tsx`)**:
  - Redesign the top header: replace the generic header with a clean, modern aesthetic with subtle borders and refined typography.
  - Redesign deck statistics cards (Due, New, Retention, Streak) into elegant, unified metric tiles.
  - Provide a 1-tap "AI Generate Cards" action right on the flashcard deck overview.
- **AI Page (`src/components/workspace/AILearningWorkspaceView.tsx`)**:
  - Redesign the header toolbar and tool tabs with clean modern styling.
  - Make **AI Tutor Chat** immediately accessible and prominent, with conversation history, suggested starter prompts (e.g. *"What are the most challenging topics in Math?"*, *"Create 5 flashcards for Physics"*), and streamlined input.

---

## 5. Move AI Button to Floating Blue Square Above Bottom Activity Bar
- In `src/components/workspace/ActivityBar.tsx`:
  - Remove the AI Tutor item from the bottom 6-column activity bar, bringing it back to a clean, spacious 5-item bar (Tier List, Roadmap, Flashcards, Import, Settings).
- In `src/App.tsx`:
  - Position a floating AI trigger button in the bottom-right corner:
    - Anchored right above the activity bar (`bottom-16 right-4 sm:bottom-20 sm:right-6`).
    - Styled as a sleek blue square with rounded corners (`w-11 h-11 sm:w-12 sm:h-12 bg-sky-600 hover:bg-sky-500 rounded-xl shadow-lg flex items-center justify-center text-white cursor-pointer transition-transform hover:scale-105 active:scale-95`).
    - Clicking toggles the AI Learning & Chat Suite tab/view or opens the contextual assistant.

---

## 6. Single Universal Icon Size Adjuster (Remove Separate Sliders)
- In `src/components/SettingsPage.tsx`:
  - Completely remove the complicated "Separately" mode, the 6 separate icon sliders, and the mode toggle button.
  - Replace with one clean **Universal Activity Bar Icon Size Slider** (with stepper buttons `-2px` / `+2px`, range slider 16px to 42px, and quick presets: Compact, Default, Large, Extra Large).
  - Syncs all activity bar icons uniformly.
