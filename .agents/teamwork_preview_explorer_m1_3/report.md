# SmartStudyHub Mobile Expo Clone: Navigation Architecture & Shell Screens Specification

**Document Version**: 1.0.0  
**Date**: 2026-09-12  
**Author**: Explorer 3 — Navigation & Shell Screens (`teamwork_preview_explorer_m1_3`)  
**Target Directory**: `c:\projects\SmartStudyHub\mobile-expo`  
**Parent Orchestrator ID**: `c39f88c3-260c-4f13-803a-f92820d95e40`  
**Milestone**: Milestone 1 (App Foundation & Navigation)

---

## 1. Executive Summary & Core Directives

This specification establishes the complete navigation architecture, tab bar design, vector iconography, and initial shell screens for the isolated React Native Expo Managed Workflow application (`mobile-expo/`) of **SmartStudyHub**.

### 1.1 Mandatory Rules & Non-Negotiable Directives
1. **STRICT EMOJI BAN**: Absolutely zero Unicode emojis in any part of the UI (labels, headers, icons, dialogs, buttons, toasts, comments, or text strings). All visual iconography is strictly powered by vector icons.
2. **VECTOR ICON LIBRARY**: Exclusively `@expo/vector-icons` using the **Feather** icon set (`Feather.glyphMap`).
3. **NAVIGATION ENGINE**: `@react-navigation/bottom-tabs` and `@react-navigation/native` with complete TypeScript type safety (`RootTabParamList`).
4. **5 PRIMARY TABS**:
   - **Calculator** (`Калькулятор`)
   - **Grades** (`Средний балл`)
   - **Notes** (`Заметки`)
   - **Tools** (`Инструменты`)
   - **Settings** (`Настройки`)
5. **THEME ENGINE INTEGRATION**: All navigation elements, tab bars, headers, and screens dynamically consume `ThemeContext` (`useTheme()`) supporting seamless switching between Light and Dark themes with zero flickering.
6. **FEATURE ISOLATION & EXCLUSIONS**: The Gemini AI assistant (`ai-assistant.js`) is strictly excluded per requirement R2. The Tools hub contains only: Unit Converter, Currency Rates, Translator, and GenPass.
7. **CODE STRUCTURE**: Exact file layout adhering to `mobile-expo/src/navigation` and `mobile-expo/src/modules/<module>`.

---

## 2. React Navigation Bottom Tabs Architecture

### 2.1 Navigation Hierarchy
The root application architecture uses a declarative `NavigationContainer` hosting a `BottomTabNavigator`. The hierarchy is structured as follows:

```
App.tsx
└── SafeAreaProvider (react-native-safe-area-context)
    └── ThemeProvider (src/theme/ThemeContext)
        └── RootNavigator (src/navigation/RootNavigator.tsx)
            └── NavigationContainer (linked to ThemeContext)
                └── BottomTabNavigator (src/navigation/BottomTabNavigator.tsx)
                    ├── Tab "Calculator"  -> CalculatorScreen (src/modules/calculator)
                    ├── Tab "Grades"      -> GradesScreen     (src/modules/grades)
                    ├── Tab "Notes"       -> NotesScreen      (src/modules/notes)
                    ├── Tab "Tools"       -> ToolsScreen      (src/modules/tools)
                    └── Tab "Settings"   -> SettingsScreen   (src/modules/settings)
```

### 2.2 React Navigation Theme Integration
`@react-navigation/native` requires a `Theme` object passed to `NavigationContainer` to prevent white background flashes during tab switches or screen transitions. The custom `ThemeContext` tokens are mapped directly into React Navigation's theme contract:

```typescript
// Mapping ThemeContext colors to React Navigation Theme
const navigationTheme = {
  dark: isDark,
  colors: {
    primary: colors.primaryAccent,
    background: colors.background,
    card: colors.componentBackground,
    text: colors.textColor,
    border: colors.borderColor,
    notification: colors.secondaryAccent,
  },
};
```

