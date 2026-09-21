import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../../theme';
import { useI18n } from '../../../i18n';
import { SubjectItem, GradingSystem, PeriodMode, ThresholdSettings, PeriodType } from '../types';
import {
  calculateSubjectAverage,
  calculateAnnualAverage,
  getFinalGrade,
} from '../utils/gradeMath';

export interface AnnualTableCardProps {
  subjects: SubjectItem[];
  system: GradingSystem;
  periodMode: PeriodMode;
  thresholds: ThresholdSettings;
}

export const AnnualTableCard: React.FC<AnnualTableCardProps> = ({
  subjects,
  system,
  periodMode,
  thresholds,
}) => {
  const { colors } = useTheme();
  const { t } = useI18n();

  const periods: { id: PeriodType; label: string }[] =
    periodMode === 'quarters'
      ? [
          { id: 'q1', label: t('shortQ1') },
          { id: 'q2', label: t('shortQ2') },
          { id: 'q3', label: t('shortQ3') },
          { id: 'q4', label: t('shortQ4') },
        ]
      : [
          { id: 's1', label: t('shortS1') },
          { id: 's2', label: t('shortS2') },
        ];

  if (subjects.length === 0) return null;

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
      <Text style={[styles.title, { color: colors.textColor }]}>
        {t('gradesAnnualSummaryTitle')}
      </Text>

      {/* Table Header */}
      <View style={[styles.row, styles.headerRow, { borderBottomColor: colors.borderColor }]}>
        <Text style={[styles.colSubject, styles.headerText, { color: colors.textColorSecondary }]}>
          {t('subject')}
        </Text>
        {periods.map((p) => (
          <Text
            key={p.id}
            style={[styles.colPeriod, styles.headerText, { color: colors.textColorSecondary }]}
          >
            {p.label}
          </Text>
        ))}
        <Text style={[styles.colAvg, styles.headerText, { color: colors.textColorSecondary }]}>
          {t('gradesAnnualYear')}
        </Text>
        <Text style={[styles.colFinal, styles.headerText, { color: colors.textColorSecondary }]}>
          {t('gradesAnnualFinal')}
        </Text>
      </View>

      {/* Table Rows */}
      {subjects.map((subj) => {
        const { average: annualAvg } = calculateAnnualAverage(subj, periodMode, system);
        const { finalGrade, color: gradeColor } = getFinalGrade(
          annualAvg,
          system,
          thresholds
        );

        return (
          <View
            key={subj.id}
            style={[styles.row, { borderBottomColor: colors.borderColor + '40' }]}
          >
            <Text
              style={[styles.colSubject, styles.rowSubjectText, { color: colors.textColor }]}
              numberOfLines={1}
            >
              {subj.name}
            </Text>

            {periods.map((p) => {
              const { average: pAvg, gradeCount } = calculateSubjectAverage(
                subj.grades,
                p.id,
                system
              );
              return (
                <Text
                  key={p.id}
                  style={[
                    styles.colPeriod,
                    styles.rowPeriodText,
                    { color: gradeCount > 0 ? colors.textColor : colors.textColorSecondary },
                  ]}
                >
                  {gradeCount > 0 ? pAvg.toFixed(1) : '—'}
                </Text>
              );
            })}

            <Text
              style={[
                styles.colAvg,
                styles.rowAvgText,
                { color: annualAvg > 0 ? colors.primaryAccent : colors.textColorSecondary },
              ]}
            >
              {annualAvg > 0 ? annualAvg.toFixed(2) : '—'}
            </Text>

            <View style={styles.colFinal}>
              <View
                style={[
                  styles.miniBadge,
                  { backgroundColor: gradeColor + '25', borderColor: gradeColor },
                ]}
              >
                <Text style={[styles.miniBadgeText, { color: gradeColor }]}>
                  {finalGrade}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    paddingBottom: 6,
  },
  headerText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    textAlign: 'center',
  },
  colSubject: {
    flex: 2.2,
    textAlign: 'left',
    paddingRight: 6,
  },
  colPeriod: {
    flex: 1,
    textAlign: 'center',
  },
  colAvg: {
    flex: 1.2,
    textAlign: 'center',
  },
  colFinal: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowSubjectText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  rowPeriodText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  rowAvgText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  miniBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniBadgeText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
  },
});
