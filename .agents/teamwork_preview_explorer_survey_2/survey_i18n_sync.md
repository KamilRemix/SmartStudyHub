# Survey Report: i18n Localization, Grade Thresholds & Cloud Sync Architecture

**Date**: 2026-09-14  
**Author**: Survey Explorer 2 (Localization & Cloud Sync Explorer)  
**Target Repository**: `c:\projects\SmartStudyHub`  
**Primary Modules**: `public/translations.js`, `mobile-expo/src/`, `mobile-expo/src/modules/grades/`, `mobile-expo/src/services/`  
**Firebase Project**: `studio-9933447149-80d6a` (Database URL: `https://studio-9933447149-80d6a-default-rtdb.firebaseio.com`)

---

## 1. Executive Summary

This survey provides an authoritative audit of the multi-language translation system (`public/translations.js`), the state of localization in the `mobile-expo` React Native application, the grade calculation and threshold mechanisms in `GradesScreen.tsx`, and the two-way cloud synchronization architecture for Firebase Realtime Database.

### Key Discoveries & Status:
1. **Translations Dictionary (`public/translations.js`)**:
   - Contains **234 unique translation keys** across 11 languages (`ru`, `en`, `uk`, `be`, `kk`, `es`, `de`, `fr`, `zh`, `tr`, and `ar`).
   - The dictionary is **100% free of UI emojis** (verified by unicode regex audit), strictly adhering to project guidelines.
   - 3 keys were added to RU/EN during web improvements but were missing in other languages: `targetGrade` (missing in 9 languages), `offlineModeDesc` (missing in 9 languages), and `onlineRestored` (missing in 9 languages). Complete localized strings for all 10 target languages have been synthesized in this report.
2. **Current Localization in `mobile-expo`**:
   - Localization is currently **completely absent** in `mobile-expo`. All screens, tab navigators, headers, and modals hardcode Russian strings.
   - A modern, typed `I18nProvider` + `useI18n()` hook with `@react-native-async-storage/async-storage` persistence (`@smartstudy_language`) and reactive instant screen updates is designed in detail below.
3. **Grade Calculations & Custom Thresholds (`GradesScreen.tsx`)**:
   - The grade screen is located at `mobile-expo/src/modules/grades/GradesScreen.tsx` with subcomponents (`ThresholdsModal.tsx`, `StrategyEngineCard.tsx`, `SubjectDetailCard.tsx`, `utils/gradeMath.ts`, `utils/gradesStorage.ts`).
   - **Critical bugs identified**: In `gradeMath.ts`, `getFinalGrade()` and `solveTargetStrategy()` completely ignore user-configured thresholds for `us-letter` (hardcoded to 3.5, 2.5, 1.5). In addition, `INITIAL_GRADES_DATA` stored percentages (`90, 80, 70, 60`) while `ThresholdsModal` edited GPA floats (`3.50, 2.50, 1.50`).
   - We designed support for custom thresholds (e.g., 2.70, 3.65, 4.60 in 5-point; 60%, 75%, 90% in percentage/letter; and Ukrainian 12-point), complete with input validation and persistence.
4. **Firebase Realtime Database Two-Way Sync**:
   - The mobile app already configures Firebase Modular SDK v12 (`services/firebase.ts`) connecting to `studio-9933447149-80d6a`.
   - Web app (`public/renderer.js`, `public/notes.js`, `public/genpass.js`) syncs to `/users/{uid}`.
   - We designed a unified schema covering:
     - Calculator history (capped strictly at 10 items).
     - Grades and subjects.
     - Notes (with photo metadata and reminders).
     - Password vault entries (service, login, password, favorites).
     - User settings (language, theme, custom grade thresholds).
     - Two-way sync triggers: on auth state change (login), on network reconnection, on local edit, and on logout.

---

## 2. Audit of `public/translations.js`

### 2.1 File Characteristics
- **Path**: `c:\projects\SmartStudyHub\public\translations.js`
- **Size**: 167,746 bytes (2,584 lines).
- **Export format**: Universal (attaches to `window.translations` in browsers and `module.exports = translations` in CommonJS/Node environments).
- **Emoji Audit**: 0 emojis found in the entire dictionary.

