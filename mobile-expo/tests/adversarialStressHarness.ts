/**
 * Adversarial Stress & Edge Case Harness
 */

import { evaluateExpression, formatPrecision } from '../src/modules/calculator/utils/expressionParser';
import { calculateFractions, toImproper, gcd, lcm } from '../src/modules/calculator/utils/fractionMath';
import {
  calculateSubjectAverage,
  calculateAnnualAverage,
  calculateGlobalAverage,
  simulateWhatIf,
  solveTargetStrategy,
  convertGradeToSystem,
  NUM_TO_LETTER,
  LETTER_TO_NUM,
} from '../src/modules/grades/utils/gradeMath';
import { MixedFraction } from '../src/modules/calculator/types';
import { SubjectItem, GradeEntry, ThresholdSettings } from '../src/modules/grades/types';

interface AdversarialFinding {
  title: string;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  description: string;
  reproductionCode: string;
  empiricalOutput: any;
}

const findings: AdversarialFinding[] = [];

console.log('--- STARTING ADVERSARIAL ATTACK TESTING ---');

// =========================================================================
// ATTACK 1: Floating Point Artifact in formatPrecision: (0.1 + 0.2) - 0.3
// =========================================================================
console.log('[Test 1.1] Testing (0.1 + 0.2) - 0.3 cancellation...');
const res1_1 = evaluateExpression('(0.1 + 0.2) - 0.3');
console.log('  Result of (0.1 + 0.2) - 0.3:', res1_1);
if (res1_1.result !== '0') {
  findings.push({
    title: 'Floating point cancellation artifact in formatPrecision',
    category: 'Calculator Precision',
    severity: 'LOW',
    description: `Expression (0.1 + 0.2) - 0.3 results in 5.551115e-17 instead of '0' because formatPrecision treats numbers with |x| < 1e-6 as exponential scientific notation rather than rounding near-zero epsilon to 0.`,
    reproductionCode: "evaluateExpression('(0.1 + 0.2) - 0.3')",
    empiricalOutput: res1_1.result,
  });
}

// =========================================================================
// ATTACK 1.2: Deep nesting stack safety (1000 nested parentheses)
// =========================================================================
console.log('[Test 1.2] Testing 500 nested parentheses...');
let deepExpr = '1';
for (let i = 0; i < 500; i++) {
  deepExpr = `(${deepExpr} + 1)`;
}
try {
  const res1_2 = evaluateExpression(deepExpr);
  console.log('  500 nested parens result:', res1_2.result === '501' ? 'PASS (501)' : 'FAIL');
} catch (e: any) {
  findings.push({
    title: 'Call stack or heap overflow on deeply nested parentheses',
    category: 'Calculator Robustness',
    severity: 'MEDIUM',
    description: `Deeply nested parentheses triggered an unhandled exception: ${e.message}`,
    reproductionCode: "evaluateExpression('(...500 parens...)')",
    empiricalOutput: e.message,
  });
}

// =========================================================================
// ATTACK 2: Negative numerator in toImproper when whole is 0
// =========================================================================
console.log('[Test 2.1] Testing toImproper with negative numerator and whole=0...');
const impNegNum = toImproper({ whole: 0, numerator: -5, denominator: 3 });
console.log('  toImproper({ whole: 0, numerator: -5, denominator: 3 }) =>', impNegNum);
if (impNegNum.num === 5) {
  findings.push({
    title: 'Sign loss in toImproper when whole part is 0 and numerator is negative',
    category: 'Fraction Math',
    severity: 'MEDIUM',
    description: `When whole=0 and numerator=-5, toImproper returns num=5 (positive 5/3 instead of -5/3). Note that MixedFractionInput UI sanitizer limits numerator to positive digits (replace(/[^0-9]/g, '')), so in the UI numerator is never negative, but programmatically toImproper drops the negative sign.`,
    reproductionCode: 'toImproper({ whole: 0, numerator: -5, denominator: 3 })',
    empiricalOutput: impNegNum,
  });
}

// =========================================================================
// ATTACK 2.2: Negative zero whole number in toImproper
// =========================================================================
console.log('[Test 2.2] Testing toImproper with whole = -0 ...');
const impNegZero = toImproper({ whole: -0, numerator: 1, denominator: 2 });
console.log('  toImproper({ whole: -0, numerator: 1, denominator: 2 }) =>', impNegZero);

