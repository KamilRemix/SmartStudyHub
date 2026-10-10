import {
  callGemini,
  callOpenRouter,
  getGeminiApiKey,
  getOpenRouterApiKey,
  GEMINI_CANDIDATE_MODELS,
  OPENROUTER_FREE_MODELS,
} from './aiService';
import {
  callGigaChat,
  callGroq,
  callSambaNova,
} from './aiMultiProviderService';

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'open_ended';
  options?: string[];
  correctAnswer: string;
  explanation: string;
  topic: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questions: QuizQuestion[];
}

export interface QuizEvaluation {
  score: number;
  total: number;
  percentage: number;
  strongTopics: string[];
  weakTopics: string[];
  recommendations: string[];
  detailedResults: {
    question: QuizQuestion;
    userAnswer: string;
    isCorrect: boolean;
  }[];
}

export interface GenerateQuizParams {
  topic: string;
  questionCount?: number;
  type?: 'multiple_choice' | 'open_ended' | 'mixed';
  difficulty?: 'easy' | 'medium' | 'hard';
  imageBase64?: string;
  imageMimeType?: string;
}

export async function generateQuizFromAI(params: GenerateQuizParams): Promise<Quiz> {
  const count = params.questionCount || 5;
  const diff = params.difficulty || 'medium';
  const qType = params.type || 'multiple_choice';

  const systemPrompt = `You are an elite academic test designer and educator.
Create a structured quiz of exactly ${count} questions.
Difficulty level: ${diff}.
Question type preferred: ${qType}.
Target topic or uploaded material: "${params.topic || 'General Academic Mastery'}".
For math/science, ALWAYS format formulas with clean LaTeX ($...$ inline or $$...$$ display).

Strictly output ONLY a valid JSON object matching this schema without any markdown wrapping or extra comments:
{
  "title": "Short descriptive quiz title",
  "description": "Brief description of the test and skills checked",
  "difficulty": "${diff}",
  "questions": [
    {
      "id": "q1",
      "question": "Question text with LaTeX where applicable",
      "type": "multiple_choice",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "Clear explanation why this answer is correct",
      "topic": "Specific subtopic or skill name"
    }
  ]
}

If open_ended questions are requested, omit the "options" array or make "type": "open_ended" with a clear short "correctAnswer".
Ensure all questions are high quality, factual, educational, and unambiguous.`;

  const userPrompt = params.topic
    ? `Generate a test on: ${params.topic}`
    : 'Generate a test based on the attached image/text material.';

  // Try Gemini candidate models first
  const geminiKey = await getGeminiApiKey();
  if (geminiKey) {
    const userParts: any[] = [];
    if (params.imageBase64) {
      userParts.push({
        inlineData: {
          data: params.imageBase64,
          mimeType: params.imageMimeType || 'image/jpeg',
        },
      });
    }
    userParts.push({ text: userPrompt });

    const contents = [{ role: 'user', parts: userParts }];

    for (const model of GEMINI_CANDIDATE_MODELS) {
      try {
        const rawJson = await callGemini(contents, systemPrompt, model, geminiKey);
        const parsed = parseQuizJson(rawJson);
        if (parsed) return parsed;
      } catch (err: any) {
        console.warn(`[Quiz] Gemini ${model} failed:`, err?.message);
      }
    }
  }

  // 2. Cascade: GigaChat (Sberbank, fast and reliable in RU)
  if (!params.imageBase64) {
    try {
      const rawJson = await callGigaChat(
        [{ role: 'user', content: userPrompt }],
        systemPrompt
      );
      const parsed = parseQuizJson(rawJson);
      if (parsed) return parsed;
    } catch (err: any) {
      console.warn('[Quiz] GigaChat failed:', err?.message);
    }

    // 3. Cascade: Groq (Ultra-fast Llama 3.3)
    try {
      const rawJson = await callGroq(
        [{ role: 'user', content: userPrompt }],
        systemPrompt,
        'llama-3.3-70b-versatile'
      );
      const parsed = parseQuizJson(rawJson);
      if (parsed) return parsed;
    } catch (err: any) {
      console.warn('[Quiz] Groq failed:', err?.message);
    }

    // 4. Cascade: SambaNova (Llama 3.3 70B)
    try {
      const rawJson = await callSambaNova(
        [{ role: 'user', content: userPrompt }],
        systemPrompt,
        'Meta-Llama-3.3-70B-Instruct'
      );
      const parsed = parseQuizJson(rawJson);
      if (parsed) return parsed;
    } catch (err: any) {
      console.warn('[Quiz] SambaNova failed:', err?.message);
    }
  }

  // 5. Fallback to OpenRouter free models
  const openRouterKey = await getOpenRouterApiKey();
  if (openRouterKey) {
    const messages = [
      {
        role: 'user',
        content: userPrompt,
      },
    ];

    for (const model of OPENROUTER_FREE_MODELS) {
      try {
        const rawJson = await callOpenRouter(messages, systemPrompt, model, openRouterKey);
        const parsed = parseQuizJson(rawJson);
        if (parsed) return parsed;
      } catch (err: any) {
        console.warn(`[Quiz] OpenRouter ${model} failed:`, err?.message);
      }
    }
  }

  throw new Error('Не удалось сгенерировать тест. Проверьте интернет-соединение или повторите попытку.');
}

