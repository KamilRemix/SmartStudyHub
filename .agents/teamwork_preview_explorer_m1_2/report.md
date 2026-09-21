# SmartStudyHub Mobile: Theme & Typography Architecture Report

**Milestone**: Milestone 1 (App Foundation & Navigation)  
**Author**: Explorer 2 (`teamwork_preview_explorer_m1_2`)  
**Target Path**: `c:\projects\SmartStudyHub\mobile-expo\src\theme\`  
**Context**: Porting web client UI/theme to React Native (Expo SDK 52 Managed Workflow)

---

## 1. Executive Summary

This investigation establishes the complete, production-grade **Theme and Typography System** for the React Native (Expo SDK 52) port of SmartStudyHub in `mobile-expo/`.

### Core Architectural Decisions
1. **Strict Token Parity with Web**: Every color token is mapped directly from `public/style.css` (lines 1–34, 454–505, 2775–2790, 3954–3965), preserving the distinct aesthetic of SmartStudyHub:
   - Light Theme: Crisp slate background (`#f4f7f9`), pure white surfaces (`#ffffff`), and Apple/iOS blue accent (`#007aff`).
   - Dark Theme: Deep OLED slate background (`#121212`), elevated component cards (`#1e1e1e`), and vibrant electric cyan accent (`#00ffff`) paired with deep purple secondary accents (`#9400d3`).
2. **Strict Emoji Elimination**: In adherence to `AGENTS.md` and `ORIGINAL_REQUEST.md`, zero unicode emoji characters are used. All visual iconography is delegated to `@expo/vector-icons` (`Feather` and `MaterialIcons`).
3. **Full Note Palette**: The 10 distinctive background hex values from `public/index.html` (lines 477–486) are formalized in TypeScript with semantic metadata.
4. **Zero-Flicker Typography Engine**: Google Fonts (`Poppins` and `Inter`) are loaded asynchronously via `expo-font` combined with `expo-splash-screen`. The native splash screen is locked until all fonts and stored theme preferences are resolved, eliminating Flash of Unstyled Text (FOUT) and layout shifts.
5. **Robust Persistence & System Sync**: Theme preference (`light` | `dark`) is cached in `@react-native-async-storage/async-storage` under key `@smartstudy_theme`. If no preference is stored, it seamlessly synchronizes with the user's OS scheme via `Appearance.getColorScheme()`.
6. **Native Navigation Alignment**: Direct bidirectional mapping to React Navigation's `Theme` interface ensures bottom tabs, headers, and modal transitions never flash default white or mismatched backgrounds.

---

## 2. Exact Color Token Mapping (Web `style.css` $\rightarrow$ TypeScript)

### 2.1 CSS Source Analysis
The web application defines its theme variables in `public/style.css`:
- **Root & Fonts** (lines 1–5): `--font-family: 'Poppins', sans-serif;`
- **Light Theme** (lines 8–19):
  ```css
  body.light-theme {
      --background-color: #f4f7f9;
      --component-background: #ffffff;
      --primary-accent: #007aff;
      --secondary-accent: #ff3b30;
      --text-color: #000000;
      --text-color-secondary: #6e6e73;
      --glow-color-primary: rgba(0, 122, 255, 0.3);
      --glow-color-secondary: rgba(255, 59, 48, 0.3);
      --shadow-color-deep: rgba(0, 0, 0, 0.15);
      --shadow-color-lift: rgba(0, 0, 0, 0.05);
  }
  ```
- **Dark Theme** (lines 22–33):
  ```css
  body.dark-theme {
      --background-color: #121212;
      --component-background: #1e1e1e;
      --primary-accent: #00ffff;
      --secondary-accent: #9400d3;
      --text-color: #e0e0e0;
      --text-color-secondary: #a0a0a0;
      --glow-color-primary: rgba(0, 255, 255, 0.4);
      --glow-color-secondary: rgba(148, 0, 211, 0.4);
      --shadow-color-deep: rgba(0, 0, 0, 0.5);
      --shadow-color-lift: rgba(0, 0, 0, 0.3);
  }
  ```
