# BRIEFING — 2026-09-13T14:05:00Z

## Mission
Complete Milestones 3 (Notes & Tools logic porting), 4 (Firebase integration studio-9933447149-80d6a), and 5 (Verification & UI Preservation Audit) for SmartStudyHub mobile-expo app with strict UI preservation and git commit discipline.

## 🔒 My Identity
- Archetype: teamwork_preview_orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\projects\SmartStudyHub\.agents\teamwork_preview_orchestrator_2_gen2
- Original parent: parent (64a535ab-74b8-4b48-a5dd-ae3d09a3da2e)
- Original parent conversation ID: 64a535ab-74b8-4b48-a5dd-ae3d09a3da2e

## 🔒 My Workflow
- **Pattern**: Project
- **Scope document**: c:\projects\SmartStudyHub\.agents\PROJECT.md
1. **Decompose**:
   - Milestone 1: Survey & Differences Audit (COMPLETE - AUDIT_REPORT.md)
   - Milestone 2: Calculator & Grade Average Logic Porting (COMPLETE - commit 77b5da2)
   - Milestone 3: Notes & Tools Logic Porting (R3) (tagging, sorting, filtering, copy features in Notes, Converters, Translator, GenPass)
   - Milestone 4: Firebase Integration (R4) (`studio-9933447149-80d6a` auth and cloud sync)
   - Milestone 5: Verification & UI Preservation Audit (R5) (`tsc --noEmit` 0 errors, Metro bundler clean, git diff UI preservation, emoji ban, git commit)
2. **Dispatch & Execute**:
   - Direct iteration loop: Explorer -> Worker -> Reviewer -> Challenger -> Auditor -> Gate
3. **On failure**:
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**:
   - Threshold 16 spawns. When reached, write handoff.md, cancel timers, spawn successor, record ID.
- **Work items**:
  1. Milestone 1: Survey & Differences Audit [done]
  2. Milestone 2: Calculator & Grade Average Logic Porting [done]
  3. Milestone 3: Notes & Tools Logic Porting (R3) [in-progress]
  4. Milestone 4: Firebase Integration (R4) [pending]
  5. Milestone 5: Verification & UI Preservation Audit (R5) [pending]
- **Current phase**: 3
- **Current focus**: Milestone 3: Notes & Tools Logic Porting (R3)

## 🔒 Key Constraints
- NEVER write, modify, or create source code files directly.
- NEVER run build/test commands yourself — require workers to do so.
- NEVER investigate or explore the problem at the code level — dispatch Explorers for technical investigation.
- STRICT UI PRESERVATION (CRITICAL): Keep existing native StyleSheet layout and JSX components completely intact. Only add logic, calculations, event handlers, and state.
- Single Firebase project allowed: studio-9933447149-80d6a. Never create new projects.
- Russian Auth rule: VK ID PKCE flow must not be replaced with Firebase OIDC.
- No emojis in UI (Feather / MaterialIcons only).
- Git commit after every completed task/feature (`git add . && git commit -m "..."`).
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.

## Current Parent
- Conversation ID: 64a535ab-74b8-4b48-a5dd-ae3d09a3da2e
- Updated: 2026-09-13T14:05:00Z

## Key Decisions Made
- Succeeding Gen 1 orchestrator to drive Milestones 3, 4, and 5.
- Milestone 1 & 2 are complete and verified.
- Proceeding immediately with Milestone 3 (Notes & Tools Logic Porting).

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|---|---|---|---|---|
| explorer_m3_1 | teamwork_preview_explorer | Notes Module Investigation | completed | 92fe1044-a031-4ae4-a67a-b4b623494948 |
| explorer_m3_2 | teamwork_preview_explorer | Converters & Translator Investigation | completed | 0dac1391-ced3-4051-98ba-df690e4f09d1 |
| explorer_m3_3 | teamwork_preview_explorer | GenPass & Dependencies Investigation | completed | 0cdfbc1d-4ae4-4eed-90aa-3af1f903c74c |
| worker_m3_1 | teamwork_preview_worker | Notes & Tools Logic Implementation | completed | 229f21a9-5612-4271-9235-8fe0f2e3c100 |
| reviewer_m3_1 | teamwork_preview_reviewer | M3 Independent Review 1 | running | c666bddc-9ea2-4799-a4bd-6015b3d9df7c |
| reviewer_m3_2 | teamwork_preview_reviewer | M3 Independent Review 2 | running | fdb8f450-2836-4324-a051-ba67876b86bd |
| challenger_m3_1 | teamwork_preview_challenger | M3 Adversarial Stress Testing 1 | running | 9faeb2b1-d851-456b-93ee-8d117644cffc |
| challenger_m3_2 | teamwork_preview_challenger | M3 Adversarial Stress Testing 2 | running | 089c0aa3-ae5f-4791-bacf-be24279c4e07 |
| auditor_m3_1 | teamwork_preview_auditor | M3 Forensic Integrity Audit | running | 81634295-20f9-42e4-93d0-3f54ad9953d6 |

## Succession Status
- Succession required: no
- Spawn count: 9 / 16
- Pending subagents: c666bddc-9ea2-4799-a4bd-6015b3d9df7c, fdb8f450-2836-4324-a051-ba67876b86bd, 9faeb2b1-d851-456b-93ee-8d117644cffc, 089c0aa3-ae5f-4791-bacf-be24279c4e07, 81634295-20f9-42e4-93d0-3f54ad9953d6
- Predecessor: teamwork_preview_orchestrator_2
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: 2ad1b8c1-2292-4579-843a-272e137f39e7/task-30
- Safety timer: none
- On succession: kill all timers before spawning successor
- On context truncation: run `manage_task(Action="list")` — re-create if missing

## Artifact Index
- c:\projects\SmartStudyHub\.agents\ORIGINAL_REQUEST.md — Authoritative user request
- c:\projects\SmartStudyHub\.agents\AUDIT_REPORT.md — Survey & Differences Audit report
- c:\projects\SmartStudyHub\.agents\PROJECT.md — Global project plan & architecture
- c:\projects\SmartStudyHub\.agents\teamwork_preview_orchestrator_2_gen2\DISPATCH.md — Gen2 dispatch instructions
- c:\projects\SmartStudyHub\.agents\teamwork_preview_orchestrator_2_gen2\progress.md — Progress tracking & liveness
