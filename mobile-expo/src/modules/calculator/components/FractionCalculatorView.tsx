import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme';
import { useI18n } from '../../../i18n';
import { MixedFraction, FractionResult } from '../types';
import { MixedFractionInput } from './MixedFractionInput';
import { FractionStepRenderer } from './FractionStepRenderer';
import { calculateFractions, FractionOperator } from '../utils/fractionMath';

export interface FractionCalculatorViewProps {
  onSaveHistory: (expression: string, result: string) => void;
}

export const FractionCalculatorView: React.FC<FractionCalculatorViewProps> = ({
  onSaveHistory,
}) => {
  const { colors } = useTheme();
  const { t } = useI18n();

  const [f1, setF1] = useState<MixedFraction>({ whole: 0, numerator: 0, denominator: 1 });
  const [operator, setOperator] = useState<FractionOperator>('+');
  const [f2, setF2] = useState<MixedFraction>({ whole: 0, numerator: 0, denominator: 1 });
  const [result, setResult] = useState<FractionResult | null>(null);

  const operators: FractionOperator[] = ['+', '-', '×', '÷'];

  const formatFractionString = (f: MixedFraction): string => {
    let str = '';
    if (f.whole !== 0) str += `${f.whole} `;
    if (f.numerator !== 0 || f.whole === 0) {
      str += `${f.numerator}/${f.denominator}`;
    }
    return str.trim();
  };

  const handleCalculate = () => {
    const res = calculateFractions(f1, operator, f2);
    setResult(res);

    if (!res.error) {
      const eq = `${formatFractionString(f1)} ${operator} ${formatFractionString(f2)}`;
      onSaveHistory(eq, res.displayMixed);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* First Fraction */}
      <MixedFractionInput label={t('firstFraction')} fraction={f1} onChange={setF1} />

      {/* Operator Selector */}
      <View style={styles.operatorRow}>
        {operators.map((op) => {
          const isSelected = operator === op;
          return (
            <TouchableOpacity
              key={op}
              onPress={() => setOperator(op)}
              accessibilityRole="button"
              accessibilityLabel={op}
              style={[
                styles.operatorButton,
                {
                  backgroundColor: isSelected ? colors.primaryAccent : colors.componentBackground,
                  borderColor: isSelected ? colors.primaryAccent : colors.borderColor,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.operatorText,
                  { color: isSelected ? '#ffffff' : colors.textColor },
                ]}
              >
                {op}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Second Fraction */}
      <MixedFractionInput label={t('secondFraction')} fraction={f2} onChange={setF2} />

      {/* Calculate Button */}
      <TouchableOpacity
        onPress={handleCalculate}
        accessibilityRole="button"
        accessibilityLabel={t('calculateFractions')}
        style={[styles.calcButton, { backgroundColor: colors.primaryAccent }]}
        activeOpacity={0.8}
      >
        <Text style={styles.calcButtonText}>{t('calculateFractions')}</Text>
      </TouchableOpacity>

      {/* Result Display */}
      {result && (
        <View
          style={[
            styles.resultCard,
            {
              backgroundColor: colors.componentBackground,
              borderColor: colors.borderColor,
            },
          ]}
        >
          {result.error ? (
            <Text style={[styles.errorText, { color: colors.secondaryAccent }]}>
              {result.error}
            </Text>
          ) : (
            <>
              <Text style={[styles.resultLabel, { color: colors.textColorSecondary }]}>
                {t('result')}:
              </Text>
              <Text style={[styles.resultValue, { color: colors.textColor }]}>
                {result.displayMixed}
              </Text>
              <Text style={[styles.decimalValue, { color: colors.textColorSecondary }]}>
                ≈ {result.decimalApprox}
              </Text>

              {/* Step by step breakdown */}
              <FractionStepRenderer steps={result.steps} />
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  operatorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 6,
  },
  operatorButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  operatorText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
  },
  calcButton: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  calcButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
  resultCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
  },
  resultLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    marginBottom: 4,
  },
  resultValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
  },
  decimalValue: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    marginTop: 2,
  },
  errorText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
});