- **Feedback & State Badges** (`public/renderer.js:266–275` & `public/style.css:414`):
  - Error background: `rgba(255, 76, 76, 0.12)`, text/border: `#ff4c4c` / `#ff5252`
  - Success background: `rgba(0, 230, 118, 0.12)`, text/border: `#00e676`
  - Warning: `#ff9500` (light) / `#ffeb3b` (dark)

### 2.2 Token Mapping Matrix

| Token Name | Light Value | Dark Value | CSS / Web Source | Purpose in React Native |
|---|---|---|---|---|
| `background` | `#f4f7f9` | `#121212` | `--background-color` (lines 9, 23) | Root screen container, page background |
| `card` | `#ffffff` | `#1e1e1e` | `--component-background` (lines 10, 24) | Card containers, bottom sheet surface |
| `surface` | `#ffffff` | `#1e1e1e` | `--component-background` (lines 10, 24) | Secondary elevated panels, modals |
| `surfaceSecondary`| `#f0f2f5` | `#262626` | `style.css:838, 3957` | Input field background, chip inactive |
| `primary` | `#007aff` | `#00ffff` | `--primary-accent` (lines 11, 25) | Active tab, primary buttons, hero text |
| `secondary` | `#ff3b30` | `#9400d3` | `--secondary-accent` (lines 12, 26) | Clear buttons, accent gradients, badges |
| `text` | `#000000` | `#e0e0e0` | `--text-color` (lines 13, 27) | Primary titles, headlines, inputs |
| `textSecondary` | `#6e6e73` | `#a0a0a0` | `--text-color-secondary` (lines 14, 28)| Captions, inactive tab labels, placeholders |
| `border` | `rgba(0, 0, 0, 0.10)` | `rgba(255, 255, 255, 0.12)` | `style.css:409, 3960, 5476` | Card dividers, input outline borders |
| `error` | `#ff3b30` | `#ff4c4c` | `style.css:509, renderer.js:266` | Form validation errors, delete triggers |
| `success` | `#34c759` | `#00e676` | `renderer.js:272` | Completed items, high grade indicators |
| `warning` | `#ff9500` | `#ffeb3b` | `style.css:817, genpass.js:890` | Low grade warnings, medium entropy |
| `glowPrimary` | `rgba(0, 122, 255, 0.30)`| `rgba(0, 255, 255, 0.40)` | `--glow-color-primary` (lines 15, 29) | Neon shadows, active glow halos |
| `glowSecondary` | `rgba(255, 59, 48, 0.30)` | `rgba(148, 0, 211, 0.40)` | `--glow-color-secondary` (lines 16, 30)| Secondary glow highlights |
| `shadowDeep` | `rgba(0, 0, 0, 0.15)` | `rgba(0, 0, 0, 0.50)` | `--shadow-color-deep` (lines 17, 31) | Elevated sheet shadows |
| `shadowLift` | `rgba(0, 0, 0, 0.05)` | `rgba(0, 0, 0, 0.30)` | `--shadow-color-lift` (lines 18, 32) | Interactive button hover/press lift |
| `glassCard` | `rgba(255, 255, 255, 0.80)`| `rgba(26, 26, 38, 0.65)` | `style.css:320, 3957` | Translucent glassmorphism panels |
| `glassBorder` | `rgba(0, 122, 255, 0.15)` | `rgba(255, 255, 255, 0.12)` | `style.css:323, 3960` | Glass border stroke |

### 2.3 Note Color Palette (Google Keep-style)
Derived directly from `public/index.html` (lines 477–486):

