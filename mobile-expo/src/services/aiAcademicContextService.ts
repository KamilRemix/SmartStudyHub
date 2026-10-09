import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadGradesData } from '../modules/grades/utils/gradesStorage';
import {
  calculateSubjectAverage,
  calculateGlobalAverage,
} from '../modules/grades/utils/gradeMath';
import { NoteItem } from '../modules/notes/types';

export interface SubjectPerformanceSummary {
  name: string;
  average: number;
  targetGrade: number | string;
  isAtRisk: boolean;
  gradeCount: number;
}

export interface AcademicContextSummary {
  system: string;
  periodName: string;
  globalAverage: number;
  subjects: SubjectPerformanceSummary[];
  atRiskSubjects: string[];
  recentNotes: { title: string; tags: string[]; snippet: string }[];
}

const PERIOD_NAMES: Record<string, string> = {
  q1: '1-я четверть',
  q2: '2-я четверть',
  q3: '3-я четверть',
  q4: '4-я четверть',
  s1: '1-й семестр',
  s2: '2-й семестр',
  annual: 'Итоговый / Годовой',
};

export async function getAcademicContextSummary(): Promise<AcademicContextSummary> {
  // 1. Load Grades Data
  const gradesData = await loadGradesData();
  const { settings, subjects } = gradesData;

  const globalAvg = calculateGlobalAverage(
    subjects,
    settings.activePeriod,
    settings.periodMode,
    settings.gradingSystem
  );

  const subjectSummaries: SubjectPerformanceSummary[] = subjects.map((subj) => {
    const { average, gradeCount } = calculateSubjectAverage(
      subj.grades,
      settings.activePeriod,
      settings.gradingSystem
    );

    const numericTarget = typeof subj.targetGrade === 'number' ? subj.targetGrade : 4.0;
    const isAtRisk = average > 0 && average < numericTarget;

    return {
      name: subj.name,
      average: Number(average.toFixed(2)),
      targetGrade: subj.targetGrade,
      isAtRisk,
      gradeCount,
    };
  });

  const atRisk = subjectSummaries
    .filter((s) => s.isAtRisk)
    .map((s) => `${s.name} (текущий балл: ${s.average}, цель: ${s.targetGrade})`);

  // 2. Load Notes Data
  const recentNotes: AcademicContextSummary['recentNotes'] = [];
  try {
    const rawNotes = await AsyncStorage.getItem('@smartstudy_notes_data');
    if (rawNotes) {
      const parsedNotes: NoteItem[] = JSON.parse(rawNotes);
      if (Array.isArray(parsedNotes)) {
        parsedNotes.slice(0, 5).forEach((n) => {
          if (n?.title || n?.content) {
            recentNotes.push({
              title: n.title || 'Без названия',
              tags: n.tags || [],
              snippet: (n.content || '').slice(0, 100).replace(/\n/g, ' '),
            });
          }
        });
      }
    }
  } catch (err) {
    console.warn('[AcademicContext] Error loading notes:', err);
  }

  return {
    system: settings.gradingSystem === '5-point' ? '5-балльная шкала' : 'US Letter (A-F)',
    periodName: PERIOD_NAMES[settings.activePeriod] || settings.activePeriod,
    globalAverage: Number(globalAvg.toFixed(2)),
    subjects: subjectSummaries,
    atRiskSubjects: atRisk,
    recentNotes,
  };
}

export async function buildAcademicSystemPromptContext(): Promise<string> {
  try {
    const summary = await getAcademicContextSummary();
    if (summary.subjects.length === 0 && summary.recentNotes.length === 0) {
      return '';
    }

    const lines: string[] = [];
    lines.push('\n[USER REAL ACADEMIC PROGRESS & NOTES CONTEXT]:');
    lines.push(`- Шкала оценивания: ${summary.system}`);
    lines.push(`- Текущий период обучения: ${summary.periodName}`);
    lines.push(`- Общий средний балл (GPA): ${summary.globalAverage > 0 ? summary.globalAverage : 'пока нет оценок'}`);

    if (summary.subjects.length > 0) {
      const subjList = summary.subjects
        .map(
          (s) =>
            `${s.name}: ${s.average > 0 ? s.average : 'нет оценок'} (цель: ${s.targetGrade}${s.isAtRisk ? ' [ОТСТАЕТ ОТ ЦЕЛИ]' : ''})`
        )
        .join(', ');
      lines.push(`- Предметы: ${subjList}`);
    }

    if (summary.atRiskSubjects.length > 0) {
      lines.push(`- Предметы в зоне риска (балл ниже цели): ${summary.atRiskSubjects.join('; ')}`);
    }

    if (summary.recentNotes.length > 0) {
      const notesList = summary.recentNotes
        .map((n) => `"${n.title}"${n.tags.length ? ` [теги: ${n.tags.join(',')}]` : ''}`)
        .join('; ');
      lines.push(`- Заметки и конспекты пользователя: ${notesList}`);
    }

    lines.push(
      'Always refer to this actual academic data when user asks for performance review, grade prediction, what to study next, or advice.'
    );
    return lines.join('\n');
  } catch (err) {
    console.warn('[AcademicContext] Failed to build prompt context:', err);
    return '';
  }
}
