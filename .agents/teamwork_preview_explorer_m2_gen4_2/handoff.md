# Handoff Report: M2 i18n Runtime Engine, Persistence, and Reactive Switching

- **Agent**: teamwork_preview_explorer_m2_gen4_2
- **Role**: Engine & State Explorer
- **Date**: 2026-09-14T11:41:00Z
- **Working Directory**: `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m2_gen4_2`

---

## 1. Observation

### 1.1 `mobile-expo/src/i18n/I18nContext.tsx` & Hook Implementation
- **File path**: `mobile-expo/src/i18n/I18nContext.tsx`
- **Supported Languages Definition** (lines 11-22):
  ```typescript
  export const SUPPORTED_LANGUAGES: LanguageOption[] = [
    { code: 'ru', name: 'Русский', nativeName: 'Русский (RU)' },
    { code: 'en', name: 'English', nativeName: 'English (EN)' },
    { code: 'uk', name: 'Українська', nativeName: 'Українська (UK)' },
    { code: 'be', name: 'Беларуская', nativeName: 'Беларуская (BE)' },
    { code: 'kk', name: 'Қазақша', nativeName: 'Қазақша (KK)' },
    { code: 'es', name: 'Español', nativeName: 'Español (ES)' },
    { code: 'de', name: 'Deutsch', nativeName: 'Deutsch (DE)' },
    { code: 'fr', name: 'Français', nativeName: 'Français (FR)' },
    { code: 'tr', name: 'Türkçe', nativeName: 'Türkçe (TR)' },
    { code: 'zh', name: '中文', nativeName: '中文 (ZH)' },
  ];
  ```
  All 10 required languages (`ru, en, uk, be, kk, es, de, fr, tr, zh`) are defined with descriptive native names and language codes.
- **AsyncStorage Key Inconsistency** (line 24, lines 44, 56):
  ```typescript
  24: const LANGUAGE_STORAGE_KEY = '@ssh_language';
  ...
  44:     AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then((saved) => {
  ...
  56:       await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  ```
  The constant is set to `'@ssh_language'`.
- **Contrast with Test Specs and Acceptance Criteria**:
  - `mobile-expo/__tests__/tier1_features/r2_i18n_localization.test.ts:16`:
    `const I18N_STORAGE_KEY = '@smartstudy_language';`
  - `mobile-expo/__tests__/tier2_boundaries/r2_i18n_boundaries.test.ts:15`:
    `const I18N_STORAGE_KEY = '@smartstudy_language';`
  - `mobile-expo/__tests__/tier2_boundaries/r10_settings_boundaries.test.ts:37`:
    `const I18N_KEY = '@smartstudy_language';`
  - `mobile-expo/__tests__/tier4_real_world/student_study_session.test.ts:54-55`:
    `await AsyncStorage.setItem('@smartstudy_language', 'ru');`
    `expect(await AsyncStorage.getItem('@smartstudy_language')).toBe('ru');`
  - `public/privacy.html:817`:
    `const storedLang = localStorage.getItem('smartstudy_language') || localStorage.getItem('ssh_language');`
- **Translation Function & Edge Case** (lines 62-73):
  ```typescript
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const langDict = translations[language] || translations['ru'];
    let text = langDict[key] || translations['ru']?.[key] || translations['en']?.[key] || key;

    if (params) {
      Object.entries(params).forEach(([paramKey, val]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
      });
    }

    return text;
  }, [language]);
  ```
  In `text.replace(..., String(val))`, passing a string replacement directly causes JavaScript regex engine to treat `$` patterns (`$1`, `$&`, `$$`) as special capture replacement tokens. If `val` contains a currency string (e.g. `$100`), it corrupts the output. Furthermore, `if (!key) return '';` is missing (empty string lookup).

### 1.2 Bottom Tab Navigation Hardcoding
- **File path**: `mobile-expo/src/navigation/BottomTabNavigator.tsx`
- **Import and Tab Bar Labels** (lines 8, 62, 69, 76, 83, 90):
  ```typescript
  import { RootTabParamList, TAB_ICONS, TAB_LABELS_RU } from './types';
  ...
  <Tab.Screen name="Calculator" component={CalculatorScreen} options={{ tabBarLabel: TAB_LABELS_RU.Calculator }} />
  <Tab.Screen name="Grades" component={GradesScreen} options={{ tabBarLabel: TAB_LABELS_RU.Grades }} />
  <Tab.Screen name="Notes" component={NotesScreen} options={{ tabBarLabel: TAB_LABELS_RU.Notes }} />
  <Tab.Screen name="Tools" component={ToolsStackNavigator} options={{ tabBarLabel: TAB_LABELS_RU.Tools }} />
  <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: TAB_LABELS_RU.Settings }} />
  ```
