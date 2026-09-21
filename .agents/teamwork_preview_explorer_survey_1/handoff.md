# Handoff Report: Mobile Auth Architecture & Settings Screen Survey

**Sender**: Survey Explorer 1 (Codebase & Auth Explorer)  
**Recipient**: Parent Orchestrator / Downstream Implementers  
**Working Directory**: `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_1`  
**Date**: 2026-09-14  

---

## 1. Observation

1. **Compiler Diagnostics & Missing Module Error**:
   - Running `npm run typecheck` (`tsc --noEmit`) in `c:\projects\SmartStudyHub\mobile-expo` failed with exit code 1:
     ```
     > smartstudyhub-mobile@1.0.0 typecheck
     > tsc --noEmit

     src/modules/auth/LoginScreen.tsx(17,8): error TS2307: Cannot find module '@react-native-google-signin/google-signin' or its corresponding type declarations.
     ```
2. **Dependencies & Plugin Discrepancy**:
   - `mobile-expo/package.json` does NOT list `@react-native-google-signin/google-signin` in `dependencies` (lines 14–36) or `devDependencies` (lines 37–43).
   - `mobile-expo/app.json` line 34 contains `"@react-native-google-signin/google-signin"` in its `"plugins"` array.
   - `mobile-expo/package.json` already contains:
     - `"expo-auth-session": "~57.0.12"` (line 24)
     - `"expo-crypto": "~57.0.3"` (line 26)
     - `"expo-web-browser": "~57.0.3"` (line 30)
     - `"firebase": "^12.19.0"` (line 31)
     - `"@react-native-async-storage/async-storage": "2.2.0"` (line 18)
3. **Missing URL Scheme**:
   - In `mobile-expo/app.json`, there is no `"scheme"` field defined inside the `"expo"` configuration object.
4. **Immediate Crash at Module Evaluation Time**:
   - In `mobile-expo/src/modules/auth/LoginScreen.tsx`:
     - Line 17: `import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';`
     - Lines 22–25:
       ```typescript
       GoogleSignin.configure({
         webClientId: '121615915195-kddc512lnra4b2eo2qjnnbuc0sb0pcbh.apps.googleusercontent.com',
         offlineAccess: false,
       });
       ```
     - Line 22 executes immediately upon importing `LoginScreen.tsx`.
     - In `mobile-expo/src/modules/settings/SettingsScreen.tsx` line 8:
       `import { AuthNavigator } from '../auth/AuthNavigator';`
       Since `AuthNavigator.tsx` line 2 imports `LoginScreen`, opening or mounting `SettingsScreen` unconditionally triggers evaluation of `LoginScreen.tsx` and attempts to load native TurboModule `RNGoogleSignin`.
5. **Firebase Auth Initialization in React Native**:
   - In `mobile-expo/src/services/firebase.ts` lines 24–25:
     ```typescript
     export const firebaseApp: FirebaseApp = app;
     export const auth: Auth = getAuth(app);
     ```
   - In `node_modules/@firebase/auth/package.json` line 7: `"react-native": "dist/rn/index.js"`.
   - In `node_modules/@firebase/auth/dist/rn/index.js` lines 34–53, Firebase exports `getReactNativePersistence`.
6. **Obsolete Stubs in SettingsScreen**:
   - In `mobile-expo/src/modules/settings/SettingsScreen.tsx`:
     - Lines 164–195: Section `СИСТЕМА ОЦЕНОК` displaying card `Шкала оценок: 5-балльная система (RU)`.
     - Lines 231–246: Row `Идентификатор пакета: com.smartstudyhub.mobile` with Feather `shield` icon.
     - Lines 248–258: Row `Офлайн-режим: Активен` with hardcoded text and color `colors.primaryAccent`.
7. **Strict Rule Verification**:
   - Emoji search regex `[\x{1F600}-\x{1F64F}\x{1F300}-\x{1F5FF}\x{1F680}-\x{1F6FF}\x{1F700}-\x{1F77F}\x{1F780}-\x{1F7FF}\x{1F800}-\x{1F8FF}\x{1F900}-\x{1F9FF}\x{1FA00}-\x{1FA6F}\x{1FA70}-\x{1FAFF}\x{2600}-\x{26FF}\x{2700}-\x{27BF}]` across `mobile-expo/src` yielded 0 matches.
   - Vector icons across all 24 files importing icons exclusively import `{ Feather }` from `@expo/vector-icons`.
   - Firebase config in `src/services/firebase.ts` lines 6–15 strictly points to `studio-9933447149-80d6a`.

---

## 2. Logic Chain

