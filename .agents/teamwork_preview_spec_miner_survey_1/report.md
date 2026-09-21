# SmartStudyHub Mobile Clone — Core Modules Specification Report

## Executive Summary
This authoritative specification report details the reverse-engineered behaviors, schemas, mathematical formulas, user interaction flows, and edge cases for the three Core Modules of the SmartStudyHub application:
1. **Calculator** (Standard Arithmetic, Percentage, Parentheses Precedence, Dual-Mode Fraction Calculator, and Calculation History)
2. **Grade Average & Academic Tracker** (Russian 5-Point and US Letter/GPA systems, Grade Weights/Coefficients, Quarter/Semester structures, Target Grade Strategy, What-If Simulator, and AsyncStorage schemas)
3. **Notes Module** (Full CRUD, Tagging System, Search & Filtering, Rich Checklists, Color Coding, Pinning, Reminders, Grid/List view modes, and AsyncStorage schemas)

All findings are derived directly from `c:\projects\SmartStudyHub` (examining `public/renderer.js`, `public/notes.js`, `public/translations.js`, `public/index.html`, `public/style.css`, and `ORIGINAL_REQUEST.md`).

---

## 1. Calculator Specification

### 1.1 Architectural Overview & Dual Mode
The SmartStudyHub calculator supports two primary modes:
1. **Standard Calculator**: Evaluates arithmetic expressions with parenthetical grouping, percentage handling, live evaluation, formatting, and calculation history.
2. **Fraction Calculator**: Arithmetic between two rational numbers (represented as mixed numbers: whole part, numerator, denominator), displaying step-by-step algebraic reductions via LCD/LCM and GCD.

### 1.2 Standard Calculator: Grammar, Operators & Precedence
- **Supported Tokens**:
  - Digits: `0-9`
  - Decimal separator: `.` (period)
  - Parentheses: `(` and `)`
  - Operators:
    - Addition: `+`
    - Subtraction / Negation: `-`
    - Multiplication: `×` (internally `*`)
    - Division: `÷` (internally `/`)
    - Percentage: `%`
  - Actions:
    - Clear: `C` (resets display and live preview)
    - Backspace: `⌫` (deletes character immediately before cursor or at end of string)
    - Equals: `=` (commits current preview evaluation to display and appends entry to History)

- **Operator Precedence & Evaluation Rules**:
  1. Parentheses: Expressions within `(...)` evaluate first with highest precedence. Nested brackets `((A + B) * C)` evaluate inside-out.
  2. Percentage `%`:
     - **Unary scale**: When `%` follows a number directly (e.g. `200 * 15%`), it evaluates as `15 / 100 = 0.15`, yielding `30`.
     - **Additive percentage**: In commercial calculator syntax `A + B%` or `A - B%`, it expands to `A + (A * B / 100)` or `A - (A * B / 100)` (e.g., `100 + 20% = 120`).
     - **Modulo fallback**: If used between two integers in modulo mode, `A % B` evaluates to `A mod B`.
  3. Multiplicative: `*` and `/` have equal precedence, evaluated left-to-right.
  4. Additive: `+` and `-` have equal precedence, evaluated left-to-right.

- **Precision and Number Formatting**:
  - Web reference formula: `parseFloat(val.toPrecision(12))`
  - Ensures standard JavaScript floating-point artifacts like `0.1 + 0.2 = 0.30000000000000004` are formatted to `0.3`.
  - Max fractional digits: up to 10 decimal places without trailing zeros.
  - Very large numbers (> `1e12`) or very small numbers (< `1e-6`) convert to exponential notation (e.g., `1.23e14`).

- **Live Result Evaluation**:
  - As user inputs tokens, expression is continuously evaluated in a secondary preview display (`#result-display`).
  - If incomplete or syntax is invalid (e.g. `5 +`), preview remains empty `""` without throwing errors.
  - When `=` is pressed: The preview value replaces the expression in the primary display, and the computation is committed to AsyncStorage history.

### 1.3 Fraction Calculator Logic
- **Data Model**:
  - Operand 1: Whole `w1`, Numerator `n1`, Denominator `d1` (Improper numerator: `num1 = w1 * d1 + n1`)
  - Operand 2: Whole `w2`, Numerator `n2`, Denominator `d2` (Improper numerator: `num2 = w2 * d2 + n2`)
  - Operator: `+`, `-`, `×`, `÷`
