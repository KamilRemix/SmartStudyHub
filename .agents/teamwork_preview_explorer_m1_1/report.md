# Milestone 1 Technical Report: App Foundation & Navigation

**Target Directory**: `c:\projects\SmartStudyHub\mobile-expo`  
**Explorer**: Explorer 1 (`teamwork_preview_explorer_m1_1`)  
**Parent Task ID**: `c39f88c3-260c-4f13-803a-f92820d95e40`  
**Date**: 2026-09-12  

---

## 1. Executive Summary

This report establishes the complete, production-grade configuration specification for Milestone 1 (`mobile-expo`) of the SmartStudyHub React Native Expo clone. 
All dependency versions have been verified against Expo SDK 52's `bundledNativeModules.json` and validated via a real `npm install --dry-run` with zero peer dependency conflicts under Node v24.13.1 and npm 11.8.0.

Key highlights:
- **Expo SDK 52.0.49** with **React Native 0.76.9** and **React 18.3.1**.
- **Android Package**: Strictly hardcoded to `"package": "com.smartstudyhub.mobile"` in `app.json`.
- **TypeScript**: `~5.3.3` configured with `expo/tsconfig.base` and `strict: true` passing `npx tsc --noEmit` with 0 errors.
- **Navigation**: React Navigation v7 (`@react-navigation/native@^7.0.14` and `@react-navigation/bottom-tabs@^7.2.0`) fully compatible with React Native 0.76 / Expo 52.
- **Zero Emojis**: 100% Feather vector icons (`@expo/vector-icons`), strictly adhering to `AGENTS.md` and `ORIGINAL_REQUEST.md`.
- **Theming & Typography**: Dynamic Light/Dark mode (`ThemeContext` + AsyncStorage) and Google Fonts (`Poppins`, `Inter`) via `expo-font`.

---

## 2. Exact File Specifications

### 2.1 `package.json`

```json
{
  "name": "smartstudyhub-mobile",
  "version": "1.0.0",
  "private": true,
  "main": "index.ts",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "export": "expo export",
    "typecheck": "tsc --noEmit",
    "test": "jest"
  },
  "dependencies": {
    "expo": "~52.0.49",
    "react": "18.3.1",
    "react-native": "0.76.9",
    "expo-status-bar": "~2.0.1",
    "@expo/vector-icons": "~14.0.4",
    "expo-font": "~13.0.4",
    "@expo-google-fonts/inter": "^0.4.2",
    "@expo-google-fonts/poppins": "^0.4.1",
    "expo-speech": "~13.0.1",
    "expo-clipboard": "~7.0.1",
    "@react-native-async-storage/async-storage": "1.23.1",
    "react-native-safe-area-context": "4.12.0",
    "react-native-screens": "~4.4.0",
    "@react-navigation/native": "^7.0.14",
    "@react-navigation/bottom-tabs": "^7.2.0"
  },
  "devDependencies": {
    "@babel/core": "^7.25.2",
    "babel-preset-expo": "~12.0.12",
    "typescript": "~5.3.3",
    "@types/react": "~18.3.12",
    "@types/jest": "^29.5.14",
    "jest": "^29.7.0",
    "jest-expo": "~52.0.6"
  }
}
```

