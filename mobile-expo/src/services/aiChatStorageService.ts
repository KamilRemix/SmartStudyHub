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

export async function createNewChatSession(firstPrompt?: string): Promise<ChatSession> {
  const sessions = await loadAllChatSessions();
  let title = 'Новый диалог';
  if (firstPrompt && firstPrompt.trim()) {
    const clean = firstPrompt.trim().replace(/\n/g, ' ');
    title = clean.length > 32 ? `${clean.slice(0, 32)}...` : clean;
  }

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

export async function updateSessionMessages(
  sessionId: string,
  messages: ChatMessage[]
): Promise<ChatSession[]> {
  const sessions = await loadAllChatSessions();
  const index = sessions.findIndex((s) => s.id === sessionId);

  if (index === -1) {
    // If not found, create new session with these messages
    const firstUserMsg = messages.find((m) => m.role === 'user');
    let title = 'Новый диалог';
    if (firstUserMsg?.content) {
      const clean = firstUserMsg.content.trim().replace(/\n/g, ' ');
      title = clean.length > 32 ? `${clean.slice(0, 32)}...` : clean;
    }

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

  // Update existing session
  let title = sessions[index].title;
  if (title === 'Новый диалог') {
    const firstUserMsg = messages.find((m) => m.role === 'user');
    if (firstUserMsg?.content) {
      const clean = firstUserMsg.content.trim().replace(/\n/g, ' ');
      title = clean.length > 32 ? `${clean.slice(0, 32)}...` : clean;
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
