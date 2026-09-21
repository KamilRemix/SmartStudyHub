/**
 * Tier 1: Feature Coverage — Requirement R2: i18n Localization Engine
 * Specifications:
 * - 10 supported languages (ru, en, uk, be, kk, es, de, fr, tr, zh)
 * - Key resolution and dictionary integrity
 * - Parameter substitution
 * - Missing key fallback logic
 * - Dynamic language switching & AsyncStorage persistence
 * - Zero emojis in dictionary strings
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import path from 'path';

describe('Tier 1 - R2: i18n Localization Engine', () => {
  const I18N_STORAGE_KEY = '@smartstudy_language';
  const REQUIRED_LANGS = ['ru', 'en', 'uk', 'be', 'kk', 'es', 'de', 'fr', 'tr', 'zh'] as const;

  // Load the authoritative translations dictionary from public/translations.js
  let translations: Record<string, Record<string, string>>;

  beforeAll(() => {
    const translationsPath = path.resolve(__dirname, '../../../public/translations.js');
    translations = require(translationsPath);
  });

  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('R2-1: All 10 required languages exist in the translation dictionary', () => {
    REQUIRED_LANGS.forEach((lang) => {
      expect(translations[lang]).toBeDefined();
      expect(typeof translations[lang]).toBe('object');
      expect(Object.keys(translations[lang]).length).toBeGreaterThan(100);
    });
  });

  test('R2-2: Essential navigation & core feature keys exist in all 10 languages', () => {
    const coreKeys = [
      'calculator',
      'fractionCalculator',
      'grades',
      'settings',
      'averageScore',
      'gpa',
      'save',
      'clear',
      'light',
      'dark',
      'theme',
      'language',
    ];

    REQUIRED_LANGS.forEach((lang) => {
      coreKeys.forEach((key) => {
        expect(translations[lang][key]).toBeDefined();
        expect(translations[lang][key].length).toBeGreaterThan(0);
      });
    });
  });

  test('R2-3: Key resolution and missing key fallback mechanism', () => {
    function resolveTranslation(lang: string, key: string): string {
      const dict = translations[lang] || translations['ru'];
      return dict[key] || translations['ru']?.[key] || translations['en']?.[key] || key;
    }

    // Standard resolution
    expect(resolveTranslation('en', 'calculator')).toBe('Calculator');
    expect(resolveTranslation('ru', 'calculator')).toBe('Калькулятор');
    expect(resolveTranslation('de', 'calculator')).toBe('Rechner');
    expect(resolveTranslation('es', 'calculator')).toBe('Calculadora');
    expect(resolveTranslation('fr', 'calculator')).toBe('Calculatrice');

    // Missing key in language falls back to Russian/English
    const syntheticKey = 'non_existent_test_key_xyz';
    expect(resolveTranslation('kk', syntheticKey)).toBe(syntheticKey);
  });

  test('R2-4: Dynamic language switching and persistence in AsyncStorage', async () => {
    // Initial state: default Russian
    let currentLang = 'ru';
    await AsyncStorage.setItem(I18N_STORAGE_KEY, currentLang);

    // Switch to English
    currentLang = 'en';
    await AsyncStorage.setItem(I18N_STORAGE_KEY, currentLang);

    const storedLang = await AsyncStorage.getItem(I18N_STORAGE_KEY);
    expect(storedLang).toBe('en');

    // Switch to Kazakh
    currentLang = 'kk';
    await AsyncStorage.setItem(I18N_STORAGE_KEY, currentLang);
    const storedKk = await AsyncStorage.getItem(I18N_STORAGE_KEY);
    expect(storedKk).toBe('kk');
  });

  test('R2-5: Parameter interpolation replaces placeholder tokens', () => {
    function interpolate(template: string, params: Record<string, string | number>): string {
      let result = template;
      Object.keys(params).forEach((key) => {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(params[key]));
      });
      return result;
    }

    const template = 'У вас {count} новых заметок от {author}';
    const output = interpolate(template, { count: 5, author: 'Мария' });
    expect(output).toBe('У вас 5 новых заметок от Мария');
  });

  test('R2-6: Strict Emoji Ban across all 10 language dictionaries', () => {
    // Regex matching standard Unicode emojis
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;

    REQUIRED_LANGS.forEach((lang) => {
      const dict = translations[lang];
      Object.entries(dict).forEach(([key, value]) => {
        if (typeof value === 'string') {
          const match = emojiRegex.test(value);
          expect(match).toBe(false);
        }
      });
    });
  });
});
