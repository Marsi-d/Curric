import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Google Gen AI client with GEMINI_API_KEY from environment
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({ apiKey });
}

function formatErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred.';
  if (typeof error.message === 'string') {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed?.error?.message) return parsed.error.message;
    } catch {}
    return error.message;
  }
  return String(error);
}

// Resilient helper: primary modern model gemini-3.8-flash with fallback to gemini-3.1-flash-lite
async function generateContentWithFallback(params: {
  contents: any;
  config?: any;
}) {
  if (!aiClient) {
    throw new Error('AI service temporarily unavailable (API key not configured in environment).');
  }

  const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const response = await aiClient.models.generateContent({
        ...params,
        model,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      console.warn(`[AI] Model ${model} encountered issue:`, formatErrorMessage(err));
    }
  }

  throw new Error(formatErrorMessage(lastError));
}

// 1. Generate Flashcards Endpoint
app.post('/api/ai/generate-flashcards', async (req, res) => {
  try {
    const { topicName, subjectName, notes, count = 5 } = req.body;
    if (!topicName) {
      return res.status(400).json({ error: 'topicName is required' });
    }

    if (!aiClient) {
      return res.status(503).json({
        error: 'AI service temporarily unavailable (API key not configured in environment).',
      });
    }

    const prompt = `You are an expert tutor creating high-yield active recall flashcards for spaced repetition.
Target Topic: "${topicName}"
${subjectName ? `Subject: "${subjectName}"` : ''}
${notes ? `User Notes / Source Materials: "${notes}"` : ''}

Generate exactly ${count} focused, unambiguous question-and-answer flashcards suitable for an Anki / FSRS spaced repetition system.
Rules:
1. Each card must test ONE atomic concept.
2. Front must be a clear prompt, question, or problem.
3. Back must be a concise, direct answer with key reasoning or formula.
4. If a concept is best tested via fill-in-the-blank / cloze deletion, mark cardType as "cloze" and use brackets {{like this}} on the front. Otherwise use "standard".
5. Return ONLY a valid JSON array of objects with the keys: "front", "back", "cardType" (either "standard" or "cloze").

Example output format:
[
  { "front": "What is the formula for quadratic roots?", "back": "x = (-b ± √(b² - 4ac)) / (2a)", "cardType": "standard" }
]`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '[]';
    const cards = JSON.parse(text);
    return res.json({ cards });
  } catch (error: any) {
    console.error('Flashcard generation error:', error);
    return res.status(500).json({ error: formatErrorMessage(error) || 'Failed to generate flashcards' });
  }
});

// 2. Generate Practice Quiz Questions
app.post('/api/ai/quiz', async (req, res) => {
  try {
    const { topicName, subjectName, count = 3 } = req.body;
    if (!topicName) {
      return res.status(400).json({ error: 'topicName is required' });
    }

    if (!aiClient) {
      return res.status(503).json({ error: 'AI service temporarily unavailable.' });
    }

    const prompt = `Generate a ${count}-question multiple choice quiz testing core mastery of "${topicName}" in "${subjectName || 'the curriculum'}".
Return a JSON array of questions where each object has:
- "question": string
- "options": array of 4 distinct choices
- "correctAnswer": string (must match one of the options exactly)
- "explanation": string explaining why the answer is correct

Return ONLY valid JSON.`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '[]';
    const questions = JSON.parse(text);
    return res.json({ questions });
  } catch (error: any) {
    console.error('Quiz generation error:', error);
    return res.status(500).json({ error: formatErrorMessage(error) || 'Failed to generate quiz' });
  }
});