### 2.3 Tab Bar Ergonomics & Safe Area Handling
- **Safe Area Insets**: Uses `useSafeAreaInsets()` from `react-native-safe-area-context` to guarantee proper spacing on iOS devices with home indicators (e.g. iPhone 14/15/16) and Android devices with gesture or 3-button navigation bars.
- **Tab Bar Styling**:
  - `backgroundColor`: `colors.componentBackground`
  - `borderTopColor`: `colors.borderColor`
  - `borderTopWidth`: `StyleSheet.hairlineWidth`
  - `height`: Calculated dynamically: `Platform.OS === 'ios' ? 84 : 64 + (insets.bottom > 0 ? insets.bottom : 0)`
  - `paddingBottom`: `insets.bottom > 0 ? insets.bottom : 8`
  - `paddingTop`: `8`
  - `activeTintColor`: `colors.primaryAccent` (`#007AFF` light / `#00FFFF` dark)
  - `inactiveTintColor`: `colors.textColorSecondary` (`#6E6E73` light / `#A0A0A0` dark)
  - `tabBarLabelStyle`: `fontFamily: 'Poppins_600SemiBold'`, `fontSize: 11`, `letterSpacing: 0.2`
  - `tabBarHideOnKeyboard`: `true` (prevents keyboard from pushing up the tab bar on Android)

---

## 3. Feather Vector Icon Mapping

### 3.1 5-Tab Icon Mapping Table
The tab icons strictly use `@expo/vector-icons/Feather`, achieving 100% parity with the existing SmartStudyHub web application (`public/index.html` lines 829-848):

| Tab Route Name | Label (RU / EN) | Feather Icon Name | Size | Visual Rationale & Web Parity |
|---|---|---|---|---|
| `Calculator` | `Калькулятор` / `Calculator` | `'cpu'` | 22px | Matches `<i data-feather="cpu"></i>` from web `index.html:832`. Distinctive, technical symbol for computation. (Alternative: `'hash'` or `'percent'`). |
| `Grades` | `Средний балл` / `Grades` | `'bar-chart-2'` | 22px | Matches `<i data-feather="bar-chart-2"></i>` from web `index.html:836`. Represents grade distributions, statistics, and averages. |
| `Notes` | `Заметки` / `Notes` | `'file-text'` | 22px | Matches `<i data-feather="file-text"></i>` from web `index.html:138`. Universal symbol for study notes and documents. |
| `Tools` | `Инструменты` / `Tools` | `'grid'` | 22px | Matches `<i data-feather="grid"></i>` from web `index.html:840`. Represents the toolbox hub containing utilities. |
| `Settings` | `Настройки` / `Settings` | `'settings'` | 22px | Matches `<i data-feather="settings"></i>` from web `index.html:117`. Universal symbol for preferences and theme options. |

### 3.2 Common UI & Action Icons (Zero Emoji Substitutions)
To ensure the entire application remains 100% emoji-free, the following standard Feather icons are specified for screen actions, status indicators, and headers:

| Purpose / UI Function | Prohibited Emoji | Feather Icon Equivalent | JSX Snippet |
|---|---|---|---|
| Theme Switch (Dark) | 🌙 | `'moon'` | `<Feather name="moon" size={20} color={colors.textColor} />` |
| Theme Switch (Light) | ☀️ | `'sun'` | `<Feather name="sun" size={20} color={colors.textColor} />` |
| Add / Create | ➕ | `'plus'` | `<Feather name="plus" size={20} color={colors.textColor} />` |
| Delete / Trash | 🗑️ | `'trash-2'` | `<Feather name="trash-2" size={18} color={colors.secondaryAccent} />` |
| Search | 🔍 | `'search'` | `<Feather name="search" size={18} color={colors.textColorSecondary} />` |
| Calculation History | 🕒 | `'clock'` | `<Feather name="clock" size={20} color={colors.textColor} />` |
| Unit Converter | 📏 | `'sliders'` | `<Feather name="sliders" size={24} color={colors.primaryAccent} />` |
| Currency Exchange | 💱 / 💵 | `'dollar-sign'` | `<Feather name="dollar-sign" size={24} color={colors.primaryAccent} />` |
| Translator | 🌐 | `'globe'` | `<Feather name="globe" size={24} color={colors.primaryAccent} />` |
| Password / Key | 🔑 | `'key'` | `<Feather name="key" size={24} color={colors.primaryAccent} />` |
| Check / Done | ✅ | `'check'` / `'check-circle'` | `<Feather name="check" size={18} color={colors.primaryAccent} />` |
| Copy to Clipboard | 📋 | `'copy'` | `<Feather name="copy" size={18} color={colors.primaryAccent} />` |
| Swap / Reverse | 🔁 | `'repeat'` | `<Feather name="repeat" size={18} color={colors.primaryAccent} />` |
| Audio / Pronounce | 🔊 | `'volume-2'` | `<Feather name="volume-2" size={18} color={colors.primaryAccent} />` |
| Pin / Favorite | ⭐ / 📌 | `'star'` / `'pin'` | `<Feather name="star" size={18} color={colors.primaryAccent} />` |
| Close / Cancel | ❌ | `'x'` | `<Feather name="x" size={20} color={colors.textColor} />` |
| Info / About | ℹ️ | `'info'` | `<Feather name="info" size={20} color={colors.textColorSecondary} />` |
| Grid View Toggle | 🔲 | `'grid'` | `<Feather name="grid" size={20} color={colors.textColor} />` |
| List View Toggle | 📜 | `'list'` | `<Feather name="list" size={20} color={colors.textColor} />` |

