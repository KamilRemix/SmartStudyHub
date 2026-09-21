# DISPATCH: Worker M2 (i18n Localization Engine Implementation)

## Identity
- Archetype: teamwork_preview_worker
- Role: Implementation Worker
- Working Directory: c:\projects\SmartStudyHub\.agents\teamwork_preview_worker_m2_gen4_1
- Parent: teamwork_preview_orchestrator_4 (Conversation ID: e0dc7ad3-ae98-41f7-99ee-1d3aa3b332ed)

## Context & Inputs
- Project specification: c:\projects\SmartStudyHub\.agents\PROJECT.md
- Authoritative user request: c:\projects\SmartStudyHub\.agents\ORIGINAL_REQUEST.md
- Invariants & guidelines: c:\projects\SmartStudyHub\AGENTS.md
- Explorer 1 report: c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m2_gen4_1\handoff.md
- Explorer 2 report: c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m2_gen4_2\handoff.md
- Explorer 2 proposed patch: c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m2_gen4_2\proposed_m2_fixes.patch
- Explorer 3 report: c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m2_gen4_3\handoff.md
- Mobile codebase: c:\projects\SmartStudyHub\mobile-expo

## Exclusive File Ownership
The Worker has exclusive write ownership of:
- `mobile-expo/src/i18n/` (all files: `I18nContext.tsx`, `translations.ts`, `index.ts`)
- `mobile-expo/src/navigation/BottomTabNavigator.tsx`
- `mobile-expo/src/modules/settings/SettingsScreen.tsx`
- Relevant screen headers / empty states in `mobile-expo/src/modules/` (Calculator, Grades, Notes, Tools)

## Tasks
1. **Fix `mobile-expo/src/i18n/I18nContext.tsx`**:
   - Change `LANGUAGE_STORAGE_KEY` to `'@smartstudy_language'` with fallback read to `'@ssh_language'`.
   - Update parameter interpolation in `t()` to use function replacer `() => String(val)` to prevent regex token corruption on values with `$`.
   - Add empty key guard: `if (!key) return '';`.
2. **Enhance `mobile-expo/src/i18n/translations.ts`**:
   - Fill asymmetric missing keys across all 10 languages:
     - `targetGrade` (e.g. `ru`: "Желаемая оценка", `en`: "Target Grade", `uk`: "Бажана оцінка", `be`: "Жаданая адзнака", `kk`: "Қажетті баға", `es`: "Nota deseada", `de`: "Wunschnote", `fr`: "Note visée", `zh`: "目标成绩", `tr`: "Hedef Not")
     - `offlineModeDesc` and `onlineRestored` across all 10 languages.
     - Add clean localized strings for settings and bottom tab navigation if needed.
   - Maintain strict zero-emoji invariant (0 emojis).
3. **Make Navigation Tabs Reactive in `mobile-expo/src/navigation/BottomTabNavigator.tsx`**:
   - Consume `const { t } = useI18n();`.
   - Bind `tabBarLabel` for Calculator, Grades, Notes, Tools, Settings to `t('calculator')`, `t('grades')`, `t('notes')`, `t('tools')`, `t('settings')`.
4. **Localize `mobile-expo/src/modules/settings/SettingsScreen.tsx`**:
   - Replace hardcoded Russian strings for titles, subtitles, section headers, badges, and button labels with `t(...)` calls.
   - Keep the 10-language picker modal with native names and Feather icons.
5. **Localize Core Screens (`CalculatorScreen.tsx`, `GradesScreen.tsx`, `NotesScreen.tsx`, `ToolsScreen.tsx`)**:
   - Connect `useI18n()` and bind header titles, subtitles, tab labels, and primary action buttons to `t(...)` calls without altering layout or styles.
6. **Verify Builds & Invariants**:
   - Run `npx tsc --noEmit` in `mobile-expo/` (must be 0 errors).
   - Run `npm test` in `mobile-expo/` (all 22 suites / 111 tests must pass).
   - Run `npx expo export` in `mobile-expo/` (clean export).
   - Scan for emojis (0 emojis).
   - Ensure `app.json` has `package: "com.smartstudyhub.mobile"`.
7. **Git Commit**:
   - After verification passes, execute:
     `git add .` && `git commit -m "feat(i18n): complete 10-language reactive localization and screen binding"`
8. **Report**:
   - Write comprehensive report to `c:\projects\SmartStudyHub\.agents\teamwork_preview_worker_m2_gen4_1\handoff.md` and report back via send_message to parent.

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## 2026-09-14T11:43:56Z
Activated as teamwork_preview_worker_m2_gen4_1 for M2 Implementation tasks:
1. Fix I18nContext.tsx (storage key @smartstudy_language, fallback @ssh_language, functional replacer in t(), empty key guard).
2. Complete asymmetric keys in translations.ts across all 10 languages (targetGrade, offlineModeDesc, onlineRestored, settings/nav keys) with 0 emojis.
3. Make BottomTabNavigator.tsx reactive to useI18n().
4. Localize SettingsScreen.tsx using t(...) for titles, subtitles, sections, buttons, preserving 10-lang picker modal with Feather icons.
5. Localize core screen headers/actions in CalculatorScreen, GradesScreen, NotesScreen, ToolsScreen.
6. Verify: npx tsc --noEmit, npm test, npx expo export, scan for 0 emojis, verify com.smartstudyhub.mobile.
7. Git commit: git add . && git commit -m "feat(i18n): complete 10-language reactive localization and screen binding"
8. Write handoff report and send_message to parent.
