import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { SubjectItem, GradingSystem, PeriodType, ThresholdSettings } from '../types';
import { solveTargetStrategy } from '../utils/gradeMath';

export interface StrategyEngineCardProps {
  subject: SubjectItem;
  system: GradingSystem;
  period: PeriodType;
  thresholds: ThresholdSettings;
}

export const StrategyEngineCard: React.FC<StrategyEngineCardProps> = ({
  subject,
  system,
  period,
  thresholds,
}) => {
  const { colors } = useTheme();

  const defaultTarget = system === '5-point' ? 5 : 'A';
  const [selectedTarget, setSelectedTarget] = useState<number | string>(
    subject.targetGrade || defaultTarget
  );

  const targets = system === '5-point' ? [5, 4, 3] : ['A', 'B', 'C'];
  const strategy = solveTargetStrategy(subject, period, selectedTarget, system, thresholds);

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
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <Feather name="trending-up" size={18} color={colors.primaryAccent} />
          <Text style={[styles.cardTitle, { color: colors.textColor }]}>
            Стратегия достижения цели
          </Text>
        </View>

        {/* Target Buttons */}
        <View style={styles.targetRow}>
          {targets.map((t) => {
            const isSelected = selectedTarget === t;
            return (
              <TouchableOpacity
                key={String(t)}
                onPress={() => setSelectedTarget(t)}
                accessibilityRole="button"
                accessibilityLabel={`Выбрать целевую оценку ${t}`}
                style={[
                  styles.targetButton,
                  {
                    backgroundColor: isSelected ? colors.primaryAccent : colors.surfaceSecondary,
                    borderColor: isSelected ? colors.primaryAccent : colors.borderColor,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.targetText,
                    { color: isSelected ? '#ffffff' : colors.textColorSecondary },
                  ]}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Primary Strategy Verdict */}
      {strategy.alreadyAchieved ? (
        <View
          style={[
            styles.verdictBox,
            {
              backgroundColor: colors.success + '15',
              borderColor: colors.success,
            },
          ]}
        >
          <Feather name="check-circle" size={20} color={colors.success} />
          <View style={styles.verdictTextContainer}>
            <Text style={[styles.verdictTitle, { color: colors.success }]}>
              Цель уже достигнута!
            </Text>
            <Text style={[styles.verdictDescription, { color: colors.textColor }]}>
              Текущий балл {strategy.currentAverage.toFixed(2)} соответствует или превышает порог{' '}
              {strategy.targetThreshold.toFixed(2)}. Главное — удерживать планку!
            </Text>
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.verdictBox,
            {
              backgroundColor: colors.primaryAccent + '15',
              borderColor: colors.primaryAccent,
            },
          ]}
        >
          <Feather name="award" size={20} color={colors.primaryAccent} />
          <View style={styles.verdictTextContainer}>
            <Text style={[styles.verdictTitle, { color: colors.primaryAccent }]}>
              Прямой путь: нужно {strategy.neededTopGrades} оценок «{strategy.topGradeValue}»
            </Text>
            <Text style={[styles.verdictDescription, { color: colors.textColor }]}>
              Получив еще {strategy.neededTopGrades} высших оценок (весом 1.0), ваш средний балл
              поднимется до {strategy.projectedAverageWithTopGrades.toFixed(2)} (порог:{' '}
              {strategy.targetThreshold.toFixed(2)}).
            </Text>
          </View>
        </View>
      )}

      {/* Alternative 1: Mixed Strategy */}
      {!strategy.alreadyAchieved && strategy.mixedStrategy && strategy.mixedStrategy.fivesCount > 0 && (
        <View
          style={[
            styles.altCard,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.borderColor,
            },
          ]}
        >
          <Feather name="git-merge" size={16} color={colors.textColorSecondary} />
          <View style={styles.altTextContainer}>
            <Text style={[styles.altTitle, { color: colors.textColor }]}>
              Смешанный вариант:
            </Text>
            <Text style={[styles.altDescription, { color: colors.textColorSecondary }]}>
              {strategy.mixedStrategy.fivesCount} пятерок и {strategy.mixedStrategy.foursCount}{' '}
              четверок → средний балл: {strategy.mixedStrategy.projectedAverage.toFixed(2)}
            </Text>
          </View>
        </View>
      )}

      {/* Alternative 2: Remediation */}
      {!strategy.alreadyAchieved && strategy.remediation?.canRemediate && (
        <View
          style={[
            styles.altCard,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.borderColor,
            },
          ]}
        >
          <Feather name="refresh-cw" size={16} color={colors.textColorSecondary} />
          <View style={styles.altTextContainer}>
            <Text style={[styles.altTitle, { color: colors.textColor }]}>
              Исправление оценки:
            </Text>
            <Text style={[styles.altDescription, { color: colors.textColorSecondary }]}>
              Пересдайте оценку «{strategy.remediation.lowestGrade}» на «{strategy.topGradeValue}» →
              прогноз балла: {strategy.remediation.projectedAverage.toFixed(2)}{' '}
              {strategy.remediation.achievesTarget ? '(цель будет достигнута!)' : ''}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },
  targetRow: {
    flexDirection: 'row',
    gap: 6,
  },
  targetButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  verdictBox: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  verdictTextContainer: {
    flex: 1,
  },
  verdictTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    marginBottom: 4,
  },
  verdictDescription: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  altCard: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  altTextContainer: {
    flex: 1,
  },
  altTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  altDescription: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 2,
  },
});
