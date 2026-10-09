import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../../theme';

interface FormulaInsertToolbarProps {
  onInsert: (formulaSnippet: string) => void;
  onClose: () => void;
}

interface FormulaItem {
  label: string;
  template: string;
  description: string;
}

const FORMULA_SNIPPETS: FormulaItem[] = [
  { label: 'a/b', template: '\\frac{a}{b}', description: 'Дробь' },
  { label: 'x²', template: 'x^{2}', description: 'Квадрат' },
  { label: 'xⁿ', template: 'x^{n}', description: 'Степень' },
  { label: '√x', template: '\\sqrt{x}', description: 'Корень' },
  { label: '∫dx', template: '\\int_{a}^{b} f(x) \\, dx', description: 'Интеграл' },
  { label: '∑', template: '\\sum_{i=1}^{n} x_i', description: 'Сумма' },
  { label: 'lim', template: '\\lim_{x \\to 0} f(x)', description: 'Предел' },
  { label: '±', template: '\\pm ', description: 'Плюс-минус' },
  { label: 'π', template: '\\pi ', description: 'Число пи' },
  { label: 'α', template: '\\alpha ', description: 'Альфа' },
  { label: 'β', template: '\\beta ', description: 'Бета' },
  { label: 'θ', template: '\\theta ', description: 'Тета' },
  { label: '∞', template: '\\infty ', description: 'Бесконечность' },
  { label: '≤', template: '\\leq ', description: 'Меньше или равно' },
  { label: '≥', template: '\\geq ', description: 'Больше или равно' },
  { label: '≠', template: '\\neq ', description: 'Не равно' },
  { label: 'x₁', template: 'x_{1}', description: 'Индекс' },
];

export const FormulaInsertToolbar: React.FC<FormulaInsertToolbarProps> = ({
  onInsert,
  onClose,
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.componentBackground,
          borderColor: colors.borderColor,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeGlyph}>∑</Text>
          <Text style={[styles.badgeText, { color: colors.textColor }]}>
            Вставка формул LaTeX
          </Text>
        </View>

        <TouchableOpacity
          onPress={onClose}
          style={styles.closeBtn}
          accessibilityLabel="Close formula toolbar"
        >
          <Text style={[styles.closeText, { color: colors.textColorSecondary }]}>
            Закрыть
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {FORMULA_SNIPPETS.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.chip,
              {
                backgroundColor: colors.background,
                borderColor: colors.borderColor,
              },
            ]}
            onPress={() => onInsert(item.template)}
            activeOpacity={0.7}
            accessibilityLabel={item.description}
          >
            <Text style={[styles.chipLabel, { color: colors.primaryAccent }]}>
              {item.label}
            </Text>
            <Text style={[styles.chipDesc, { color: colors.textColorSecondary }]}>
              {item.description}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeGlyph: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#6366f1',
    fontWeight: 'bold',
  },
  badgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  closeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  closeText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  scrollList: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  chipDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
});
