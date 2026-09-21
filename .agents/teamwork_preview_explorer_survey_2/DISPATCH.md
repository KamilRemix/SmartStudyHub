# Survey Explorer 2 Dispatch: i18n Localization, Grade Thresholds & Cloud Sync Survey

## Working Directory
`c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_2`

## Identity
Role: Localization & Cloud Sync Explorer
Archetype: teamwork_preview_explorer

## Task & Scope
Inspect `c:\projects\SmartStudyHub`:
1. Check `public/translations.js` in the project root: structure, keys, dictionaries for all 10 languages (`ru`, `en`, `uk`, `be`, `kk`, `es`, `de`, `fr`, `tr`, `zh`).
2. Check existing localization implementation in `mobile-expo` (if any, e.g. in `src/i18n`, `SettingsScreen`, or components) and how to port the full 10-language dictionary into `mobile-expo/src/i18n/` with reactive language context/hook and AsyncStorage persistence.
3. Check `GradeAverageScreen.tsx`: examine current grade calculation logic, scale definitions, thresholds (2, 3, 4, 5, percentages), and how custom user-defined thresholds can be edited, stored in AsyncStorage, and synced to Firebase.
4. Check Firebase Realtime Database setup in `mobile-expo`: check `firebaseConfig`, current auth and database usage, and design two-way sync for:
   - Calculator history (capped at 5-10 entries).
   - Grades & subjects.
   - Notes.
   - Password vault entries.
   - User settings.
5. Output detailed findings, file paths, data models, and recommendations into `survey_i18n_sync.md`.

## 2026-09-14T10:48:36Z
You are Survey Explorer 2 (Localization & Cloud Sync Explorer).
Working directory: c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_2
User request source: c:\projects\SmartStudyHub\.agents\ORIGINAL_REQUEST.md (read this first, specifically section ## 2026-09-14T10:46:33Z).
Dispatch details: c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_2\DISPATCH.md

Your task is to conduct an authoritative, read-only survey of c:\projects\SmartStudyHub regarding:
1. Inspect c:\projects\SmartStudyHub\public\translations.js: analyze the complete dictionary structure, key names, and translations for all 10 required languages: ru, en, uk, be, kk, es, de, fr, tr, zh.
2. Inspect current i18n / localization in mobile-expo (e.g. src/i18n/ or how text is handled in screens). Design the complete porting plan: placing the full 10-language dictionary in mobile-expo/src/i18n/, creating an i18n provider/hook with AsyncStorage persistence and reactive language switching across all screens and Settings.
3. Inspect GradeAverageScreen.tsx: investigate existing calculation logic, grading scales (5-point, 12-point, percentages, etc.), and how custom thresholds (e.g. 2.70, 3.65, 60%, 75%) should be input, stored in AsyncStorage, and synced to Firebase.
4. Inspect Firebase Realtime Database setup in mobile-expo: data schema design for two-way sync for authenticated users:
   - Calculator history (limited to 5-10 recent entries).
   - Grades & subjects.
   - Notes.
   - Password vault entries.
   - User settings (language, theme, custom grade thresholds).
   - Auto-sync triggers (on login and network reconnect).
5. Strict project rules: NO emojis in UI, Feather icons only, Firebase project studio-9933447149-80d6a.
Write your complete findings to c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_2\survey_i18n_sync.md and handoff.md. Report back with send_message when done.
