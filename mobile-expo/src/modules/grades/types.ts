export type GradingSystem = '5-point' | 'us-letter';
export type PeriodType = 'q1' | 'q2' | 'q3' | 'q4' | 's1' | 's2' | 'annual';
export type PeriodMode = 'quarters' | 'semesters';

export interface GradeEntry {
  id: string;
  value: number; // 1-5 for 5-point, or 0-4 for US GPA
  letter?: 'A' | 'B' | 'C' | 'D' | 'F';
  weight: number; // 1.0, 1.5, 2.0, 3.0
  period: PeriodType;
  date: number;
  comment?: string;
}

export interface SubjectItem {
  id: string;
  name: string;
  targetGrade: number | string; // 5 or 'A'
  grades: GradeEntry[];
}

export interface ThresholdSettings {
  '5-point': { 5: number; 4: number; 3: number };
  'us-letter': { A: number; B: number; C: number; D: number; F: number };
}

export interface GradesStorageData {
  settings: {
    gradingSystem: GradingSystem;
    periodMode: PeriodMode;
    activePeriod: PeriodType;
    thresholds: ThresholdSettings;
  };
  subjects: SubjectItem[];
  updatedAt: number;
}

export interface StrategyResult {
  alreadyAchieved: boolean;
  currentAverage: number;
  targetThreshold: number;
  neededTopGrades: number;
  topGradeValue: number | string;
  projectedAverageWithTopGrades: number;
  mixedStrategy?: {
    fivesCount: number;
    foursCount: number;
    projectedAverage: number;
  };
  remediation?: {
    canRemediate: boolean;
    lowestGrade: number | string;
    projectedAverage: number;
    achievesTarget: boolean;
  };
}
