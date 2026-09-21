# Project: SmartStudyHub Mobile App Refinement

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
  - Quality gate: `npm run typecheck` in `mobile-expo` must pass with 0 errors.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | R1 Localization Dictionary Expansion | Add 120+ missing keys across US English (`en`), Russian (`ru`), and other 8 languages in `src/i18n/translations.ts` | M1 | Survey 1, 2, 3 |
| 2 | R1 Screen & Component Localization | Connect `useI18n()` and replace all raw hardcoded strings in Calculator, Grades, Notes, Tools, Auth, Navigation, and Components | M1 | Survey 1, 2, 3 |
| 3 | R2 Authentic Google 4-Color SVG Logo & Guest Mode Removal | Official Google 4-color 'G' logo SVG (#4285F4, #34A853, #FBBC05, #EA4335) in LoginScreen; removed guest mode | M2 | Commit 1515b35 (DONE) |
| 4 | R3 Fraction Calculator Polish | Initial state {whole:0, numerator:0, denominator:1}, widened inputs, 0 vertical padding, localized labels | M3 | Commit 6f995cc (DONE) |
| 5 | R4 Settings Cloud Sync Card Removal & NetworkStatusCard | Remove technical card, add graceful network status indicator & offline toast | M4 | Commit 6f995cc (DONE) |
| 6 | R5 Android Keystore & EAS Signing Verification | Package com.smartstudyhub.mobile preserved, EAS cloud signing verified safe | M5 | Commit 1515b35 (DONE) |
| 7 | Verification & Quality Gate | npm run typecheck = 0 errors, full static Cyrillic grep audit | M6 | Quality Gate |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Complete US English & Russian Localization | Full i18n dictionary + screen refactoring for zero hardcoded strings | none | IN_PROGRESS |
| M2 | Google SVG Logo & Guest Mode Removal | Official 4-color Google G logo, guest mode removed | none | DONE |
| M3 | Fraction Calculator Input Polish | Empty initial state, spacious input boxes, localized labels | none | DONE |
| M4 | Settings Cloud Sync Card Removal | Technical card removed, NetworkStatusCard integrated | none | DONE |
| M5 | Android Signing & Keystore Verification | Verified package name & EAS cloud credentials safety | none | DONE |
| M6 | Quality Gate & Verification | npm run typecheck with 0 errors, git commit, review & audit | M1-M5 | PLANNED |

## Code Layout
- `mobile-expo/src/i18n/translations.ts`: Master translations dictionary
- `mobile-expo/src/modules/calculator/`: StandardCalculatorView, FractionCalculatorView, MixedFractionInput, HistoryTapeView
- `mobile-expo/src/modules/grades/`: GradesScreen, ThresholdsModal, WhatIfModal, AddSubjectModal, SubjectDetailCard, StrategyEngineCard, AnnualTableCard, GradeInputKeypad, PeriodSelectorBar
- `mobile-expo/src/modules/tools/`: UnitConverterScreen, CurrencyConverterScreen, TranslatorScreen, GenPassScreen
- `mobile-expo/src/modules/auth/`: LoginScreen, RegisterScreen, GoogleLogoIcon
- `mobile-expo/src/modules/notes/`: NotesScreen, NoteCard, NoteEditorModal, TagFilter, ColorPicker
- `mobile-expo/src/modules/settings/`: SettingsScreen, NetworkStatusCard
- `mobile-expo/src/components/`: OfflineBanner, AppHeader
- `mobile-expo/src/navigation/`: BottomTabNavigator