- Neither `BottomTabNavigator.tsx` nor `RootNavigator.tsx` imports or calls `useI18n()`.
- Bottom navigation tabs are statically locked to Russian (`TAB_LABELS_RU`).

### 1.3 `mobile-expo/src/modules/settings/SettingsScreen.tsx` Modal & Strings
- **File path**: `mobile-expo/src/modules/settings/SettingsScreen.tsx`
- **Language Selector Modal** (lines 342-408):
  - Uses native `<Modal>` with `<ScrollView>` rendering `supportedLanguages.map(...)`.
  - All 10 languages (`ru, en, uk, be, kk, es, de, fr, tr, zh`) are rendered with their native names and language code.
  - Selected language displays active background tint and Feather `<Feather name="check" size={18} color={colors.primaryAccent} />`.
  - Close button uses `<Feather name="x" size={20} color={colors.textColorSecondary} />`.
  - Globe icon uses `<Feather name="globe" size={20} color={colors.primaryAccent} />`.
  - **Emoji audit**: Verbatim 0 emojis found in `SettingsScreen.tsx` and `I18nContext.tsx`. Strict Feather icon compliance.
- **Unused `t` Hook & Hardcoded Russian Text** (lines 18, 23, 65, 72, 135, 149, 163, 185, 221, 246, 314, 331, 360):
  - Line 23: `const { language, setLanguage, t, supportedLanguages } = useI18n();`
  - `t` is destructured but NEVER called anywhere in `SettingsScreen.tsx`.
  - Hardcoded strings:
    - Line 51: `title="Аккаунт"`
    - Line 65: `title="Настройки"`, `subtitle="Параметры и внешний вид"`
    - Line 72: `АККАУНТ`
    - Line 111: `Выйти из аккаунта`
    - Line 121: `Войти в аккаунт`
    - Line 135: `ЯЗЫК ИНТЕРФЕЙСА`
    - Line 149: `Язык приложения`
    - Line 163: `ВНЕШНИЙ ВИД`
    - Line 185: `Тема оформления`
    - Line 221: `ОБЛАЧНАЯ СИНХРОНИЗАЦИЯ`
    - Line 246: `Статус синхронизации`
    - Line 314: `О ПРИЛОЖЕНИИ`
    - Line 331: `Версия сборки`
    - Line 360: `Выберите язык`

### 1.4 Downstream Screen Adoption
- Grep across `mobile-expo/src/`:
  - `I18nContext.tsx` (definition)
  - `SettingsScreen.tsx` (imported, but `t` unused)
  - `CalculatorScreen.tsx`, `GradesScreen.tsx`, `NotesScreen.tsx`, `ToolsScreen.tsx`, `GenPassScreen.tsx`, `UnitConverterScreen.tsx`, `TranslatorScreen.tsx`, `LoginScreen.tsx` have 0 calls to `useI18n()`. All headings and button labels remain hardcoded Russian.

### 1.5 Build & Test Status
- **TypeScript Compilation**:
  - Command: `npx tsc --noEmit` (in `mobile-expo`)
  - Result: Exit code 0, 0 errors.
- **Jest Test Suite**:
  - Command: `npx jest --bail` (in `mobile-expo`)
  - Result: 22 test suites passed, 111 tests passed, 0 failures (execution time 6.389s).
- **Expo Config**:
  - Command: `npx expo config`
  - Result: Exit code 0. Valid config with `sdkVersion: 57.0.0`, package `com.smartstudyhub.mobile`.
- **Platform Web Notice**:
  - `npx expo export --platform web` fails with `CommandError` because `react-native-web` and `react-dom` are omitted from `package.json`. Android and iOS targets do not require web dependencies.

---

## 2. Logic Chain

1. **Storage Key Consistency**:
   - `I18nContext.tsx` line 24 writes and reads `@ssh_language`.
   - All tests (`r2_i18n_localization.test.ts:16`, `r2_i18n_boundaries.test.ts:15`, `r10_settings_boundaries.test.ts:37`, `student_study_session.test.ts:54`) read and write `@smartstudy_language`.
   - Therefore, any state saved by tests or external initializers under `@smartstudy_language` is ignored by the runtime context, and any change made in `SettingsScreen` is saved under `@ssh_language`.
   - Changing `LANGUAGE_STORAGE_KEY` to `'@smartstudy_language'` with fallback read to `'@ssh_language'` completely reconciles this.

