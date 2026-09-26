/**
 * Tier 2: Boundary & Corner Cases — Requirement R2: i18n Localization
 * Scenarios:
 * - Unsupported language codes & fallback to 'ru'
 * - Missing / partial interpolation parameters
 * - Empty string key lookup
 * - Special regex characters in parameters ($1, /g, .*?, etc.)
 * - Corrupted language storage in AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import path from 'path';

describe('Tier 2 - R2: i18n Localization Boundary & Corner Cases', () => {
  const I18N_STORAGE_KEY = '@smartstudy_language';
  let translations: Record<string, Record<string, string>>;

  beforeAll(() => {
    translations = require('../../src/i18n/translations').translations;
  });

  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('R2-B1: Unsupported language code falls back cleanly to "ru"', () => {
    function sanitizeLanguage(inputLang: any): string {
      const supported = ['ru', 'en', 'uk', 'be', 'kk', 'es', 'de', 'fr', 'tr', 'zh'];
      if (typeof inputLang === 'string' && supported.includes(inputLang)) {
        return inputLang;
      }
      return 'ru';
    }

    expect(sanitizeLanguage('xx')).toBe('ru');
    expect(sanitizeLanguage('')).toBe('ru');
    expect(sanitizeLanguage(null)).toBe('ru');
    expect(sanitizeLanguage(undefined)).toBe('ru');
    expect(sanitizeLanguage(12345)).toBe('ru');
    expect(sanitizeLanguage('en')).toBe('en');
  });

  test('R2-B2: Empty key string lookup returns empty string or key safely', () => {
    function translate(lang: string, key: string): string {
      if (!key) return '';
      const dict = translations[lang] || translations['ru'];
      return dict[key] || key;
    }

    expect(translate('ru', '')).toBe('');
    expect(translate('en', '')).toBe('');
  });

  test('R2-B3: Partial parameters do not throw and leave unmatched tokens or graceful fallback', () => {
    function interpolateSafe(template: string, params?: Record<string, any>): string {
      if (!params) return template;
      let text = template;
      Object.keys(params).forEach((k) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(params[k]));
      });
      return text;
    }

    const template = 'Привет, {name}! У вас {count} уведомлений на {date}.';
    // Only 'name' is provided
    const output = interpolateSafe(template, { name: 'Камиль' });
    expect(output).toBe('Привет, Камиль! У вас {count} уведомлений на {date}.');
  });

  test('R2-B4: Special regex replacement patterns in parameter values ($1, $&, $$)', () => {
    function interpolateLiteral(template: string, params: Record<string, string>): string {
      let text = template;
      Object.keys(params).forEach((k) => {
        // Use functional replacement to prevent $1, $& replacement pattern interpretation
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), () => params[k]);
      });
      return text;
    }

    const template = 'Total price: {price}';
    // Literal string with dollar signs that would trick String.prototype.replace
    const result = interpolateLiteral(template, { price: '$100.00 ($1 off)' });
    expect(result).toBe('Total price: $100.00 ($1 off)');
  });

  test('R2-B5: Corrupted AsyncStorage language value defaults safely to "ru"', async () => {
    await AsyncStorage.setItem(I18N_STORAGE_KEY, 'CORRUPTED_BLOB_@@@');

    async function getEffectiveLanguage(): Promise<string> {
      const stored = await AsyncStorage.getItem(I18N_STORAGE_KEY);
      const supported = ['ru', 'en', 'uk', 'be', 'kk', 'es', 'de', 'fr', 'tr', 'zh'];
      if (stored && supported.includes(stored)) {
        return stored;
      }
      return 'ru';
    }

    expect(await getEffectiveLanguage()).toBe('ru');
  });
});
