import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { useI18n } from '../../../i18n';
import { GradingSystem } from '../types';
import { LETTER_TO_GPA } from '../utils/gradeMath';

export interface GradeInputKeypadProps {
  system: GradingSystem;
  onAddGrade: (value: number, weight: number, letter?: 'A' | 'B' | 'C' | 'D' | 'F') => void;
  onDeleteLastGrade: () => void;
  onClearGrades: () => void;
}

export const GradeInputKeypad: React.FC<GradeInputKeypadProps> = ({
  system,
  onAddGrade,
  onDeleteLastGrade,
  onClearGrades,
}) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [selectedWeight, setSelectedWeight] = useState<number>(1.0);

  const weights: { value: number; label: string }[] = [
    { value: 1.0, label: t('weightOral') },
    { value: 1.5, label: t('weightTest') },
    { value: 2.0, label: t('weightExam') },
    { value: 3.0, label: t('weightFinal') },
  ];

  const handleGradePress = (item: number | string) => {
    if (system === '5-point') {
      const num = Number(item);
      onAddGrade(num, selectedWeight);
    } else {
      const letter = String(item) as 'A' | 'B' | 'C' | 'D' | 'F';
      const gpa = LETTER_TO_GPA[letter] ?? 0;
      onAddGrade(gpa, selectedWeight, letter);
    }
  };

  const handleClear = () => {
    Alert.alert(t('clearGradesTitle'), t('clearGradesConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: onClearGrades },
    ]);
  };

  const grades5Point = [5, 4, 3, 2, 1];
  const gradesUS = ['A', 'B', 'C', 'D', 'F'];
  const currentGradeItems = system === '5-point' ? grades5Point : gradesUS;

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
      {/* Weight Selector */}
      <View style={styles.weightRow}>
        {weights.map((w) => {
          const isSelected = selectedWeight === w.value;
          return (
            <TouchableOpacity
              key={w.value}
              onPress={() => setSelectedWeight(w.value)}
              accessibilityRole="button"
              accessibilityLabel={t('weightCoefficientA11y', { label: w.label })}
              style={[
                styles.weightPill,
                {
                  backgroundColor: isSelected ? colors.primaryAccent : colors.surfaceSecondary,
                  borderColor: isSelected ? colors.primaryAccent : colors.borderColor,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.weightText,
                  { color: isSelected ? '#ffffff' : colors.textColorSecondary },
                ]}
              >
                {w.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Grade Buttons & Actions */}
      <View style={styles.buttonsRow}>
        {currentGradeItems.map((val) => (
          <TouchableOpacity
            key={String(val)}
            onPress={() => handleGradePress(val)}
            accessibilityRole="button"
            accessibilityLabel={t('addGradeA11y', { val })}
            style={[
              styles.gradeButton,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.borderColor,
              },
            ]}
            activeOpacity={0.7}
          >
            <Text style={[styles.gradeText, { color: colors.textColor }]}>{val}</Text>
          </TouchableOpacity>
        ))}

        {/* Backspace Button */}
        <TouchableOpacity
          onPress={onDeleteLastGrade}
          accessibilityRole="button"
          accessibilityLabel={t('deleteLastGradeA11y')}
          style={[
            styles.actionButton,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.borderColor,
            },
          ]}
          activeOpacity={0.7}
        >
          <Feather name="delete" size={18} color={colors.secondaryAccent} />
        </TouchableOpacity>

        {/* Clear Button */}
        <TouchableOpacity
          onPress={handleClear}
          accessibilityRole="button"
          accessibilityLabel={t('clearGradesA11y')}
          style={[
            styles.actionButton,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.borderColor,
            },
          ]}
          activeOpacity={0.7}
        >
          <Feather name="trash-2" size={18} color={colors.secondaryAccent} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginVertical: 10,
  },
  weightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 12,
  },
  weightPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  gradeButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
