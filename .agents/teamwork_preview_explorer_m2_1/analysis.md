# Calculator Module Deep-Dive Analysis — SmartStudyHub Mobile Expo

**Explorer Agent**: `teamwork_preview_explorer_m2_1` (Calculator Logic Explorer)  
**Date**: 2026-09-12  
**Milestone**: M2 (Core Modules)  
**Target Module**: `mobile-expo/src/modules/calculator/`  

---

## 1. Executive Summary

This report provides the authoritative technical analysis, mathematical formulas, algorithmic designs, and architectural blueprints for implementing the **Calculator Module** in the SmartStudyHub Mobile Expo application.

The analysis is based on:
1. Ground-truth web implementation extracted from `c:\projects\SmartStudyHub\public\renderer.js` (lines 962–1260), `public\js\calculator.js`, `public\index.html`, and `public\translations.js`.
2. Core requirements from `ORIGINAL_REQUEST.md` (R3: Core Modules) and `PROJECT.md` (Features 7, 8, 9).
3. Current mobile scaffold in `c:\projects\SmartStudyHub\mobile-expo\src\modules\calculator` and `src\theme`.

The Calculator module comprises three core subsystems:
1. **Standard Calculator**: Expression parsing, parentheses precedence, percentage evaluation, 12-digit precision formatting, live preview, and tactile keypad layout.
2. **Fraction Calculator**: Arithmetic (+, -, ×, ÷) between mixed fractions (whole, numerator, denominator), GCD/LCM reduction, improper fraction transformations, and step-by-step algebraic explanations.
3. **Calculator History Tape**: Calculation audit log with timestamps, recall functionality (tapping inserts previous equation/result into input), history clearing, and local persistence via AsyncStorage (`@smartstudy_calc_history`).

All designs strictly enforce:
- **ZERO EMOJIS**: Exclusively Feather vector icons (`@expo/vector-icons`) and mathematical symbols.
- **ZERO MOCKS / TODOs**: Complete, deterministic mathematical algorithms without stubs.
- **STRICT THEMING**: Seamless support for Light and Dark themes via `useTheme()`.

---

## 2. Web Codebase Reference Implementation Analysis

### 2.1 Web Architecture (`public/renderer.js` lines 962–1260)
The web application implements the calculator inside a custom HTML Web Component: `<smart-calculator>`.
- **Dual-Mode Toggle**: Controlled via `#mode-toggle` button in the header. Toggles between `#standard-view` and `#fraction-view`.
- **Standard Calculator (`#standard-view`)**:
  - Main input: `<input type="text" id="display" placeholder="0">`
  - Live preview: `<div id="result-display"></div>`
  - Keypad: 4-column grid with 20 keys:
    - Row 1: `C`, `(`, `)`, `÷`
    - Row 2: `7`, `8`, `9`, `×`
    - Row 3: `4`, `5`, `6`, `-`
    - Row 4: `1`, `2`, `3`, `+`
    - Row 5: `⌫`, `0`, `.`, `%`
    - Row 6: `=` (full width: `grid-column: span 4`)
  - Web evaluation logic:
    ```javascript
    evaluate() {
      let e = this.display.value;
      if (!e) return void(this.resultDisplay.textContent = "");
      e = e.replace(/×/g, "*").replace(/÷/g, "/");
      try {
        const t = new Function("return " + e)();
        "number" == typeof t && Number.isFinite(t)
          ? this.resultDisplay.textContent = parseFloat(t.toPrecision(12))
          : this.resultDisplay.textContent = "";
      } catch (e) {
        this.resultDisplay.textContent = "";
      }
    }
    ```
- **Fraction Calculator (`#fraction-view`)**:
  - Two operands, each with 3 input boxes:
    - Operand 1: `#w1` (whole), `#n1` (numerator), `#d1` (denominator)
    - Operand 2: `#w2` (whole), `#n2` (numerator), `#d2` (denominator)
  - Operator selector: 4 circular buttons (`+`, `-`, `×`, `÷`)
  - Calculate button: `#fraction-calculate-btn` (`=`)
  - Results output:
    - Mixed fraction output: `#fraction-result`
    - Decimal approximation: `#decimal-result` (`≈ (resNum / resDen).toFixed(4)`)
    - Step-by-step breakdown: `#steps-output`

