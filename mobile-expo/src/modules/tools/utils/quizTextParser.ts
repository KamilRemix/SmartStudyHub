import { Quiz, QuizQuestion } from '../../../services/quizService';

/**
 * Detects whether a plain text AI response contains an informal, non-fenced quiz/test
 * (e.g. numbered questions with options A, B, C, D or 1, 2, 3, 4).
 * If detected, transforms it into a structured Quiz object so the UI can render
 * an interactive Gemini-style quiz runner card instead of raw text.
 */
export function extractQuizFromPlainText(rawText: string): Quiz | null {
  if (!rawText || rawText.length < 50) return null;

  // If text already has code fences, don't parse as plain text
  if (rawText.includes('```quiz') || rawText.includes('```json')) {
    return null;
  }

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const questions: QuizQuestion[] = [];

  let currentQuestionText = '';
  let currentOptions: string[] = [];
  let currentAnswer = '';
  let currentExplanation = '';
  let detectedTitle = 'Тест для самопроверки';

  // Check for test title in top lines
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const l = lines[i];
    if (/тест|квиз|quiz|контрольн|проверк/i.test(l) && l.length < 80) {
      detectedTitle = l.replace(/^#+\s*/, '').replace(/[*_:]/g, '').trim();
      break;
    }
  }

  // Question regex: "1. Вопрос", "Вопрос 1:", "1) Вопрос", "**1. Вопрос**"
  const qRegex = /^(?:(?:\*\*|\b)?(?:Вопрос\s*)?(\d+)[.)\]:]|\*\*(?:Вопрос\s*)?(\d+)[.)\]:]\*\*)\s*(.+)$/i;

  // Option regex: "A) вариант", "1) вариант", "- A. вариант", "* а) вариант", "А.", "Б."
  const optRegex = /^(?:[-*•]\s*)?(?:\*\*|\()?([A-DА-Гa-dа-г1-4])[.)\]:]\)?(?:\*\*)?\s*(.+)$/i;

  // Answer regex: "Ответ: А", "Правильный ответ: B", "**Ответ**: C"
  const ansRegex = /^(?:(?:\*\*|#+)?(?:Правильный\s*)?ответ(?:а)?(?:\*\*)?[:\s-]+)\s*(.+)$/i;

  // Explanation regex: "Пояснение:", "Объяснение:"
  const expRegex = /^(?:(?:\*\*|#+)?(?:Пояснение|Объяснение)(?:\*\*)?[:\s-]+)\s*(.+)$/i;

  const commitQuestion = () => {
    if (currentQuestionText && (currentOptions.length >= 2 || currentAnswer)) {
      let finalAnswer = currentAnswer;

      // If user specified letter e.g. "B" or "Б", map to the actual option text
      if (finalAnswer && currentOptions.length > 0) {
        const cleanLetter = finalAnswer.replace(/[^A-DА-Г1-4]/gi, '').toUpperCase();
        const letterMap: Record<string, number> = {
          A: 0, B: 1, C: 2, D: 3,
          'А': 0, 'Б': 1, 'В': 2, 'Г': 3,
          '1': 0, '2': 1, '3': 2, '4': 3,
        };
        const optIdx = letterMap[cleanLetter];
        if (optIdx !== undefined && currentOptions[optIdx]) {
          finalAnswer = currentOptions[optIdx];
        }
      }

      // If still no answer found, default to first option
      if (!finalAnswer && currentOptions.length > 0) {
        finalAnswer = currentOptions[0];
      }

      questions.push({
        id: `q_${questions.length + 1}`,
        question: currentQuestionText,
        type: currentOptions.length >= 2 ? 'multiple_choice' : 'open_ended',
        options: currentOptions.length >= 2 ? currentOptions : undefined,
        correctAnswer: finalAnswer,
        explanation: currentExplanation || 'Разбор и проверка задания',
        topic: detectedTitle,
      });
    }

    currentQuestionText = '';
    currentOptions = [];
    currentAnswer = '';
    currentExplanation = '';
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const qMatch = line.match(qRegex);
    if (qMatch) {
      commitQuestion();
      currentQuestionText = (qMatch[3] || '').replace(/[*_]/g, '').trim();
      continue;
    }

    const optMatch = line.match(optRegex);
    if (optMatch && currentQuestionText) {
      const optText = (optMatch[2] || '').trim();
      if (optText) {
        currentOptions.push(optText);
      }
      continue;
    }

    const ansMatch = line.match(ansRegex);
    if (ansMatch) {
      currentAnswer = (ansMatch[1] || '').trim();
      continue;
    }

    const expMatch = line.match(expRegex);
    if (expMatch) {
      currentExplanation = (expMatch[1] || '').trim();
      continue;
    }
  }

  // Commit last question
  commitQuestion();

  // If we found at least 2 structured questions, convert this to an interactive quiz!
  if (questions.length >= 2) {
    return {
      id: `quiz_${Date.now()}`,
      title: detectedTitle,
      description: 'Интерактивный тест, составленный ИИ-ассистентом',
      difficulty: 'medium',
      questions,
    };
  }

  return null;
}
