# Project Plan — SmartStudyHub Mobile Expo Clone

## Objective
Develop, test, and thoroughly verify an isolated React Native (Expo Managed Workflow) clone of SmartStudyHub in `c:\projects\SmartStudyHub\mobile-expo` complying strictly with all requirements R1-R4 and AGENTS.md rules.

## Phase Breakdown
1. **Phase 0: Survey & Project Mapping**
   - Spawn 3 Explorers / Spec Miners to examine web codebase references (calculator, grade average, notes, converters, translator, genpass) and extract exact behaviors, algorithms, data structures, and edge cases.
   - Synthesize findings into `PROJECT.md` with full architecture, feature inventory, milestone definitions, and interface contracts.
2. **Phase 1: Dual Track Launch**
   - Spawn E2E Testing Track Orchestrator to define `TEST_INFRA.md` and generate comprehensive opaque-box test suites covering Tiers 1-4.
3. **Phase 2: Milestone 1 — Project Foundation & Architecture**
   - Setup Expo project in `mobile-expo`, configure TypeScript, theme context (light/dark), bottom tabs navigation, `@expo/vector-icons`, Google Fonts (`expo-font`), and `app.json` with `"package": "com.smartstudyhub.mobile"`.
4. **Phase 3: Milestone 2 — Core Modules**
   - Implement Calculator (full parsing with brackets, %, history).
   - Implement Grade Average (1-5 grades, weights, quarter/semester, AsyncStorage).
   - Implement Notes (CRUD, tags, search, colors, grid/list view, AsyncStorage).
5. **Phase 4: Milestone 3 — Tools Module**
   - Implement Converters (length, mass, temp, currency caching, bottom sheet modals with live search).
   - Implement Translator (RU, EN, DE, FR, ES, ZH, favorites, swap, `expo-speech` TTS).
   - Implement GenPass (length, special chars, numbers, strength analysis, 1-click copy).
6. **Phase 5: Milestone 4 — Final Milestone (100% E2E Pass & Adversarial Hardening)**
   - Wait for `TEST_READY.md`.
   - Run all E2E tests across Tiers 1-4.
   - Run Adversarial Coverage Hardening (Tier 5) with Challengers.
7. **Phase 6: Forensic Audit & Victory Report**
   - Run Forensic Auditor.
   - Verify `npx tsc --noEmit`, `npx expo export`, zero emojis, zero TODOs, git commit compliance.
   - Deliver full evidence handoff to Sentinel.