```typescript
export interface NoteColorItem {
  id: string;
  name: string;
  hex: string;
}

export const NOTE_COLOR_PALETTE: NoteColorItem[] = [
  { id: 'default',   name: 'Default',   hex: '' },
  { id: 'red',       name: 'Red',       hex: '#5c2b29' },
  { id: 'orange',    name: 'Orange',    hex: '#614a19' },
  { id: 'yellow',    name: 'Yellow',    hex: '#635d19' },
  { id: 'green',     name: 'Green',     hex: '#345920' },
  { id: 'teal',      name: 'Teal',      hex: '#16504b' },
  { id: 'blue',      name: 'Blue',      hex: '#2d555e' },
  { id: 'dark_blue', name: 'Dark Blue', hex: '#1e3a8a' },
  { id: 'purple',    name: 'Purple',    hex: '#42275e' },
  { id: 'pink',      name: 'Pink',      hex: '#5b2245' },
];
```

### 2.4 TypeScript File: `mobile-expo/src/theme/colors.ts`
```typescript
/**
 * SmartStudyHub Mobile Color System
 * Strictly aligned with public/style.css (Light & Dark themes)
 */

export interface ThemeColors {
  // Required Contract from PROJECT.md
  background: string;
  card: string;
  surface: string;
  primary: string;
  secondary: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  success: string;

  // Extended Design Tokens for Glassmorphism & High Fidelity
  surfaceSecondary: string;
  warning: string;
  glowPrimary: string;
  glowSecondary: string;
  shadowDeep: string;
  shadowLift: string;
  glassCard: string;
  glassBorder: string;
}

export const lightColors: ThemeColors = {
  background: '#f4f7f9',
  card: '#ffffff',
  surface: '#ffffff',
  surfaceSecondary: '#f0f2f5',
  primary: '#007aff',      // iOS Blue
  secondary: '#ff3b30',    // iOS Red
  text: '#000000',
  textSecondary: '#6e6e73',
  border: 'rgba(0, 0, 0, 0.10)',
  error: '#ff3b30',
  success: '#34c759',
  warning: '#ff9500',
  glowPrimary: 'rgba(0, 122, 255, 0.30)',
  glowSecondary: 'rgba(255, 59, 48, 0.30)',
  shadowDeep: 'rgba(0, 0, 0, 0.15)',
  shadowLift: 'rgba(0, 0, 0, 0.05)',
  glassCard: 'rgba(255, 255, 255, 0.80)',
  glassBorder: 'rgba(0, 122, 255, 0.15)',
};

export const darkColors: ThemeColors = {
  background: '#121212',
  card: '#1e1e1e',
  surface: '#1e1e1e',
  surfaceSecondary: '#262626',
  primary: '#00ffff',      // Electric Cyan
  secondary: '#9400d3',    // Purple / Violet
  text: '#e0e0e0',
  textSecondary: '#a0a0a0',
  border: 'rgba(255, 255, 255, 0.12)',
  error: '#ff4c4c',
  success: '#00e676',
  warning: '#ffeb3b',
  glowPrimary: 'rgba(0, 255, 255, 0.40)',
  glowSecondary: 'rgba(148, 0, 211, 0.40)',
  shadowDeep: 'rgba(0, 0, 0, 0.50)',
  shadowLift: 'rgba(0, 0, 0, 0.30)',
  glassCard: 'rgba(26, 26, 38, 0.65)',
  glassBorder: 'rgba(255, 255, 255, 0.12)',
};
```

---

## 3. Theme Architecture: Context, Provider & Hooks

### 3.1 Interface Contract
The contract satisfies the exact interface defined in `PROJECT.md:76–82`:
```typescript
export interface ThemeContextType {
  theme: 'light' | 'dark';
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => Promise<void>;
  setTheme: (theme: 'light' | 'dark') => Promise<void>;
  navigationTheme: NavigationTheme;
}
```

### 3.2 React Navigation Integration
To prevent flashing white backgrounds during stack or tab animations, the `ThemeContext` directly derives a React Navigation `Theme` object for `<NavigationContainer theme={navigationTheme}>`:

```typescript
import { Theme as NavigationTheme } from '@react-navigation/native';

export function getNavigationTheme(isDark: boolean, colors: ThemeColors): NavigationTheme {
  return {
    dark: isDark,
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.secondary,
    },
  };
}
```

