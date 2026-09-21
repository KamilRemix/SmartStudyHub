# BRIEFING — 2026-09-13T13:37:00Z

## Mission
Conduct a thorough audit of Firebase configuration, authentication, and data synchronization between the legacy web SmartStudyHub and mobile-expo, establishing the exact Expo-compatible architecture for studio-9933447149-80d6a.

## 🔒 My Identity
- Archetype: explorer
- Roles: Explorer 3 for SmartStudyHub Differences Audit (R1 & R4 Focus)
- Working directory: c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_audit_3
- Original parent: 288cebab-b882-4bef-9f74-4a69dec7d238
- Milestone: SmartStudyHub Differences Audit (R1 & R4 Focus)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Strictly forbidden to create new Firebase projects or switch project: only use `studio-9933447149-80d6a`
- Respect AGENTS.md rules: no emojis, Russian services (VK ID) use native SDK / PKCE flow, Google/GitHub use Firebase Auth
- Mobile-expo must maintain Expo Managed Workflow compatibility (use Firebase JS SDK v10/v11 with AsyncStorage persistence)
- Retain existing UI and styles in mobile-expo

## Current Parent
- Conversation ID: 288cebab-b882-4bef-9f74-4a69dec7d238
- Updated: 2026-09-13T13:37:00Z

## Investigation State
- **Explored paths**:
  - Legacy web Firebase: `.firebaserc`, `firebase.json`, `firestore.rules`, `google-credentials.json`, `public/js/firebase-init.js`, `public/js/auth.js`, `public/notes.js`, `public/renderer.js`, `public/translator.js`, `public/genpass.js`.
  - Mobile Expo: `mobile-expo/package.json`, `mobile-expo/metro.config.js`, `mobile-expo/src/services/`, `mobile-expo/src/modules/notes/`, `mobile-expo/src/modules/grades/`, `mobile-expo/src/modules/tools/`, `mobile-expo/src/modules/settings/`.
- **Key findings**:
  - Exact Firebase configuration for `studio-9933447149-80d6a` extracted from `public/js/firebase-init.js`.
  - RTDB paths: `users/${uid}/notes`, `users/${uid}` (grades), `users_by_email/${sanitizedEmail}`, `users/${uid}/passwords`.
  - Firestore paths: `users/{uid}`, `users/{email}`, `users/{docId}/translator_favorites`.
  - Rules: `firestore.rules` enforces `request.auth != null`.
  - Russian auth (VK ID): PKCE flow via `@vkid/sdk` (`appId: 54715318`), local session in `ssh_vk_user`, background `signInAnonymously` for Firestore.
  - Mobile Expo current state: `firebase` package not yet in `mobile-expo/package.json`; `src/services/` is empty; `AsyncStorage` 2.2.0 is already present.
  - Target Expo setup: `firebase@^11.4.0` with `initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })` and `metro.config.js` with `.cjs` resolver.
  - Compatibility adapters designed for Notes (dictionary vs array) and Grades (detailed array with weights vs simple numbers map).
  - Settings UI integration: adds Account & Sync card to `SettingsScreen.tsx` preserving 100% of existing JSX/StyleSheet.
- **Unexplored areas**: None. Audit is comprehensive and complete.

## Key Decisions Made
- Use modular Firebase JS SDK v11 without native linkers for pure Expo Managed Workflow compatibility.
- Use Realtime Database `.info/connected` for native connection status without requiring external native dependencies.
- Maintain bidirectional backward-compatibility with web by storing both flattened legacy keys and rich mobile structures in cloud payloads.
- Preserve 100% of existing `SettingsScreen.tsx` styles and layout, appending the Account card seamlessly.

## Artifact Index
- c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_audit_3\firebase_sync_audit.md — Comprehensive audit report covering legacy config, auth flows, and data sync architecture
- c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_audit_3\handoff.md — Self-contained 5-component handoff report for the orchestrator
