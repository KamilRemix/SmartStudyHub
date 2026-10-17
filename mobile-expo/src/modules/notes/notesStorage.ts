import AsyncStorage from '@react-native-async-storage/async-storage';
import { NoteItem } from './types';
import { translations, SupportedLanguage } from '../../i18n/translations';

export const NOTES_STORAGE_KEY = '@smartstudy_notes_data';
const LANGUAGE_STORAGE_KEY = '@smartstudy_language';
const LEGACY_LANG_KEY = '@ssh_language';

export function getLocalizedSeedNotes(lang: SupportedLanguage = 'ru'): NoteItem[] {
  const dict = translations[lang] || translations.ru;
  return [
    {
      id: 'note_seed_1',
      title: dict.welcomeNoteTitle || 'Добро пожаловать в Заметки',
      content: dict.welcomeNoteContent || 'Создавайте учебные конспекты, организуйте списки дел, закрепляйте важные мысли и выбирайте цветовую палитру.',
      tags: [dict.welcomeNoteTagStudy || 'Учеба', dict.welcomeNoteTagImportant || 'Важное'],
      color: '#16504b',
      pinned: true,
      createdAt: Date.now() - 3600000,
      updatedAt: Date.now() - 3600000,
    },
  ];
}

export const SEED_NOTES: NoteItem[] = getLocalizedSeedNotes('ru');

export async function loadNotes(preferredLang?: SupportedLanguage): Promise<NoteItem[]> {
  try {
    let lang: SupportedLanguage = preferredLang || 'ru';
    if (!preferredLang) {
      try {
        const savedLang = (await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)) || (await AsyncStorage.getItem(LEGACY_LANG_KEY));
        if (savedLang && savedLang in translations) {
          lang = savedLang as SupportedLanguage;
        }
      } catch {}
    }

    const currentSeed = getLocalizedSeedNotes(lang);
    const raw = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
    if (!raw) {
      await saveNotes(currentSeed);
      return currentSeed;
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // 1. Permanently remove obsolete starter note note_seed_2 ("План подготовки к сессии")
      const withoutObsoleteNotes = parsed.filter((n) => n && n.id !== 'note_seed_2');

      // 2. Localize note_seed_1 if it hasn't been modified with custom user notes
      const dict = translations[lang] || translations.ru;
      const allKnownWelcomeTitles = new Set(
        Object.values(translations).map((t) => t.welcomeNoteTitle).filter(Boolean)
      );
      allKnownWelcomeTitles.add('Добро пожаловать в Заметки');

      let hasChanges = withoutObsoleteNotes.length !== parsed.length;

      const normalizedNotes = withoutObsoleteNotes.map((note) => {
        if (note.id === 'note_seed_1' && allKnownWelcomeTitles.has(note.title)) {
          const localizedTitle = dict.welcomeNoteTitle || 'Добро пожаловать в Заметки';
          const localizedContent = dict.welcomeNoteContent || note.content;
          const localizedTags = [dict.welcomeNoteTagStudy || 'Учеба', dict.welcomeNoteTagImportant || 'Важное'];

          if (note.title !== localizedTitle || note.content !== localizedContent) {
            hasChanges = true;
            return {
              ...note,
              title: localizedTitle,
              content: localizedContent,
              tags: localizedTags,
            };
          }
        }
        return note;
      });

      if (hasChanges) {
        await saveNotes(normalizedNotes);
      }
      return normalizedNotes;
    }

    return currentSeed;
  } catch (error) {
    console.error('[notesStorage] Error reading notes:', error);
    return [];
  }
}

export async function saveNotes(notes: NoteItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  } catch (error) {
    console.error('[notesStorage] Error saving notes:', error);
  }
}
