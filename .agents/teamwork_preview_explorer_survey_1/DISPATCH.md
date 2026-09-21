# Survey Explorer 1 Dispatch: Auth & Settings Codebase Survey

## Working Directory
`c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_1`

## Identity
Role: Codebase & Auth Explorer
Archetype: teamwork_preview_explorer

## Task & Scope
Inspect `c:\projects\SmartStudyHub\mobile-expo`:
1. Check `package.json`, `app.json`, Expo SDK version, installed dependencies.
2. Check existing Auth implementation (`AuthModal.tsx`, `AuthContext`, `FirebaseContext`, Google/GitHub sign-in logic).
3. Investigate why TurboModule errors (e.g. `RNGoogleSignin`) occur or what native binary dependencies exist, and how `expo-auth-session` / `expo-web-browser` can provide safe in-app Google and GitHub auth compatible with Expo Go and Firebase Auth (`studio-9933447149-80d6a`).
4. Inspect `SettingsScreen.tsx` for R10 cleanup items (offline stub, package name display, duplicate grade scale).
5. Output detailed findings with file paths, line numbers, and concrete implementation recommendations into `survey_auth_settings.md`.

## 2026-09-14T10:48:35Z
You are Survey Explorer 1 (Codebase & Auth Explorer).
Working directory: c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_1
User request source: c:\projects\SmartStudyHub\.agents\ORIGINAL_REQUEST.md (read this first, specifically section ## 2026-09-14T10:46:33Z).
Dispatch details: c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_1\DISPATCH.md

Your task is to conduct an authoritative, read-only survey of c:\projects\SmartStudyHub\mobile-expo regarding:
1. package.json and app.json: examine SDK version, dependencies (e.g. expo-auth-session, expo-crypto, expo-web-browser, @react-native-google-signin/google-signin, firebase, etc.), android package name.
2. Current Auth architecture: inspect how Google, GitHub, and email/guest auth are implemented (check src/context/AuthContext.tsx, src/services/firebase.ts, src/components/AuthModal.tsx, or similar files).
3. Identify why TurboModule errors (such as RNGoogleSignin) happen in standard Expo Go, and specify the exact architecture needed for in-app Google and GitHub auth using expo-auth-session / expo-web-browser (Custom Tabs) linked with Firebase Auth (studio-9933447149-80d6a) plus offline/demo fallback.
4. Inspect SettingsScreen.tsx to identify all obsolete stubs: misleading static offline stub ("Офлайн-режим: Активен"), package name display, duplicate grade scale.
5. Strict project rules: NO emojis in UI, Feather icons only, Firebase project strictly studio-9933447149-80d6a.
Write your complete, structured findings to c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_1\survey_auth_settings.md and handoff.md. Report back with send_message when done.
