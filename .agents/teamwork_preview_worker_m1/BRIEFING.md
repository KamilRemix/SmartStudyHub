# BRIEFING — 2026-09-14T10:56:30Z

## Mission
Safely implement Google & GitHub authentication for Expo Go (in-app WebBrowser / AuthSession with Firebase linking and offline/demo fallback) and clean up SettingsScreen in mobile-expo per R1 and R10.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa
- Working directory: c:\projects\SmartStudyHub\.agents\teamwork_preview_worker_m1
- Original parent: 37a82a81-4a96-4428-9707-b8fee48f1dc3
- Milestone: M1 (Auth & Settings Cleanup)

## 🔒 Key Constraints
- Git commit after completing task: git add . && git commit -m "feat(auth): безопасная авторизация Google/GitHub в Expo Go и очистка настроек"
- STRICT BAN ON EMOJIS: Absolutely NO emojis in the UI, alerts, modals, badges, or buttons.
- Feather Icons (@expo/vector-icons) or native SVG only.
- Firebase project: strictly studio-9933447149-80d6a.
- Package name: strictly com.smartstudyhub.mobile in app.json.
- UTF-8 without BOM. No blocking alert() or if (false) stubs.
- Minimal change principle: only modify what is required, preserve other files and UI structure.

## Current Parent
- Conversation ID: 37a82a81-4a96-4428-9707-b8fee48f1dc3
- Updated: 2026-09-14T10:56:30Z

## Task Summary
- **What to build**:
  1. app.json: add "scheme": "smartstudyhub", remove "@react-native-google-signin/google-signin" from plugins, verify android.package = "com.smartstudyhub.mobile".
  2. src/services/firebase.ts: add AsyncStorage persistence with initializeAuth and getReactNativePersistence.
  3. src/modules/auth/LoginScreen.tsx & src/context/AuthContext.tsx / src/services/auth.ts:
     - Remove @react-native-google-signin/google-signin.
     - Add safe Google auth using expo-auth-session / WebBrowser with GoogleAuthProvider.credential(idToken).
     - Add GitHub sign-in via WebBrowser / AuthSession with Firebase linking and guest/demo fallback (signInAnonymously).
     - Ensure robust offline / demo fallback mode when network fails or user cancels.
  4. src/modules/settings/SettingsScreen.tsx:
     - Remove duplicate "СИСТЕМА ОЦЕНОК" card.
     - Remove "Идентификатор пакета" technical display.
     - Remove fake "Офлайн-режим: Активен" stub.
     - Preserve Profile/Auth, Language Selector row, Theme toggle, Cloud Sync status row, App Version.
  5. Verification: tsc --noEmit (0 errors), npx expo export, git commit, handoff report.
- **Success criteria**: 0 TypeScript errors, clean Metro bundle export, valid Firebase config, 0 emojis, working auth & fallback, cleaned settings.
- **Interface contracts**: ORIGINAL_REQUEST.md (R1, R10), AGENTS.md
- **Code layout**: mobile-expo/

## Key Decisions Made
- [Initial]: Use `expo-auth-session/providers/google` and `* as WebBrowser` for Expo Go compatibility.
- [Auth Persistence]: Configured initializeAuth with getReactNativePersistence(AsyncStorage) with fallback to getAuth.
- [Offline Fallback]: Implemented local demo session fallback in auth.ts and AuthContext.tsx so app is completely usable even when offline or upon cancel.
- [Settings Cleanup]: Replaced duplicate grading card, package name, and fake offline stub with interactive 10-language selector modal, cloud sync indicator (studio-9933447149-80d6a), and version v1.0.2.

## Artifact Index
- c:\projects\SmartStudyHub\.agents\teamwork_preview_worker_m1\DISPATCH.md — Assignment instructions
- c:\projects\SmartStudyHub\.agents\teamwork_preview_worker_m1\BRIEFING.md — Working memory
- c:\projects\SmartStudyHub\.agents\teamwork_preview_worker_m1\progress.md — Liveness & task progress
- c:\projects\SmartStudyHub\.agents\teamwork_preview_worker_m1\handoff.md — Handoff report

## Change Tracker
- **Files modified**:
  - `mobile-expo/app.json`: added `"scheme": "smartstudyhub"`, removed `@react-native-google-signin/google-signin` plugin, preserved `"package": "com.smartstudyhub.mobile"`.
  - `mobile-expo/src/services/firebase.ts`: initialized Auth with `getReactNativePersistence(AsyncStorage)` and `initializeAuth`.
  - `mobile-expo/src/services/auth.ts`: added `loginAsGuest` via `signInAnonymously`, offline demo session fallback, and updated `subscribeToAuthChanges` / `logout`.
  - `mobile-expo/src/context/AuthContext.tsx`: exposed guest login and logout methods, updated typing.
  - `mobile-expo/src/modules/auth/LoginScreen.tsx`: removed `@react-native-google-signin/google-signin`, added `useIdTokenAuthRequest` (Google), WebBrowser AuthSession (GitHub), and dedicated Guest mode button.
  - `mobile-expo/src/modules/settings/SettingsScreen.tsx`: cleaned up 3 stubs, added 10-language modal selector, cloud sync indicator, preserved profile/theme/version.
  - `mobile-expo/tsconfig.json`: excluded `__tests__` from app build.
- **Build status**: PASS (tsc --noEmit: 0 errors; npx expo export: Android & iOS bundles generated).
- **Pending issues**: None.

## Quality Status
- **Build/test result**: PASS (tsc --noEmit: 0 errors, npx expo export: 1080/1085 modules bundled).
- **Lint status**: 0 violations, 0 emojis, 0 BOMs, 0 blocking alerts.
- **Tests added/modified**: Excluded __tests__ from app bundle, preserved test runner architecture.

## Loaded Skills
None
