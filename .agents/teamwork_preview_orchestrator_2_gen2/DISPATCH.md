# Project Orchestrator Dispatch (Generation 2)

## 2026-09-13T14:01:00Z

You are Project Orchestrator (Generation 2) for the SmartStudyHub project.

Working directory: c:\projects\SmartStudyHub\.agents\teamwork_preview_orchestrator_2_gen2
Authoritative user request: c:\projects\SmartStudyHub\.agents\ORIGINAL_REQUEST.md
Previous orchestrator directory: c:\projects\SmartStudyHub\.agents\teamwork_preview_orchestrator_2
Audit report: c:\projects\SmartStudyHub\.agents\AUDIT_REPORT.md

## STATUS & COMPLETED WORK
1. Milestone 1 (Survey & Differences Audit - R1): COMPLETE. Full findings documented in `c:\projects\SmartStudyHub\.agents\AUDIT_REPORT.md`.
2. Milestone 2 (Calculator & Grade Average Logic Porting - R2): COMPLETE and committed to Git:
   - Negative operand chaining (`5 × -2`, `10 ÷ -2`) implemented in `StandardCalculatorView.tsx`.
   - Ephemeral Quick Calc mode (`__QUICK_CALC__`) added to `GradesScreen.tsx`.
   - Editable thresholds with validation implemented in `ThresholdsModal.tsx`.
   - Committed: `77b5da2 feat(calc,grades): support negative operand chaining, quick calc mode, and editable thresholds`.
   - TypeScript compiles with 0 errors.

## YOUR IMMEDIATE MISSION
Drive the remaining milestones to 100% completion:

1. **Milestone 3: Notes & Tools Logic Porting (R3)**:
   - Notes: Restore tagging, sorting, filtering, and copy features identified in AUDIT_REPORT.md.
   - Tools: Restore Converters, Translator, GenPass capabilities (tagging, sorting, filtering, copying results).
   - Strict UI preservation: keep existing native JSX layout and StyleSheet styles intact.

2. **Milestone 4: Firebase Integration (R4)**:
   - Connect configuration for project `studio-9933447149-80d6a` using Firebase JS SDK compatible with Expo.
   - Restore user sign-in and data synchronization functionality.
   - Single project rule: Only use `studio-9933447149-80d6a`. Do NOT create new Firebase projects.

3. **Milestone 5: Verification & UI Preservation Audit (R5)**:
   - `npx tsc --noEmit` in `mobile-expo/` completes with 0 errors.
   - Metro bundler (`npx expo export` or `npx expo start`) builds cleanly with 0 errors.
   - No placeholders: zero `// TODO` or `// FIXME` in core logic.
   - Emoji Ban: zero emojis in UI code (Feather / MaterialIcons only).
   - Git diff confirms visual JSX markup and styles were preserved.

4. **Git Commit Rule**:
   - Commit after every completed task/feature: `git add . && git commit -m "type(scope): clear description"`.

5. **Lifecycle & Progress**:
   - Maintain `progress.md` and `BRIEFING.md` in your working directory.
   - When all milestones are verified, send completion report to Sentinel for victory audit.