function parseQuizJson(raw: string): Quiz | null {
  try {
    let cleaned = raw.trim();
    // Strip markdown code fences if present
    cleaned = cleaned.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();

    const startIdx = cleaned.indexOf('{');
    const endIdx = cleaned.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      cleaned = cleaned.substring(startIdx, endIdx + 1);
    }

    const data = JSON.parse(cleaned);
    if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
      return null;
    }

    return {
      id: `quiz_${Date.now()}`,
      title: data.title || 'Тест по теме',
      description: data.description || 'Проверка знаний',
      difficulty: data.difficulty || 'medium',
      questions: data.questions.map((q: any, idx: number) => ({
        id: q.id || `q_${idx + 1}`,
        question: q.question || 'Вопрос',
        type: q.type === 'open_ended' ? 'open_ended' : 'multiple_choice',
        options: Array.isArray(q.options) ? q.options : undefined,
        correctAnswer: String(q.correctAnswer || '').trim(),
        explanation: q.explanation || 'Разбор ответа',
        topic: q.topic || 'Общие знания',
      })),
    };
  } catch (err) {
    console.warn('Failed to parse quiz JSON:', err, raw);
    return null;
  }
}

export function evaluateQuiz(
  quiz: Quiz,
  userAnswers: Record<string, string>
): QuizEvaluation {
  let score = 0;
  const topicStats: Record<string, { correct: number; total: number }> = {};
  const detailedResults: QuizEvaluation['detailedResults'] = [];

  quiz.questions.forEach((q) => {
    const rawAnswer = (userAnswers[q.id] || '').trim();
    const correctRaw = (q.correctAnswer || '').trim();

    let isCorrect = false;
    if (q.type === 'multiple_choice') {
      isCorrect = rawAnswer.toLowerCase() === correctRaw.toLowerCase();
    } else {
      // Open-ended normalization
      const cleanUser = rawAnswer.toLowerCase().replace(/[,.;\s]+/g, ' ').trim();
      const cleanCorrect = correctRaw.toLowerCase().replace(/[,.;\s]+/g, ' ').trim();
      isCorrect = cleanUser === cleanCorrect || cleanUser.includes(cleanCorrect) || cleanCorrect.includes(cleanUser);
    }

    if (isCorrect) score += 1;

    // Track by topic
    const topic = q.topic || 'Общие темы';
    if (!topicStats[topic]) {
      topicStats[topic] = { correct: 0, total: 0 };
    }
    topicStats[topic].total += 1;
    if (isCorrect) topicStats[topic].correct += 1;

    detailedResults.push({
      question: q,
      userAnswer: rawAnswer,
      isCorrect,
    });
  });

  const total = quiz.questions.length;
  const percentage = Math.round((score / total) * 100);

  const strongTopics: string[] = [];
  const weakTopics: string[] = [];
  const recommendations: string[] = [];

  Object.entries(topicStats).forEach(([topic, stats]) => {
    const ratio = stats.correct / stats.total;
    if (ratio >= 0.7) {
      strongTopics.push(`${topic} (${Math.round(ratio * 100)}%)`);
    } else {
      weakTopics.push(`${topic} (${Math.round(ratio * 100)}%)`);
      recommendations.push(`Повторите материалы по разделу: «${topic}»`);
    }
  });

  if (recommendations.length === 0) {
    recommendations.push('Отличный результат! Все ключевые разделы освоены на высоком уровне.');
  }

  return {
    score,
    total,
    percentage,
    strongTopics,
    weakTopics,
    recommendations,
    detailedResults,
  };
}

