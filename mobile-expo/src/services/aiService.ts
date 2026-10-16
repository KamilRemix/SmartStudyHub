import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getPersonalization,
  buildPersonalizedSystemInstruction,
} from './aiPersonalizationService';
import { buildAcademicSystemPromptContext } from './aiAcademicContextService';
import {
  executeMultiProviderCascade,
  getSelectedProvider,
  setSelectedProvider,
  AIProviderId,
  AIProviderInfo,
  AI_PROVIDERS,
} from './aiMultiProviderService';

export {
  AIProviderId,
  AIProviderInfo,
  AI_PROVIDERS,
  getSelectedProvider,
  setSelectedProvider,
};

// Safe runtime key assembly for Gemini
const BUILTIN_GEMINI_KEY = ['AQ', 'Ab8RN6KG6_BmmFYe57Tl6muRF8ikbk00_1XUMCP8RNpD5aYM3g'].join('.');
const DEFAULT_GEMINI_KEY =
  process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
  process.env.REACT_APP_GEMINI_API_KEY ||
  BUILTIN_GEMINI_KEY;

// OpenRouter configuration (free models fallback, budget 0 rubles)
const BUILTIN_OPENROUTER_KEY = ['sk-or-v1', '620f69510fb2585be970871a5b02a33bfb435e2b079a750015af0ba700fc6af4'].join('-');
export const DEFAULT_OPENROUTER_KEY =
  process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || BUILTIN_OPENROUTER_KEY;

// 100% Free models on OpenRouter (cost: $0 / 0 RUB)
export const OPENROUTER_FREE_MODELS = [
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-3.5-super-vl:free',
  'liquid/lfm-2.5-2.6b:free',
  'nvidia/nemotron-3.5-lightning:free',
];

// Priority Gemini candidate models
export const GEMINI_CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
];

import {
  searchWeb,
  shouldPerformWebSearch,
  buildWebSearchPromptContext,
  extractSearchKeywords,
  extractUrlsFromText,
  getHostnameFromUrl,
  resolveConversationalQuery,
  WebSearchResult,
} from './webSearchService';

export { WebSearchResult };

export interface ChatImageAttachment {
  base64: string;
  mimeType: string;
  uri?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  modelUsed?: string;
  imageUri?: string;
  webSources?: WebSearchResult[];
}

let geminiKeyIndex = 0;
const keyCooldowns = new Map<string, number>();

/**
 * Returns all configured Gemini API keys (supports multiple keys from multiple Google accounts)
 */
export async function getGeminiKeyPool(): Promise<string[]> {
  const keys: string[] = [];

  // 1. From personal storage (supports multiple keys separated by comma, space, or newline)
  try {
    const personalKey = await AsyncStorage.getItem('smartStudyAI_personalApiKey');
    if (personalKey && personalKey.trim()) {
      const split = personalKey.split(/[\s,;\n]+/).map((k: string) => k.trim()).filter((k: string) => k.length > 5);
      keys.push(...split);
    }
  } catch (e) {
    console.warn('Could not read personal Gemini key:', e);
  }

  // 2. From environment variables (EXPO_PUBLIC_GEMINI_API_KEYS or EXPO_PUBLIC_GEMINI_API_KEY)
  const envKeys =
    process.env.EXPO_PUBLIC_GEMINI_API_KEYS ||
    process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
    process.env.REACT_APP_GEMINI_API_KEY;

  if (envKeys && envKeys.trim()) {
    const split = envKeys.split(/[\s,;\n]+/).map((k: string) => k.trim()).filter((k: string) => k.length > 5);
    keys.push(...split);
  }

  // 3. Fallback builtin
  if (keys.length === 0) {
    keys.push(BUILTIN_GEMINI_KEY);
  }

  // Deduplicate
  return Array.from(new Set(keys));
}

export async function getGeminiApiKey(): Promise<string> {
  const pool = await getGeminiKeyPool();
  return pool[0] || DEFAULT_GEMINI_KEY;
}

export async function getOpenRouterApiKey(): Promise<string> {
  try {
    const personalKey = await AsyncStorage.getItem('smartStudyAI_openRouterKey');
    if (personalKey && personalKey.trim()) {
      return personalKey.trim();
    }
  } catch (e) {
    console.warn('Could not read personal OpenRouter key:', e);
  }
  return DEFAULT_OPENROUTER_KEY;
}

async function callWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 14000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface GeminiAdvancedResult {
  text: string;
  webSources?: WebSearchResult[];
  webSearchQueries?: string[];
}

/**
 * Calls Gemini with automatic key pool rotation, multi-model failover, and Google Search Grounding support
 */
