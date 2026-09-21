import React from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme, Theme as NavTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '../theme';
import { BottomTabNavigator } from './BottomTabNavigator';

export const RootNavigator: React.FC = () => {
  const { colors, isDark } = useTheme();
  const baseTheme = isDark ? DarkTheme : DefaultTheme;

  const navigationTheme: NavTheme = {
    ...baseTheme,
    dark: isDark,
    colors: {
      ...baseTheme.colors,
      primary: colors.primaryAccent,
      background: colors.background,
      card: colors.componentBackground,
      text: colors.textColor,
      border: colors.borderColor,
      notification: colors.secondaryAccent,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <BottomTabNavigator />
    </NavigationContainer>
  );
};
