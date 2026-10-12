import React, { useEffect } from 'react';
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
  Theme as NavTheme,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '../theme';
import { BottomTabNavigator } from './BottomTabNavigator';
import { RootTabParamList } from './types';
import { notificationService } from '../services/notificationService';

export const navigationRef = createNavigationContainerRef<RootTabParamList>();

export const RootNavigator: React.FC = () => {
  const { colors, isDark } = useTheme();
  const baseTheme = isDark ? DarkTheme : DefaultTheme;

  useEffect(() => {
    // 1. Handle notification tap while app is running / in background
    const subscription = notificationService.addNotificationResponseListener((noteId) => {
      if (navigationRef.isReady()) {
        navigationRef.navigate('Notes', { openNoteId: noteId });
      }
    });

    // 2. Handle cold start when opened from tapping notification
    notificationService.getLastNotificationResponse().then((noteId) => {
      if (noteId && navigationRef.isReady()) {
        navigationRef.navigate('Notes', { openNoteId: noteId });
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

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
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <BottomTabNavigator />
    </NavigationContainer>
  );
};
