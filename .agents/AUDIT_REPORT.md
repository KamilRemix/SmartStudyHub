# Differences Audit Report: Legacy SmartStudyHub Web vs React Native Expo App

**Date**: 2026-09-13  
**Auditors**: Teamwork Preview Explorers 1, 2, 3  
**Status**: Completed  

---

## Executive Summary

A comprehensive multi-vector audit was conducted across all core modules comparing the legacy SmartStudyHub web codebase (`public/renderer.js`, `public/notes.js`, `public/genpass.js`, `public/translator.js`, `public/js/calculator.js`, `public/js/firebase-init.js`) against the React Native Expo app (`mobile-expo/src/`).

The mobile Expo codebase (`mobile-expo/src/`) already contains a high-quality, typed, theme-aware foundation. The core mathematical engines, layout structures, and design tokens are in place. However, several specific business logic capabilities, user interaction handlers (especially clipboard copying and sorting), endpoint configurations, and the entire Firebase cloud synchronization layer (`studio-9933447149-80d6a`) are missing or require restoration.

---

## 1. Module-by-Module Differences & Missing Capabilities

### 1.1 Calculator (`mobile-expo/src/modules/calculator/`)
- **Implemented in Mobile**:
  - Shunting-Yard RPN expression parser with bracket precedence, implicit multiplication, unary negation, percentage calculation, and 12-digit precision (`parseFloat(val.toPrecision(12))`).
  - Fraction calculator matching web LCM, GCD, mixed fractions, 4 operations, and 5-step native resolution breakdown (`FractionStepRenderer.tsx`).
  - AsyncStorage calculation tape history (`@smartstudy_calc_history`, max 50 records) with recall on tap (an enhancement over web).
- **Missing / Gap in Mobile**:
  - `StandardCalculatorView.tsx:37` operator replacement logic (`if (isOp && isPrevOp) return prev.slice(0, -1) + char;`) prevents typing negative multipliers/divisors like `5 × -2`. It needs to allow `-` immediately following `×` or `÷`.

### 1.2 Grade Average (`mobile-expo/src/modules/grades/`)
- **Implemented in Mobile**:
  - Weighted grade coefficients (1.0x, 1.5x, 2.0x, 3.0x).
  - Academic periods: 4 Quarters (`q1`-`q4`) and 2 Semesters (`s1`-`s2`), plus annual summary table (`AnnualTableCard.tsx`).
  - What-If simulations (`WhatIfModal.tsx`) and Strategy Engine (`StrategyEngineCard.tsx`) with closed-form solver.
  - AsyncStorage persistence (`@smartstudy_grades_data`).
- **Missing / Gaps in Mobile**:
  1. **Quick Calc Mode (`__QUICK_CALC__`)**: Legacy web provided an instant, unpersisted quick calculation mode ("Быстрый подсчет (локально)") allowing ad-hoc grade averaging without creating an explicit named subject.
  2. **Editable Thresholds**: `ThresholdsModal.tsx` currently renders static text rather than editable inputs for custom grade boundaries (Excellent, Good, Satisfactory).
  3. **Firebase Cloud Sync**: No cloud sync to Firestore/RTDB. Needs schema adapter between legacy web format `{ [subject]: number[] }` and mobile object array `SubjectItem[]`.

### 1.3 Notes (`mobile-expo/src/modules/notes/`)
- **Implemented in Mobile**:
  - Full CRUD operations with title, content, checklist items, tags, 10-color palette, search, pinning, and grid/list view toggle.
  - AsyncStorage persistence (`@smartstudy_notes_data`).
- **Missing / Gaps in Mobile**:
  1. **Temporal Sorting**: In `NotesScreen.tsx`, notes are filtered but not sorted by `updatedAt` descending (`(a, b) => b.updatedAt - a.updatedAt`), causing notes to stay in arbitrary array order instead of having newly edited notes rise to the top.
  2. **Clipboard Copy**: In `NoteCard.tsx`, actions only include pin toggle and delete. Copying note text/content to clipboard is missing.
  3. **Firebase Cloud Sync**: No sync to Firebase Realtime Database (`users/${uid}/notes`) or conflict resolution between cloud and local timestamps.

### 1.4 Tools Module (`mobile-expo/src/modules/tools/`)
- **Unit Converter (`UnitConverterScreen.tsx`)**:
  - Length, mass, and temperature formulas have 100% mathematical parity with legacy web.
  - *Gaps*: Result card lacks a copy-to-clipboard button. Unit swap logic overwrites `fromValue` with the rounded output rather than exact value.
