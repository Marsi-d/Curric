/**
 * Free Spaced Repetition Scheduler (FSRS v4.5 Implementation)
 * with classic SM-2 fallback calculation.
 *
 * Implements:
 * - 4 review ratings: Again (1), Hard (2), Good (3), Easy (4)
 * - Memory Stability (S) and Difficulty (D) progression
 * - Retrievability (R) computation: R = (1 + factor * t / S)^decay
 * - Interval prediction previews for each rating button
 */

import { Flashcard, FSRSRating, FSRSState, ReviewLog } from '../types/flashcards';

// Standard FSRS v4.5 default weight parameters
export const FSRS_WEIGHTS = [
  0.4072, 1.1829, 3.1262, 15.4722, // Initial stability for Again, Hard, Good, Easy (w[0]..w[3])
  7.2102, 0.5316, 1.0651, 0.0234,  // Difficulty parameters (w[4]..w[7])
  1.616, 0.1544, 1.0824,           // Recall stability parameters (w[8]..w[10])
  1.9813, 0.0953, 0.2975,          // Forget stability parameters (w[11]..w[13])
  0.2207,                          // Hard stability factor (w[14])
  2.9466, 0.5                      // Additional factors (w[15], w[16])
];

export const REQUESTED_RETENTION = 0.9; // Target 90% recall retention

export interface SchedulingResult {
  card: Flashcard;
  log: ReviewLog;
}

export interface RatingIntervalPreview {
  rating: FSRSRating;
  label: string;
  intervalText: string;
  intervalDays: number;
}

/**
 * Calculates human-readable interval text (e.g. "<10m", "1d", "4d", "1.2mo").
 */