### 3.3 Status Bar Synchronization
The provider includes `<StatusBar style={isDark ? 'light' : 'dark'} />` from `expo-status-bar`, ensuring the status bar clock, battery, and signal icons adapt automatically to the background color.

### 3.4 TypeScript File: `mobile-expo/src/theme/ThemeContext.tsx`
```typescript
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Theme as NavigationTheme } from '@react-navigation/native';
import { ThemeColors, lightColors, darkColors } from './colors';

export const THEME_STORAGE_KEY = '@smartstudy_theme';

export interface ThemeContextType {
  theme: 'light' | 'dark';
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => Promise<void>;
  setTheme: (theme: 'light' | 'dark') => Promise<void>;
  navigationTheme: NavigationTheme;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<'light' | 'dark'>('dark');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize theme from AsyncStorage or fall back to system color scheme
  useEffect(() => {
    let isMounted = true;

    async function initializeTheme() {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (!isMounted) return;

        if (stored === 'light' || stored === 'dark') {
          setThemeState(stored);
        } else {
          // Default to system scheme or dark
          const systemScheme: ColorSchemeName = Appearance.getColorScheme();
          setThemeState(systemScheme === 'light' ? 'light' : 'dark');
        }
      } catch (err) {
        console.warn('[ThemeContext] Failed reading theme from storage:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initializeTheme();

    // Listen for OS appearance changes if user hasn't set manual preference
    const subscription = Appearance.addChangeListener(async ({ colorScheme }) => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (!stored && colorScheme) {
          setThemeState(colorScheme === 'light' ? 'light' : 'dark');
        }
      } catch (e) {
        // silent catch
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  const setTheme = useCallback(async (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (err) {
      console.warn('[ThemeContext] Failed saving theme to storage:', err);
    }
  }, []);

  const toggleTheme = useCallback(async () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    await setTheme(nextTheme);
  }, [theme, setTheme]);

  const isDark = theme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const navigationTheme: NavigationTheme = useMemo(() => ({
    dark: isDark,
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.secondary,
    },
  }), [isDark, colors]);

  const contextValue = useMemo<ThemeContextType>(() => ({
    theme,
    isDark,
    colors,
    toggleTheme,
    setTheme,
    navigationTheme,
    isLoading,
  }), [theme, isDark, colors, toggleTheme, setTheme, navigationTheme, isLoading]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
```

---

## 4. Google Fonts & Typography System

### 4.1 Fonts Selection & Packages
The web application specifies:
- Primary Display & Body: **Poppins** (`https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap`)
- Numbers, Inputs & Monospace: **Inter** (`Inter_400Regular`, `Inter_600SemiBold`, `Inter_700Bold`) and system monospace.

Required NPM dependencies (to be installed by Worker via `npx expo install`):
- `expo-font`
- `@expo-google-fonts/poppins`
- `@expo-google-fonts/inter`
- `expo-splash-screen`

### 4.2 Required Font Weights
| Font Key | Weight | Name in Expo | Use Case |
|---|---|---|---|
| `Poppins_300Light` | 300 | `Poppins_300Light` | Subtle subtitles, light captions |
| `Poppins_400Regular`| 400 | `Poppins_400Regular`| Standard body text, note content, input text |
| `Poppins_500Medium` | 500 | `Poppins_500Medium` | Tab bar labels, button text, list item headers |
| `Poppins_600SemiBold`| 600| `Poppins_600SemiBold`| Card titles, modal headers, section labels |
| `Poppins_700Bold`   | 700 | `Poppins_700Bold`   | Screen headers, calculator display, main averages |
| `Inter_400Regular`  | 400 | `Inter_400Regular`  | Monospace-friendly numbers, currency rates |
| `Inter_600SemiBold` | 600 | `Inter_600SemiBold` | Calculator history equations, unit badges |
| `Inter_700Bold`     | 700 | `Inter_700Bold`     | Large numeric results, GPA scores, passwords |

