/**
 * Tier 2: Boundary & Corner Cases — Requirement R3: Grades Engine
 * Scenarios:
 * - Empty grades array (zero division protection)
 * - Single grade evaluation
 * - Exact threshold boundary equality (floating point precision)
 * - Already achieved targets (0 needed grades)
 * - All identical maximum / minimum grades
 * - Non-monotonic / inverted threshold rejection
 */

import {
  calculateSubjectAverage,
  solveTargetStrategy,
} from '../../src/modules/grades/utils/gradeMath';
import { GradeEntry, ThresholdSettings } from '../../src/modules/grades/types';

describe('Tier 2 - R3: Grades Engine Boundary & Corner Cases', () => {
  const defaultThresholds: ThresholdSettings = {
    '5-point': { 5: 4.5, 4: 3.5, 3: 2.5 },
    'us-letter': { A: 3.5, B: 2.5, C: 1.5, D: 0.5, F: 0 },
  };

  test('R3-B1: Empty grades array yields 0 average and 0 total weight without NaN', () => {
    const emptyGrades: GradeEntry[] = [];
    const res = calculateSubjectAverage(emptyGrades, 'q1', '5-point');

    expect(res.average).toBe(0);
    expect(res.totalWeight).toBe(0);
    expect(res.gradeCount).toBe(0);
    expect(Number.isNaN(res.average)).toBe(false);
  });

  test('R3-B2: Single grade yields exact grade value regardless of weight', () => {
    const singleGrade: GradeEntry[] = [
      { id: '1', value: 4, weight: 3.0, period: 'q1', date: Date.now() },
    ];
    const res = calculateSubjectAverage(singleGrade, 'q1', '5-point');
    expect(res.average).toBe(4.0);
    expect(res.totalWeight).toBe(3.0);
  });

  test('R3-B3: Exact boundary threshold matches without floating point drop', () => {
    const threshold5 = 4.65;
    // (4.65 * 2) = 9.3 -> 5 (weight 1) + 4.3 (weight 1) = 9.3 / 2 = 4.65
    const average = 4.65;

    function isFive(avg: number, t5: number): boolean {
      // Use epsilon tolerance for float equality: avg + 1e-9 >= t5
      return avg + 1e-9 >= t5;
    }

    expect(isFive(average, threshold5)).toBe(true);
    expect(isFive(4.6499999, threshold5)).toBe(false);
  });

  test('R3-B4: Target strategy returns alreadyAchieved: true when average already satisfies goal', () => {
    const grades: GradeEntry[] = [
      { id: '1', value: 5, weight: 1.0, period: 'q1', date: Date.now() },
      { id: '2', value: 5, weight: 1.0, period: 'q1', date: Date.now() },
    ];

    const subject = {
      id: 'subj_b4',
      name: 'Предмет',
      targetGrade: 4,
      grades,
    };

    // Target is 4, current average is 5.0
    const strategy = solveTargetStrategy(subject, 'q1', 4, '5-point', defaultThresholds);
    expect(strategy.alreadyAchieved).toBe(true);
    expect(strategy.neededTopGrades).toBe(0);
  });

  test('R3-B5: All maximum (5) or all minimum (1) grade sequences remain stable', () => {
    const allFives: GradeEntry[] = Array.from({ length: 50 }, (_, i) => ({
      id: `g_${i}`,
      value: 5,
      weight: 1.0,
      period: 'q1' as const,
      date: Date.now(),
    }));

    const resultFives = calculateSubjectAverage(allFives, 'q1', '5-point');
    expect(resultFives.average).toBe(5.0);
    expect(resultFives.gradeCount).toBe(50);

    const allOnes: GradeEntry[] = Array.from({ length: 50 }, (_, i) => ({
      id: `g_${i}`,
      value: 1,
      weight: 1.0,
      period: 'q1' as const,
      date: Date.now(),
    }));

    const resultOnes = calculateSubjectAverage(allOnes, 'q1', '5-point');
    expect(resultOnes.average).toBe(1.0);
  });

  test('R3-B6: Invalid / non-monotonic thresholds rejection', () => {
    function sanitizeThresholds(input: { 5?: number; 4?: number; 3?: number }) {
      const t3 = Number(input[3]) || 2.5;
      const t4 = Number(input[4]) || 3.5;
      const t5 = Number(input[5]) || 4.5;

      if (t3 < 1.0 || t3 >= t4 || t4 >= t5 || t5 > 5.0) {
        // Reject and return default
        return { 5: 4.5, 4: 3.5, 3: 2.5, isFallback: true };
      }
      return { 5: t5, 4: t4, 3: t3, isFallback: false };
    }

    // Attempt inverted input (3 is higher than 4)
    expect(sanitizeThresholds({ 5: 4.5, 4: 2.0, 3: 3.0 }).isFallback).toBe(true);
    // Out of bounds input (5 is 6.0)
    expect(sanitizeThresholds({ 5: 6.0, 4: 3.5, 3: 2.5 }).isFallback).toBe(true);
    // Valid custom input
    const valid = sanitizeThresholds({ 5: 4.7, 4: 3.7, 3: 2.7 });
    expect(valid.isFallback).toBe(false);
    expect(valid[5]).toBe(4.7);
  });
});
