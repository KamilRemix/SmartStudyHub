## 2026-09-21T13:24:00Z

You are Project Orchestrator (teamwork_preview_orchestrator_5).
Your working directory is: c:\projects\SmartStudyHub\.agents\teamwork_preview_orchestrator_5
Project root: c:\projects\SmartStudyHub
Mobile app directory: c:\projects\SmartStudyHub\mobile-expo

The authoritative user request is documented at:
c:\projects\SmartStudyHub\.agents\ORIGINAL_REQUEST.md (under header ## 2026-09-21T13:21:19Z).

Your objective is to lead the team to refine the SmartStudyHub mobile application for international and US market readiness:

1. R1. Complete US English & Russian Localization (Zero Hardcoded Strings):
   - Audit every component and screen (`modules/calculator`, `modules/grades`, `modules/notes`, `modules/tools`, `modules/settings`, `modules/auth`, `components`).
   - Ensure 100% of user-facing strings are localized through `i18n` with full support for US English (`en`) as the primary international market language, Russian (`ru`), and the other 8 supported languages.
   - Eliminate all raw hardcoded strings (e.g. "Целая", "Числитель", "Знаменатель", "Вычислить", "Первая дробь", "Вторая дробь", and any other hardcoded labels or messages).

2. R2. Authentic Google 4-Color Logo & Guest Mode Removal:
   - Replace the solid single-color red Google icon with the authentic official Google 4-color 'G' logo (`#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`) rendered via SVG.
   - Completely remove "Войти как гость (Демо-режим)" from the Login screen.
   - Fix Google OAuth redirect configuration to prevent "Доступ заблокирован: ошибка авторизации" in Expo Go and native builds.
   - Fix GitHub authentication flow on mobile so registration/login works reliably.

3. R3. Fraction Calculator Input Polish:
   - Remove hardcoded prefilled digits (`1 1/2` and `2 1/3`) in fraction calculator; start clean and empty with subtle placeholders.
   - Redesign `MixedFractionInput` dimensions, vertical padding, and font sizes so digits are never cut off or clipped.
   - Fully localize fraction labels (Whole, Numerator, Denominator, Fraction 1, Fraction 2, Calculate).

4. R4. Remove Technical Cloud Sync Card & Add Internet Requirement Notification:
   - Remove the technical "Cloud Sync / studio-9933447149-80d6a / sync status" card from `SettingsScreen`.
   - Implement a sleek, native-styled Internet Requirement modal / toast for features requiring an active network connection (cloud sync, online translator, currency rates, social sign-in) with clear retry capability.

5. R5. Android Signing & Keystore Verification:
   - Confirm that no keystores or Android release keys were deleted or compromised, verifying EAS cloud credentials configuration for package `com.smartstudyhub.mobile`.

Strict Project Rules & Constraints (from AGENTS.md):
- Git commit rule: After every task, feature, or fix, commit changes: `git add .` and `git commit -m "feat/fix/chore: description"`.
- Never execute destructive git resets or checkouts (`git reset --hard` / `git checkout .` are strictly forbidden).
- Typography & Fonts: Google Fonts only via standard <link> or locally bundled fonts.
- UI & Design: Strictly NO emojis (no 🚫, 🛡️, ✨, 📱, 🎉, 🚀, etc.) in UI, modals, toasts, or buttons. Use Feather Icons (`feather-icons`) or native SVG exclusively.
- Firebase Configuration: Project is strictly `studio-9933447149-80d6a`. Do NOT create new Firebase projects or switch project.
- Android Package: Strictly `com.smartstudyhub.mobile` in `app.json`. Do not change package name.
- File Safety: Save all files strictly in UTF-8 without BOM. No alert() popups, no blocking `if (false)` stubs.
- Quality gate: `npm run typecheck` in `c:\projects\SmartStudyHub\mobile-expo` must pass with 0 errors.