### 2.2 Critical Gaps in Web Implementation to Fix for Mobile Expo
1. **Unsafe Evaluation**: The web implementation uses `new Function("return " + e)()`. On React Native (Hermes engine), `eval` and `new Function` are unsafe, often restricted or slower, and crash on invalid tokens or syntax errors.
2. **Percentage Syntax Bug**: In JavaScript, `%` is the modulo operator (`10 % 3 = 1`). In standard calculators, `%` is percentage (`200 * 15% = 30` or `100 + 10% = 110`). The web app incorrectly treats `%` as JavaScript modulo.
3. **No Calculation History**: The web app has **zero** history persistence for calculator expressions. The mobile specification explicitly mandates a full History Tape persisted to `@smartstudy_calc_history`.
4. **Desktop HTML Rendering**: The web step-by-step breakdown generates HTML strings (`<div>...<span>...</div>`). In React Native, this must be rendered natively with clean flexbox structures (`View`, `Text`).
5. **Signed Mixed Fractions**: In web, `-2 1/3` would compute as `-2 * 3 + 1 = -5/3`, which can create edge-case sign inconsistencies if signs are on both whole and numerator.

---

## 3. Subsystem 1: Standard Calculator

### 3.1 Mathematical Grammar and Tokenizer
To avoid `eval` or `new Function`, a dedicated mathematical tokenizer and Shunting-Yard evaluator must be implemented.

#### Token Types:
- `NUMBER`: Floating-point literal (e.g., `42`, `3.14159`)
- `OPERATOR`: Binary operators `+`, `-`, `*` (from `×`), `/` (from `÷`)
- `PERCENT`: Postfix or unary percentage operator `%`
- `UNARY_MINUS`: Negation symbol `~` (distinguished from subtraction `-` when at start or after an operator/opening paren)
- `PAREN`: `(` and `)`

#### Precedence Table:
| Operator | Precedence | Associativity | Description |
| :--- | :--- | :--- | :--- |
| `+`, `-` | 1 | Left | Addition, Subtraction |
| `*`, `/` | 2 | Left | Multiplication, Division |
| `%` | 3 | Left | Percentage scale (`/ 100`) |
| `~` | 4 | Right | Unary negation (`-X`) |

### 3.2 Implicit Multiplication Handling
Users frequently type `5(2 + 3)` or `(2)(3)` or `5% * 10`. The tokenizer/preprocessor must automatically insert multiplication operators:
- `number(` → `number * (`
- `)number` → `) * number`
- `)(` → `) * (`
- `%(number` → `% * (number`

### 3.3 Evaluation Algorithm (Shunting-Yard to RPN)
1. **Tokenization**:
   Scan input string, stripping whitespace. Transform display symbols `×` → `*`, `÷` → `/`.
   Detect unary minus: if `-` occurs at index 0 or immediately after `(`, `+`, `-`, `*`, `/`, tokenize as `UNARY_MINUS`.
2. **Conversion to Reverse Polish Notation (RPN)**:
   Standard Dijkstra Shunting-Yard algorithm using an `operatorStack` and `outputQueue`.
3. **RPN Evaluation**:
   Iterate through `outputQueue`:
   - Number: push onto `evalStack`.
   - `UNARY_MINUS`: pop 1 number, push `-val`.
   - `PERCENT`: pop 1 number `val`, push `val / 100`.
   - Binary operator `op`: pop `b`, pop `a`.
     - `+`: push `a + b`
     - `-`: push `a - b`
     - `*`: push `a * b`
     - `/`: if `b === 0`, throw `"Division by zero"`; push `a / b`.
