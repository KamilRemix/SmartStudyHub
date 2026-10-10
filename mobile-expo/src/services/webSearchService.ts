/**
 * Web Search Service
 * Real-time web search integration using DuckDuckGo and Wikipedia
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

/**
 * Determines whether a query should trigger web search.
 * Triggers if manually enabled or if query contains time-sensitive keywords.
 */
export function shouldPerformWebSearch(prompt: string, manualToggle: boolean): boolean {
  if (manualToggle) return true;
  if (!prompt || typeof prompt !== 'string') return false;

  const lower = prompt.toLowerCase();
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
 * Perform web search using DuckDuckGo HTML and Wikipedia APIs
 */
export async function searchWeb(query: string, maxResults: number = 4): Promise<WebSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const results: WebSearchResult[] = [];

  // 1. DuckDuckGo Search (Real-time organic web results)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);

    const ddgResponse = await fetch('https://html.duckduckgo.com/html/', {
      method: 'POST',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `q=${encodeURIComponent(trimmed)}`,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (ddgResponse.ok) {
      const html = await ddgResponse.text();
      const resultBlockRegex = /<div class="result__body">([\s\S]*?)<\/div>/gi;
      let blockMatch;

      while ((blockMatch = resultBlockRegex.exec(html)) !== null && results.length < maxResults) {
        const block = blockMatch[1];
        const titleMatch = /<a class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i.exec(block);
        const snippetMatch = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i.exec(block);

        if (titleMatch) {
          const rawUrl = titleMatch[1];
          const cleanUrl = cleanDuckDuckGoUrl(rawUrl);
          const title = titleMatch[2].replace(/<[^>]+>/g, '').trim();
          const snippet = snippetMatch
            ? snippetMatch[1].replace(/<[^>]+>/g, '').trim()
            : '';

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
    console.warn('[WebSearch] DuckDuckGo query error:', err?.message);
  }

  // 2. Wikipedia Search (High quality factual reference)
  if (results.length < maxResults) {
    try {
      const isRussian = /[а-яА-ЯёЁ]/.test(trimmed);
      const wikiLang = isRussian ? 'ru' : 'en';
      const wikiUrl = `https://${wikiLang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        trimmed
      )}&utf8=&format=json`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

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
          const cleanSnippet = (item.snippet || '').replace(/<[^>]+>/g, '').trim();
          if (cleanSnippet) {
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
Поисковый запрос: "${query}"
Найденные актуальные источники:
${formattedSources}

Инструкция по использованию веб-поиска:
1. Используй эти актуальные факты и данные при ответе на вопрос пользователя.
2. Отвечай прямо, точно и структурированно на русском языке.
3. При необходимости сошлись на упомянутые источники или факты.
`;
}
