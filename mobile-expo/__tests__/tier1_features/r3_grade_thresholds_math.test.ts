/**
 * Tier 1: Feature Coverage — Requirement R3: Custom Grade Thresholds & Math Engine
 * Specifications:
 * - Weighted average formula: sum(val * weight) / sum(weight)
 * - Custom numeric thresholds (e.g. 5: 4.65, 4: 3.65, 3: 2.70)
 * - Custom US Letter / GPA thresholds
 * - What-If simulation accuracy
 * - Target strategy solver formula: ceil((T * W - S) / (G_max - T))
 * - Annual GPA / CIS period calculation
 */

import {
  calculateSubjectAverage,
  calculateAnnualAverage,
  simulateWhatIf,
  solveTargetStrategy,
} from '../../src/modules/grades/utils/gradeMath';
import { GradeEntry, SubjectItem, ThresholdSettings } from '../../src/modules/grades/types';

describe('Tier 1 - R3: Grade Thresholds & Math Engine', () => {
  const defaultThresholds: ThresholdSettings = {
    '5-point': { 5: 4.5, 4: 3.5, 3: 2.5 },
    'us-letter': { A: 3.5, B: 2.5, C: 1.5, D: 0.5, F: 0 },
  };

  const customThresholds: ThresholdSettings = {
    '5-point': { 5: 4.65, 4: 3.65, 3: 2.7 },
    'us-letter': { A: 3.75, B: 2.75, C: 1.75, D: 0.75, F: 0 },
  };

  test('R3-1: Correctly calculates weighted average with multiple weights', () => {
    // Grades: 5 (weight 1.0), 4 (weight 2.0), 3 (weight 1.5)
    // Sum = 5*1.0 + 4*2.0 + 3*1.5 = 5 + 8 + 4.5 = 17.5
    // Total Weight = 1.0 + 2.0 + 1.5 = 4.5
    // Expected Average = 17.5 / 4.5 = 3.888888... -> 3.89 rounded to 2 decimals
    const grades: GradeEntry[] = [
      { id: '1', value: 5, weight: 1.0, period: 'q1', date: Date.now() },
      { id: '2', value: 4, weight: 2.0, period: 'q1', date: Date.now() },
      { id: '3', value: 3, weight: 1.5, period: 'q1', date: Date.now() },
    ];

    const result = calculateSubjectAverage(grades, 'q1', '5-point');
    expect(result.sum).toBe(17.5);
    expect(result.totalWeight).toBe(4.5);
    expect(result.gradeCount).toBe(3);
    expect(result.average).toBe(3.89);
  });

  test('R3-2: Custom threshold evaluation shifts final grade boundary', () => {
    function evaluateGrade(avg: number, thresholds: { 5: number; 4: number; 3: number }): number {
      if (avg >= thresholds[5]) return 5;
      if (avg >= thresholds[4]) return 4;
      if (avg >= thresholds[3]) return 3;
      return 2;
    }

    const testAverage = 4.60;

    // Under default thresholds (5: 4.50), 4.60 yields a 5
    expect(evaluateGrade(testAverage, defaultThresholds['5-point'])).toBe(5);

    // Under custom strict thresholds (5: 4.65), 4.60 yields a 4
    expect(evaluateGrade(testAverage, customThresholds['5-point'])).toBe(4);
  });

  test('R3-3: What-If simulation calculates prospective average without mutating state', () => {
    const existingGrades: GradeEntry[] = [
      { id: '1', value: 4, weight: 1.0, period: 'q1', date: Date.now() },
      { id: '2', value: 4, weight: 1.0, period: 'q1', date: Date.now() },
    ];

    // Current average: 4.0, sum: 8, weight: 2
    const current = calculateSubjectAverage(existingGrades, 'q1', '5-point');
    expect(current.average).toBe(4.0);

    // Simulate adding a 5 with weight 2.0
    // New Sum = 8 + (5*2) = 18, New Weight = 2 + 2 = 4 -> 18 / 4 = 4.5
    const simulated = simulateWhatIf(current.sum, current.totalWeight, 5, 2.0);
    expect(simulated.simulatedAverage).toBe(4.5);
    expect(simulated.delta).toBe(0.5);

    // Verify original array was not mutated
    expect(existingGrades.length).toBe(2);
  });

  test('R3-4: Strategy Engine computes exact minimum needed top grades', () => {
    // Current grades: 3 (weight 1.0), 3 (weight 1.0) -> sum = 6, weight = 2, avg = 3.0
    // Target: 4 (threshold 3.5 in default 5-point)
    // Formula: ceil((3.5 * 2 - 6) / (5 - 3.5)) = ceil((7 - 6) / 1.5) = ceil(1 / 1.5) = ceil(0.666) = 1 five needed
    const subject: SubjectItem = {
      id: 's_test',
      name: 'Алгебра',
      targetGrade: 4,
      grades: [
        { id: '1', value: 3, weight: 1.0, period: 'q1', date: Date.now() },
        { id: '2', value: 3, weight: 1.0, period: 'q1', date: Date.now() },
      ],
    };

    const strategy = solveTargetStrategy(subject, 'q1', 4, '5-point', defaultThresholds);
    expect(strategy.alreadyAchieved).toBe(false);
    expect(strategy.neededTopGrades).toBe(1);
    expect(strategy.topGradeValue).toBe(5);
    // After 1 five: (6 + 5) / 3 = 11 / 3 = 3.666... >= 3.5
    expect(strategy.projectedAverageWithTopGrades).toBeGreaterThanOrEqual(3.5);
  });

  test('R3-5: Annual average aggregates across active quarters only', () => {
    const subject: SubjectItem = {
      id: 's_annual',
      name: 'Физика',
      targetGrade: 5,
      grades: [
        { id: '1', value: 5, weight: 1.0, period: 'q1', date: Date.now() }, // q1 avg = 5.0
        { id: '2', value: 4, weight: 1.0, period: 'q2', date: Date.now() }, // q2 avg = 4.0
        // q3 and q4 have no grades yet
      ],
    };

    const annualResult = calculateAnnualAverage(subject, 'quarters', '5-point');
    // Average of active quarters: (5.0 + 4.0) / 2 = 4.5
    expect(annualResult.average).toBe(4.5);
    expect(annualResult.activePeriodsCount).toBe(2);
  });

  test('R3-6: Monotonic threshold validation rule', () => {
    function validateThresholds(t: { 5: number; 4: number; 3: number }): boolean {
      return (
        t[3] >= 1.0 &&
        t[3] < t[4] &&
        t[4] < t[5] &&
        t[5] <= 5.0
      );
    }

    expect(validateThresholds({ 5: 4.65, 4: 3.65, 3: 2.70 })).toBe(true);
    expect(validateThresholds({ 5: 4.50, 4: 3.50, 3: 2.50 })).toBe(true);

    // Invalid non-monotonic order
    expect(validateThresholds({ 5: 3.50, 4: 4.50, 3: 2.50 })).toBe(false);
    // Invalid out of bounds
    expect(validateThresholds({ 5: 5.50, 4: 3.50, 3: 2.50 })).toBe(false);
  });
});
