# Task Assignment: Worker Milestone 1 (Complete US English & Russian Localization)

## Mandatory Constraints & Warning
MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Strict Project Rules:
- Commit after completion: `git add .` and `git commit -m "feat(i18n): complete US English and Russian localization across all screens"`
- Never execute destructive git resets or checkouts (`git reset --hard` / `git checkout .` are strictly forbidden).
- Strictly NO emojis in UI, modals, toasts, or buttons (Feather icons or native SVG only).
- Do NOT re-implement or overwrite R2 Google logo (`GoogleLogoIcon.tsx`), R3 fraction initial state/dimensions, R4 `NetworkStatusCard`, or R5 EAS configs.
- Quality gate: `npm run typecheck` in `c:\projects\SmartStudyHub\mobile-expo` must pass with 0 errors.

## Working Directory
`c:\projects\SmartStudyHub\.agents\teamwork_preview_worker_m1`
Target project directory: `c:\projects\SmartStudyHub\mobile-expo`

## References
Read the survey handoff reports:
- `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_r1_1\handoff.md` (Calculator, Grades, Navigation, Auth)
- `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_r1_2\handoff.md` (Tools: Unit Converter, Currency Converter, Translator, GenPass)
- `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_r1_3\handoff.md` (Auth, Notes, Settings network keys)

## Implementation Steps
1. **`src/i18n/translations.ts`**:
   - Fix Russian `"back": "Back"` -> `"Назад"`.
   - Add all missing keys cataloged in the 3 handoff reports for both `"ru"` and `"en"`:
     - Calculator: `calcClearAll`, `calcOpenParen`, `calcCloseParen`, `calcDivide`, `calcMultiply`, `calcSubtract`, `calcAdd`, `calcBackspace`, `calcDecimalPoint`, `calcPercent`, `calcEquals`, `calcClearHistoryTitle`, `calcClearHistoryConfirm`, `calcRecordsCount`, `calcClearHistoryA11y`, `calcHistoryEmptyTitle`, `calcHistoryEmptyDesc`, `calcInsertExpression`, `calcInsertResult`, `wholePart`, `numerator`, `denominator`, `result`, `fractionStepSolution`, `fractionErrorDenomZero`, `fractionErrorDivideZero`, `calcError`, `calcDivisionByZero`.
     - Grades: `gradesAnnual`, `quarter1..quarter4`, `semester1..semester2`, `shortQ1..shortQ4`, `shortS1..shortS2`, `tabGrades`, `gradesSelectSubject`, `addSubject`, `addSubjectShort`, `subject`, `subjectNameRequired`, `subjectNameLabel`, `subjectNamePlaceholder`, `targetGradeLabel`, `targetGradeA11y`, `cancel`, `add`, `gradesAnnualSummaryTitle`, `gradesAnnualYear`, `gradesAnnualFinal`, `weightOral`, `weightTest`, `weightExam`, `weightFinal`, `weightCoefficientA11y`, `addGradeA11y`, `deleteLastGradeA11y`, `clearGradesA11y`, `clearGradesTitle`, `clearGradesConfirm`, `selectPeriodA11y`, `periodSettingsA11y`, `targetLabel`, `deleteSubjectA11y`, `gradesCountAndWeight`, `noGradesInPeriod`, `addFirstGradeHint`, `deleteGradeA11y`, `whatIfSimulator`, `whatIfA11y`, `strategyTitle`, `selectTargetGradeA11y`, `strategyAchievedTitle`, `strategyAchievedDesc`, `strategyDirectTitle`, `strategyDirectDesc`, `strategyMixedTitle`, `strategyMixedDesc`, `strategyRemediationTitle`, `strategyRemediationDesc`, `strategyRemediationAchieved`, `thresholdErrorValidNumbers`, `thresholdErrorPositive`, `thresholdErrorDescending`, `thresholdErrorNonNegative`, `thresholdErrorDescendingUS`, `thresholdModalTitle`, `gradingScaleLabel`, `academicPeriodsLabel`, `quarters4`, `semesters2`, `roundingThresholdsTitle`, `threshold5Label`, `threshold4Label`, `threshold3Label`, `threshold2Note`, `thresholdALabel`, `thresholdBLabel`, `thresholdCLabel`, `thresholdDLabel`, `thresholdFNote`, `resetDefault`, `done`, `closeSimulatorA11y`, `subjectPrefix`, `hypotheticalGradeLabel`, `selectGradeA11y`, `gradeWeightLabel`, `gradeWeightA11y`, `currentScoreLabel`, `projectedScoreLabel`, `changeScoreLabel`, `cancelSimulationA11y`, `applyHypoGradeA11y`, `apply`.
     - Tools (UnitConverter, CurrencyConverter, Translator, GenPass): `searchPlaceholder`, `copiedToClipboard`, `copyResult`, `copied`, `copy`, `selectUnitCategory`, `unitMm..unitMi`, `unitMg..unitT`, `unitCelsius..unitKelvin`, `unitShortMm..unitShortT`, `realTimeConversion`, `refreshRates`, `loadingRates`, `updatedAt`, `cacheSuffix`, `offlineBaseRates`, `popularPairs`, `selectCurrency`, `searchCurrencyPlaceholder`, `currUSD..currAED`, `favoriteTranslations`, `favoriteTranslationsCount`, `noSavedTranslations`, `searchLanguagePlaceholder`, `enterTextToTranslate`, `translationPlaceholder`, `translating`, `translationError`, `speakTranslation`, `copyTranslation`, `addToFavorites`, `langRussian..langChinese`, `crackLessSec..crackMillennia`, `strengthDangerous..strengthUnbreakable`, `ruleLength12..rulePwnedSafe`, `entropyCrackInfo`, `toVault`, `charSets`, `generatedPasswordLabel`, `crackTimeLabel`, `checkingBreaches`, `leakWarning`, `leakSafe`, `securityCriteria`, `vaultSearchPlaceholder`, `vaultLoginPlaceholder`, `vaultEmpty`, `vaultEmptyHint`.
     - Auth: `authSubtitleSync`, `authOrWithEmail`, `authPasswordSent`, `authNoAccountSignUp`, `authHaveAccountSignIn`, `authSyncDevicesDesc`, `authErrorFillFields`, `authErrorEnterEmailPassword`, `authErrorEnterEmailReset`, `authErrorPasswordMin6`, `authErrorSendMailFailed`, `authErrorGoogleSignInPrompt`, `authErrorPopupBlocked`, `authErrorAccountExistsDiff`, `authErrorGithubPrompt`, `namePlaceholder`, `passwordPlaceholderMin6`.
     - Notes: `untitledNote`, `noteA11y`, `copyNoteText`, `pinNote`, `unpinNote`, `deleteNote`, `checklistItemA11y`, `andMoreItems`, `noteColorLabel`, `cancelEdit`, `editNote`, `newNote`, `saveNote`, `noteBackgroundColor`, `noteContentPlaceholder`, `addPhoto`, `reminderActive`, `reminderPlus1h`, `checklist`, `addChecklistItem`, `checklistItemPlaceholder`, `tags`, `customTagPlaceholder`, `tagAll`, `filterByTag`, `tagStudies`, `tagImportant`, `tagPlans`, `tagIdeas`.
     - Offline / Network: `onlineRestored`, `offlineModeDesc`, plus populate `network*` keys in the other 8 languages.
