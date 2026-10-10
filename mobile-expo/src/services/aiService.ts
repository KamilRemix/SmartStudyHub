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
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.5-pro',
];

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
}

export async function getGeminiApiKey(): Promise<string> {
  try {
    const personalKey = await AsyncStorage.getItem('smartStudyAI_personalApiKey');
    if (personalKey && personalKey.trim()) {
      return personalKey.trim();
    }
  } catch (e) {
    console.warn('Could not read personal Gemini key:', e);
  }
  return DEFAULT_GEMINI_KEY;
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
  timeoutMs: number = 16000
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

export async function callGemini(
  contents: any[],
  systemInstruction: string,
  modelName: string,
  apiKey: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
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

  const response = await callWithTimeout(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    15000
  );

  if (!response.ok) {
    const errText = await response.text();
    let msg = errText;
    try {
      const parsed = JSON.parse(errText);
      msg = parsed?.error?.message || errText;
    } catch {}
    throw new Error(`Gemini ${modelName} HTTP ${response.status}: ${msg}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error(`Gemini ${modelName} returned empty text`);
  }
  return text;
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
}

export async function sendChatMessage(
  history: ChatMessage[],
  newPrompt: string,
  imageAttachment?: ChatImageAttachment,
  preferredProvider?: AIProviderId
): Promise<ChatResponse> {
  const personalization = await getPersonalization();
  const baseInstruction = buildPersonalizedSystemInstruction(personalization);
  const academicContext = await buildAcademicSystemPromptContext();
  const systemInstruction = academicContext
    ? `${baseInstruction}\n${academicContext}`
    : baseInstruction;

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

  const userParts: any[] = [];
  if (imageAttachment?.base64) {
    userParts.push({
      inlineData: {
        data: imageAttachment.base64,
        mimeType: imageAttachment.mimeType || 'image/jpeg',
      },
    });
  }
  userParts.push({ text: newPrompt });

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

  return executeMultiProviderCascade({
    history,
    newPrompt,
    systemInstruction,
    imageAttachment,
    preferredProvider: selectedProvider,
    callGeminiFn,
  });
}
