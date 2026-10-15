import {
  shouldPerformWebSearch,
  buildWebSearchPromptContext,
  extractUrlsFromText,
  extractSearchKeywords,
  extractReadableTextFromHtml,
  cleanDuckDuckGoUrl,
  normalizeWebUrl,
  resolveConversationalQuery,
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

    test('extracts and normalizes URLs including bare domains', () => {
      const urls1 = extractUrlsFromText('Зайди на habr.com/ru/articles/793574/ и расскажи суть');
      expect(urls1).toContain('https://habr.com/ru/articles/793574/');

      const urls2 = extractUrlsFromText('Посмотри lenta.ru и https://github.com/facebook/react');
      expect(urls2).toContain('https://lenta.ru');
      expect(urls2).toContain('https://github.com/facebook/react');
    });

    test('cleans conversational fluff into laser-targeted search keywords', () => {
      const kw1 = extractSearchKeywords('Привет! Подскажи пожалуйста, кто сейчас чемпион мира по шахматам?');
      expect(kw1).toContain('чемпион');
      expect(kw1).toContain('шахматам');
      expect(kw1).not.toContain('Привет');
      expect(kw1).not.toContain('пожалуйста');

      const kw2 = extractSearchKeywords('Вышел ли уже новый React 19?');
      expect(kw2).toContain('React 19');
    });

    test('unwraps DuckDuckGo uddg redirect links', () => {
      const uddgUrl = 'https://duckduckgo.com/l/?uddg=https%3A%2F%2Fopenai.com%2Findex%2Fhello-gpt-4o%2F&rut=...';
      expect(cleanDuckDuckGoUrl(uddgUrl)).toBe('https://openai.com/index/hello-gpt-4o/');
    });

    test('resolves conversational follow-ups and pronouns using prior dialogue history', () => {
      const history = [
        { role: 'user', content: 'Что такое OpenAI Sora?' },
        { role: 'model', content: 'OpenAI Sora — это модель генерации видео...' },
      ];
      const resolved = resolveConversationalQuery('Когда её релиз для всех?', history);
      expect(resolved).toContain('OpenAI Sora');
      expect(resolved).toContain('Когда её релиз для всех?');

      const keywords = extractSearchKeywords(resolved);
      expect(keywords).toContain('OpenAI Sora');
      expect(keywords).toContain('релиз');
    });

    test('normalizes Google redirects and converts Google Docs / Sheets / Slides to export endpoints', () => {
      // 1. Google Search redirect
      const googleRedirect =
        'https://www.google.com/url?q=https://react.dev/blog/2024/12/05/react-19&sa=U&ved=2ahUKEwj123';
      expect(normalizeWebUrl(googleRedirect)).toBe('https://react.dev/blog/2024/12/05/react-19');

      // 2. Google Docs
      const gDoc = 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing';
      expect(normalizeWebUrl(gDoc)).toBe(
        'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/export?format=txt'
      );

      // 3. Google Sheets
      const gSheet = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0';
      expect(normalizeWebUrl(gSheet)).toBe(
        'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/export?format=csv'
      );

      // 4. Google Slides
      const gSlide = 'https://docs.google.com/presentation/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit';
      expect(normalizeWebUrl(gSlide)).toBe(
        'https://docs.google.com/presentation/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/export/txt'
      );
    });

    test('builds dedicated user link prompt context when query contains direct URL', () => {
      const mockResult: WebSearchResult[] = [
        {
          title: 'Лекция по физике: Термодинамика',
          snippet: 'Первое начало термодинамики и изопроцессы.',
          content: 'Полный текст лекции: количество теплоты, переданное системе, идет на изменение внутренней энергии.',
          url: 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/export?format=txt',
          source: 'docs.google.com',
        },
      ];

      const userPrompt = 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit прочитай этот документ и расскажи суть';
      const context = buildWebSearchPromptContext(userPrompt, mockResult);

      expect(context).toContain('[СОДЕРЖИМОЕ СТРАНИЦ ПО ССЫЛКЕ ПОЛЬЗОВАТЕЛЯ]');
      expect(context).toContain('Внимательно изучи прочитанный текст выше');
      expect(context).toContain('Лекция по физике: Термодинамика');
      expect(context).toContain('Полный текст лекции');
    });

    test('recovers link from history when user follows up with question about the link', () => {
      const history = [
        { role: 'user', content: 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit' },
        { role: 'model', content: 'Я прочитал этот документ. Что вы хотите узнать?' },
      ];

      const resolved = resolveConversationalQuery('что в ней написано?', history);
      expect(resolved).toContain('https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit');
      expect(shouldPerformWebSearch(resolved, false)).toBe(true);
    });

    test('extracts clean text from HTML without CSS or script leaks', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>body { color: red; } @media (min-width: 640px) { .box { width: 100px; } }</style>
            <script>console.log("secret tracker");</script>
          </head>
          <body>
            <header><nav><a href="/">Home</a></nav></header>
            <main>
              <article>
                <h1>Запуск нового научного спутника</h1>
                <p>Ученые успешно вывели на орбиту новый исследовательский аппарат для мониторинга климата Земли.</p>
                <p>Миссия рассчитана на пять лет непрерывных климатических измерений.</p>
              </article>
            </main>
            <footer>Все права защищены 2026</footer>
          </body>
        </html>
      `;
      const parsed = extractReadableTextFromHtml(html);
      expect(parsed.title).toBe('');
      expect(parsed.content).toContain('Запуск нового научного спутника');
      expect(parsed.content).toContain('Ученые успешно вывели на орбиту');
      expect(parsed.content).not.toContain('@media');
      expect(parsed.content).not.toContain('secret tracker');
      expect(parsed.content).not.toContain('color: red');
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
