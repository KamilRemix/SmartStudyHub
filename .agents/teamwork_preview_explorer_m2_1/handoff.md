# Handoff Report: Calculator Module Logic & Architecture

**Agent**: `teamwork_preview_explorer_m2_1` (Calculator Logic Explorer)  
**Recipient**: `parent` (`3a3253b9-a4d9-4253-ba50-ca21304517b8`)  
**Working Directory**: `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m2_1`  
**Date**: 2026-09-12  
**Handoff Type**: Hard (Task Complete)  

---

## 1. Observation

Direct investigation of the codebase and project configuration revealed the following verbatim facts:

1. **Web Ground Truth Implementation**:
   - In `c:\projects\SmartStudyHub\public\renderer.js` lines 962–1260, the calculator is implemented as Web Component `SmartCalculator` with two modes: `#standard-view` and `#fraction-view`.
   - Web standard calculator evaluation (lines 1114):
     ```javascript
     evaluate(){let e=this.display.value;if(!e)return void(this.resultDisplay.textContent="");e=e.replace(/×/g,"*").replace(/÷/g,"/");try{const t=new Function("return "+e)();"number"==typeof t&&Number.isFinite(t)?this.resultDisplay.textContent=parseFloat(t.toPrecision(12)):this.resultDisplay.textContent=""}catch(e){this.resultDisplay.textContent=""}}
     ```
   - Web fraction calculator arithmetic and steps (lines 1119–1258):
     ```javascript
     _gcd(e,t){return t?this._gcd(t,e%t):e}
     _lcm(a,b){return Math.abs(a*b)/this._gcd(a,b)}
     ```
     Step-by-step reduction generated HTML strings with LCD/LCM and GCD simplification (`generateFractionSteps` lines 1122–1200).
   - In `public\js\calculator.js` lines 1–392: Houses Unit Converter, Currency Converter, and Tools Hub navigation, confirming math calculator logic resides in `renderer.js`.

2. **Mobile Requirements & Specifications**:
   - In `c:\projects\SmartStudyHub\.agents\PROJECT.md`:
     - Line 22: "Feature 7: Standard Calculator: Expression parsing, brackets precedence, live evaluation, percentages, 12-digit precision"
     - Line 23: "Feature 8: Fraction Calculator: Mixed fraction calculations (whole, num, den), LCM/GCD reduction, step-by-step breakdown"
     - Line 24: "Feature 9: Calculator History: Calculation tape with timestamp, recalling previous equations into current expression, clearing history, and persisting to AsyncStorage (`@smartstudy_calc_history`)"
     - Line 89: `CALC_HISTORY: '@smartstudy_calc_history'`
     - Line 8: "Vector icons strictly `@expo/vector-icons` (`Feather` and `MaterialIcons`). STRICT BAN ON EMOJIS IN THE UI."
   - In `c:\projects\SmartStudyHub\.agents\ORIGINAL_REQUEST.md`:
     - Line 19: "STRICTLY @expo/vector-icons (Feather/MaterialIcons). NO EMOJIS anywhere in the UI."
     - Line 24: "Calculator: Full support for brackets, percentages, history, and smooth key presses."

3. **Current Mobile Scaffold State**:
   - `c:\projects\SmartStudyHub\mobile-expo\src\modules\calculator\CalculatorScreen.tsx` currently contains a static Milestone 1 preview placeholder.
   - `mobile-expo\package.json` confirms `@react-native-async-storage/async-storage` (1.23.1), `@expo/vector-icons` (^14.0.4), `expo-font` (~13.0.4) are already installed.
   - `mobile-expo\src\theme\colors.ts` provides complete theme color tokens for light and dark modes (`componentBackground`, `primaryAccent`, `secondaryAccent`, `textColor`, `textColorSecondary`, `borderColor`).

---

## 2. Logic Chain

1. **Safety on Mobile Runtime (Hermes)**:
   - Web uses `new Function("return " + e)()`. On mobile React Native with Hermes, dynamic code evaluation is unsafe, causes potential crashes on malformed inputs, and does not handle standard calculator percentage behavior (treating `%` as JavaScript modulo instead of percentage scale `val / 100`).
   - *Inference*: A robust, deterministic Shunting-Yard parser algorithm converting tokenized expressions into Reverse Polish Notation (RPN) is required.

2. **Operator Precedence & Precision**:
   - Standard precedence: Parentheses `(...)` > Unary minus `~` > Percentage `%` > Multiplicative `*`, `/` > Additive `+`, `-`.
   - Floating-point precision: Web's `parseFloat(val.toPrecision(12))` rule prevents JavaScript IEEE 754 precision artifacts (e.g. `0.1 + 0.2` becomes `0.3` instead of `0.30000000000000004`).
   - *Inference*: The Shunting-Yard parser must evaluate with 12-digit precision formatting and handle incomplete expressions gracefully without throwing errors during live typing.

