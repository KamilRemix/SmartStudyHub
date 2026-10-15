/**
 * Web Search & Real-Time Web Page Reader Service
 * 
 * Provides live internet knowledge, intelligent query extraction, multi-engine
 * search cascade (DuckDuckGo Lite, DuckDuckGo HTML, Google News RSS, Wikipedia API,
 * DuckDuckGo Instant Answers), and robust direct web page content scraping
 * for AI models with zero API key requirements.
 */

export interface WebSearchResult {
  title: string;
  snippet: string;
  url: string;
  source: string;
  content?: string; // Full or readable page content extracted from website
}

// Broad keywords and stems that indicate the user wants current or real-world information
const REAL_WORLD_INTENT_STEMS = [
  // Time and currency
  'сегодня',
  'вчера',
  'сейчас',
  'недавно',
  'последн',
  'свеж',
  'актуальн',
  'текущ',
  'нынешн',
  'в этом году',
  'в текущем году',
  '2024',
  '2025',
  '2026',
  '2027',
  '2028',
  // News, releases, events
  'новост',
  'событи',
  'произошл',
  'случилось',
  'релиз',
  'вышел',
  'вышла',
  'вышло',
  'выйдет',
  'выпустил',
  'анонс',
  'презентац',
  'обновлен',
  'верси',
  'патч',
  // Politics, society, law (specific to avoid matching Ohm's law, Newton's law, etc.)
  'президент',
  'премьер',
  'министр',
  'выбор',
  'политик',
  'законопроект',
  'новый закон',
  'приняли закон',
  'законодательств',
  'поправки в закон',
  'указ',
  'правительств',
  'санкци',
  'переговор',
  // Sports, competitions, culture
  'чемпион',
  'победител',
  'победил',
  'выиграл',
  'турнир',
  'матч',
  'лиг',
  'счет',
  'олимпиад',
  'кубок',
  'оскар',
  'евровиден',
  'концерт',
  'фильм',
  'сериал',
  'рейтинг',
  // Economics, finance, weather
  'курс',
  'доллар',
  'евро',
  'биткоин',
  'крипт',
  'акци',
  'цена',
  'стоимост',
  'погод',
  'температур',
  'прогноз',
  // Search verbs & online references
  'найди',
  'поищи',
  'погугли',
  'в интернете',
  'в сети',
  'на сайте',
  'ссылк',
  'сайте',
  'инфо',
  'статистик',
  'кто такой',
  'что такое',
  'кто сейчас',
  'где сейчас',
  'чем занимается',
  'почему закрыли',
  'расписание',
  'афиша',
  'статус',
  'состояние',
  'ситуаци',
  'инцидент',
  'происшеств',
  // English stems
  'latest',
  'recent',
  'news',
  'current',
  'today',
  'yesterday',
  'who is',
  'what is the latest',
  'when is',
  'how much is',
  'price',
  'weather',
  'release',
  'score',
  'winner',
  'won',
  'champion',
  'schedule',
  'events',
  'happen',
  'incident',
];

// Patterns where the user is only asking about the clock/calendar
const PURE_CLOCK_PATTERNS = [
  /^какой (сейчас|сегодня) (год|день|день недели)\??$/i,
  /^какое сегодня число\??$/i,
  /^сколько (сейчас )?времени\??$/i,
  /^what (year|day|time) is it\??$/i,
];