- **Arithmetic Formulas**:
  - **Addition (`+`)**:
    - Common denominator: `L = lcm(d1, d2)`
    - Multipliers: `m1 = L / d1`, `m2 = L / d2`
    - Result numerator: `resNum = num1 * m1 + num2 * m2`
    - Result denominator: `resDen = L`
  - **Subtraction (`-`)**:
    - Result numerator: `resNum = num1 * m1 - num2 * m2`
    - Result denominator: `resDen = L`
  - **Multiplication (`×`)**:
    - `resNum = num1 * num2`
    - `resDen = d1 * d2`
  - **Division (`÷`)**:
    - `resNum = num1 * d2`
    - `resDen = d1 * num2`
- **Reduction & Simplification**:
  - `g = Math.abs(gcd(Math.abs(resNum), Math.abs(resDen)))`
  - Reduced fraction: `reducedNum = resNum / g`, `reducedDen = resDen / g`
  - Mixed Number Conversion:
    - `whole = Math.trunc(reducedNum / reducedDen)`
    - `remainder = Math.abs(reducedNum % reducedDen)`
    - If `remainder === 0`: display `${whole}`
    - If `whole === 0`: display `${reducedNum}/${reducedDen}`
    - Otherwise: display `${whole} ${remainder}/${reducedDen}`
  - Decimal Approximation: `(resNum / resDen).toFixed(4)`
- **Step-by-Step Breakdown**:
  - Renders the algebraic intermediate steps:
    1. Conversion of mixed numbers to improper fractions
    2. Conversion to common denominator `L` (for `+` and `-`) or inversion of divisor (for `÷`)
    3. Unreduced result
    4. Reduction step dividing numerator and denominator by `gcd`

### 1.4 Calculation History Schema & Operations
- **Storage Key**: `@smartstudy_calc_history`
- **Item Schema**:
  ```typescript
  interface CalcHistoryItem {
    id: string; // 'calc_' + timestamp + '_' + random
    expression: string; // e.g. "125 * (4 + 6)"
    result: string; // e.g. "1250"
    timestamp: number; // Date.now()
  }
  ```
- **Operations**:
  - **Record**: Added when `=` is evaluated successfully with valid result.
  - **Restore**: Tapping an item populates either expression or result back to calculator input.
  - **Clear**: Empties history array in state and AsyncStorage.
  - **Cap**: Retains last 50 entries to optimize memory.

---

## 2. Grade Average & Academic Tracker Specification

### 2.1 Grading Systems Supported
1. **5-Point Russian Academic Scale** (Default):
   - Numerical grades: `1, 2, 3, 4, 5`
   - Standard Grade Definitions:
     - `5` = Отлично (Excellent)
     - `4` = Хорошо (Good)
     - `3` = Удовлетворительно (Satisfactory)
     - `2` = Неудовлетворительно (Poor / Unsatisfactory)
     - `1` = Очень плохо (Failure)
   - Default Thresholds:
     - 5: `4.50` and above
     - 4: `3.50` and above
     - 3: `2.50` and above
     - Below 2.50 = 2 (Fail)
2. **US Letter Grade / GPA Scale**:
   - Letter grades: `A, B, C, D, F`
   - Point Mapping (`gradeMap`): `A: 4.0, B: 3.0, C: 2.0, D: 1.0, F: 0.0`
   - Default Percent Thresholds:
     - A: `90%` (GPA 3.50 - 4.00)
     - B: `80%` (GPA 2.50 - 3.49)
     - C: `70%` (GPA 1.50 - 2.49)
     - D: `60%` (GPA 0.50 - 1.49)
     - F: `0%` (< 0.50)

### 2.2 Weighted Grade System & Formulas
To satisfy `ORIGINAL_REQUEST.md` ("Grade Average: Input grades (1-5), weights, quarter/semester calculations"), the grade model incorporates grade weights (coefficients):
- **Weights Concept**:
  - Standard homework / class answer: `weight = 1.0`
  - Independent / test work: `weight = 1.5`
  - Control work / quarter test: `weight = 2.0`
  - Examination: `weight = 3.0`
