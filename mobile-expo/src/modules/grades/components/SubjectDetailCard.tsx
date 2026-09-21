import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { SubjectItem, GradingSystem, PeriodType, ThresholdSettings } from '../types';
import { calculateSubjectAverage, getFinalGrade } from '../utils/gradeMath';

export interface SubjectDetailCardProps {
  subject: SubjectItem;
  system: GradingSystem;
  period: PeriodType;
  thresholds: ThresholdSettings;
  onDeleteGrade: (gradeId: string) => void;
  onOpenWhatIf: () => void;
  onDeleteSubject: () => void;
}

export const SubjectDetailCard: React.FC<SubjectDetailCardProps> = ({
  subject,
  system,
  period,
  thresholds,
  onDeleteGrade,
  onOpenWhatIf,
  onDeleteSubject,
}) => {
  const { colors } = useTheme();

  const { average, totalWeight, gradeCount } = calculateSubjectAverage(
    subject.grades,
    period,
    system
  );

  const { finalGrade, color: gradeColor } = getFinalGrade(average, system, thresholds);
  const periodGrades = subject.grades.filter((g) => g.period === period);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.componentBackground,
          borderColor: colors.borderColor,
        },
      ]}
    >
      {/* Subject Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleInfo}>
          <Text style={[styles.subjectName, { color: colors.textColor }]} numberOfLines={1}>
            {subject.name}
          </Text>
          <Text style={[styles.targetInfo, { color: colors.textColorSecondary }]}>
            Цель: {subject.targetGrade}
          </Text>
        </View>

        <TouchableOpacity
          onPress={onDeleteSubject}
          accessibilityRole="button"
          accessibilityLabel={`Удалить предмет ${subject.name}`}
          style={styles.deleteSubjectBtn}
          activeOpacity={0.7}
        >
          <Feather name="trash-2" size={16} color={colors.textColorSecondary} />
        </TouchableOpacity>
      </View>

      {/* Hero Score Section */}
      <View style={styles.scoreRow}>
        <View style={styles.scoreLeft}>
          <Text style={[styles.heroAverage, { color: gradeColor }]}>
            {average > 0 ? average.toFixed(2) : '—'}
          </Text>
          <Text style={[styles.statsSubtitle, { color: colors.textColorSecondary }]}>
            {gradeCount > 0
              ? `${gradeCount} оценок • вес: ${totalWeight.toFixed(1)}`
              : 'Нет оценок за этот период'}
          </Text>
        </View>

        <View style={styles.scoreRight}>
          <View style={[styles.finalBadge, { backgroundColor: gradeColor + '20', borderColor: gradeColor }]}>
            <Text style={[styles.finalBadgeText, { color: gradeColor }]}>
              {finalGrade}
            </Text>
          </View>
        </View>
      </View>

      {/* Grade Chips Scroll */}
      <View style={styles.chipsSection}>
        {periodGrades.length === 0 ? (
          <Text style={[styles.noGradesNotice, { color: colors.textColorSecondary }]}>
            Нажмите на кнопки оценок ниже, чтобы добавить первую оценку.
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {periodGrades.map((g) => {
              const displayVal = system === 'us-letter' ? g.letter || g.value : g.value;
              return (
                <View
                  key={g.id}
                  style={[
                    styles.gradeChip,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.borderColor,
                    },
                  ]}
                >
                  <Text style={[styles.chipGradeVal, { color: colors.textColor }]}>
                    {displayVal}
                  </Text>
                  {g.weight !== 1.0 && (
                    <Text style={[styles.chipWeight, { color: colors.primaryAccent }]}>
                      {g.weight}x
                    </Text>
                  )}
                  <TouchableOpacity
                    onPress={() => onDeleteGrade(g.id)}
                    accessibilityRole="button"
                    accessibilityLabel="Удалить оценку"
                    style={styles.chipDeleteBtn}
                    activeOpacity={0.7}
                  >
                    <Feather name="x" size={12} color={colors.textColorSecondary} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* What-If Button */}
      <TouchableOpacity
        onPress={onOpenWhatIf}
        accessibilityRole="button"
        accessibilityLabel="Калькулятор Что если"
        style={[
          styles.whatIfButton,
          {
            backgroundColor: colors.surfaceSecondary,
            borderColor: colors.borderColor,
          },
        ]}
        activeOpacity={0.7}
      >
        <Feather name="help-circle" size={16} color={colors.primaryAccent} />
        <Text style={[styles.whatIfText, { color: colors.primaryAccent }]}>
          Симулятор «Что если?»
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleInfo: {
    flex: 1,
  },
  subjectName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
  },
  targetInfo: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  deleteSubjectBtn: {
    padding: 6,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  scoreLeft: {
    flex: 1,
  },
  heroAverage: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 34,
    lineHeight: 40,
  },
  statsSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  scoreRight: {
    alignItems: 'center',
  },
  finalBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finalBadgeText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
  },
  chipsSection: {
    minHeight: 40,
    marginBottom: 12,
  },
  noGradesNotice: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingVertical: 4,
  },
  gradeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  chipGradeVal: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },
  chipWeight: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  chipDeleteBtn: {
    padding: 2,
  },
  whatIfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  whatIfText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
});