### 2.2 Language Matrix & Key Count
| Code | Language Name (Native) | Key Count | Status |
| :--- | :--- | :--- | :--- |
| `ru` | Русский | 234 | Complete baseline |
| `en` | English | 233 | Missing: `targetGrade` |
| `be` | Беларуская | 232 | Missing: `offlineModeDesc`, `onlineRestored` |
| `uk` | Українська | 231 | Missing: `targetGrade`, `offlineModeDesc`, `onlineRestored` |
| `kk` | Қазақша | 231 | Missing: `targetGrade`, `offlineModeDesc`, `onlineRestored` |
| `es` | Español | 231 | Missing: `targetGrade`, `offlineModeDesc`, `onlineRestored` |
| `de` | Deutsch | 231 | Missing: `targetGrade`, `offlineModeDesc`, `onlineRestored` |
| `fr` | Français | 231 | Missing: `targetGrade`, `offlineModeDesc`, `onlineRestored` |
| `tr` | Türkçe | 231 | Missing: `targetGrade`, `offlineModeDesc`, `onlineRestored` |
| `zh` | 中文 | 231 | Missing: `targetGrade`, `offlineModeDesc`, `onlineRestored` |
| `ar` | العربية | 231 | Optional 11th language in file |

### 2.3 Key Namespaces & Functional Groups

The 234 keys span the following distinct domains:

1. **Navigation & Core Layout**:
   - `calculator`, `fractionCalculator`, `grades`, `settings`, `tools`, `notes`, `back`, `theme`, `language`, `light`, `dark`, `save`, `clear`, `refresh`, `result`.
2. **Grading & Academic Strategy**:
   - Systems: `gradingSystem`, `5Point`, `letterGrades`, `averageScore`, `gpa`.
   - Tabs: `tabGrades`, `tabStrategy`, `tabThresholds`, `subjects`, `addSubject`, `subjectName`, `create`, `whatIf`, `apply`, `cancel`, `simulateGrade`, `noChange`, `deleteSubject`, `deleteGradeConfirm`.
   - Thresholds: `thresholdsTitle`, `thresholdsDesc`, `thresholdsTitleUs`, `thresholdsDescUs`, `thresholdLabel5`, `thresholdLabel4`, `thresholdLabel3`, `thresholdLabelA`, `thresholdLabelB`, `thresholdLabelC`, `thresholdLabelD`, `andAbove`, `saveThresholds`, `thresholdsNote`, `thresholdsSaved`.
   - Goal & Remediation: `chooseTarget`, `wantToGet`, `targetGrade`, `grade5`, `grade4`, `grade3`, `gradeA`, `gradeB`, `gradeC`, `gradeD`, `goalAchieved`, `goalAchievedUs`, `enterGradesTab`, `enterGradesTabUs`, `needFives`, `needAs`, `possibleVariants`, `variantMixed`, `variantFix`.
3. **Password Vault & Generator (GenPass)**:
   - `genpassTabGen`, `genpassTabCheck`, `genpassTabVault`, `genpassLength`, `genpassUpper`, `genpassLower`, `genpassNumbers`, `genpassSymbols`, `genpassGenerate`, `genpassCheckPlaceholder`, `genpassWaiting`, `genpassImprove`, `genpassSavedTitle`, `genpassAddNew`, `genpassAddLabelPlaceholder`, `genpassAddPwdPlaceholder`, `genpassAddBtn`, `genpassSyncStatus`.
4. **Notes**:
   - `notes`, `noteTitlePlaceholder`, `takeANote`, `noteClose`, `notePinned`, `noteOthers`, `noteEmptyState`, `noteDeleteConfirm`, `noteSearch`, `extNotesTitle`, `extNotesDesc`.
5. **Tools & Converters**:
   - `translator`, `unitConverter`, `converterSub`, `valuePlaceholder`, `currencyRates`, `currencyOffline`, `length`, `mass`, `temperature`, `currencyConverterTitle`, `currencyConverterSub`, `popularRates`.
6. **Network & Connectivity**:
   - `offline`, `offlineModeDesc`, `onlineRestored`.
