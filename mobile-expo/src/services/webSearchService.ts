/**
 * Web Search Service
 * Real-time web search integration using Google News RSS, DuckDuckGo HTML, and Wikipedia.
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
  '2027',
  'курс валют',
  'курс доллара',
  'курс евро',
  'погода',
  'кто сейчас',
  'что произошло',
  'что случилось',
  'погугли',
  'найди в интернете',
  'поиск в сети',
  'поиск в интернете',
  'свежие данные',
  'выборы',
  'президент',
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
    /^(пожалуйста|скажи( мне)?|подскажи|найди в интернете|поиск в сети|поиск в интернете|погугли|что такое|кто такой|расскажи о|расскажи про|что ты думаешь о)\s+/i,
    ''
  );
  // Remove punctuation at the end
  cleaned = cleaned.replace(/[?!.:]+$/g, '').trim();

  return cleaned || rawQuery.trim();
}

/**
 * Checks whether a query contains time-sensitive or current-event keywords
 */
export function isTimeSensitiveQuery(query: string): boolean {
  if (!query || typeof query !== 'string') return false;
  const lower = query.toLowerCase();
  return TIME_SENSITIVE_KEYWORDS.some((kw) => lower.includes(kw));
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

  return isTimeSensitiveQuery(trimmed);
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
 * 1. Google News RSS Fetcher
 * Real-time, fast, unblocked news and current events with publication dates.
 */
async function fetchGoogleNews(query: string, maxResults: number = 4): Promise<WebSearchResult[]> {
  try {
    const isRu = /[а-яА-ЯёЁ]/.test(query);
    const hl = isRu ? 'ru' : 'en-US';
    const gl = isRu ? 'RU' : 'US';
    const ceid = isRu ? 'RU:ru' : 'US:en';
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return [];
    const xml = await res.text();
    const items: WebSearchResult[] = [];
    const chunks = xml.split('<item>');

    for (let i = 1; i < chunks.length && items.length < maxResults; i++) {
      const chunk = chunks[i];
      const titleM = /<title>([\s\S]*?)<\/title>/.exec(chunk);
      const linkM = /<link>([\s\S]*?)<\/link>/.exec(chunk);
      const pubDateM = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(chunk);
      const sourceM = /<source[^>]*>([\s\S]*?)<\/source>/.exec(chunk);

      if (titleM) {
        let rawTitle = titleM[1]
          .replace(/<[^>]+>/g, '')
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&#39;/g, "'")
          .trim();
        const link = linkM ? linkM[1].trim() : '';
        const sourceName = sourceM
          ? sourceM[1].replace(/<[^>]+>/g, '').trim()
          : 'Google News';

        let formattedDate = '';
        if (pubDateM) {
          try {
            const d = new Date(pubDateM[1]);
            if (!isNaN(d.getTime())) {
              formattedDate = d.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });
            }
          } catch {}
        }

        const snippet = formattedDate
          ? `[${formattedDate}] Источник: ${sourceName}`
          : `Источник: ${sourceName}`;

        if (rawTitle && link) {
          items.push({
            title: rawTitle,
            snippet,
            url: link,
            source: sourceName,
          });
        }
      }
    }

    return items;
  } catch (err: any) {
    console.warn('[WebSearch] Google News fetch error:', err?.message);
    return [];
  }
}

/**
 * 2. DuckDuckGo HTML Search Fetcher
 * Organic web-wide search results across blogs, documentation, portals, and media.
 */