---

## 4. Strict Emoji Elimination Strategy

### 4.1 Zero Emoji Enforcement Rules
1. **Source Code**: No Unicode code points from emoji blocks (`\u{1F300}-\u{1F9FF}`, `\u{2600}-\u{26FF}`, `\u{2700}-\u{27BF}`, etc.) in any `.ts` or `.tsx` files.
2. **Text Strings**: Screen titles, button labels, toasts, dialogs, placeholder texts, and empty-state descriptions must use pure text without decorative emojis (e.g. use `"Заметки не найдены"` instead of `"📝 Заметки не найдены"`).
3. **Icons**: Visual cues must only be provided by vector components (`<Feather ... />`).
4. **Automated CI / Verification Gate**: Every build/check step must execute the emoji scanning script. Any violation causes an immediate test failure with exit code 1.

### 4.2 Automated Emoji Audit Script
```javascript
// scripts/verify-no-emojis.js
const fs = require('fs');
const path = require('path');

const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;

function scanDir(dir) {
  let violations = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
        violations += scanDir(fullPath);
      }
    } else if (/\.(tsx?|jsx?|json|html|css)$/i.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (EMOJI_REGEX.test(line)) {
          console.error(`[EMOJI VIOLATION] ${fullPath}:${idx + 1}: ${line.trim()}`);
          violations++;
        }
      });
    }
  }
  return violations;
}

const total = scanDir(path.resolve(__dirname, '../src'));
if (total > 0) {
  console.error(`FAILED: Found ${total} emoji violations in src/. Emoji ban is strictly enforced!`);
  process.exit(1);
} else {
  console.log('PASSED: 0 emojis found in src/. Strict emoji ban verified.');
}
```

---

## 5. Screen File Layout & Directory Structure

Adhering to `PROJECT.md` and the modular convention:

```
mobile-expo/
├── app.json
├── package.json
├── tsconfig.json
├── App.tsx
├── src/
│   ├── navigation/
│   │   ├── index.ts                      # Barrel export for navigation
│   │   ├── types.ts                      # RootTabParamList, screen prop types, icon map
│   │   ├── RootNavigator.tsx             # NavigationContainer wrapper with Theme sync
│   │   └── BottomTabNavigator.tsx        # Bottom tabs config, styling, icon mapping
│   ├── modules/
│   │   ├── calculator/
│   │   │   ├── index.ts                  # Module barrel export
│   │   │   └── CalculatorScreen.tsx      # Calculator shell screen
│   │   ├── grades/
│   │   │   ├── index.ts                  # Module barrel export
│   │   │   └── GradesScreen.tsx          # Grades shell screen
│   │   ├── notes/
│   │   │   ├── index.ts                  # Module barrel export
│   │   │   └── NotesScreen.tsx           # Notes shell screen
│   │   ├── tools/
│   │   │   ├── index.ts                  # Module barrel export
│   │   │   └── ToolsScreen.tsx           # Tools hub shell screen (Unit, Curr, Trans, GenPass)
│   │   └── settings/
│   │       ├── index.ts                  # Module barrel export
│   │       └── SettingsScreen.tsx        # Settings shell screen
│   ├── components/
│   │   └── common/
│   │       ├── index.ts                  # Reusable components barrel
│   │       ├── AppHeader.tsx             # Standard emoji-free screen header
│   │       ├── AppIcon.tsx               # Typed Feather icon wrapper
│   │       ├── Card.tsx                  # Theme-aware surface card container
│   │       └── Button.tsx                # Theme-aware tactile button
│   └── theme/
│       ├── index.ts                      # Theme barrel export
│       ├── colors.ts                     # Light & Dark color tokens from style.css
│       ├── typography.ts                 # Google Fonts configuration (Poppins & Inter)
│       └── ThemeContext.tsx              # ThemeProvider & useTheme hook
```

