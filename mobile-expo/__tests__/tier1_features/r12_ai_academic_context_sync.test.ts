import { buildAcademicSystemPromptContext, getAcademicContextSummary } from '../../src/services/aiAcademicContextService';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('AI Academic Context and Grades Sync', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('should return default context when no grades or notes exist', async () => {
    // Set empty subjects explicitly
    await AsyncStorage.setItem(
      '@smartstudy_grades_data',
      JSON.stringify({
        settings: {
          gradingSystem: '5-point',
          periodMode: 'quarters',
          activePeriod: 'q1',
          thresholds: { '5-point': { 5: 4.5, 4: 3.5, 3: 2.5 } },
        },
        subjects: [],
        updatedAt: Date.now(),
      })
    );

    const summary = await getAcademicContextSummary();
    expect(summary).toBeDefined();
    expect(summary.globalAverage).toBe(0);
    expect(summary.subjects.length).toBe(0);
    expect(summary.recentNotes.length).toBe(0);

    const promptContext = await buildAcademicSystemPromptContext();
    expect(promptContext).toBe('');
  });

  test('should correctly aggregate subjects, grades, and notes for AI prompt', async () => {
    const mockGradesData = {
      subjects: [
        {
          id: 'sub-1',
          name: 'Высшая математика',
          targetGrade: 5,
          grades: [
            { id: 'g1', value: 3, weight: 1, period: 'q1', date: '2026-09-01' },
            { id: 'g2', value: 4, weight: 1, period: 'q1', date: '2026-09-05' },
          ],
        },
        {
          id: 'sub-2',
          name: 'Физика',
          targetGrade: 4,
          grades: [
            { id: 'g3', value: 5, weight: 1, period: 'q1', date: '2026-09-02' },
          ],
        },
      ],
      settings: {
        gradingSystem: '5-point',
        periodMode: 'quarters',
        activePeriod: 'q1',
        thresholds: { 5: 4.5, 4: 3.5, 3: 2.5 },
      },
      lastUpdated: Date.now(),
    };

    const mockNotes = [
      {
        id: 'n1',
        title: 'Теорема Лагранжа',
        content: 'Формула конечных приращений f(b)-f(a) = f\'(c)(b-a)',
        tags: ['мат'],
        updatedAt: Date.now(),
      },
    ];

    await AsyncStorage.setItem('@smartstudy_grades_data', JSON.stringify(mockGradesData));
    await AsyncStorage.setItem('@smartstudy_notes_data', JSON.stringify(mockNotes));

    const summary = await getAcademicContextSummary();
    expect(summary.subjects.length).toBe(2);
    expect(summary.recentNotes.length).toBe(1);
    expect(summary.globalAverage).toBeGreaterThan(0);
    expect(summary.atRiskSubjects.length).toBe(1);
    expect(summary.atRiskSubjects[0]).toContain('Высшая математика');

    const promptContext = await buildAcademicSystemPromptContext();
    expect(promptContext).toContain('Высшая математика');
    expect(promptContext).toContain('Физика');
    expect(promptContext).toContain('Теорема Лагранжа');
    expect(promptContext).toContain('[USER REAL ACADEMIC PROGRESS & NOTES CONTEXT]');
  });
});