async function fetchDuckDuckGoHtml(query: string, maxResults: number = 4): Promise<WebSearchResult[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);

    const res = await fetch('https://html.duckduckgo.com/html/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      body: `q=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return [];
    const html = await res.text();

    // Check for DDG bot challenge/anomaly
    if (html.includes('anomaly-modal') || html.includes('challenge-form')) {
      return [];
    }

    const items: WebSearchResult[] = [];
    const chunks = html.split(/class=['"](?:result\s+results_links|result__body|links_main)/i);

    for (let i = 1; i < chunks.length && items.length < maxResults; i++) {
      const chunk = chunks[i];
      const titleMatch = chunk.match(
        /<a[^>]*class=['"][^'"]*result__a[^'"]*['"][^>]*href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/i
      );
      const snipMatch =
        chunk.match(/<a[^>]*class=['"][^'"]*result__snippet[^'"]*['"][^>]*>([\s\S]*?)<\/a>/i) ||
        chunk.match(/class=['"]result__snippet['"][^>]*>([\s\S]*?)<\/(?:a|td|div)>/i);

      if (titleMatch) {
        const rawUrl = titleMatch[1];
        const cleanUrl = cleanDuckDuckGoUrl(rawUrl);
        const title = titleMatch[2].replace(/<[^>]+>/g, '').trim();
        const snippet = snipMatch ? snipMatch[1].replace(/<[^>]+>/g, '').trim() : '';

        if (title && !cleanUrl.includes('duckduckgo.com')) {
          items.push({
            title,
            snippet,
            url: cleanUrl,
            source: 'Веб',
          });
        }
      }
    }

    return items;
  } catch (err: any) {
    console.warn('[WebSearch] DuckDuckGo HTML query error:', err?.message);
    return [];
  }
}

/**
 * 3. Wikipedia API Fetcher
 * Used exclusively for academic and definitional queries, avoiding news pollution.
 */
async function fetchWikipedia(query: string, maxResults: number = 2): Promise<WebSearchResult[]> {
  try {
    const isRussian = /[а-яА-ЯёЁ]/.test(query);
    const wikiLang = isRussian ? 'ru' : 'en';
    const wikiUrl = `https://${wikiLang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      query
    )}&utf8=&format=json`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const wikiRes = await fetch(wikiUrl, {
      headers: { 'User-Agent': 'SmartStudyHub/1.4 (academic app)' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!wikiRes.ok) return [];
    const data = await wikiRes.json();
    const items = data?.query?.search || [];
    const results: WebSearchResult[] = [];

    for (const item of items) {
      if (results.length >= maxResults) break;
      if (
        item.title &&
        (item.title.includes('(значения)') || item.title.includes('(disambiguation)'))
      ) {
        continue;
      }

      const cleanSnippet = (item.snippet || '').replace(/<[^>]+>/g, '').trim();
      if (cleanSnippet) {
        results.push({
          title: item.title,
          snippet: cleanSnippet,
          url: `https://${wikiLang}.wikipedia.org/wiki/${encodeURIComponent(
            item.title.replace(/ /g, '_')
          )}`,
          source: 'Wikipedia',
        });
      }
    }
    return results;
  } catch (err: any) {
    console.warn('[WebSearch] Wikipedia query error:', err?.message);
    return [];
  }
}

/**
 * Perform web search using multi-source cascade: Google News RSS, DuckDuckGo HTML, and Wikipedia
 */
export async function searchWeb(query: string, maxResults: number = 4): Promise<WebSearchResult[]> {
  const sanitized = sanitizeSearchQuery(query);
  if (!sanitized) return [];

  const timeSensitive = isTimeSensitiveQuery(query) || isTimeSensitiveQuery(sanitized);
  const results: WebSearchResult[] = [];
  const seenUrls = new Set<string>();

  const addResults = (items: WebSearchResult[]) => {
    for (const item of items) {
      if (results.length >= maxResults) break;
      const normalizedUrl = item.url.toLowerCase();
      if (!seenUrls.has(normalizedUrl) && item.title) {
        seenUrls.add(normalizedUrl);
        results.push(item);
      }
    }
  };

  if (timeSensitive) {
    // 1. Time-sensitive query: Google News RSS is primary (accurate real-time sources with 2026 dates)
    const [newsItems, ddgItems] = await Promise.all([
      fetchGoogleNews(sanitized, maxResults),
      fetchDuckDuckGoHtml(sanitized, 2),
    ]);
    addResults(newsItems);
    addResults(ddgItems);

    // If still empty (e.g. niche query), try broader query
    if (results.length === 0 && sanitized !== query.trim()) {
      const fallbackNews = await fetchGoogleNews(query.trim(), maxResults);
      addResults(fallbackNews);
    }
  } else {
    // 2. General / Academic query: Organic web search + Google News + Wikipedia definition
    const [ddgItems, newsItems] = await Promise.all([
      fetchDuckDuckGoHtml(sanitized, 3),
      fetchGoogleNews(sanitized, 2),
    ]);
    addResults(ddgItems);
    addResults(newsItems);

    // If organic search yielded < 2 results, supplement with Wikipedia
    if (results.length < 2) {
      const wikiItems = await fetchWikipedia(sanitized, 2);
      addResults(wikiItems);
    }
  }

  return results;
}

/**
 * Builds formatted system prompt additions based on search results
 */
export function buildWebSearchPromptContext(query: string, results: WebSearchResult[]): string {
  if (!results || results.length === 0) return '';

  const now = new Date();
  const year = now.getFullYear();
  const monthNames = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];
  const dayNames = [
    'воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'
  ];
  const dateStr = `${now.getDate()} ${monthNames[now.getMonth()]} ${year} года (${dayNames[now.getDay()]})`;

  const formattedSources = results
    .map(
      (r, i) =>
        `[Источник ${i + 1}]: "${r.title}" (${r.source})\nСсылка: ${r.url}\nИнформация: ${r.snippet}`
    )
    .join('\n\n');

  return `
[АКТУАЛЬНЫЕ ДАННЫЕ ИЗ ВЕБ-ПОИСКА В СЕТИ]:
Поисковый запрос пользователя: "${sanitizeSearchQuery(query)}"
Текущая дата в реальном мире: ${dateStr}.
Текущий год: ${year} год.

Найденные актуальные источники из интернета:
${formattedSources}

Инструкция по использованию веб-поиска:
1. Используй эти актуальные факты и данные при ответе на вопрос пользователя.
2. ВНИМАНИЕ: реальный мир сейчас находится в ${year} году. Ни в коем случае не утверждай, что сейчас 2023, 2024 или иной прошедший год. Не цитируй устаревшие архивные данные, если найдены свежие факты.
3. Отвечай прямо, точно, современно и структурированно на русском языке.
4. Если пользователь спрашивает о текущих событиях, персоналиях, курсах, релизах или новостях — опирайся строго на предоставленные результаты поиска.
`;
}
