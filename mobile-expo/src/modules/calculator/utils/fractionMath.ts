import { MixedFraction, FractionResult, FractionStep } from '../types';

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
}

export function toImproper(f: MixedFraction): { num: number; den: number } {
  const den = f.denominator <= 0 ? 1 : Math.floor(f.denominator);
  const numPart = Math.abs(Math.floor(f.numerator));
  const wholePart = Math.floor(f.whole);

  const sign = wholePart < 0 ? -1 : 1;
  const num = sign * (Math.abs(wholePart) * den + numPart);

  return { num, den };
}

export type FractionOperator = '+' | '-' | '*' | '/' | '×' | '÷';

export function calculateFractions(
  f1: MixedFraction,
  operator: FractionOperator,
  f2: MixedFraction
): FractionResult {
  // Validate denominators
  if (f1.denominator <= 0 || f2.denominator <= 0) {
    return {
      reducedNum: 0,
      reducedDen: 1,
      whole: 0,
      remainder: 0,
      displayMixed: 'Ошибка',
      decimalApprox: '0',
      steps: [],
      error: 'Знаменатель должен быть больше нуля',
    };
  }

  const imp1 = toImproper(f1);
  const imp2 = toImproper(f2);
  const steps: FractionStep[] = [];

  // Step 1: Improper fractions explanation
  const hasMixed = f1.whole !== 0 || f2.whole !== 0;
  if (hasMixed) {
    steps.push({
      label: '1. Перевод в неправильные дроби',
      items: [
        { type: 'text', text: 'Первая дробь: ' },
        { type: 'fraction', num: imp1.num, den: imp1.den },
        { type: 'text', text: ', вторая дробь: ' },
        { type: 'fraction', num: imp2.num, den: imp2.den },
      ],
    });
  }

  let rawNum = 0;
  let rawDen = 1;

  const normalizedOp = operator === '×' ? '*' : operator === '÷' ? '/' : operator;

  if (normalizedOp === '+' || normalizedOp === '-') {
    const commonDen = lcm(imp1.den, imp2.den);
    const m1 = commonDen / imp1.den;
    const m2 = commonDen / imp2.den;

    const scaledNum1 = imp1.num * m1;
    const scaledNum2 = imp2.num * m2;

    steps.push({
      label: '2. Приведение к общему знаменателю',
      items: [
        { type: 'text', text: `НОК(${imp1.den}, ${imp2.den}) = ${commonDen}. Множители: ${m1} и ${m2}` },
      ],
    });

    if (normalizedOp === '+') {
      rawNum = scaledNum1 + scaledNum2;
      rawDen = commonDen;
      steps.push({
        label: '3. Сложение числителей',
        items: [
          { type: 'text', text: `(${scaledNum1} + ${scaledNum2}) / ${commonDen} = ` },
          { type: 'fraction', num: rawNum, den: rawDen },
        ],
      });
    } else {
      rawNum = scaledNum1 - scaledNum2;
      rawDen = commonDen;
      steps.push({
        label: '3. Вычитание числителей',
        items: [
          { type: 'text', text: `(${scaledNum1} - ${scaledNum2}) / ${commonDen} = ` },
          { type: 'fraction', num: rawNum, den: rawDen },
        ],
      });
    }
  } else if (normalizedOp === '*') {
    rawNum = imp1.num * imp2.num;
    rawDen = imp1.den * imp2.den;
    steps.push({
      label: '2. Умножение числителей и знаменателей',
      items: [
        { type: 'text', text: `(${imp1.num} × ${imp2.num}) / (${imp1.den} × ${imp2.den}) = ` },
        { type: 'fraction', num: rawNum, den: rawDen },
      ],
    });
  } else if (normalizedOp === '/') {
    if (imp2.num === 0) {
      return {
        reducedNum: 0,
        reducedDen: 1,
        whole: 0,
        remainder: 0,
        displayMixed: 'Ошибка',
        decimalApprox: '0',
        steps: [],
        error: 'Деление на ноль невозможно',
      };
    }
    rawNum = imp1.num * imp2.den;
    rawDen = imp1.den * imp2.num;

    if (rawDen < 0) {
      rawNum = -rawNum;
      rawDen = -rawDen;
    }

    steps.push({
      label: '2. Умножение на обратную дробь',
      items: [
        { type: 'text', text: `(${imp1.num} × ${imp2.den}) / (${imp1.den} × ${imp2.num}) = ` },
        { type: 'fraction', num: rawNum, den: rawDen },
      ],
    });
  }

  // Reduction
  const g = gcd(rawNum, rawDen);
  const redNum = rawNum / g;
  const redDen = rawDen / g;

  if (g > 1) {
    steps.push({
      label: '4. Сокращение дроби',
      items: [
        { type: 'text', text: `Делим числитель и знаменатель на НОД = ${g}: ` },
        { type: 'fraction', num: redNum, den: redDen },
      ],
    });
  }

  // Mixed representation
  const whole = Math.trunc(redNum / redDen);
  const rem = Math.abs(redNum % redDen);

  let displayMixed = '';
  if (rem === 0) {
    displayMixed = `${whole}`;
  } else if (whole === 0) {
    displayMixed = `${redNum}/${redDen}`;
  } else {
    displayMixed = `${whole} ${rem}/${redDen}`;
  }

  if (Math.abs(redNum) >= redDen && rem !== 0) {
    steps.push({
      label: '5. Выделение целой части',
      items: [
        { type: 'text', text: `Результат в виде смешанного числа: ${displayMixed}` },
      ],
    });
  }

  const decimalVal = redDen !== 0 ? (redNum / redDen) : 0;
  const decimalApprox = decimalVal.toFixed(4);

  return {
    reducedNum: redNum,
    reducedDen: redDen,
    whole,
    remainder: rem,
    displayMixed,
    decimalApprox,
    steps,
  };
}
