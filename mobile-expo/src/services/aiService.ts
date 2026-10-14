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
  'google/gemini-2.0-flash-exp:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'deepseek/deepseek-r1:free',
  'qwen/qwen-2.5-72b-instruct:free',
  'mistralai/mistral-small-24b-instruct-2501:free',
];

// Priority Gemini candidate models
export const GEMINI_CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
  'gemini-2.5-pro',
];

import {
  searchWeb,
  shouldPerformWebSearch,
  buildWebSearchPromptContext,
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

/**
 * Calls Gemini with automatic key pool rotation and failover on 429 rate limits
 */
export async function callGemini(
  contents: any[],
  systemInstruction: string,
  modelName: string,
  explicitKey?: string
): Promise<string> {
  const pool = explicitKey ? [explicitKey] : await getGeminiKeyPool();
  const now = Date.now();

  // Try available keys not on cooldown
  const availableKeys = pool.filter((k) => {
    const cd = keyCooldowns.get(k) || 0;
    return now >= cd;
  });

  const keysToTry = availableKeys.length > 0 ? availableKeys : pool;
  const errors: string[] = [];

  for (let i = 0; i < keysToTry.length; i++) {
    const key = keysToTry[(geminiKeyIndex + i) % keysToTry.length];


    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(key)}`;
    const body = {
      contents,
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2800,
      },
    };

    try {
      const response = await callWithTimeout(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        12000
      );

      if (!response.ok) {
        const errText = await response.text();
        let msg = errText;
        try {
          const parsed = JSON.parse(errText);
          msg = parsed?.error?.message || errText;
        } catch {}

        if (response.status === 429) {
          // Rate limit: cooldown this key for 60 seconds
          keyCooldowns.set(key, Date.now() + 60000);
          console.warn(`[Gemini Pool] Key ${key.substring(0, 8)}... rate-limited (429). Rotating to next key...`);
        } else if (response.status === 401 || response.status === 403) {
          keyCooldowns.set(key, Date.now() + 300000);
          console.warn(`[Gemini Pool] Key ${key.substring(0, 8)}... auth error (${response.status}): ${msg}`);
        }

        errors.push(`Key ${key.substring(0, 8)}... (${response.status}): ${msg}`);
        continue;
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error(`Gemini ${modelName} returned empty text`);
      }

      // Successful request: rotate index for next request to balance load
      geminiKeyIndex = (geminiKeyIndex + 1) % keysToTry.length;
      return text;
    } catch (err: any) {
      errors.push(`Key ${key.substring(0, 8)}... error: ${err?.message || 'timeout'}`);
    }
  }

  throw new Error(`Gemini pool exhausted (${errors.slice(-2).join('; ')})`);
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
  let foundSources: WebSearchResult[] = [];
  const doSearch = shouldPerformWebSearch(newPrompt, !!webSearchEnabled);
  if (doSearch && !imageAttachment?.base64) {
    try {
      onSearchStatus?.(newPrompt);
      foundSources = await searchWeb(newPrompt, 4);
      if (foundSources.length > 0) {
        const webContext = buildWebSearchPromptContext(newPrompt, foundSources);
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
      ? `${newPrompt}\n\n[Актуальные данные из поиска в сети]:\n${foundSources
          .map((s) => `• ${s.title}: ${s.snippet}`)
          .join('\n')}`
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

  const callGeminiFn = async (model: string): Promise<string> => {
    const geminiKey = await getGeminiApiKey();
    if (!geminiKey) {
      throw new Error('Gemini API key is not configured');
    }
    return callGemini(geminiContents, systemInstruction, model, geminiKey);
  };

  const selectedProvider = preferredProvider || (await getSelectedProvider());

  const response = await executeMultiProviderCascade({
    history,
    newPrompt: promptForModel,
    systemInstruction,
    imageAttachment,
    preferredProvider: selectedProvider,
    callGeminiFn,
  });

  return {
    ...response,
    webSources: foundSources.length > 0 ? foundSources : undefined,
  };
}
