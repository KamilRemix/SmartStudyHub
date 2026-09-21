import React, { useRef } from 'react';
import { StyleSheet, Text, Pressable, Animated, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

export interface CalculatorKeypadButtonProps {
  label?: string;
  iconName?: keyof typeof Feather.glyphMap;
  onPress: () => void;
  type?: 'digit' | 'operator' | 'action' | 'accent';
  flexSpan?: number;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export const CalculatorKeypadButton: React.FC<CalculatorKeypadButtonProps> = ({
  label,
  iconName,
  onPress,
  type = 'digit',
  flexSpan = 1,
  accessibilityLabel,
  style,
}) => {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  let bgColor = colors.surfaceSecondary;
  let textColor = colors.textColor;

  if (type === 'operator') {
    bgColor = colors.componentBackground;
    textColor = colors.primaryAccent;
  } else if (type === 'action') {
    bgColor = colors.surfaceSecondary;
    textColor = colors.secondaryAccent;
  } else if (type === 'accent') {
    bgColor = colors.primaryAccent;
    textColor = '#ffffff';
  }

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.94,
      useNativeDriver: false,
      speed: 45,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: false,
      speed: 35,
      bounciness: 6,
    }).start();
  };

  return (
    <Animated.View
      style={[
        {
          flex: flexSpan,
          transform: [{ scale: scaleAnim }],
        },
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || label || (iconName ? String(iconName) : 'button')}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: bgColor,
            borderColor: colors.borderColor,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        {iconName ? (
          <Feather name={iconName} size={22} color={textColor} />
        ) : (
          <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    margin: 3,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
  },
});