2. **Reactive Tree Propagation**:
   - In `App.tsx`, `<I18nProvider>` wraps `<AppContent />` and `<RootNavigator />`.
   - Updating `language` triggers state change `setLanguageState(lang)` in `I18nProvider`.
   - However, because neither `BottomTabNavigator.tsx` nor the screen components (`CalculatorScreen`, `GradesScreen`, `NotesScreen`, `ToolsScreen`, `SettingsScreen`) call `t(...)`, the updated context values never affect the rendered text.
   - Therefore, switching the language in Settings does not update tab titles or screen text.
   - For true reactive switching without app reload, `BottomTabNavigator.tsx` and the core screens must consume `const { t } = useI18n()` and bind titles/labels to `t('key')`.

3. **String Replacement Robustness**:
   - `String.prototype.replace(regex, replacement)` evaluates special replacement patterns (like `$1`, `$&`) when `replacement` is a string.
   - Test `tier2_boundaries/r2_i18n_boundaries.test.ts:71-85` explicitly tests parameter values containing `$`.
   - Using a replacer function `() => String(val)` guarantees literal value replacement and prevents regex injection/corruption.

---

## 3. Caveats

- **Web export (`react-native-web`)**: The project `package.json` does not include `react-native-web` or `react-dom`. Mobile Expo Go and native Android/iOS bundling are unaffected, but `expo export` without `--platform android` attempts web generation and throws a dependency warning.
- **Dictionary coverage**: `translations.ts` has 2,341 lines covering all 10 languages and 100+ keys per language. While all core navigation and feature keys exist, screen-specific niche labels may require checking fallback to Russian/English.

---

## 4. Conclusion

The i18n localization engine foundation in `mobile-expo/src/i18n` is structurally sound, clean, and fully typed (0 TypeScript errors, 100% Jest test pass rate).
However, Milestone M2 requires the following discrete tasks to achieve full completion:
1. **Change AsyncStorage storage key** in `I18nContext.tsx` to `@smartstudy_language` (with fallback read from `@ssh_language`).
2. **Apply replacement fix** in `t()`: use `() => String(val)` and guard empty keys `if (!key) return '';`.
3. **Wire `useI18n()` into `BottomTabNavigator.tsx`** so that tab labels dynamically use `t('calculator')`, `t('grades')`, `t('notes')`, `t('tools')`, and `t('settings')`.
4. **Localize `SettingsScreen.tsx`** by substituting hardcoded Russian strings with `t(...)` calls.
5. **Localize Core Screens** (`CalculatorScreen`, `GradesScreen`, `NotesScreen`, `ToolsScreen`) to consume `useI18n()` for headers and key UI actions.

---

## 5. Verification Method

### 5.1 Independent Commands to Verify
1. **TypeScript Type Check**:
   ```powershell
   cd c:\projects\SmartStudyHub\mobile-expo
   npx tsc --noEmit
   ```
   *Expected: Exit code 0, no errors.*

2. **R2 i18n Feature & Boundary Tests**:
   ```powershell
   cd c:\projects\SmartStudyHub\mobile-expo
   npx jest __tests__/tier1_features/r2_i18n_localization.test.ts
   npx jest __tests__/tier2_boundaries/r2_i18n_boundaries.test.ts
   ```
   *Expected: 11 tests pass.*

3. **Full Test Suite**:
   ```powershell
   cd c:\projects\SmartStudyHub\mobile-expo
   npx jest --bail
   ```
   *Expected: 22 test suites pass (111 tests).*

4. **Expo Config Verification**:
   ```powershell
   cd c:\projects\SmartStudyHub\mobile-expo
   npx expo config
   ```
   *Expected: Clean JSON output without errors.*

### 5.2 Files to Inspect
- `mobile-expo/src/i18n/I18nContext.tsx`
- `mobile-expo/src/navigation/BottomTabNavigator.tsx`
- `mobile-expo/src/modules/settings/SettingsScreen.tsx`
- `mobile-expo/src/i18n/translations.ts`

### 5.3 Invalidation Conditions
- Any occurrence of unicode emojis in `I18nContext.tsx`, `translations.ts`, `SettingsScreen.tsx`, or any screen UI.
- Use of any AsyncStorage key other than `@smartstudy_language` for language persistence.
- Hardcoded Russian tab titles failing to change when selecting English, Spanish, or other supported languages.