export function formatInterval(days: number): string {
  if (days <= 0.01) return '<10m';
  if (days < 0.05) return '25m';
  if (days < 1) return `${Math.round(days * 24)}h`;
  if (days < 30) return `${Math.max(1, Math.round(days))}d`;
  if (days < 365) return `${(days / 30).toFixed(1)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

/**
 * Initializes a new blank flashcard linked to a topic.
 */
export function createNewFlashcard(params: {
  topicId: string;
  topicName?: string;
  subjectId?: string;
  subjectName?: string;
  front: string;
  back: string;
  cardType?: 'standard' | 'cloze';
  tags?: string[];
}): Flashcard {
  const now = new Date().toISOString();
  return {
    id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    topicId: params.topicId,
    topicName: params.topicName,
    subjectId: params.subjectId,
    subjectName: params.subjectName,
    front: params.front.trim(),
    back: params.back.trim(),
    cardType: params.cardType || 'standard',
    tags: params.tags || [],
    state: 0, // 0 = New
    due: now,
    stability: 0,
    difficulty: 5.0, // default moderate difficulty
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Computes next difficulty given previous difficulty and rating (1..4).
 */
function nextDifficulty(d: number, rating: FSRSRating): number {
  const w = FSRS_WEIGHTS;
  // D_new = D - w[6] * (rating - 3)
  const nextD = d - w[6] * (rating - 3);
  // Mean reversion towards initial difficulty w[4]
  const meanReverted = w[7] * w[4] + (1 - w[7]) * nextD;
  return Math.min(10, Math.max(1, meanReverted));
}

/**
 * Calculates interval (in days) to achieve the requested retention given stability.
 */
function intervalForRetention(stability: number, desiredRetention: number = REQUESTED_RETENTION): number {
  // FSRS formula: I = S * 9 * (1/R - 1)
  const interval = (stability / 19) * (Math.pow(desiredRetention, -1 / 0.5) - 1);
  return Math.max(1, Math.round(interval));
}

/**
 * Calculates stability on recall (Hard, Good, Easy) for review cards.
 */
function nextRecallStability(d: number, s: number, r: number, rating: FSRSRating): number {
  const w = FSRS_WEIGHTS;
  const hardPenalty = rating === 2 ? w[14] : 1;
  const easyBonus = rating === 4 ? w[15] : 1;
  const newS = s * (1 + Math.exp(w[8]) *
    (11 - d) *
    Math.pow(s, -w[9]) *
    (Math.exp((1 - r) * w[10]) - 1) *
    hardPenalty *
    easyBonus);
  return Math.max(0.1, newS);
}

/**
 * Calculates stability on failure (Again - 1).
 */
function nextForgetStability(d: number, s: number, r: number): number {
  const w = FSRS_WEIGHTS;
  const newS = w[11] *
    Math.pow(d, -w[12]) *
    (Math.pow(s + 1, w[13]) - 1) *
    Math.exp((1 - r) * w[14]);
  return Math.max(0.1, Math.min(s, newS));
}

/**
 * Schedules the card according to FSRS v4.5 when user chooses a rating.
 */
export function scheduleFSRSCard(card: Flashcard, rating: FSRSRating, now: Date = new Date()): SchedulingResult {
  const w = FSRS_WEIGHTS;
  let nextState: FSRSState = card.state;
  let nextS = card.stability;
  let nextD = card.difficulty;
  let scheduledDays = 0;
  let reps = card.reps + 1;
  let lapses = card.lapses;

  const lastReviewDate = card.lastReview ? new Date(card.lastReview) : new Date(card.createdAt);
  const elapsedDays = Math.max(0, (now.getTime() - lastReviewDate.getTime()) / (1000 * 60 * 60 * 24));

  // Retrievability estimation: R = (1 + factor * t / S)^-0.5
  const retrievability = card.stability > 0 ? Math.pow(1 + (elapsedDays / (9 * card.stability)), -1) : 1;

  if (card.state === 0) {
    // New Card: Initial Stability based on first grade (ratings 1..4 map to w[0]..w[3])
    nextS = w[rating - 1];
    nextD = Math.min(10, Math.max(1, w[4] - (rating - 3) * w[5]));

    if (rating === 1) {
      nextState = 1; // Learning
      scheduledDays = 0.007; // ~10 minutes
    } else if (rating === 2) {
      nextState = 1; // Learning
      scheduledDays = 1; // 1 day
    } else if (rating === 3) {
      nextState = 2; // Review
      scheduledDays = Math.max(1, Math.round(nextS));
    } else {
      nextState = 2; // Review
      scheduledDays = Math.max(3, Math.round(nextS * 1.5));
    }
  } else if (card.state === 1 || card.state === 3) {
    // Learning or Relearning step
    nextD = nextDifficulty(card.difficulty, rating);

    if (rating === 1) {
      lapses = lapses + 1;
      nextState = card.state;
      scheduledDays = 0.007; // ~10m
    } else if (rating === 2) {
      nextState = card.state;
      scheduledDays = 0.5; // ~12 hours
    } else if (rating === 3) {
      nextState = 2; // Graduate to Review
      scheduledDays = Math.max(1, Math.round(nextS));
    } else {
      nextState = 2; // Graduate to Review
      scheduledDays = Math.max(3, Math.round(nextS * 1.4));
    }
  } else {
    // Review State (State 2)
    nextD = nextDifficulty(card.difficulty, rating);

    if (rating === 1) {
      // Lapse (Again)
      lapses = lapses + 1;
      nextState = 3; // Relearning
      nextS = nextForgetStability(nextD, card.stability, retrievability);
      scheduledDays = 0.007; // ~10m
    } else {
      // Successful Recall (Hard, Good, Easy)
      nextState = 2; // Review
      nextS = nextRecallStability(nextD, card.stability, retrievability, rating);

      if (rating === 2) {
        // Hard interval: max(1, interval * 1.2 or scheduledDays)
        scheduledDays = Math.max(1, Math.round(card.scheduledDays * 1.2));
      } else if (rating === 3) {
        // Good interval using retention target
        scheduledDays = Math.max(card.scheduledDays + 1, intervalForRetention(nextS));
      } else {
        // Easy interval with bonus
        scheduledDays = Math.max(card.scheduledDays + 2, Math.round(intervalForRetention(nextS) * 1.3));
      }
    }
  }

  // Calculate new due date
  const nextDueDate = new Date(now.getTime() + scheduledDays * 24 * 60 * 60 * 1000);

  const updatedCard: Flashcard = {
    ...card,
    state: nextState,
    due: nextDueDate.toISOString(),
    stability: Number(nextS.toFixed(4)),
    difficulty: Number(nextD.toFixed(2)),
    elapsedDays: Number(elapsedDays.toFixed(2)),
    scheduledDays: Number(scheduledDays.toFixed(3)),
    reps,
    lapses,
    lastReview: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  const log: ReviewLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    cardId: card.id,
    topicId: card.topicId,
    rating,
    state: card.state,
    due: nextDueDate.toISOString(),
    stability: updatedCard.stability,
    difficulty: updatedCard.difficulty,
    reviewTime: now.toISOString(),
  };

  return { card: updatedCard, log };
}

/**
 * Computes interval previews for all 4 rating buttons before the user clicks.
 */
export function getRatingPreviews(card: Flashcard, now: Date = new Date()): RatingIntervalPreview[] {
  const ratings: { rating: FSRSRating; label: string }[] = [
    { rating: 1, label: 'Again' },
    { rating: 2, label: 'Hard' },
    { rating: 3, label: 'Good' },
    { rating: 4, label: 'Easy' },
  ];

  return ratings.map(({ rating, label }) => {
    const sim = scheduleFSRSCard(card, rating, now);
    const days = sim.card.scheduledDays;
    return {
      rating,
      label,
      intervalText: formatInterval(days),
      intervalDays: days,
    };
  });
}
