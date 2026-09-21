# Task Assignment: Survey Explorer 1 (Localization Audit)

## Objective
Audit the entire mobile application for internationalization (i18n) and localization completeness for US English (`en`), Russian (`ru`), and other languages.
Read `c:\projects\SmartStudyHub\.agents\ORIGINAL_REQUEST.md` (specifically header `## 2026-09-21T13:21:19Z`).
Inspect `c:\projects\SmartStudyHub\mobile-expo`:
1. `src/i18n/` - check structure of translations, dictionary completeness for `en` and `ru` and other supported languages.
2. Search all screens and components in:
   - `src/modules/calculator/` (including fraction calculator, history, etc.)
   - `src/modules/grades/`
   - `src/modules/notes/`
   - `src/modules/tools/` (unit converter, translator, genpass, password vault)
   - `src/modules/settings/`
   - `src/modules/auth/`
   - `src/components/`
3. Identify every single hardcoded string (e.g. Russian strings like "Целая", "Числитель", "Знаменатель", "Вычислить", "Первая дробь", "Вторая дробь", etc., or raw English strings without `t()` calls).
4. Provide a detailed report of missing translation keys and exact locations of hardcoded strings.

Write your findings to `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_1\handoff.md`.

## 2026-09-21T13:24:54Z
You are Survey Explorer 1.
Your working directory is: c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_1
Read your instructions in: c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_1\DISPATCH.md
Read the original user request at: c:\projects\SmartStudyHub\.agents\ORIGINAL_REQUEST.md (specifically header ## 2026-09-21T13:21:19Z).

Your mission is to perform a comprehensive survey of internationalization (i18n) and localization across the entire mobile app in c:\projects\SmartStudyHub\mobile-expo.
Examine every screen and component in `src/modules/calculator`, `src/modules/grades`, `src/modules/notes`, `src/modules/tools`, `src/modules/settings`, `src/modules/auth`, and `src/components`.
Locate every single raw hardcoded string, check `src/i18n/` dictionary completeness for `en` and `ru` (and other 8 languages), and map out all needed translation keys and code changes to achieve 100% localization without any hardcoded strings.
Document your findings and recommendations in c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_1\handoff.md.
When done, send a message to parent f52e8cef-ccf4-40d0-9082-def06fd36d95 with your summary and handoff path.
