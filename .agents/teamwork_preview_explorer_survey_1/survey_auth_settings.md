# Authoritative Survey Report: Mobile Auth Architecture & Settings Screen Audit

**Author**: Survey Explorer 1 (Codebase & Auth Explorer)  
**Date**: 2026-09-14  
**Target Directory**: `c:\projects\SmartStudyHub\mobile-expo`  
**Reference Document**: `ORIGINAL_REQUEST.md` (R1, R2, R4, R6, R10)  

---

## 1. Executive Summary

An exhaustive, read-only audit of `mobile-expo` was conducted to investigate the authentication subsystem, build configuration, and the Settings screen.

Key findings:
1. **Broken Build & TurboModule Crash**: `LoginScreen.tsx` (line 17) imports `@react-native-google-signin/google-signin` and invokes `GoogleSignin.configure(...)` at top-level module scope (line 22). This dependency is not installed in `package.json`, causing `tsc --noEmit` to fail (`TS2307: Cannot find module '@react-native-google-signin/google-signin'`). Even if installed, this library requires native binaries (`RNGoogleSignin`) that fail in standard Expo Go with a fatal `TurboModuleRegistry.getEnforcing(...)` crash.
2. **Missing Scheme in `app.json`**: `app.json` lacks a `"scheme"` property (e.g. `"scheme": "smartstudyhub"`), preventing `expo-auth-session` deep-link callbacks from returning cleanly from in-app Custom Tabs.
3. **Session Persistence Gap**: `src/services/firebase.ts` initializes Firebase Auth via `getAuth(app)` without `getReactNativePersistence(AsyncStorage)`, which prevents auth sessions from persisting across mobile app restarts.
4. **Obsolete Stubs in `SettingsScreen.tsx`**: Contains three deprecated stubs:
   - Lines 164–195: Static, non-functional duplicate "СИСТЕМА ОЦЕНОК" (5-балльная система (RU)).
   - Lines 231–246: Developer technical detail "Идентификатор пакета" (`com.smartstudyhub.mobile`).
   - Lines 248–258: Hardcoded misleading "Офлайн-режим: Активен" (always active regardless of connectivity).
5. **Rules Compliance**: 0 emojis were detected across all UI source files (100% compliant). All icons strictly use `@expo/vector-icons` (Feather). Firebase configuration strictly targets project `studio-9933447149-80d6a`.

---

## 2. Package & App Configuration Audit

### 2.1 File: `mobile-expo/package.json`

- **Expo SDK Version**: `"expo": "~57.0.22"`
- **React / React Native Versions**: `"react": "19.2.3"`, `"react-native": "0.86.3"`
- **Installed Auth & Browser Dependencies**:
  - `"expo-auth-session": "~57.0.12"` (Already installed)
  - `"expo-crypto": "~57.0.3"` (Already installed)
  - `"expo-web-browser": "~57.0.3"` (Already installed)
  - `"firebase": "^12.19.0"` (Already installed)
  - `"@react-native-async-storage/async-storage": "2.2.0"` (Already installed)
- **Dependency Discrepancy**:
  - `@react-native-google-signin/google-signin` is **NOT** declared in `dependencies` or `devDependencies`.
  - Yet `src/modules/auth/LoginScreen.tsx:17` imports from it, failing TypeScript compilation (`TS2307`).

### 2.2 File: `mobile-expo/app.json`

- **Name / Slug**: `"name": "SmartStudyHub"`, `"slug": "smartstudyhub"`
- **Version**: `"version": "1.0.2"` (note: `package.json` has `1.0.0`, `SettingsScreen.tsx` displays `v1.0.0`).
- **Android Package**: `"com.smartstudyhub.mobile"` (line 25 — strictly matches project guidelines).
- **iOS Bundle Identifier**: `"com.smartstudyhub.mobile"` (line 17).
- **Architecture**: `"newArchEnabled": false` (line 9).
- **Plugins Array (line 30–36)**:
  ```json
  "plugins": [
    "expo-asset",
    "expo-font",
    "expo-status-bar",
    "@react-native-google-signin/google-signin",
    "expo-web-browser"
  ]
  ```
  `"@react-native-google-signin/google-signin"` is listed in plugins despite not being an installed dependency and being incompatible with Expo Go.