// 3. Explain Concept / Difficult Topic
app.post('/api/ai/explain', async (req, res) => {
  try {
    const { topicName, subjectName, userQuery, mode = 'intuitive' } = req.body;
    if (!topicName) {
      return res.status(400).json({ error: 'topicName is required' });
    }

    if (!aiClient) {
      return res.status(503).json({ error: 'AI service temporarily unavailable.' });
    }

    const prompt = `You are a world-class academic tutor.
Explain the following topic: "${topicName}" (${subjectName || 'Curriculum'}).
User Question / Confusion: "${userQuery || 'Explain this from first principles with intuitive analogies and a practical example.'}"
Teaching style: ${mode === 'simplified' ? 'Simple, beginner-friendly analogy (ELI5)' : 'Rigorous first-principles with conceptual intuition, key formulas, and pitfalls'}.

Format your explanation with clean markdown headings, bullet points, and code/math blocks where helpful.`;

    const response = await generateContentWithFallback({
      contents: prompt,
    });

    return res.json({ explanation: response.text });
  } catch (error: any) {
    console.error('Explain concept error:', error);
    return res.status(500).json({ error: formatErrorMessage(error) || 'Failed to explain concept' });
  }
});

// 4. AI Roadmap Sequencer & Optimizer
app.post('/api/ai/optimize-roadmap', async (req, res) => {
  try {
    const { topics = [], profileName = 'Study Priority', strategy = 'pedagogical', phaseCount = 3 } = req.body;
    if (!topics.length) {
      return res.status(400).json({ error: 'Topics list is required' });
    }

    if (!aiClient) {
      return res.status(503).json({ error: 'AI service temporarily unavailable.' });
    }

    const strategyDescriptions: Record<string, string> = {
      pedagogical: 'Strict prerequisite ordering (Foundations -> Core Mechanics -> Advanced Mastery). Ensure introductory fundamentals appear in early phases.',
      exam: 'High-Yield Exam Focus: Prioritize heavily-tested, conceptually critical topics first, followed by supportive and supplementary topics.',
      balanced: 'Workload-Balanced: Distribute topics evenly across phases while respecting key prerequisites.',
    };

    const prompt = `You are an expert academic curriculum architect.
Organize the following academic topics into a structured, sequenced ${phaseCount}-phase study roadmap for profile "${profileName}".
Strategy Guideline: ${strategyDescriptions[strategy] || strategyDescriptions.pedagogical}

Topics list:
${JSON.stringify(topics.slice(0, 50))}

Rules:
1. Ensure prerequisite fundamentals come before advanced topics according to the strategy.
2. Every input topic ID must be assigned to exactly one phase. Do not invent topic IDs.
3. Return ONLY a valid JSON array of ${phaseCount} phases with:
   - "phaseTitle": string (e.g. "Phase 1: Foundations & Core Concepts")
   - "phaseSubtitle": string (brief pedagogical rationale for this phase)
   - "topicIds": array of strings (exact matching IDs from the input list)

Return ONLY valid JSON array.`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '[]';
    const phases = JSON.parse(text);
    return res.json({ phases });
  } catch (error: any) {
    console.error('Roadmap optimization error:', error);
    return res.status(500).json({ error: formatErrorMessage(error) || 'Failed to optimize roadmap' });
  }
});

// 4b. AI Phase Study Guide & Recommendations
app.post('/api/ai/phase-guide', async (req, res) => {
  try {
    const { phaseTitle, phaseSubtitle, topics = [] } = req.body;
    if (!phaseTitle) {
      return res.status(400).json({ error: 'phaseTitle is required' });
    }

    if (!aiClient) {
      return res.status(503).json({ error: 'AI service temporarily unavailable.' });
    }

    const prompt = `You are an academic study coach.
Create a high-impact, concise Study Guide for this roadmap phase:
Phase: "${phaseTitle}" (${phaseSubtitle || 'Curriculum milestone'})
Topics in this phase: ${topics.map((t: any) => t.name || t).join(', ')}

Provide:
1. **Core Milestone Objective** (1-2 sentences on what mastery looks like)
2. **Key Conceptual Pitfalls & Warnings** (2-3 common traps students make)
3. **Recommended Study Order & Strategy** (bulleted sequence)
4. **Estimated Study Time** (suggested hours to master)

Format in clean, scannable Markdown with clear headings.`;

    const response = await generateContentWithFallback({
      contents: prompt,
    });

    return res.json({ guide: response.text });
  } catch (error: any) {
    console.error('Phase guide error:', error);
    return res.status(500).json({ error: formatErrorMessage(error) || 'Failed to generate phase study guide' });
  }
});