---

## 6. Implementation Code Blueprints

Below are complete, production-ready TypeScript specifications for each navigation and screen file.

### 6.1 `src/navigation/types.ts`
```typescript
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';

export type RootTabParamList = {
  Calculator: undefined;
  Grades: undefined;
  Notes: undefined;
  Tools: undefined;
  Settings: undefined;
};

export type RootTabScreenProps<T extends keyof RootTabParamList> = BottomTabScreenProps<
  RootTabParamList,
  T
>;

export type FeatherIconName = keyof typeof Feather.glyphMap;

export const TAB_ICONS: Record<keyof RootTabParamList, FeatherIconName> = {
  Calculator: 'cpu',
  Grades: 'bar-chart-2',
  Notes: 'file-text',
  Tools: 'grid',
  Settings: 'settings',
};

export const TAB_LABELS_RU: Record<keyof RootTabParamList, string> = {
  Calculator: 'Калькулятор',
  Grades: 'Средний балл',
  Notes: 'Заметки',
  Tools: 'Инструменты',
  Settings: 'Настройки',
};

export const TAB_LABELS_EN: Record<keyof RootTabParamList, string> = {
  Calculator: 'Calculator',
  Grades: 'Grades',
  Notes: 'Notes',
  Tools: 'Tools',
  Settings: 'Settings',
};
```

---

### 6.2 `src/navigation/BottomTabNavigator.tsx`
```typescript
import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useTheme } from '../theme';
import { RootTabParamList, TAB_ICONS, TAB_LABELS_RU } from './types';
import { CalculatorScreen } from '../modules/calculator';
import { GradesScreen } from '../modules/grades';
import { NotesScreen } from '../modules/notes';
import { ToolsScreen } from '../modules/tools';
import { SettingsScreen } from '../modules/settings';

const Tab = createBottomTabNavigator<RootTabParamList>();

export const BottomTabNavigator: React.FC = () => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const tabHeight = Platform.OS === 'ios' 
    ? 84 
    : 64 + (insets.bottom > 0 ? insets.bottom : 0);

  return (
    <Tab.Navigator
      initialRouteName="Calculator"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size, focused }) => {
          const iconName = TAB_ICONS[route.name];
          return <Feather name={iconName} size={focused ? 22 : 20} color={color} />;
        },
        tabBarActiveTintColor: colors.primaryAccent,
        tabBarInactiveTintColor: colors.textColorSecondary,
        tabBarStyle: {
          backgroundColor: colors.componentBackground,
          borderTopColor: colors.borderColor,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: tabHeight,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
          elevation: 8,
          shadowColor: isDark ? '#000000' : colors.textColor,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.4 : 0.06,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontFamily: 'Poppins_600SemiBold',
          fontSize: 10.5,
          letterSpacing: 0.2,
          marginTop: 2,
        },
        tabBarHideOnKeyboard: true,
      })}
    >
      <Tab.Screen
        name="Calculator"
        component={CalculatorScreen}
        options={{
          tabBarLabel: TAB_LABELS_RU.Calculator,
        }}
      />
      <Tab.Screen
        name="Grades"
        component={GradesScreen}
        options={{
          tabBarLabel: TAB_LABELS_RU.Grades,
        }}
      />
      <Tab.Screen
        name="Notes"
        component={NotesScreen}
        options={{
          tabBarLabel: TAB_LABELS_RU.Notes,
        }}
      />
      <Tab.Screen
        name="Tools"
        component={ToolsScreen}
        options={{
          tabBarLabel: TAB_LABELS_RU.Tools,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: TAB_LABELS_RU.Settings,
        }}
      />
    </Tab.Navigator>
  );
};
```

---