- **Weighted Average Formula**:
  $$\text{Average} = \frac{\sum_{i=1}^{N} (\text{grade}_i \times \text{weight}_i)}{\sum_{i=1}^{N} \text{weight}_i}$$
  - If total weight is `0` or no grades exist, returns `0.00`.
  - Formatted strictly to 2 decimal places (`.toFixed(2)`).
- **Progress Bar Representation**:
  - Percentage fill = `Math.min((average / maxGrade) * 100, 100)`
  - Where `maxGrade = 5.0` (5-point) or `4.0` (US Letter/GPA).
  - Progress label: `${average} / ${maxGrade.toFixed(1)}`.

### 2.3 Quarter and Semester Calculation Logic
- **Period Types**:
  - **Quarters** (Russian schools): Quarter 1, Quarter 2, Quarter 3, Quarter 4
  - **Semesters** (High school / College): Semester 1, Semester 2
- **Period Evaluation**:
  - Each subject maintains independent grade lists for each quarter/semester.
  - Period Average: Weighted average of all grades assigned within that period.
  - Period Final Grade: Rounded according to school threshold settings:
    - If `PeriodAvg >= Threshold(5)` (e.g. 4.50) $\rightarrow$ `5`
    - Else if `PeriodAvg >= Threshold(4)` (e.g. 3.50) $\rightarrow$ `4`
    - Else if `PeriodAvg >= Threshold(3)` (e.g. 2.50) $\rightarrow$ `3`
    - Else $\rightarrow$ `2`
- **Year / Final Cumulative Grade**:
  - **Quarter System Annual Grade**:
    $$\text{YearAvg} = \frac{Q_1 + Q_2 + Q_3 + Q_4}{4}$$
    (Or weighted when a final yearly exam exists: $\frac{Q_1 + Q_2 + Q_3 + Q_4 + \text{Exam} \times 2}{6}$).
  - **Semester System Annual Grade**:
    $$\text{YearAvg} = \frac{S_1 + S_2}{2}$$

### 2.4 Target Grade Strategy Engine
Located in the `strategy` tab, this engine analyzes a subject's current grades and computes actionable pathways to hit the user's selected target grade:
1. **Target Met Condition**:
   - If `currentAverage >= targetThreshold`:
     - Message: "Great! You already have an average of {avg}, which corresponds to grade {grade}. The main thing is not to spoil it!"
2. **Path 1: Fives / A's Needed**:
   - Simulates adding top grades (5 or A) until threshold $T$ is met.
   - Mathematical formula for count $k$:
     $$k = \left\lceil \frac{T \times \sum w_i - \sum (g_i \times w_i)}{5 - T} \right\rceil$$
   - Iteration cap: 20 grades.
   - Message: "You need {count} more fives to reach an average of {avg}".
3. **Path 2: Mixed Strategy (5s and 4s)**:
   - Simulates alternating additions of 5 and 4.
   - Outputs: "{fives} fives and {fours} fours $\rightarrow$ average {avg}".
4. **Path 3: Remediation / Fix Bad Grade**:
   - Checks if any grade $< 4$ exists.
   - Simulates replacing the single lowest grade with a `5`.
   - If `newAvg >= targetThreshold`:
     - Outputs: "Replace one bad grade with 5 $\rightarrow$ average {avg}".

### 2.5 "What-If" Simulator
- User selects any subject and taps "What If?".
- Prompt/Modal asks: "Which grade would you like to simulate? (1-5 or A-F)".
- Computes hypothetical new average and displays comparison:
  `Current: {current} → Simulated: {simulated}`.
- If user taps **"Apply"**: simulated grade is permanently committed to that subject.
- If user taps **"Cancel"**: simulation is discarded.

