# Task Assignment: Survey Explorer 2 (Google SVG Logo, Auth Fixes, Settings Cleanup, Network Modal)

## Mission
You are Survey Explorer 2 for the SmartStudyHub Mobile App Refinement.
Your working directory is: `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_r1_2`
Project root: `c:\projects\SmartStudyHub`
Mobile app directory: `c:\projects\SmartStudyHub\mobile-expo`
User request: `c:\projects\SmartStudyHub\.agents\ORIGINAL_REQUEST.md` (under header `## 2026-09-21T13:21:19Z`).

## Scope & Instructions (Requirements R2 and R4)
1. **R2 - Google 4-Color SVG Logo & Guest Mode Removal**:
   - Inspect `src/modules/auth/LoginScreen.tsx` and auth components.
   - Replace the single-color red Google icon with the authentic official Google 4-color 'G' logo (`#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`) rendered via SVG (`react-native-svg`). Check if `react-native-svg` is installed or needs to be installed.
   - Completely remove "Войти как гость (Демо-режим)" from the Login screen and any related guest login buttons.
2. **R2 - Google & GitHub Mobile Auth Fixes**:
   - Investigate why Google OAuth redirect causes "Доступ заблокирован: ошибка авторизации" in Expo Go and native builds. Examine `app.json` schemes, `AuthContext.tsx`, `firebase.ts`, redirect URIs, clientId configuration.
   - Investigate GitHub auth flow in mobile: check how it is implemented, why registration/login fails or isn't reliable, and identify exact fixes.
3. **R4 - Settings Cloud Sync Card Removal**:
   - Inspect `src/modules/settings/SettingsScreen.tsx`. Identify the technical "Cloud Sync / studio-9933447149-80d6a / sync status" card and specify its clean removal.
4. **R4 - Native Internet Requirement Modal / Toast with Retry**:
   - Check where internet connectivity is required: cloud sync, online translator, currency rates, social sign-in.
   - Check existing network detector (`src/services/network.ts`).
   - Design a sleek, native-styled Internet Requirement modal / toast with a clear retry capability.
   - STRICT CONSTRAINT: Absolutely NO emojis in the UI, modal, toast, or buttons (Feather icons or native SVG only!).

Write your report to: `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_r1_2\handoff.md`.
Follow the Handoff Protocol (Observation, Logic Chain, Caveats, Conclusion, Verification Method).
When complete, send a message to parent f52e8cef-ccf4-40d0-9082-def06fd36d95 with your summary and handoff path.

30: ## 2026-09-21T14:13:11Z
31: **From**: parent (d7ec434a-0c7e-4703-82fa-697fad2301bc)
32: **Context**: Urgent Directive from Parent Orchestrator
33: **Content**: R2, R3, R4, and R5 have ALREADY been completed and committed by the main agent (Google logo SVG, Fraction calculator initial state & keys, Settings Cloud Sync card replaced with NetworkStatusCard, Keystore verified, socialLoading type fixed). Do NOT duplicate or re-implement any of R2, R3, R4, or R5!
34: Instead, redirect your audit focus 100% to R1 Localization for `src/modules/tools/` (UnitConverterScreen, TranslatorScreen, GenPassScreen, PasswordVault, etc.):
35: - Search for any raw hardcoded Russian (or unlocalized English) strings, labels, placeholders, alerts, or button texts.
36: - Catalog all existing vs missing keys in `src/i18n/`.
37: - Provide exact keys and translations needed in RU and EN (and other languages).
38: - Write your findings to your handoff.md.
39: **Action**: Focus solely on auditing `src/modules/tools/` for R1 localization.