- **Currency Converter (`CurrencyConverterScreen.tsx`)**:
  - Exchange rate fetching via `open.er-api.com` with AsyncStorage caching works properly.
  - *Gaps*: Lacks a copy-to-clipboard button on the result. Lacks currency symbol formatting and popular currency pairs quick list.
- **Translator (`TranslatorScreen.tsx`)**:
  - Speech synthesis (`expo-speech`), swap, and favorites cards are implemented.
  - *Gaps*:
    1. Endpoint issue: Currently uses `api.mymemory.translated.net` which has severe daily IP rate limits (HTTP 429 quota exhaustion). Must be switched to Google Translate single `gtx` endpoint (`https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=...`).
    2. Lacks a copy-to-clipboard button on the target translated card.
    3. Translation favorites are not synchronized to Firestore (`users/{uid}/translator_favorites`).
- **Password Generator & Analyzer (`GenPassScreen.tsx`)**:
  - Password generator with length, uppercase, lowercase, digits, special characters, entropy calculation, and clipboard copy works.
  - *Gaps*: Legacy web had a full Password Analyzer (0-100% score, 5 checklist rules, crack time estimation, and HaveIBeenPwned API SHA-1 range breach check) and a Password Vault. These analysis algorithms can be incorporated cleanly into the screen.

### 1.5 Firebase Integration (`studio-9933447149-80d6a`)
- **Legacy Configuration**:
  - Project ID: `studio-9933447149-80d6a`
  - Auth Domain: `studio-9933447149-80d6a.firebaseapp.com`
  - Database URL: `https://studio-9933447149-80d6a-default-rtdb.firebaseio.com`
  - Storage Bucket: `studio-9933447149-80d6a.appspot.com`
  - Messaging Sender ID: `9933447149`
  - App ID: `1:9933447149:web:5d2fc7a3bbdebb4a7732a3`
- **Missing in Mobile**:
  - Firebase JS SDK is not installed in `mobile-expo/package.json`.
  - No Firebase initialization file exists in `mobile-expo/src/services/firebase/`.
  - No auth state provider, login modal, or cloud sync service exists.
  - Russian Auth rule from `AGENTS.md`: VK ID PKCE flow should be respected without routing VK through Firebase OIDC.

---

## 2. Implementation Roadmap (Milestone Breakdown)

1. **Milestone 2 (R2)**: Calculator & Grade Average Logic Porting
   - Fix operator chaining in `StandardCalculatorView.tsx` to permit negative multipliers (`5 × -2`).
   - Add Quick Calc mode (`__QUICK_CALC__`) chip and logic to `GradesScreen.tsx`.
   - Wire editable threshold inputs in `ThresholdsModal.tsx`.
   - Verify calculation history tape persistence.
   - Run typecheck & UI preservation checks.

2. **Milestone 3 (R3)**: Notes & Tools Logic Porting
   - Add `updatedAt` descending sort to `NotesScreen.tsx`.
   - Add copy-to-clipboard action to `NoteCard.tsx` using `expo-clipboard`.
   - Add copy-to-clipboard action to `UnitConverterScreen.tsx`, `CurrencyConverterScreen.tsx`, and `TranslatorScreen.tsx`.
   - Switch Translator API endpoint to Google Translate `gtx` single endpoint.
   - Port password strength checklist and crack time estimation into `GenPassScreen.tsx`.
   - Run typecheck & UI preservation checks.

3. **Milestone 4 (R4)**: Firebase Integration (`studio-9933447149-80d6a`)
   - Install `firebase` JS SDK (`^11.4.0`) in `mobile-expo`.
   - Create `src/services/firebase/firebaseConfig.ts` configured for `studio-9933447149-80d6a` with `getReactNativePersistence(AsyncStorage)`.
   - Implement `authService.ts` (email/password sign-in, sign-up, sign-out, onAuthStateChanged, anonymous fallback).
   - Implement `cloudSyncService.ts` for bidirectional synchronization of Notes, Grades, and Translator Favorites with schema adapters and offline AsyncStorage fallback.
   - Add Cloud Sync / Account management card & login modal into `SettingsScreen.tsx` preserving 100% of existing UI styles.

4. **Milestone 5 (R5 & Acceptance)**: Full Verification & Acceptance
   - Execute `npx tsc --noEmit` in `mobile-expo/` (must return 0 errors).
   - Execute `npx expo export` in `mobile-expo/` (Metro bundle must compile cleanly).
   - Verify `git diff` against baseline to guarantee zero destructive layout changes.
   - Forensic integrity audit & adversarial test verification.
   - Final victory report to Sentinel.
