## 2026-09-12T11:42:54Z
You are Worker 1 for Milestone 1 (App Foundation, Theming & Navigation) of the SmartStudyHub Mobile Expo project.
Your working directory is: c:\projects\SmartStudyHub\.agents\teamwork_preview_worker_m1_1
Your parent conversation ID is: c39f88c3-260c-4f13-803a-f92820d95e40

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY INSTRUCTIONS & CONSTRAINTS:
1. Read:
   - c:\projects\SmartStudyHub\.agents\ORIGINAL_REQUEST.md
   - c:\projects\SmartStudyHub\.agents\PROJECT.md
   - c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m1_1\report.md (Project setup, package.json, app.json, tsconfig, build commands)
   - c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m1_2\report.md (ThemeContext, Light/Dark tokens, Fonts, AsyncStorage)
   - c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m1_3\report.md (Bottom Tabs navigation, Feather icons, shell screens, emoji ban)
2. You have EXCLUSIVE write ownership of:
   - Everything inside c:\projects\SmartStudyHub\mobile-expo/
   - DO NOT touch or modify any root web project files outside of mobile-expo/!
   - Save all files in UTF-8 without BOM.
3. Implementation Steps:
   a. Create the mobile-expo directory and setup `package.json`, `app.json`, `tsconfig.json`, `babel.config.js`, `metro.config.js`, `expo-env.d.ts`, `index.ts`, `App.tsx`.
      - In `app.json`, STRICTLY ensure: `"android": { "package": "com.smartstudyhub.mobile" }` and `"slug": "smartstudyhub"`.
      - In `package.json`, include Expo SDK 52 (`expo@~52.0.49`), React Native `0.76.9`, React `18.3.1`, `@react-navigation/native@^7.0.14`, `@react-navigation/bottom-tabs@^7.2.0`, `react-native-screens@~4.4.0`, `react-native-safe-area-context@4.12.0`, `@react-native-async-storage/async-storage@1.23.1`, `expo-speech@~13.0.1`, `expo-font@~13.0.4`, `@expo-google-fonts/poppins@^0.2.3`, `@expo-google-fonts/inter@^0.2.3`, `@expo/vector-icons@^14.0.4`, `expo-clipboard@~7.0.1`, `expo-status-bar@~2.0.1`, `typescript@~5.3.3`, `@types/react@~18.3.12`.
   b. Run `npm install` inside `mobile-expo/`.
   c. Implement `src/theme/`:
      - `types.ts`, `colors.ts` (exact light and dark tokens from public/style.css, 10-color note palette), `ThemeContext.tsx`, `useTheme.ts`, `index.ts`.
      - Support AsyncStorage persistence (`@smartstudy_theme`) and system appearance auto-detection.
   d. Implement `src/navigation/`:
      - `types.ts`, `BottomTabNavigator.tsx`, `index.ts`.
      - 5 tabs: Calculator (`cpu`), Grades (`bar-chart-2`), Notes (`file-text`), Tools (`grid`), Settings (`settings`) using strictly Feather from `@expo/vector-icons`.
      - ZERO unicode emojis anywhere.
   e. Implement `src/components/common/AppHeader.tsx` and 5 initial shell screens:
      - `src/modules/calculator/CalculatorScreen.tsx`
      - `src/modules/grades/GradesScreen.tsx`
      - `src/modules/notes/NotesScreen.tsx`
      - `src/modules/tools/ToolsScreen.tsx`
      - `src/modules/settings/SettingsScreen.tsx` (includes functional theme toggle between Light/Dark mode)
   f. Verify quality gates:
      - Run `npx tsc --noEmit` inside `mobile-expo` -> Must pass with 0 errors.
      - Run `npx expo export --no-bytecode` inside `mobile-expo` -> Metro bundle must build with exit code 0.
      - Check that `app.json` strictly contains `"package": "com.smartstudyhub.mobile"`.
      - Run an emoji check regex to verify 0 unicode emojis exist in `mobile-expo/src`.
   g. Git commit rule:
      - Run `git add mobile-expo` and commit: `git commit -m "feat(mobile-expo): initialize Expo SDK 52 foundation, theme context, and bottom tab navigation"`.
4. Create `c:\projects\SmartStudyHub\.agents\teamwork_preview_worker_m1_1\handoff.md` with:
   - Files created / modified
   - Verification commands and their exact outputs
   - Any caveats
5. Send a message to parent (c39f88c3-260c-4f13-803a-f92820d95e40) indicating completion.
