import {
  GradeEntry,
  SubjectItem,
  GradingSystem,
  PeriodType,
  PeriodMode,
  ThresholdSettings,
  StrategyResult,
} from '../types';

export const NUM_TO_LETTER: Record<number, 'A' | 'B' | 'C' | 'D' | 'F'> = {
  5: 'A',
  4: 'B',
  3: 'C',
  2: 'D',
  1: 'F',
};

export const LETTER_TO_NUM: Record<string, number> = {
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  F: 1,
};

export const LETTER_TO_GPA: Record<string, number> = {
  A: 4.0,
  B: 3.0,
  C: 2.0,
  D: 1.0,
  F: 0.0,
};

export function calculateSubjectAverage(
  grades: GradeEntry[],
  period: PeriodType,
  system: GradingSystem
): { average: number; totalWeight: number; gradeCount: number; sum: number } {
  const periodGrades = grades.filter((g) => g.period === period);
  if (periodGrades.length === 0) {
    return { average: 0, totalWeight: 0, gradeCount: 0, sum: 0 };
  }

  let sum = 0;
  let totalWeight = 0;

  for (const g of periodGrades) {
    const val = system === 'us-letter' ? (g.letter ? LETTER_TO_GPA[g.letter] ?? 0 : g.value) : g.value;
    sum += val * g.weight;
    totalWeight += g.weight;
  }

  const avg = totalWeight > 0 ? parseFloat((sum / totalWeight).toFixed(2)) : 0;
  return {
    average: avg,
    totalWeight,
    gradeCount: periodGrades.length,
    sum,
  };
}

export function calculateAnnualAverage(
  subject: SubjectItem,
  mode: PeriodMode,
  system: GradingSystem
): { average: number; activePeriodsCount: number } {
  const periods: PeriodType[] =
    mode === 'quarters' ? ['q1', 'q2', 'q3', 'q4'] : ['s1', 's2'];

  let sumOfAverages = 0;
  let activeCount = 0;

  for (const p of periods) {
    const { average, gradeCount } = calculateSubjectAverage(subject.grades, p, system);
    if (gradeCount > 0) {
      sumOfAverages += average;
      activeCount++;
    }
  }

  const annualAvg =
    activeCount > 0 ? parseFloat((sumOfAverages / activeCount).toFixed(2)) : 0;

  return { average: annualAvg, activePeriodsCount: activeCount };
}

export function calculateGlobalAverage(
  subjects: SubjectItem[],
  period: PeriodType,
  mode: PeriodMode,
  system: GradingSystem
): number {
  if (subjects.length === 0) return 0;

  let sum = 0;
  let count = 0;

  for (const s of subjects) {
    if (period === 'annual') {
      const { average, activePeriodsCount } = calculateAnnualAverage(s, mode, system);
      if (activePeriodsCount > 0) {
        sum += average;
        count++;
      }
    } else {
      const { average, gradeCount } = calculateSubjectAverage(s.grades, period, system);
      if (gradeCount > 0) {
        sum += average;
        count++;
      }
    }
  }

  return count > 0 ? parseFloat((sum / count).toFixed(2)) : 0;
}

export function getFinalGrade(
  average: number,
  system: GradingSystem,
  thresholds: ThresholdSettings
): { finalGrade: string; color: string } {
  if (average === 0) {
    return { finalGrade: '—', color: '#6e6e73' };
  }

  if (system === '5-point') {
    const t5 = thresholds['5-point']?.[5] ?? 4.5;
    const t4 = thresholds['5-point']?.[4] ?? 3.5;
    const t3 = thresholds['5-point']?.[3] ?? 2.5;

    if (average >= t5) return { finalGrade: '5', color: '#34c759' };
    if (average >= t4) return { finalGrade: '4', color: '#007aff' };
    if (average >= t3) return { finalGrade: '3', color: '#ff9500' };
    return { finalGrade: '2', color: '#ff3b30' };
  } else {
    const tA = thresholds['us-letter']?.A ?? 3.5;
    const tB = thresholds['us-letter']?.B ?? 2.5;
    const tC = thresholds['us-letter']?.C ?? 1.5;
    const tD = thresholds['us-letter']?.D ?? 0.5;

    if (average >= tA) return { finalGrade: 'A', color: '#34c759' };
    if (average >= tB) return { finalGrade: 'B', color: '#007aff' };
    if (average >= tC) return { finalGrade: 'C', color: '#ff9500' };
    if (average >= tD) return { finalGrade: 'D', color: '#ff9500' };
    return { finalGrade: 'F', color: '#ff3b30' };
  }
}

export function convertGradeToSystem(grade: GradeEntry, toSystem: GradingSystem): GradeEntry {
  if (toSystem === 'us-letter') {
    const letter = NUM_TO_LETTER[grade.value] || 'C';
    const gpa = LETTER_TO_GPA[letter] ?? 2.0;
    return {
      ...grade,
      value: gpa,
      letter,
    };
  } else {
    let numVal = 3;
    if (grade.letter && LETTER_TO_NUM[grade.letter]) {
      numVal = LETTER_TO_NUM[grade.letter];
    } else {
      numVal = Math.max(1, Math.min(5, Math.round(grade.value + 1)));
    }
    return {
      ...grade,
      value: numVal,
      letter: undefined,
    };
  }
}

export function convertSubjectsToSystem(
  subjects: SubjectItem[],
  toSystem: GradingSystem
): SubjectItem[] {
  return subjects.map((subj) => ({
    ...subj,
    targetGrade: toSystem === 'us-letter' ? 'A' : 5,
    grades: subj.grades.map((g) => convertGradeToSystem(g, toSystem)),
  }));
}

