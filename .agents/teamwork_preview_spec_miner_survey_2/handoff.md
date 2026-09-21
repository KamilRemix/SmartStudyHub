# Handoff Report: Tools & Theming Spec Miner

## 1. Observation
- **Converters**:
  - `public/js/calculator.js` (lines 15-101): Length conversion ratios defined via `toMeters` (`km: 1000, m: 1, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254`). Mass ratios via `toKg` (`t: 1000, kg: 1, g: 0.001, mg: 0.000001, lb: 0.45359237, oz: 0.028349523125`). Temperature formulas implemented for `c, f, k` with exact linear and offset transforms (`(v * 9/5) + 32`, `(v - 32) * 5/9`, `v + 273.15`, `v - 273.15`).
  - `public/js/calculator.js` (lines 115-324): Currency conversion with 10 currencies (`USD, EUR, RUB, CNY, KZT, BYN, GBP, JPY, TRY, AED`), API endpoint `https://open.er-api.com/v6/latest/USD`, storage caching in `localStorage` under `cachedRates`, calculation `(amount / rateFrom) * rateTo`, and 6 popular currency pairs grid.
  - `public/js/custom-select.js` (lines 1-482): Replaces native selects with animated bottom sheet modal (`#smart-picker-modal`) with live search across titles, codes, badges, and subtitles.
- **Translator**:
  - `public/translator.js` (lines 18-32, 200-241): Supported languages include `auto, ru, en, de, fr, es, zh, ar, ja, ko, tr, it, pt` (core required: `ru, en, de, fr, es, zh`). Backend endpoint is Google Translate GTX API (`https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=${sl}&tl=${to}&q=${encodeURIComponent(text)}`).
  - Swap logic (`public/translator.js:244-267`): safely maps `'auto'` to `'en'` on target and swaps source/result text.
  - TTS (`public/translator.js:272-286`): Web Speech API using language codes, mapped directly to `expo-speech` on mobile.
  - Favorites (`public/translator.js:295-475`): Stored locally in `translator_favorites` with schema `{ id, source, result, langFrom, langTo, timestamp }`.
  - Synonyms (`public/translator.js:486-531`): Datamuse API (`https://api.datamuse.com/words?rel_syn=${query}&max=8`).
- **GenPass**:
  - `public/genpass.js` (lines 262-267, 687-706): Options for length (5-64, default 16), uppercase (`A-Z`), lowercase (`a-z`), numbers (`0-9`), and symbols (`!@#$%^&*()_+-=[]{}|;:,.<>?`). Auto-fallback to lower+numbers if all unchecked.
  - Strength evaluation (`public/genpass.js:877-988`): Pool size scoring, length scoring (<5: 0, 5-7: 15, 8-11: 30, >=12: 40), bonuses (+15 for upper+lower, num, sym, len>=16), penalty (-25 for pattern match), k-anonymity API query against `https://api.pwnedpasswords.com/range/{prefix}` capping leaked passwords at 15%.
  - 1-click clipboard copy (`public/genpass.js:720-729`).
- **Theming & Design**:
  - `public/style.css` (lines 1-34): Light theme tokens (`--background-color: #f4f7f9`, `--component-background: #ffffff`, `--primary-accent: #007aff`, `--secondary-accent: #ff3b30`, `--text-color: #000000`, `--text-color-secondary: #6e6e73`). Dark theme tokens (`--background-color: #121212`, `--component-background: #1e1e1e`, `--primary-accent: #00ffff`, `--secondary-accent: #9400d3`, `--text-color: #e0e0e0`, `--text-color-secondary: #a0a0a0`).
  - Fonts: Google Fonts `Poppins` (weights 300, 400, 600, 700) and `Inter`.
  - Icon system: Strict ban on all emojis (`AGENTS.md`). All icons mapped strictly to `@expo/vector-icons` (`Feather` and `MaterialIcons`).

## 2. Logic Chain
1. By examining `public/js/calculator.js`, we extracted the exact conversion factor maps for length and mass and closed-form equations for temperature, verifying that all units operate relative to SI base units (meters and kilograms).
2. For currencies, the open ER-API endpoint (`open.er-api.com`) yields direct multipliers against USD. By analyzing `recalculateCurrency()` and `loadCurrency()`, the caching format and offline fallback structure were fully uncovered.
3. In `public/translator.js`, the GTX translation route and parameter handling were verified, alongside TTS language tagging and favorite deduplication rules.
4. In `public/genpass.js`, the password strength algorithm combines character entropy, length tiers, pattern heuristics, and the HaveIBeenPwned API check, matching the security requirements.
5. In `public/style.css` and `AGENTS.md`, theme tokens for light and dark modes and the strict vector icon constraint (no emojis) were correlated to concrete Expo packages (`@expo/vector-icons`, `expo-font`).

## 3. Caveats
- The web application integrates with Firebase Firestore/Realtime Database for syncing saved passwords and translator favorites when a user is signed in; for the initial mobile offline-first clone, local persistence in `@react-native-async-storage/async-storage` is sufficient and adheres to the acceptance criteria.
- The Gemini AI assistant in the web application is explicitly excluded from the mobile port as instructed in `ORIGINAL_REQUEST.md`.

## 4. Conclusion
All mathematical formulas, exchange rate behaviors, translation APIs, password generation and evaluation algorithms, theme tokens, typography rules, and icon mappings are completely documented and ready for direct implementation in React Native / Expo in `report.md`.

## 5. Verification Method
- Inspect the comprehensive specification report at:
  `c:\projects\SmartStudyHub\.agents\teamwork_preview_spec_miner_survey_2\report.md`
- Verify conversion ratios against standard SI conversion tables.
- Verify currency JSON response structure by querying `https://open.er-api.com/v6/latest/USD`.
- Verify the emoji-free icon mapping against `@expo/vector-icons` (Feather & MaterialIcons).
