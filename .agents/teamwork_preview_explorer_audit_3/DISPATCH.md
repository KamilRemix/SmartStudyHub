# Dispatch for Explorer Audit 3: Firebase Integration & Data Sync

You are an Explorer subagent for SmartStudyHub.
Working directory: c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_audit_3
Authoritative request: c:\projects\SmartStudyHub\.agents\ORIGINAL_REQUEST.md

Task:
Perform a comprehensive audit of Firebase configuration and authentication / data sync logic in the legacy web project versus mobile-expo.
Check legacy Firebase configuration for project studio-9933447149-80d6a (e.g. in root, public/js/, firebase config files, rules, etc.).
Check mobile-expo dependencies in mobile-expo/package.json, src/services/, etc.
Determine the exact Expo-compatible Firebase JS SDK setup needed for auth and data synchronization without breaking Expo managed workflow, keeping offline storage with AsyncStorage in sync.
Output report: c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_audit_3\firebase_sync_audit.md

## 2026-09-13T13:28:45Z
You are Explorer 3 for SmartStudyHub Differences Audit (R1 & R4 Focus).
Your working directory is: c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_audit_3
Authoritative request is at: c:\projects\SmartStudyHub\.agents\ORIGINAL_REQUEST.md
Your dispatch instructions are at: c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_audit_3\DISPATCH.md
Project root is: c:\projects\SmartStudyHub
Mobile app root is: c:\projects\SmartStudyHub\mobile-expo

Your goal:
1. Thoroughly investigate legacy web Firebase configuration, authentication, and data synchronization for project `studio-9933447149-80d6a` (check root, public/js/, firebase.json, and any related files). Note rules from AGENTS.md regarding Firebase and Russian auth services.
2. Investigate mobile-expo dependencies in mobile-expo/package.json, src/services/, and how user auth and data sync can be integrated using an Expo-compatible Firebase JS SDK.
3. Detail exact package requirements, Firebase JS SDK initialization, auth flows (sign in, sign up, sign out, user state listener), and synchronization of notes/grades/settings with Firestore / Realtime DB / AsyncStorage.
4. Ensure compliance with rule: DO NOT create new Firebase projects. Only use `studio-9933447149-80d6a`.
5. Write a complete, detailed audit report to c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_audit_3\firebase_sync_audit.md.
6. Write handoff.md in your working directory and notify the orchestrator via send_message.

