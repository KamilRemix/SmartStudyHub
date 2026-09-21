# Dispatch Assignment: Worker M3 (Notes & Tools Logic Porting)

## Identity
- Archetype: teamwork_preview_worker
- Role: Notes & Tools Logic Porting Worker
- Working directory: c:\projects\SmartStudyHub\.agents\teamwork_preview_worker_m3_1
- Parent Conversation ID: 2ad1b8c1-2292-4579-843a-272e137f39e7

## Mission
Implement the full Notes & Tools logic porting for Milestone 3 (R3) according to the 3 Explorer handoff reports.

### Files Owned Exclusively by This Worker:
1. `mobile-expo/src/modules/notes/NotesScreen.tsx`
2. `mobile-expo/src/modules/notes/components/NoteCard.tsx`
3. `mobile-expo/src/services/TranslationService.ts` (create new file)
4. `mobile-expo/src/modules/tools/screens/UnitConverterScreen.tsx`
5. `mobile-expo/src/modules/tools/screens/CurrencyConverterScreen.tsx`
6. `mobile-expo/src/modules/tools/screens/TranslatorScreen.tsx`
7. `mobile-expo/src/modules/tools/screens/GenPassScreen.tsx`

### Source Handoff Reports:
- `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m3_1\handoff.md` (Notes sorting, filtering, and copy)
- `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m3_2\handoff.md` (Converters & Translator logic and copy)
- `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m3_3\handoff.md` (GenPass security checklist, crack time, score, pwned check)

### Mandatory Requirements & Rules:
1. **MANDATORY INTEGRITY WARNING**:
   DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
2. **STRICT UI PRESERVATION (CRITICAL)**:
   Keep all existing native JSX layout and StyleSheet styles intact. Only add logic, calculations, event handlers (`onPress`), and states.
3. **EMOJI BAN (CRITICAL)**:
   Zero emojis anywhere in UI strings, icons, or comments. Use ONLY Feather vector icons (`@expo/vector-icons`).
4. **Verification**:
   - Run `npx tsc --noEmit` in `mobile-expo/` to verify 0 errors.
   - Run `npx expo export --platform android` in `mobile-expo/` to verify Metro bundler clean build.
   - Run the UI constraints test in `mobile-expo/`: `node -e "const ts = require('typescript'); const fs = require('fs'); require.extensions['.ts'] = function (m, fn) { m._compile(ts.transpileModule(fs.readFileSync(fn, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, fn); }; require('./tests/ui_constraints_empirical.test.ts');"`
5. **Git Commit Rule**:
   After completing the implementation and passing tests:
   `git add .` and `git commit -m "feat(notes,tools): restore tagging, sorting, filtering, clipboard copy, and security analysis"`

## Output Requirements
Write `c:\projects\SmartStudyHub\.agents\teamwork_preview_worker_m3_1\handoff.md` with:
- Observation (summary of files modified and created)
- Logic Chain (exact changes applied)
- Build and test results (tsc output, expo export output, test suite output, git commit hash)
- Caveats & UI preservation confirmation
- Conclusion
Notify orchestrator via `send_message` when done.
