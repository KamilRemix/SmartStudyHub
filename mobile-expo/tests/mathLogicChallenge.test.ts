/**
 * Math Logic Empirical Challenge Harness
 * Tests:
 * 1. Expression Parser (nested parentheses, precedence, percentage, unary minus, float precision, division by zero)
 * 2. Fraction Math (addition, subtraction, multiplication, division, improper, mixed, LCD/GCD, edge cases)
 * 3. Grade Math (weighted averages, custom weights, US Letter GPA, What-If simulator, target solver k formula)
 */

import { evaluateExpression, formatPrecision, tokenize, shuntingYard, evaluateRPN } from '../src/modules/calculator/utils/expressionParser';
import { calculateFractions, gcd, lcm, toImproper } from '../src/modules/calculator/utils/fractionMath';
import {
  calculateSubjectAverage,
  calculateAnnualAverage,
  calculateGlobalAverage,
  simulateWhatIf,
  solveTargetStrategy,
  getFinalGrade,
  convertGradeToSystem,
} from '../src/modules/grades/utils/gradeMath';
import { MixedFraction } from '../src/modules/calculator/types';
import { SubjectItem, GradeEntry, ThresholdSettings } from '../src/modules/grades/types';

interface TestStats {
  suite: string;
  total: number;
  passed: number;
  failed: number;
  failures: string[];
}

const allStats: TestStats[] = [];