export function simulateWhatIf(
  currentSum: number,
  currentWeight: number,
  hypoGrade: number,
  hypoWeight: number
): { simulatedAverage: number; delta: number } {
  const currentAvg = currentWeight > 0 ? currentSum / currentWeight : 0;
  const newSum = currentSum + hypoGrade * hypoWeight;
  const newWeight = currentWeight + hypoWeight;
  const simulatedAvg = newWeight > 0 ? newSum / newWeight : 0;
  const delta = simulatedAvg - currentAvg;

  return {
    simulatedAverage: parseFloat(simulatedAvg.toFixed(2)),
    delta: parseFloat(delta.toFixed(2)),
  };
}

export function solveTargetStrategy(
  subject: SubjectItem,
  period: PeriodType,
  targetValue: number | string,
  system: GradingSystem,
  thresholds: ThresholdSettings
): StrategyResult {
  const { average, totalWeight, sum, gradeCount } = calculateSubjectAverage(
    subject.grades,
    period,
    system
  );

  let targetThreshold = 4.5;
  let topGradeValue: number | string = 5;
  let topNum = 5;

  if (system === '5-point') {
    const targetNum = typeof targetValue === 'number' ? targetValue : parseInt(String(targetValue), 10) || 5;
    if (targetNum === 5) targetThreshold = thresholds['5-point']?.[5] ?? 4.5;
    else if (targetNum === 4) targetThreshold = thresholds['5-point']?.[4] ?? 3.5;
    else targetThreshold = thresholds['5-point']?.[3] ?? 2.5;
    topGradeValue = 5;
    topNum = 5;
  } else {
    const letter = String(targetValue).toUpperCase();
    if (letter === 'A') targetThreshold = 3.5;
    else if (letter === 'B') targetThreshold = 2.5;
    else targetThreshold = 1.5;
    topGradeValue = 'A';
    topNum = 4.0;
  }

  // Check if target is already achieved
  if (gradeCount > 0 && average >= targetThreshold) {
    return {
      alreadyAchieved: true,
      currentAverage: average,
      targetThreshold,
      neededTopGrades: 0,
      topGradeValue,
      projectedAverageWithTopGrades: average,
    };
  }

  // Top grade solver (Strategy 1)
  // Closed form: k = ceil((T * W - S) / (Gmax - T))
  let neededTopGrades = 0;
  if (totalWeight === 0) {
    neededTopGrades = 1;
  } else {
    const denom = topNum - targetThreshold;
    if (denom <= 0) {
      neededTopGrades = 20;
    } else {
      const numerator = targetThreshold * totalWeight - sum;
      neededTopGrades = Math.max(1, Math.ceil(numerator / denom));
    }
  }

  const projectedSum = sum + neededTopGrades * topNum;
  const projectedWeight = totalWeight + neededTopGrades;
  const projectedAverage = parseFloat((projectedSum / projectedWeight).toFixed(2));

  // Mixed Strategy: alternating top grade (5/A) and second grade (4/B)
  let mixedFives = 0;
  let mixedFours = 0;
  let simSum = sum;
  let simWeight = totalWeight;
  const secondNum = system === '5-point' ? 4 : 3.0;

  for (let i = 0; i < 20; i++) {
    if (simWeight > 0 && simSum / simWeight >= targetThreshold) break;
    if (i % 2 === 0) {
      simSum += topNum;
      simWeight += 1;
      mixedFives++;
    } else {
      simSum += secondNum;
      simWeight += 1;
      mixedFours++;
    }
  }

  const mixedAverage =
    simWeight > 0 ? parseFloat((simSum / simWeight).toFixed(2)) : 0;

  // Remediation Strategy: replace lowest grade with top grade
  const periodGrades = subject.grades.filter((g) => g.period === period);
  let remediation: StrategyResult['remediation'] = undefined;

  if (periodGrades.length > 0) {
    let lowestGrade = periodGrades[0];
    for (const g of periodGrades) {
      const val = system === 'us-letter' ? (g.letter ? LETTER_TO_GPA[g.letter] ?? 0 : g.value) : g.value;
      const lowVal = system === 'us-letter' ? (lowestGrade.letter ? LETTER_TO_GPA[lowestGrade.letter] ?? 0 : lowestGrade.value) : lowestGrade.value;
      if (val < lowVal) {
        lowestGrade = g;
      }
    }

    const lowVal = system === 'us-letter' ? (lowestGrade.letter ? LETTER_TO_GPA[lowestGrade.letter] ?? 0 : lowestGrade.value) : lowestGrade.value;
    const canRemediate = lowVal < (system === '5-point' ? 4 : 3.0);

    if (canRemediate) {
      const fixSum = sum - lowVal * lowestGrade.weight + topNum * lowestGrade.weight;
      const fixAvg = parseFloat((fixSum / totalWeight).toFixed(2));
      remediation = {
        canRemediate: true,
        lowestGrade: lowestGrade.letter || lowestGrade.value,
        projectedAverage: fixAvg,
        achievesTarget: fixAvg >= targetThreshold,
      };
    }
  }

  return {
    alreadyAchieved: false,
    currentAverage: average,
    targetThreshold,
    neededTopGrades,
    topGradeValue,
    projectedAverageWithTopGrades: projectedAverage,
    mixedStrategy: {
      fivesCount: mixedFives,
      foursCount: mixedFours,
      projectedAverage: mixedAverage,
    },
    remediation,
  };
}
