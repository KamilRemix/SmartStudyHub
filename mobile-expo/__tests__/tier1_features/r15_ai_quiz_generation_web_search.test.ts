import {
  shouldPerformWebSearch,
  buildWebSearchPromptContext,
  WebSearchResult,
} from '../../src/services/webSearchService';
import {
  formatQuizToHtmlPrintable,
  formatQuizForExport,
  Quiz,
  generateQuizFromAI,
} from '../../src/services/quizService';

describe('AI Quiz Generation Enhancements & Web Search Service', () => {
  describe('Web Search Decision & Formatting', () => {
    test('always triggers web search when manual toggle is true', () => {
      expect(shouldPerformWebSearch('2 + 2', true)).toBe(true);
      expect(shouldPerformWebSearch('теорема Пифагора', true)).toBe(true);
    });

    test('auto-detects time-sensitive and news queries when manual toggle is false', () => {
      expect(shouldPerformWebSearch('какие последние новости науки в 2026 году?', false)).toBe(true);
      expect(shouldPerformWebSearch('кто сегодня президент?', false)).toBe(true);
      expect(shouldPerformWebSearch('погугли курс валют сейчас', false)).toBe(true);
      expect(shouldPerformWebSearch('что произошло в мире?', false)).toBe(true);
    });

    test('does not trigger web search for timeless academic concepts without toggle', () => {
      expect(shouldPerformWebSearch('как решить квадратное уравнение', false)).toBe(false);
      expect(shouldPerformWebSearch('закон Ома для участка цепи', false)).toBe(false);
      expect(shouldPerformWebSearch('формула дискриминанта', false)).toBe(false);
    });

    test('builds informative prompt context from web search results', () => {
      const mockResults: WebSearchResult[] = [
        {
          title: 'Запуск квантового процессора 2026',
          snippet: 'Ученые представили новый 1000-кубитный процессор с коррекцией ошибок.',
          url: 'https://example.com/quantum-2026',
          source: 'Web',
        },
      ];

      const context = buildWebSearchPromptContext('квантовый процессор 2026', mockResults);
      expect(context).toContain('АКТУАЛЬНЫЕ ДАННЫЕ ИЗ ВЕБ-ПОИСКА В СЕТИ');
      expect(context).toContain('Запуск квантового процессора 2026');
      expect(context).toContain('https://example.com/quantum-2026');
      expect(context).toContain('1000-кубитный процессор');
    });
  });

  describe('Quiz Printable HTML & Document Export', () => {
    const mockQuiz: Quiz = {
      id: 'quiz_test_1',
      title: 'Квантовая механика и основы физики',
      description: 'Проверочный тест по квантовым явлениям',
      difficulty: 'hard',
      questions: [
        {
          id: 'q1',
          question: 'Чему равна постоянная Планка $h$?',
          type: 'multiple_choice',
          options: [
            '$6.626 \\times 10^{-34}$ Дж·с',
            '$3.00 \\times 10^8$ м/с',
            '$9.81$ м/с²',
            '$1.602 \\times 10^{-19}$ Кл',
          ],
          correctAnswer: '$6.626 \\times 10^{-34}$ Дж·с',
          explanation: 'Фундаментальная физическая постоянная квантовой теории.',
          topic: 'Квантовая физика',
        },
        {
          id: 'q2',
          question: 'Сформулируйте принцип неопределенности Гейзенберга.',
          type: 'open_ended',
          correctAnswer: 'Произведение неопределенностей координаты и импульса $\\ge \\hbar/2$',
          explanation: 'Невозможно одновременно точно измерить координату и импульс.',
          topic: 'Квантовая механика',
        },
      ],
    };

    test('generates complete HTML document for student mode without answers', () => {
      const html = formatQuizToHtmlPrintable(mockQuiz, 'student');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Квантовая механика и основы физики');
      expect(html).toContain('Бланк для ученика');
      expect(html).toContain('Чему равна постоянная Планка');
      expect(html).toContain('&#9634; A)');
      // Student mode must NOT contain answer key
      expect(html).not.toContain('Правильный ответ:');
    });

    test('generates complete HTML document for teacher mode with answers and explanations', () => {
      const html = formatQuizToHtmlPrintable(mockQuiz, 'teacher');
      expect(html).toContain('Версия для учителя');
      expect(html).toContain('Правильный ответ: $6.626 \\times 10^{-34}$ Дж·с');
      expect(html).toContain('Пояснение: Фундаментальная физическая постоянная');
      expect(html).toContain('@media print');
    });

    test('formats text export for Word / Google Docs with answer keys', () => {
      const text = formatQuizForExport(mockQuiz, 'teacher');
      expect(text).toContain('КВАНТОВАЯ МЕХАНИКА И ОСНОВЫ ФИЗИКИ');
      expect(text).toContain('Вопрос 1:');
      expect(text).toContain('-> Ключ:');
      expect(text).toContain('СВОДКА ДЛЯ ПРЕПОДАВАТЕЛЯ');
    });
  });
});