// Matches full URLs with protocol
const URL_WITH_PROTO_REGEX = /https?:\/\/[^\s<>"'{}|\\^`]+/gi;

// Matches bare web domains (e.g. habr.com, lenta.ru, en.wikipedia.org/wiki/..., github.com/user/repo)
const BARE_DOMAIN_REGEX = /\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+(?:com|org|net|edu|gov|io|ai|ru|me|app|dev|co|info|biz|ua|kz|by|рф)(?:\/[^\s<>"'{}|\\^`]*)?/gi;

/**
 * Extracts all valid HTTP/HTTPS URLs and bare domain names from text, normalizing to https://
 */
export function extractUrlsFromText(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  const matches: string[] = [];

  // 1. Matches with protocol
  const fullUrls = text.match(URL_WITH_PROTO_REGEX) || [];
  for (const url of fullUrls) {
    matches.push(url.trim());
  }

  // 2. Bare domain matches without protocol
  const bareMatches = text.match(BARE_DOMAIN_REGEX) || [];
  for (const bare of bareMatches) {
    const trimmed = bare.replace(/[.,;:!?)]+$/, '').trim();
    if (trimmed.length > 3 && !matches.some((u) => u.includes(trimmed))) {
      matches.push(`https://${trimmed}`);
    }
  }

  return Array.from(new Set(matches));
}

// Common Russian conversational stopwords and low-signal filler words
const CONVERSATIONAL_STOPWORDS = new Set([
  'и', 'в', 'во', 'не', 'что', 'он', 'на', 'я', 'с', 'со', 'как', 'а', 'то', 'все', 'она',
  'так', 'его', 'но', 'да', 'ты', 'к', 'ко', 'у', 'же', 'вы', 'за', 'бы', 'по', 'только',
  'ее', 'мне', 'было', 'вот', 'от', 'меня', 'еще', 'нет', 'о', 'об', 'из', 'ему', 'теперь',
  'когда', 'даже', 'ну', 'вдруг', 'ли', 'если', 'уже', 'или', 'ни', 'быть', 'был', 'него',
  'до', 'вас', 'нибудь', 'опять', 'уж', 'вам', 'ведь', 'там', 'потом', 'себя', 'ничего',
  'ей', 'может', 'они', 'тут', 'где', 'есть', 'надо', 'ней', 'для', 'мы', 'тебя', 'их',
  'чем', 'была', 'сам', 'чтоб', 'без', 'будто', 'чего', 'раз', 'тоже', 'себе', 'под',
  'будет', 'ж', 'тогда', 'кто', 'этот', 'того', 'потому', 'этого', 'какой', 'какая', 'какие',
  'каком', 'какую', 'каких', 'который', 'которая', 'которое', 'которые', 'кем', 'чем', 'кому',
  'чему', 'ком', 'про', 'при', 'расскажи', 'подскажи', 'пожалуйста', 'привет', 'здравствуй',
  'здравствуйте', 'можешь', 'помоги', 'найди', 'поищи', 'погугли', 'интернете', 'сети',
  'сайте', 'сайте', 'гугл', 'яндекс', 'вопрос', 'знаешь', 'думаешь', 'статью', 'почитай',
  'расскажи-ка', 'поясни', 'проясни', 'загляни',
]);

/**
 * Strips conversational fluff, greetings, question fillers, and prepositions so search engines
 * get concise, high-signal keywords that return real results instead of junk.
 */
export function extractSearchKeywords(rawQuery: string): string {
  if (!rawQuery || typeof rawQuery !== 'string') return '';
  let q = rawQuery.trim();

  // Strip URLs from search keywords (they are handled directly by the web page reader)
  q = q.replace(URL_WITH_PROTO_REGEX, ' ');
  q = q.replace(BARE_DOMAIN_REGEX, ' ');

  // Multi-pass conversational prefix stripping
  let prev = '';
  for (let pass = 0; pass < 5 && prev !== q; pass++) {
    prev = q;

    // Strip greetings with trailing punctuation/space
    q = q.replace(
      /^(привет(ствую)?(\s+всем)?|здравствуй(те)?|добрый\s+(день|вечер|утро)|хай|салют|hello|hi|hey)[\s,!.-]*/gi,
      ''
    );

    // Strip polite & conversational requests
    q = q.replace(
      /^(пожалуйста|можешь(\s+ли)?(\s+ты)?(\s+пожалуйста)?|скажи(\s+мне)?|подскажи(\s+мне)?|расскажи(\s+мне)?(\s+(о|про))?|напиши(\s+мне)?|помоги(\s+мне)?|дай\s+мне\s+знать|объясни(\s+мне)?|что\s+ты\s+думаешь\s+(о|про)|что\s+ты\s+знаешь\s+(о|про)|can\s+you(\s+please)?|please|tell\s+me(\s+about)?|what\s+do\s+you\s+know\s+about)[\s,!.-]*/gi,
      ''
    );

    // Strip search command prefixes
    q = q.replace(
      /^(найди(\s+мне)?(\s+в\s+(интернете|сети))?|поищи(\s+в\s+(интернете|сети))?|погугли(ть|шь)?(\s+мне)?|поиск\s+в\s+(интернете|сети)|посмотри\s+в\s+(интернете|сети)|прогугли(ть)?|пробей(\s+по\s+базе)?|search(\s+the\s+web|\s+for|\s+online)?|google(\s+it)?|look\s*up)[\s,!.-]*/gi,
      ''
    );

    // Strip question conversational starters
    q = q.replace(/^(а\s+|и\s+|но\s+|кстати\s*,\s*|слушай\s*,\s*|скажи\s*,\s*|загляни\s+(на|в)\s*)/gi, '');
  }

  // Remove trailing question marks, dots, exclamation
  q = q.replace(/[?!:;.]+$/g, '').trim();

  // If query is long (conversational question), filter out low-signal stopwords
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 3) {
    const filteredTokens = tokens.filter((t) => {
      const clean = t.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '');
      return clean.length > 0 && !CONVERSATIONAL_STOPWORDS.has(clean);
    });
    // Keep filtered terms if we have enough informative keywords left
    if (filteredTokens.length >= 2) {
      q = filteredTokens.join(' ');
    }
  }

  // If query is about current/latest status and doesn't contain a year, append current year for freshness
  const lower = q.toLowerCase();
  const currentYear = new Date().getFullYear().toString();
  const mentionsCurrentTime =
    lower.includes('сейчас') ||
    lower.includes('последн') ||
    lower.includes('актуальн') ||
    lower.includes('свеж') ||
    lower.includes('в этом году') ||
    lower.includes('сегодня') ||
    lower.includes('latest') ||
    lower.includes('current');

  const hasYear = /\b20\d\d\b/.test(q);
  if (mentionsCurrentTime && !hasYear && q.length > 5) {
    q = `${q} ${currentYear}`;
  }

  return q.trim() || rawQuery.trim();
}

