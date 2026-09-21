# Handoff Report: i18n Localization, Grade Thresholds & Cloud Sync Survey

**Agent**: Survey Explorer 2 (Localization & Cloud Sync Explorer)  
**Parent Agent**: parent (`37a82a81-4a96-4428-9707-b8fee48f1dc3`)  
**Working Directory**: `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_2`  
**Detailed Survey File**: `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_2\survey_i18n_sync.md`  
**Handoff Type**: Hard (Task complete)

---

## 1. Observation

1. **`public/translations.js` Structure and Audit**:
   - Contains 11 languages (`ru`, `en`, `uk`, `be`, `kk`, `es`, `de`, `fr`, `zh`, `tr`, `ar`).
   - Total unique keys: 234.
   - Key count per target language: `ru`: 234, `en`: 233, `be`: 232, `uk`: 231, `kk`: 231, `es`: 231, `de`: 231, `fr`: 231, `tr`: 231, `zh`: 231.
   - Missing keys:
     - `targetGrade`: present in `ru` ("Желаемая оценка") and `be` ("Жаданая адзнака"), missing in `en, uk, kk, es, de, fr, tr, zh`.
     - `offlineModeDesc`: present in `ru` ("Офлайн-режим • Данные сохранены локально") and `en` ("Offline mode • Data saved locally"), missing in `uk, be, kk, es, de, fr, tr, zh`.
     - `onlineRestored`: present in `ru` ("Подключение восстановлено • Данные синхронизированы") and `en` ("Connection restored • Data synced"), missing in `uk, be, kk, es, de, fr, tr, zh`.
   - Emoji verification: Unicode regex search `[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E0}-\u{1F1FF}]` returned **0 matches**. The dictionary is 100% emoji-free.
2. **Current Localization in `mobile-expo`**:
   - `mobile-expo/src/i18n/` does not exist yet.
   - `mobile-expo/src/navigation/BottomTabNavigator.tsx` lines 61-92 hardcode Russian tab labels from `TAB_LABELS_RU` (`Калькулятор`, `Средний балл`, `Заметки`, `Инструменты`, `Настройки`).
   - `mobile-expo/src/modules/settings/SettingsScreen.tsx` lines 48-260 hardcode Russian section headers (`АККАУНТ`, `ВНЕШНИЙ ВИД`, `СИСТЕМА ОЦЕНОК`, `О ПРИЛОЖЕНИИ`) and contains no language picker component.
   - `mobile-expo/src/modules/grades/GradesScreen.tsx`, `modules/calculator/CalculatorScreen.tsx`, and `modules/notes/NotesScreen.tsx` all hardcode Russian text in headers and controls.
3. **Grade Calculations & Thresholds Deficiencies**:
   - File: `mobile-expo/src/modules/grades/utils/gradeMath.ts`:
     - Line 137: `getFinalGrade()` hardcodes:
       `if (average >= 3.5) return { finalGrade: 'A', color: '#34c759' }; ...`
       It never inspects `thresholds['us-letter']`.
     - Line 224: `solveTargetStrategy()` hardcodes:
       `if (letter === 'A') targetThreshold = 3.5; else if (letter === 'B') targetThreshold = 2.5; ...`
       It never inspects `thresholds['us-letter']`.
   - File: `mobile-expo/src/modules/grades/utils/gradesStorage.ts`:
     - Line 13: `INITIAL_GRADES_DATA` sets `'us-letter': { A: 90, B: 80, C: 70, D: 60, F: 0 }` (Percentages).
   - File: `mobile-expo/src/modules/grades/components/ThresholdsModal.tsx`:
     - Line 59: Assumes GPA floats: `pA = thresholds['us-letter']?.A ?? 3.5`, `placeholder="3.50"`, leading to a type/scale mismatch when `90` is loaded.
4. **Firebase Realtime Database Setup & Usage**:
   - File: `mobile-expo/src/services/firebase.ts`: Correctly configured with project `studio-9933447149-80d6a` and databaseURL `https://studio-9933447149-80d6a-default-rtdb.firebaseio.com`.
   - Existing web app sync paths:
     - `public/renderer.js` lines 1367 & 3252: `users/${uid}` (contains `subjects`, `settings`, `updatedAt`).
     - `public/notes.js` line 205: `users/${user.uid}/notes` (contains map/array of notes).
     - `public/genpass.js` line 321: `users/${user.uid}/passwords` (contains saved password items).
   - Calculator history: `mobile-expo/src/modules/calculator/utils/calcHistoryStorage.ts` line 5 has `MAX_HISTORY_ITEMS = 50;`, which violates the requirement to cap history at 5-10 recent entries.