7. **Authentication & User Profile**:
   - `verifiedAccess`, `signOut`, `signInWithGoogle`, `signInWithGithub`, `signInWithVk`, `linkGithubToProfile`, `linkGoogleToProfile`, `linkVkToProfile`, `unlinkProvider`, `authTabsSignIn`, `authTabsSignUp`, `authEmailLabel`, `authEmailPlaceholder`, `authPasswordLabel`, `authPasswordPlaceholder`, `authConfirmPasswordLabel`, `authConfirmPasswordPlaceholder`, `authSignInBtn`, `authSignUpBtn`, `authForgotPasswordLink`, `authResetPasswordTitle`, `authResetPasswordPrompt`, `authResetPasswordBtn`, `authOrContinueWith`, `authWelcomeUser`, `authSignUpSuccess`, `authResetEmailSent`, `providerEmail`, `privacyPolicy`, `privacyNotice`, `viewPrivacyPolicy`, `accountUnlinkSuccess`, `accountUnlinkNeedOne`, `accountsLinkedIntro`, `accountsBothLinked`, `accountLinkModalTitle`, `accountLinkMergeQuestion`, `accountLinkMergeYes`, `accountLinkMergeNo`, `accountLinkSuccess`, `accountLinkError`, `accountLinkElectronUnsupported`, `accountLinkProviderAlreadyLinked`, `providerGoogle`, `providerGithub`, `providerVk`, `authFlowNow`, `authFlowConnect`, `accountConflictModalTitle`, `accountConflictMessage`, `accountConflictSwitch`, `accountConflictStay`, `accountErrorModalTitle`, `accountErrorOk`.
   - Error messages: `authErrorInvalidEmail`, `authErrorUserDisabled`, `authErrorUserNotFound`, `authErrorWrongPassword`, `authErrorInvalidCredential`, `authErrorEmailAlreadyInUse`, `authErrorWeakPassword`, `authErrorOperationNotAllowed`, `authErrorTooManyRequests`, `authErrorNetworkFailed`, `authErrorPasswordMismatch`, `authErrorEmptyFields`, `authErrorGeneric`.

### 2.4 Gap Resolution: Missing Translations for the 10 Target Languages

To ensure 100% key parity across all 10 languages, the missing keys must be filled as follows:

| Language | `targetGrade` | `offlineModeDesc` | `onlineRestored` |
| :--- | :--- | :--- | :--- |
| **ru** | Желаемая оценка *(present)* | Офлайн-режим • Данные сохранены локально *(present)* | Подключение восстановлено • Данные синхронизированы *(present)* |
| **en** | Target Grade | Offline mode • Data saved locally *(present)* | Connection restored • Data synced *(present)* |
| **uk** | Бажана оцінка | Офлайн-режим • Дані збережено локально | З'єднання відновлено • Дані синхронізовано |
| **be** | Жаданая адзнака *(present)* | Афлайн-рэжым • Даныя захаваны лакальна | Злучэнне адноўлена • Даныя сінхранізаваны |
| **kk** | Қажетті баға | Офлайн режимі • Деректер жергілікті сақталды | Байланыс қалпына келтірілді • Деректер синхрондалды |
| **es** | Calificación deseada | Modo sin conexión • Datos guardados localmente | Conexión restablecida • Datos sincronizados |
| **de** | Wunschnote | Offline-Modus • Daten lokal gespeichert | Verbindung wiederhergestellt • Daten synchronisiert |
| **fr** | Note visée | Mode hors ligne • Données enregistrées localement | Connexion rétablie • Données synchronisées |
| **tr** | Hedef Not | Çevrimdışı mod • Veriler yerel olarak kaydedildi | Bağlantı kuruldu • Veriler eşitlendi |
| **zh** | 目标成绩 | 离线模式 • 数据已保存至本地 | 网络已恢复 • 数据已同步 |

---

## 3. Localization in `mobile-expo` & Porting Plan

### 3.1 Current State Analysis
1. `mobile-expo/src/navigation/BottomTabNavigator.tsx`: Hardcodes Russian strings via `TAB_LABELS_RU` (`Калькулятор`, `Средний балл`, `Заметки`, `Инструменты`, `Настройки`).
2. `mobile-expo/src/modules/settings/SettingsScreen.tsx`: All section titles (`АККАУНТ`, `ВНЕШНИЙ ВИД`, `СИСТЕМА ОЦЕНОК`, `О ПРИЛОЖЕНИИ`) and button labels are hardcoded in Russian. There is **no language picker**.
3. `mobile-expo/src/modules/grades/GradesScreen.tsx`: Tab titles, subtitles, headers, and modal text are hardcoded Russian.
4. `mobile-expo/src/modules/calculator/CalculatorScreen.tsx`: Header and tab titles (`Стандартный`, `Дроби`, `История`) are hardcoded Russian.
5. `mobile-expo/src/modules/notes/NotesScreen.tsx`: Placeholders, headers, and button labels are hardcoded Russian.
6. `mobile-expo/src/modules/tools/screens/GenPassScreen.tsx`: Analysis labels, strength levels, crack times, and checklists are hardcoded Russian.

