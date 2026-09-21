import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme';
import { useI18n } from '../../../i18n';
import { MixedFraction } from '../types';

export interface MixedFractionInputProps {
  label: string;
  fraction: MixedFraction;
  onChange: (val: MixedFraction) => void;
}

export const MixedFractionInput: React.FC<MixedFractionInputProps> = ({
  label,
  fraction,
  onChange,
}) => {
  const { colors } = useTheme();
  const { t } = useI18n();

  const handleWholeChange = (text: string) => {
    const clean = text.replace(/[^0-9-]/g, '');
    const num = parseInt(clean, 10);
    onChange({
      ...fraction,
      whole: isNaN(num) ? 0 : num,
    });
  };

  const handleNumChange = (text: string) => {
    const clean = text.replace(/[^0-9]/g, '');
    const num = parseInt(clean, 10);
    onChange({
      ...fraction,
      numerator: isNaN(num) ? 0 : num,
    });
  };

  const handleDenChange = (text: string) => {
    const clean = text.replace(/[^0-9]/g, '');
    const num = parseInt(clean, 10);
    onChange({
      ...fraction,
      denominator: isNaN(num) ? 1 : num,
    });
  };

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
      <Text style={[styles.title, { color: colors.textColorSecondary }]}>{label}</Text>

      <View style={styles.inputsRow}>
        {/* Whole Part */}
        <View style={styles.wholeContainer}>
          <Text style={[styles.fieldLabel, { color: colors.textColorSecondary }]}>
            {t('wholePart')}
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.wholeInput,
              {
                backgroundColor: colors.surfaceSecondary,
                color: colors.textColor,
                borderColor: colors.borderColor,
              },
            ]}
            keyboardType="numeric"
            value={fraction.whole === 0 ? '' : fraction.whole.toString()}
            placeholder="0"
            placeholderTextColor={colors.textColorSecondary}
            onChangeText={handleWholeChange}
          />
        </View>

        {/* Fraction Part: Numerator / Denominator */}
        <View style={styles.fractionColumn}>
          <Text style={[styles.fieldLabel, { color: colors.textColorSecondary }]}>
            {t('numerator')}
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.numDenInput,
              {
                backgroundColor: colors.surfaceSecondary,
                color: colors.textColor,
                borderColor: colors.borderColor,
              },
            ]}
            keyboardType="number-pad"
            value={fraction.numerator === 0 ? '' : fraction.numerator.toString()}
            placeholder="0"
            placeholderTextColor={colors.textColorSecondary}
            onChangeText={handleNumChange}
          />

          <View style={[styles.fractionBar, { backgroundColor: colors.textColorSecondary }]} />

          <Text style={[styles.fieldLabel, { color: colors.textColorSecondary }]}>
            {t('denominator')}
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.numDenInput,
              {
                backgroundColor: colors.surfaceSecondary,
                color: colors.textColor,
                borderColor: colors.borderColor,
              },
            ]}
            keyboardType="number-pad"
            value={fraction.denominator === 1 && fraction.numerator === 0 && fraction.whole === 0 ? '' : fraction.denominator.toString()}
            placeholder="1"
            placeholderTextColor={colors.textColorSecondary}
            onChangeText={handleDenChange}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    marginBottom: 10,
  },
  inputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  wholeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingVertical: 0,
    paddingHorizontal: 4,
  },
  wholeInput: {
    width: 84,
    height: 62,
  },
  fractionColumn: {
    alignItems: 'center',
    width: 104,
  },
  numDenInput: {
    width: 96,
    height: 46,
    fontSize: 18,
  },
  fractionBar: {
    width: 96,
    height: 2,
    marginVertical: 4,
    borderRadius: 1,
  },
});