### 6.3 `src/navigation/RootNavigator.tsx`
```typescript
import React from 'react';
import { NavigationContainer, Theme as NavTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '../theme';
import { BottomTabNavigator } from './BottomTabNavigator';

export const RootNavigator: React.FC = () => {
  const { colors, isDark } = useTheme();

  const navigationTheme: NavTheme = {
    dark: isDark,
    colors: {
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
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.componentBackground} />
      <BottomTabNavigator />
    </NavigationContainer>
  );
};
```

---

### 6.4 `src/components/common/AppHeader.tsx`
Unified, modern, 100% emoji-free screen header with Feather icon buttons:
```typescript
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { FeatherIconName } from '../../navigation/types';

export interface HeaderAction {
  icon: FeatherIconName;
  onPress: () => void;
  accessibilityLabel: string;
}

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  leftAction?: HeaderAction;
  rightAction?: HeaderAction;
  rightActionSecondary?: HeaderAction;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  leftAction,
  rightAction,
  rightActionSecondary,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.componentBackground,
          borderBottomColor: colors.borderColor,
          paddingTop: Math.max(insets.top, 12),
        },
      ]}
    >
      <View style={styles.contentRow}>
        <View style={styles.leftContainer}>
          {leftAction && (
            <TouchableOpacity
              onPress={leftAction.onPress}
              accessibilityLabel={leftAction.accessibilityLabel}
              accessibilityRole="button"
              style={styles.iconButton}
              activeOpacity={0.7}
            >
              <Feather name={leftAction.icon} size={20} color={colors.textColor} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.textColor }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[styles.subtitle, { color: colors.textColorSecondary }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.rightContainer}>
          {rightActionSecondary && (
            <TouchableOpacity
              onPress={rightActionSecondary.onPress}
              accessibilityLabel={rightActionSecondary.accessibilityLabel}
              accessibilityRole="button"
              style={styles.iconButton}
              activeOpacity={0.7}
            >
              <Feather
                name={rightActionSecondary.icon}
                size={20}
                color={colors.textColorSecondary}
              />
            </TouchableOpacity>
          )}
          {rightAction && (
            <TouchableOpacity
              onPress={rightAction.onPress}
              accessibilityLabel={rightAction.accessibilityLabel}
              accessibilityRole="button"
              style={styles.iconButton}
              activeOpacity={0.7}
            >
              <Feather name={rightAction.icon} size={20} color={colors.textColor} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  leftContainer: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 1,
    textAlign: 'center',
  },
  rightContainer: {
    width: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

---

### 6.5 Initial Shell Screens (Milestone 1)

#### Shell 1: `src/modules/calculator/CalculatorScreen.tsx`
```typescript
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { AppHeader } from '../../components/common/AppHeader';

export const CalculatorScreen: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Калькулятор"
        subtitle="Стандартные вычисления и дроби"
        rightAction={{
          icon: 'clock',
          accessibilityLabel: 'История вычислений',
          onPress: () => {},
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.displayCard, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
          <Text style={[styles.historyLabel, { color: colors.textColorSecondary }]}>
            История пуста
          </Text>
          <Text style={[styles.expressionText, { color: colors.textColorSecondary }]}>
            0
          </Text>
          <Text style={[styles.resultText, { color: colors.textColor }]}>
            0
          </Text>
        </View>

        <View style={styles.modeRow}>
          <View style={[styles.modePill, { backgroundColor: colors.primaryAccent }]}>
            <Text style={styles.modePillActiveText}>Стандартный</Text>
          </View>
          <View style={[styles.modePill, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor, borderWidth: 1 }]}>
            <Text style={[styles.modePillText, { color: colors.textColorSecondary }]}>Дроби</Text>
          </View>
          <View style={[styles.modePill, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor, borderWidth: 1 }]}>
            <Text style={[styles.modePillText, { color: colors.textColorSecondary }]}>История</Text>
          </View>
        </View>

        <View style={[styles.previewCard, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
          <View style={styles.badgeRow}>
            <Feather name="cpu" size={24} color={colors.primaryAccent} />
            <Text style={[styles.cardTitle, { color: colors.textColor }]}>
              Модуль вычислений
            </Text>
          </View>
          <Text style={[styles.cardDescription, { color: colors.textColorSecondary }]}>
            Полная поддержка скобок, процентов, истории вычислений и обыкновенных дробей будет активирована в Milestone 2.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  displayCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 120,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  historyLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginBottom: 4,
  },
  expressionText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 18,
    marginBottom: 4,
  },
  resultText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 36,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modePill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modePillActiveText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  modePillText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  previewCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  },
  cardDescription: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
});
```

---

#### Shell 2: `src/modules/grades/GradesScreen.tsx`
```typescript
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { AppHeader } from '../../components/common/AppHeader';