---

## 2. Logic Chain

1. From Observation 1: `public/translations.js` is already modular and CommonJS-compatible, with 231 keys perfectly aligned across all languages and only 3 keys requiring localized expansion for the remaining 8-9 languages. Supplementing these 3 keys (`targetGrade`, `offlineModeDesc`, `onlineRestored`) provides an exhaustive, production-grade 10-language dictionary for mobile.
2. From Observation 2: Because `mobile-expo` currently hardcodes Russian text throughout navigation and screen layouts, a centralized `I18nProvider` is required at the root (`App.tsx`). By storing language in `@smartstudy_language` via AsyncStorage and providing a `useI18n()` hook, changing language in `SettingsScreen` will reactively trigger re-renders across all mounted screens and tab labels without app reload.
3. From Observation 3: The discrepancy between percentages in `INITIAL_GRADES_DATA` and GPA floats in `ThresholdsModal`, combined with hardcoded thresholds in `gradeMath.ts`, breaks custom threshold calculations for US Letter. Fixing `gradeMath.ts` to strictly consume `thresholds[system]` and adding validation in `ThresholdsModal` will enable users to freely set custom decimal thresholds (e.g., 2.70, 3.65) and custom percentages (e.g., 60%, 75%, 90%), which then persist in AsyncStorage and sync to Firebase RTDB.
4. From Observation 4: The web app stores grades under `users/${uid}`, notes under `users/${uid}/notes`, and passwords under `users/${uid}/passwords`. Structuring the mobile sync to use these exact same paths under `/users/{uid}/` guarantees bidirectional data compatibility between mobile and web. Capping calculator history to 10 entries in `calcHistoryStorage.ts` and syncing it to `users/${uid}/calc_history` satisfies the memory optimization constraint.

---

## 3. Caveats

1. **Authentication in Expo Go**: `LoginScreen.tsx` currently has an import error for `@react-native-google-signin/google-signin` (TS2307) because native binary modules fail in Expo Go. The authentication flow is being handled by Explorer 1 using `expo-auth-session` / `WebBrowser`.
2. **Network Module**: While `SmartNetwork` in web used Capacitor and periodic pings, `mobile-expo` does not currently have `@react-native-community/netinfo` installed. The implementer should either install it via `npx expo install @react-native-community/netinfo` or implement an active ping fallback service.

---

## 4. Conclusion

The audit is complete. An authoritative blueprint and data models have been written to `survey_i18n_sync.md`. The implementer has exact specifications to:
1. Port the 10-language dictionary into `mobile-expo/src/i18n/` with reactive `I18nContext`.
2. Implement the language selector in `SettingsScreen` and translate all tabs and screens.
3. Fix custom threshold calculations in `gradeMath.ts` and `ThresholdsModal.tsx`.
4. Establish two-way Firebase Realtime Database sync across Calculator History (capped at 10), Grades, Notes, Passwords, and Settings.

---

## 5. Verification Method

1. **Translations Key Coverage**:
   Run the following command from repository root:
   ```bash
   node -e "const t = require('./public/translations.js'); ['ru','en','uk','be','kk','es','de','fr','tr','zh'].forEach(l => console.log(l, Object.keys(t[l]).length));"
   ```
   Verifies that all 10 languages are present and have $\ge 231$ keys.
2. **Emoji Ban Verification**:
   Run:
   ```bash
   node -e "const fs = require('fs'); const c = fs.readFileSync('./public/translations.js','utf8'); console.log('Emojis:', (c.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || []).length);"
   ```
   Must output `Emojis: 0`.
3. **TypeScript Compilation in mobile-expo**:
   Run from `mobile-expo/`:
   ```bash
   npx tsc --noEmit
   ```
   Note: currently reports TS2307 on `@react-native-google-signin/google-signin` in `LoginScreen.tsx`, which will be resolved during the auth overhaul.