- **Missing Configuration**:
  - **URL Scheme**: There is no `"scheme"` defined in `expo` root. To support `expo-auth-session` / `expo-web-browser` redirects, `"scheme": "smartstudyhub"` must be added.

---

## 3. Current Auth Architecture Inspection

### 3.1 `src/services/firebase.ts`
- **Firebase Project Details**:
  - `projectId`: `'studio-9933447149-80d6a'`
  - `authDomain`: `'studio-9933447149-80d6a.firebaseapp.com'`
  - `databaseURL`: `'https://studio-9933447149-80d6a-default-rtdb.firebaseio.com'`
  - `storageBucket`: `'studio-9933447149-80d6a.firebasestorage.app'`
  - `messagingSenderId`: `'121615915195'`
  - `appId`: `'1:121615915195:web:f2eb26c4c23530ef8e719e'`
- **Auth Initialization (line 25)**:
  `export const auth: Auth = getAuth(app);`
  - In React Native, `getAuth(app)` defaults to in-memory persistence. When the user closes or backgrounds the app, the session can be lost.
  - Metro resolves `@firebase/auth` to `dist/rn/index.js`, which exports `getReactNativePersistence`. Initializing with `initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })` provides durable persistence across restarts.

### 3.2 `src/services/auth.ts`
- Implements:
  - `registerWithEmail(email, password)`
  - `loginWithEmail(email, password)`
  - `logout()`
  - `resetPassword(email)`
  - `updateUserProfile(displayName)`
  - `subscribeToAuthChanges(callback)`
  - `signInWithGoogleCredential(idToken)` via `GoogleAuthProvider.credential(idToken)`
  - `signInWithGithubCredential(accessToken)` via `GithubAuthProvider.credential(accessToken)`
  - RTDB sync helpers: `saveUserData`, `getUserData`, `syncGradesToCloud`, `syncNotesToCloud`, `syncSettingsToCloud`.
- Missing capabilities:
  - `signInAnonymously(auth)` for guest / demo mode.
  - Cached offline session storage (`@ssh_cached_user`) in AsyncStorage for instant offline startup.

### 3.3 `src/context/AuthContext.tsx`
- Subscribes to `subscribeToAuthChanges`.
- Exposes `user: User | null`, `isLoading: boolean`, `isAuthenticated: boolean`.
- Clean, standard React Context provider.

### 3.4 `src/modules/auth/LoginScreen.tsx`
- **Lines 14–17**: Imports `GoogleSignin` from `@react-native-google-signin/google-signin`.
- **Lines 22–25**: Invokes `GoogleSignin.configure({ webClientId: '121615915195-kddc512lnra4b2eo2qjnnbuc0sb0pcbh.apps.googleusercontent.com' })` at top level.
- **Lines 66–86**: `handleGoogleSignIn` invokes `GoogleSignin.hasPlayServices()` and `GoogleSignin.signIn()`.
- **Lines 88–123**: `handleGithubSignIn` dynamically imports `expo-auth-session` and `expo-web-browser`. It opens an OAuth session to `https://github.com/login/oauth/authorize`, gets a `code`, but has no token-exchange mechanism, showing an error to the user.
- **Lines 159–198**: Social buttons for Google and GitHub:
  - Google: `#ffffff` background, `#dadce0` border, `#3c4043` text, Feather `globe` icon.
  - GitHub: `#24292e` background, `#ffffff` text, Feather `github` icon.

---

## 4. Root Cause of TurboModule Errors in Expo Go & The Solution

### 4.1 Root Cause Analysis