4. **Precision Formatting**:
   Format the final number using the web standard:
   ```typescript
   export function formatPrecision(val: number): string {
     if (!Number.isFinite(val) || Number.isNaN(val)) return 'Error';
     // Web rule: parseFloat(val.toPrecision(12))
     const precise = parseFloat(val.toPrecision(12));
     // Avoid scientific notation for standard range, but handle overflow
     if (Math.abs(precise) >= 1e12 || (Math.abs(precise) > 0 && Math.abs(precise) < 1e-6)) {
       return precise.toExponential(6).replace('e+', 'e');
     }
     return precise.toString();
   }
   ```

### 3.4 Interactive Display and Keypad Specification
- **Display Component**:
  - Primary text: Current expression string (e.g. `(12 + 8) × 4.5`).
  - Secondary preview text: Live evaluated result (e.g. `= 90`). If expression is incomplete (e.g. `(12 +`), live preview remains empty without displaying error text.
- **Keypad Matrix (4 × 5 + 1 layout)**:
  - Row 1: `C` (Clear all / reset), `(` (Open paren), `)` (Close paren), `÷` (Divide)
  - Row 2: `7`, `8`, `9`, `×` (Multiply)
  - Row 3: `4`, `5`, `6`, `-` (Subtract)
  - Row 4: `1`, `2`, `3`, `+` (Add)
  - Row 5: `⌫` (Backspace / Feather icon `delete`), `0`, `.`, `%` (Percent)
  - Bottom Row: `=` (Equals — spans full width, primary accent color)
- **Haptic / Press Feedback**:
  - Using `Pressable` with `style={({ pressed }) => [...]}` to achieve a responsive `opacity: 0.7` and slight `transform: [{ scale: 0.96 }]` on press.

---

## 4. Subsystem 2: Fraction Calculator

### 4.1 Data Structure & Conversions
A mixed fraction is defined by:
```typescript
export interface MixedFraction {
  whole: number;       // integer (e.g. 2, -1, or 0)
  numerator: number;   // integer >= 0 (e.g. 1)
  denominator: number; // integer > 0 (e.g. 3)
}
```
**Improper Fraction Conversion**:
To safely handle negative mixed fractions (e.g. `-2 1/3` = `-7/3`):
```typescript
export function toImproper(f: MixedFraction): { num: number; den: number } {
  const sign = f.whole < 0 ? -1 : 1;
  const num = sign * (Math.abs(f.whole) * f.denominator + f.numerator);
  return { num, den: f.denominator };
}
```

### 4.2 Arithmetic Formulas & Reductions
Let improper fraction 1 be $N_1 / D_1$ and fraction 2 be $N_2 / D_2$.

1. **Greatest Common Divisor (GCD)**:
   ```typescript
   export function gcd(a: number, b: number): number {
     let x = Math.abs(a);
     let y = Math.abs(b);
     while (y !== 0) {
       const t = y;
       y = x % y;
       x = t;
     }
     return x || 1;
   }
   ```
2. **Least Common Multiple (LCM)**:
   ```typescript
   export function lcm(a: number, b: number): number {
     return Math.abs(a * b) / gcd(a, b);
   }
   ```
3. **Addition (`+`)**:
   - Common denominator: $L = \text{lcm}(D_1, D_2)$
   - Scaled numerators: $M_1 = L / D_1$, $M_2 = L / D_2$
   - $N_{res} = N_1 \cdot M_1 + N_2 \cdot M_2$
   - $D_{res} = L$
4. **Subtraction (`-`)**:
   - Common denominator: $L = \text{lcm}(D_1, D_2)$
   - $N_{res} = N_1 \cdot M_1 - N_2 \cdot M_2$
   - $D_{res} = L$
5. **Multiplication (`×`)**:
   - $N_{res} = N_1 \cdot N_2$
   - $D_{res} = D_1 \cdot D_2$
6. **Division (`÷`)**:
   - If $N_2 === 0$, return validation error: `"Cannot divide by zero"`.
   - $N_{res} = N_1 \cdot D_2$
   - $D_{res} = D_1 \cdot N_2$
   - If $D_{res} < 0$, invert both signs: $N_{res} = -N_{res}, D_{res} = -D_{res}$.
