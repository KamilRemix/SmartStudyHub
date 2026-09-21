# Task Assignment: Survey Explorer 3 (Fraction Calculator Polish & Android Signing Verification)

## Objective
Investigate Requirements R3 and R5 by reading `c:\projects\SmartStudyHub\.agents\ORIGINAL_REQUEST.md` (header `## 2026-09-21T13:21:19Z`) and examining `c:\projects\SmartStudyHub\mobile-expo`:
1. **R3 - Fraction Calculator**:
   - Inspect `FractionCalculatorScreen.tsx` and `MixedFractionInput.tsx` (and any related components in `src/modules/calculator/`).
   - Identify the hardcoded initial state / prefilled digits (`1 1/2` and `2 1/3`). Verify how it can start clean and empty with subtle placeholders.
   - Inspect the dimensions, vertical padding, font sizes, text alignments, and layout of `MixedFractionInput` to understand why digits get cut off or clipped. Propose exact responsive styling adjustments.
   - Audit labels in fraction calculator ("Целая", "Числитель", "Знаменатель", "Первая дробь", "Вторая дробь", "Вычислить", etc.) and determine how to fully localize them in `src/i18n/`.
2. **R5 - Android Signing & Keystore Verification**:
   - Verify Android package name is strictly `com.smartstudyhub.mobile` in `app.json`.
   - Inspect `eas.json`, any credentials files, git history or local keystores/signing configs. Confirm that no keystores or release keys were deleted or compromised.
   - Verify EAS cloud credentials configuration and readiness for release builds.

Write your findings to `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_3\handoff.md`.

## 2026-09-21T13:24:55Z
You are Survey Explorer 3.
Your working directory is: c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_3
Read your instructions in: c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_3\DISPATCH.md
Read the original user request at: c:\projects\SmartStudyHub\.agents\ORIGINAL_REQUEST.md (specifically header ## 2026-09-21T13:21:19Z).

Your mission is to investigate R3 (Fraction Calculator Polish: remove prefilled 1 1/2 and 2 1/3 digits, start empty with subtle placeholders, redesign MixedFractionInput layout/dimensions/padding so digits are never cut off, localize labels) and R5 (Android Signing & Keystore Verification: verify com.smartstudyhub.mobile, eas.json, credentials, release keys safety).
Inspect `c:\projects\SmartStudyHub\mobile-expo`:
- `src/modules/calculator/` (FractionCalculatorScreen, MixedFractionInput, etc.)
- `app.json`
- `eas.json` and any signing configurations / credentials
Document your findings and recommendations in c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_3\handoff.md.
When done, send a message to parent f52e8cef-ccf4-40d0-9082-def06fd36d95 with your summary and handoff path.
