# Project: SmartStudyHub Mobile Expo Comprehensive Overhaul

## Architecture
- **Platform**: Expo SDK (Managed Workflow), React Native, TypeScript
- **Target Codebase**: `c:\projects\SmartStudyHub\mobile-expo`
- **Strict Invariants**:
  - NO emojis in UI, buttons, alerts, badges, or modals.
  - Feather icons (`@expo/vector-icons`) or native SVG exclusively.
  - Single allowed Firebase project: `studio-9933447149-80d6a`.
  - Android package name: strictly `com.smartstudyhub.mobile` in `app.json`.
  - Git commit after every completed task/feature: `git add .` && `git commit -m "..."`.
  - No blocking `alert()` or `if (false)` stubs.
  - Save all files in UTF-8 without BOM.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Safe Expo Go Auth (R1) | Google & GitHub via `expo-auth-session` & `WebBrowser` Custom Tabs linked to Firebase Auth, zero TurboModule crashes, demo/guest fallback | M1 | Survey 1 |
| 2 | Settings Cleanup (R10) | Remove fake offline stub, package name display, duplicate grade scale; retain Profile, Language, Theme, Cloud Sync | M1 | Survey 1 |
| 3 | i18n Localization System (R2) | 10 languages (`ru, en, uk, be, kk, es, de, fr, zh, tr`) from `public/translations.js`, typed dictionaries, `I18nProvider` & `useI18n`, AsyncStorage persistence | M2 | Survey 2 |
| 4 | Reactive Language Switching (R2) | Language selector in Settings, instant UI updates across screens without reload | M2 | Survey 2 |
| 5 | Custom Grade Thresholds (R3) | Free editing of numeric and percentage thresholds in `GradesScreen`, fix GPA hardcoding in `gradeMath.ts`, AsyncStorage & Firebase sync | M3 | Survey 2 |
| 6 | Real Network Detector (R6) | NetInfo event listener, non-intrusive offline banner ("Автономный режим • Данные сохранены локально"), reconnect toast with auto-sync | M4 | Survey 3 |
| 7 | Firebase Realtime DB Cloud Sync (R4) | Two-way sync for auth users: calc history (capped at 10), grades, notes, passwords, user settings; auto-sync on login and reconnect | M4 | Survey 2 |
| 8 | GenPass Continuous Slider (R7) | Smooth gesture slider supporting any integer length 4 to 64 without jumping | M5 | Survey 3 |
| 9 | HIBP Leak Check (R5) | k-anonymity SHA-1 range query to HaveIBeenPwned API, display breach count and security assessment | M5 | Survey 3 |
| 10 | Password Vault "Мои пароли" (R5) | Service, login, password, copy, delete, bookmarks/favorites, local storage & cloud sync | M5 | Survey 3 |
| 11 | Advanced Notes Photos (R8) | Photo attachments via `expo-image-picker`, image carousel/preview, remove, metadata sync | M6 | Survey 3 |
| 12 | Advanced Notes Reminders (R8) | Scheduled local reminders via `expo-notifications`, Android notification channel, date/time picker | M6 | Survey 3 |
| 13 | Responsiveness & Overflow Fixes (R9) | Fix 10 Cyrillic overflow bottlenecks with `flexShrink: 1`, flexWrap, padding across cards, tabs, and headers | M6 | Survey 3 |
| 14 | Final E2E Test Suite & Build Verification | Pass 100% E2E tests across Tiers 1-4, `npx tsc --noEmit` = 0 errors, clean Metro export | M7 | Dual Track |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Auth & Settings Cleanup | Fix TurboModule crash, implement safe Google/GitHub auth in Expo Go, Firebase persistence, clean SettingsScreen | none | READY |
| M2 | i18n Localization Engine | 10-language dictionary, I18nContext, AsyncStorage persistence, Settings language picker, screen localization | M1 | PLANNED |
| M3 | Custom Grade Thresholds & Math Engine | ThresholdsModal custom editing, gradeMath.ts bugfixes, percentage & GPA recalculations, local persistence | none | PLANNED |
| M4 | Cloud Sync & Network Detection | NetInfo detector, offline banner & reconnect toast, Firebase RTDB two-way sync for history, grades, notes, vault, settings | M1, M3 | PLANNED |
| M5 | GenPass Evolution (Slider, HIBP & Vault) | Continuous 4-64 slider, HaveIBeenPwned SHA-1 leak check, Password Vault ("Мои пароли") | M4 | PLANNED |
| M6 | Advanced Notes & UI Responsiveness | Photos via expo-image-picker, reminders via expo-notifications, Cyrillic overflow layout polish | M4 | PLANNED |
| M7 | E2E Testing, Hardening & Audit | 100% E2E test pass, TypeScript 0 errors, Metro export verification, Forensic Audit | M1-M6 | PLANNED |

## Interface Contracts
### Auth & Firebase
- `src/services/firebase.ts`: Export initialized `auth`, `database`, with AsyncStorage persistence.
- `src/context/AuthContext.tsx`: `currentUser: User | null`, `signInWithGoogle: () => Promise<void>`, `signInWithGithub: () => Promise<void>`, `signInAsGuest: () => Promise<void>`, `signOut: () => Promise<void>`.

### i18n
- `src/i18n/translations.ts`: Supported languages `ru`, `en`, `uk`, `be`, `kk`, `es`, `de`, `fr`, `zh`, `tr`.
- `src/i18n/I18nContext.tsx`: `language: SupportedLanguage`, `setLanguage: (lang: SupportedLanguage) => Promise<void>`, `t: (key: string, params?: Record<string, string>) => string`.

### Sync & Network
- `src/services/network.ts`: `isOnline: boolean`, `subscribeNetworkChange: (cb: (online: boolean) => void) => () => void`.
- `src/services/cloudSync.ts`: `syncAll(uid: string): Promise<SyncResult>`, `syncModule(uid: string, module: 'grades'|'notes'|'passwords'|'history'|'settings'): Promise<void>`.

### Code Layout
- `mobile-expo/src/i18n/`: Localization dictionaries, context, hook
- `mobile-expo/src/services/`: Firebase, auth, cloudSync, network, pwnedApi, notificationService
- `mobile-expo/src/modules/auth/`: LoginScreen, AuthModal
- `mobile-expo/src/modules/grades/`: GradesScreen, ThresholdsModal, gradeMath
- `mobile-expo/src/modules/calculator/`: CalculatorScreen, calcHistoryStorage
- `mobile-expo/src/modules/notes/`: NotesScreen, NoteCard
- `mobile-expo/src/modules/tools/`: GenPassScreen (with Vault), UnitConverterScreen, TranslatorScreen
- `mobile-expo/src/modules/settings/`: SettingsScreen
- `mobile-expo/src/components/`: OfflineBanner, Toast, UI components
