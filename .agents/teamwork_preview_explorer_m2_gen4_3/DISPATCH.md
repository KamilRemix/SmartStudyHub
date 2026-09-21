# DISPATCH: Explorer M2.3 (Screen Coverage & Strict Compliance)

## Identity
- Archetype: teamwork_preview_explorer
- Role: Screen Integration & Compliance Explorer
- Working Directory: c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m2_gen4_3
- Parent: teamwork_preview_orchestrator_4 (Conversation ID: e0dc7ad3-ae98-41f7-99ee-1d3aa3b332ed)

## Context & Inputs
- Project specification: c:\projects\SmartStudyHub\.agents\PROJECT.md
- Authoritative user request: c:\projects\SmartStudyHub\.agents\ORIGINAL_REQUEST.md
- Invariants & guidelines: c:\projects\SmartStudyHub\AGENTS.md
- Mobile codebase: c:\projects\SmartStudyHub\mobile-expo

## Objective
Survey screen coverage and UI invariant compliance for Milestone M2:
1. Audit all navigation tabs and screens in `mobile-expo/src/`:
   - Navigation tab bar titles (Calculator, Grades, Notes, Tools, Settings)
   - Calculator views (Standard, Fraction, History)
   - Grades screen (Subjects, Periods, Summary, WhatIf, Strategy)
   - Notes screen (List, Search, Editor, Cards)
   - Tools screens (Unit Converter, Currency Converter, Translator, GenPass)
   - Auth screens & modals (Login, Profile, Guest mode)
2. Determine which strings are hardcoded and need `t(...)` calls.
3. Verify compliance with AGENTS.md:
   - Zero emojis across all screens and components.
   - Feather icons (`@expo/vector-icons`) or native SVG only.
   - UI layout preservation (do not break styling, card layouts, or fonts).
4. Formulate an actionable file-by-file plan for the Worker to integrate `t(...)` cleanly without layout regression.
5. Write your findings to `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m2_gen4_3\handoff.md` and send a message back to parent.

## 2026-09-14T11:34:18Z
You are teamwork_preview_explorer_m2_gen4_3 (Screen Integration & Compliance Explorer).
Your working directory is: c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m2_gen4_3
Read your instructions in c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m2_gen4_3\DISPATCH.md
Read c:\projects\SmartStudyHub\.agents\ORIGINAL_REQUEST.md, c:\projects\SmartStudyHub\.agents\PROJECT.md, and c:\projects\SmartStudyHub\AGENTS.md.
Assess screen coverage and UI invariant compliance for Milestone M2:
1. Audit all navigation tabs and screens in mobile-expo/src/ for hardcoded strings needing t(...).
2. Verify compliance with AGENTS.md (zero emojis, feather icons only, layout preservation).
3. Formulate an actionable file-by-file integration plan for the Worker.
4. Write your comprehensive report to c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m2_gen4_3\handoff.md and report back via send_message to parent.
