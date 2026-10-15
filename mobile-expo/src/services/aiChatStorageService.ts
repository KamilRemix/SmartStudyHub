import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage } from './aiService';
import { cloudSyncService } from './cloudSync';
import { auth } from './firebase';

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export const AI_CHATS_STORAGE_KEY = '@smartstudy_ai_chats_data';
export const ACTIVE_CHAT_SESSION_KEY = '@smartstudy_active_chat_session_id';

const DEFAULT_WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'model',
  content:
    'Привет! Я твой персональный AI-помощник в учебе. Задай вопрос по домашке, прикрепи фото задачи, попроси объяснить сложную тему или составить тест!',
  timestamp: Date.now(),
};

export function createDefaultSession(): ChatSession {
  return {
    id: `chat_${Date.now()}`,
    title: 'Новый диалог',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [DEFAULT_WELCOME_MESSAGE],
  };
}

export async function loadAllChatSessions(): Promise<ChatSession[]> {
  try {
    const raw = await AsyncStorage.getItem(AI_CHATS_STORAGE_KEY);
    if (raw) {
      const parsed: ChatSession[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      }
    }
  } catch (err) {
    console.warn('[aiChatStorage] Error loading chat sessions:', err);
  }

  // Create initial session if none exists
  const initial = [createDefaultSession()];
  await saveAllChatSessions(initial);
  return initial;
}

export async function saveAllChatSessions(sessions: ChatSession[]): Promise<void> {
  try {
    await AsyncStorage.setItem(AI_CHATS_STORAGE_KEY, JSON.stringify(sessions));

    // Auto-trigger cloud sync if user is logged into Firebase
    const user = auth.currentUser;
    if (user?.uid && !user?.isAnonymous) {
      cloudSyncService.syncAiChatsDirect(user.uid, sessions).catch((err) => {
        console.warn('[aiChatStorage] Background cloud sync error:', err);
      });
    }
  } catch (err) {
    console.warn('[aiChatStorage] Error saving chat sessions:', err);
  }
}

export async function getActiveSessionId(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(ACTIVE_CHAT_SESSION_KEY);
    if (saved) return saved;
  } catch {}
  return '';
}

export async function setActiveSessionId(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(ACTIVE_CHAT_SESSION_KEY, id);
  } catch (err) {
    console.warn('[aiChatStorage] Error setting active session id:', err);
  }
}

/**
 * Generates an intelligent, clean, and concise title for a chat session from the first prompt.
 * Strips conversational fluff ("Привет", "Помоги решить", etc.) and extracts the subject/topic.
 */
export function generateSmartChatTitle(rawPrompt: string): string {
  if (!rawPrompt || typeof rawPrompt !== 'string') return 'Новый диалог';
  let clean = rawPrompt.trim();

  // 1. Photo / camera prompt
  if (
    clean.includes('[Изображение прикреплено]') ||
    clean.toLowerCase().includes('задание с фото') ||
    clean.toLowerCase().includes('задачу с фото') ||
    clean.toLowerCase().includes('уравнение на фото')
  ) {
    const stripped = clean.replace(/\[Изображение прикреплено\]/gi, '').trim();
    if (stripped.length > 3) {
      const topic = stripped.replace(/^[,\s:!.-]+/, '');
      return `Анализ фото: ${topic.slice(0, 24)}`.trim();
    }
    return 'Решение по фото';
  }

  // 2. Direct Web URLs or domain references
  const urlMatch = clean.match(/(?:https?:\/\/)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(\/[^\s]*)?/i);
  if (urlMatch && clean.length < 140) {
    const domain = urlMatch[1].replace(/^www\./i, '').toLowerCase();
    if (domain.includes('docs.google.com')) return 'Документ Google';
    if (domain.includes('wikipedia.org')) return 'Статья Wikipedia';
    if (domain.includes('habr.com')) return 'Статья Habr';
    if (domain.includes('github.com')) return 'Проект GitHub';
    return `Анализ ${domain}`;
  }

  // 3. Strip conversational greetings & intent prefixes
  const greetingPrefixes = [
    /^(?:привет|здравствуй(?:те)?|добрый (?:день|вечер|утро)|хай|салют|hello|hi|hey)[,!.\s]+/i,
    /^(?:подскажи(?: пожалуйста)?|пожалуйста|помоги(?: мне)?(?: решить)?|можешь помочь)[,!.\s]+/i,
    /^(?:объясни(?: мне| пожалуйста)?|расскажи(?: мне| пожалуйста)?|как решить|реши(?:ть)?(?: мне)?)[,!.\s]+/i,
    /^(?:что такое|кто такой|в чем разница|как работает|почему|зачем)[,\s]+/i,
    /^(?:напиши|составь|придумай|найди|дай)[,\s]+/i,
  ];

  for (const prefix of greetingPrefixes) {
    clean = clean.replace(prefix, '').trim();
  }

  // Strip trailing "пожалуйста" and punctuation
  clean = clean.replace(/[,.\s]*пожалуйста[!.]*$/i, '').trim();
  clean = clean.replace(/[?!:;.]+$/g, '').trim();

  // If after stripping it became too short, restore cleaned original
  if (clean.length < 3) {
    clean = rawPrompt.trim().replace(/\n/g, ' ').replace(/[?!:;.]+$/g, '');
  }

  // Capitalize first letter
  if (clean.length > 0) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  // Truncate cleanly at word boundary (max ~34 chars)
  if (clean.length > 34) {
    const words = clean.split(/\s+/);
    let truncated = '';
    for (const w of words) {
      if ((truncated + ' ' + w).trim().length > 30) break;
      truncated = (truncated + ' ' + w).trim();
    }
    clean = (truncated || clean.slice(0, 30)).trim() + '...';
  }

  return clean || 'Новый диалог';
}