1. **Expo Go Architecture**: Expo Go is a sandboxed client application distributed with a fixed set of pre-compiled native modules. It does **not** allow arbitrary third-party native code that is not compiled into the Expo Go binary.
2. **Native Module Dependency**: `@react-native-google-signin/google-signin` requires custom Android native code (`com.reactnativegooglesignin.RNGoogleSigninPackage` / `RNGoogleSigninModule`) and iOS Objective-C pods.
3. **TurboModuleRegistry Failure**: When React Native starts up or evaluates `GoogleSignin.configure()`, it queries `TurboModuleRegistry.getEnforcing('RNGoogleSignin')`. Since Expo Go does not contain this native module, it throws:
   ```
   TurboModuleRegistry.getEnforcing(...): 'RNGoogleSignin' could not be found.
   Verify that a module by this name is registered in the native binary.
   ```
4. **Top-Level Execution Fatal Trap**: Because `GoogleSignin.configure(...)` is executed at file evaluation time (top-level scope of `LoginScreen.tsx`), importing `LoginScreen` anywhere (e.g. in `SettingsScreen.tsx:8`) triggers the crash immediately, even before the user navigates to the login screen.

### 4.2 Solution Architecture: Safe In-App Auth (Expo Go Compatible)

To satisfy **Requirement R1**:
> "Обеспечить вход через Google и GitHub без нативных бинарных библиотек, вызывающих ошибку TurboModuleRegistry в базовом Expo Go. Использовать expo-auth-session / WebBrowser (встроенный in-app Custom Tab / AuthSession sheet) с возвратом токена и связкой с Firebase Auth."

#### A. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Expo Go / Mobile App                          │
│                                                                         │
│  ┌───────────────────────┐              ┌────────────────────────────┐  │
│  │ Google Auth Button    │              │ GitHub Auth Button         │  │
│  └───────────┬───────────┘              └─────────────┬──────────────┘  │
│              │                                        │                 │
│              ▼                                        ▼                 │
│   expo-auth-session                        expo-web-browser             │
│   (Google.useIdTokenAuthRequest)           (openAuthSessionAsync)       │
│              │                                        │                 │
└──────────────┼────────────────────────────────────────┼─────────────────┘
               │                                        │
      In-App Custom Tab                        In-App Custom Tab
      (ASWebAuthSession)                       (ASWebAuthSession)
               │                                        │
               ▼                                        ▼
   https://accounts.google.com/             https://github.com/login/oauth
   (OAuth 2.0 ID Token)                     or Firebase Auth Handler
               │                                        │
               ▼                                        ▼
   smartstudyhub://redirect                 smartstudyhub://redirect
   id_token returned                        auth token returned
               │                                        │
               └───────────────────┬────────────────────┘
                                   ▼
                   Firebase Auth (JS SDK in Expo)
                     GoogleAuthProvider.credential(idToken)
                     GithubAuthProvider.credential(accessToken)
                     signInWithCredential(auth, credential)
                                   │
                                   ▼
                   Firebase Project: studio-9933447149-80d6a
                                   │
                                   ▼
                   Persistence: AsyncStorage (@ssh_cached_user)
                   Fallback: signInAnonymously / Demo Mode
```

#### B. Concrete Implementation Specifications

1. **`app.json` Adjustments**:
   - Add `"scheme": "smartstudyhub"` to `expo` object.
   - Remove `"@react-native-google-signin/google-signin"` from `plugins`.

2. **In-App Google Authentication via `expo-auth-session`**:
   - Use `expo-auth-session/providers/google`'s `useIdTokenAuthRequest` or direct `AuthRequest`:
     ```ts
     import * as WebBrowser from 'expo-web-browser';
     import * as Google from 'expo-auth-session/providers/google';
     import { makeRedirectUri } from 'expo-auth-session';

     WebBrowser.maybeCompleteAuthSession();

     const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
       clientId: '121615915195-kddc512lnra4b2eo2qjnnbuc0sb0pcbh.apps.googleusercontent.com',
       // Strictly profile & email per AGENTS.md rule
       scopes: ['profile', 'email'],
       redirectUri: makeRedirectUri({ scheme: 'smartstudyhub' }),
     });
     ```
   - When `response?.type === 'success'`:
     ```ts
     const { id_token } = response.params;
     await signInWithGoogleCredential(id_token);
     ```
   - This opens an in-app Custom Tab / AuthSession sheet, smoothly returns to `smartstudyhub://`, and signs into Firebase Auth without requiring any native TurboModules.

