import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
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
  callPollinationsAI,
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
    feedback?: string;
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
        const rawJson = await callGemini(contents, systemPrompt, model, geminiKey, 'application/json');
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

    // 3. Cascade: Groq (Ultra-fast OpenAI GPT-OSS / Qwen)
    try {
      const rawJson = await callGroq(
        [{ role: 'user', content: userPrompt }],
        systemPrompt,
        'openai/gpt-oss-120b'
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

  // 6. Zero-key ultra-reliable fallback via Pollinations AI (GPT-OSS)
  try {
    const rawJson = await callPollinationsAI(
      [{ role: 'user', content: userPrompt }],
      systemPrompt,
      'openai-fast'
    );
    const parsed = parseQuizJson(rawJson);
    if (parsed) return parsed;
  } catch (err: any) {
    console.warn('[Quiz] Pollinations fallback failed:', err?.message);
  }

  throw new Error('Не удалось сгенерировать тест. Проверьте интернет-соединение или повторите попытку.');
}

function parseQuizJson(raw: string): Quiz | null {
  try {
    let cleaned = raw.trim();
    // Strip markdown code fences if present
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    const startIdx = cleaned.indexOf('{');
    const endIdx = cleaned.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      cleaned = cleaned.substring(startIdx, endIdx + 1);
    }

    // Fix unescaped backslashes in JSON strings (common for LaTeX formulas like \frac, \sqrt, \alpha, \sum)
    cleaned = cleaned.replace(/\\(?!["\\/bfnrtu]|u[0-9a-fA-F]{4})/g, '\\\\');

    // Strip trailing commas before } or ]
    cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

    let data: any = null;
    try {
      data = JSON.parse(cleaned);
    } catch {
      data = JSON.parse(raw.substring(startIdx, endIdx + 1));
    }

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
        options: Array.isArray(q.options) && q.options.length > 0 ? q.options : undefined,
        correctAnswer: String(q.correctAnswer || '').trim(),
        explanation: q.explanation || 'Разбор ответа',
        topic: q.topic || 'Общие знания',
      })),
    };
  } catch (err) {
    console.warn('Failed to parse quiz JSON:', err, raw);
    // Robust fallback: try regex question extractor
    try {
      const questions: QuizQuestion[] = [];
      const qBlockRegex = /"question"\s*:\s*"([^"]+)"[\s\S]*?"correctAnswer"\s*:\s*"([^"]+)"/g;
      let m: RegExpExecArray | null;
      let qIdx = 1;
      while ((m = qBlockRegex.exec(raw)) !== null) {
        questions.push({
          id: `q_${qIdx}`,
          question: m[1],
          type: 'open_ended',
          correctAnswer: m[2],
          explanation: 'Правильный ответ к заданию',
          topic: 'Академическая проверка',
        });
        qIdx++;
      }
      if (questions.length > 0) {
        return {
          id: `quiz_${Date.now()}`,
          title: 'Тест по выбранной теме',
          description: 'Проверка знаний',
          difficulty: 'medium',
          questions,
        };
      }
    } catch {}

    return null;
  }
}

/**
 * Smart stem extraction for Russian and English words
 * Removes common grammatical inflection suffixes so words like
 * "падения", "падению", "падение", "падать" all match "паден".
 */
export function extractWordStem(word: string): string {
  let w = word.toLowerCase().trim();
  w = w.replace(/^[^a-zа-яё0-9]+|[^a-zа-яё0-9]+$/gi, '');
  if (w.length <= 3) return w;

  // Russian inflections
  w = w.replace(/(ами|ями|ов|ев|ей|ий|ый|ого|его|ому|ему|ым|им|ом|ем|ах|ях|ую|юю|ое|ее|ие|ые|ся|сь|ть|ти|л|ла|ло|ли|ет|ут|ют|ит|ат|ят|ну|ешь|ишь|ете|ите|а|я|о|е|у|ю|ы|и)$/gi, '');
  // English inflections
  w = w.replace(/(ing|ed|es|s|ly|tion|ment)$/gi, '');
  return w;
}

/**
 * Intelligent semantic & token overlap evaluation for open-ended answers
 * Used for offline grading and instant fallback without requiring word-for-word string match.
 */
