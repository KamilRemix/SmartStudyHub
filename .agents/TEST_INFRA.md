# E2E Test Infra: SmartStudyHub Mobile Expo Clone

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise + Workload Testing.
- Execution via Node/Jest/TypeScript runner in `mobile-expo/tests/` without requiring external emulators, verifying pure logic, storage interactions, state management, calculation accuracy, and component export validity.

## Feature Inventory & Test Coverage Mapping
| # | Feature | Source | Tier 1 (Min 5) | Tier 2 (Min 5) | Tier 3 (Pairwise) | Tier 4 (Real-World) |
|---|---------|--------|:--------------:|:--------------:|:-----------------:|:-------------------:|
| 1 | Standard Calculator | R3 | 5 | 5 | ✓ | ✓ |
| 2 | Fraction Calculator | R3 | 5 | 5 | ✓ | ✓ |
| 3 | Calculator History | R3 | 5 | 5 | ✓ | ✓ |
| 4 | Grade Average (1-5 Scale) | R3 | 5 | 5 | ✓ | ✓ |
| 5 | US Letter GPA Scale | R3 | 5 | 5 | ✓ | ✓ |
| 6 | Academic Periods (Quarter/Semester) | R3 | 5 | 5 | ✓ | ✓ |
| 7 | What-If Simulator & Strategy | R3 | 5 | 5 | ✓ | ✓ |
| 8 | Grades AsyncStorage | R3 | 5 | 5 | ✓ | ✓ |
| 9 | Notes CRUD & Schema | R3 | 5 | 5 | ✓ | ✓ |
| 10 | Note Checklists & Tags | R3 | 5 | 5 | ✓ | ✓ |
| 11 | Note Search, Colors & Views | R3 | 5 | 5 | ✓ | ✓ |
| 12 | Notes AsyncStorage | R3 | 5 | 5 | ✓ | ✓ |
| 13 | Length & Mass Converters | R4 | 5 | 5 | ✓ | ✓ |
| 14 | Temperature Converter | R4 | 5 | 5 | ✓ | ✓ |
| 15 | Currency Converter & Cache | R4 | 5 | 5 | ✓ | ✓ |
| 16 | Translator & Fallback | R4 | 5 | 5 | ✓ | ✓ |
| 17 | Translator Favorites & Swap | R4 | 5 | 5 | ✓ | ✓ |
| 18 | TTS Integration (expo-speech) | R4 | 5 | 5 | ✓ | ✓ |
| 19 | GenPass Generator & Options | R4 | 5 | 5 | ✓ | ✓ |
| 20 | Password Strength Analysis | R4 | 5 | 5 | ✓ | ✓ |
| 21 | Theming (Light/Dark Switch) | R1 | 5 | 5 | ✓ | ✓ |
| 22 | Navigation & Hardcoded Package | R1 | 5 | 5 | ✓ | ✓ |
| 23 | Emoji Ban & Vector Icons | R2 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- Test Runner: Node / Jest / ts-node runner executing in `mobile-expo`.
- Command: `npm test` or `npx jest --runInBand` in `mobile-expo`.
- Exit criteria: All tests pass with exit code 0.
- Quality Gates:
  - `npx tsc --noEmit` -> 0 errors.
  - `npx expo export` -> bundle successfully compiled.
  - Zero unicode emojis in UI files.
  - `app.json` has `"package": "com.smartstudyhub.mobile"`.
  - Zero `// TODO` or `// FIXME` in core logic.

## Coverage Thresholds
- Tier 1 (Feature Coverage): ≥5 per feature (~115 test cases)
- Tier 2 (Boundary & Corner Cases): ≥5 per feature (~115 test cases)
- Tier 3 (Cross-Feature Combinations): Pairwise feature interactions (~25 test cases)
- Tier 4 (Real-World Application Scenarios): Realistic multi-step user flows (≥12 scenarios)
- **Total Minimum Target: ~260+ automated test cases**
