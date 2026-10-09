import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { useI18n } from '../../../i18n';
import { PeriodType, PeriodMode } from '../types';

export interface PeriodSelectorBarProps {
  periodMode: PeriodMode;
  activePeriod: PeriodType;
  onSelectPeriod: (period: PeriodType) => void;
  onOpenSettings?: () => void;
}

export const PeriodSelectorBar: React.FC<PeriodSelectorBarProps> = ({
  periodMode,
  activePeriod,
  onSelectPeriod,
  onOpenSettings,
}) => {
  const { colors } = useTheme();
  const { t } = useI18n();

  const periods: { id: PeriodType; label: string }[] =
    periodMode === 'quarters'
      ? [
          { id: 'q1', label: t('quarter1') },
          { id: 'q2', label: t('quarter2') },
          { id: 'q3', label: t('quarter3') },
          { id: 'q4', label: t('quarter4') },
          { id: 'annual', label: t('gradesAnnual') },
        ]
      : [
          { id: 's1', label: t('semester1') },
          { id: 's2', label: t('semester2') },
          { id: 'annual', label: t('gradesAnnual') },
        ];

  return (
    <View style={[styles.container, { borderBottomColor: colors.borderColor }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {periods.map((item) => {
          const isActive = activePeriod === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => onSelectPeriod(item.id)}
              accessibilityRole="button"
              accessibilityLabel={t('selectPeriodA11y', { period: item.label })}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive ? colors.primaryAccent : colors.componentBackground,
                  borderColor: isActive ? colors.primaryAccent : colors.borderColor,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: isActive ? '#ffffff' : colors.textColorSecondary },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {onOpenSettings && (
        <TouchableOpacity
          onPress={onOpenSettings}
          accessibilityRole="button"
          accessibilityLabel={t('periodSettingsA11y')}
          style={[styles.settingsButton, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}
          activeOpacity={0.7}
        >
          <Feather name="sliders" size={16} color={colors.textColor} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  settingsButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
});