### 4.3 Zero-Flicker Splash Screen Strategy
In React Native, rendering custom font names before they are compiled in native memory results in unstyled text flashing or an immediate crash.
To prevent this:
1. `SplashScreen.preventAutoHideAsync()` is invoked at top-level before component mounting.
2. The `useFonts` hook downloads/links the font assets.
3. Once `fontsLoaded || fontError` evaluates to `true` **and** `ThemeContext.isLoading === false`, `SplashScreen.hideAsync()` is invoked.
4. If an error occurs (e.g. offline first launch), the app hides the splash screen and falls back safely to system fonts without crashing.

### 4.4 Android Font Gotcha Warning & Resolution
On Android, specifying both `fontFamily: 'Poppins_700Bold'` and `fontWeight: 'bold'` causes Android's font resolver to search for `"Poppins_700Bold_Bold"`, which does not exist, causing a fallback to system Roboto.
**Rule**: When using a specific `@expo-google-fonts` family name (e.g., `'Poppins_700Bold'`), omit `fontWeight` or set it strictly to `'normal'`. Our `typography.ts` encapsulates this behavior in helper style presets.

### 4.5 Typography Definition: `mobile-expo/src/theme/typography.ts`
```typescript
import { Platform, TextStyle } from 'react-native';

export const FontFamilies = {
  // Poppins
  poppinsLight: 'Poppins_300Light',
  poppinsRegular: 'Poppins_400Regular',
  poppinsMedium: 'Poppins_500Medium',
  poppinsSemiBold: 'Poppins_600SemiBold',
  poppinsBold: 'Poppins_700Bold',

  // Inter
  interRegular: 'Inter_400Regular',
  interMedium: 'Inter_500Medium',
  interSemiBold: 'Inter_600SemiBold',
  interBold: 'Inter_700Bold',

  // Fallbacks
  system: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
  mono: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
};

export const FontSizes = {
  caption: 11,
  footnote: 13,
  body: 15,
  subtitle: 17,
  title: 20,
  header: 24,
  display: 32,
  hero: 44,
};

export const LineHeights = {
  caption: 14,
  footnote: 18,
  body: 22,
  subtitle: 24,
  title: 28,
  header: 32,
  display: 40,
  hero: 52,
};

/**
 * Predefined Typography Presets
 * Note: fontWeight is intentionally omitted or 'normal' when using specific Expo font weights
 * to prevent Android font lookup failures.
 */
export const Typography: Record<string, TextStyle> = {
  hero: {
    fontFamily: FontFamilies.poppinsBold,
    fontSize: FontSizes.hero,
    lineHeight: LineHeights.hero,
  },
  display: {
    fontFamily: FontFamilies.poppinsBold,
    fontSize: FontSizes.display,
    lineHeight: LineHeights.display,
  },
  header: {
    fontFamily: FontFamilies.poppinsSemiBold,
    fontSize: FontSizes.header,
    lineHeight: LineHeights.header,
  },
  title: {
    fontFamily: FontFamilies.poppinsSemiBold,
    fontSize: FontSizes.title,
    lineHeight: LineHeights.title,
  },
  subtitle: {
    fontFamily: FontFamilies.poppinsMedium,
    fontSize: FontSizes.subtitle,
    lineHeight: LineHeights.subtitle,
  },
  body: {
    fontFamily: FontFamilies.poppinsRegular,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
  },
  bodyMedium: {
    fontFamily: FontFamilies.poppinsMedium,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
  },
  footnote: {
    fontFamily: FontFamilies.poppinsRegular,
    fontSize: FontSizes.footnote,
    lineHeight: LineHeights.footnote,
  },
  caption: {
    fontFamily: FontFamilies.poppinsRegular,
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
  },
  // Numeric display styles for Calculator and Converters
  numericDisplay: {
    fontFamily: FontFamilies.interBold,
    fontSize: FontSizes.display,
    lineHeight: LineHeights.display,
  },
  numericResult: {
    fontFamily: FontFamilies.interSemiBold,
    fontSize: FontSizes.title,
    lineHeight: LineHeights.title,
  },
};
```

