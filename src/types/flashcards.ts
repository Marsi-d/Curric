/**
 * Types for Spaced Repetition (FSRS v4.5 & SM-2 fallback) and Flashcards.
 */

export type FSRSState = 0 | 1 | 2 | 3;
// 0: New
// 1: Learning
// 2: Review
// 3: Relearning

export type FSRSRating = 1 | 2 | 3 | 4;
// 1: Again
// 2: Hard
// 3: Good
// 4: Easy

export interface Flashcard {
  id: string;
  topicId: string;
  topicName?: string;
  subjectId?: string;
  subjectName?: string;
  front: string; // Question or Cloze front
  back: string;  // Answer or Explanation
  cardType?: 'standard' | 'cloze';
  tags?: string[];

  // FSRS Scheduling Metrics
  state: FSRSState;
  due: string;           // ISO timestamp when due
  stability: number;    // Estimated memory stability in days
  difficulty: number;   // Difficulty score 1.0 - 10.0
  elapsedDays: number;  // Days since previous review
  scheduledDays: number;// Scheduled interval in days
  reps: number;         // Total review repetitions
  lapses: number;       // Number of times rated Again
  lastReview?: string;  // ISO timestamp of last review
  suspended?: boolean;  // Suspended cards excluded from study
  createdAt: string;
  updatedAt: string;
}

export interface ReviewLog {
  id: string;
  cardId: string;
  topicId: string;
  rating: FSRSRating;
  state: FSRSState;
  due: string;
  stability: number;
  difficulty: number;
  reviewTime: string; // ISO timestamp
}

export interface DeckStats {
  newCount: number;
  learningCount: number;
  dueCount: number;
  totalCards: number;
  reviewedToday: number;
  retentionRate: number; // percentage 0 - 100
  streakDays: number;
}
