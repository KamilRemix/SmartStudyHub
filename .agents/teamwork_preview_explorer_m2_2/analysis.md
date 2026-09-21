# Grade Average Module — Technical Analysis & Architecture Specification

## Executive Summary
This document provides the authoritative technical analysis and architectural blueprint for the **Grade Average & Academic Tracker Module** (Features 10–15 in `PROJECT.md`) of the SmartStudyHub React Native Expo application (`mobile-expo/`).

The analysis is based on:
1. The authoritative specification in `ORIGINAL_REQUEST.md` and `PROJECT.md`.
2. Reverse engineering of the web implementation in `public/renderer.js` (`GradeAverageCalculator` Web Component, lines 1264–3305) and `public/translations.js`.
3. Inspection of the current placeholder state in `mobile-expo/src/modules/grades/GradesScreen.tsx` and design system tokens in `mobile-expo/src/theme/`.

---

## 1. Requirement Traceability Matrix

| Feature # | PROJECT.md Name | Web Baseline Reference | Mobile Requirements & Scope |
|---|---|---|---|
| **10** | 5-Point Grade Averaging | `public/renderer.js:1458` (`addGradeToSubject`), `1503` (`calculateAverageForSubject`) | 5-point Russian academic scale (`1, 2, 3, 4, 5`) with custom grade weights/coefficients (`1.0x, 1.5x, 2.0x, 3.0x`), weighted average calculation, and customizable rounding thresholds. |
| **11** | US Letter GPA Scale | `public/renderer.js:1520` (`calculateAverageForSubject`), `1424` (`convertGradesToSystem`) | US Letter grade scale (`A, B, C, D, F`) mapped to 4.0 GPA (`4.0, 3.0, 2.0, 1.0, 0.0`), weighted GPA calculation, percentage thresholds, and seamless bidirectional conversion with 5-point scale. |
| **12** | Academic Periods | `ORIGINAL_REQUEST.md:25`, `privacy.html:665` | Segregation of grades into 4 Quarters (`Q1, Q2, Q3, Q4`) or 2 Semesters (`S1, S2`), per-period averages, and calculated Annual cumulative projection (`Годовая оценка`). |
| **13** | What-If Grade Simulator | `public/renderer.js:2605` (`showSimulator`) | Interactive simulation modal allowing students to test hypothetical grades and weights, previewing the projected impact $\Delta$ on their GPA/average with instant "Apply" or "Cancel" options. |
| **14** | Grade Strategy Engine | `public/renderer.js:2997` (`updateStrategy`), `3004` (`updateStrategy5Point`), `3078` (`updateStrategyUS`) | Target threshold calculator computing: (1) exact number of top grades (5s or A's) needed, (2) mixed 5s/4s path, and (3) remediation by replacing lowest grade with a 5. |
| **15** | Grades AsyncStorage | `public/renderer.js:1289` (`saveToDatabase`), `3126` (`loadFromDatabase`) | Full offline-first local persistence under `@smartstudy_grades_data` key covering subjects, grade items, weights, active periods, and threshold preferences. |

---

## 2. Mathematical Formulations & Algorithms

### 2.1 5-Point Russian Scale & Weighted Average
In Russian academic grading:
- `5`: Отлично (Excellent)
- `4`: Хорошо (Good)
- `3`: Удовлетворительно (Satisfactory)
- `2`: Неудовлетворительно (Unsatisfactory / Fail)
- `1`: Плохо (Poor / Fail)

Each grade entry $i \in \{1, \dots, N\}$ has a numeric grade value $g_i \in \{1, 2, 3, 4, 5\}$ and a positive weight coefficient $w_i > 0$.
Common standard weight presets:
- $w = 1.0$: Homework / Classwork / Blackboard answer (Ответ на уроке / ДЗ)
- $w = 1.5$: Independent work / Quiz / Verification test (Самостоятельная работа / Тест)
- $w = 2.0$: Control work / Quarter test / Essay (Контрольная работа / Сочинение)
- $w = 3.0$: Examination / Olympiad (Экзамен / ВПР / Олимпиада)

#### Weighted Average Formula:
$$\text{Average} = \frac{\sum_{i=1}^{N} (g_i \times w_i)}{\sum_{i=1}^{N} w_i}$$

- **Edge case ($N = 0$ or $\sum w_i = 0$)**: Evaluates to `0.00`.
- **Precision**: Formatted to exactly 2 decimal places (`Average.toFixed(2)`).
- **Progress Fill Ratio**: $\min\left(100, \frac{\text{Average}}{5.0} \times 100\right)\%$.

#### Threshold Evaluation:
The final rounded period grade $G_{\text{final}}$ is evaluated based on customizable thresholds:
$$G_{\text{final}} = \begin{cases} 
5 & \text{if } \text{Average} \ge T_5 \quad (\text{default: } 4.50) \\
4 & \text{if } T_4 \le \text{Average} < T_5 \quad (\text{default: } 3.50) \\
3 & \text{if } T_3 \le \text{Average} < T_4 \quad (\text{default: } 2.50) \\
2 & \text{if } \text{Average} < T_3
\end{cases}$$

---

### 2.2 US Letter GPA Scale & Bidirectional Conversion

#### Grade Points Mapping:
| Letter Grade | Standard GPA Points | Web Point Map (`gradeMap`) | Default Percentage Threshold |
|---|---|---|---|
| **A** | 4.0 | 4.0 | $\ge 90\%$ |
| **B** | 3.0 | 3.0 | $\ge 80\%$ |
| **C** | 2.0 | 2.0 | $\ge 70\%$ |
| **D** | 1.0 | 1.0 | $\ge 60\%$ |
| **F** | 0.0 | 0.0 | $< 60\%$ |

#### Weighted GPA Formula:
$$\text{GPA} = \frac{\sum_{i=1}^{N} (\text{points}(g_i) \times w_i)}{\sum_{i=1}^{N} w_i}$$
- **Edge case ($N = 0$)**: Evaluates to `0.00`.
- **Progress Fill Ratio**: $\min\left(100, \frac{\text{GPA}}{4.0} \times 100\right)\%$.

#### Bidirectional Conversion Logic:
When the user switches grading systems in Settings or within the module:
1. **5-Point $\rightarrow$ US Letter**:
   $$5 \mapsto \text{'A'}, \quad 4 \mapsto \text{'B'}, \quad 3 \mapsto \text{'C'}, \quad 2 \mapsto \text{'D'}, \quad 1 \mapsto \text{'F'}$$
2. **US Letter $\rightarrow$ 5-Point**:
   $$\text{'A'} \mapsto 5, \quad \text{'B'} \mapsto 4, \quad \text{'C'} \mapsto 3, \quad \text{'D'} \mapsto 2, \quad \text{'F'} \mapsto 1$$
3. **Threshold Switching**:
   - 5-point thresholds: `{ 5: 4.50, 4: 3.50, 3: 2.50 }`
   - US Letter thresholds: `{ A: 90, B: 80, C: 70, D: 60, F: 0 }` (or GPA equivalents: 3.50, 2.50, 1.50, 0.50).

---

### 2.3 Academic Periods & Annual Projection

#### Supported Period Modes:
1. **Quarters Mode (`quarters`)**: 4 Quarters (`q1`, `q2`, `q3`, `q4`) and Annual (`annual`).
2. **Semesters Mode (`semesters`)**: 2 Semesters (`s1`, `s2`) and Annual (`annual`).

#### Computation Rules:
1. **Per-Period Average**:
   For a subject $S$ in period $P$:
   $$\text{Avg}(S, P) = \frac{\sum_{g \in S.\text{grades}, g.\text{period} = P} (g.\text{value} \times g.\text{weight})}{\sum_{g \in S.\text{grades}, g.\text{period} = P} g.\text{weight}}$$

2. **Annual Cumulative Aggregation (`annual`)**:
   - In Quarters mode:
     Let $Q_{\text{active}} \subseteq \{q1, q2, q3, q4\}$ be the set of quarters with $\ge 1$ recorded grade.
     $$\text{AnnualAvg}(S) = \frac{\sum_{q \in Q_{\text{active}}} \text{Avg}(S, q)}{|Q_{\text{active}}|}$$
     If $|Q_{\text{active}}| = 0$, $\text{AnnualAvg}(S) = 0.00$.
   - In Semesters mode:
     Let $M_{\text{active}} \subseteq \{s1, s2\}$ be the set of semesters with $\ge 1$ recorded grade.
     $$\text{AnnualAvg}(S) = \frac{\sum_{s \in M_{\text{active}}} \text{Avg}(S, s)}{|M_{\text{active}}|}$$

3. **Overall Academic GPA Across All Subjects**:
   $$\text{GlobalGPA}(P) = \frac{\sum_{S \in \text{Subjects}} \text{Avg}(S, P)}{|\text{Subjects}|}$$

---

### 2.4 "What-If" Simulator Algorithm
When testing a hypothetical grade $g_{\text{hypo}}$ with weight $w_{\text{hypo}}$:
1. Current weighted sum: $S = \sum_{i=1}^N (g_i \times w_i)$, total weight $W = \sum_{i=1}^N w_i$.
2. Current average: $A_{\text{curr}} = W > 0 ? \frac{S}{W} : 0$.
3. Simulated average:
   $$A_{\text{sim}} = \frac{S + (g_{\text{hypo}} \times w_{\text{hypo}})}{W + w_{\text{hypo}}}$$
4. Delta: $\Delta = A_{\text{sim}} - A_{\text{curr}}$.
5. User actions:
   - **Apply**: Commits $g_{\text{hypo}}$ with weight $w_{\text{hypo}}$ and timestamp `Date.now()` to the subject's grade list in AsyncStorage.
   - **Cancel**: Closes modal and leaves state untouched.

---

### 2.5 Target Grade Strategy Engine
Given a target grade $G_{\text{target}}$ and its threshold $T$ (e.g., $T = 4.50$ for 5, or $T = 3.50$ for A):

1. **Check if already achieved**:
   If $A_{\text{curr}} \ge T$:
   Verdict: `"Отлично! Текущий балл {avg} уже достигает цели {grade}. Главное — не снижать планку!"`

2. **Strategy 1: Needed Top Grades ($G_{\max} = 5$ or $4.0$)**:
   Solve for $k$ additional grades of value $G_{\max}$ with weight $w = 1.0$:
   $$\frac{S + k \times G_{\max}}{W + k} \ge T \implies k \times (G_{\max} - T) \ge T \times W - S$$
   $$k = \left\lceil \frac{T \times W - S}{G_{\max} - T} \right\rceil$$
   - Iteration safety cap: 20 grades.
   - If $k \le 20$: Displays exact count $k$ and new average $\frac{S + k \times G_{\max}}{W + k}$.
   - If $k > 20$: Displays `"Для достижения цели потребуется более 20 отличных оценок ({k})."`

3. **Strategy 2: Mixed 5s and 4s**:
   Simulates alternating additions $[5, 4, 5, 4, \dots]$ until $\ge T$ or iteration limit (20) reached.
   Outputs: `"{fives} пятерок и {fours} четверок → средний балл {avg}"`.

4. **Strategy 3: Remediation (Fix Lowest Grade)**:
   Scans subject grades for any $g_j < 4$.
   Simulates replacing the lowest grade $g_{\min}$ with a 5 (preserving its weight $w_{\min}$):
   $$S_{\text{fix}} = S - (g_{\min} \times w_{\min}) + (5 \times w_{\min})$$
   $$A_{\text{fix}} = \frac{S_{\text{fix}}}{W}$$
   If $A_{\text{fix}} \ge T$:
   Outputs: `"Исправление: замените оценку {min} на 5 → средний балл {avg} (цель достигнута!)"`.

---

## 3. Data Architecture & AsyncStorage Schema

### 3.1 Contract Definitions
```typescript
// mobile-expo/src/modules/grades/types.ts

export type GradingSystem = '5-point' | 'us-letter';
export type PeriodType = 'q1' | 'q2' | 'q3' | 'q4' | 's1' | 's2' | 'annual';
export type PeriodMode = 'quarters' | 'semesters';

export interface GradeEntry {
  id: string; // e.g. 'gr_1726145000_abc'
  value: number; // 1-5 (5-point) or 0-4 (US GPA)
  letter?: 'A' | 'B' | 'C' | 'D' | 'F';
  weight: number; // 1.0, 1.5, 2.0, 3.0, etc.
  period: PeriodType;
  date: number; // timestamp ms
  comment?: string;
}

export interface SubjectItem {
  id: string; // e.g. 'subj_1726145000_xyz'
  name: string;
  targetGrade: number | string; // 5 or 'A'
  grades: GradeEntry[];
}

export interface ThresholdSettings {
  '5-point': { 5: number; 4: number; 3: number };
  'us-letter': { A: number; B: number; C: number; D: number; F: number };
}

export interface GradesStorageData {
  settings: {
    gradingSystem: GradingSystem;
    periodMode: PeriodMode;
    activePeriod: PeriodType;
    thresholds: ThresholdSettings;
  };
  subjects: SubjectItem[];
  updatedAt: number;
}
```

### 3.2 Storage Keys & Initial Seed
- **AsyncStorage Key**: Strictly `@smartstudy_grades_data` (matching `PROJECT.md:90`).
- **Initial Default State**:
```typescript
export const DEFAULT_GRADES_STORAGE: GradesStorageData = {
  settings: {
    gradingSystem: '5-point',
    periodMode: 'quarters',
    activePeriod: 'q1',
    thresholds: {
      '5-point': { 5: 4.50, 4: 3.50, 3: 2.50 },
      'us-letter': { A: 90, B: 80, C: 70, D: 60, F: 0 },
    },
  },
  subjects: [],
  updatedAt: Date.now(),
};
```

---

## 4. UI / UX Layout & Component Hierarchy

### 4.1 Component Tree Architecture
```
GradesScreen (Container)
├── AppHeader (Title: "Средний балл", Subtitle: "5-балльная • 1 Четверть", Actions: plus, sliders)
├── PeriodSelectorBar (Horizontal chips: Q1, Q2, Q3, Q4, Годовая / S1, S2, Годовая)
├── ScrollView (Main Scroll Area)
│   ├── GlobalSummaryCard (All subjects GPA, subject count, period badge)
│   ├── SubjectSelectorTrack (Horizontal scroll track: "Быстрый подсчет" [zap], Subject chips [book])
│   ├── SubjectDetailCard
│   │   ├── ScoreDisplay (Hero number: "4.67", rating bar, progress percentage)
│   │   ├── GradeChipsList (Pill badges with value & weight "2.0x", delete button "x")
│   │   └── WhatIfTriggerButton (Feather "help-circle", "Что если?")
│   ├── GradeInputKeypad
│   │   ├── WeightSelectorRow (Pills: 1.0x Обычная, 1.5x Самост., 2.0x Контр., 3.0x Экзамен)
│   │   ├── GradeButtonsRow (Buttons: 1, 2, 3, 4, 5 or A, B, C, D, F)
│   │   └── ActionButtonsRow (Backspace "delete", Clear "trash-2")
│   ├── StrategyEngineCard
│   │   ├── TargetSelector (Segmented buttons: 5, 4, 3 or A, B, C)
│   │   ├── PrimaryVerdictBox (Feather "info" / "check-circle", count of needed grades)
│   │   └── AlternativeVariantsList (Mixed path card, fix lowest grade card)
│   └── AnnualProjectionTable (Visible when "Годовая" tab is active)
├── AddSubjectModal (Modal for creating named subject)
├── ThresholdsModal (Modal for adjusting school cutoffs and period mode)
└── WhatIfModal (Modal for entering hypothetical grade + weight and previewing delta)
```

### 4.2 Strict Emoji Ban Protocol
In accordance with `AGENTS.md` and `PROJECT.md`:
- **ZERO Unicode emojis** in source code or UI strings.
- Mapping of all iconography to `@expo/vector-icons` (`Feather`):
  - Subject chip icon: `Feather name="book"`
  - Quick calc icon: `Feather name="zap"`
  - Add subject: `Feather name="plus"`
  - Settings / Thresholds: `Feather name="sliders"`
  - What-If simulator: `Feather name="help-circle"`
  - Backspace / Delete last: `Feather name="delete"`
  - Clear all grades: `Feather name="trash-2"`
  - Delete grade chip: `Feather name="x"`
  - Strategy target: `Feather name="target"`
  - Target achieved: `Feather name="check-circle"`
  - Alert / warning: `Feather name="alert-circle"`
  - Analytics / stats: `Feather name="bar-chart-2"`

---

## 5. Edge Cases & Boundary Conditions

1. **Zero Grades in Subject**:
   - Average displays `0.00`.
   - Rating progress bar shows `0%`.
   - Grade chips area displays empty placeholder: `"Оценки еще не выставлены"`.
   - Strategy engine displays guidance: `"Введи оценки для расчета стратегии"`.
2. **Division by Zero Protection**:
   - When total weight $\sum w_i = 0$, average calculation returns `0.00` immediately without returning `NaN`.
3. **Weight Boundary Enforcement**:
   - Weights must be positive finite numbers ($w > 0$). Default is `1.0`.
4. **Target Grade Already Met**:
   - When $A_{\text{curr}} \ge T$, needed grades calculation is bypassed, rendering the celebratory status verdict without showing negative or zero counts.
5. **Target Mathematically Unreachable**:
   - If target $T \ge 5.0$ and current average is low, required fives $k \to \infty$. The solver terminates at cap $k = 20$ and displays informative message.
6. **Active Subject Deletion**:
   - When the currently active subject is deleted, active subject selection falls back to `"__QUICK_CALC__"` or the first remaining subject.
7. **Cold Start & Storage Race Conditions**:
   - If AsyncStorage returns `null` or empty JSON on cold start, initialize with `DEFAULT_GRADES_STORAGE` without overwriting existing data.
   - Use atomic state updates and debounce saves.

---

## 6. Verification & Implementation Roadmap
1. **Model & Service Layer**: Create `mobile-expo/src/modules/grades/types.ts` and `mobile-expo/src/modules/grades/gradesService.ts` with pure calculation functions (`calculateWeightedAverage`, `calculateStrategy`, `convertScale`).
2. **Subcomponents**:
   - `SubjectChipBar.tsx`
   - `GradeKeypad.tsx`
   - `WhatIfModal.tsx`
   - `StrategyCard.tsx`
   - `ThresholdsModal.tsx`
   - `AnnualSummaryTable.tsx`
3. **Integration**: Wire full interactive state into `mobile-expo/src/modules/grades/GradesScreen.tsx`.
4. **Automated Unit Tests**: Cover all edge cases with deterministic test cases.