export function formatQuizForExport(quiz: Quiz, mode: 'teacher' | 'student'): string {
  const lines: string[] = [];

  lines.push(`========================================`);
  lines.push(`${quiz.title.toUpperCase()}`);
  lines.push(`Сложность: ${quiz.difficulty} | Вопросов: ${quiz.questions.length}`);
  lines.push(`Описание: ${quiz.description}`);
  lines.push(`========================================\n`);

  quiz.questions.forEach((q, idx) => {
    lines.push(`Вопрос ${idx + 1}: ${q.question}`);
    if (q.type === 'multiple_choice' && q.options) {
      q.options.forEach((opt, oIdx) => {
        const letter = String.fromCharCode(65 + oIdx);
        lines.push(`   ${letter}) ${opt}`);
      });
    } else {
      lines.push(`   [Поле для открытого ответа: _____________________]`);
    }

    if (mode === 'teacher') {
      lines.push(`   -> Ключ: ${q.correctAnswer}`);
      lines.push(`   -> Пояснение: ${q.explanation}`);
    }
    lines.push('');
  });

  if (mode === 'teacher') {
    lines.push(`\n----- КЛЮЧИ И СВОДКА ДЛЯ ПРЕПОДАВАТЕЛЯ -----`);
    quiz.questions.forEach((q, idx) => {
      lines.push(`${idx + 1}. ${q.correctAnswer} (Тема: ${q.topic})`);
    });
  }

  lines.push(`\nСгенерировано в SmartStudyHub`);
  return lines.join('\n');
}

/**
 * Format quiz to a beautifully styled, printable HTML document.
 * Can be saved as PDF or printed directly from browser / viewer.
 */
export function formatQuizToHtmlPrintable(quiz: Quiz, mode: 'teacher' | 'student'): string {
  const isTeacher = mode === 'teacher';
  const diffLabel =
    quiz.difficulty === 'easy'
      ? 'Базовый'
      : quiz.difficulty === 'hard'
      ? 'Олимпиадный / Экзамен'
      : 'Средний';

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>${quiz.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 36px; color: #1e293b; max-width: 820px; margin: 0 auto; line-height: 1.5; background: #ffffff; }
    h1 { font-size: 22px; margin-bottom: 6px; color: #0f172a; }
    .meta { font-size: 13px; color: #64748b; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; }
    .question { margin-bottom: 22px; page-break-inside: avoid; }
    .q-title { font-weight: 600; font-size: 15px; margin-bottom: 8px; color: #0f172a; }
    .options { margin-left: 18px; margin-top: 6px; }
    .opt { margin-bottom: 6px; font-size: 14px; }
    .answer-line { margin-top: 10px; border-bottom: 1px dotted #94a3b8; height: 26px; width: 340px; }
    .teacher-badge { background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; display: inline-block; margin-top: 6px; }
    .teacher-exp { font-size: 13px; color: #475569; margin-top: 3px; font-style: italic; }
    .footer { margin-top: 36px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
    @media print { body { padding: 10px; } }
  </style>
</head>
<body>
  <h1>${quiz.title}</h1>
  <div class="meta">
    Сложность: ${diffLabel} | Вопросов: ${quiz.questions.length} | 
    ${isTeacher ? 'Версия для учителя (с ключами ответов)' : 'Бланк для ученика'}
  </div>
  ${quiz.questions.map((q, idx) => `
    <div class="question">
      <div class="q-title">${idx + 1}. ${q.question}</div>
      ${q.type === 'multiple_choice' && q.options ? `
        <div class="options">
          ${q.options.map((opt, oIdx) => `<div class="opt">&#9634; ${String.fromCharCode(65 + oIdx)}) ${opt}</div>`).join('')}
        </div>
      ` : `
        <div class="answer-line"></div>
      `}
      ${isTeacher ? `
        <div><span class="teacher-badge">Правильный ответ: ${q.correctAnswer}</span></div>
        <div class="teacher-exp">Пояснение: ${q.explanation} (Тема: ${q.topic})</div>
      ` : ''}
    </div>
  `).join('')}
  <div class="footer">Сгенерировано в SmartStudyHub AI</div>
</body>
</html>`;
}
