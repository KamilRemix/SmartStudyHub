import React from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme, useAppFonts } from './src/theme';
import { RootNavigator } from './src/navigation';
import { AuthProvider } from './src/context/AuthContext';
import { I18nProvider } from './src/i18n';

import { OfflineBanner } from './src/components/common/OfflineBanner';

function AppContent() {
  const { colors, isDark, isLoading } = useTheme();
  const { isReady } = useAppFonts();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  if (!isReady || isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primaryAccent} />
      </View>
    );
  }

  const isWeb = Platform.OS === 'web';
  const isDesktop = isWeb && width >= 768;

  const pageBg = isDesktop
    ? (isDark ? '#0b0f19' : '#f1f5f9')
    : colors.background;

  const frameStyle: any = isDesktop
    ? {
        maxWidth: 430,
        height: Math.min(height * 0.94, 900),
        borderRadius: 36,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0',
        boxShadow: isDark
          ? '0 25px 50px -12px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.06)'
          : '0 25px 50px -12px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.04)',
      }
    : {
        maxWidth: '100%',
        height: '100%',
        borderRadius: 0,
        borderWidth: 0,
        boxShadow: 'none',
      };

  return (
    <View style={[styles.outerWrapper, { backgroundColor: pageBg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            paddingTop: !isDesktop && insets.top > 0 ? insets.top : 0,
          },
          frameStyle,
        ]}
      >
        <OfflineBanner />
        <RootNavigator />
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <I18nProvider>
            <AppContent />
          </I18nProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