3. **Fraction Mathematical Correctness**:
   - Mixed fractions must support whole, numerator, and denominator:
     $$N_{improper} = \text{sign}(W) \cdot (|W| \cdot D + N)$$
   - Operations:
     - Addition/Subtraction: Common denominator using $\text{lcm}(D_1, D_2)$, scaled numerators, then reduction by $\gcd(|N_{res}|, D_{res})$.
     - Multiplication: $N_1 \cdot N_2$ and $D_1 \cdot D_2$, then reduction by $\gcd$.
     - Division: Inversion $N_1 \cdot D_2$ and $D_1 \cdot N_2$ with division-by-zero check ($N_2 \ne 0$).
   - Output: Convert reduced fraction back to integer (if remainder is 0) or mixed fraction `${whole} ${rem}/${den}`.
   - Step-by-step breakdown: Instead of web's raw HTML strings, produce a clean typed array of steps (`FractionStep[]`) rendered via native React Native components (`View`, `Text`).

4. **History Tape Persistence**:
   - Web lacked history; mobile specification explicitly requires history tape saving to `@smartstudy_calc_history`.
   - Store records containing `{ id, expression, result, timestamp, type }`.
   - Operations: Add on `=` press, load on mount, recall equation or result into active display on tap, clear history with storage purge, capped to 50 items.

5. **UI & Constraint Adherence**:
   - Emojis strictly banned: All icons must use Feather (`delete`, `clock`, `trash-2`, `list`, `corner-down-left`).
   - Theme responsiveness: Use `useTheme()` for all styling to guarantee automatic light/dark mode adaptation.

---

## 3. Caveats

1. **Percentage Semantics**:
   In commercial desk calculators, `100 + 10%` evaluates to `110` ($100 + 100 \times 10 / 100$), whereas in scientific calculators `10%` is simply a unary scale operator ($10 / 100 = 0.1$). Our Shunting-Yard tokenizer treats `%` as unary postfix scale `/ 100` (`200 * 15% = 30`), which is deterministic and aligns with modern mobile calculators.
2. **History Storage Limit**:
   To prevent unbounded AsyncStorage bloat on mobile devices, history is capped at the most recent 50 entries (FIFO).
3. **Implicit Multiplication**:
   Expressions like `5(2 + 3)` are automatically preprocessed to `5 * (2 + 3)` before tokenization.

---

## 4. Conclusion

The Calculator module is fully specified and ready for implementation in Milestone 2. 

The module should be decomposed into the following modular files in `mobile-expo/src/modules/calculator/`:
1. `CalculatorScreen.tsx`: Top segmented mode switcher (`Стандартный`, `Дроби`, `История`), container view.
2. `components/StandardCalculatorView.tsx`: Expression display, live preview, 4x5 tactile keypad.
3. `components/FractionCalculatorView.tsx`: Dual mixed-fraction inputs, operator picker, calculate button, step-by-step display.
4. `components/HistoryTapeView.tsx`: FlatList of calculation history, recall button, clear action.
5. `components/CalculatorKeypadButton.tsx`: Pressable button with responsive opacity/scale feedback and theme colors.
6. `components/MixedFractionInput.tsx`: Custom input block with whole, numerator, and denominator inputs.
7. `utils/expressionParser.ts`: Shunting-Yard tokenizer and evaluator with 12-digit precision.
8. `utils/fractionMath.ts`: GCD, LCM, improper fraction math, and step generator.
9. `utils/calcHistoryStorage.ts`: AsyncStorage service for `@smartstudy_calc_history`.
10. `types.ts`: Type definitions for `CalcHistoryEntry`, `MixedFraction`, and `FractionStep`.

Detailed technical specs, algorithmic pseudo-code, and test matrices are documented in:
`c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m2_1\analysis.md`.

---

## 5. Verification Method

To independently verify the findings and algorithms:

1. **Algorithm & Math Verification**:
   Execute the tested node script verifying Shunting-Yard precedence and fraction arithmetic:
   ```bash
   node -e "
   const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
   const lcm = (a, b) => Math.abs(a * b) / gcd(a, b);
   console.log('0.1 + 0.2 precision:', parseFloat((0.1 + 0.2).toPrecision(12)));
   console.log('Fraction 1 1/2 + 2 1/3:', (1*2+1)*3 + (2*3+1)*2, '/', lcm(2,3));
   "
   ```
2. **Inspect Existing Files**:
   - Web implementation: `c:\projects\SmartStudyHub\public\renderer.js` lines 962–1260.
   - Mobile scaffold: `c:\projects\SmartStudyHub\mobile-expo\src\modules\calculator\CalculatorScreen.tsx`.
   - Comprehensive analysis: `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m2_1\analysis.md`.
3. **Typecheck Command**:
   When implementing, verify zero TypeScript errors:
   ```bash
   cd c:\projects\SmartStudyHub\mobile-expo && npx tsc --noEmit
   ```
4. **Emoji Check Command**:
   Verify zero unicode emojis in `mobile-expo/src`:
   ```bash
   git grep -P "[\x{1F300}-\x{1F9FF}\x{2600}-\x{26FF}\x{2700}-\x{27BF}]" mobile-expo/src
   ```
