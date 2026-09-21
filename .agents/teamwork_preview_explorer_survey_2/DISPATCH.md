# Task Assignment: Survey Explorer 2 (Auth, Logo, Settings & Network Requirement)

## Objective
Investigate Requirements R2 and R4 by reading `c:\projects\SmartStudyHub\.agents\ORIGINAL_REQUEST.md` (header `## 2026-09-21T13:21:19Z`) and examining `c:\projects\SmartStudyHub\mobile-expo`:
1. **R2 - Google Logo & Auth**:
   - Inspect `LoginScreen.tsx` and auth components. Find where Google icon is currently rendered (is it feather/material icon, solid red?). Where can the authentic official Google 4-color 'G' SVG logo (`#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`) be placed? Does `react-native-svg` exist in package.json?
   - Find "Войти как гость (Демо-режим)" or guest login button and how it's wired into `AuthContext` and UI.
   - Investigate Google OAuth redirect configuration (`src/services/firebase.ts`, `src/context/AuthContext.tsx`, `app.json`, scheme). Why does "Доступ заблокирован: ошибка авторизации" happen in Expo Go / native builds, and how to fix redirect URIs?
   - Investigate GitHub auth flow in mobile: how is it currently implemented, what fails or is missing for registration/login?
2. **R4 - Settings Cloud Sync & Internet Requirement UI**:
   - Inspect `SettingsScreen.tsx`. Find the technical "Cloud Sync / studio-9933447149-80d6a / sync status" card.
   - Check how network detection currently works (`src/services/network.ts` / NetInfo).
   - Check where internet connectivity is required: cloud sync, online translator, currency rates, social sign-in.
   - Design / plan the sleek native-styled Internet Requirement modal / toast with retry capability. Note strict rule: NO emojis anywhere in UI, modals, or toasts! Only Feather icons or native SVG.

Write your findings to `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_2\handoff.md`.

## 2026-09-21T13:24:54Z
You are Survey Explorer 2.
Your working directory is: c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_2
Read your instructions in: c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_2\DISPATCH.md
Read the original user request at: c:\projects\SmartStudyHub\.agents\ORIGINAL_REQUEST.md (specifically header ## 2026-09-21T13:21:19Z).

Your mission is to investigate R2 (Google SVG Logo, Guest Mode Removal, Google OAuth redirect, GitHub auth flow) and R4 (Removing technical Cloud Sync card from Settings, Implementing sleek native Internet Requirement modal/toast with retry).
Inspect `c:\projects\SmartStudyHub\mobile-expo` files:
- `src/modules/auth/LoginScreen.tsx`
- `src/context/AuthContext.tsx`
- `src/services/firebase.ts`
- `app.json`
- `src/modules/settings/SettingsScreen.tsx`
- `src/services/network.ts` / NetInfo usage
Check SVG support (`react-native-svg`), design the Google 4-color G logo SVG, investigate Google & GitHub OAuth redirect configuration, and design the Internet Requirement modal/toast (strictly NO emojis!).
Document your findings and recommendations in c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_2\handoff.md.
When done, send a message to parent f52e8cef-ccf4-40d0-9082-def06fd36d95 with your summary and handoff path.