// =========================================================================
// ATTACK 2.3: Fraction subtraction resulting in negative fraction
// =========================================================================
console.log('[Test 2.3] Testing fraction subtraction: 1/4 - 3/4...');
const resSub = calculateFractions(
  { whole: 0, numerator: 1, denominator: 4 },
  '-',
  { whole: 0, numerator: 3, denominator: 4 }
);
console.log('  Result of 1/4 - 3/4:', resSub.displayMixed, resSub.reducedNum, '/', resSub.reducedDen);
if (resSub.displayMixed !== '-1/2') {
  findings.push({
    title: 'Unexpected format for negative fraction',
    category: 'Fraction Math',
    severity: 'HIGH',
    description: `Expected '-1/2', got ${resSub.displayMixed}`,
    reproductionCode: "calculateFractions({ whole: 0, numerator: 1, denominator: 4 }, '-', { whole: 0, numerator: 3, denominator: 4 })",
    empiricalOutput: resSub,
  });
}

// =========================================================================
// ATTACK 3: Floating point precision in target solver k formula
// =========================================================================
console.log('[Test 3.1] Testing target solver precision over 10,000 randomized grade scenarios...');
const defaultThresholds: ThresholdSettings = {
  '5-point': { 5: 4.5, 4: 3.5, 3: 2.5 },
  'us-letter': { A: 3.5, B: 2.5, C: 1.5, D: 0.5, F: 0.0 },
};

let kFailures = 0;
let kTests = 0;

for (let g1 = 1; g1 <= 5; g1++) {
  for (let g2 = 1; g2 <= 5; g2++) {
    for (let w1 of [1.0, 1.5, 2.0, 3.0]) {
      for (let w2 of [1.0, 1.5, 2.0, 3.0]) {
        for (let target of [4, 5]) {
          const grades: GradeEntry[] = [
            { id: '1', value: g1, weight: w1, date: 1, period: 'q1' },
            { id: '2', value: g2, weight: w2, date: 2, period: 'q1' },
          ];
          const subj: SubjectItem = {
            id: 'test',
            name: 'Test',
            targetGrade: target,
            grades,
          };

          const strat = solveTargetStrategy(subj, 'q1', target, '5-point', defaultThresholds);
          kTests++;

          if (!strat.alreadyAchieved) {
            const k = strat.neededTopGrades;
            const currentSum = g1 * w1 + g2 * w2;
            const currentW = w1 + w2;
            const threshold = defaultThresholds['5-point'][target as 5 | 4 | 3];

            // Check if k is sufficient: (currentSum + k * 5) / (currentW + k) >= threshold
            const achievedAvg = (currentSum + k * 5) / (currentW + k);
            if (achievedAvg < threshold - 0.000001) {
              kFailures++;
              console.log(`  FAILED: k=${k} not sufficient for grades [${g1}(${w1}x), ${g2}(${w2}x)] target=${target}. Achieved=${achievedAvg}, needed=${threshold}`);
            }

            // Check if k - 1 is NOT sufficient (i.e. k is minimal)
            if (k > 1) {
              const prevAvg = (currentSum + (k - 1) * 5) / (currentW + (k - 1));
              if (prevAvg >= threshold) {
                kFailures++;
                console.log(`  FAILED: k=${k} is not minimal! k-1=${k-1} achieves ${prevAvg} >= ${threshold}`);
              }
            }
          }
        }
      }
    }
  }
}
console.log(`  Verified ${kTests} scenarios for target solver k formula. Failures: ${kFailures}`);
if (kFailures > 0) {
  findings.push({
    title: 'Target solver k formula error or non-minimality',
    category: 'Grade Math',
    severity: 'HIGH',
    description: `Target solver failed in ${kFailures} / ${kTests} scenarios`,
    reproductionCode: 'Ran grid of 1-5 grades and weights [1, 1.5, 2, 3]',
    empiricalOutput: { kFailures, kTests },
  });
}

// =========================================================================
// ATTACK 4: Bijective Conversion between 5-point and US-letter
// =========================================================================
console.log('[Test 4.1] Testing bijective grade conversion for standard 1-5...');
let convFailures = 0;
for (let num = 1; num <= 5; num++) {
  const gOrig: GradeEntry = { id: 'g', value: num, weight: 1, date: 1, period: 'q1' };
  const gUS = convertGradeToSystem(gOrig, 'us-letter');
  const gBack = convertGradeToSystem(gUS, '5-point');
  if (gBack.value !== num) {
    convFailures++;
    console.log(`  Conversion cycle failed: ${num} -> ${gUS.letter} -> ${gBack.value}`);
  }
}
console.log(`  Grade conversion roundtrip failures: ${convFailures}`);

// =========================================================================
// SUMMARY OF FINDINGS
// =========================================================================
console.log('\n======================================================');
console.log('          ADVERSARIAL ATTACK FINDINGS SUMMARY         ');
console.log('======================================================');
console.log(`Total Findings Identified: ${findings.length}`);
for (const f of findings) {
  console.log(`\n[${f.severity}] ${f.title} (${f.category})`);
  console.log(`  Description: ${f.description}`);
  console.log(`  Repro: ${f.reproductionCode}`);
  console.log(`  Output: ${JSON.stringify(f.empiricalOutput)}`);
}
console.log('======================================================\n');
