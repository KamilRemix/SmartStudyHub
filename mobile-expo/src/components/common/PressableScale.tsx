import React, { useRef } from 'react';
import {
  Pressable,
  Animated,
  PressableProps,
  StyleProp,
  ViewStyle,
  StyleSheet,
} from 'react-native';

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  children: React.ReactNode;
}

/**
 * Micro-interaction wrapper inspired by Emil Kowalski's design engineering philosophy.
 * Gives instant, tactile feedback on press with snappy timing (120ms) and spring recovery.
 */
export const PressableScale: React.FC<PressableScaleProps> = ({
  children,
  style,
  scaleTo = 0.96,
  disabled,
  onPressIn,
  onPressOut,
  ...props
}) => {
  const animatedScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = (e: any) => {
    if (!disabled) {
      Animated.timing(animatedScale, {
        toValue: scaleTo,
        duration: 120,
        useNativeDriver: true,
      }).start();
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    if (!disabled) {
      Animated.spring(animatedScale, {
        toValue: 1,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }).start();
    }
    onPressOut?.(e);
  };

  const flat = StyleSheet.flatten(style);
  const outerStyle: ViewStyle = {};
  if (flat) {
    if (flat.flex !== undefined) outerStyle.flex = flat.flex;
    if (flat.flexGrow !== undefined) outerStyle.flexGrow = flat.flexGrow;
    if (flat.flexShrink !== undefined) outerStyle.flexShrink = flat.flexShrink;
    if (flat.alignSelf !== undefined) outerStyle.alignSelf = flat.alignSelf;
    if (flat.width !== undefined) outerStyle.width = flat.width;
    if (flat.minWidth !== undefined) outerStyle.minWidth = flat.minWidth;
  }

  return (
    <Pressable
      {...props}
      style={outerStyle}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[style, { transform: [{ scale: animatedScale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};
