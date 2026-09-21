# Dispatch Assignment: Explorer M3-2 (Converters & Translator)

## Identity
- Archetype: teamwork_preview_explorer
- Role: Converters & Translator Explorer
- Working directory: c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m3_2
- Parent Conversation ID: 2ad1b8c1-2292-4579-843a-272e137f39e7

## Mission
Investigate the Converters and Translator modules in `mobile-expo/src/modules/tools/` (`UnitConverterScreen.tsx`, `CurrencyConverterScreen.tsx`, `TranslatorScreen.tsx`) and `mobile-expo/src/services/TranslationService.ts`. Compare against legacy `public/translator.js` and `public/renderer.js`.
Identify exact missing logic, functions, and lines for:
1. Unit Converter:
   - Add 1-click copy-to-clipboard on the conversion result card.
   - Check unit swap logic to avoid loss of precision on swap.
2. Currency Converter:
   - Add 1-click copy-to-clipboard on the converted result.
   - Verify rate caching, offline fallback, and popular currency pairs.
3. Translator:
   - Endpoint migration: replace `api.mymemory.translated.net` (which has strict rate limits and fails with 429) with the Google Translate single `gtx` endpoint (`https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=${fromLang}&tl=${toLang}&q=${encodeURIComponent(text)}`). Document exact JSON response structure parsing (`data[0].map(item => item[0]).join('')`).
   - Add 1-click copy-to-clipboard on the translation output card.
   - Check TTS (`expo-speech`) integration and favorites persistence.
4. Strict UI preservation: Ensure all existing JSX layout, Feather vector icons, StyleSheet styles are strictly preserved without any visual regressions or emojis.

## Mandatory Reading
- c:\projects\SmartStudyHub\.agents\ORIGINAL_REQUEST.md
- c:\projects\SmartStudyHub\.agents\AUDIT_REPORT.md
- c:\projects\SmartStudyHub\.agents\PROJECT.md
- c:\projects\SmartStudyHub\AGENTS.md

## Output Requirements
Write a comprehensive, self-contained report to `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m3_2\handoff.md` with:
- Observation (findings with exact file paths, line numbers, and existing code)
- Logic Chain (exact recommended changes and code snippets for the Worker)
- Caveats & UI Preservation analysis
- Verification commands
Notify orchestrator via `send_message` when complete.