export const GradesScreen: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Средний балл"
        subtitle="5-балльная и буквенная системы"
        rightAction={{
          icon: 'plus',
          accessibilityLabel: 'Добавить предмет',
          onPress: () => {},
        }}
        rightActionSecondary={{
          icon: 'sliders',
          accessibilityLabel: 'Пороги оценок',
          onPress: () => {},
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.summaryCard, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
          <Text style={[styles.summaryLabel, { color: colors.textColorSecondary }]}>
            Общий средний балл (Все предметы)
          </Text>
          <Text style={[styles.summaryGpa, { color: colors.primaryAccent }]}>
            —
          </Text>
          <Text style={[styles.summarySub, { color: colors.textColorSecondary }]}>
            0 предметов сохранено
          </Text>
        </View>

        <View style={styles.periodRow}>
          {['1 Четверть', '2 Четверть', '3 Четверть', '4 Четверть', 'Годовая'].map((p, idx) => (
            <View
              key={p}
              style={[
                styles.periodChip,
                idx === 0
                  ? { backgroundColor: colors.primaryAccent }
                  : { backgroundColor: colors.componentBackground, borderColor: colors.borderColor, borderWidth: 1 },
              ]}
            >
              <Text
                style={[
                  styles.periodText,
                  idx === 0 ? { color: '#FFFFFF' } : { color: colors.textColorSecondary },
                ]}
              >
                {p}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.emptyCard, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
          <Feather name="bar-chart-2" size={40} color={colors.textColorSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.textColor }]}>
            Предметы еще не добавлены
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.textColorSecondary }]}>
            Нажмите кнопку со знаком плюса в верхнем углу, чтобы добавить первый предмет и ввести оценки с весовыми коэффициентами.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  summaryLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  summaryGpa: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 42,
  },
  summarySub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  periodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
  },
  periodText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    textAlign: 'center',
  },
  emptyDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
```

---

#### Shell 3: `src/modules/notes/NotesScreen.tsx`
```typescript
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { AppHeader } from '../../components/common/AppHeader';

export const NotesScreen: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Заметки"
        subtitle="Локальные учебные записи"
        rightAction={{
          icon: 'plus',
          accessibilityLabel: 'Создать заметку',
          onPress: () => {},
        }}
        rightActionSecondary={{
          icon: 'grid',
          accessibilityLabel: 'Переключить вид',
          onPress: () => {},
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.searchBar, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
          <Feather name="search" size={18} color={colors.textColorSecondary} />
          <Text style={[styles.searchPlaceholder, { color: colors.textColorSecondary }]}>
            Поиск заметок по названию или тексту...
          </Text>
        </View>

        <View style={styles.tagStrip}>
          {['Все', 'Учеба', 'Важное', 'Планы', 'Идеи'].map((tag, i) => (
            <View
              key={tag}
              style={[
                styles.tagChip,
                i === 0
                  ? { backgroundColor: colors.primaryAccent }
                  : { backgroundColor: colors.componentBackground, borderColor: colors.borderColor, borderWidth: 1 },
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  i === 0 ? { color: '#FFFFFF' } : { color: colors.textColorSecondary },
                ]}
              >
                {tag}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.emptyCard, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
          <Feather name="file-text" size={40} color={colors.textColorSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.textColor }]}>
            Ваши заметки появятся здесь
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.textColorSecondary }]}>
            Создавайте быстрые заметки, чек-листы с пунктами задач, выбирайте цветовые темы и закрепляйте важные записи наверху списка.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchPlaceholder: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  tagStrip: {
    flexDirection: 'row',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
  },
  tagText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    textAlign: 'center',
  },
  emptyDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
```

---

#### Shell 4: `src/modules/tools/ToolsScreen.tsx`
Strictly excludes AI Assistant per R2:
```typescript
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { AppHeader } from '../../components/common/AppHeader';
import { FeatherIconName } from '../../navigation/types';

