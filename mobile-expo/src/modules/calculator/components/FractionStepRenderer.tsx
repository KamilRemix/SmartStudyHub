import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme';
import { useI18n } from '../../../i18n';
import { FractionStep } from '../types';

export interface FractionStepRendererProps {
  steps: FractionStep[];
}

export const FractionStepRenderer: React.FC<FractionStepRendererProps> = ({ steps }) => {
  const { colors } = useTheme();
  const { t } = useI18n();

  if (!steps || steps.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.mainHeader, { color: colors.textColor }]}>
        {t('fractionStepSolution')}
      </Text>
      {steps.map((step, idx) => (
        <View
          key={idx}
          style={[
            styles.stepCard,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.borderColor,
            },
          ]}
        >
          <Text style={[styles.stepLabel, { color: colors.primaryAccent }]}>
            {step.label}
          </Text>
          <View style={styles.itemsRow}>
            {step.items.map((item, itemIdx) => {
              if (item.type === 'text') {
                return (
                  <Text key={itemIdx} style={[styles.stepText, { color: colors.textColor }]}>
                    {item.text}
                  </Text>
                );
              }
              if (item.type === 'fraction') {
                return (
                  <View key={itemIdx} style={styles.fractionBox}>
                    <Text style={[styles.fractionNum, { color: colors.textColor }]}>
                      {item.num}
                    </Text>
                    <View style={[styles.fractionBar, { backgroundColor: colors.textColor }]} />
                    <Text style={[styles.fractionDen, { color: colors.textColor }]}>
                      {item.den}
                    </Text>
                  </View>
                );
              }
              return null;
            })}
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    width: '100%',
  },
  mainHeader: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    marginBottom: 10,
  },
  stepCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  stepLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    marginBottom: 6,
  },
  itemsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  stepText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
  },
  fractionBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  fractionNum: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  fractionBar: {
    width: 24,
    height: 1.5,
    marginVertical: 1,
  },
  fractionDen: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
});
