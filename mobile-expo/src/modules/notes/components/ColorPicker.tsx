import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { NOTE_COLOR_PALETTE } from '../../../theme/colors';

export interface ColorPickerProps {
  selectedColor: string;
  onSelectColor: (hex: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColor,
  onSelectColor,
}) => {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}
    >
      {NOTE_COLOR_PALETTE.map((item) => {
        const isSelected = selectedColor === item.hex;
        const isDefault = item.hex === '';

        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => onSelectColor(item.hex)}
            accessibilityRole="button"
            accessibilityLabel={`Цвет заметки: ${item.name}`}
            style={[
              styles.circle,
              {
                backgroundColor: isDefault ? colors.componentBackground : item.hex,
                borderColor: isSelected ? colors.primaryAccent : colors.borderColor,
                borderWidth: isSelected ? 2.5 : 1,
              },
            ]}
            activeOpacity={0.7}
          >
            {isDefault ? (
              <Feather
                name={isSelected ? 'check' : 'x'}
                size={14}
                color={isSelected ? colors.primaryAccent : colors.textColorSecondary}
              />
            ) : isSelected ? (
              <Feather name="check" size={14} color="#ffffff" />
            ) : null}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  circle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