interface ToolItem {
  id: string;
  title: string;
  subtitle: string;
  icon: FeatherIconName;
}

const TOOLS_LIST: ToolItem[] = [
  {
    id: 'converter',
    title: 'Конвертер единиц',
    subtitle: 'Длина, масса, температура с live-поиском',
    icon: 'sliders',
  },
  {
    id: 'currency',
    title: 'Курсы валют',
    subtitle: '10 мировых валют, конвертация и оффлайн-кэш',
    icon: 'dollar-sign',
  },
  {
    id: 'translator',
    title: 'Переводчик',
    subtitle: '6 языков, обмен направлений и озвучка TTS',
    icon: 'globe',
  },
  {
    id: 'genpass',
    title: 'Генератор паролей (GenPass)',
    subtitle: 'Длина, спецсимволы, энтропия и быстрое копирование',
    icon: 'key',
  },
];

export const ToolsScreen: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Инструменты"
        subtitle="Учебные и повседневные утилиты"
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {TOOLS_LIST.map((tool) => (
            <TouchableOpacity
              key={tool.id}
              style={[
                styles.card,
                {
                  backgroundColor: colors.componentBackground,
                  borderColor: colors.borderColor,
                },
              ]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={tool.title}
            >
              <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
                <Feather name={tool.icon} size={24} color={colors.primaryAccent} />
              </View>
              <View style={styles.textBlock}>
                <Text style={[styles.cardTitle, { color: colors.textColor }]}>
                  {tool.title}
                </Text>
                <Text style={[styles.cardSubtitle, { color: colors.textColorSecondary }]}>
                  {tool.subtitle}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textColorSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.infoBanner, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
          <Feather name="info" size={18} color={colors.primaryAccent} />
          <Text style={[styles.infoText, { color: colors.textColorSecondary }]}>
            Все инструменты работают в автономном режиме без подключения к интернету.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  grid: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },
  cardSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
});
```

---

#### Shell 5: `src/modules/settings/SettingsScreen.tsx`
Fully interactive Theme Switching and app configuration:
```typescript
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { AppHeader } from '../../components/common/AppHeader';

export const SettingsScreen: React.FC = () => {
  const { colors, theme, toggleTheme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Настройки"
        subtitle="Параметры и внешний вид"
      />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Section: Appearance */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textColorSecondary }]}>
            ВНЕШНИЙ ВИД
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Feather name={theme === 'dark' ? 'moon' : 'sun'} size={20} color={colors.primaryAccent} />
              <View>
                <Text style={[styles.itemTitle, { color: colors.textColor }]}>
                  Тема оформления
                </Text>
                <Text style={[styles.itemSubtitle, { color: colors.textColorSecondary }]}>
                  {theme === 'dark' ? 'Темная тема активна' : 'Светлая тема активна'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={toggleTheme}
              style={[styles.themeToggleButton, { backgroundColor: colors.background, borderColor: colors.borderColor }]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Переключить тему оформления"
            >
              <Feather name={theme === 'dark' ? 'sun' : 'moon'} size={16} color={colors.textColor} />
              <Text style={[styles.toggleButtonText, { color: colors.textColor }]}>
                {theme === 'dark' ? 'Светлая' : 'Темная'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: Grading System */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textColorSecondary }]}>
            СИСТЕМА ОЦЕНОК
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Feather name="award" size={20} color={colors.primaryAccent} />
              <View>
                <Text style={[styles.itemTitle, { color: colors.textColor }]}>
                  Шкала оценок
                </Text>
                <Text style={[styles.itemSubtitle, { color: colors.textColorSecondary }]}>
                  5-балльная система (RU)
                </Text>
              </View>
            </View>
            <Feather name="check" size={18} color={colors.primaryAccent} />
          </View>
        </View>

        {/* Section: Application Info */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textColorSecondary }]}>
            О ПРИЛОЖЕНИИ
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
          <View style={[styles.row, styles.borderBottom, { borderBottomColor: colors.borderColor }]}>
            <View style={styles.rowLeft}>
              <Feather name="info" size={18} color={colors.textColorSecondary} />
              <Text style={[styles.itemTitle, { color: colors.textColor }]}>
                Версия сборки
              </Text>
            </View>
            <Text style={[styles.itemValue, { color: colors.textColorSecondary }]}>
              v1.0.0
            </Text>
          </View>

          <View style={[styles.row, styles.borderBottom, { borderBottomColor: colors.borderColor }]}>
            <View style={styles.rowLeft}>
              <Feather name="shield" size={18} color={colors.textColorSecondary} />
              <Text style={[styles.itemTitle, { color: colors.textColor }]}>
                Идентификатор пакета
              </Text>
            </View>
            <Text style={[styles.itemValue, { color: colors.textColorSecondary }]}>
              com.smartstudyhub.mobile
            </Text>
          </View>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Feather name="check-circle" size={18} color={colors.primaryAccent} />
              <Text style={[styles.itemTitle, { color: colors.textColor }]}>
                Офлайн-режим
              </Text>
            </View>
            <Text style={[styles.itemValue, { color: colors.primaryAccent }]}>
              Активен
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  borderBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  itemTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  itemSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  itemValue: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  themeToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  toggleButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
});
```

---

### 6.6 Barrel Export Files

#### `src/modules/calculator/index.ts`
```typescript
export * from './CalculatorScreen';
```

#### `src/modules/grades/index.ts`
```typescript
export * from './GradesScreen';
```

#### `src/modules/notes/index.ts`
```typescript
export * from './NotesScreen';
```

#### `src/modules/tools/index.ts`
```typescript
export * from './ToolsScreen';
```

#### `src/modules/settings/index.ts`
```typescript
export * from './SettingsScreen';
```

#### `src/navigation/index.ts`
```typescript
export * from './types';
export * from './BottomTabNavigator';
export * from './RootNavigator';
```

---

## 7. Verification & Quality Gates

To verify that the navigation system and shell screens meet all acceptance criteria, the following quality gates must pass:

### Gate 1: Type Safety & Compilation
```powershell
cd c:\projects\SmartStudyHub\mobile-expo
npx tsc --noEmit
```
**Success Condition**: Clean exit with code 0 and 0 errors.

### Gate 2: Metro Bundler Export Verification
```powershell
cd c:\projects\SmartStudyHub\mobile-expo
npx expo export --no-bytecode
```
**Success Condition**: Clean export to `dist/` with 0 missing modules or runtime exceptions.

### Gate 3: Automated Emoji Ban Audit
```powershell
node -e "const fs = require('fs'); const path = require('path'); const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u; function walk(dir) { for (const f of fs.readdirSync(dir)) { const p = path.join(dir, f); if (fs.statSync(p).isDirectory()) { if (f !== 'node_modules' && f !== '.git') walk(p); } else if (/\.(tsx?|jsx?|json|html|css)$/i.test(f)) { const content = fs.readFileSync(p, 'utf8'); if (emojiRegex.test(content)) throw new Error('Emoji detected in ' + p); } } } walk('./src'); console.log('PASS: 0 emojis found across all navigation and screen files.');"
```
**Success Condition**: Prints `PASS: 0 emojis found across all navigation and screen files.`

### Gate 4: Visual & Interactive Inspection
1. Tab Bar switching renders all 5 screens instantly without error or layout shifting.
2. Active tab highlights with `primaryAccent` color (`#007AFF` light / `#00FFFF` dark).
3. Switching theme in `SettingsScreen` updates colors across all tabs and headers in real-time.
4. Safe area insets prevent tab bar clipping on devices with virtual navigation bars or home indicators.

---

## 8. Recommendations for Milestone 1 Worker Agent

1. **Follow the Specified Layout**: Implement `mobile-expo/src/navigation` and `mobile-expo/src/modules/<module>` strictly as documented.
2. **Combine with Explorer 1 & 2**:
   - Consume packages installed by Explorer 1 (`@react-navigation/native`, `@react-navigation/bottom-tabs`, `react-native-screens`, `react-native-safe-area-context`).
   - Consume theme context designed by Explorer 2 (`ThemeContext.tsx`, `colors.ts`, `typography.ts`).
3. **No TODOs / FIXMEs**: Ensure shell screens contain only fully formed, functional components ready for Milestone 2 and 3 feature integration.
4. **Git Commit Rule**: After creating these files, commit with:
   `git add . && git commit -m "feat(navigation): implement 5-tab bottom navigation and theme-aware shell screens"`