### 2.6 Grade Module Data Schema (AsyncStorage)
- **Key**: `@smartstudy_grades_data`
- **TypeScript Schema**:
  ```typescript
  export type GradingSystem = '5-point' | 'us-letter';

  export interface GradeEntry {
    id: string; // 'gr_' + timestamp + '_' + rand
    grade: number; // 1-5 (or 0-4 for GPA)
    letter?: 'A' | 'B' | 'C' | 'D' | 'F';
    weight: number; // default: 1.0
    date: number; // timestamp
    comment?: string; // optional (e.g. "Control work")
  }

  export interface SubjectPeriodData {
    q1: GradeEntry[];
    q2: GradeEntry[];
    q3: GradeEntry[];
    q4: GradeEntry[];
    exam?: GradeEntry[];
  }

  export interface SubjectRecord {
    id: string;
    name: string;
    targetGrade: number; // e.g. 5 or 4
    periods: SubjectPeriodData;
    allGrades: GradeEntry[]; // Flat list for quick non-period calculation
  }

  export interface GradesStorageSchema {
    settings: {
      gradingSystem: GradingSystem;
      periodMode: 'quarters' | 'semesters' | 'flat';
      thresholds: {
        '5-point': { 5: number; 4: number; 3: number };
        'us-letter': { A: number; B: number; C: number; D: number; F: number };
      };
    };
    subjects: Record<string, SubjectRecord>; // keyed by subject name or id
    quickCalcGrades: GradeEntry[]; // in-memory/local-only quick calculator grades
    updatedAt: number;
  }
  ```

---

## 3. Notes Module Specification

### 3.1 Overview & Architecture
The Notes module is inspired by Google Keep, designed for high usability on mobile. It supports text notes, dynamic checklists, pinning, color accents, tag management, real-time search, reminder scheduling, and grid/list view switching.

### 3.2 Note Data Schema
- **Storage Key**: `@smartstudy_notes_data`
- **TypeScript Schema**:
  ```typescript
  export interface ChecklistItem {
    id: string;
    text: string;
    checked: boolean;
  }

  export interface NoteModel {
    id: string; // Format: 'note_' + timestamp + '_' + rand
    title: string;
    content: string; // Text body (linkified URLs)
    checklist: ChecklistItem[] | null;
    tags: string[]; // Tag list, e.g. ["Math", "Exams", "Ideas"]
    color: string; // Hex color string or "" for default
    pinned: boolean; // Pinned to top section
    reminder: number | null; // Millisecond timestamp
    reminderFired: boolean;
    image: string | null; // Base64 or local file URI
    createdAt: number; // Timestamp
    updatedAt: number; // Timestamp
  }

  export interface NotesStorageSchema {
    notes: Record<string, NoteModel>;
    viewMode: 'grid' | 'list';
    activeTag: string | null; // null = 'All'
    updatedAt: number;
  }
  ```

### 3.3 Color Palette (Authoritative)
The web application defines 10 distinctive background colors for notes:
| Name | Hex Code | Purpose / Semantic |
|------|----------|-------------------|
| Default | `""` (Transparent / Theme Component Bg) | Standard note |
| Red | `#5c2b29` | Urgent, critical deadlines |
| Orange | `#614a19` | Warning, exams, tests |
| Yellow | `#635d19` | Reminders, quick thoughts |
| Green | `#345920` | Completed, approved, biology |
| Teal | `#16504b` | Reading, literature |
| Blue | `#2d555e` | Mathematics, physics |
| Dark Blue | `#1e3a8a` | Computer science, programming |
| Purple | `#42275e` | Languages, history |
| Pink | `#5b2245` | Creative, personal |

### 3.4 CRUD Operations & Interaction Flows
1. **Create**:
   - Two states: **Collapsed** (showing placeholder "Take a note..." with quick checklist and image buttons) and **Expanded** (title input, body textarea / checklist rows, image preview, toolbar).
   - Empty protection: If title, content/checklist, and image are all empty, note is discarded on blur/close.
   - Unique ID generation: `'note_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)`.
2. **Read / List Organization**:
   - **Pinned Section**: Notes where `pinned === true`, sorted by `updatedAt DESC`.
   - **Others Section**: Notes where `pinned === false`, sorted by `updatedAt DESC`.
   - **Empty State**: Shown when no notes exist or filter returns zero matches (displaying lightbulb vector icon and localized text).
3. **Update**:
   - Tapping any note card opens the full-screen / modal editor.
   - Title, text, checklist items, tags, reminder, color, and pin state can be modified.
   - Auto-saves upon closing or tapping outside.
4. **Delete**:
   - Dedicated delete button on note action bar or inside editor.
   - Automatically cancels any pending local notifications for that note.
   - Removes entry from storage.
5. **Pinning**:
   - Instant toggle (`push_pin` icon).
   - Immediately moves note between Pinned and Others sections without re-opening editor.

