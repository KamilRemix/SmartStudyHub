import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadAllChatSessions,
  saveAllChatSessions,
  createNewChatSession,
  updateSessionMessages,
  deleteChatSession,
  AI_CHATS_STORAGE_KEY,
} from '../../src/services/aiChatStorageService';
import {
  parseMessageBlocks,
  renderInlineSpans,
} from '../../src/modules/tools/components/ChatMessageRenderer';

describe('AI Assistant Markdown Formatting & Chat History Sessions', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe('Markdown Inline and Block Parsing', () => {
    test('renders inline spans for bold text without raw ** symbols', () => {
      const line = 'Это **важная формула** для решения задачи';
      const spans = renderInlineSpans(line, '#000000');
      expect(spans.length).toBeGreaterThan(1);

      // Verify that no span displays literal '**'
      const texts = spans.map((s: any) => s.props.children).join('');
      expect(texts).not.toContain('**');
      expect(texts).toContain('важная формула');
    });

    test('renders inline spans for italic text without raw * symbols', () => {
      const line = 'Пояснение: *обратите внимание на знак*';
      const spans = renderInlineSpans(line, '#000000');
      const texts = spans.map((s: any) => s.props.children).join('');
      expect(texts).not.toContain('*обратите');
      expect(texts).toContain('обратите внимание на знак');
    });

    test('extracts code blocks and display math correctly from content', () => {
      const content =
        'Вот решение:\n```python\ndef solve(x):\n    return x * 2\n```\nА также формула:\n$$\\int_0^1 x dx$$\nУдачи!';

      const blocks = parseMessageBlocks(content);
      expect(blocks.length).toBe(5);
      expect(blocks[1].type).toBe('code');
      if (blocks[1].type === 'code') {
        expect(blocks[1].language).toBe('python');
        expect(blocks[1].code).toContain('solve');
      }
      expect(blocks[3].type).toBe('display_math');
      if (blocks[3].type === 'display_math') {
        expect(blocks[3].latex).toBe('\\int_0^1 x dx');
      }
    });
  });

  describe('Chat Sessions Storage & Management', () => {
    test('creates default session when empty', async () => {
      const sessions = await loadAllChatSessions();
      expect(sessions.length).toBe(1);
      expect(sessions[0].title).toBe('Новый диалог');
      expect(sessions[0].messages.length).toBe(1);
      expect(sessions[0].messages[0].id).toBe('welcome');
    });

    test('creates new session and updates title from first user message', async () => {
      const initial = await loadAllChatSessions();
      const newSession = await createNewChatSession('Как решить квадратное уравнение?');
      expect(newSession.title).toContain('Как решить квадратное');

      const all = await loadAllChatSessions();
      expect(all.length).toBe(initial.length + 1);

      // Update messages in this session
      const updatedMessages = [
        ...newSession.messages,
        {
          id: 'user_1',
          role: 'user' as const,
          content: 'Как решить квадратное уравнение?',
          timestamp: Date.now(),
        },
        {
          id: 'model_1',
          role: 'model' as const,
          content: 'Через формулу дискриминанта $D = b^2 - 4ac$',
          timestamp: Date.now(),
        },
      ];

      const afterUpdate = await updateSessionMessages(newSession.id, updatedMessages);
      const current = afterUpdate.find((s) => s.id === newSession.id);
      expect(current).toBeDefined();
      expect(current?.messages.length).toBe(3);
    });

    test('deletes a session cleanly', async () => {
      const s1 = await createNewChatSession('Диалог 1');
      const s2 = await createNewChatSession('Диалог 2');
      let all = await loadAllChatSessions();
      expect(all.length).toBeGreaterThanOrEqual(2);

      await deleteChatSession(s1.id);
      all = await loadAllChatSessions();
      expect(all.some((s) => s.id === s1.id)).toBe(false);
    });
  });
});