/**
 * Backward compatibility alias for sanitizeSearchQuery
 */
export const sanitizeSearchQuery = extractSearchKeywords;

/**
 * Checks whether a query contains time-sensitive, news, or real-world factual keywords
 */
export function isTimeSensitiveQuery(query: string): boolean {
  if (!query || typeof query !== 'string') return false;
  const lower = query.toLowerCase();
  return REAL_WORLD_INTENT_STEMS.some((stem) => lower.includes(stem));
}

/**
 * Determines whether a query should trigger web search or website fetching.
 * Triggers if manual toggle is on, if URLs or domain names are present, or if real-world intent is detected.
 */
export function shouldPerformWebSearch(prompt: string, manualToggle: boolean): boolean {
  if (manualToggle) return true;
  if (!prompt || typeof prompt !== 'string') return false;

  const trimmed = prompt.trim();
  // If the query is just asking for the clock/calendar, system prompt already knows this with 100% precision
  if (PURE_CLOCK_PATTERNS.some((p) => p.test(trimmed))) {
    return false;
  }

  // Check for direct URLs or domains in prompt
  if (extractUrlsFromText(trimmed).length > 0) {
    return true;
  }

  return isTimeSensitiveQuery(trimmed);
}

/**
 * Normalizes input URL, unwrapping search redirects (Google, DuckDuckGo, Yandex)
 * and converting Google Docs/Sheets view links into clean export endpoints for reading.
 */
export function normalizeWebUrl(rawUrl: string): string {
  let url = rawUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  try {
    const parsed = new URL(url);

    // 1. Google Search Redirect: google.com/url?q=... or google.com/url?url=...
    if (parsed.hostname.includes('google.') && parsed.pathname === '/url') {
      const target = parsed.searchParams.get('q') || parsed.searchParams.get('url');
      if (target && target.startsWith('http')) {
        return target;
      }
    }

    // 2. Google Docs: convert /edit or /view to export?format=txt for clean text extraction
    const gDocMatch = url.match(/https?:\/\/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/i);
    if (gDocMatch) {
      const docId = gDocMatch[1];
      return `https://docs.google.com/document/d/${docId}/export?format=txt`;
    }

    // 3. Google Sheets: convert /edit to export?format=csv
    const gSheetMatch = url.match(/https?:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/i);
    if (gSheetMatch) {
      const sheetId = gSheetMatch[1];
      return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    }

    // 4. Google Slides: convert /edit or /view to export/txt
    const gSlideMatch = url.match(/https?:\/\/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/i);
    if (gSlideMatch) {
      const slideId = gSlideMatch[1];
      return `https://docs.google.com/presentation/d/${slideId}/export/txt`;
    }

    // 5. DuckDuckGo Redirect: duckduckgo.com/l/?uddg=...
    if (parsed.hostname.includes('duckduckgo.com') && parsed.pathname.startsWith('/l/')) {
      const target = parsed.searchParams.get('uddg');
      if (target) {
        return decodeURIComponent(target);
      }
    }

    // 5. Yandex Redirect: yandex.ru/clck/...
    if (parsed.hostname.includes('yandex.') && parsed.pathname.startsWith('/clck/')) {
      const target = parsed.searchParams.get('url') || parsed.searchParams.get('target');
      if (target && target.startsWith('http')) {
        return target;
      }
    }
  } catch {}

  return url;
}

/**
 * Clean URL from DuckDuckGo redirect format (uddg=...)
 */
export function cleanDuckDuckGoUrl(rawUrl: string): string {
  return normalizeWebUrl(rawUrl);
}

/**
 * Extracts readable domain name from URL
 */
export function getHostnameFromUrl(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    return u.hostname.replace(/^www\./i, '');
  } catch {
    return 'Веб-источник';
  }
}

/**
 * Decodes all HTML entities including named, decimal, and hex entities
 */
export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&hellip;/g, '…')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Strips HTML tags, navigation, headers, footers, scripts, and extracts clean article text
 * without leaking CSS stylesheets or JavaScript code into the model context.
 */
