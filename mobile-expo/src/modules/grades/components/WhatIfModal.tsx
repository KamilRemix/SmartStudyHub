import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { useI18n } from '../../../i18n';
import { SubjectItem, GradingSystem, PeriodType } from '../types';
import { calculateSubjectAverage, simulateWhatIf, LETTER_TO_GPA } from '../utils/gradeMath';

export interface WhatIfModalProps {
  visible: boolean;
  subject: SubjectItem;
  system: GradingSystem;
  period: PeriodType;
  onClose: () => void;
  onApplyGrade: (value: number, weight: number, letter?: 'A' | 'B' | 'C' | 'D' | 'F') => void;
}

export const WhatIfModal: React.FC<WhatIfModalProps> = ({
  visible,
  subject,
  system,
  period,
  onClose,
  onApplyGrade,
}) => {
  const { colors } = useTheme();
  const { t } = useI18n();

  const [hypoValue, setHypoValue] = useState<number>(system === '5-point' ? 5 : 4);
  const [hypoLetter, setHypoLetter] = useState<'A' | 'B' | 'C' | 'D' | 'F'>('A');
  const [hypoWeight, setHypoWeight] = useState<number>(1.0);

  const { average, totalWeight, sum } = calculateSubjectAverage(subject.grades, period, system);

  const gradeNumeric =
    system === 'us-letter' ? LETTER_TO_GPA[hypoLetter] ?? 4.0 : hypoValue;

  const { simulatedAverage, delta } = simulateWhatIf(sum, totalWeight, gradeNumeric, hypoWeight);

  const handleApply = () => {
    onApplyGrade(gradeNumeric, hypoWeight, system === 'us-letter' ? hypoLetter : undefined);
    onClose();
  };

  const grades5 = [5, 4, 3, 2, 1];
  const gradesUS: ('A' | 'B' | 'C' | 'D' | 'F')[] = ['A', 'B', 'C', 'D', 'F'];
  const weights = [
    { value: 1.0, label: t('weightOral') },
    { value: 1.5, label: t('weightTest') },
    { value: 2.0, label: t('weightExam') },
    { value: 3.0, label: t('weightFinal') },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.componentBackground,
                  borderColor: colors.borderColor,
                },
              ]}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Feather name="help-circle" size={20} color={colors.primaryAccent} />
                  <Text style={[styles.title, { color: colors.textColor }]}>
                    {t('whatIfSimulator')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel={t('closeSimulatorA11y')}
                  style={styles.closeBtn}
                >
                  <Feather name="x" size={20} color={colors.textColorSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.subtitle, { color: colors.textColorSecondary }]}>
                {t('subjectPrefix', { name: subject.name })}
              </Text>

              {/* Grade Selector */}
              <Text style={[styles.sectionTitle, { color: colors.textColor }]}>
                {t('hypotheticalGradeLabel')}
              </Text>
              <View style={styles.selectorRow}>
                {system === '5-point'
                  ? grades5.map((val) => {
                      const isSel = hypoValue === val;
                      return (
                        <TouchableOpacity
                          key={val}
                          onPress={() => setHypoValue(val)}
                          accessibilityRole="button"
                          accessibilityLabel={t('selectGradeA11y', { grade: String(val) })}
                          style={[
                            styles.gradeOption,
                            {
                              backgroundColor: isSel
                                ? colors.primaryAccent
                                : colors.surfaceSecondary,
                              borderColor: isSel ? colors.primaryAccent : colors.borderColor,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.gradeOptionText,
                              { color: isSel ? '#ffffff' : colors.textColor },
                            ]}
                          >
                            {val}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  : gradesUS.map((letter) => {
                      const isSel = hypoLetter === letter;
                      return (
                        <TouchableOpacity
                          key={letter}
                          onPress={() => setHypoLetter(letter)}
                          accessibilityRole="button"
                          accessibilityLabel={t('selectGradeA11y', { grade: letter })}
                          style={[
                            styles.gradeOption,
                            {
                              backgroundColor: isSel
                                ? colors.primaryAccent
                                : colors.surfaceSecondary,
                              borderColor: isSel ? colors.primaryAccent : colors.borderColor,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.gradeOptionText,
                              { color: isSel ? '#ffffff' : colors.textColor },
                            ]}
                          >
                            {letter}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
              </View>

              {/* Weight Selector */}
              <Text style={[styles.sectionTitle, { color: colors.textColor }]}>
                {t('gradeWeightLabel')}
              </Text>
              <View style={styles.weightsGrid}>
                {weights.map((w) => {
                  const isSel = hypoWeight === w.value;
                  return (
                    <TouchableOpacity
                      key={w.value}
                      onPress={() => setHypoWeight(w.value)}
                      accessibilityRole="button"
                      accessibilityLabel={t('gradeWeightA11y', { label: w.label })}
                      style={[
                        styles.weightOption,
                        {
                          backgroundColor: isSel
                            ? colors.primaryAccent
                            : colors.surfaceSecondary,
                          borderColor: isSel ? colors.primaryAccent : colors.borderColor,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.weightOptionText,
                          { color: isSel ? '#ffffff' : colors.textColorSecondary },
                        ]}
                      >
                        {w.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Comparison Results Card */}
              <View
                style={[
                  styles.previewBox,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.borderColor,
                  },
                ]}
              >
                <View style={styles.statCol}>
                  <Text style={[styles.statLabel, { color: colors.textColorSecondary }]}>
                    {t('currentScoreLabel')}
                  </Text>
                  <Text style={[styles.statValue, { color: colors.textColor }]}>
                    {average.toFixed(2)}
                  </Text>
                </View>

                <Feather name="arrow-right" size={20} color={colors.textColorSecondary} />

                <View style={styles.statCol}>
                  <Text style={[styles.statLabel, { color: colors.textColorSecondary }]}>
                    {t('projectedScoreLabel')}
                  </Text>
                  <Text style={[styles.statValue, { color: colors.primaryAccent }]}>
                    {simulatedAverage.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.statCol}>
                  <Text style={[styles.statLabel, { color: colors.textColorSecondary }]}>
                    {t('changeScoreLabel')}
                  </Text>
                  <Text
                    style={[
                      styles.statDelta,
                      { color: delta >= 0 ? colors.success : colors.secondaryAccent },
                    ]}
                  >
                    {delta >= 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel={t('cancelSimulationA11y')}
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.borderColor,
                    },
                  ]}
                >
                  <Text style={[styles.actionBtnText, { color: colors.textColorSecondary }]}>
                    {t('cancel')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleApply}
                  accessibilityRole="button"
                  accessibilityLabel={t('applyHypoGradeA11y')}
                  style={[styles.actionBtn, { backgroundColor: colors.primaryAccent }]}
                >
                  <Text style={[styles.actionBtnText, { color: '#ffffff' }]}>
                    {t('apply')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    marginBottom: 8,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  gradeOption: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeOptionText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  },
  weightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  weightOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  weightOptionText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  previewBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  statCol: {
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  statValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    marginTop: 2,
  },
  statDelta: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
});