### 3.2 Target Architecture: `mobile-expo/src/i18n/`

```
mobile-expo/src/i18n/
├── translations.ts    # Complete typed dictionary for 10 languages + supplemented keys
├── I18nContext.tsx    # React Context & Provider with AsyncStorage caching
├── useI18n.ts         # Hook returning { language, setLanguage, t, supportedLanguages }
└── index.ts           # Barrel export
```

#### A. `translations.ts` Type Definitions & Export
```typescript
export type SupportedLanguage =
  | 'ru'
  | 'en'
  | 'uk'
  | 'be'
  | 'kk'
  | 'es'
  | 'de'
  | 'fr'
  | 'tr'
  | 'zh';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;        // Native name (e.g. "Русский", "English", "Қазақша")
  englishName: string; // "Russian", "English", "Kazakh"
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'ru', name: 'Русский', englishName: 'Russian' },
  { code: 'en', name: 'English', englishName: 'English' },
  { code: 'uk', name: 'Українська', englishName: 'Ukrainian' },
  { code: 'be', name: 'Беларуская', englishName: 'Belarusian' },
  { code: 'kk', name: 'Қазақша', englishName: 'Kazakh' },
  { code: 'es', name: 'Español', englishName: 'Spanish' },
  { code: 'de', name: 'Deutsch', englishName: 'German' },
  { code: 'fr', name: 'Français', englishName: 'French' },
  { code: 'tr', name: 'Türkçe', englishName: 'Turkish' },
  { code: 'zh', name: '中文', englishName: 'Chinese' },
];

export const translations: Record<SupportedLanguage, Record<string, string>> = {
  // Ported verbatim from public/translations.js + supplemented 3 missing keys
};
```

#### B. `I18nContext.tsx` Implementation Blueprint
```typescript
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupportedLanguage, SUPPORTED_LANGUAGES, translations } from './translations';

export const I18N_STORAGE_KEY = '@smartstudy_language';

export interface I18nContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  supportedLanguages: typeof SUPPORTED_LANGUAGES;
  isLoading: boolean;
}

export const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>('ru');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadStoredLanguage() {
      try {
        const stored = await AsyncStorage.getItem(I18N_STORAGE_KEY);
        if (!isMounted) return;
        if (stored && stored in translations) {
          setLanguageState(stored as SupportedLanguage);
        } else {
          // Default fallback to ru (or detect via system locale)
          setLanguageState('ru');
        }
      } catch (err) {
        console.warn('[I18n] Failed to load stored language:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadStoredLanguage();
    return () => { isMounted = false; };
  }, []);

  const setLanguage = useCallback(async (newLang: SupportedLanguage) => {
    if (!translations[newLang]) return;
    setLanguageState(newLang);
    try {
      await AsyncStorage.setItem(I18N_STORAGE_KEY, newLang);
    } catch (err) {
      console.warn('[I18n] Failed to persist language:', err);
    }
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const dict = translations[language] || translations['ru'];
    let text = dict[key] || translations['ru']?.[key] || translations['en']?.[key] || key;
    if (params) {
      Object.keys(params).forEach((paramKey) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(params[paramKey]));
      });
    }
    return text;
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t,
    supportedLanguages: SUPPORTED_LANGUAGES,
    isLoading,
  }), [language, setLanguage, t, isLoading]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};
```

#### C. Reactivity & App Tree Integration
In `mobile-expo/App.tsx`:
```tsx
export default function App() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
```
Because `BottomTabNavigator` and all child screens consume `useI18n()`, any call to `setLanguage(lang)` will immediately trigger a re-render of the entire navigation stack and all active screens without requiring an app reload!

### 3.3 Screen-by-Screen Porting Strategy

1. **BottomTabNavigator (`navigation/BottomTabNavigator.tsx`)**:
   - Replace `TAB_LABELS_RU.Calculator` with `t('calculator')`.
   - Replace `TAB_LABELS_RU.Grades` with `t('grades')` (or `t('averageScore')`).
   - Replace `TAB_LABELS_RU.Notes` with `t('notes')`.
   - Replace `TAB_LABELS_RU.Tools` with `t('tools')`.
   - Replace `TAB_LABELS_RU.Settings` with `t('settings')`.
2. **SettingsScreen (`modules/settings/SettingsScreen.tsx`)**:
   - Add new section: **ЯЗЫК ИНТЕРФЕЙСА (LANGUAGE)**.
   - Render horizontal scroll/chip selector for the 10 supported languages showing native language names (e.g. `Русский`, `English`, `Українська`, `Қазақша`...).
   - The active language chip displays an accent highlight and checkmark.
   - Tapping switches language instantly via `setLanguage(lang)`.
   - Clean up old obsolete items per Requirement R10 (remove static offline placeholder, package ID card, duplicate grade scale tile).
