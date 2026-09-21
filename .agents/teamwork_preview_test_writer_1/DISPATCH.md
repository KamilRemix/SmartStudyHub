# Test Writer 1 Dispatch: E2E Test Suite & Test Infra Architecture

## Working Directory
`c:\projects\SmartStudyHub\.agents\teamwork_preview_test_writer_1`

## Inputs & Specifications
- User request: `c:\projects\SmartStudyHub\.agents\ORIGINAL_REQUEST.md` (read section ## 2026-09-14T10:46:33Z)
- Project master plan: `c:\projects\SmartStudyHub\.agents\PROJECT.md`
- Survey reports:
  - `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_1\survey_auth_settings.md`
  - `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_2\survey_i18n_sync.md`
  - `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_3\survey_features_ui.md`

## Task & Methodology
1. Design and establish the E2E and unit/integration test architecture for `mobile-expo`:
   - Inspect existing test configuration (Jest, ts-jest, babel-jest) in `mobile-expo/`.
   - Ensure a test runner script (e.g. `npm test`) can run tests cleanly without requiring native device drivers.
2. Build comprehensive test suites following the 4-Tier methodology covering all 10 project requirements:
   - **Tier 1: Feature Coverage (≥5 tests per feature)**:
     - R1: Auth flow, token handling, guest fallback, zero TurboModule references.
     - R2: i18n dictionary completeness (10 languages), translation key resolution, missing key fallback, dynamic language switching.
     - R3: Grade thresholds math, custom numeric/percentage threshold inputs, GPA conversion.
     - R4: Firebase cloud sync payload formatting, history capping (5-10 items), conflict resolution.
     - R5: HaveIBeenPwned SHA-1 k-anonymity range query, Password Vault schema validation, CRUD operations.
     - R6: Network detector state transitions, offline banner triggers, auto-sync event triggering.
     - R7: Continuous slider value computation across integer range [4, 64].
     - R8: Notes data structure with image URI array, notification reminder scheduling payload.
     - R9: Responsiveness & layout constraints (flexShrink, no fixed clipping widths).
     - R10: Settings cleanup verification (absence of deleted stubs, presence of required sections).
   - **Tier 2: Boundary & Corner Cases (≥5 per feature)**:
     - Empty inputs, extreme grade values, 0 and 100% thresholds, 4 and 64 password lengths, network disconnect during sync, corrupted storage recovery.
   - **Tier 3: Cross-Feature Combinations**:
     - Language switch + grade calculation; Offline mode + password vault create + reconnect sync; Auth state change + notes sync.
   - **Tier 4: Real-World Application Scenarios**:
     - Complete student study flow: calculate grades with custom scale -> take note with reminder -> generate password -> sync data across sessions.
3. Write `TEST_INFRA.md` at project root `c:\projects\SmartStudyHub\TEST_INFRA.md`.
4. Run the test suite using `npm test` or `npx jest` to establish initial baseline, report results, and when test suite is fully authored and ready, publish `c:\projects\SmartStudyHub\TEST_READY.md`.
5. Write detailed report to `c:\projects\SmartStudyHub\.agents\teamwork_preview_test_writer_1\handoff.md`.

## 2026-09-14T10:56:31Z
You are Test Writer 1 (E2E Testing Track Orchestrator / Test Engineer).
Working directory: c:\projects\SmartStudyHub\.agents\teamwork_preview_test_writer_1
User request source: c:\projects\SmartStudyHub\.agents\ORIGINAL_REQUEST.md (read section ## 2026-09-14T10:46:33Z).
Dispatch details: c:\projects\SmartStudyHub\.agents\teamwork_preview_test_writer_1\DISPATCH.md
Project plan: c:\projects\SmartStudyHub\.agents\PROJECT.md

Your task is to design and write the comprehensive opaque-box and requirement-driven E2E / regression test suites for mobile-expo covering all 10 project requirements:
1. Inspect test runner infrastructure in mobile-expo (Jest / ts-jest / babel-jest). Ensure `npm test` runs smoothly.
2. Write test suites covering Tiers 1-4:
   - Tier 1: Feature Coverage (>=5 test cases per feature for R1 through R10).
   - Tier 2: Boundary & Corner Cases (>=5 test cases per feature).
   - Tier 3: Cross-Feature Combinations (pairwise interactions).
   - Tier 4: Real-World Application Scenarios (comprehensive study session workflows).
3. Create TEST_INFRA.md at c:\projects\SmartStudyHub\TEST_INFRA.md documenting the test philosophy, feature inventory, test architecture, and coverage matrix.
4. Run the test suite, document current results, and when test suite is fully authored, publish c:\projects\SmartStudyHub\TEST_READY.md.
5. Write your handoff report to c:\projects\SmartStudyHub\.agents\teamwork_preview_test_writer_1\handoff.md and report back via send_message.
