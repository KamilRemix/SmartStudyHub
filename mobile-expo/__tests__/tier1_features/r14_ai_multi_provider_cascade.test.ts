import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AI_PROVIDERS,
  AIProviderId,
  generateUUID,
  getSelectedProvider,
  setSelectedProvider,
  executeMultiProviderCascade,
  getGigaChatAccessToken,
  resetGigaChatTokenCacheForTesting,
} from '../../src/services/aiMultiProviderService';
import { sendChatMessage, ChatMessage } from '../../src/services/aiService';

describe('AI Multi-Provider Smart Cascade & Balancing', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    resetGigaChatTokenCacheForTesting();
    jest.clearAllMocks();
  });

  describe('Provider Metadata and Configuration', () => {
    test('contains all 6 required AI providers plus Auto cascade', () => {
      const ids = AI_PROVIDERS.map((p) => p.id);
      expect(ids).toContain('auto');
      expect(ids).toContain('gigachat');
      expect(ids).toContain('gemini');
      expect(ids).toContain('groq');
      expect(ids).toContain('sambanova');
      expect(ids).toContain('openrouter');
      expect(ids).toContain('huggingface');
      expect(AI_PROVIDERS.length).toBe(7);
    });

    test('supports vision correctly for multimodal models only', () => {
      const gemini = AI_PROVIDERS.find((p) => p.id === 'gemini');
      const giga = AI_PROVIDERS.find((p) => p.id === 'gigachat');
      const groq = AI_PROVIDERS.find((p) => p.id === 'groq');
      const openrouter = AI_PROVIDERS.find((p) => p.id === 'openrouter');

      expect(gemini?.supportsVision).toBe(true);
      expect(openrouter?.supportsVision).toBe(true);
      expect(giga?.supportsVision).toBe(false);
      expect(groq?.supportsVision).toBe(false);
    });

    test('persists and retrieves selected provider preference', async () => {
      const defaultProvider = await getSelectedProvider();
      expect(defaultProvider).toBe('auto');

      await setSelectedProvider('gigachat');
      const updated = await getSelectedProvider();
      expect(updated).toBe('gigachat');

      await setSelectedProvider('groq');
      expect(await getSelectedProvider()).toBe('groq');
    });

    test('generates valid RFC4122 v4 UUID for GigaChat RqUID', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();

      expect(uuid1).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      expect(uuid2).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('Smart Cascade Fallback Logic', () => {
    test('returns primary provider when successful', async () => {
      const mockGemini = jest.fn().mockResolvedValue('Решение через формулу Виета');

      const result = await executeMultiProviderCascade({
        history: [],
        newPrompt: 'Как решить квадратное уравнение?',
        systemInstruction: 'Ты репетитор',
        preferredProvider: 'gemini',
        callGeminiFn: mockGemini,
      });

      expect(result.text).toBe('Решение через формулу Виета');
      expect(result.modelUsed).toContain('Gemini');
      expect(mockGemini).toHaveBeenCalled();
    });

    test('falls back to next provider when primary fails', async () => {
      const mockGemini = jest.fn().mockRejectedValue(new Error('Gemini 403 Forbidden'));

      // Mock global fetch for GigaChat OAuth and Completion
      const originalFetch = global.fetch;
      const mockFetch = jest.fn();

      mockFetch
        // First fetch call: GigaChat OAuth
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'test_token_abc',
            expires_at: Date.now() + 1800000,
          }),
        })
        // Second fetch call: GigaChat Completions
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: 'Ответ от GigaChat: $x_1 = -1, x_2 = 2$',
                },
              },
            ],
          }),
        });

      global.fetch = mockFetch as any;

      try {
        const result = await executeMultiProviderCascade({
          history: [],
          newPrompt: 'Реши x^2 - x - 2 = 0',
          systemInstruction: 'Помощник',
          preferredProvider: 'auto',
          callGeminiFn: mockGemini,
        });

        expect(result.text).toContain('Ответ от GigaChat');
        expect(result.modelUsed).toBe('GigaChat (Сбербанк)');
        expect(mockGemini).toHaveBeenCalled();
        expect(mockFetch).toHaveBeenCalledTimes(2);
      } finally {
        global.fetch = originalFetch;
      }
    });

    test('caches GigaChat token across requests', async () => {
      const originalFetch = global.fetch;
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'cached_token_123',
          expires_at: Date.now() + 3600000, // 1 hour ahead
        }),
      });

      global.fetch = mockFetch as any;

      try {
        const token1 = await getGigaChatAccessToken();
        const token2 = await getGigaChatAccessToken();

        expect(token1).toBe('cached_token_123');
        expect(token2).toBe('cached_token_123');
        // Fetch should only be called once because token is cached
        expect(mockFetch).toHaveBeenCalledTimes(1);
      } finally {
        global.fetch = originalFetch;
      }
    });

    test('routes multimodal queries exclusively through vision-capable models', async () => {
      const mockGemini = jest.fn().mockResolvedValue('На фото график параболы $y = x^2$');

      const result = await executeMultiProviderCascade({
        history: [],
        newPrompt: 'Что изображено на фото?',
        systemInstruction: 'Помощник',
        imageAttachment: {
          base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          mimeType: 'image/png',
        },
        preferredProvider: 'gigachat', // Even if user preferred non-vision, cascade uses vision for images
        callGeminiFn: mockGemini,
      });

      expect(mockGemini).toHaveBeenCalledWith('gemini-2.5-flash');
      expect(result.modelUsed).toContain('Gemini');
      expect(result.text).toContain('На фото график');
    });
  });
});