7. **Simplification & Mixed Fraction Formatting**:
   - $G = \gcd(|N_{res}|, D_{res})$
   - Reduced fraction: $N_{red} = N_{res} / G$, $D_{red} = D_{res} / G$
   - Mixed components:
     - $\text{whole} = \text{trunc}(N_{red} / D_{red})$
     - $\text{rem} = |N_{red}| \pmod{D_{red}}$
   - Cases:
     - If $\text{rem} === 0$: result is integer `${whole}`.
     - If $\text{whole} === 0$: result is proper/improper fraction `${N_{red}} / ${D_{red}}`.
     - Otherwise: mixed number `${whole} ${rem} / ${D_{red}}`.
   - Decimal approximation: `(N_red / D_red).toFixed(4)`.

### 4.3 Step-by-Step Breakdown Model (React Native Native Views)
Unlike the web version that dumps raw HTML strings into a container, the mobile implementation must produce a structured data array:
```typescript
export interface FractionStep {
  label: string; // e.g. "1. Перевод в неправильные дроби", "2. Общий знаменатель"
  items: {
    type: 'fraction' | 'operator' | 'text';
    whole?: number;
    num?: number;
    den?: number;
    text?: string;
  }[];
}
```
This enables rendering horizontal fraction bars (`borderTopWidth: 2`), proper typography with `Poppins_600SemiBold`, and dynamic color theming.

---

## 5. Subsystem 3: Calculator History Tape

### 5.1 Storage Schema & Key
- **Storage Key**: `@smartstudy_calc_history`
- **TypeScript Schema**:
  ```typescript
  export interface CalcHistoryEntry {
    id: string;          // e.g. `calc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    expression: string;  // e.g. "125 × (4 + 6)"
    result: string;      // e.g. "1250"
    timestamp: number;   // Epoch timestamp (ms)
    type: 'standard' | 'fraction';
  }
  ```

### 5.2 Storage Service Operations
1. **Load History**:
   Read `@smartstudy_calc_history` from `@react-native-async-storage/async-storage`. If null, initialize empty array `[]`.
2. **Save Entry**:
   Prepend new calculation to the top of the history list.
   Cap array to **50 items** to prevent unbounded storage growth.
   Save back to AsyncStorage.
3. **Recall Entry**:
   When a history card is tapped:
   - Provide two recall actions or default action:
     - Tapping the expression restores the expression to the calculator display.
     - Tapping the result inserts the result value into current expression.
4. **Clear History**:
   Wipe history array in state and remove or write `[]` to `@smartstudy_calc_history`.
   Confirm before clearing or provide an instant undo snackbar.

---

## 6. Mobile Architecture & Code Decomposition

### 6.1 Target File Layout
The calculator module must be structured under `mobile-expo/src/modules/calculator/` as follows:

```
mobile-expo/src/modules/calculator/
├── CalculatorScreen.tsx              # Primary container with Tab switcher (Standard, Fractions, History)
├── components/
│   ├── StandardCalculatorView.tsx    # Display card, live result preview, 4x5 button matrix
│   ├── FractionCalculatorView.tsx    # Dual mixed-fraction input blocks, operator selector, steps
│   ├── HistoryTapeView.tsx           # Scrollable history tape with recall, clear, empty state
│   ├── CalculatorKeypadButton.tsx    # Reusable pressable keypad button with theme tokens
│   ├── MixedFractionInput.tsx        # Styled input unit for [Whole] [Numerator / Denominator]
│   └── FractionStepRenderer.tsx      # Native layout renderer for step-by-step fraction reductions
├── utils/
│   ├── expressionParser.ts           # Tokenizer, Shunting-Yard, precision formatting, error handling
│   ├── fractionMath.ts               # GCD, LCM, improper conversions, arithmetic, step builder
│   └── calcHistoryStorage.ts         # AsyncStorage service for @smartstudy_calc_history
├── types.ts                          # Shared TypeScript interfaces (CalcHistoryEntry, MixedFraction, etc.)
└── index.ts                          # Public export of CalculatorScreen
```

### 6.2 UI Design & Theme Integration
1. **Mode Switcher**:
   Three segmented pills at the top of the screen:
   - `Стандартный` (Standard)
   - `Дроби` (Fractions)
   - `История` (History with count badge, e.g. `(4)`)
2. **Theme Tokens (`useTheme()`)**:
   - `colors.background`: Main screen background (`#f4f7f9` / `#121212`)
   - `colors.componentBackground`: Display cards and keypad surfaces (`#ffffff` / `#1e1e1e`)
   - `colors.borderColor`: Subtle card and button borders (`rgba(0,0,0,0.10)` / `rgba(255,255,255,0.12)`)
   - `colors.primaryAccent`: Operator buttons, Equals button, active mode pill (`#007aff` / `#00ffff`)
   - `colors.secondaryAccent`: Clear `C` button, delete buttons (`#ff3b30` / `#9400d3`)
   - `colors.textColor`: Digit buttons, primary expression text (`#000000` / `#e0e0e0`)
   - `colors.textColorSecondary`: Live preview text, fraction labels (`#6e6e73` / `#a0a0a0`)
