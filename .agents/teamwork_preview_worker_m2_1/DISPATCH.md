## 2026-09-12T12:14:00Z
You are teamwork_preview_worker_m2_1 (Core Modules Implementation Worker).
Your working directory is: c:\projects\SmartStudyHub\.agents\teamwork_preview_worker_m2_1

MANDATORY FIRST STEP:
Read the authoritative user request at:
c:\projects\SmartStudyHub\.agents\ORIGINAL_REQUEST.md
Also read the project architecture at:
c:\projects\SmartStudyHub\.agents\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

BLUEPRINTS & SPECIFICATIONS TO READ:
Read the comprehensive Explorer analyses and handoffs:
1. Calculator:
   - c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m2_1\analysis.md
   - c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m2_1\handoff.md
2. Grades:
   - c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m2_2\analysis.md
   - c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m2_2\handoff.md
3. Notes:
   - c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m2_3\analysis.md
   - c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m2_3\handoff.md

OBJECTIVE:
Implement the complete, genuine, production-grade logic and UI for Milestone 2 (Core Modules) in c:\projects\SmartStudyHub\mobile-expo:
1. MODULE: CALCULATOR (mobile-expo/src/modules/calculator/)
2. MODULE: GRADE AVERAGE (mobile-expo/src/modules/grades/)
3. MODULE: NOTES (mobile-expo/src/modules/notes/)

STRICT RULES & CONSTRAINTS:
- ZERO EMOJIS in UI code or strings. Strictly use Feather vector icons from @expo/vector-icons.
- Zero // TODO or // FIXME in core logic. Full genuine implementation required.
- Do NOT touch web app files outside mobile-expo/.
- Package ID must remain package: com.smartstudyhub.mobile.
- Run verification commands inside mobile-expo/:
  1. npx tsc --noEmit -> Must exit with 0 errors.
  2. npx expo export --no-bytecode -> Must bundle successfully with 0 errors.
  3. Strict emoji check script -> Must verify 0 emojis.
- Git Commit:
  When implementation and checks pass, stage and commit the changes from project root:
  git add mobile-expo/
  git commit -m feat(core-modules): implement calculator, grades, and notes with AsyncStorage persistence