3. **In-App GitHub Authentication**:
   - Route via Firebase Auth's official redirect handler:
     `https://studio-9933447149-80d6a.firebaseapp.com/__/auth/handler`
     OR provide an in-app AuthSession with safe fallback.
   - If GitHub code cannot be exchanged without a server proxy, provide:
     1. Graceful explanation to user without crashing.
     2. Instant 1-click **"Демо-режим / Гостевой вход"** using `signInAnonymously(auth)`:
        ```ts
        export const loginAsGuest = async (): Promise<UserCredential> => {
          return signInAnonymously(auth);
        };
        ```
     3. Local session fallback (`ssh_cached_user` in AsyncStorage) so all app features are unlocked immediately even offline.

4. **Session Persistence**:
   - Update `src/services/firebase.ts`:
     ```ts
     import { initializeApp, getApps, getApp } from 'firebase/app';
     import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
     import AsyncStorage from '@react-native-async-storage/async-storage';

     const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
     export const auth = !getApps().length
       ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
       : getAuth(app);
     ```

---

## 5. Audit of Obsolete Stubs in `SettingsScreen.tsx`

`SettingsScreen.tsx` contains 337 lines. An inspection identified the following items for cleanup (Requirement R10):

### 5.1 Obsolete Stubs to Remove

| Component / Section | Line Numbers | Current Content | Reason for Removal |
| :--- | :--- | :--- | :--- |
| **Система оценок** | Lines 164–195 | Section "СИСТЕМА ОЦЕНОК" with card "Шкала оценок: 5-балльная система (RU)" | **Duplicate Stub**. Grade scales, 5-point/US scales, and custom thresholds are configured directly inside `GradesScreen.tsx`. This settings card is non-interactive and redundant. |
| **Идентификатор пакета** | Lines 231–246 | Row with Feather `shield`: "Идентификатор пакета: com.smartstudyhub.mobile" | **Technical Bootstrap Placeholder**. Package names are internal developer configuration, not end-user settings. |
| **Офлайн-режим** | Lines 248–258 | Row with Feather `check-circle`: "Офлайн-режим: Активен" (hardcoded green) | **Misleading Static Stub**. Always displays "Активен" even when connected to Wi-Fi/cellular. Must be replaced by real network detection or removed from Settings per R6 and R10. |

### 5.2 Target Structure for `SettingsScreen.tsx` (R10 Compliance)

Under Requirement R10:
> "Очистка Настроек:  
> - Удалить лишние и неактуальные пункты: заглушку оффлайн-режима, отображение имени пакета.  
> - Удалить дублирующуюся плашку шкалы оценок (так как выбор шкалы производится в самом калькуляторе оценок).  
> - Оставить: Профиль/Авторизация, Выбор языка, Переключение темы, Статус облачной синхронизации."

The target structure of `SettingsScreen.tsx` must be:
1. **АККАУНТ (Account)**:
   - If authenticated: Avatar, Display Name, Email, Provider badges (Google/GitHub/Email/Guest), and "Выйти из аккаунта" button.
   - If unauthenticated: "Войти в аккаунт" button navigating to auth flow or opening modal.
2. **ЯЗЫК ИНТЕРФЕЙСА (Language Selector - R2)**:
   - Language selector supporting RU, EN, UK, BE, KK, ES, DE, FR, TR, ZH backed by `public/translations.js` keys and AsyncStorage.
