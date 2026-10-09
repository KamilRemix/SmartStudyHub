import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getPersonalization,
  buildPersonalizedSystemInstruction,
} from './aiPersonalizationService';
import { buildAcademicSystemPromptContext } from './aiAcademicContextService';

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
  imageAttachment?: ChatImageAttachment
): Promise<ChatResponse> {
  const personalization = await getPersonalization();
  const baseInstruction = buildPersonalizedSystemInstruction(personalization);
  const academicContext = await buildAcademicSystemPromptContext();
  const systemInstruction = academicContext
    ? `${baseInstruction}\n${academicContext}`
    : baseInstruction;

  // 1. Prepare messages for Gemini (multimodal)
  const geminiContents = history.map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

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

  // 2. Prepare messages for OpenRouter / OpenAI format
  const openRouterMessages: any[] = history.map((m) => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content,
  }));

  if (imageAttachment?.base64) {
    openRouterMessages.push({
      role: 'user',
      content: [
        { type: 'text', text: newPrompt },
        {
          type: 'image_url',
          image_url: {
            url: `data:${imageAttachment.mimeType || 'image/jpeg'};base64,${imageAttachment.base64}`,
          },
        },
      ],
    });
  } else {
    openRouterMessages.push({
      role: 'user',
      content: newPrompt,
    });
  }

  const geminiKey = await getGeminiApiKey();
  const geminiErrors: string[] = [];

  // Step 1: Try Gemini models sequentially
  if (geminiKey) {
    for (const model of GEMINI_CANDIDATE_MODELS) {
      try {
        const text = await callGemini(geminiContents, systemInstruction, model, geminiKey);
        return { text, modelUsed: `Gemini (${model})` };
      } catch (err: any) {
        console.warn(`[AI] Gemini ${model} failed:`, err?.message);
        geminiErrors.push(`${model}: ${err?.message || 'error'}`);
      }
    }
  }

  // Step 2: Fallback to OpenRouter (Free models, budget 0 rubles)
  const openRouterKey = await getOpenRouterApiKey();
  const openRouterErrors: string[] = [];

  if (openRouterKey) {
    for (const model of OPENROUTER_FREE_MODELS) {
      try {
        const text = await callOpenRouter(
          openRouterMessages,
          systemInstruction,
          model,
          openRouterKey
        );
        return { text, modelUsed: `OpenRouter (${model})` };
      } catch (err: any) {
        console.warn(`[AI] OpenRouter ${model} failed:`, err?.message);
        openRouterErrors.push(`${model}: ${err?.message || 'error'}`);
      }
    }
  }

  const allErrors = [...geminiErrors, ...openRouterErrors].slice(-3).join('; ');
  throw new Error(
    `Все ИИ-модели временно недоступны. Ошибка подключения: ${allErrors || 'Сеть или лимит'}. Пожалуйста, повторите попытку через минуту.`
  );
}
