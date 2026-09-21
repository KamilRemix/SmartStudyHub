# Worker M1 Dispatch: Core Auth & Settings Cleanup (R1, R10)

## Working Directory
`c:\projects\SmartStudyHub\.agents\teamwork_preview_worker_m1`

## Inputs & Specifications
- User request: `c:\projects\SmartStudyHub\.agents\ORIGINAL_REQUEST.md` (read section ## 2026-09-14T10:46:33Z)
- Project master plan: `c:\projects\SmartStudyHub\.agents\PROJECT.md`
- Survey report: `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_1\survey_auth_settings.md`
- Explorer handoff: `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_1\handoff.md`

## Mandatory Rules (AGENTS.md)
1. Git commit after completing this task:
   `git add .` and `git commit -m "feat(auth): безопасная авторизация Google/GitHub в Expo Go и очистка настроек"`
2. STRICT BAN ON EMOJIS: Absolutely NO emojis in the UI, alerts, modals, badges, or buttons.
3. Feather Icons (`@expo/vector-icons`) or native SVG only.
4. Firebase project: strictly `studio-9933447149-80d6a`.
5. Package name: strictly `com.smartstudyhub.mobile` in `app.json`.
6. Files in UTF-8 without BOM. No blocking alert() or if (false) stubs.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Detailed Tasks
1. `app.json`:
   - Add `"scheme": "smartstudyhub"`.
   - Remove `"@react-native-google-signin/google-signin"` from `plugins`.
   - Ensure `"package": "com.smartstudyhub.mobile"` is preserved under `android`.
2. `src/services/firebase.ts`:
   - Initialize Auth with React Native AsyncStorage persistence:
     `import { initializeAuth, getReactNativePersistence } from 'firebase/auth';`
     `import AsyncStorage from '@react-native-async-storage/async-storage';`
     `export const auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });`
   - Maintain fallback if auth already initialized.
3. `src/modules/auth/LoginScreen.tsx` & `src/context/AuthContext.tsx`:
   - Eliminate `@react-native-google-signin/google-signin` and top-level `GoogleSignin.configure`.
   - Implement Google sign-in using `expo-auth-session/providers/google` and `WebBrowser.maybeCompleteAuthSession()`.
   - On receiving ID token, authenticate with Firebase Auth: `GoogleAuthProvider.credential(idToken)` and `signInWithCredential(auth, credential)`.
   - Implement GitHub sign-in via `WebBrowser.openAuthSessionAsync` or redirect, with fallback to Guest/Demo mode (`signInAnonymously(auth)`).
   - Ensure complete offline/demo fallback mode when network fails or user cancels.
4. `src/modules/settings/SettingsScreen.tsx`:
   - Remove duplicate "СИСТЕМА ОЦЕНОК" card.
   - Remove developer technical detail "Идентификатор пакета".
   - Remove misleading static "Офлайн-режим: Активен".
   - Keep Profile/Auth, Language Selector row, Theme toggle, Cloud Sync status row, App Version.
5. Verification:
   - Run `npx tsc --noEmit` in `c:\projects\SmartStudyHub\mobile-expo` and ensure 0 errors.
   - Run `npx expo export` to ensure clean Metro bundle compilation.
   - Run git commit.
   - Write full report to `c:\projects\SmartStudyHub\.agents\teamwork_preview_worker_m1\handoff.md`.

## 2026-09-14T10:56:30Z
You are Worker M1 (Auth & Settings Implementer).
Working directory: c:\projects\SmartStudyHub\.agents\teamwork_preview_worker_m1
User request source: c:\projects\SmartStudyHub\.agents\ORIGINAL_REQUEST.md (read section ## 2026-09-14T10:46:33Z).
Dispatch details: c:\projects\SmartStudyHub\.agents\teamwork_preview_worker_m1\DISPATCH.md
Explorer findings: c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_1\survey_auth_settings.md
Explorer handoff: c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_1\handoff.md