function createSuite(name: string) {
  const stats: TestStats = { suite: name, total: 0, passed: 0, failed: 0, failures: [] };
  allStats.push(stats);

  function test(description: string, fn: () => void) {
    stats.total++;
    try {
      fn();
      stats.passed++;
    } catch (err: any) {
      stats.failed++;
      stats.failures.push(`${description} -> ${err.message}`);
    }
  }

  function assert(condition: boolean, msg: string) {
    if (!condition) throw new Error(msg);
  }

  function assertEqual(actual: any, expected: any, msg?: string) {
    if (actual !== expected) {
      throw new Error(`${msg ? msg + ': ' : ''}Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }

  function assertClose(actual: number, expected: number, delta: number = 0.0001, msg?: string) {
    if (Math.abs(actual - expected) > delta) {
      throw new Error(`${msg ? msg + ': ' : ''}Expected ${expected} ± ${delta}, got ${actual}`);
    }
  }

  return { test, assert, assertEqual, assertClose, stats };
}

// =========================================================================
// SUITE 1: Expression Parser Challenge
// =========================================================================
const s1 = createSuite('Expression Parser');

// 1.1 Nested parentheses
s1.test('Nested parentheses: ((2 + 3) * (4 - 1))', () => {
  const res = evaluateExpression('((2 + 3) * (4 - 1))');
  s1.assertEqual(res.success, true);
  s1.assertEqual(res.result, '15');
  s1.assertEqual(res.numericValue, 15);
});

s1.test('Deep nested parentheses: (((1 + 2) * 3) + (4 * (5 - 2)))', () => {
  // (3 * 3) + (4 * 3) = 9 + 12 = 21
  const res = evaluateExpression('(((1 + 2) * 3) + (4 * (5 - 2)))');
  s1.assertEqual(res.success, true);
  s1.assertEqual(res.result, '21');
});

s1.test('Redundant parentheses: ((((42))))', () => {
  const res = evaluateExpression('((((42))))');
  s1.assertEqual(res.success, true);
  s1.assertEqual(res.result, '42');
});

// 1.2 Operator precedence
s1.test('Operator precedence: 2 + 3 * 4', () => {
  const res = evaluateExpression('2 + 3 * 4');
  s1.assertEqual(res.success, true);
  s1.assertEqual(res.result, '14');
  s1.assertEqual(res.numericValue, 14);
});

s1.test('Left associativity: 10 - 4 - 2', () => {
  const res = evaluateExpression('10 - 4 - 2');
  s1.assertEqual(res.success, true);
  s1.assertEqual(res.result, '4'); // (10-4)-2 = 4, not 10-(4-2) = 8
});

s1.test('Left associativity of division: 24 / 4 / 2', () => {
  const res = evaluateExpression('24 / 4 / 2');
  s1.assertEqual(res.success, true);
  s1.assertEqual(res.result, '3'); // (24/4)/2 = 3
});

s1.test('Mixed operations precedence: 10 - 2 * 3 + 8 / 4', () => {
  // 10 - 6 + 2 = 6
  const res = evaluateExpression('10 - 2 * 3 + 8 / 4');
  s1.assertEqual(res.success, true);
  s1.assertEqual(res.result, '6');
});

// 1.3 Percentage
s1.test('Percentage multiplication: 200 * 15%', () => {
  const res = evaluateExpression('200 * 15%');
  s1.assertEqual(res.success, true);
  s1.assertEqual(res.result, '30');
  s1.assertEqual(res.numericValue, 30);
});

s1.test('Percentage prefix: 15% * 200', () => {
  const res = evaluateExpression('15% * 200');
  s1.assertEqual(res.success, true);
  s1.assertEqual(res.result, '30');
});

s1.test('Percentage standalone: 50%', () => {
  const res = evaluateExpression('50%');
  s1.assertEqual(res.success, true);
  s1.assertEqual(res.result, '0.5');
});

s1.test('Percentage implicit multiplication: 50%(200)', () => {
  const res = evaluateExpression('50%(200)');
  s1.assertEqual(res.success, true);
  s1.assertEqual(res.result, '100');
});

// 1.4 Unary minus
s1.test('Unary minus prefix: -5 + 3', () => {
  const res = evaluateExpression('-5 + 3');
  s1.assertEqual(res.success, true);
  s1.assertEqual(res.result, '-2');
  s1.assertEqual(res.numericValue, -2);
});

s1.test('Unary minus in addition: 3 + -5', () => {
  const res = evaluateExpression('3 + -5');
  s1.assertEqual(res.success, true);
  s1.assertEqual(res.result, '-2');
});

s1.test('Unary minus with parentheses: -(5 + 3)', () => {
  const res = evaluateExpression('-(5 + 3)');
  s1.assertEqual(res.success, true);
  s1.assertEqual(res.result, '-8');
});

s1.test('Double unary minus: -(-5)', () => {
  const res = evaluateExpression('-(-5)');
  s1.assertEqual(res.success, true);
  s1.assertEqual(res.result, '5');
});

s1.test('Chained unary minus: --5', () => {
  const res = evaluateExpression('--5');
  s1.assertEqual(res.success, true);
  s1.assertEqual(res.result, '5');
});

s1.test('Triple unary minus: - - - 5', () => {
  const res = evaluateExpression('- - - 5');
  s1.assertEqual(res.success, true);
  s1.assertEqual(res.result, '-5');
});

// 1.5 Float precision
s1.test('Float precision elimination: 0.1 + 0.2', () => {
  const res = evaluateExpression('0.1 + 0.2');
  s1.assertEqual(res.success, true);
  s1.assertEqual(res.result, '0.3');
  s1.assertEqual(res.numericValue! > 0.299 && res.numericValue! < 0.301, true);
});

s1.test('Float precision 0.7 + 0.1', () => {
  const res = evaluateExpression('0.7 + 0.1');
  s1.assertEqual(res.success, true);
  s1.assertEqual(res.result, '0.8');
});

s1.test('Float precision 0.3 - 0.2', () => {
  const res = evaluateExpression('0.3 - 0.2');
  s1.assertEqual(res.success, true);
  s1.assertEqual(res.result, '0.1');
});

s1.test('12-digit repeating float: 1 / 3', () => {
  const res = evaluateExpression('1 / 3');
  s1.assertEqual(res.success, true);
  s1.assertEqual(res.result, '0.333333333333');
});

// 1.6 Division by zero
s1.test('Division by zero: 1 / 0', () => {
  const res = evaluateExpression('1 / 0');
  s1.assertEqual(res.success, false);
  s1.assertEqual(res.result, 'Деление на ноль');
});

s1.test('Division by zero with expression: 5 / (3 - 3)', () => {
  const res = evaluateExpression('5 / (3 - 3)');
  s1.assertEqual(res.success, false);
  s1.assertEqual(res.result, 'Деление на ноль');
});

s1.test('Zero divided by zero: 0 / 0', () => {
  const res = evaluateExpression('0 / 0');
  s1.assertEqual(res.success, false);
  s1.assertEqual(res.result, 'Деление на ноль');
});

// 1.7 Implicit multiplication
s1.test('Implicit multiplication: 5(2 + 3)', () => {
  const res = evaluateExpression('5(2 + 3)');
  s1.assertEqual(res.success, true);
  s1.assertEqual(res.result, '25');
});

s1.test('Implicit multiplication both sides: (2 + 3)(4 - 1)', () => {
  const res = evaluateExpression('(2 + 3)(4 - 1)');
  s1.assertEqual(res.success, true);
  s1.assertEqual(res.result, '15');
});

s1.test('Implicit multiplication after paren: (2 + 3)4', () => {
  const res = evaluateExpression('(2 + 3)4');
  s1.assertEqual(res.success, true);
  s1.assertEqual(res.result, '20');
});

// 1.8 Display symbols normalization
s1.test('Display symbols: 6 × 7 ÷ 2', () => {
  const res = evaluateExpression('6 × 7 ÷ 2');
  s1.assertEqual(res.success, true);
  s1.assertEqual(res.result, '21');
});

// 1.9 Live preview behavior
s1.test('Live preview trailing operator does not throw', () => {
  const res = evaluateExpression('2 + 3 *', true);
  s1.assertEqual(res.success, false);
  s1.assertEqual(res.result, '');
});

s1.test('Live preview unclosed paren auto-completes', () => {
  const res = evaluateExpression('(2 + 3', true);
  s1.assertEqual(res.success, true);
  s1.assertEqual(res.result, '5');
});

s1.test('Live preview division by zero is safely suppressed', () => {
  const res = evaluateExpression('5 / 0', true);
  s1.assertEqual(res.success, false);
  s1.assertEqual(res.result, '');
});

// 1.10 Syntax error handling
s1.test('Mismatched paren throws error in non-live mode', () => {
  const res = evaluateExpression('(2 + 3');
  s1.assertEqual(res.success, false);
  s1.assertEqual(res.result, 'Ошибка');
});

s1.test('Extra closing paren throws error', () => {
  const res = evaluateExpression('2 + 3)');
  s1.assertEqual(res.success, false);
  s1.assertEqual(res.result, 'Ошибка');
});

s1.test('Empty expression returns empty', () => {
  const res = evaluateExpression('   ');
  s1.assertEqual(res.success, false);
  s1.assertEqual(res.result, '');
});

// 1.11 Fuzzing / Random oracle check (100 random arithmetic expressions)
s1.test('Adversarial Fuzzer: 100 random arithmetic expressions vs JS oracle', () => {
  const ops = ['+', '-', '*'];
  let passedFuzz = 0;
  for (let seed = 1; seed <= 100; seed++) {
    const a = (seed * 17) % 50 + 1;
    const b = (seed * 31) % 30 + 1;
    const c = (seed * 13) % 20 + 1;
    const op1 = ops[seed % 3];
    const op2 = ops[(seed + 1) % 3];

    const expr = `(${a} ${op1} ${b}) ${op2} ${c}`;
    const expected = eval(expr);
    const res = evaluateExpression(expr);
    s1.assert(res.success, `Failed to eval valid expr: ${expr}`);
    s1.assertClose(res.numericValue!, expected, 0.0001, `Oracle mismatch for ${expr}`);
    passedFuzz++;
  }
  s1.assertEqual(passedFuzz, 100);
});


// =========================================================================
// SUITE 2: Fraction Math Challenge
// =========================================================================
const s2 = createSuite('Fraction Math');

// 2.1 GCD and LCM rigor
s2.test('GCD standard pairs', () => {
  s2.assertEqual(gcd(12, 18), 6);
  s2.assertEqual(gcd(17, 19), 1);
  s2.assertEqual(gcd(100, 25), 25);
  s2.assertEqual(gcd(-12, 18), 6);
  s2.assertEqual(gcd(12, -18), 6);
});

s2.test('GCD edge cases (zero)', () => {
  s2.assertEqual(gcd(0, 5), 5);
  s2.assertEqual(gcd(5, 0), 5);
  s2.assertEqual(gcd(0, 0), 1); // fallback to 1
});

s2.test('LCM standard pairs', () => {
  s2.assertEqual(lcm(4, 6), 12);
  s2.assertEqual(lcm(3, 7), 21);
  s2.assertEqual(lcm(12, 18), 36);
  s2.assertEqual(lcm(0, 5), 0);
});

// 2.2 toImproper conversion
s2.test('toImproper simple fraction', () => {
  const imp = toImproper({ whole: 0, numerator: 3, denominator: 4 });
  s2.assertEqual(imp.num, 3);
  s2.assertEqual(imp.den, 4);
});

s2.test('toImproper mixed fraction', () => {
  const imp = toImproper({ whole: 2, numerator: 3, denominator: 4 });
  // 2 * 4 + 3 = 11
  s2.assertEqual(imp.num, 11);
  s2.assertEqual(imp.den, 4);
});

s2.test('toImproper negative whole mixed fraction', () => {
  const imp = toImproper({ whole: -2, numerator: 3, denominator: 4 });
  // - (2 * 4 + 3) = -11
  s2.assertEqual(imp.num, -11);
  s2.assertEqual(imp.den, 4);
});

// 2.3 Fraction Addition
s2.test('Fraction Addition: proper + proper (1/3 + 1/6 = 1/2)', () => {
  const f1: MixedFraction = { whole: 0, numerator: 1, denominator: 3 };
  const f2: MixedFraction = { whole: 0, numerator: 1, denominator: 6 };
  const res = calculateFractions(f1, '+', f2);
  s2.assertEqual(res.reducedNum, 1);
  s2.assertEqual(res.reducedDen, 2);
  s2.assertEqual(res.displayMixed, '1/2');
  s2.assertEqual(res.decimalApprox, '0.5000');
});

s2.test('Fraction Addition: common denominator to whole (1/4 + 3/4 = 1)', () => {
  const f1: MixedFraction = { whole: 0, numerator: 1, denominator: 4 };
  const f2: MixedFraction = { whole: 0, numerator: 3, denominator: 4 };
  const res = calculateFractions(f1, '+', f2);
  s2.assertEqual(res.reducedNum, 1);
  s2.assertEqual(res.reducedDen, 1);
  s2.assertEqual(res.whole, 1);
  s2.assertEqual(res.remainder, 0);
  s2.assertEqual(res.displayMixed, '1');
});

s2.test('Fraction Addition: mixed + mixed (1 1/2 + 2 1/4 = 3 3/4)', () => {
  const f1: MixedFraction = { whole: 1, numerator: 1, denominator: 2 };
  const f2: MixedFraction = { whole: 2, numerator: 1, denominator: 4 };
  const res = calculateFractions(f1, '+', f2);
  // 3/2 + 9/4 = 6/4 + 9/4 = 15/4 = 3 3/4
  s2.assertEqual(res.reducedNum, 15);
  s2.assertEqual(res.reducedDen, 4);
  s2.assertEqual(res.whole, 3);
  s2.assertEqual(res.remainder, 3);
  s2.assertEqual(res.displayMixed, '3 3/4');
  s2.assertEqual(res.decimalApprox, '3.7500');
});

// 2.4 Fraction Subtraction
s2.test('Fraction Subtraction: proper - proper (3/4 - 1/4 = 1/2)', () => {
  const f1: MixedFraction = { whole: 0, numerator: 3, denominator: 4 };
  const f2: MixedFraction = { whole: 0, numerator: 1, denominator: 4 };
  const res = calculateFractions(f1, '-', f2);
  s2.assertEqual(res.reducedNum, 1);
  s2.assertEqual(res.reducedDen, 2);
  s2.assertEqual(res.displayMixed, '1/2');
});

s2.test('Fraction Subtraction resulting in negative (1/2 - 3/4 = -1/4)', () => {
  const f1: MixedFraction = { whole: 0, numerator: 1, denominator: 2 };
  const f2: MixedFraction = { whole: 0, numerator: 3, denominator: 4 };
  const res = calculateFractions(f1, '-', f2);
  s2.assertEqual(res.reducedNum, -1);
  s2.assertEqual(res.reducedDen, 4);
  s2.assertEqual(res.displayMixed, '-1/4');
  s2.assertEqual(res.decimalApprox, '-0.2500');
});

s2.test('Fraction Subtraction resulting in 0 (2/3 - 2/3 = 0)', () => {
  const f1: MixedFraction = { whole: 0, numerator: 2, denominator: 3 };
  const f2: MixedFraction = { whole: 0, numerator: 2, denominator: 3 };
  const res = calculateFractions(f1, '-', f2);
  s2.assertEqual(res.reducedNum, 0);
  s2.assertEqual(res.reducedDen, 1);
  s2.assertEqual(res.displayMixed, '0');
});

// 2.5 Fraction Multiplication
s2.test('Fraction Multiplication: proper * proper (2/3 * 3/4 = 1/2)', () => {
  const f1: MixedFraction = { whole: 0, numerator: 2, denominator: 3 };
  const f2: MixedFraction = { whole: 0, numerator: 3, denominator: 4 };
  const res = calculateFractions(f1, '*', f2);
  s2.assertEqual(res.reducedNum, 1);
  s2.assertEqual(res.reducedDen, 2);
  s2.assertEqual(res.displayMixed, '1/2');
});

s2.test('Fraction Multiplication: mixed * mixed (1 1/2 * 2 2/3 = 4)', () => {
  const f1: MixedFraction = { whole: 1, numerator: 1, denominator: 2 }; // 3/2
  const f2: MixedFraction = { whole: 2, numerator: 2, denominator: 3 }; // 8/3
  const res = calculateFractions(f1, '*', f2);
  // (3/2) * (8/3) = 24/6 = 4/1
  s2.assertEqual(res.reducedNum, 4);
  s2.assertEqual(res.reducedDen, 1);
  s2.assertEqual(res.whole, 4);
  s2.assertEqual(res.remainder, 0);
  s2.assertEqual(res.displayMixed, '4');
});

s2.test('Fraction Multiplication by zero', () => {
  const f1: MixedFraction = { whole: 0, numerator: 0, denominator: 1 };
  const f2: MixedFraction = { whole: 2, numerator: 1, denominator: 3 };
  const res = calculateFractions(f1, '*', f2);
  s2.assertEqual(res.reducedNum, 0);
  s2.assertEqual(res.displayMixed, '0');
});

// 2.6 Fraction Division
s2.test('Fraction Division: proper / proper (1/2 / 1/4 = 2)', () => {
  const f1: MixedFraction = { whole: 0, numerator: 1, denominator: 2 };
  const f2: MixedFraction = { whole: 0, numerator: 1, denominator: 4 };
  const res = calculateFractions(f1, '/', f2);
  s2.assertEqual(res.reducedNum, 2);
  s2.assertEqual(res.reducedDen, 1);
  s2.assertEqual(res.displayMixed, '2');
});

s2.test('Fraction Division: mixed / mixed (2 1/2 / 1 1/4 = 2)', () => {
  const f1: MixedFraction = { whole: 2, numerator: 1, denominator: 2 }; // 5/2
  const f2: MixedFraction = { whole: 1, numerator: 1, denominator: 4 }; // 5/4
  const res = calculateFractions(f1, '/', f2);
  s2.assertEqual(res.reducedNum, 2);
  s2.assertEqual(res.reducedDen, 1);
  s2.assertEqual(res.displayMixed, '2');
});

s2.test('Fraction Division by zero fraction returns error', () => {
  const f1: MixedFraction = { whole: 1, numerator: 1, denominator: 2 };
  const f2: MixedFraction = { whole: 0, numerator: 0, denominator: 1 };
  const res = calculateFractions(f1, '/', f2);
  s2.assertEqual(res.displayMixed, 'Ошибка');
  s2.assertEqual(res.error, 'Деление на ноль невозможно');
});

s2.test('Denominator <= 0 validation', () => {
  const f1: MixedFraction = { whole: 1, numerator: 1, denominator: 0 };
  const f2: MixedFraction = { whole: 1, numerator: 1, denominator: 2 };
  const res = calculateFractions(f1, '+', f2);
  s2.assertEqual(res.displayMixed, 'Ошибка');
  s2.assertEqual(res.error, 'Знаменатель должен быть больше нуля');
});

// 2.7 Step-by-step breakdown structure
s2.test('Step-by-step breakdown generated correctly', () => {
  const f1: MixedFraction = { whole: 1, numerator: 1, denominator: 2 };
  const f2: MixedFraction = { whole: 0, numerator: 3, denominator: 4 };
  const res = calculateFractions(f1, '+', f2);
  s2.assert(res.steps.length >= 3, `Expected at least 3 steps, got ${res.steps.length}`);
  s2.assert(res.steps.some((s) => s.label.includes('Перевод в неправильные дроби')), 'Missing improper conversion step');
  s2.assert(res.steps.some((s) => s.label.includes('Приведение к общему знаменателю')), 'Missing common denominator step');
  s2.assert(res.steps.some((s) => s.label.includes('Выделение целой части')), 'Missing mixed extraction step');
});

// 2.8 Fuzzing / Random fraction calculations vs decimal oracle (100 random cases)
s2.test('Adversarial Fuzzer: 100 random fraction operations vs decimal oracle', () => {
  const ops: Array<'+' | '-' | '*' | '/'> = ['+', '-', '*', '/'];
  let passed = 0;
  for (let i = 1; i <= 100; i++) {
    const w1 = i % 5;
    const n1 = (i * 3) % 7 + 1;
    const d1 = (i * 5) % 9 + 1;

    const w2 = (i + 1) % 5;
    const n2 = (i * 7) % 7 + 1;
    const d2 = (i * 11) % 9 + 1;

    const op = ops[i % 4];

    const f1: MixedFraction = { whole: w1, numerator: n1, denominator: d1 };
    const f2: MixedFraction = { whole: w2, numerator: n2, denominator: d2 };

    const dec1 = w1 + n1 / d1;
    const dec2 = w2 + n2 / d2;
    let expectedDec = 0;
    if (op === '+') expectedDec = dec1 + dec2;
    else if (op === '-') expectedDec = dec1 - dec2;
    else if (op === '*') expectedDec = dec1 * dec2;
    else if (op === '/') expectedDec = dec1 / dec2;

    const res = calculateFractions(f1, op, f2);
    if (!res.error) {
      const actualDec = res.reducedNum / res.reducedDen;
      s2.assertClose(actualDec, expectedDec, 0.0001, `Mismatch for ${JSON.stringify(f1)} ${op} ${JSON.stringify(f2)}`);
      passed++;
    }
  }
  s2.assert(passed > 90, `At least 90 random cases succeeded: ${passed}`);
});


// =========================================================================
// SUITE 3: Grade Math Challenge
// =========================================================================
const s3 = createSuite('Grade Math');

// 3.1 Weighted average with custom weights (1x, 1.5x, 2x)
s3.test('Weighted average with custom weights 1.0x, 1.5x, 2.0x', () => {
  const grades: GradeEntry[] = [
    { id: '1', value: 5, weight: 1.0, date: 1, period: 'q1' },
    { id: '2', value: 4, weight: 1.5, date: 2, period: 'q1' },
    { id: '3', value: 3, weight: 2.0, date: 3, period: 'q1' },
  ];
  // Sum = 5*1.0 + 4*1.5 + 3*2.0 = 5 + 6 + 6 = 17.0
  // TotalWeight = 1.0 + 1.5 + 2.0 = 4.5
  // Avg = 17.0 / 4.5 = 3.7777... -> 3.78
  const res = calculateSubjectAverage(grades, 'q1', '5-point');
  s3.assertEqual(res.sum, 17.0);
  s3.assertEqual(res.totalWeight, 4.5);
  s3.assertEqual(res.gradeCount, 3);
  s3.assertEqual(res.average, 3.78);
});

s3.test('Weighted average for empty grades list', () => {
  const res = calculateSubjectAverage([], 'q1', '5-point');
  s3.assertEqual(res.average, 0);
  s3.assertEqual(res.totalWeight, 0);
  s3.assertEqual(res.gradeCount, 0);
  s3.assertEqual(res.sum, 0);
});

// 3.2 US Letter GPA scale calculation
s3.test('US Letter GPA calculation (A=4, B=3, C=2)', () => {
  const grades: GradeEntry[] = [
    { id: '1', value: 4.0, letter: 'A', weight: 2.0, date: 1, period: 'q1' },
    { id: '2', value: 3.0, letter: 'B', weight: 1.0, date: 2, period: 'q1' },
    { id: '3', value: 2.0, letter: 'C', weight: 1.0, date: 3, period: 'q1' },
  ];
  // Sum = 4*2 + 3*1 + 2*1 = 8 + 3 + 2 = 13.0
  // TotalWeight = 4.0
  // Avg = 13.0 / 4.0 = 3.25
  const res = calculateSubjectAverage(grades, 'q1', 'us-letter');
  s3.assertEqual(res.sum, 13.0);
  s3.assertEqual(res.totalWeight, 4.0);
  s3.assertEqual(res.average, 3.25);
});

// 3.3 What-If Simulation Delta
s3.test('What-If simulation positive delta', () => {
  // Current: sum 17, weight 4.5 (avg 3.7777...)
  // Add Grade 5 with weight 2.0 -> newSum 27, newWeight 6.5 -> simulatedAvg 4.1538 -> 4.15
  // Delta: 4.1538 - 3.7777 = 0.376 -> 0.38
  const res = simulateWhatIf(17, 4.5, 5, 2.0);
  s3.assertEqual(res.simulatedAverage, 4.15);
  s3.assertEqual(res.delta, 0.38);
});

s3.test('What-If simulation negative delta', () => {
  // Current: sum 17, weight 4.5 (avg 3.7777...)
  // Add Grade 2 with weight 1.5 -> newSum 20, newWeight 6.0 -> simulatedAvg 3.3333 -> 3.33
  // Delta: 3.3333 - 3.7777 = -0.4444 -> -0.44
  const res = simulateWhatIf(17, 4.5, 2, 1.5);
  s3.assertEqual(res.simulatedAverage, 3.33);
  s3.assertEqual(res.delta, -0.44);
});

s3.test('What-If simulation starting from zero grades', () => {
  const res = simulateWhatIf(0, 0, 5, 1.0);
  s3.assertEqual(res.simulatedAverage, 5.0);
  s3.assertEqual(res.delta, 5.0);
});

// 3.4 Strategy Engine Target Solver (k formula)
const defaultThresholds: ThresholdSettings = {
  '5-point': { 5: 4.5, 4: 3.5, 3: 2.5 },
  'us-letter': { A: 3.5, B: 2.5, C: 1.5, D: 0.5, F: 0.0 },
};

s3.test('Strategy solver when target already achieved', () => {
  const subj: SubjectItem = {
    id: 's1',
    name: 'Математика',
    targetGrade: 5,
    grades: [
      { id: '1', value: 5, weight: 1, date: 1, period: 'q1' },
      { id: '2', value: 5, weight: 1, date: 2, period: 'q1' },
      { id: '3', value: 4, weight: 1, date: 3, period: 'q1' },
    ], // avg: 14/3 = 4.67 >= 4.5
  };
  const res = solveTargetStrategy(subj, 'q1', 5, '5-point', defaultThresholds);
  s3.assertEqual(res.alreadyAchieved, true);
  s3.assertEqual(res.neededTopGrades, 0);
});

s3.test('Strategy solver closed-form k formula: grades [4, 4] targeting 5', () => {
  // Current: grades 4, 4 with weight 1, 1. Sum = 8, W = 2. Avg = 4.00
  // Target: 5 (threshold 4.5).
  // Formula: k = ceil((4.5 * 2 - 8) / (5 - 4.5)) = ceil(1.0 / 0.5) = 2.
  const subj: SubjectItem = {
    id: 's1',
    name: 'Физика',
    targetGrade: 5,
    grades: [
      { id: '1', value: 4, weight: 1, date: 1, period: 'q1' },
      { id: '2', value: 4, weight: 1, date: 2, period: 'q1' },
    ],
  };
  const res = solveTargetStrategy(subj, 'q1', 5, '5-point', defaultThresholds);
  s3.assertEqual(res.alreadyAchieved, false);
  s3.assertEqual(res.neededTopGrades, 2);
  s3.assertEqual(res.projectedAverageWithTopGrades, 4.5);

  // Verify mathematical rigor:
  // With 1 five: (8 + 5) / 3 = 4.33 < 4.5 (FAILS threshold)
  // With 2 fives: (8 + 10) / 4 = 4.50 >= 4.5 (SUCCEEDS threshold)
  s3.assert((8 + 5) / 3 < 4.5, 'Verification check: 1 five must not be enough');
  s3.assert((8 + 10) / 4 >= 4.5, 'Verification check: 2 fives must be enough');
});

s3.test('Strategy solver closed-form k formula: grade [3] targeting 5', () => {
  // Current: grade 3, weight 1. Sum = 3, W = 1.
  // Formula: k = ceil((4.5 * 1 - 3) / 0.5) = ceil(1.5 / 0.5) = 3.
  const subj: SubjectItem = {
    id: 's1',
    name: 'Химия',
    targetGrade: 5,
    grades: [{ id: '1', value: 3, weight: 1, date: 1, period: 'q1' }],
  };
  const res = solveTargetStrategy(subj, 'q1', 5, '5-point', defaultThresholds);
  s3.assertEqual(res.neededTopGrades, 3);
  s3.assertEqual(res.projectedAverageWithTopGrades, 4.5);
  // (3 + 15) / 4 = 18 / 4 = 4.50
});

s3.test('Strategy solver US Letter scale: grades [B, B] targeting A', () => {
  // Current: B (3.0), B (3.0). Sum = 6.0, W = 2.
  // Target: A (threshold 3.5). Top grade: A (4.0).
  // Formula: k = ceil((3.5 * 2 - 6) / (4.0 - 3.5)) = ceil(1.0 / 0.5) = 2.
  const subj: SubjectItem = {
    id: 's1',
    name: 'Literature',
    targetGrade: 'A',
    grades: [
      { id: '1', value: 3.0, letter: 'B', weight: 1, date: 1, period: 'q1' },
      { id: '2', value: 3.0, letter: 'B', weight: 1, date: 2, period: 'q1' },
    ],
  };
  const res = solveTargetStrategy(subj, 'q1', 'A', 'us-letter', defaultThresholds);
  s3.assertEqual(res.neededTopGrades, 2);
  s3.assertEqual(res.projectedAverageWithTopGrades, 3.5);
});

s3.test('Strategy remediation analysis replaces lowest grade', () => {
  const subj: SubjectItem = {
    id: 's1',
    name: 'История',
    targetGrade: 5,
    grades: [
      { id: '1', value: 5, weight: 1, date: 1, period: 'q1' },
      { id: '2', value: 2, weight: 1, date: 2, period: 'q1' },
      { id: '3', value: 5, weight: 1, date: 3, period: 'q1' },
    ], // Current: 12/3 = 4.00
  };
  const res = solveTargetStrategy(subj, 'q1', 5, '5-point', defaultThresholds);
  s3.assert(res.remediation !== undefined, 'Remediation should be defined');
  s3.assertEqual(res.remediation!.canRemediate, true);
  s3.assertEqual(res.remediation!.lowestGrade, 2);
  // If 2 is replaced by 5: (12 - 2 + 5) / 3 = 15 / 3 = 5.00
  s3.assertEqual(res.remediation!.projectedAverage, 5.0);
  s3.assertEqual(res.remediation!.achievesTarget, true);
});

// 3.5 Annual and Global aggregation
s3.test('Annual average aggregates only active periods', () => {
  const subj: SubjectItem = {
    id: 's1',
    name: 'Алгебра',
    targetGrade: 5,
    grades: [
      { id: '1', value: 4, weight: 1, date: 1, period: 'q1' },
      { id: '2', value: 5, weight: 1, date: 2, period: 'q2' },
      // q3 and q4 empty
    ],
  };
  // Q1 avg = 4.0, Q2 avg = 5.0. Active count = 2.
  // Annual avg = (4.0 + 5.0) / 2 = 4.5
  const res = calculateAnnualAverage(subj, 'quarters', '5-point');
  s3.assertEqual(res.activePeriodsCount, 2);
  s3.assertEqual(res.average, 4.5);
});

s3.test('Global average across multiple subjects', () => {
  const subjects: SubjectItem[] = [
    {
      id: 's1',
      name: 'Русский',
      targetGrade: 5,
      grades: [{ id: '1', value: 4, weight: 1, date: 1, period: 'q1' }],
    },
    {
      id: 's2',
      name: 'Литература',
      targetGrade: 5,
      grades: [{ id: '2', value: 5, weight: 1, date: 2, period: 'q1' }],
    },
    {
      id: 's3',
      name: 'Пустой предмет',
      targetGrade: 5,
      grades: [], // Should be skipped in global avg
    },
  ];
  // (4 + 5) / 2 = 4.5
  const avg = calculateGlobalAverage(subjects, 'q1', 'quarters', '5-point');
  s3.assertEqual(avg, 4.5);
});

s3.test('Final grade threshold classification', () => {
  s3.assertEqual(getFinalGrade(4.75, '5-point', defaultThresholds).finalGrade, '5');
  s3.assertEqual(getFinalGrade(4.50, '5-point', defaultThresholds).finalGrade, '5');
  s3.assertEqual(getFinalGrade(4.49, '5-point', defaultThresholds).finalGrade, '4');
  s3.assertEqual(getFinalGrade(3.50, '5-point', defaultThresholds).finalGrade, '4');
  s3.assertEqual(getFinalGrade(3.49, '5-point', defaultThresholds).finalGrade, '3');
  s3.assertEqual(getFinalGrade(2.50, '5-point', defaultThresholds).finalGrade, '3');
  s3.assertEqual(getFinalGrade(2.49, '5-point', defaultThresholds).finalGrade, '2');
  s3.assertEqual(getFinalGrade(0, '5-point', defaultThresholds).finalGrade, '—');
});


// =========================================================================
// EXECUTION & SUMMARY OUTPUT
// =========================================================================
console.log('\n======================================================');
console.log('       EMPIRICAL MATH LOGIC CHALLENGE RESULTS         ');
console.log('======================================================\n');

let grandTotal = 0;
let grandPassed = 0;
let grandFailed = 0;

for (const s of allStats) {
  console.log(`Suite: ${s.suite}`);
  console.log(`  Passed: ${s.passed} / ${s.total} (${s.failed === 0 ? 'ALL PASSED' : s.failed + ' FAILED'})`);
  if (s.failures.length > 0) {
    for (const f of s.failures) {
      console.log(`    [FAIL] ${f}`);
    }
  }
  grandTotal += s.total;
  grandPassed += s.passed;
  grandFailed += s.failed;
}

console.log('------------------------------------------------------');
console.log(`TOTAL: ${grandPassed} / ${grandTotal} passed (${grandFailed} failures)`);
console.log('======================================================\n');

if (grandFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
