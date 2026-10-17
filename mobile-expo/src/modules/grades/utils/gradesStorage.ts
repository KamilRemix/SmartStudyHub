import AsyncStorage from '@react-native-async-storage/async-storage';
import { GradesStorageData } from '../types';

export const GRADES_STORAGE_KEY = '@smartstudy_grades_data';

export const INITIAL_GRADES_DATA: GradesStorageData = {
  settings: {
    gradingSystem: '5-point',
    periodMode: 'quarters',
    activePeriod: 'q1',
    thresholds: {
      '5-point': { 5: 4.5, 4: 3.5, 3: 2.5 },
      'us-letter': { A: 3.5, B: 2.5, C: 1.5, D: 0.5, F: 0 },
    },
  },
  subjects: [
    {
      id: 'subj_algebra',
      name: 'Алгебра',
      targetGrade: 5,
      grades: [
        { id: 'g_1', value: 5, weight: 1.0, period: 'q1', date: Date.now() - 86400000 * 3 },
        { id: 'g_2', value: 4, weight: 1.5, period: 'q1', date: Date.now() - 86400000 * 2 },
        { id: 'g_3', value: 5, weight: 2.0, period: 'q1', date: Date.now() - 86400000 * 1 },
      ],
    },
    {
      id: 'subj_russian',
      name: 'Русский язык',
      targetGrade: 5,
      grades: [
        { id: 'g_4', value: 4, weight: 1.0, period: 'q1', date: Date.now() - 86400000 * 4 },
        { id: 'g_5', value: 5, weight: 1.0, period: 'q1', date: Date.now() - 86400000 * 2 },
        { id: 'g_6', value: 4, weight: 2.0, period: 'q1', date: Date.now() - 86400000 * 1 },
      ],
    },
    {
      id: 'subj_physics',
      name: 'Физика',
      targetGrade: 4,
      grades: [
        { id: 'g_7', value: 5, weight: 1.0, period: 'q1', date: Date.now() - 86400000 * 5 },
        { id: 'g_8', value: 3, weight: 1.5, period: 'q1', date: Date.now() - 86400000 * 3 },
        { id: 'g_9', value: 4, weight: 1.0, period: 'q1', date: Date.now() - 86400000 * 1 },
      ],
    },
  ],
  updatedAt: Date.now(),
};

export async function loadGradesData(): Promise<GradesStorageData> {
  try {
    const raw = await AsyncStorage.getItem(GRADES_STORAGE_KEY);
    if (!raw) {
      await saveGradesData(INITIAL_GRADES_DATA);
      return INITIAL_GRADES_DATA;
    }
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.subjects)) {
      // Sanitize legacy thresholds if us-letter was stored as percentage (>= 10)
      if (parsed.settings?.thresholds?.['us-letter']?.A >= 10) {
        parsed.settings.thresholds['us-letter'] = { A: 3.5, B: 2.5, C: 1.5, D: 0.5, F: 0 };
      }
      return parsed;
    }
    return INITIAL_GRADES_DATA;
  } catch (error) {
    console.error('[gradesStorage] Error reading grades:', error);
    return INITIAL_GRADES_DATA;
  }
}

export async function saveGradesData(data: GradesStorageData): Promise<void> {
  try {
    const updated = {
      ...data,
      updatedAt: Date.now(),
    };
    await AsyncStorage.setItem(GRADES_STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('[gradesStorage] Error saving grades:', error);
  }
}