### 4.6 Font Loader Hook: `mobile-expo/src/theme/useAppFonts.ts`
```typescript
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Poppins_300Light,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

// Keep the splash screen visible while fonts and initial preferences load
SplashScreen.preventAutoHideAsync().catch(() => {
  /* Prevent unhandled rejections if called multiple times */
});

export function useAppFonts(): { isReady: boolean; fontError: Error | null } {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_300Light,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const isReady = Boolean(fontsLoaded || fontError);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync().catch(() => {
        /* Ignore error if splash was already hidden */
      });
    }
  }, [isReady]);

  return { isReady, fontError };
}
```

---

## 5. Persistence Architecture (`@smartstudy_theme`)

### 5.1 Storage Lifecycle
- **Key**: `@smartstudy_theme` (defined in `STORAGE_KEYS.THEME`).
- **Allowed Values**: `'light' | 'dark'`.
- **Initialization State**:
  1. On app boot, `ThemeProvider` executes `AsyncStorage.getItem('@smartstudy_theme')`.
  2. If found $\rightarrow$ validates against `'light' | 'dark'`, sets state.
  3. If null/empty $\rightarrow$ falls back to `Appearance.getColorScheme()` (`'light'` if match, otherwise default `'dark'`).
  4. Once resolved, marks `isLoading = false`.
- **Toggle / Set State**:
  1. Instant state update (optimistic UI update, no sluggish UI delay).
  2. Asynchronous write-through to `AsyncStorage.setItem('@smartstudy_theme', newTheme)`.
  3. Errors caught and logged via `console.warn` without breaking component state.

---

## 6. Integration in `mobile-expo/App.tsx`

```tsx
import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider, useTheme } from './src/theme';
import { useAppFonts } from './src/theme/useAppFonts';
import { RootNavigator } from './src/navigation/RootNavigator';

function AppContent() {
  const { navigationTheme, colors, isLoading } = useTheme();
  const { isReady } = useAppFonts();

  if (!isReady || isLoading) {
    return null; // Splash screen remains native and visible
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NavigationContainer theme={navigationTheme}>
        <RootNavigator />
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

---

## 7. Verification Plan & Test Commands

### 7.1 Static Type Check
Run in `mobile-expo/`:
```bash
npx tsc --noEmit
```
Expected: `0` type errors across all theme files and interfaces.

### 7.2 Unit Test Cases (`mobile-expo/tests/theme.test.ts`)
1. **Light & Dark Palette Equivalence**: Verify that both `lightColors` and `darkColors` contain all keys required by `ThemeColors`.
2. **Color Contrast Verification**:
   - Light: Background `#f4f7f9` vs Text `#000000` (WCAG AAA compliant).
   - Dark: Background `#121212` vs Text `#e0e0e0` (WCAG AAA compliant).
3. **AsyncStorage Persistence**:
   - Verify initial retrieval with null stored value falls back to system/dark.
   - Verify `setTheme('light')` calls `AsyncStorage.setItem('@smartstudy_theme', 'light')`.
   - Verify `toggleTheme()` flips `'dark'` to `'light'` and vice-versa.
4. **Emoji Search**:
   Run grep across `mobile-expo/src/theme/` for emoji characters:
   Expected: 0 matches.

---

## 8. Summary of Files Ready for Worker Implementation

| File Path | Description |
|---|---|
| `mobile-expo/src/theme/colors.ts` | `ThemeColors` interface, `lightColors`, `darkColors`, `NOTE_COLOR_PALETTE` |
| `mobile-expo/src/theme/typography.ts` | `FontFamilies`, `FontSizes`, `LineHeights`, `Typography` style presets |
| `mobile-expo/src/theme/useAppFonts.ts` | Async font loading with zero-flicker `SplashScreen` lifecycle |
| `mobile-expo/src/theme/ThemeContext.tsx`| `ThemeContext`, `ThemeProvider`, `useTheme`, `navigationTheme` mapping |
| `mobile-expo/src/theme/index.ts` | Unified barrel exports for all theming and typography utilities |
