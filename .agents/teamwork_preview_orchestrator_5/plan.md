# Execution Plan: SmartStudyHub Mobile App Refinement

## Phase 0: Full Survey & Scope Mapping (Active)
- Dispatch 3 parallel Survey Explorers:
  - Explorer 1: i18n & Localization Audit across all modules, screens, and components.
  - Explorer 2: Auth (Google 4-color SVG logo, guest mode removal, Google/GitHub OAuth redirect fixes) & Settings (Cloud Sync card removal, Native Internet Requirement UI).
  - Explorer 3: Fraction Calculator (start empty, redesign layout/padding/dimensions, localize) & Android Signing Verification (EAS credentials, package `com.smartstudyhub.mobile`).
- Synthesize findings into updated `PROJECT.md` Feature Inventory & Milestone specifications.

## Phase 1: Milestones Execution
- **Milestone 1: R1 Localization Engine & Zero Hardcoded Strings**
  - Add missing translation keys across all 10 languages (primary focus on complete `en` and `ru`).
  - Replace every hardcoded Russian or English string in all screens/components with `t(...)`.
- **Milestone 2: R2 Authentic Google 4-Color Logo, Guest Mode Removal & Auth Fixes**
  - Implement official Google 4-color 'G' logo component using native SVG (`react-native-svg`).
  - Remove guest login button completely from `LoginScreen.tsx`.
  - Fix Google OAuth redirect logic for Expo Go & native builds.
  - Fix GitHub auth flow so login and registration succeed reliably.
- **Milestone 3: R3 Fraction Calculator Polish & Dynamic Layout**
  - Clear hardcoded initial state (`1 1/2` and `2 1/3`) -> start empty with placeholder guidance.
  - Redesign `MixedFractionInput` dimensions, vertical padding, font scaling to guarantee no cut-offs on any screen size.
  - Localize all labels and operations in fraction calculator.
- **Milestone 4: R4 Settings Cloud Sync Cleanup & Internet Requirement Modal**
  - Remove technical cloud sync card from `SettingsScreen.tsx`.
  - Implement sleek native-styled Internet Requirement modal / toast with retry button (Feather icons, NO emojis).
  - Connect internet requirement check to cloud sync, online translator, currency rates, and social sign-in.
- **Milestone 5: R5 Android Keystore & EAS Signing Verification**
  - Verify `app.json` package name `com.smartstudyhub.mobile`.
  - Inspect EAS credentials and keystores to confirm integrity and signing readiness.

## Phase 2: Dual Track E2E Testing & Quality Gate
- Run E2E test suite and typecheck gate: `npm run typecheck` in `mobile-expo` (0 errors).
- Reviewer, Challenger, and Forensic Auditor verification.
- Git commit rule verification for every milestone.