3. **GradesScreen (`modules/grades/GradesScreen.tsx`)**:
   - Header title: `t('grades')` or `t('averageScore')`.
   - Subtitle: `t('5Point')` / `t('letterGrades')`.
   - Period titles: `1 Четверть`, `2 Четверть` / `1 Семестр`, `2 Семестр`, `Годовая` translated.
   - Quick Calc label: `t('whatIf')` or `t('simulateGrade')`.
4. **CalculatorScreen & FractionCalculatorView**:
   - Standard tab: `t('calculator')`.
   - Fractions tab: `t('fractionCalculator')`.
   - History button: `t('clear')`, `t('result')`.
5. **NotesScreen & Modals**:
   - Search placeholder: `t('noteSearch')`.
   - Note creator title/placeholder: `t('takeANote')`, `t('noteTitlePlaceholder')`.
   - Empty state: `t('noteEmptyState')`.
   - Pinned / Others: `t('notePinned')`, `t('noteOthers')`.
6. **GenPassScreen**:
   - Tabs: `t('genpassTabGen')`, `t('genpassTabCheck')`, `t('genpassTabVault')`.
   - Options: `t('genpassLength')`, `t('genpassUpper')`, `t('genpassLower')`, `t('genpassNumbers')`, `t('genpassSymbols')`.
   - Buttons: `t('genpassGenerate')`, `t('save')`, `t('copy')`.
   - Checklists: `t('checkLength')`, `t('checkUpperLower')`, `t('checkNumSym')`, `t('checkPatterns')`, `t('checkPwned')`.

---

## 4. GradeAverageScreen, Calculations & Custom Thresholds

### 4.1 File Inventory & Architecture
- **Main Screen**: `mobile-expo/src/modules/grades/GradesScreen.tsx`
- **Subcomponents**:
  - `PeriodSelectorBar.tsx`: Quarter/Semester pills.
  - `SubjectDetailCard.tsx`: Subject grade pills, average, target grade, deletion.
  - `GradeInputKeypad.tsx`: Grade input (1-5 or A-F) with weight toggles (1.0, 1.5, 2.0, 3.0).
  - `StrategyEngineCard.tsx`: Displays needed top grades, mixed strategies, and remediation.
  - `AnnualTableCard.tsx`: Annual summary matrix across all 4 quarters or 2 semesters.
  - `WhatIfModal.tsx`: Real-time grade simulation.
  - `ThresholdsModal.tsx`: Settings modal for grading systems and custom threshold inputs.
- **Math Utilities**: `mobile-expo/src/modules/grades/utils/gradeMath.ts`
- **Storage Utility**: `mobile-expo/src/modules/grades/utils/gradesStorage.ts`

### 4.2 Calculation Engine Audit

1. **Weighted Average Formula**:
   $$\bar{x} = \frac{\sum_{i=1}^n (v_i \cdot w_i)}{\sum_{i=1}^n w_i}$$
   Where $v_i$ is grade numeric value (e.g. 5, 4, 3, 2, 1) and $w_i$ is grade weight (1.0 to 3.0).
2. **Annual Average**:
   $$\bar{x}_{\text{annual}} = \frac{\sum_{p \in P_{\text{active}}} \bar{x}_p}{|P_{\text{active}}|}$$
   Averages the period averages across all active quarters/semesters where grades exist.
3. **Strategy Engine (Target Grade Solver)**:
   Closed-form algebraic formula to reach target threshold $T$ with maximum grade $G_{\max}$:
   $$k = \left\lceil \frac{T \cdot W - S}{G_{\max} - T} \right\rceil$$
   Where $W = \sum w_i$ is current total weight, $S = \sum (v_i \cdot w_i)$ is current sum.

### 4.3 Defects Identified in Current Mobile Code
1. **Hardcoded GPA thresholds in `getFinalGrade()`**:
   ```typescript
   // In gradeMath.ts line 137:
   } else {
     if (average >= 3.5) return { finalGrade: 'A', color: '#34c759' };
     if (average >= 2.5) return { finalGrade: 'B', color: '#007aff' };
     if (average >= 1.5) return { finalGrade: 'C', color: '#ff9500' };
     if (average >= 0.5) return { finalGrade: 'D', color: '#ff9500' };
     return { finalGrade: 'F', color: '#ff3b30' };
   }
   ```
   *Defect*: The `thresholds` parameter passed into `getFinalGrade` is completely ignored for `us-letter`! Even if the user customized thresholds in `ThresholdsModal`, `getFinalGrade` returns hardcoded values.