### 3.5 Checklists & Text Parsing
- Each checklist item has: `checkbox`, `textInput`, and `deleteButton`.
- Pressing `Enter` on any checklist item creates a new item immediately below and focuses it.
- Checklist preview on cards displays up to 5 items; if more than 5 exist, displays a `+{count} more` badge.
- **Linkification**: URLs (`https://...` or `http://...`) are detected and rendered as clickable hyperlinks.

### 3.6 Tag System & Filtering
- **Tags Definition**: Array of strings per note (e.g. `["Algebra", "Homework"]`).
- **Tag Filter Bar**:
  - Horizontal chip list at top of Notes view: `[All, #tag1, #tag2, #tag3, ...]`.
  - Tapping `#tag` filters displayed notes to those containing that tag.
  - Adding tags: Tag input chip inside note editor allows typing new tag or selecting from existing tags.
- **Text Search Filter**:
  - Live query filtering across `title`, `content`/`text`, and checklist item text.
  - Case-insensitive substring match.
  - Combines with Tag filter and Reminder filter.

### 3.7 View Modes (Grid vs. List)
- **Grid View** (`isGridView = true`):
  - 2-column masonry or 2-column flex layout.
  - Compact card heights based on content length.
- **List View** (`isGridView = false`):
  - 1-column full-width cards.
- Mode is toggled via header button (`grid_view` $\leftrightarrow$ `view_agenda`) and persisted to AsyncStorage.

---