export function evaluateOpenEndedHeuristic(userAnswer: string, expectedAnswer: string): boolean {
  if (!userAnswer || !expectedAnswer) return false;

  const cleanUser = userAnswer.toLowerCase().trim();
  const cleanExpected = expectedAnswer.toLowerCase().trim();

  // 1. Direct or substring match
  if (cleanUser === cleanExpected || cleanUser.includes(cleanExpected) || cleanExpected.includes(cleanUser)) {
    return true;
  }

  // 2. Numeric / quantitative check: if the expected answer has numbers, check if the student included them
  const expectedNumbers = expectedAnswer.match(/\b\d+(?:[.,]\d+)?\b/g);
  const userNumbers = userAnswer.match(/\b\d+(?:[.,]\d+)?\b/g);
  if (expectedNumbers && expectedNumbers.length > 0) {
    const allNumbersPresent = expectedNumbers.every((num) => userNumbers?.includes(num));
    if (allNumbersPresent && (expectedNumbers.length >= 2 || cleanUser.length <= 15)) {
      return true;
    }
  }

  // 3. Extract meaningful word stems (>2 chars, skip small stop words)
  const stopWords = new Set([
    'и', 'в', 'во', 'не', 'что', 'он', 'на', 'я', 'с', 'со', 'как', 'а', 'то', 'все',
    'так', 'его', 'но', 'да', 'ты', 'к', 'ко', 'у', 'же', 'вы', 'за', 'бы', 'по',
    'ее', 'мне', 'было', 'вот', 'от', 'меня', 'еще', 'нет', 'о', 'об', 'из', 'ему',
    'это', 'этот', 'эта', 'эти', 'этого', 'the', 'a', 'an', 'is', 'are', 'in', 'of', 'to'
  ]);

  const getStems = (text: string) =>
    text
      .toLowerCase()
      .split(/[\s,.;:!?()«»"'\-\/]+/)
      .map(extractWordStem)
      .filter((s) => s.length >= 2 && !stopWords.has(s));

  const expectedStems = getStems(expectedAnswer);
  const userStems = new Set(getStems(userAnswer));

  if (expectedStems.length === 0) {
    return cleanUser.length > 0;
  }

  // Count how many key concepts from expected answer are present in the student's answer
  let matchedStems = 0;
  for (const stem of expectedStems) {
    if (userStems.has(stem)) {
      matchedStems++;
    } else {
      for (const uStem of userStems) {
        if (uStem.startsWith(stem) || stem.startsWith(uStem)) {
          matchedStems++;
          break;
        }
      }
    }
  }

  const overlapRatio = matchedStems / expectedStems.length;
  // If at least 35% of key concepts match (or at least 2 key stems for short answers), it's correct!
  return overlapRatio >= 0.35 || (expectedStems.length >= 2 && matchedStems >= 2);
}

/**
 * AI-powered semantic answer grader
 * Evaluates student answers using LLM to understand meaning, synonyms, and paraphrasing.
 */
export async function evaluateOpenEndedAnswerWithAI(
  question: QuizQuestion,
  userAnswer: string
): Promise<{ isCorrect: boolean; feedback: string }> {
  if (!userAnswer || userAnswer.trim().length === 0) {
    return { isCorrect: false, feedback: 'Ответ не был дан.' };
  }

  // Quick heuristic check: if exact or strong match, approve immediately
  const heuristicPassed = evaluateOpenEndedHeuristic(userAnswer, question.correctAnswer);
  if (heuristicPassed && userAnswer.trim().length < 40) {
    return { isCorrect: true, feedback: 'Отличный верный ответ!' };
  }

  const systemPrompt = `You are a fair, expert academic teacher evaluating a student's open-ended answer.
Question: "${question.question}"
Expected reference answer: "${question.correctAnswer}"
Student's response: "${userAnswer}"

Evaluation Rules:
1. Be lenient and fair. Students phrase answers in their own words, use synonyms, different word forms, or summarize.
2. If the student correctly captures the core essence, concept, facts, or scientific principle of the question, mark isCorrect: true.
3. If the answer is factually incorrect, misses the core concept, or is irrelevant, mark isCorrect: false.
4. Provide a brief encouraging explanation or feedback in Russian (1-2 sentences).

Strictly output ONLY a valid JSON object matching this schema without any markdown formatting:
{"isCorrect": true, "feedback": "Краткий отзыв на русском"}`;

  try {
    // 1. Try Gemini
    const geminiKey = await getGeminiApiKey();
    if (geminiKey) {
      const res = await callGemini(
        [{ role: 'user', parts: [{ text: 'Evaluate the student answer now.' }] }],
        systemPrompt,
        'gemini-2.5-flash',
        geminiKey,
        'application/json'
      );
      const cleaned = res.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      if (typeof parsed?.isCorrect === 'boolean') {
        return {
          isCorrect: parsed.isCorrect,
          feedback: parsed.feedback || (parsed.isCorrect ? 'Ответ верный по смыслу.' : 'Ответ не совсем точный.'),
        };
      }
    }
  } catch (err: any) {
    console.warn('[Quiz AI Evaluation] Gemini error:', err?.message);
  }

  // 2. Try fast free Pollinations AI fallback
  try {
    const res = await callPollinationsAI(
      [{ role: 'user', content: 'Evaluate the student answer now.' }],
      systemPrompt,
      'openai-fast'
    );
    const cleaned = res.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    const startIdx = cleaned.indexOf('{');
    const endIdx = cleaned.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1) {
      const parsed = JSON.parse(cleaned.substring(startIdx, endIdx + 1));
      if (typeof parsed?.isCorrect === 'boolean') {
        return {
          isCorrect: parsed.isCorrect,
          feedback: parsed.feedback || (parsed.isCorrect ? 'Ответ верный по смыслу.' : 'Ответ не совсем точный.'),
        };
      }
    }
  } catch (err: any) {
    console.warn('[Quiz AI Evaluation] Pollinations error:', err?.message);
  }

  // 3. Fallback to heuristic
  const isCorrect = heuristicPassed;
  return {
    isCorrect,
    feedback: isCorrect
      ? 'Ответ принят по ключевым понятиям.'
      : 'Ключевые понятия темы не обнаружены.',
  };
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
    let feedback = '';

    if (q.type === 'multiple_choice') {
      isCorrect = rawAnswer.toLowerCase() === correctRaw.toLowerCase();
      feedback = isCorrect ? 'Верный выбор варианта' : `Правильный ответ: ${q.correctAnswer}`;
    } else {
      isCorrect = evaluateOpenEndedHeuristic(rawAnswer, correctRaw);
      feedback = isCorrect ? 'Ответ принят по смыслу' : `Ожидаемый ответ: ${q.correctAnswer}`;
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
      feedback,
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

/**
 * Asynchronous full quiz evaluation with AI grading for open-ended questions
 */
export async function evaluateQuizAsync(
  quiz: Quiz,
  userAnswers: Record<string, string>
): Promise<QuizEvaluation> {
  let score = 0;
  const topicStats: Record<string, { correct: number; total: number }> = {};

  const evalPromises = quiz.questions.map(async (q) => {
    const rawAnswer = (userAnswers[q.id] || '').trim();
    const correctRaw = (q.correctAnswer || '').trim();

    let isCorrect = false;
    let feedback = '';

    if (q.type === 'multiple_choice') {
      isCorrect = rawAnswer.toLowerCase() === correctRaw.toLowerCase();
      feedback = isCorrect ? 'Верный выбор варианта' : `Правильный ответ: ${q.correctAnswer}`;
    } else {
      const aiEval = await evaluateOpenEndedAnswerWithAI(q, rawAnswer);
      isCorrect = aiEval.isCorrect;
      feedback = aiEval.feedback;
    }

    return {
      question: q,
      userAnswer: rawAnswer,
      isCorrect,
      feedback,
    };
  });

  const detailedResults = await Promise.all(evalPromises);

  detailedResults.forEach((res) => {
    if (res.isCorrect) score += 1;

    const topic = res.question.topic || 'Общие темы';
    if (!topicStats[topic]) {
      topicStats[topic] = { correct: 0, total: 0 };
    }
    topicStats[topic].total += 1;
    if (res.isCorrect) topicStats[topic].correct += 1;
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

/**
 * Format quiz to a standard Microsoft Word compatible document format (.doc / .docx)
 * Includes Office Word XML namespaces, page margins, typography, and styling.
 */
export function formatQuizToWordDoc(quiz: Quiz, mode: 'teacher' | 'student'): string {
  const isTeacher = mode === 'teacher';
  const diffLabel =
    quiz.difficulty === 'easy'
      ? 'Базовый'
      : quiz.difficulty === 'hard'
      ? 'Олимпиадный / Экзамен'
      : 'Средний';

  return `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>${quiz.title}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      size: A4 portrait;
      margin: 2cm 2cm 2cm 2cm;
      mso-page-orientation: portrait;
    }
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
    }
    h1 {
      font-size: 18pt;
      font-weight: bold;
      color: #1e3a8a;
      margin-bottom: 4pt;
    }
    .meta-table {
      width: 100%;
      border-bottom: 1.5pt solid #cbd5e1;
      padding-bottom: 8pt;
      margin-bottom: 16pt;
      font-size: 10pt;
      color: #64748b;
    }
    .question-block {
      margin-bottom: 14pt;
      page-break-inside: avoid;
    }
    .q-number {
      font-weight: bold;
      color: #1e40af;
      font-size: 11.5pt;
    }
    .q-text {
      font-size: 11pt;
      margin-bottom: 6pt;
    }
    .opt-list {
      margin-left: 20pt;
      margin-bottom: 6pt;
    }
    .opt-item {
      margin-bottom: 3pt;
      font-size: 10.5pt;
    }
    .open-answer-box {
      border-bottom: 1pt dashed #94a3b8;
      height: 24pt;
      margin-top: 8pt;
      margin-bottom: 6pt;
      width: 80%;
    }
    .teacher-box {
      background-color: #f1f5f9;
      border-left: 3pt solid #3b82f6;
      padding: 6pt 10pt;
      margin-top: 6pt;
      font-size: 10pt;
    }
    .teacher-key {
      font-weight: bold;
      color: #1e40af;
    }
    .teacher-exp {
      color: #475569;
      font-style: italic;
      margin-top: 2pt;
    }
    .footer {
      margin-top: 24pt;
      border-top: 1pt solid #e2e8f0;
      padding-top: 6pt;
      font-size: 9pt;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <h1>${quiz.title}</h1>
  <table class='meta-table'>
    <tr>
      <td><strong>Сложность:</strong> ${diffLabel}</td>
      <td><strong>Количество вопросов:</strong> ${quiz.questions.length}</td>
      <td align='right'><strong>Тип:</strong> ${isTeacher ? 'Версия для учителя (с ответами)' : 'Бланк заданий'}</td>
    </tr>
  </table>

  ${quiz.questions.map((q, idx) => `
    <div class='question-block'>
      <div class='q-text'><span class='q-number'>Вопрос ${idx + 1}.</span> ${q.question}</div>
      ${q.type === 'multiple_choice' && q.options ? `
        <div class='opt-list'>
          ${q.options.map((opt, oIdx) => `<div class='opt-item'>&#9634; ${String.fromCharCode(65 + oIdx)}) ${opt}</div>`).join('')}
        </div>
      ` : `
        <div class='open-answer-box'></div>
      `}
      ${isTeacher ? `
        <div class='teacher-box'>
          <div class='teacher-key'>Правильный ответ: ${q.correctAnswer}</div>
          <div class='teacher-exp'>Пояснение: ${q.explanation} (Раздел: ${q.topic})</div>
        </div>
      ` : ''}
    </div>
  `).join('')}

  <div class='footer'>Сгенерировано в SmartStudyHub AI • Учебная платформа</div>
</body>
</html>`;
}

/**
 * Exports quiz to PDF file and opens native system share/save dialog
 */
export async function exportQuizToPdfAsync(
  quiz: Quiz,
  mode: 'teacher' | 'student'
): Promise<{ uri: string }> {
  const html = formatQuizToHtmlPrintable(quiz, mode);
  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Сохранить тест в PDF: ${quiz.title}`,
      UTI: 'com.adobe.pdf',
    });
  }
  return { uri };
}

/**
 * Exports quiz to Microsoft Word DOCX / DOC document and opens native share dialog
 */
export async function exportQuizToDocxAsync(
  quiz: Quiz,
  mode: 'teacher' | 'student'
): Promise<{ uri: string }> {
  const docContent = formatQuizToWordDoc(quiz, mode);
  const cleanTitle = quiz.title.replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_').substring(0, 30);
  const suffix = mode === 'teacher' ? '_teacher' : '_student';
  const fileName = `${cleanTitle}${suffix}.doc`;

  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, docContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/msword',
      dialogTitle: `Сохранить тест в Word (.doc): ${quiz.title}`,
      UTI: 'com.microsoft.word.doc',
    });
  }

  return { uri: fileUri };
}