// 5. Study Diagnostics & Knowledge Gap Analysis
app.post('/api/ai/analyze-gaps', async (req, res) => {
  try {
    const { stats, topicsSummary, weakTopics } = req.body;

    if (!aiClient) {
      return res.status(503).json({ error: 'AI service temporarily unavailable.' });
    }

    const prompt = `Analyze the student's spaced repetition study statistics and knowledge gaps:
- Total Cards: ${stats?.totalCards || 0}
- Retention Rate: ${stats?.retentionRate || 0}%
- Reviewed Today: ${stats?.reviewedToday || 0}
- Review Streak: ${stats?.streakDays || 0} days
- High Lapse / Weak Topics: ${JSON.stringify(weakTopics || [])}
- Ranked Curriculum Priorities: ${JSON.stringify(topicsSummary || [])}

Provide:
1. Executive Diagnostic (2-3 sentences on memory retention health)
2. Immediate Study Priority (top 3 topics requiring urgent active recall)
3. Spaced Repetition Advice (actionable adjustment to daily review schedule)
Format response in clean Markdown.`;

    const response = await generateContentWithFallback({
      contents: prompt,
    });

    return res.json({ analysis: response.text });
  } catch (error: any) {
    console.error('Gap analysis error:', error);
    return res.status(500).json({ error: formatErrorMessage(error) || 'Failed to analyze knowledge gaps' });
  }
});

// 5. Interactive Curriculum Chat & Assistant Action Execution
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, history = [], curriculumContext, isQuizRequest } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    if (!aiClient) {
      return res.status(503).json({ error: 'AI service temporarily unavailable.' });
    }

    const isQuiz = isQuizRequest || /\b(quiz|test me|practice questions|exam questions)\b/i.test(message);

    const systemInstruction = `You are the in-app AI Study Assistant for this Curriculum Mapping & Spaced Repetition platform.
You have complete knowledge of the user's active curriculum:
${JSON.stringify(curriculumContext || {})}

You can converse with the user, answer questions about their syllabus, help them master topics, plan study schedules, and offer to perform app actions.
When suggesting new flashcards, provide them in a clean fenced block \`\`\`json [ { "front": "...", "back": "...", "cardType": "standard" } ] \`\`\` so the app can offer a 1-click "Add to Deck" button.
${
  isQuiz
    ? `The user is requesting an interactive quiz. You MUST generate an interactive multiple-choice quiz with 3 to 4 questions.
Format the quiz payload strictly inside a fenced \`\`\`quiz block with valid JSON:
\`\`\`quiz
{
  "title": "${curriculumContext?.focusTopic || 'Curriculum'} Mastery Quiz",
  "topic": "${curriculumContext?.focusTopic || 'Topic'}",
  "questions": [
    {
      "id": "q1",
      "question": "Clear, unambiguous question text?",
      "options": ["A. First Option", "B. Second Option", "C. Third Option", "D. Fourth Option"],
      "correctAnswer": "A",
      "explanation": "Brief explanation of the correct answer."
    }
  ]
}
\`\`\`
Outside the \`\`\`quiz block, provide a short friendly message inviting the student to tap the interactive quiz card below to begin!`
    : ''
}
When the user submits completed quiz answers, provide real-time analytical feedback, congratulating high performance and explaining any concept gaps with memory mnemonics or tips.
Keep responses concise, high-yield, and focused on active learning.`;

    const contents = [
      ...history.map((h: any) => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    const response = await generateContentWithFallback({
      contents,
      config: {
        systemInstruction,
      },
    });

    return res.json({ reply: response.text });
  } catch (error: any) {
    console.error('AI chat error:', error);
    return res.status(500).json({ error: formatErrorMessage(error) || 'Failed to chat with AI' });
  }
});

// In development, mount Vite dev middleware; in production, serve static assets
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`Curriculum Planner full-stack server running on http://localhost:${port}`);
});