export function extractReadableTextFromHtml(html: string): { title: string; metaDesc: string; content: string } {
  if (!html) return { title: '', metaDesc: '', content: '' };

  // 1. Globally strip dangerous and layout-only tags FIRST so they never leak into <article> or <main>
  const cleanHtml = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, ' ')
    .replace(/<template\b[^<]*(?:(?!<\/template>)<[^<]*)*<\/template>/gi, ' ')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, ' ');

  // 2. Extract meta description
  const metaDescMatch =
    cleanHtml.match(/<meta[^>]*name=['"]description['"][^>]*content=['"]([^'"]+)['"]/i) ||
    cleanHtml.match(/<meta[^>]*content=['"]([^'"]+)['"][^>]*name=['"]description['"]/i) ||
    cleanHtml.match(/<meta[^>]*property=['"]og:description['"][^>]*content=['"]([^'"]+)['"]/i);
  const metaDesc = metaDescMatch
    ? decodeHtmlEntities(metaDescMatch[1].replace(/<[^>]+>/g, '').trim())
    : '';

  // 3. Extract page title
  const titleMatch = cleanHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch
    ? decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, '').trim())
    : '';

  // 4. Focus on <article> or <main> or main content container in already sanitized cleanHtml
  const articleMatch =
    cleanHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
    cleanHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
    cleanHtml.match(/<div[^>]*id=['"](?:mw-content-text|article-body|post-content)['"][^>]*>([\s\S]*?)<\/div>/i) ||
    cleanHtml.match(/<div[^>]*role=['"]main['"][^>]*>([\s\S]*?)<\/div>/i);
  const targetHtml = articleMatch ? articleMatch[1] : cleanHtml;

  // 5. Convert line breaks & block elements
  let bodyText = targetHtml
    .replace(/<\/(p|div|h[1-6]|li|tr|section|blockquote)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  // 6. Decode entities
  bodyText = decodeHtmlEntities(bodyText);

  // 7. Strip leftover CSS/JS syntax artifacts
  bodyText = bodyText
    .replace(/@[a-zA-Z-]+\s*\{[^}]*\}/g, ' ')
    .replace(/\{[^{}]*\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ');

  // 8. Filter high-signal sentences/paragraphs (excluding short menu items, cookie notices)
  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => {
      const lower = p.toLowerCase();
      return (
        p.length >= 25 &&
        !lower.includes('cookie') &&
        !lower.includes('политика конфиденциальности') &&
        !lower.includes('privacy policy') &&
        !lower.includes('все права защищены') &&
        !lower.includes('terms of service') &&
        !lower.includes('пользовательское соглашение')
      );
    });

  // Collect up to ~5500 characters of meaningful content
  let content = '';
  for (const para of paragraphs) {
    if (content.length + para.length > 5500) break;
    content += (content ? '\n\n' : '') + para;
  }

  return { title, metaDesc, content };
}

/**
 * 0. Web Page Reader / Fetcher
 * Visits any web page URL, follows redirects, cleans HTML, and returns readable content.
 */
export async function fetchWebPageContent(
  url: string,
  timeoutMs: number = 7000
): Promise<{ title: string; snippet: string; content: string; url: string; source: string } | null> {
  try {
    const targetUrl = normalizeWebUrl(url);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'text/html,text/plain,text/csv,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru,en;q=0.9',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        if (targetUrl.includes('docs.google.com')) {
          return {
            title: 'Google Документ (Требуется доступ)',
            snippet: 'Документ закрыт настройками приватности.',
            content:
              'Этот Google Документ или Таблица закрыты для публичного доступа. Откройте доступ в Google Docs: "Поделиться" -> "Все, у кого есть ссылка" (Читатель), чтобы ИИ мог прочитать его.',
            url: targetUrl,
            source: 'docs.google.com',
          };
        }
      }
      return null;
    }

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const rawText = await res.text();

    if (!rawText || rawText.trim().length === 0) return null;

    // Check if Google redirected to a login page
    if (
      targetUrl.includes('docs.google.com') &&
      (rawText.includes('ServiceLogin') || rawText.includes('accounts.google.com') || rawText.includes('identifierId'))
    ) {
      return {
        title: 'Google Документ (Требуется доступ)',
        snippet: 'Документ закрыт настройками приватности.',
        content:
          'Этот Google Документ или Таблица закрыты для публичного чтения. Пожалуйста, откройте доступ в Google Docs ("Поделиться" -> "Все, у кого есть ссылка"), чтобы ИИ мог проанализировать его.',
        url: targetUrl,
        source: 'docs.google.com',
      };
    }

    const source = getHostnameFromUrl(targetUrl);
    let title = source;
    let snippet = '';
    let content = '';

    // Plain text / CSV / JSON or raw text response (e.g. Google Docs / Sheets exports)
    if (
      contentType.includes('text/plain') ||
      contentType.includes('text/csv') ||
      contentType.includes('application/json') ||
      (!rawText.includes('<html') && !rawText.includes('<!DOCTYPE') && !rawText.includes('<body'))
    ) {
      content = rawText.trim();
      title = targetUrl.includes('docs.google.com') ? 'Документ Google' : source;
      snippet = content.substring(0, 240).trim();
    } else {
      const parsed = extractReadableTextFromHtml(rawText);
      title = parsed.title || source;
      snippet = parsed.metaDesc || parsed.content.substring(0, 220).trim();
      content = parsed.content || snippet;
    }

    if (!content && !snippet) return null;

    // Limit single page content to prevent blowing up model context (max 12,000 chars)
    if (content.length > 12000) {
      content = `${content.substring(0, 12000)}\n... [текст сокращен для размера контекста]`;
    }

    return {
      title,
      snippet,
      content,
      url: targetUrl,
      source,
    };
  } catch (err: any) {
    console.warn('[WebSearch] fetchWebPageContent error for', url, err?.message);
    return null;
  }
}

/**
 * 1. DuckDuckGo Lite Search Fetcher
 * Fast, pure HTML search results with direct links and rich informative snippets.
 * Uses attribute-order agnostic regex to reliably parse DDG Lite tables.
 */
async function fetchDuckDuckGoLite(query: string, maxResults: number = 4): Promise<WebSearchResult[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);

    const res = await fetch('https://lite.duckduckgo.com/lite/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      body: `q=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return [];
    const html = await res.text();

    const items: WebSearchResult[] = [];

    // Attribute-order agnostic regex: matches <a ... class='result-link' ... href='...'> regardless of attribute order
    const linkRegex = /<a\b(?=[^>]*\bclass=['"][^'"]*result-link[^'"]*['"])(?=[^>]*\bhref=['"]([^'"]+)['"])[^>]*>([\s\S]*?)<\/a>/gi;
    const snippetRegex = /<td\b[^>]*\bclass=['"][^'"]*result-snippet[^'"]*['"][^>]*>([\s\S]*?)<\/td>/gi;

    const linkMatches = [...html.matchAll(linkRegex)];
    const snippetMatches = [...html.matchAll(snippetRegex)];

    for (let i = 0; i < linkMatches.length && items.length < maxResults; i++) {
      const rawUrl = linkMatches[i][1];
      const cleanUrl = cleanDuckDuckGoUrl(rawUrl);
      const title = decodeHtmlEntities(linkMatches[i][2].replace(/<[^>]+>/g, '').trim());
      const snippet = snippetMatches[i]
        ? decodeHtmlEntities(snippetMatches[i][1].replace(/<[^>]+>/g, '').trim())
        : '';

      if (title && cleanUrl && !cleanUrl.includes('duckduckgo.com')) {
        items.push({
          title,
          snippet,
          url: cleanUrl,
          source: getHostnameFromUrl(cleanUrl),
        });
      }
    }

    return items;
  } catch (err: any) {
    console.warn('[WebSearch] DuckDuckGo Lite query error:', err?.message);
    return [];
  }
}

/**
 * 2. DuckDuckGo HTML Fallback Search Fetcher
 * Used when DDG Lite is unavailable or empty.
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
        Accept: 'text/html,application/xhtml+xml',
      },
      body: `q=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return [];
    const html = await res.text();

    const titleMatches = [...html.matchAll(/<a\b[^>]*class=['"][^'"]*result__a[^'"]*['"][^>]*href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/gi)];
    const snippetMatches = [...html.matchAll(/<a\b[^>]*class=['"][^'"]*result__snippet[^'"]*['"][^>]*>([\s\S]*?)<\/a>/gi)];

    const items: WebSearchResult[] = [];
    for (let i = 0; i < titleMatches.length && items.length < maxResults; i++) {
      const rawUrl = titleMatches[i][1];
      const cleanUrl = cleanDuckDuckGoUrl(rawUrl);
      const title = decodeHtmlEntities(titleMatches[i][2].replace(/<[^>]+>/g, '').trim());
      const snippet = snippetMatches[i]
        ? decodeHtmlEntities(snippetMatches[i][1].replace(/<[^>]+>/g, '').trim())
        : '';

      if (title && cleanUrl && !cleanUrl.includes('duckduckgo.com')) {
        items.push({
          title,
          snippet,
          url: cleanUrl,
          source: getHostnameFromUrl(cleanUrl),
        });
      }
    }
    return items;
  } catch (err: any) {
    console.warn('[WebSearch] DuckDuckGo HTML query error:', err?.message);
    return [];
  }
}

/**
 * 3. DuckDuckGo Instant Answers API
 * Fast factual answers, abstracts, and related topics
 */
async function fetchDuckDuckGoInstantAnswer(query: string): Promise<WebSearchResult | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = await res.json();
    if (data.Abstract && data.AbstractURL) {
      return {
        title: data.Heading || query,
        snippet: data.Abstract,
        url: data.AbstractURL,
        source: data.AbstractSource || 'DuckDuckGo Instant Answer',
        content: data.Abstract,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 4. Google News RSS Fetcher
 * Real-time news, articles, and current events with publication dates.
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
      const descM = /<description>([\s\S]*?)<\/description>/.exec(chunk);

      if (titleM) {
        const rawTitle = decodeHtmlEntities(titleM[1].replace(/<[^>]+>/g, '').trim());
        const link = linkM ? linkM[1].trim() : '';
        const sourceName = sourceM
          ? decodeHtmlEntities(sourceM[1].replace(/<[^>]+>/g, '').trim())
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

        const rawDesc = descM ? decodeHtmlEntities(descM[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()) : '';
        const snippet = formattedDate
          ? `[${formattedDate}] ${sourceName}: ${rawDesc || rawTitle}`
          : `${sourceName}: ${rawDesc || rawTitle}`;

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
 * 5. Wikipedia API Fetcher with Rich Extract Support
 * Used for encyclopedic, biographical, scientific, and definitional queries.
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
      headers: { 'User-Agent': 'SmartStudyHub/1.5 (academic app)' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    let searchItems = wikiRes.ok ? (await wikiRes.json())?.query?.search || [] : [];
    let effectiveLang = wikiLang;

    // Fallback to English Wikipedia if Russian search returned 0 items and query has Latin terms
    if (searchItems.length === 0 && wikiLang === 'ru' && /[a-zA-Z]{3,}/.test(query)) {
      try {
        const enUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
          query
        )}&utf8=&format=json`;
        const enRes = await fetch(enUrl, { headers: { 'User-Agent': 'SmartStudyHub/1.5 (academic app)' } });
        if (enRes.ok) {
          const enData = await enRes.json();
          if (enData?.query?.search?.length > 0) {
            searchItems = enData.query.search;
            effectiveLang = 'en';
          }
        }
      } catch {}
    }

    const results: WebSearchResult[] = [];

    for (const item of searchItems) {
      if (results.length >= maxResults) break;
      if (
        item.title &&
        (item.title.includes('(значения)') || item.title.includes('(disambiguation)'))
      ) {
        continue;
      }

      const cleanSnippet = decodeHtmlEntities((item.snippet || '').replace(/<[^>]+>/g, '').trim());
      const pageUrl = `https://${effectiveLang}.wikipedia.org/wiki/${encodeURIComponent(
        item.title.replace(/ /g, '_')
      )}`;

      // Fetch clean plain-text lead extract from Wikipedia API directly
      let richContent = cleanSnippet;
      try {
        const extractUrl = `https://${effectiveLang}.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(
          item.title
        )}&format=json`;
        const extractRes = await fetch(extractUrl, {
          headers: { 'User-Agent': 'SmartStudyHub/1.5 (academic app)' },
        });
        if (extractRes.ok) {
          const extractData = await extractRes.json();
          const pages = extractData?.query?.pages || {};
          const firstPage = Object.values(pages)[0] as any;
          if (firstPage?.extract) {
            richContent = firstPage.extract.trim();
          }
        }
      } catch {}

      if (cleanSnippet || richContent) {
        results.push({
          title: item.title,
          snippet: cleanSnippet || richContent.substring(0, 180),
          url: pageUrl,
          source: 'Wikipedia',
          content: richContent,
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
 * Perform web search using multi-source cascade & live page reading:
 * 1. Extracts direct URLs / bare domains from query and fetches them directly.
 * 2. Cleans conversational fluff into laser-targeted search keywords.
 * 3. Queries DuckDuckGo Lite (with HTML & Instant Answers fallback), Google News RSS, and Wikipedia.
 * 4. Automatically reads full readable content from top search results.
 */
export async function searchWeb(
  query: string,
  maxResults: number = 4,
  onStatus?: (status: string) => void
): Promise<WebSearchResult[]> {
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

  // 1. Direct URL check: if the user included a link or website domain, directly read it
  const directUrls = extractUrlsFromText(query);
  if (directUrls.length > 0) {
    for (const url of directUrls.slice(0, 3)) {
      onStatus?.(`Читаем сайт: ${getHostnameFromUrl(url)}`);
      const page = await fetchWebPageContent(url, 7000);
      if (page) {
        addResults([
          {
            title: page.title,
            snippet: page.snippet,
            url: page.url,
            source: page.source,
            content: page.content,
          },
        ]);
      }
    }
    // If the user provided direct links and we successfully retrieved their content,
    // return them directly to avoid polluting context with general web search
    if (results.length > 0) {
      return results;
    }
  }

  // 2. Clean conversational fluff into focused keywords
  const cleanKeywords = extractSearchKeywords(query);
  if (!cleanKeywords) return results;

  onStatus?.(`Ищем: ${cleanKeywords}`);

  const timeSensitive = isTimeSensitiveQuery(query) || isTimeSensitiveQuery(cleanKeywords);

  if (timeSensitive) {
    // Current events / news cascade: DuckDuckGo Lite + Google News RSS
    let ddgItems = await fetchDuckDuckGoLite(cleanKeywords, maxResults);
    if (ddgItems.length === 0) {
      ddgItems = await fetchDuckDuckGoHtml(cleanKeywords, maxResults);
    }
    const newsItems = await fetchGoogleNews(cleanKeywords, 2);

    addResults(ddgItems);
    addResults(newsItems);

    // If still empty, fallback to raw query or broader news search
    if (results.length === 0 && cleanKeywords !== query.trim()) {
      const fallbackNews = await fetchGoogleNews(query.trim(), maxResults);
      addResults(fallbackNews);
    }
  } else {
    // General or academic cascade: DuckDuckGo Lite + Wikipedia + Instant Answers + Google News
    const [ddgLiteItems, wikiItems, instantAnswer] = await Promise.all([
      fetchDuckDuckGoLite(cleanKeywords, 3),
      fetchWikipedia(cleanKeywords, 2),
      fetchDuckDuckGoInstantAnswer(cleanKeywords),
    ]);

    if (instantAnswer) {
      addResults([instantAnswer]);
    }

    let ddgItems = ddgLiteItems;
    if (ddgItems.length === 0) {
      ddgItems = await fetchDuckDuckGoHtml(cleanKeywords, 3);
    }

    addResults(ddgItems);
    addResults(wikiItems);

    if (results.length < 2) {
      const newsItems = await fetchGoogleNews(cleanKeywords, 2);
      addResults(newsItems);
    }
  }

  // 3. Deep Page Reader: For top results with snippets, fetch full article body if not yet fetched
  const readableCandidates = results.filter(
    (r) => !r.content && r.url.startsWith('http') && !r.url.includes('news.google.com/rss/articles')
  );

  if (readableCandidates.length > 0) {
    const toFetch = readableCandidates.slice(0, 2);
    await Promise.all(
      toFetch.map(async (candidate) => {
        try {
          const page = await fetchWebPageContent(candidate.url, 4000);
          if (page && page.content) {
            candidate.content = page.content;
            if (page.title && page.title.length > candidate.title.length) {
              candidate.title = page.title;
            }
          }
        } catch {}
      })
    );
  }

  return results;
}

/**
 * Builds formatted system prompt additions based on rich search results and page content
 */
export function buildWebSearchPromptContext(query: string, results: WebSearchResult[]): string {
  if (!results || results.length === 0) return '';

  const now = new Date();
  const year = now.getFullYear();
  const monthNames = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
  ];
  const dayNames = [
    'воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота',
  ];
  const dateStr = `${now.getDate()} ${monthNames[now.getMonth()]} ${year} года (${dayNames[now.getDay()]})`;

  const directUrls = extractUrlsFromText(query);
  const isDirectLinkAnalysis = directUrls.length > 0;

  const formattedSources = results
    .map((r, i) => {
      let block = `[Источник ${i + 1}]: "${r.title}" (${r.source})\nСсылка: ${r.url}\nКратко: ${r.snippet}`;
      if (r.content && r.content.trim().length > 0) {
        block += `\nВыдержка из текста страницы:\n"""\n${r.content.trim()}\n"""`;
      }
      return block;
    })
    .join('\n\n');

  if (isDirectLinkAnalysis) {
    return `
[СОДЕРЖИМОЕ СТРАНИЦ ПО ССЫЛКЕ ПОЛЬЗОВАТЕЛЯ]:
Пользователь предоставил ссылку и просит проанализировать, прочитать или ответить на вопросы по её содержимому.
Исходный запрос пользователя: "${query}"
Текущая дата: ${dateStr}.

Прочитанные материалы по предоставленной ссылке:
${formattedSources}

Инструкция для модели:
1. Внимательно изучи прочитанный текст выше. Ответь строго, полно и детально на вопрос пользователя относительно этого материала.
2. Если пользователь попросил краткий пересказ, выдели главные тезисы, ключевые мысли и выводы.
3. Если пользователь задал конкретный вопрос по документу/странице, найди точный ответ в тексте выше и ответь.
4. Отвечай прямо, точно и структурированно на русском языке. При необходимости ссылайся на источник в формате [Название](URL).
`;
  }

  return `
[АКТУАЛЬНЫЕ ДАННЫЕ ИЗ ВЕБ-ПОИСКА В СЕТИ И ИНТЕРНЕТ-СТРАНИЦ]:
Поисковый запрос пользователя: "${extractSearchKeywords(query)}"
Текущая дата в реальном мире: ${dateStr}.
Текущий год: ${year} год.

Найденные актуальные источники и выдержки из материалов:
${formattedSources}

Инструкция по использованию веб-поиска:
1. Используй эти актуальные факты, цитаты, цифры и данные при ответе на вопрос пользователя.
2. ВНИМАНИЕ: реальный мир сейчас находится в ${year} году. Ни в коем случае не утверждай, что сейчас 2023, 2024 или иной прошедший год. Не цитируй устаревшие архивные данные, если найдены свежие факты.
3. Отвечай прямо, точно, современно и структурированно на русском языке. При необходимости ссылайся на источники в формате Markdown: [Название источника](URL).
4. Если пользователь спрашивает о текущих событиях, персоналиях, курсах, релизах, новостях или содержимом сайтов — опирайся строго на предоставленные результаты поиска.
`;
}

// Pronouns and reference particles indicating follow-up questions
const PRONOUN_AND_ELLIPSIS_REGEX =
  /\b(он|она|оно|они|его|ее|их|ему|ей|им|нем|ней|них|это|этого|этому|этом|этот|эта|эти|эту|этих|туда|там|ссылк[а-я]*|документ[а-я]*|страниц[а-я]*|сайт[а-я]*|стать[а-я]*|it|he|she|they|its|his|her|their|this|that|link|document|page|site)\b/i;

/**
 * Extracts the primary entity, product, or subject from the immediate prior conversation turns
 */
export function extractTopicFromHistory(history?: Array<{ role: string; content: string }>): string {
  if (!history || !Array.isArray(history) || history.length === 0) return '';

  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    if (!msg || !msg.content || typeof msg.content !== 'string') continue;
    const text = msg.content.trim();
    if (text.length < 3) continue;

    // 0. Look for explicit URLs in history (prior user message with link or assistant response referencing link)
    const urlsInHistory = extractUrlsFromText(text);
    if (urlsInHistory.length > 0) {
      return urlsInHistory[0];
    }

    // 1. Look for English capitalized entity names (e.g. OpenAI Sora, Playdate, React 19)
    const properNounMatches = text.match(/\b[A-Z][a-zA-Z0-9]*(?:\s+[A-Z0-9][a-zA-Z0-9]*)*\b/g);
    if (properNounMatches && properNounMatches.length > 0) {
      const candidates = properNounMatches.filter(
        (p) =>
          p.length > 2 &&
          !['I', 'The', 'A', 'An', 'It', 'He', 'She', 'This', 'That', 'What', 'Where', 'When', 'Why', 'How'].includes(p)
      );
      if (candidates.length > 0) {
        return candidates[0];
      }
    }

    // 2. Look for Russian capitalized names/terms (e.g. Илон Маск, Джеймс Уэбб)
    const ruMatches = text.match(/\b[А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)*\b/g);
    if (ruMatches && ruMatches.length > 0) {
      const candidates = ruMatches.filter(
        (m) =>
          m.length > 3 &&
          !['Привет', 'Скажи', 'Подскажи', 'Пожалуйста', 'Спасибо', 'Здравствуйте', 'Добрый'].includes(m)
      );
      if (candidates.length > 0) {
        return candidates[0];
      }
    }

    // 3. If user message was short and declarative, use clean keywords of that message
    if (msg.role === 'user' && text.length < 60) {
      const clean = text.replace(/[?!:;.]+$/g, '').trim();
      if (clean.length > 2) {
        return clean;
      }
    }
  }

  return '';
}

/**
 * Resolves conversational follow-up questions (e.g. "Где её купить?", "Сколько он стоит?", "Когда релиз?")
 * using the immediate prior dialogue history to identify the target subject or entity.
 */
export function resolveConversationalQuery(
  newPrompt: string,
  history?: Array<{ role: string; content: string }>
): string {
  if (!newPrompt || typeof newPrompt !== 'string') return '';
  const trimmed = newPrompt.trim();
  const wordCount = trimmed.split(/\s+/).length;
  const hasPronoun = PRONOUN_AND_ELLIPSIS_REGEX.test(trimmed);

  if ((wordCount <= 6 || hasPronoun) && history && history.length > 0) {
    const topic = extractTopicFromHistory(history);
    if (topic && !trimmed.toLowerCase().includes(topic.toLowerCase())) {
      return `${topic} ${trimmed}`;
    }
  }
  return trimmed;
}