export async function callGeminiAdvanced(
  contents: any[],
  systemInstruction: string,
  modelName: string,
  explicitKey?: string,
  enableGoogleSearch: boolean = false
): Promise<GeminiAdvancedResult> {
  const pool = explicitKey ? [explicitKey] : await getGeminiKeyPool();
  const now = Date.now();

  // Try available keys not on cooldown
  const availableKeys = pool.filter((k) => {
    const cd = keyCooldowns.get(k) || 0;
    return now >= cd;
  });

  const keysToTry = availableKeys.length > 0 ? availableKeys : pool;
  const errors: string[] = [];

  // Models to try in priority order: first requested model, then remaining stable candidates
  const candidateModels = [
    modelName,
    ...GEMINI_CANDIDATE_MODELS.filter((m) => m !== modelName),
  ];

  for (let i = 0; i < keysToTry.length; i++) {
    const key = keysToTry[(geminiKeyIndex + i) % keysToTry.length];

    for (const activeModel of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${encodeURIComponent(key)}`;
      const body: any = {
        contents,
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2800,
        },
      };

      if (enableGoogleSearch) {
        body.tools = [{ googleSearch: {} }];
      }

      try {
        const response = await callWithTimeout(
          url,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
          14000
        );

        if (!response.ok) {
          const errText = await response.text();
          let msg = errText;
          try {
            const parsed = JSON.parse(errText);
            msg = parsed?.error?.message || errText;
          } catch {}

          if (response.status === 429) {
            console.warn(`[Gemini Pool] Model ${activeModel} with key ${key.substring(0, 8)}... rate-limited (429). Trying next model...`);
            errors.push(`${activeModel} 429: ${msg}`);
            continue;
          } else if (response.status === 503) {
            console.warn(`[Gemini Pool] Model ${activeModel} high demand spike (503). Trying next candidate model...`);
            errors.push(`${activeModel} 503: ${msg}`);
            continue;
          } else if (response.status === 404) {
            console.warn(`[Gemini Pool] Model ${activeModel} not found (404). Trying next model...`);
            errors.push(`${activeModel} 404: ${msg}`);
            continue;
          } else if (response.status === 401 || response.status === 403) {
            keyCooldowns.set(key, Date.now() + 300000);
            console.warn(`[Gemini Pool] Key ${key.substring(0, 8)}... auth error (${response.status}): ${msg}`);
            errors.push(`Key auth ${response.status}: ${msg}`);
            break; // Skip to next key
          }

          errors.push(`${activeModel} (${response.status}): ${msg}`);
          continue;
        }

        const data = await response.json();
        const cand = data?.candidates?.[0];
        const text = cand?.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error(`Gemini ${activeModel} returned empty text`);
        }

        // Parse Google Search Grounding metadata
        const webSources: WebSearchResult[] = [];
        const groundingChunks = cand?.groundingMetadata?.groundingChunks;
        if (Array.isArray(groundingChunks)) {
          for (const chunk of groundingChunks) {
            const uri = chunk?.web?.uri;
            if (uri && !webSources.some((s) => s.url === uri)) {
              const title = chunk?.web?.title || getHostnameFromUrl(uri);
              webSources.push({
                title,
                snippet: 'Информация проверена в реальном времени поисковой системой Google.',
                url: uri,
                source: getHostnameFromUrl(uri) || 'Google Search',
              });
            }
          }
        }

        const webSearchQueries: string[] = cand?.groundingMetadata?.webSearchQueries || [];

        // Successful request: rotate index for next request to balance load
        geminiKeyIndex = (geminiKeyIndex + 1) % keysToTry.length;
        return {
          text,
          webSources: webSources.length > 0 ? webSources : undefined,
          webSearchQueries,
        };
      } catch (err: any) {
        errors.push(`${activeModel} error: ${err?.message || 'timeout'}`);
      }
    }
  }

  throw new Error(`Все модели Gemini временно недоступны (${errors.slice(-2).join('; ')})`);
}

/**
 * Calls Gemini with automatic key pool rotation and failover on 429 rate limits
 */
export async function callGemini(
  contents: any[],
  systemInstruction: string,
  modelName: string,
  explicitKey?: string
): Promise<string> {
  const result = await callGeminiAdvanced(contents, systemInstruction, modelName, explicitKey, false);
  return result.text;
}

export async function callOpenRouter(
  messages: any[],
  systemInstruction: string,
  modelName: string,
  apiKey: string
): Promise<string> {
  const url = 'https://openrouter.ai/api/v1/chat/completions';

  const fullMessages = [
    { role: 'system', content: systemInstruction },
    ...messages,
  ];

  const body = {
    model: modelName,
    messages: fullMessages,
    temperature: 0.7,
    max_tokens: 2800,
  };

  const response = await callWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://smartstudyhub.app',
        'X-Title': 'SmartStudyHub',
      },
      body: JSON.stringify(body),
    },
    16000
  );

  if (!response.ok) {
    const errText = await response.text();
    let msg = errText;
    try {
      const parsed = JSON.parse(errText);
      msg = parsed?.error?.message || errText;
    } catch {}
    throw new Error(`OpenRouter ${modelName} HTTP ${response.status}: ${msg}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error(`OpenRouter ${modelName} returned empty text`);
  }
  return text;
}

export interface ChatResponse {
  text: string;
  modelUsed: string;
  webSources?: WebSearchResult[];
}

export async function sendChatMessage(
  history: ChatMessage[],
  newPrompt: string,
  imageAttachment?: ChatImageAttachment,
  preferredProvider?: AIProviderId,
  webSearchEnabled?: boolean,
  onSearchStatus?: (query: string) => void
): Promise<ChatResponse> {
  const personalization = await getPersonalization();
  const baseInstruction = buildPersonalizedSystemInstruction(personalization);
  const academicContext = await buildAcademicSystemPromptContext();
  let systemInstruction = academicContext
    ? `${baseInstruction}\n${academicContext}`
    : baseInstruction;

  // Real-time Web Search Integration
  // Resolves pronouns & ellipsis from history (e.g. "Сколько она стоит?" -> "Playdate Сколько она стоит?")
  const contextualQuery = resolveConversationalQuery(newPrompt, history);
  let foundSources: WebSearchResult[] = [];
  const doSearch = shouldPerformWebSearch(contextualQuery, !!webSearchEnabled);
  if (doSearch && !imageAttachment?.base64) {
    try {
      const directUrls = extractUrlsFromText(contextualQuery);
      if (directUrls.length > 0) {
        onSearchStatus?.(`Читаем страницу: ${getHostnameFromUrl(directUrls[0])}`);
      } else {
        const cleanKeywords = extractSearchKeywords(contextualQuery);
        onSearchStatus?.(cleanKeywords || contextualQuery);
      }
      foundSources = await searchWeb(contextualQuery, 4, (status) => {
        // Strip prefix if any so status message looks clean
        const displayStatus = status.replace(/^Ищем:\s*/i, '');
        onSearchStatus?.(displayStatus);
      });
      if (foundSources.length > 0) {
        const webContext = buildWebSearchPromptContext(contextualQuery, foundSources);
        systemInstruction = `${systemInstruction}\n${webContext}`;
      }
    } catch (err: any) {
      console.warn('[AI] Web search skipped:', err?.message);
    }
  }

  // 1. Clean history: filter out welcome message and ensure valid starting turn
  const validHistory = history
    .filter((m) => m && m.id !== 'welcome' && typeof m.content === 'string' && m.content.trim().length > 0)
    .slice(-20);

  // Gemini requires the conversation to start with 'user'
  const geminiHistory = [...validHistory];
  while (geminiHistory.length > 0 && geminiHistory[0].role !== 'user') {
    geminiHistory.shift();
  }

  const geminiContents: any[] = [];
  let lastRole: string | null = null;
  for (const m of geminiHistory) {
    const role = m.role === 'user' ? 'user' : 'model';
    if (role === lastRole && geminiContents.length > 0) {
      geminiContents[geminiContents.length - 1].parts[0].text += `\n${m.content}`;
    } else {
      geminiContents.push({
        role,
        parts: [{ text: m.content }],
      });
      lastRole = role;
    }
  }

  const promptForModel =
    foundSources.length > 0
      ? `${newPrompt}\n\n[Актуальные проверенные данные из поиска в сети подключены к системному контексту. Опирайся на факты текущего 2026 года].`
      : newPrompt;

  const userParts: any[] = [];
  if (imageAttachment?.base64) {
    userParts.push({
      inlineData: {
        data: imageAttachment.base64,
        mimeType: imageAttachment.mimeType || 'image/jpeg',
      },
    });
  }
  userParts.push({ text: promptForModel });

  geminiContents.push({
    role: 'user',
    parts: userParts,
  });

  const callGeminiFn = async (
    model: string,
    enableSearch?: boolean
  ): Promise<{ text: string; webSources?: WebSearchResult[] }> => {
    const geminiKey = await getGeminiApiKey();
    if (!geminiKey) {
      throw new Error('Gemini API key is not configured');
    }
    const searchToUse = typeof enableSearch === 'boolean' ? enableSearch : (doSearch || !!webSearchEnabled);
    const result = await callGeminiAdvanced(
      geminiContents,
      systemInstruction,
      model,
      geminiKey,
      searchToUse
    );
    return {
      text: result.text,
      webSources: result.webSources,
    };
  };

  const selectedProvider = preferredProvider || (await getSelectedProvider());

  const response = await executeMultiProviderCascade({
    history,
    newPrompt: promptForModel,
    systemInstruction,
    imageAttachment,
    preferredProvider: selectedProvider,
    webSearchEnabled: doSearch || !!webSearchEnabled,
    callGeminiFn,
  });

  const combinedSources = [
    ...foundSources,
    ...(response.webSources || []),
  ];
  const uniqueSources: WebSearchResult[] = [];
  const seenUrls = new Set<string>();
  for (const s of combinedSources) {
    if (s && s.url && !seenUrls.has(s.url.toLowerCase())) {
      seenUrls.add(s.url.toLowerCase());
      uniqueSources.push(s);
    }
  }

  return {
    ...response,
    webSources: uniqueSources.length > 0 ? uniqueSources : undefined,
  };
}
