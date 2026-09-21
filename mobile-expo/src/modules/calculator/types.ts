export type CalcMode = 'standard' | 'fraction' | 'history';

export interface CalcHistoryEntry {
  id: string;
  expression: string;
  result: string;
  timestamp: number;
  type: 'standard' | 'fraction';
}

export interface MixedFraction {
  whole: number;
  numerator: number;
  denominator: number;
}

export interface FractionStepItem {
  type: 'fraction' | 'operator' | 'text';
  whole?: number;
  num?: number;
  den?: number;
  text?: string;
}

export interface FractionStep {
  label: string;
  items: FractionStepItem[];
}

export interface FractionResult {
  reducedNum: number;
  reducedDen: number;
  whole: number;
  remainder: number;
  displayMixed: string;
  decimalApprox: string;
  steps: FractionStep[];
  error?: string;
}
