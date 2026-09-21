import AsyncStorage from '@react-native-async-storage/async-storage';
import { NoteItem } from './types';

export const NOTES_STORAGE_KEY = '@smartstudy_notes_data';

export const SEED_NOTES: NoteItem[] = [
  {
    id: 'note_seed_1',
    title: 'Добро пожаловать в Заметки',
    content: 'Создавайте учебные конспекты, организуйте списки дел, закрепляйте важные мысли и выбирайте цветовую палитру.',
    tags: ['Учеба', 'Важное'],
    color: '#16504b',
    pinned: true,
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 3600000,
  },
  {
    id: 'note_seed_2',
    title: 'План подготовки к сессии',
    content: '',
    checklist: [
      { id: 'cl_1', text: 'Повторить формулы по высшей математике', done: true },
      { id: 'cl_2', text: 'Сдать курсовую работу', done: false },
      { id: 'cl_3', text: 'Подготовить конспект по физике', done: false },
    ],
    tags: ['Планы'],
    color: '#42275e',
    pinned: false,
    createdAt: Date.now() - 7200000,
    updatedAt: Date.now() - 7200000,
  },
];

export async function loadNotes(): Promise<NoteItem[]> {
  try {
    const raw = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
    if (!raw) {
      await saveNotes(SEED_NOTES);
      return SEED_NOTES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return SEED_NOTES;
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