2. **Apply `useI18n` in screens and components**:
   - `src/modules/calculator/components/StandardCalculatorView.tsx`
   - `src/modules/calculator/components/HistoryTapeView.tsx`
   - `src/modules/calculator/components/FractionStepRenderer.tsx`
   - `src/modules/calculator/components/MixedFractionInput.tsx` (remove raw fallback strings)
   - `src/modules/grades/GradesScreen.tsx`
   - `src/modules/grades/components/AddSubjectModal.tsx`
   - `src/modules/grades/components/AnnualTableCard.tsx`
   - `src/modules/grades/components/GradeInputKeypad.tsx`
   - `src/modules/grades/components/PeriodSelectorBar.tsx`
   - `src/modules/grades/components/SubjectDetailCard.tsx`
   - `src/modules/grades/components/StrategyEngineCard.tsx`
   - `src/modules/grades/components/ThresholdsModal.tsx`
   - `src/modules/grades/components/WhatIfModal.tsx`
   - `src/modules/tools/screens/UnitConverterScreen.tsx`
   - `src/modules/tools/screens/CurrencyConverterScreen.tsx`
   - `src/modules/tools/screens/TranslatorScreen.tsx` (decouple `translateError` boolean)
   - `src/modules/tools/screens/GenPassScreen.tsx` (pass `t` to helper functions)
   - `src/modules/auth/LoginScreen.tsx`
   - `src/modules/auth/RegisterScreen.tsx`
   - `src/modules/notes/components/NoteCard.tsx`
   - `src/modules/notes/components/NoteEditorModal.tsx`
   - `src/modules/notes/components/TagFilter.tsx`
   - `src/modules/notes/components/ColorPicker.tsx`
   - `src/components/common/OfflineBanner.tsx`
   - `src/navigation/BottomTabNavigator.tsx`
3. **Build & Typecheck Verification**:
   - Run `npm run typecheck` in `mobile-expo/`. Ensure 0 errors.
4. **Git Commit**:
   - Run `git add .` and `git commit -m "feat(i18n): complete US English & Russian localization across all screens and components"`.
5. **Handoff**:
   - Write `handoff.md` in `c:\projects\SmartStudyHub\.agents\teamwork_preview_worker_m1\handoff.md`.
   - Send message to parent orchestrator.

## 2026-09-21T14:21:37Z
<USER_REQUEST>
You are Worker M1 (Implementation Specialist).
Your working directory is: c:\projects\SmartStudyHub\.agents\teamwork_preview_worker_m1
Project directory: c:\projects\SmartStudyHub\mobile-expo
Read your instructions in: c:\projects\SmartStudyHub\.agents\teamwork_preview_worker_m1\DISPATCH.md
Read the original user request at: c:\projects\SmartStudyHub\.agents\ORIGINAL_REQUEST.md (under header ## 2026-09-21T13:21:19Z).
Read the comprehensive survey reports:
- c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_r1_1\handoff.md
- c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_r1_2\handoff.md
- c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_r1_3\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

CRITICAL PROJECT CONSTRAINTS:
- Do NOT re-implement or overwrite R2 Google logo (GoogleLogoIcon.tsx), R3 fraction initial state/dimensions, R4 NetworkStatusCard, or R5 EAS configs (these are already completed in commits 1515b35 and 6f995cc).
- Strictly NO emojis in UI, modals, toasts, or buttons (Feather icons or native SVG only).
- Quality gate: `npm run typecheck` in `mobile-expo` must pass with 0 errors!
- Git commit rule: After implementing and verifying with typecheck, you MUST execute:
  `git add .` and `git commit -m "feat(i18n): complete US English & Russian localization across all screens and components"`
- Write your completion handoff report to `c:\projects\SmartStudyHub\.agents\teamwork_preview_worker_m1\handoff.md`.
- Send a completion message to parent f52e8cef-ccf4-40d0-9082-def06fd36d95 with your summary and handoff path.
</USER_REQUEST>
