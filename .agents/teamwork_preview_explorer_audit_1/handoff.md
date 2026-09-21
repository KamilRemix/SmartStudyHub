# Handoff Report — Explorer 1: Differences Audit (Calculator & Grade Average)

## 1. Observation
- **Legacy Web Calculator**:
  - Located in `public/renderer.js` lines 963–1260 (`SmartCalculator`).
  - Standard calculator evaluation (lines 1111–1115): converts `×` to `*`, `÷` to `/`, evaluates expression via `new Function("return " + e)()`, checks `Number.isFinite(t)`, formats via `parseFloat(t.toPrecision(12))`.
  - Fraction calculator (lines 1117–1259): computes `_gcd(e, t)` (line 1119), `_lcm(a, b)` (line 1120), converts mixed numbers to improper fractions `num = w * d + n`, performs addition/subtraction via LCM, multiplication, division via reciprocal, reduces by GCD, and displays mixed fraction `whole rem/den` and decimal `≈ (resNum / resDen).toFixed(4)`.
  - Visual step-by-step output generated in `generateFractionSteps` (lines 1122–1200).
  - Web calculator had **no calculation history** persistence.
- **Mobile-Expo Calculator**:
  - Located in `mobile-expo/src/modules/calculator/`.
  - `expressionParser.ts`: implements full Shunting-Yard algorithm producing RPN tokens. Supports `+`, `-`, `*`, `/`, `×`, `÷`, `(`, `)`, `%`, unary minus `~`, implicit multiplication, auto-closing parentheses in live preview. Formatting via `formatPrecision(val)` uses `parseFloat(val.toPrecision(12))`.
  - `calcHistoryStorage.ts`: full calculation history persistence in `AsyncStorage` with key `@smartstudy_calc_history` (lines 4–5) capped at 50 records.
  - `HistoryTapeView.tsx`: allows recalling expression or result on tap.
  - `FractionCalculatorView.tsx` & `fractionMath.ts`: complete 5-step fraction breakdown renderer (`FractionStepRenderer.tsx`).
  - Observation on operator chaining in `StandardCalculatorView.tsx:37`: `if (isOp && isPrevOp) return prev.slice(0, -1) + char;` — prevents input of negative numbers in expressions like `5 × -2`.
- **Legacy Web Grade Average**:
  - Located in `public/renderer.js` lines 1264–3305 (`GradeAverageCalculator`).
  - Storage format: `subjects: { [name]: (number | string)[] }`.
  - Average calculation (lines 1510–1529): simple unweighted mean `total / length`.
  - Has Quick Calc mode `__QUICK_CALC__` ("Быстрый подсчет (локально)") stored in separate array `this.quickCalcGrades` (lines 1269, 2525–2553), never saved to database.
  - Strategy engine (lines 3004–3124): solves needed top grades, mixed strategy (alternating 5 and 4), remediation (replacing lowest grade with 5).
  - Thresholds tab (lines 2840–2893): allows custom thresholds entry and saving.
  - Firebase synchronization (lines 1363–1407): Realtime Database (`users/${uid}`, `users_by_email/${sanitizedEmail}`), Firestore (`users/${email}`, `users/${uid}`), and offline sync queue `ssh_grades_pending_sync`.
- **Mobile-Expo Grade Average**:
  - Located in `mobile-expo/src/modules/grades/`.
  - Storage format: `subjects: SubjectItem[]` with `grades: GradeEntry[]` having `weight`, `period`, `date`. Key `@smartstudy_grades_data`.
  - Implements coefficients/weights: `1.0x Ответ`, `1.5x Тест`, `2.0x Контрольная`, `3.0x Экзамен`.
  - Implements multi-period support: 4 quarters (`q1`–`q4`), 2 semesters (`s1`–`s2`), and annual table (`AnnualTableCard.tsx`).
  - Implements `WhatIfModal.tsx` and `StrategyEngineCard.tsx` with closed-form mathematical solving.
  - Missing: Quick Calc mode (`__QUICK_CALC__`), editable threshold inputs in `ThresholdsModal.tsx`, and Firebase synchronization.
- **Verification Commands Executed**:
  - `npx tsc --noEmit` in `mobile-expo/`: exited with code 0 (zero errors).
  - `npx expo export --no-bytecode` in `mobile-expo/`: successfully initiated Metro bundler.

## 2. Logic Chain
1. *From Web `renderer.js:1111` to Mobile `expressionParser.ts`*: Web used `eval`/`new Function` while Mobile uses Shunting-Yard. Both produce identical 12-digit precision formatting via `toPrecision(12)`. Mobile adds syntax error handling and safety, preventing crashes on partial input.
2. *From Web `renderer.js:1518` to Mobile `gradeMath.ts:54`*: Web calculated flat average `sum / count`. Mobile calculates weighted average `sum(val * weight) / sum(weight)`. When all weights equal 1.0, Mobile's weighted average reduces exactly to Web's flat average, meaning Mobile is mathematically backwards-compatible while offering superior functionality.
3. *From Web `renderer.js:1269, 2527` to Mobile `GradesScreen.tsx`*: Web provided `__QUICK_CALC__` as the default unsaved subject chip. Mobile currently lacks this chip, forcing users to create an explicit subject before entering grades.
4. *From Web `renderer.js:1364-1393` to Mobile `gradesStorage.ts:1-80`*: Web synced directly to Firebase RTDB and Firestore. Mobile only saves to `AsyncStorage`. Connecting Firebase requires an adapter to handle differences between Web dictionary `{ [name]: number[] }` and Mobile array `SubjectItem[]`.
5. *From R5 UI Preservation requirement to Mobile components*: Mobile UI components (`CalculatorScreen`, `StandardCalculatorView`, `FractionCalculatorView`, `GradesScreen`, `SubjectDetailCard`, `GradeInputKeypad`, `StrategyEngineCard`, `AnnualTableCard`) have rich `StyleSheet` definitions that must not be rewritten. Gaps can be resolved purely through business logic, handlers, and state wiring without modifying existing styles.

## 3. Caveats
- Firebase authentication tokens and online connectivity checks were reviewed statically; runtime Firebase authentication in Expo requires installing Firebase JS SDK or configuring credentials according to project rules (`studio-9933447149-80d6a`).
- Non-CIS / CIS dynamic VK buttons are governed by project rules in `AGENTS.md` and apply to authentication screens rather than calculation math.

## 4. Conclusion
- **Calculator**: Feature-complete with high fidelity. Needs a minor adjustment in `StandardCalculatorView.tsx` to permit negative numbers after `×`/`÷`.
- **Grade Average**: Mathematical engine is superior to web (weights, quarters, annual table). Missing only 3 capabilities from web:
  1. Quick Calc mode (`__QUICK_CALC__`)
  2. Editable threshold inputs in `ThresholdsModal.tsx`
  3. Firebase sync layer with schema migration adapter
- **UI Preservation**: 100% compliant. All layouts, component trees, and styles are documented and must remain intact.
- Comprehensive audit report is available at `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_audit_1\calc_grades_audit.md`.

## 5. Verification Method
1. **Type Check**:
   ```powershell
   cd c:\projects\SmartStudyHub\mobile-expo
   npx tsc --noEmit
   ```
   *Expected outcome*: Exit code 0, 0 errors.
2. **File Inspection**:
   - Inspect `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_audit_1\calc_grades_audit.md` for full formula mappings and component inventory.
3. **Invalidation Conditions**:
   - Any modification to existing `StyleSheet` objects in `mobile-expo/src/modules/calculator/` or `mobile-expo/src/modules/grades/` violates R5.
   - Any failure of `tsc --noEmit` in `mobile-expo/`.
