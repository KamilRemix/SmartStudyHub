import {
  formatLatexToReadable,
  extractMainFraction,
} from '../../src/modules/tools/utils/latexFormatter';
import {
  buildPersonalizedSystemInstruction,
  AIPersonalization,
} from '../../src/services/aiPersonalizationService';
import {
  OPENROUTER_FREE_MODELS,
  GEMINI_CANDIDATE_MODELS,
  DEFAULT_OPENROUTER_KEY,
} from '../../src/services/aiService';
import {
  Quiz,
  evaluateQuiz,
  formatQuizForExport,
} from '../../src/services/quizService';

describe('AI Improvements, LaTeX, Vision & Quiz Tests', () => {
  describe('LaTeX Formatter', () => {
    it('converts fractions into readable slash format', () => {
      const res = formatLatexToReadable('\\frac{a}{b}');
      expect(res).toBe('a / b');
    });

    it('extracts main fraction for vertical fraction layout', () => {
      const fraction = extractMainFraction('\\frac{x^2 + 1}{2x}');
      expect(fraction).not.toBeNull();
      expect(fraction?.numerator).toContain('x² + 1');
      expect(fraction?.denominator).toContain('2x');
    });

    it('formats superscripts, Greek letters and operators', () => {
      const res = formatLatexToReadable('E = mc^2 + \\alpha \\cdot \\beta \\pm \\gamma');
      expect(res).toContain('mc²');
      expect(res).toContain('α');
      expect(res).toContain('β');
      expect(res).toContain('γ');
      expect(res).toContain('±');
    });

    it('formats square roots with indices', () => {
      const res = formatLatexToReadable('\\sqrt{x} + \\sqrt[3]{y}');
      expect(res).toBe('√(x) + ³√(y)');
    });
  });

  describe('Personalization System Instruction Builder', () => {
    it('includes user custom instructions when enabled', () => {
      const profile: AIPersonalization = {
        instructions: 'I am a physics undergraduate. Always use LaTeX formulas and detailed derivations.',
        enabled: true,
      };

      const prompt = buildPersonalizedSystemInstruction(profile);
      expect(prompt).toContain('[USER CUSTOM INSTRUCTIONS & PERSISTENT CONTEXT]');
      expect(prompt).toContain('physics undergraduate');
      expect(prompt).toContain('detailed derivations');
    });

    it('returns base instruction when personalization is disabled or empty', () => {
      const profile: AIPersonalization = {
        instructions: 'I am a student',
        enabled: false,
      };

      const prompt = buildPersonalizedSystemInstruction(profile);
      expect(prompt).not.toContain('[USER CUSTOM INSTRUCTIONS & PERSISTENT CONTEXT]');
      expect(prompt).not.toContain('I am a student');
    });
  });

  describe('AI Models & OpenRouter Free Tier Fallback', () => {
    it('has modern Gemini models in candidate list', () => {
      expect(GEMINI_CANDIDATE_MODELS).toContain('gemini-3.8-flash');
      expect(GEMINI_CANDIDATE_MODELS).toContain('gemini-2.5-flash');
    });

    it('strictly contains only 0-budget :free models in OpenRouter fallback', () => {
      expect(OPENROUTER_FREE_MODELS.length).toBeGreaterThan(0);
      OPENROUTER_FREE_MODELS.forEach((m) => {
        expect(m.endsWith(':free')).toBe(true);
      });
    });

    it('has default OpenRouter API key configured', () => {
      expect(DEFAULT_OPENROUTER_KEY).toBeDefined();
      expect(DEFAULT_OPENROUTER_KEY.startsWith('sk-or-v1')).toBe(true);
    });
  });

  describe('Quiz Service Evaluation and Export', () => {
    const mockQuiz: Quiz = {
      id: 'quiz_test',
      title: 'Тест по механике',
      description: 'Базовый курс механики',
      difficulty: 'medium',
      questions: [
        {
          id: 'q1',
          question: 'Формула второго закона Ньютона: $F = ?$',
          type: 'multiple_choice',
          options: ['ma', 'mv', 'm/a', 'mg/2'],
          correctAnswer: 'ma',
          explanation: 'Второй закон Ньютона связывает силу, массу и ускорение: F = ma.',
          topic: 'Динамика',
        },
        {
          id: 'q2',
          question: 'Скорость при равномерном прямолинейном движении постоянна?',
          type: 'multiple_choice',
          options: ['Да', 'Нет'],
          correctAnswer: 'Да',
          explanation: 'По определению равномерного движения скорость не меняется.',
          topic: 'Кинематика',
        },
        {
          id: 'q3',
          question: 'Единица измерения работы в СИ?',
          type: 'open_ended',
          correctAnswer: 'Джоуль',
          explanation: 'Работа и энергия в СИ измеряются в Джоулях (Дж).',
          topic: 'Энергия',
        },
      ],
    };

    it('evaluates perfect score correctly and identifies strong topics', () => {
      const userAnswers = {
        q1: 'ma',
        q2: 'Да',
        q3: 'Джоуль',
      };

      const evalResult = evaluateQuiz(mockQuiz, userAnswers);
      expect(evalResult.score).toBe(3);
      expect(evalResult.total).toBe(3);
      expect(evalResult.percentage).toBe(100);
      expect(evalResult.strongTopics.length).toBeGreaterThan(0);
      expect(evalResult.weakTopics.length).toBe(0);
    });

    it('identifies weak topics and generates targeted recommendations', () => {
      const userAnswers = {
        q1: 'mv', // incorrect
        q2: 'Да', // correct
        q3: 'Ватт', // incorrect
      };

      const evalResult = evaluateQuiz(mockQuiz, userAnswers);
      expect(evalResult.score).toBe(1);
      expect(evalResult.percentage).toBe(33);
      expect(evalResult.weakTopics.some((t) => t.includes('Динамика'))).toBe(true);
      expect(evalResult.weakTopics.some((t) => t.includes('Энергия'))).toBe(true);
      expect(evalResult.recommendations.some((r) => r.includes('Динамика'))).toBe(true);
    });

    it('formats export correctly for both teacher and student modes', () => {
      const studentExport = formatQuizForExport(mockQuiz, 'student');
      expect(studentExport).toContain('ТЕСТ ПО МЕХАНИКЕ');
      expect(studentExport).toContain('Вопрос 1:');
      expect(studentExport).not.toContain('КЛЮЧИ И СВОДКА ДЛЯ ПРЕПОДАВАТЕЛЯ');

      const teacherExport = formatQuizForExport(mockQuiz, 'teacher');
      expect(teacherExport).toContain('ТЕСТ ПО МЕХАНИКЕ');
      expect(teacherExport).toContain('КЛЮЧИ И СВОДКА ДЛЯ ПРЕПОДАВАТЕЛЯ');
      expect(teacherExport).toContain('Ключ: ma');
    });
  });
});
