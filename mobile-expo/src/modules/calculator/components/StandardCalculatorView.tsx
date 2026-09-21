import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../../theme';
import { CalculatorKeypadButton } from './CalculatorKeypadButton';
import { evaluateExpression } from '../utils/expressionParser';

export interface StandardCalculatorViewProps {
  expression: string;
  setExpression: React.Dispatch<React.SetStateAction<string>>;
  onSaveHistory: (expression: string, result: string) => void;
}

export const StandardCalculatorView: React.FC<StandardCalculatorViewProps> = ({
  expression,
  setExpression,
  onSaveHistory,
}) => {
  const { colors } = useTheme();

  // Compute live preview
  const livePreview = useMemo(() => {
    if (!expression.trim()) return '';
    const res = evaluateExpression(expression, true);
    if (res.success && res.result && res.result !== expression) {
      return `= ${res.result}`;
    }
    return '';
  }, [expression]);

  const handleAppend = (char: string) => {
    setExpression((prev) => {
      const last = prev[prev.length - 1];
      const secondLast = prev.length >= 2 ? prev[prev.length - 2] : undefined;
      const isOp = ['+', '-', '×', '÷'].includes(char);
      const isPrevOp = ['+', '-', '×', '÷'].includes(last);

      // Allow unary minus following multiplication or division (e.g. 5 × -2, 5 ÷ -2)
      if (char === '-' && (last === '×' || last === '÷')) {
        return prev + char;
      }

      // If prev already ends with [×÷]- and user enters an operator
      if (isOp && last === '-' && (secondLast === '×' || secondLast === '÷')) {
        if (char === '-') {
          // Ignore duplicate minus
          return prev;
        }
        // User changed their mind from e.g. "5×-" to "5+"
        return prev.slice(0, -2) + char;
      }

      // Standard operator replacement: replace last operator with the new one
      if (isOp && isPrevOp) {
        return prev.slice(0, -1) + char;
      }

      return prev + char;
    });
  };

  const handleBackspace = () => {
    setExpression((prev) => (prev.length > 0 ? prev.slice(0, -1) : ''));
  };

  const handleClear = () => {
    setExpression('');
  };

  const handleEquals = () => {
    if (!expression.trim()) return;
    const res = evaluateExpression(expression, false);
    if (res.success && res.result) {
      onSaveHistory(expression, res.result);
      setExpression(res.result);
    } else if (res.result) {
      // Syntax error or division by zero
      setExpression(res.result);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Display Card */}
      <View
        style={[
          styles.displayCard,
          {
            backgroundColor: colors.componentBackground,
            borderColor: colors.borderColor,
          },
        ]}
      >
        <Text
          style={[styles.expressionText, { color: colors.textColor }]}
          numberOfLines={2}
          adjustsFontSizeToFit
        >
          {expression || '0'}
        </Text>
        <Text
          style={[styles.previewText, { color: colors.textColorSecondary }]}
          numberOfLines={1}
        >
          {livePreview}
        </Text>
      </View>

      {/* Keypad */}
      <View style={styles.keypadContainer}>
        {/* Row 1: C, (, ), ÷ */}
        <View style={styles.keypadRow}>
          <CalculatorKeypadButton
            label="C"
            type="action"
            onPress={handleClear}
            accessibilityLabel="Очистить всё"
          />
          <CalculatorKeypadButton
            label="("
            type="operator"
            onPress={() => handleAppend('(')}
            accessibilityLabel="Открывающая скобка"
          />
          <CalculatorKeypadButton
            label=")"
            type="operator"
            onPress={() => handleAppend(')')}
            accessibilityLabel="Закрывающая скобка"
          />
          <CalculatorKeypadButton
            label="÷"
            type="operator"
            onPress={() => handleAppend('÷')}
            accessibilityLabel="Деление"
          />
        </View>

        {/* Row 2: 7, 8, 9, × */}
        <View style={styles.keypadRow}>
          <CalculatorKeypadButton label="7" onPress={() => handleAppend('7')} />
          <CalculatorKeypadButton label="8" onPress={() => handleAppend('8')} />
          <CalculatorKeypadButton label="9" onPress={() => handleAppend('9')} />
          <CalculatorKeypadButton
            label="×"
            type="operator"
            onPress={() => handleAppend('×')}
            accessibilityLabel="Умножение"
          />
        </View>

        {/* Row 3: 4, 5, 6, - */}
        <View style={styles.keypadRow}>
          <CalculatorKeypadButton label="4" onPress={() => handleAppend('4')} />
          <CalculatorKeypadButton label="5" onPress={() => handleAppend('5')} />
          <CalculatorKeypadButton label="6" onPress={() => handleAppend('6')} />
          <CalculatorKeypadButton
            label="-"
            type="operator"
            onPress={() => handleAppend('-')}
            accessibilityLabel="Вычитание"
          />
        </View>

        {/* Row 4: 1, 2, 3, + */}
        <View style={styles.keypadRow}>
          <CalculatorKeypadButton label="1" onPress={() => handleAppend('1')} />
          <CalculatorKeypadButton label="2" onPress={() => handleAppend('2')} />
          <CalculatorKeypadButton label="3" onPress={() => handleAppend('3')} />
          <CalculatorKeypadButton
            label="+"
            type="operator"
            onPress={() => handleAppend('+')}
            accessibilityLabel="Сложение"
          />
        </View>

        {/* Row 5: ⌫, 0, ., % */}
        <View style={styles.keypadRow}>
          <CalculatorKeypadButton
            iconName="delete"
            type="action"
            onPress={handleBackspace}
            accessibilityLabel="Стереть символ"
          />
          <CalculatorKeypadButton label="0" onPress={() => handleAppend('0')} />
          <CalculatorKeypadButton
            label="."
            onPress={() => handleAppend('.')}
            accessibilityLabel="Точка"
          />
          <CalculatorKeypadButton
            label="%"
            type="operator"
            onPress={() => handleAppend('%')}
            accessibilityLabel="Процент"
          />
        </View>

        {/* Bottom Row: = full width */}
        <View style={styles.keypadRow}>
          <CalculatorKeypadButton
            label="="
            type="accent"
            flexSpan={4}
            onPress={handleEquals}
            accessibilityLabel="Вычислить результат"
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  displayCard: {
    minHeight: 84,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  expressionText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    textAlign: 'right',
    minHeight: 38,
  },
  previewText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    textAlign: 'right',
    minHeight: 22,
  },
  keypadContainer: {
    width: '100%',
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
