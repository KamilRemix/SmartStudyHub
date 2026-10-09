import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AIPersonalization {
  instructions: string;
  enabled: boolean;
}

export const DEFAULT_PERSONALIZATION: AIPersonalization = {
  instructions: '',
  enabled: true,
};

export const PRESET_INSTRUCTION_SNIPPETS = [
  'Я студент, объясняй глубоко и с доказательствами',
  'Всегда оформляй математические формулы через LaTeX ($...$ и $$...$$)',
  'Давай пошаговое решение с проверкой каждого этапа',
  'Объясняй простыми словами и наглядными аналогиями',
  'Пиши код с комментариями на русском к каждой важной строке',
  'Отвечай кратко и сразу по существу без лишних вступлений',
];

const STORAGE_KEY = '@smartstudy_ai_personalization_custom';

export async function getPersonalization(): Promise<AIPersonalization> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_PERSONALIZATION, ...parsed };
    }
  } catch (err) {
    console.warn('Failed to load AI personalization:', err);
  }
  return DEFAULT_PERSONALIZATION;
}

export async function savePersonalization(settings: AIPersonalization): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Failed to save AI personalization:', err);
  }
}

export function buildPersonalizedSystemInstruction(
  personalization: AIPersonalization
): string {
  const baseInstruction =
    "You are SmartStudyAI, an expert, friendly, and structured academic mentor for students and learners. " +
    "Help with university and school subjects, problem-solving, mathematics, physics, computer science, and writing. " +
    "Always format code blocks with triple backticks specifying the programming language (e.g. ```python, ```bash). " +
    "Always format mathematical equations, scientific variables, and calculations using clean LaTeX notation: use $$...$$ for display formulas and $...$ for inline formulas (e.g. $E = mc^2$, $$\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$). " +
    "Reply in the same language as the user's message.";

  if (!personalization.enabled || !personalization.instructions.trim()) {
    return baseInstruction;
  }

  return `${baseInstruction}\n\n[USER CUSTOM INSTRUCTIONS & PERSISTENT CONTEXT]:\n${personalization.instructions.trim()}\nStrictly adhere to these user preferences throughout the conversation.`;
}