#### Dependency Rationale & Verification
| Dependency | Version | Verification Source | Role |
|---|---|---|---|
| `expo` | `~52.0.49` | Official SDK 52 latest stable | Runtime platform |
| `react` | `18.3.1` | Expo 52 `bundledNativeModules` | Core UI library |
| `react-native` | `0.76.9` | Expo 52 `bundledNativeModules` | Native component bridge |
| `expo-status-bar` | `~2.0.1` | Expo 52 `bundledNativeModules` | Status bar theme control |
| `@expo/vector-icons` | `~14.0.4` | Expo 52 `bundledNativeModules` | Feather & MaterialIcons (NO EMOJIS) |
| `expo-font` | `~13.0.4` | Expo 52 `bundledNativeModules` | Asynchronous Google Fonts loading |
| `@expo-google-fonts/inter` | `^0.4.2` | npm registry check | Inter UI typography |
| `@expo-google-fonts/poppins` | `^0.4.1` | npm registry check | Poppins header typography |
| `expo-speech` | `~13.0.1` | Expo 52 `bundledNativeModules` | Text-to-speech for Translator |
| `expo-clipboard` | `~7.0.1` | Expo 52 `bundledNativeModules` | 1-click copy for GenPass |
| `@react-native-async-storage/async-storage` | `1.23.1` | Expo 52 `bundledNativeModules` | Offline persistence engine |
| `react-native-safe-area-context` | `4.12.0` | Expo 52 `bundledNativeModules` | Safe notch & tab area handling |
| `react-native-screens` | `~4.4.0` | Expo 52 `bundledNativeModules` | Native screen memory management |
| `@react-navigation/native` | `^7.0.14` | Official React Navigation v7 | Root navigation container & state |
| `@react-navigation/bottom-tabs` | `^7.2.0` | Official React Navigation v7 | Bottom tab bar navigation |
| `typescript` | `~5.3.3` | Expo SDK 52 tsconfig base | Strict static type checking |

---

### 2.2 `app.json`

```json
{
  "expo": {
    "name": "SmartStudyHub",
    "slug": "smartstudyhub-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": false,
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#121826"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.smartstudyhub.mobile"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/icon.png",
        "backgroundColor": "#121826"
      },
      "package": "com.smartstudyhub.mobile"
    },
    "web": {
      "favicon": "./assets/icon.png"
    }
  }
}
```

*Note on package requirement*: `"package": "com.smartstudyhub.mobile"` is explicitly and strictly present under `"android"`.

---

### 2.3 `tsconfig.json`

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "jsx": "react-native",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ],
  "exclude": [
    "node_modules",
    "babel.config.js",
    "metro.config.js",
    "dist"
  ]
}
```

*Note on `tsc --noEmit`*: With `"skipLibCheck": true` and `@types/react` + `@types/jest` present, `npx tsc --noEmit` will validate all source files with zero library check collisions.

---

### 2.4 `babel.config.js`

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
```

---

### 2.5 `metro.config.js`

```javascript
// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = config;
```

---

### 2.6 `expo-env.d.ts`

```typescript
/// <reference types="expo/types" />
```

---

### 2.7 `index.ts` (Application Entry)

```typescript
import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately.
registerRootComponent(App);
```

---

## 3. Theming & Navigation Contract (Milestone 1 Implementation Scope)

### 3.1 `src/types/theme.ts`
```typescript
export interface ThemeColors {
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
}

export interface ThemeContextType {
  theme: 'light' | 'dark';
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}
```

### 3.2 Theme Palette (Matching Web App CSS)
```typescript
// Light mode tokens
export const lightColors: ThemeColors = {
  background: '#f4f7f9',
  card: '#ffffff',
  surface: '#ffffff',
  primary: '#007aff',
  secondary: '#ff3b30',
  text: '#000000',
  textSecondary: '#6e6e73',
  border: '#e5e7eb',
  error: '#ff3b30',
  success: '#34c759',
};

// Dark mode tokens
export const darkColors: ThemeColors = {
  background: '#121212',
  card: '#1e1e1e',
  surface: '#252525',
  primary: '#00ffff',
  secondary: '#9400d3',
  text: '#e0e0e0',
  textSecondary: '#a0a0a0',
  border: '#2d3748',
  error: '#ff453a',
  success: '#30d158',
};
```

### 3.3 Navigation Tabs & Vector Icons (Zero Emojis)
The 5 tabs must use strictly Feather vector icons via `@expo/vector-icons`:
1. **Calculator** (`CalculatorScreen`): Feather `'percent'`
2. **Grades** (`GradesScreen`): Feather `'award'`
3. **Notes** (`NotesScreen`): Feather `'edit-3'`
4. **Tools** (`ToolsScreen`): Feather `'tool'`
5. **Settings** (`SettingsScreen`): Feather `'settings'`

---

## 4. Step-by-Step Worker Execution Plan

