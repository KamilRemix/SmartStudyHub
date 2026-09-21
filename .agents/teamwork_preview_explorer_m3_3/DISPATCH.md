# Dispatch Assignment: Explorer M3-3 (GenPass & Global Verification)

## Identity
- Archetype: teamwork_preview_explorer
- Role: GenPass & Global Verification Explorer
- Working directory: c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m3_3
- Parent Conversation ID: 2ad1b8c1-2292-4579-843a-272e137f39e7

## Mission
Investigate the GenPass module in `mobile-expo/src/modules/tools/GenPassScreen.tsx` and compare against legacy `public/genpass.js` and `public/renderer.js`.
Identify exact missing logic, functions, and lines for:
1. GenPass Password Generator & Analyzer:
   - Password generation logic (length, uppercase, lowercase, numbers, special characters).
   - Password strength analysis: entropy calculation, score, crack time estimation, strength checklist (rules matching legacy web).
   - 1-click clipboard copy functionality.
2. Dependencies & Build checks:
   - Check `mobile-expo/package.json` for `expo-clipboard` and other necessary packages.
   - Note any missing packages or configuration needed for Expo SDK 52.
3. Strict UI preservation & Emoji Ban:
   - Ensure all existing JSX layout, Feather vector icons, StyleSheet styles are strictly preserved without any visual regressions.
   - Verify 0 emojis in UI code.

## Mandatory Reading
- c:\projects\SmartStudyHub\.agents\ORIGINAL_REQUEST.md
- c:\projects\SmartStudyHub\.agents\AUDIT_REPORT.md
- c:\projects\SmartStudyHub\.agents\PROJECT.md
- c:\projects\SmartStudyHub\AGENTS.md

## Output Requirements
Write a comprehensive, self-contained report to `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m3_3\handoff.md` with:
- Observation (findings with exact file paths, line numbers, and existing code)
- Logic Chain (exact recommended changes and code snippets for the Worker)
- Caveats & UI Preservation analysis
- Verification commands
Notify orchestrator via `send_message` when complete.

## 2026-09-13T14:04:02Z
You are Explorer M3-3 for the SmartStudyHub project.
Your assigned working directory is: c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m3_3
Your dispatch instructions are at: c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m3_3\DISPATCH.md
Read the following mandatory files before starting:
- c:\projects\SmartStudyHub\.agents\ORIGINAL_REQUEST.md
- c:\projects\SmartStudyHub\.agents\AUDIT_REPORT.md
- c:\projects\SmartStudyHub\.agents\PROJECT.md
- c:\projects\SmartStudyHub\AGENTS.md

Mission:
Investigate GenPass module in `mobile-expo/src/modules/tools/GenPassScreen.tsx` and compare with legacy `public/genpass.js` and `public/renderer.js`.
Identify missing logic for:
1. GenPass: Password generation, entropy strength analysis, crack time estimation, checklist rules from legacy web, 1-click clipboard copy.
2. Dependencies: Check `mobile-expo/package.json` for `expo-clipboard` and other packages.
3. UI Preservation: Ensure JSX layout, styles, and Feather icons remain intact. Zero emojis.

Write your report to `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m3_3\handoff.md`.
Communicate your completion back to parent via send_message.
