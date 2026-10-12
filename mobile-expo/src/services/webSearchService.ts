/**
 * Web Search Service
 * Real-time web search integration using DuckDuckGo Lite and Wikipedia
 * Provides live internet knowledge for AI models with zero API key requirement.
 */

export interface WebSearchResult {
  title: string;
  snippet: string;
  url: string;
  source: string;
}

// Temporal and news detection keywords
const TIME_SENSITIVE_KEYWORDS = [
  'сегодня',
  'вчера',
  'сейчас',
  'новости',
  'новость',
  'последние',
  'актуально',
  'актуальные',
  'в этом году',
  '2024',
  '2025',
  '2026',
  'курс валют',
  'погода',
  'кто сейчас',
  'что произошло',
  'что случилось',
  'погугли',
  'найди в интернете',
  'поиск в сети',
  'поиск в интернете',
  'свежие данные',
  'latest news',
  'today',
  'current',
  'who is currently',
  'recent',
];

// Patterns where the user is only asking about the clock/calendar
const PURE_CLOCK_PATTERNS = [
  /^какой (сейчас|сегодня) (год|день|день недели)\??$/i,
  /^какое сегодня число\??$/i,
  /^сколько (сейчас )?времени\??$/i,
  /^what (year|day|time) is it\??$/i,
];

/**
 * Strips conversational fluff and prefixes so the search engine gets clean keywords
 */
export function sanitizeSearchQuery(rawQuery: string): string {
  if (!rawQuery || typeof rawQuery !== 'string') return '';
  let cleaned = rawQuery.trim();

  // Remove conversational greetings and question starters
  cleaned = cleaned.replace(
    /^(пожалуйста|скажи( мне)?|подскажи|найди в интернете|поиск в сети|погугли|что такое|кто такой|расскажи о|расскажи про|что ты думаешь о)\s+/i,
    ''
  );
  // Remove punctuation at the end
  cleaned = cleaned.replace(/[?!.:]+$/g, '').trim();

  return cleaned || rawQuery.trim();
}

/**
 * Determines whether a query should trigger web search.
 * Triggers if manually enabled or if query contains time-sensitive keywords.
 */
export function shouldPerformWebSearch(prompt: string, manualToggle: boolean): boolean {
  if (manualToggle) return true;
  if (!prompt || typeof prompt !== 'string') return false;

  const trimmed = prompt.trim();
  // If the query is just asking for the clock/year, system prompt already knows this with 100% precision
  if (PURE_CLOCK_PATTERNS.some((p) => p.test(trimmed))) {
    return false;
  }

  const lower = trimmed.toLowerCase();
  return TIME_SENSITIVE_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Clean URL from DuckDuckGo redirect format
 */
function cleanDuckDuckGoUrl(rawUrl: string): string {
  try {
    const uddgMatch = /[?&]uddg=([^&]+)/.exec(rawUrl);
    if (uddgMatch) {
      return decodeURIComponent(uddgMatch[1]);
    }
  } catch {}
  return rawUrl;
}

/**
 * Perform web search using DuckDuckGo Lite and Wikipedia APIs
 */
export async function searchWeb(query: string, maxResults: number = 4): Promise<WebSearchResult[]> {
  const sanitized = sanitizeSearchQuery(query);
  if (!sanitized) return [];

  const results: WebSearchResult[] = [];

  // 1. DuckDuckGo Lite Search (Fast, organic, unblocked web-wide results)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const ddgResponse = await fetch('https://lite.duckduckgo.com/lite/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      body: `q=${encodeURIComponent(sanitized)}`,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (ddgResponse.ok) {
      const html = await ddgResponse.text();
      const rows = html.split('<tr>');

      for (let i = 0; i < rows.length && results.length < maxResults; i++) {
        const row = rows[i];
        const linkMatch = row.match(
          /<a[^>]*class=['"]result-link['"][^>]*href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/i
        );

        if (linkMatch) {
          const rawUrl = linkMatch[1];
          const cleanUrl = cleanDuckDuckGoUrl(rawUrl);
          const title = linkMatch[2].replace(/<[^>]+>/g, '').trim();

          const nextRow = rows[i + 1] || '';
          const snipMatch = nextRow.match(
            /<td[^>]*class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/i
          );
          const snippet = snipMatch ? snipMatch[1].replace(/<[^>]+>/g, '').trim() : '';

          if (title && snippet && !cleanUrl.includes('duckduckgo.com')) {
            results.push({
              title,
              snippet,
              url: cleanUrl,
              source: 'Web',
            });
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('[WebSearch] DuckDuckGo Lite query error:', err?.message);
  }

  // 2. Wikipedia Search (High-quality fallback if organic results were insufficient)
  if (results.length < maxResults) {
    try {
      const isRussian = /[а-яА-ЯёЁ]/.test(sanitized);
      const wikiLang = isRussian ? 'ru' : 'en';
      const wikiUrl = `https://${wikiLang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        sanitized
      )}&utf8=&format=json`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);

      const wikiRes = await fetch(wikiUrl, {
        headers: { 'User-Agent': 'SmartStudyHub/1.4 (academic app)' },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (wikiRes.ok) {
        const data = await wikiRes.json();
        const items = data?.query?.search || [];

        for (const item of items) {
          if (results.length >= maxResults) break;
          // Skip disambiguation pages
          if (item.title && (item.title.includes('(значения)') || item.title.includes('(disambiguation)'))) {
            continue;
          }

          const cleanSnippet = (item.snippet || '').replace(/<[^>]+>/g, '').trim();
          if (cleanSnippet && !results.some((r) => r.title === item.title)) {
            results.push({
              title: item.title,
              snippet: cleanSnippet,
              url: `https://${wikiLang}.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
              source: 'Wikipedia',
            });
          }
        }
      }
    } catch (err: any) {
      console.warn('[WebSearch] Wikipedia query error:', err?.message);
    }
  }

  return results;
}

/**
 * Builds formatted system prompt additions based on search results
 */
export function buildWebSearchPromptContext(query: string, results: WebSearchResult[]): string {
  if (!results || results.length === 0) return '';

  const formattedSources = results
    .map(
      (r, i) =>
        `[${i + 1}] "${r.title}" (${r.source})\nСсылка: ${r.url}\nИнформация: ${r.snippet}`
    )
    .join('\n\n');

  return `
[АКТУАЛЬНЫЕ ДАННЫЕ ИЗ ВЕБ-ПОИСКА В СЕТИ]:
Поисковый запрос: "${sanitizeSearchQuery(query)}"
Найденные актуальные источники:
${formattedSources}

Инструкция по использованию веб-поиска:
1. Используй эти актуальные факты и данные при ответе на вопрос пользователя.
2. Отвечай прямо, точно и структурированно на русском языке.
3. При необходимости сошлись на упомянутые источники или факты.
`;
}