1. **Incompatibility Chain**:
   - Observation 1 & 2 show `@react-native-google-signin/google-signin` is imported in `LoginScreen.tsx` but omitted from `package.json`.
   - Observation 4 shows `GoogleSignin.configure(...)` executes at top-level scope when `LoginScreen.tsx` is imported.
   - Standard Expo Go does not contain the native binary symbols for `RNGoogleSignin`. Therefore, even if installed in `package.json`, evaluating `LoginScreen.tsx` in Expo Go invokes `TurboModuleRegistry.getEnforcing('RNGoogleSignin')`, throwing a fatal error and crashing the app.
   - Conclusion: `@react-native-google-signin/google-signin` must be eliminated from `LoginScreen.tsx` and `app.json`.
2. **Safe Auth Solution Chain**:
   - Observation 2 confirms `expo-auth-session`, `expo-web-browser`, and `firebase` are already present in `package.json`.
   - `expo-auth-session/providers/google` provides `useIdTokenAuthRequest`, which uses Android Custom Tabs / iOS ASWebAuthenticationSession via `expo-web-browser` without native TurboModules.
   - Passing the returned `id_token` to `signInWithGoogleCredential(idToken)` (already present in `src/services/auth.ts:60`) completes Firebase Auth inside project `studio-9933447149-80d6a`.
   - Observation 3 shows `app.json` lacks `"scheme"`. Adding `"scheme": "smartstudyhub"` provides the necessary redirect handler for `expo-auth-session`.
3. **Session Persistence Chain**:
   - Observation 5 shows `auth` is instantiated via `getAuth(app)`. In React Native, this keeps tokens only in memory.
   - Using `initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })` attaches persistence to `@react-native-async-storage/async-storage`, preserving the logged-in session across app restarts.
4. **Settings Cleanup Chain**:
   - Observation 6 identifies three static stubs in `SettingsScreen.tsx`.
   - Requirement R10 specifically directs the removal of the offline stub, the package name display, and the duplicate grading system card.
   - Replacing these with the Language Selector (R2) and real-time Cloud Sync status (R4) satisfies all project specifications.

---

## 3. Caveats

- **GitHub OAuth Code Exchange**: GitHub's OAuth API does not return an `id_token` directly; it returns an authorization `code` which traditionally requires a client secret exchange on a server/Cloud Function. If no Cloud Function is deployed, the app must either route via Firebase Auth's official handler (`https://studio-9933447149-80d6a.firebaseapp.com/__/auth/handler`) or provide an instant, graceful fallback to Demo / Guest Mode (`signInAnonymously(auth)`).
- **VK ID**: VK ID authentication is intentionally disabled / out of scope for mobile Expo per `public/js/auth.js:156` and project constraints.
- **Expo Go vs Standalone Builds**: In Expo Go, `makeRedirectUri({ scheme: 'smartstudyhub' })` resolves to the Expo proxy/scheme. Standalone APKs/AABs resolve to `smartstudyhub://`. Both are supported by `expo-auth-session`.

---

## 4. Conclusion

1. **Build Fix**: Remove `@react-native-google-signin/google-signin` from `app.json` and `LoginScreen.tsx`. This immediately resolves `TS2307` and prevents `TurboModuleRegistry` crashes in Expo Go.
2. **Auth Implementation**: Implement in-app Google Auth using `expo-auth-session/providers/google` (`useIdTokenAuthRequest`) + `expo-web-browser` (`WebBrowser.maybeCompleteAuthSession()`) linked to `GoogleAuthProvider.credential(idToken)` in Firebase Auth (`studio-9933447149-80d6a`).
3. **Scheme Configuration**: Add `"scheme": "smartstudyhub"` to `mobile-expo/app.json`.
4. **Session Persistence**: Configure `initializeAuth` with `getReactNativePersistence(AsyncStorage)` in `src/services/firebase.ts`.
5. **Settings Cleanup**: Strip lines 164–195 (Система оценок), lines 231–246 (Идентификатор пакета), and lines 248–258 (Офлайн-режим) from `SettingsScreen.tsx`, and add Language selection and real-time Sync status.

---

## 5. Verification Method

1. **Verify TypeScript Compilation**:
   ```bash
   cd c:\projects\SmartStudyHub\mobile-expo
   npm run typecheck
   ```
   *Expected result after removing `google-signin`*: 0 errors (`tsc --noEmit` exits with code 0).
2. **Verify Metro Bundle Export**:
   ```bash
   npx expo export --dry-run
   ```
   *Expected result*: Bundles successfully without TurboModule resolution errors.
3. **Verify Settings Screen Cleanup**:
   - Inspect `src/modules/settings/SettingsScreen.tsx`: ensure no instances of "Офлайн-режим", "com.smartstudyhub.mobile", or static "5-балльная система (RU)" remain.
4. **Verify Zero Emojis**:
   ```powershell
   Select-String -Path "src\**\*.tsx" -Pattern "[\uD83C-\uDBFF\uDC00-\uDFFF]"
   ```
   *Expected result*: No matches found.
