# Dispatch: Worker M2 (Calculator & Grade Average Logic Porting)

Working directory: c:\projects\SmartStudyHub\.agents\teamwork_preview_worker_m2_2
Authoritative user request: c:\projects\SmartStudyHub\.agents\ORIGINAL_REQUEST.md
Audit Report: c:\projects\SmartStudyHub\.agents\AUDIT_REPORT.md
Detailed explorer findings: c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_audit_1\calc_grades_audit.md

## Scope & Tasks
1. **Calculator: Negative Operator Chaining**:
   - In `mobile-expo/src/modules/calculator/components/StandardCalculatorView.tsx` (and `expressionParser.ts` if needed):
     Allow typing `-` after `×` or `÷` so that expressions like `5 × -2` can be entered without the `-` replacing the multiplication/division operator.
2. **Grade Average: Quick Calc Mode (`__QUICK_CALC__`)**:
   - In `mobile-expo/src/modules/grades/GradesScreen.tsx`:
     Add support for an ephemeral Quick Calc mode ("Быстрый расчет") as a default/initial subject chip or toggle.
     When selected, users can tap grades on `GradeInputKeypad` and immediately see the real-time average, what-if simulations, and strategy recommendations without requiring a saved subject.
3. **Grade Average: Editable Thresholds**:
   - In `mobile-expo/src/modules/grades/components/ThresholdsModal.tsx`:
     Ensure threshold values (e.g. Excellent 4.5, Good 3.5, etc.) have editable `TextInput` fields with proper numeric validation and persistence, rather than static text.
4. **Verification & Quality**:
   - Run `npx tsc --noEmit` in `mobile-expo/` to ensure 0 TypeScript errors.
   - Run `git diff` to verify UI preservation: all existing StyleSheet styles and core layouts must remain intact.
   - Run `git add .` and `git commit -m "feat(calc,grades): support negative operand chaining, quick calc mode, and editable thresholds"`.

## STRICT UI PRESERVATION (CRITICAL)
Categorically forbidden to break, redesign, or discard the current native screen layouts in `mobile-expo/`. All styles (`StyleSheet`), UI components, and visual appearance must remain intact. Only add business logic, computations, event handlers, and state.

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## 2026-09-13T13:38:12Z
Received task assignment:
- Negative operator chaining in calculator (`5 × -2`)
- Quick Calc mode (`__QUICK_CALC__`) in Grades
- Editable thresholds in `ThresholdsModal.tsx`
- Run `npx tsc --noEmit`, `git add .`, `git commit`
- Write handoff.md and send message to parent.