2. **Hardcoded GPA thresholds in `solveTargetStrategy()`**:
   ```typescript
   // In gradeMath.ts line 223:
   const letter = String(targetValue).toUpperCase();
   if (letter === 'A') targetThreshold = 3.5;
   else if (letter === 'B') targetThreshold = 2.5;
   else targetThreshold = 1.5;
   ```
   *Defect*: Ignores `thresholds['us-letter']`.
3. **Data Type Mismatch in `INITIAL_GRADES_DATA` vs `ThresholdsModal`**:
   - `INITIAL_GRADES_DATA` (`gradesStorage.ts` line 13) sets:
     `'us-letter': { A: 90, B: 80, C: 70, D: 60, F: 0 }` (Percentages).
   - But `ThresholdsModal.tsx` expects GPA points:
     `pA = thresholds['us-letter']?.A ?? 3.5`.
   - When the user opens the modal, `pA` is `90`, which triggers validation errors because GPA cannot exceed 4.0!

### 4.4 Custom Thresholds Design Specification

#### A. Grading Systems Supported:
1. **5-Point System (RU / CIS)**:
   - Grades: `5`, `4`, `3`, `2`.
   - Editable thresholds:
     - 5 (Отлично): from `4.50` (user can change to e.g. `4.60`, `4.65`, `4.70`).
     - 4 (Хорошо): from `3.50` (user can change to e.g. `3.60`, `3.70`, `3.75`).
     - 3 (Удовлетворительно): from `2.50` (user can change to e.g. `2.60`, `2.70`).
     - 2 (Неудовлетворительно): below threshold of 3.
   - Validation: $1.00 \le T_3 < T_4 < T_5 \le 5.00$.
2. **12-Point System (UA / CIS / Moldovan)**:
   - Grades: `12` down to `1`.
   - Tiers: High (10-12, from 9.50), Sufficient (7-9, from 6.50), Average (4-6, from 3.50), Initial (1-3, below 3.50).
3. **US Letter / Percentage System (US GPA 4.0 & %)**:
   - Grades: `A` (4.0 / $\ge 90\%$), `B` (3.0 / $\ge 80\%$), `C` (2.0 / $\ge 70\%$), `D` (1.0 / $\ge 60\%$), `F` (0.0 / $< 60\%$).
   - Dual mode support:
     - GPA Points mode: $0.0 \le T_D < T_C < T_B < T_A \le 4.00$ (e.g. 3.50, 2.50, 1.50, 0.50).
     - Percentage mode: $0\% \le T_D < T_C < T_B < T_A \le 100\%$ (e.g. 90%, 80%, 70%, 60%).

#### B. Storage Schema (AsyncStorage `@smartstudy_grades_data`)
```typescript
export interface ThresholdSettings {
  '5-point': {
    5: number; // e.g. 4.65
    4: number; // e.g. 3.65
    3: number; // e.g. 2.70
  };
  'us-letter': {
    A: number; // e.g. 3.50 or 90
    B: number; // e.g. 2.50 or 80
    C: number; // e.g. 1.50 or 70
    D: number; // e.g. 0.50 or 60
    F: number; // 0
  };
  '12-point'?: {
    high: number;       // e.g. 9.50
    sufficient: number; // e.g. 6.50
    average: number;    // e.g. 3.50
  };
}
```

#### C. Thresholds Sync Flow:
1. When user saves custom thresholds in `ThresholdsModal`:
   - Validates monotonic order.
   - Updates local state in `GradesScreen`.
   - Saves to AsyncStorage `@smartstudy_grades_data` with `updatedAt: Date.now()`.
   - If user is authenticated: immediately sets `users/${uid}/settings/thresholds` and `users/${uid}/updatedAt` in Firebase Realtime Database.
   - Recalculates `getFinalGrade()` and `StrategyEngineCard` immediately.

---

## 5. Firebase Realtime Database Setup & Two-Way Sync

### 5.1 Firebase Project Configuration
- **Project ID**: `studio-9933447149-80d6a` (Strict rule: NO new projects).
- **RTDB URL**: `https://studio-9933447149-80d6a-default-rtdb.firebaseio.com`
- **Client SDK**: Modular Firebase JS SDK v12.19.0 (installed and initialized in `mobile-expo/src/services/firebase.ts`).
- **Auth Provider**: Email/Password, Google OAuth credential, GitHub OAuth credential.

