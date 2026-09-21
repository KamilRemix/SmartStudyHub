import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, SupportedLanguage } from './translations';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'ru', name: 'Русский', nativeName: 'Русский (RU)' },
  { code: 'en', name: 'English', nativeName: 'English (EN)' },
  { code: 'uk', name: 'Українська', nativeName: 'Українська (UK)' },
  { code: 'be', name: 'Беларуская', nativeName: 'Беларуская (BE)' },
  { code: 'kk', name: 'Қазақша', nativeName: 'Қазақша (KK)' },
  { code: 'es', name: 'Español', nativeName: 'Español (ES)' },
  { code: 'de', name: 'Deutsch', nativeName: 'Deutsch (DE)' },
  { code: 'fr', name: 'Français', nativeName: 'Français (FR)' },
  { code: 'tr', name: 'Türkçe', nativeName: 'Türkçe (TR)' },
  { code: 'zh', name: '中文', nativeName: '中文 (ZH)' },
];

const LANGUAGE_STORAGE_KEY = '@smartstudy_language';
const LEGACY_STORAGE_KEY = '@ssh_language';

interface I18nContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  supportedLanguages: LanguageOption[];
}

const I18nContext = createContext<I18nContextType>({
  language: 'ru',
  setLanguage: async () => {},
  t: (key: string) => key || '',
  supportedLanguages: SUPPORTED_LANGUAGES,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>('ru');

  useEffect(() => {
    (async () => {
      try {
        const saved = (await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)) || (await AsyncStorage.getItem(LEGACY_STORAGE_KEY));
        if (saved && (saved in translations)) {
          setLanguageState(saved as SupportedLanguage);
        }
      } catch (err) {
        console.warn('[I18n] Failed to load saved language:', err);
      }
    })();
  }, []);

  const setLanguage = useCallback(async (lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      await AsyncStorage.setItem(LEGACY_STORAGE_KEY, lang);
    } catch (err) {
      console.warn('[I18n] Failed to persist language:', err);
    }
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    if (!key) return '';
    const langDict = translations[language] || translations['ru'];
    let text = langDict[key] || translations['ru']?.[key] || translations['en']?.[key] || key;

    if (params) {
      Object.entries(params).forEach(([paramKey, val]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), () => String(val));
      });
    }

    return text;
  }, [language]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, supportedLanguages: SUPPORTED_LANGUAGES }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  return useContext(I18nContext);
};