## 4. Discovered Features Matrix

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Calculator | Dual-Mode Switching | Toggle between Standard arithmetic and Fraction calculator | Toggle button click | Switches view container, updates localized header | None; defaults to standard | `public/renderer.js:1098` |
| 2 | Calculator | Standard Expression Parsing | Live evaluation of mathematical expressions with brackets | Expression string (0-9, ., +, -, *, /, ()) | Numeric result | Clears result on syntax error; no crash | `public/renderer.js:1114` |
| 3 | Calculator | Division Handling | Dividing any number by zero | `X / 0` | `Infinity` or handled error | Prevents NaN display | `public/renderer.js:1114` |
| 4 | Calculator | Precision Formatting | Avoids JS float inaccuracies (0.1+0.2) | Float calculation | String representation formatted up to 12 digits | Fallback to empty string | `public/renderer.js:1114` |
| 5 | Calculator | Fraction Arithmetic | Addition, subtraction, multiplication, division of fractions | w1, n1, d1, op, w2, n2, d2 | Reduced mixed fraction, decimal, and step breakdown | Returns early if d1 or d2 is 0 | `public/renderer.js:1202` |
| 6 | Calculator | Fraction Steps Display | Visual breakdown of LCD, multipliers, reduction | Two mixed fractions & operator | HTML formatted fraction steps | Empty if invalid denominators | `public/renderer.js:1122` |
| 7 | Calculator | Calculation History | AsyncStorage persistence of past calculations | Successfully evaluated expression | History list with recall & clear options | Capped at 50 to prevent overflow | `ORIGINAL_REQUEST.md:24` |
| 8 | Grades | 5-Point System | Standard Russian grading (1-5) | Integer grades 1-5 | Simple & weighted average, progress bar | Clamps inputs to 1-5 | `public/renderer.js:1458` |
| 9 | Grades | US Letter / GPA System | US academic grading (A-F, 4.0 scale) | Letter grades A, B, C, D, F | GPA (0.00-4.00), progress bar | Unrecognized letters map to 'A' or 'F' | `public/renderer.js:1520` |
| 10 | Grades | Weight / Coefficient System | Individual grade weights for tests, exams, homework | Grade value & weight float (e.g. 1.0, 2.0) | Weighted average score | Default weight 1.0 if unspecified | `privacy.html:665` & `ORIGINAL_REQUEST.md:25` |
| 11 | Grades | Quarter/Semester Mode | Segregates grades into 4 quarters or 2 semesters | Quarter tab selection, grade additions | Per-quarter average and calculated final year grade | Empty quarters excluded from year average | `ORIGINAL_REQUEST.md:25` |
| 12 | Grades | Subject Management | Add, list, switch, and delete user subjects | Subject name string | Subject chips, subject cards | Ignores empty or duplicate names | `public/renderer.js:2287` |
| 13 | Grades | Quick Calc Mode | Local-only quick calculation without saving to subject list | Numerical or letter grades | Temporary average & progress bar | Never persisted to cloud/subject list | `public/renderer.js:1269` |
| 14 | Grades | What-If Simulator | Predicts impact of hypothetical grade before adding | Simulated grade input (1-5 or A-F) | Comparison: Current avg vs Simulated avg | Alerts user if input out of range | `public/renderer.js:2605` |
| 15 | Grades | Strategy: Needed Top Grades | Computes count of 5s / A's to reach target threshold | Target grade threshold | Count of top grades needed, new average | Verdict: "Goal already achieved" if avg >= threshold | `public/renderer.js:3027` |
| 16 | Grades | Strategy: Mixed Variants | Alternating 5s and 4s simulation | Target grade threshold | Count of 5s & 4s needed | Hidden if target already met | `public/renderer.js:3042` |
| 17 | Grades | Strategy: Grade Fix | Identifies lowest grade (<4) and shows outcome if replaced by 5 | Current grade array | Outcome average if 1 bad grade replaced | Hidden if no bad grades or threshold unreachable | `public/renderer.js:3054` |
| 18 | Grades | Custom Thresholds | User-customizable thresholds per grade level | Threshold floats (e.g. 5: 4.50, 4: 3.50) | Updated threshold boundaries for strategy & GPA | Validated min/max; rejects NaN | `public/renderer.js:2445` |
| 19 | Notes | Collapsed/Expanded Creator | Google Keep style note input card | Tap collapsed / tap check / tap image | Expanded editor with toolbar | Discards empty note on blur | `public/notes.js:383` |
| 20 | Notes | Dynamic Checklists | To-do lists with toggleable check boxes | Item text, Enter key press | Interactive checklist items | Discards empty checklist rows on save | `public/notes.js:758` |
| 21 | Notes | Note Pinning | Pins notes to prominent top section | Push pin icon toggle | Note moved to/from pinned section | None | `public/notes.js:1002` |
| 22 | Notes | Color Selection | 10 distinctive background colors | Color dot selection | Applies background tint to note card | Fallback to default card background | `public/notes.js:746` & `index.html:477` |
| 23 | Notes | Tag System & Filtering | Labeling notes with custom tags and filter bar | Tag strings array, chip selection | Filtered note list by selected tag | "All" shows all notes | `ORIGINAL_REQUEST.md:26` |
| 24 | Notes | Text Search | Instant search filtering across title, text, and checklists | Search query string | Filtered note list matching query | Empty query restores full list | `public/notes.js:847` |
| 25 | Notes | View Mode Toggle | Switches between 2-column Grid and 1-column List | View mode icon button | Changes layout structure; updates icon | Persisted in storage | `public/notes.js:324` |
| 26 | Notes | Reminders & Notifications | Schedule datetime reminder with push/local notification | Datetime string / timestamp | Reminder badge on card; notification trigger | Expired reminders show visual chip | `public/notes.js:540` |
| 27 | Notes | Linkification | Converts URLs in note body to clickable links | URLs in body text | Styled clickable `<a>` / Link component | Sanitized against HTML injection | `public/notes.js:356` |
| 28 | Notes | Image Attachment | Attach image to note | Image picker file / URI | Image thumbnail displayed on card | Remove button clears image | `public/notes.js:452` |

---

## 5. Edge Cases & Boundary Behaviors