### 5.2 Realtime Database Data Schema Blueprint

To achieve 100% interoperability with the existing web app (`public/renderer.js`, `public/notes.js`, `public/genpass.js`) while supporting all mobile requirements, the RTDB root structure for each user must follow:

```json
{
  "users": {
    "<uid>": {
      "profile": {
        "displayName": "User Name",
        "email": "user@example.com",
        "photoURL": null,
        "lastLoginAt": 1726310000000
      },
      "settings": {
        "language": "ru",
        "theme": "dark",
        "gradingSystem": "5-point",
        "periodMode": "quarters",
        "activePeriod": "q1",
        "thresholds": {
          "5-point": { "5": 4.50, "4": 3.50, "3": 2.50 },
          "us-letter": { "A": 90, "B": 80, "C": 70, "D": 60, "F": 0 }
        },
        "updatedAt": 1726310000000
      },
      "subjects": {
        "subj_1": {
          "id": "subj_1",
          "name": "Алгебра",
          "targetGrade": 5,
          "grades": [
            {
              "id": "g_1",
              "value": 5,
              "weight": 1.0,
              "period": "q1",
              "date": 1726300000000
            }
          ]
        }
      },
      "notes": [
        {
          "id": "note_1",
          "title": "Конспект по физике",
          "content": "Основные формулы механики...",
          "tags": ["Учеба"],
          "color": "#16504b",
          "pinned": true,
          "imageUri": "file:///...",
          "reminderTimestamp": 1726400000000,
          "createdAt": 1726200000000,
          "updatedAt": 1726300000000
        }
      ],
      "passwords": [
        {
          "id": "pwd_1",
          "label": "GitHub",
          "username": "developer@study.com",
          "password": "EncryptedOrPlainPassword123!",
          "favorite": true,
          "createdAt": 1726200000000,
          "updatedAt": 1726300000000
        }
      ],
      "calc_history": [
        {
          "id": "calc_1",
          "expression": "25 * (4 + 6)",
          "result": "250",
          "timestamp": 1726305000000,
          "type": "standard"
        }
      ],
      "updatedAt": 1726310000000
    }
  }
}
```

### 5.3 Calculator History Capping
- **Rule**: Max **10 entries** (strictly limited to prevent excessive memory usage and fast serialization).
- **Implementation**:
  - In `mobile-expo/src/modules/calculator/utils/calcHistoryStorage.ts`:
    Change `MAX_HISTORY_ITEMS = 50;` to `MAX_HISTORY_ITEMS = 10;`.
  - When a new calculation is saved:
    `const updated = [newEntry, ...current].slice(0, 10);`
  - In RTDB: store the array directly at `users/${uid}/calc_history`.

### 5.4 Two-Way Sync Triggers & Conflict Resolution

#### Sync Triggers:
1. **Trigger 1: On User Login / Auth Change**:
   - Hook into `onAuthStateChanged` in `AuthContext`.
   - Upon authentication:
     - Immediately fetch snapshot from `users/${user.uid}`.
     - Compare cloud timestamp with local timestamp for each domain.
     - If local is default or older than cloud, hydrate local AsyncStorage and notify components.
     - If local has uncommitted offline edits (`pending_sync` flags), push local data to cloud.
     - Attach real-time listeners (`onValue`) to receive cross-device updates in real time.
2. **Trigger 2: On Network Reconnection**:
   - Listen for connection state transition from `offline` to `online`.
   - Check pending sync queue in AsyncStorage:
     - `@smartstudy_pending_grades`
     - `@smartstudy_pending_notes`
     - `@smartstudy_pending_passwords`
     - `@smartstudy_pending_calc`
     - `@smartstudy_pending_settings`
   - Flush pending items to Firebase RTDB via `set()` or `update()`.
   - Clear pending flags.
   - Trigger toast notification: `t('onlineRestored')` ("Подключение восстановлено • Данные синхронизированы").
3. **Trigger 3: On Local Modification**:
   - Write to AsyncStorage immediately (optimistic UI update).
   - If user is authenticated and device is online:
     - Push update to Firebase RTDB at `users/${uid}/${domain}` with debounced or immediate write.
   - If user is offline:
     - Set domain's `pending_sync` flag to `true`.