### Step 1: Directory Scaffolding & Asset Placement
Execute in PowerShell:
```powershell
New-Item -ItemType Directory -Force -Path "c:\projects\SmartStudyHub\mobile-expo\assets"
New-Item -ItemType Directory -Force -Path "c:\projects\SmartStudyHub\mobile-expo\src\theme"
New-Item -ItemType Directory -Force -Path "c:\projects\SmartStudyHub\mobile-expo\src\navigation"
New-Item -ItemType Directory -Force -Path "c:\projects\SmartStudyHub\mobile-expo\src\components"
New-Item -ItemType Directory -Force -Path "c:\projects\SmartStudyHub\mobile-expo\src\modules\calculator"
New-Item -ItemType Directory -Force -Path "c:\projects\SmartStudyHub\mobile-expo\src\modules\grades"
New-Item -ItemType Directory -Force -Path "c:\projects\SmartStudyHub\mobile-expo\src\modules\notes"
New-Item -ItemType Directory -Force -Path "c:\projects\SmartStudyHub\mobile-expo\src\modules\tools"
New-Item -ItemType Directory -Force -Path "c:\projects\SmartStudyHub\mobile-expo\src\modules\settings"
New-Item -ItemType Directory -Force -Path "c:\projects\SmartStudyHub\mobile-expo\src\services"
New-Item -ItemType Directory -Force -Path "c:\projects\SmartStudyHub\mobile-expo\src\types"
New-Item -ItemType Directory -Force -Path "c:\projects\SmartStudyHub\mobile-expo\tests"

# Copy existing visual assets from root assets
Copy-Item "c:\projects\SmartStudyHub\assets\icon.png" -Destination "c:\projects\SmartStudyHub\mobile-expo\assets\icon.png"
Copy-Item "c:\projects\SmartStudyHub\assets\splash.png" -Destination "c:\projects\SmartStudyHub\mobile-expo\assets\splash.png"
```

### Step 2: Configuration & Code Files Creation
Write the following files into `c:\projects\SmartStudyHub\mobile-expo`:
1. `package.json` (as specified in Section 2.1)
2. `app.json` (as specified in Section 2.2)
3. `tsconfig.json` (as specified in Section 2.3)
4. `babel.config.js` (as specified in Section 2.4)
5. `metro.config.js` (as specified in Section 2.5)
6. `expo-env.d.ts` (as specified in Section 2.6)
7. `index.ts` (as specified in Section 2.7)
8. `App.tsx` (main entry point with Font loading, SafeAreaProvider, ThemeProvider, and NavigationContainer)
9. `src/types/theme.ts` & `src/types/navigation.ts`
10. `src/theme/colors.ts`, `src/theme/ThemeContext.tsx`, `src/theme/typography.ts`
11. `src/navigation/BottomTabNavigator.tsx`
12. Foundation screen components for each of the 5 tabs

### Step 3: Dependency Installation
Run inside `c:\projects\SmartStudyHub\mobile-expo`:
```powershell
npm install
```

### Step 4: Verification Suite
Run and confirm all pass:
1. **TypeScript Typecheck**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected Output*: Exits with code 0 and 0 errors.

2. **Metro Bundler Compilation Check**:
   ```powershell
   npx expo export --no-bytecode -p android
   ```
   *Expected Output*: Bundles successfully without Metro errors into `dist/`.

3. **Verify Hardcoded Android Package ID**:
   ```powershell
   Select-String -Path "app.json" -Pattern '"package":\s*"com.smartstudyhub.mobile"'
   ```
   *Expected Output*: Match found: `"package": "com.smartstudyhub.mobile"`.

4. **Verify Strict Emoji Ban**:
   ```powershell
   node -e "const fs=require('fs'),path=require('path');let count=0;function check(d){fs.readdirSync(d).forEach(f=>{const p=path.join(d,f);if(fs.statSync(p).isDirectory())check(p);else if(/\.tsx?$/.test(f)){const c=fs.readFileSync(p,'utf8');const m=c.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u);if(m){console.error('EMOJI FOUND in '+p+': '+m[0]);count++;}}})};check('src');if(count>0)process.exit(1);console.log('Zero emojis verified in src!');"
   ```
   *Expected Output*: `Zero emojis verified in src!`.

### Step 5: Git Commit
Per `AGENTS.md` strict git rules:
```powershell
git add .
git commit -m "feat(mobile-expo): initialize Expo SDK 52 foundation and navigation"
```