| # | Feature | Input / Condition | Observed Behavior & Authoritative Handling |
|---|---------|-------------------|---------------------------------------------|
| 1 | Standard Calculator | Division by Zero (`8 ÷ 0`) | In JS evaluates to `Infinity`. Mobile must display `Error` or `Division by zero` without crashing or freezing Metro. |
| 2 | Standard Calculator | Incomplete syntax (`12 + * 3` or trailing `5 +`) | Caught by evaluation exception. Live preview displays empty string `""`. Display retains input until user corrects it. |
| 3 | Standard Calculator | Unbalanced parentheses (`(5 + 3 * (2 - 1)`) | Does not evaluate in live preview. When `=` is pressed, parser auto-closes missing closing parentheses or reports invalid syntax. |
| 4 | Standard Calculator | Percentage chained (`100 + 10% + 10%`) | `100 + 10% = 110`. Adding another `+ 10%` evaluates on the new subtotal: `110 + 11 = 121`. |
| 5 | Standard Calculator | Very large numbers (`999999999999 * 999999999999`) | Evaluates in exponential format `9.99999999998e+23`. Display handles long text by font scaling / horizontal scrolling. |
| 6 | Fraction Calculator | Denominator is zero (`d1 = 0` or `d2 = 0`) | Operation is aborted immediately; result remains blank. Zero denominator is mathematically forbidden. |
| 7 | Fraction Calculator | Dividing by fraction equal to zero (`0/5`) | `resDen` becomes 0 in division (`d1 * num2`). Guarded by `if (resDen === 0) return;`. |
| 8 | Fraction Calculator | Improper fraction reduction (`12 / 4`) | `whole = 3`, `rem = 0`. Display shows clean integer `3` without fraction bar. |
| 9 | Grade Average | Zero grades in subject | Average displays `0.00`. Progress bar is `0%`. Strategy verdict prompts: "Enter grades on the Grades tab". |
| 10 | Grade Average | Target grade already reached (`currentAvg >= target`) | Strategy does not calculate needed fives; returns celebratory message: "Great! You already have an average of {avg}...". |
| 11 | Grade Average | Target mathematically impossible (e.g. current avg 2.0, target 5.0) | Simulates up to cap of 20 fives. Displays count needed up to 20 or explains goal requires more than 20 perfect grades. |
| 12 | Grade Average | Switching grading system (5-point $\leftrightarrow$ US letter) | Automatic bidirectional mapping: `5 ↔ A, 4 ↔ B, 3 ↔ C, 2 ↔ D, 1 ↔ F`. Converts all existing subject grades seamlessly. |
| 13 | Grade Average | Grade with weight 0 (`weight = 0`) | Excluded from weighted divisor so division by zero is avoided (`sum(weights) > 0`). |
| 14 | Grade Average | Deleting active subject | If currently selected subject is deleted, current subject automatically falls back to `'__QUICK_CALC__'`. |
| 15 | Notes Module | Empty note creation (no title, text, checklist, or image) | Creator silently cancels on blur/close; does not save empty records into AsyncStorage. |
| 16 | Notes Module | Checklist item with empty text | Filtered out on save: `checklist.filter(i => i.text.trim())`. If no items remain, checklist is nullified. |
| 17 | Notes Module | Search query with special characters / regex tokens | Escaped safely before matching; performs normalized lowercase substring lookup across title, text, and checklist items. |
| 18 | Notes Module | Deleting note with pending notification | Local notification is explicitly cancelled via ID hash (`cancelLocalNotification`) before deleting note from storage. |
| 19 | Notes Module | Note with extremely long title or text | Cards use `numberOfLines` clamping in grid preview; full text accessible upon opening edit modal. |
| 20 | Notes Module | Duplicate tag assignment | Tag list is sanitized as a `Set` to eliminate duplicate tags on the same note. |

---

## 6. Mobile Porting Implementation Guidelines (React Native / Expo)

1. **Strict Emoji Ban Compliance**:
   - `ORIGINAL_REQUEST.md` and `AGENTS.md` strictly prohibit all Unicode emojis.
   - Use `@expo/vector-icons` (`Feather` or `MaterialIcons`) for all iconography:
     - Backspace: `Feather.delete` or `Feather.arrow-left`
     - Push pin: `MaterialIcons.push-pin`
     - Reminder / Bell: `Feather.bell`
     - Palette / Colors: `Feather.droplet` or `MaterialIcons.palette`
     - Checkboxes: `Feather.check-square` and `Feather.square`
     - View switch: `Feather.grid` and `Feather.list`
     - What-If Simulator: `Feather.help-circle`
     - Search: `Feather.search`
     - Trash / Delete: `Feather.trash-2`

2. **AsyncStorage Integration**:
   - Package: `@react-native-async-storage/async-storage`
   - Store grades under key: `@smartstudy_grades_data`
   - Store notes under key: `@smartstudy_notes_data`
   - Store calculator history under key: `@smartstudy_calc_history`
   - Maintain timestamps (`updatedAt`) on all entities.

3. **Smooth Key Presses & Feedback**:
   - Wrap buttons in `Pressable` or `TouchableOpacity` with active opacity `0.7` and slight scale feedback.
   - Standard calculator buttons grid: 4 columns, equals button spanning all 4 columns or accent colored.