4. **Trigger 4: On User Logout**:
   - Detach all Firebase RTDB listeners (`off()`).
   - Retain local cache or switch to guest cache without data loss.

#### Conflict Resolution Strategy:
- **Timestamp Priority**: Each domain records `updatedAt = Date.now()`.
- **Offline Protection (Safety First)**:
  - If a local pending edit exists, cloud snapshot is NEVER allowed to overwrite local uncommitted changes.
  - Instead, the local changes are pushed to the cloud once network connectivity is verified.
- **Empty Cache Protection**:
  - If a cloud payload is empty or has `{ subjects: {} }` while local storage contains user data, do not overwrite local data.

### 5.5 Network Connectivity Detection (Honest Detector)

To satisfy Requirement R6 (replacing the misleading static "Офлайн-режим: Активен" label):
1. **Network Service Architecture**:
   - In Expo Go, either `@react-native-community/netinfo` or `expo-network` can be utilized.
   - Alternatively, a zero-native-dependency `NetworkService` can execute lightweight periodic ping checks to `https://clients3.google.com/generate_204` or Firebase RTDB with event subscription.
2. **Offline Banner**:
   - When offline: A subtle, non-intrusive banner appears at the top or bottom of the screen:
     `t('offlineModeDesc')` ("Офлайн-режим • Данные сохранены локально").
   - When connection returns: The banner disappears and a success toast appears:
     `t('onlineRestored')` ("Подключение восстановлено • Данные синхронизированы").
3. **Settings Screen Cleanup**:
   - Remove the fake static status card "Офлайн-режим: Активен".
   - Replace with dynamic "Статус синхронизации: Синхронизировано" (or "В сети" / "Автономно").

---

## 6. Strict Project Rules Checklist

| Rule | Requirement | Verification in Design |
| :--- | :--- | :--- |
| **No Emojis** | Zero emojis anywhere in UI, modals, buttons | Verified: `translations.js` has 0 emojis; all new translations strictly text-only; no emojis in mockups. |
| **Feather Icons** | Exclusively `@expo/vector-icons` Feather | All icons mapped to valid Feather glyphs (`check`, `x`, `sliders`, `award`, `lock`, `refresh-cw`, `wifi-off`, `globe`). |
| **Firebase Project** | Strictly `studio-9933447149-80d6a` | Verified: `services/firebase.ts` correctly points to `studio-9933447149-80d6a`. |
| **Google Fonts** | Poppins & Inter via `@expo-google-fonts` | Verified: typography styles use `Poppins_600SemiBold`, `Inter_400Regular`, `Inter_500Medium`. |

---

## 7. Implementation Roadmap & Concrete Next Steps

For the implementing agent, follow this exact sequence:

1. **Step 1: Create `mobile-expo/src/i18n/`**:
   - Create `translations.ts` containing the full 10-language dictionary with the 3 missing keys filled.
   - Create `I18nContext.tsx` and `useI18n.ts` with AsyncStorage persistence (`@smartstudy_language`).
   - Mount `<I18nProvider>` in `App.tsx`.
2. **Step 2: Update Tab Navigator & Settings**:
   - Update `BottomTabNavigator.tsx` to use `t(...)` for all tab labels.
   - Update `SettingsScreen.tsx`: add language picker chips (RU, EN, UK, BE, KK, ES, DE, FR, TR, ZH), remove redundant items (package ID, fake offline card, duplicate grading system card).
3. **Step 3: Fix & Enhance Grade Calculations & Custom Thresholds**:
   - In `gradeMath.ts`: fix `getFinalGrade()` and `solveTargetStrategy()` to use `thresholds['us-letter']` instead of hardcoded numbers.
   - In `ThresholdsModal.tsx`: align thresholds input with user scale, allow custom decimals (e.g. 2.70, 3.65) and percentage inputs.
   - Ensure `saveGradesData()` syncs updated thresholds to AsyncStorage and Firebase RTDB.
4. **Step 4: Implement Centralized `CloudSyncService.ts`**:
   - Build sync service in `mobile-expo/src/services/syncService.ts`.
   - Implement two-way sync for:
     1. Calculator history (capped at 10 items).
     2. Grades & subjects.
     3. Notes.
     4. Password vault entries.
     5. User settings.
   - Attach listeners in `AuthProvider` or root navigator on login and network reconnect.
5. **Step 5: Verify Build & Tests**:
   - Run `npx tsc --noEmit` in `mobile-expo/`.
   - Verify 0 TypeScript errors and 0 emoji occurrences.
