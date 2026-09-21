# Survey Explorer 3 Dispatch: GenPass, Notes, Network & UI Polish Survey

## Working Directory
`c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_3`

## Identity
Role: Features & UI Explorer
Archetype: teamwork_preview_explorer

## Task & Scope
Inspect `c:\projects\SmartStudyHub\mobile-expo`:
1. Check `GenPassModal.tsx` / GenPass screen:
   - Current slider component: why it jumps or how to make it smoothly select any integer length from 4 to 64.
   - Leak check: implementation of HaveIBeenPwned API (k-anonymity SHA-1 range query: prefix first 5 chars, hash remainder lookup).
   - Password Vault ("Мои пароли"): data schema (service, login, password, bookmarks/favorite, timestamps), UI, local storage & sync hooks.
2. Check `NotesScreen.tsx`:
   - Photos attachment via `expo-image-picker` (permissions, storage URI/base64, UI preview, removal).
   - Scheduled reminders via `expo-notifications` (date/time picker, trigger setup, notification display).
3. Check Network detection:
   - Check `@react-native-community/netinfo` or Expo Network APIs.
   - Non-intrusive offline banner/toast ("Автономный режим • Данные сохранены локально") and reconnect toast with auto-sync trigger.
4. Check Responsiveness & Russian text overflow across all screens (`flexShrink: 1`, text wrapping, button and badge padding).
5. Output detailed findings, file paths, code locations, and recommendations into `survey_features_ui.md`.

## 2026-09-14T10:48:37Z
You are Survey Explorer 3 (Features & UI Explorer).
Working directory: c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_3
User request source: c:\projects\SmartStudyHub\.agents\ORIGINAL_REQUEST.md (read this first, specifically section ## 2026-09-14T10:46:33Z).
Dispatch details: c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_3\DISPATCH.md

Your task is to conduct an authoritative, read-only survey of c:\projects\SmartStudyHub\mobile-expo regarding:
1. GenPassModal.tsx / password generator:
   - Examine current slider component: why it's erratic or jumping, and how to implement a smooth continuous slider allowing any integer length 4 to 64.
   - HaveIBeenPwned API leak check: design the k-anonymity SHA-1 range query integration (first 5 SHA-1 characters sent to https://api.pwnedpasswords.com/range/{prefix}, match suffix locally, return breach count). Check if expo-crypto or pure JS SHA-1 is available.
   - Password Vault ("Мои пароли"): tab/modal structure, fields (service name, login/email, password, visible toggle, copy button, delete, bookmark/favorite toggle, cloud sync).
2. NotesScreen.tsx:
   - Photo attachments: examine integration with expo-image-picker (camera & gallery permissions, image preview, removal, storage).
   - Scheduled reminders: examine expo-notifications setup (notification channel on Android, date/time picker, scheduling local notification).
3. Network Detection:
   - Check @react-native-community/netinfo or Expo network libraries.
   - Non-intrusive offline indicator ("Автономный режим • Данные сохранены локально") and reconnect toast with auto-sync.
4. Responsiveness & Russian text overflow:
   - Identify all screens and components where Russian text gets clipped or overflows (buttons, badges, cards). Check flexShrink: 1, text wrapping, padding.
5. Strict project rules: NO emojis in UI, Feather icons only, Firebase project studio-9933447149-80d6a.
Write your complete findings to c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_3\survey_features_ui.md and handoff.md. Report back with send_message when done.
