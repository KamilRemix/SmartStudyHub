# Dispatch History

## 2026-09-12T11:22:42Z

You are the Project Orchestrator for the SmartStudyHub mobile clone project.

Your working directory is: c:\projects\SmartStudyHub\.agents\teamwork_preview_orchestrator_1
The authoritative user request is located at: c:\projects\SmartStudyHub\.agents\ORIGINAL_REQUEST.md
The workspace root is: c:\projects\SmartStudyHub
The mobile app project must be isolated in: c:\projects\SmartStudyHub\mobile-expo

USER REQUEST SUMMARY & REQUIREMENTS:
Create a fully functional mobile clone of the SmartStudyHub application using React Native (Expo Managed Workflow) in an isolated `mobile-expo/` directory, without modifying the existing web project.

R1. Architecture & Setup:
- Platform: Expo (latest stable SDK), React Native, TypeScript.
- Navigation: React Navigation (Bottom Tabs) or Expo Router.
- Theming: Support for Dark Theme and Light Theme with dynamic switching.
- Configuration: Hardcode Android Package to `"package": "com.smartstudyhub.mobile"` in `app.json`.

R2. UI & Design Rules:
- Icons: STRICTLY `@expo/vector-icons` (Feather/MaterialIcons). NO EMOJIS anywhere in the UI.
- Typography: Google Fonts (Poppins / Inter) via `expo-font`.
- Exclusions: The Gemini AI assistant must NOT be ported.

R3. Core Modules (Full Logic Required, No Mocks):
- Calculator: Full support for brackets, percentages, history, and smooth key presses.
- Grade Average: Input grades (1-5), weights, quarter/semester calculations, saved to `@react-native-async-storage/async-storage`.
- Notes: Create, edit, delete, text search, tags, color selection, grid/list view. Save to AsyncStorage.

R4. Tools Module:
- Converters: Length, mass, temp. Currencies (USD, EUR, RUB, CNY, KZT, BYN, GBP, TRY, AED) with caching. Use Bottom Sheet Modals with live search for selection.
- Translator: RU, EN, DE, FR, ES, ZH. Favorites, swap, TTS via `expo-speech`.
- GenPass: Length, special chars, numbers, strength analysis, 1-click copy.

Acceptance Criteria:
- TypeScript compiles successfully: `npx tsc --noEmit` runs with 0 errors in the `mobile-expo` folder.
- App starts without crashes: `npx expo export` successfully compiles the Metro bundle.
- `app.json` strictly contains `"package": "com.smartstudyhub.mobile"`.
- No placeholders: Source files contain zero `// TODO` or `// FIXME` comments related to core logic.
- Emoji Ban: A global search for emoji unicode characters in the UI code returns 0 results.
- `AsyncStorage` is successfully integrated and called in Notes and Grades modules.
- `expo-speech` is successfully integrated and called in Translator module.

MANDATORY RULES FROM AGENTS.md:
- Git commit rule: After implementing each task, feature, or fix, make a commit: `git add .` and `git commit -m "тип(компонент): понятное описание изменений"`.
- File encoding: UTF-8 without BOM.
- Never modify the existing web project files outside of `mobile-expo/` and `.agents/`.