3. **ВНЕШНИЙ ВИД (Appearance)**:
   - "Тема оформления" with light/dark toggle button.
4. **ОБЛАЧНАЯ СИНХРОНИЗАЦИЯ (Cloud Sync Status - R4)**:
   - Real-time status display: "Синхронизировано" (with last sync timestamp) when online and authenticated, "Требуется вход" when guest, or "Офлайн • Данные сохранены локально" when offline.
5. **О ПРИЛОЖЕНИИ (About)**:
   - "Версия сборки": `v1.0.2` (matching `app.json`).

---

## 6. Strict Project Rules & Compliance Audit

### 6.1 Emoji Ban Audit
- **Rule**: "Категорически ЗАПРЕЩЕНО использовать эмодзи (никаких 🚫, 🛡️, ✨, 📱, 🎉, 🚀 и т.д.) в интерфейсе приложения, модальных окнах, уведомлениях и кнопках."
- **Audit Method**: Full-text regex search across `mobile-expo/src` for Unicode emoji ranges (`\x{1F600}-\x{1F64F}`, `\x{1F300}-\x{1F5FF}`, etc.).
- **Result**: **0 emojis detected** in the codebase.

### 6.2 Icon Library Audit
- **Rule**: "Для иконок использовать исключительно векторную библиотеку Feather Icons (feather-icons) или нативный SVG."
- **Audit Method**: Grep search for icon imports across `mobile-expo/src`.
- **Result**: All 24 component files importing icons use `import { Feather } from '@expo/vector-icons'`.

### 6.3 Firebase Project ID Audit
- **Rule**: "Единственный разрешенный проект: `studio-9933447149-80d6a`. Запрещено создавать новые проекты или переключать проект."
- **Audit Method**: Inspection of `src/services/firebase.ts`.
- **Result**: Exactly points to `studio-9933447149-80d6a` (Auth domain: `studio-9933447149-80d6a.firebaseapp.com`, RTDB: `https://studio-9933447149-80d6a-default-rtdb.firebaseio.com`).

### 6.4 Social Sign-In Buttons Style Audit
- **Rule**: Google button must have white background, `#dadce0` border, `#3c4043` text. GitHub button must have `#24292e` or `#000000` background, white text. No outdated 2010s styling, no emojis.
- **Current State in `LoginScreen.tsx`**:
  - `styles.googleBtn`: `backgroundColor: '#ffffff'`, `borderColor: '#dadce0'`, text `#3c4043`.
  - `styles.githubBtn`: `backgroundColor: '#24292e'`, text `#ffffff`.
  - Complies with modern brand guidelines.

---

## 7. Concrete Architectural Recommendations for Implementers

| Area | Recommended Action | Target File(s) |
| :--- | :--- | :--- |
| **Fix Compilation & Expo Go Crash** | Remove `@react-native-google-signin/google-signin` imports and `GoogleSignin.configure(...)`. Replace with `expo-auth-session` and `expo-web-browser`. | `src/modules/auth/LoginScreen.tsx`, `app.json` |
| **Add App Scheme** | Add `"scheme": "smartstudyhub"` to `app.json` to enable OAuth return redirects. | `app.json` |
| **Persistent Auth** | Add `getReactNativePersistence(AsyncStorage)` to Firebase Auth initialization. | `src/services/firebase.ts` |
| **Guest / Demo Mode** | Add `signInAnonymously(auth)` and local mock user fallback to `auth.ts` and `LoginScreen.tsx`. | `src/services/auth.ts`, `src/modules/auth/LoginScreen.tsx` |
| **Settings Cleanup** | Remove duplicate "Система оценок" card, "Идентификатор пакета", and static "Офлайн-режим" stub. Add Language selector and Cloud Sync indicator. | `src/modules/settings/SettingsScreen.tsx` |