export async function createNewChatSession(firstPrompt?: string): Promise<ChatSession> {
  const sessions = await loadAllChatSessions();
  const title = firstPrompt ? generateSmartChatTitle(firstPrompt) : 'Новый диалог';

  const newSession: ChatSession = {
    id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [DEFAULT_WELCOME_MESSAGE],
  };

  const updated = [newSession, ...sessions];
  await saveAllChatSessions(updated);
  await setActiveSessionId(newSession.id);
  return newSession;
}

export async function renameChatSession(
  sessionId: string,
  newTitle: string
): Promise<ChatSession[]> {
  const sessions = await loadAllChatSessions();
  const index = sessions.findIndex((s) => s.id === sessionId);
  if (index !== -1) {
    const cleanTitle = newTitle.trim() || 'Новый диалог';
    sessions[index] = {
      ...sessions[index],
      title: cleanTitle,
      updatedAt: Date.now(),
    };
    await saveAllChatSessions(sessions);
  }
  return sessions;
}

export async function updateSessionMessages(
  sessionId: string,
  messages: ChatMessage[]
): Promise<ChatSession[]> {
  const sessions = await loadAllChatSessions();
  const index = sessions.findIndex((s) => s.id === sessionId);

  if (index === -1) {
    // If not found, create new session with these messages
    const firstUserMsg = messages.find((m) => m.role === 'user');
    const title = firstUserMsg?.content ? generateSmartChatTitle(firstUserMsg.content) : 'Новый диалог';

    const newSession: ChatSession = {
      id: sessionId,
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages,
    };
    const updated = [newSession, ...sessions];
    await saveAllChatSessions(updated);
    return updated;
  }

  // Update existing session title if default
  let title = sessions[index].title;
  if (!title || title === 'Новый диалог' || title === 'New Chat') {
    const firstUserMsg = messages.find((m) => m.role === 'user');
    if (firstUserMsg?.content) {
      title = generateSmartChatTitle(firstUserMsg.content);
    }
  }

  sessions[index] = {
    ...sessions[index],
    title,
    messages,
    updatedAt: Date.now(),
  };

  sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  await saveAllChatSessions(sessions);
  return sessions;
}

export async function deleteChatSession(sessionId: string): Promise<ChatSession[]> {
  const sessions = await loadAllChatSessions();
  const filtered = sessions.filter((s) => s.id !== sessionId);

  if (filtered.length === 0) {
    const fresh = createDefaultSession();
    await saveAllChatSessions([fresh]);
    await setActiveSessionId(fresh.id);
    return [fresh];
  }

  await saveAllChatSessions(filtered);
  const currentActive = await getActiveSessionId();
  if (currentActive === sessionId) {
    await setActiveSessionId(filtered[0].id);
  }
  return filtered;
}
