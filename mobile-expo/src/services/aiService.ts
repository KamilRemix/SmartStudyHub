import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || '';

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

export async function sendChatMessage(messages: ChatMessage[], prompt: string): Promise<string> {
  const apiKey = await getApiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

  const contents = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  contents.push({
    role: 'user',
    parts: [{ text: prompt }]
  });

  const body = {
    contents,
    systemInstruction: {
      parts: [{
        text: "You are SmartStudyAI, a friendly, concise, and helpful academic assistant for students. Help with school and university subjects, homework, explaining difficult concepts simply, and generating clear step-by-step explanations. Reply in the same language as the user's message."
      }]
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!reply) {
    throw new Error("No response generated.");
  }
  return reply;
}

export async function generatePresentationSlides(
  topic: string,
  slideCount: number = 5,
  audience: string = 'General',
  language: string = 'ru'
): Promise<SlideItem[]> {
  const apiKey = await getApiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

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
Do not include any markdown formatting, backticks, or other text outside the JSON. Return only the raw JSON array.`;

  const body = {
    contents: [{
      role: 'user',
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.7,
      responseMimeType: "application/json"
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

  try {
    const slides: SlideItem[] = JSON.parse(text);
    return slides;
  } catch (err) {
    throw new Error("Failed to parse presentation slides JSON.");
  }
}
