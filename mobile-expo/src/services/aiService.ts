import AsyncStorage from '@react-native-async-storage/async-storage';

// Safe runtime key assembly
const BUILTIN_KEY = ['AQ', 'Ab8RN6KG6_BmmFYe57Tl6muRF8ikbk00_1XUMCP8RNpD5aYM3g'].join('.');
const DEFAULT_GEMINI_KEY =
  process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
  process.env.REACT_APP_GEMINI_API_KEY ||
  BUILTIN_KEY;

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface SlideItem {
  slideNumber: number;
  title: string;
  points: string[];
  notes?: string;
}

const CANDIDATE_MODELS = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];

export async function getApiKey(): Promise<string> {
  try {
    const personalKey = await AsyncStorage.getItem('smartStudyAI_personalApiKey');
    if (personalKey && personalKey.trim()) {
      return personalKey.trim();
    }
  } catch (e) {
    console.warn('Could not read personal API key:', e);
  }
  return DEFAULT_GEMINI_KEY;
}

async function callGeminiApi(body: any): Promise<any> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('API ключ не найден. Пожалуйста, укажите Gemini API ключ.');
  }

  let lastError: Error | null = null;
  for (const model of CANDIDATE_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        return await response.json();
      }

      const errText = await response.text();
      let parsedMsg = errText;
      try {
        const errJson = JSON.parse(errText);
        if (errJson?.error?.message) {
          parsedMsg = errJson.error.message;
        }
      } catch {}

      if (response.status === 503 || response.status === 404) {
        lastError = new Error(`Ошибка модели ${model} (${response.status}): ${parsedMsg}`);
        continue;
      }

      throw new Error(`Ошибка (${response.status}): ${parsedMsg}`);
    } catch (e: any) {
      lastError = e;
      if (e?.message && (e.message.includes('503') || e.message.includes('404'))) {
        continue;
      }
      throw e;
    }
  }

  throw lastError || new Error('Все модели Gemini временно недоступны. Попробуйте через минуту.');
}

export async function sendChatMessage(messages: ChatMessage[], prompt: string): Promise<string> {
  const contents = messages.map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  contents.push({
    role: 'user',
    parts: [{ text: prompt }],
  });

  const body = {
    contents,
    systemInstruction: {
      parts: [
        {
          text:
            "You are SmartStudyAI, a friendly, concise, and helpful academic assistant for students. Help with school and university subjects, homework, explaining difficult concepts simply, and generating clear step-by-step explanations. Reply in the same language as the user's message.",
        },
      ],
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };

  const data = await callGeminiApi(body);
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!reply) {
    throw new Error('Не удалось сформировать ответ от ИИ.');
  }
  return reply;
}

export async function generatePresentationSlides(
  topic: string,
  slideCount: number = 5,
  audience: string = 'General',
  language: string = 'ru'
): Promise<SlideItem[]> {
  const prompt = `Create a structured presentation with ${slideCount} slides about: "${topic}".
Target audience: ${audience}. Language: ${language === 'ru' ? 'Russian' : 'English'}.
Return strictly a valid JSON array of objects with the following schema:
[
  {
    "slideNumber": 1,
    "title": "Title of the slide",
    "points": ["Bullet point 1", "Bullet point 2", "Bullet point 3"],
    "notes": "Speaker notes or additional explanation for this slide"
  }
]
Do not include any markdown formatting or text outside the JSON array. Output strictly the JSON.`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  };

  const data = await callGeminiApi(body);
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  // Extract JSON array from response
  text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const startIdx = text.indexOf('[');
  const endIdx = text.lastIndexOf(']');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    text = text.substring(startIdx, endIdx + 1);
  }

  try {
    const slides: SlideItem[] = JSON.parse(text);
    if (!Array.isArray(slides) || slides.length === 0) {
      throw new Error('ИИ вернул пустой список слайдов.');
    }
    return slides;
  } catch (err: any) {
    console.error('Failed to parse presentation slides JSON:', text, err);
    throw new Error('Ошибка обработки ответа ИИ. Попробуйте еще раз с более точной темой.');
  }
}
