# Progress — Worker M1 (Auth & Settings)

Last visited: 2026-09-14T11:14:00Z

## Status
Tasks completed. Verification passed. Ready for commit & handoff.

## Steps
- [x] 1. Update `mobile-expo/app.json` (add scheme: smartstudyhub, remove google-signin plugin, verify package: com.smartstudyhub.mobile).
- [x] 2. Update `mobile-expo/src/services/firebase.ts` (React Native AsyncStorage persistence via initializeAuth & getReactNativePersistence).
- [x] 3. Update `mobile-expo/src/services/auth.ts`, `AuthContext.tsx`, and `LoginScreen.tsx` (Expo Go safe Google auth via expo-auth-session / WebBrowser, GitHub auth with guest/demo fallback via signInAnonymously & offline session).
- [x] 4. Update `mobile-expo/src/modules/settings/SettingsScreen.tsx` (remove stubs: duplicate grading card, package name, fake offline stub; include Language Selector with 10 languages and persistent state, theme toggle, cloud sync status row, app version v1.0.2).
- [x] 5. Verification: run `npx tsc --noEmit` (0 errors) and `npx expo export` (Metro bundled successfully for Android and iOS).
- [x] 6. Git commit & write `handoff.md`.