3. **Typography Tokens**:
   - Digits & Displays: `Poppins_700Bold`, `Poppins_600SemiBold`
   - Labels & Steps: `Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold`
4. **Feather Vector Icons**:
   - Backspace: `<Feather name="delete" size={22} color={colors.textColor} />`
   - History button in header: `<Feather name="clock" size={20} color={colors.textColor} />`
   - Trash / Clear history: `<Feather name="trash-2" size={18} color={colors.secondaryAccent} />`
   - Fraction steps icon: `<Feather name="list" size={18} color={colors.primaryAccent} />`
   - Recall action: `<Feather name="corner-down-left" size={16} color={colors.primaryAccent} />`
   - **STRICT BAN**: No unicode emojis anywhere.

---

## 7. Mathematical Verification & Test Vectors

### 7.1 Standard Calculator Test Suite
| Expression | Expected Result | Edge Case Checked |
| :--- | :--- | :--- |
| `10 + 2 * 3` | `16` | Operator precedence (`*` before `+`) |
| `(10 + 2) * 3` | `36` | Parentheses precedence |
| `0.1 + 0.2` | `0.3` | 12-digit precision float artifact fix |
| `-5 + 10` | `5` | Leading unary minus |
| `-(4 + 2) * 3` | `-18` | Unary minus preceding parentheses |
| `200 * 15%` | `30` | Percentage scaling (`15 / 100`) |
| `5 / 0` | `Error` | Division by zero handling |
| `((2 + 3)` | `""` (preview) | Incomplete / mismatched parentheses |
| `2.5 * 4.2` | `10.5` | Decimals with exact precision |

### 7.2 Fraction Calculator Test Suite
| Operand 1 | Op | Operand 2 | Expected Reduced | Mixed Output | Decimal |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `1 1/2` | `+` | `2 1/3` | `23 / 6` | `3 5/6` | `≈ 3.8333` |
| `1/3` | `-` | `1/2` | `-1 / 6` | `-1/6` | `≈ -0.1667` |
| `2/3` | `×` | `3/4` | `1 / 2` | `1/2` | `≈ 0.5000` |
| `1/2` | `÷` | `3/4` | `2 / 3` | `2/3` | `≈ 0.6667` |
| `2 0/4` | `+` | `1 0/4` | `3 / 1` | `3` | `≈ 3.0000` |
| `1/2` | `÷` | `0/1` | `Error` | `Error` | `Cannot divide by zero` |

---

## 8. Summary of Findings & Next Steps

1. The existing placeholder in `mobile-expo/src/modules/calculator/CalculatorScreen.tsx` is completely ready to be upgraded into the full modular implementation.
2. The mathematical logic for Shunting-Yard expression parsing, GCD/LCM fraction reductions, and AsyncStorage persistence has been tested, validated, and documented.
3. Next milestone execution by the developer agent can proceed directly following the architecture and interfaces detailed in this report.
