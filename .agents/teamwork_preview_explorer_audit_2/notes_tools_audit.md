# SmartStudyHub Differences Audit Report: Notes & Tools (R1 & R3 Focus)

**Audit Date**: 2026-09-13  
**Auditor**: Explorer 2 (teamwork_preview_explorer_audit_2)  
**Project Root**: `c:\projects\SmartStudyHub`  
**Mobile App Root**: `c:\projects\SmartStudyHub\mobile-expo`  
**Scope**: Notes Module & Tools Modules (Unit Converter, Currency Converter, Translator, Password Generator / GenPass)

---

## 1. Executive Summary

This report provides a comprehensive, fine-grained audit comparing the legacy web implementation of SmartStudyHub with the React Native (Expo) mobile application in `mobile-expo/`. 

The audit focused specifically on the **Notes** module (`mobile-expo/src/modules/notes/`) and the **Tools** module (`mobile-expo/src/modules/tools/`), evaluating all capabilities:
- Tagging, sorting, filtering, copying
- Unit conversion formulas & precision
- Exchange rates, API sources, caching & offline resilience
- Multi-language translation, TTS, speech synthesis, and favorites sync
- Password generation, entropy calculation, security strength analysis, and password vaulting
- Strict UI preservation requirements (ensuring zero regression in native layout and styles)

### Summary of Audit Verdict

| Module / Tool | Web Source Location | Mobile Location | Logic Parity | UI Structure Status |
|---|---|---|---|---|
| **Notes** | `public/notes.js`, `public/js/notes.js`, `public/index.html` (419-540) | `mobile-expo/src/modules/notes/` | **60%** (Missing: explicit date sorting, cloud sync to Firebase, note reminders, copy action, linkify) | **Fully structured** (Clean JSX with `NoteCard`, `NoteEditorModal`, `TagFilter`, `ColorPicker`) |
| **Unit Converter** | `public/js/calculator.js` (15-101), `public/index.html` (319-359) | `mobile-expo/src/modules/tools/screens/UnitConverterScreen.tsx` | **95%** (Formulas match 100%; missing copy result) | **Fully structured** (Bottom-sheet modal with live search, category pills, formula display) |
| **Currency Converter** | `public/js/calculator.js` (103-332), `public/index.html` (361-417) | `mobile-expo/src/modules/tools/screens/CurrencyConverterScreen.tsx` | **80%** (API & math match; missing popular rates grid, currency symbols, copy result) | **Fully structured** (Flag badges, bottom-sheet search modal, swap button, rate info) |
| **Translator** | `public/translator.js`, `public/js/translator.js`, `public/index.html` | `mobile-expo/src/modules/tools/screens/TranslatorScreen.tsx` | **65%** (Uses MyMemory instead of Google Translate `gtx`; missing copy button, Firestore sync, auto-detect) | **Fully structured** (Speech integration via `expo-speech`, swap, favorites view) |
| **GenPass** | `public/genpass.js`, `public/js/genpass.js`, `public/index.html` (178-308) | `mobile-expo/src/modules/tools/screens/GenPassScreen.tsx` | **40%** (Generator exists; password analyzer, pwned check, and password vault are missing) | **Fully structured** (Slider, preset pills, switches, entropy bar, history list) |

---

## 2. Module-by-Module In-Depth Analysis

---

### A. Notes Module

#### 1. Legacy Web Implementation
- **Source Files**: `public/notes.js` (1,172 lines), `public/js/notes.js` (adapter), `public/index.html` (lines 419–540).
- **Data Model**:
  ```typescript
  interface WebNote {
    id: string; // 'note_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)
    title: string;
    text: string;
    checklist: Array<{ text: string; checked: boolean }> | null;
    image: string | null; // base64 Data URL
    reminder: number | null; // timestamp (ms)
    reminderFired: boolean;
    color: string; // hex or ''
    pinned: boolean;
    createdAt: number;
    updatedAt: number;
  }
  ```
- **Storage & Synchronization**:
  - Dual storage: `localStorage` (`ssh_notes_<uid>`, `ssh_notes_latest`, `ssh_notes_updated_at`, `ssh_notes_pending_sync`).
  - Cloud synchronization: Firebase Realtime Database at `users/${user.uid}/notes`.
  - Conflict resolution: compares `cloudUpdatedAt` with `localUpdatedAt`; offline edits queue `ssh_notes_pending_sync` and sync upon network reconnect.
  - Push/Local notifications: Capacitor LocalNotifications on Android, and HTML5 Notifications + Web Audio chime chord (C5 -> E5 -> G5) on Web/Electron.
- **Key Features**:
  - Search: Case-insensitive substring match across `title`, `text`, and `checklist.text`.
  - Pinning & Sorting: Pinned notes grouped separately; both groups strictly sorted by `b.updatedAt - a.updatedAt`.
  - View mode: Toggle between grid (`notes-grid`) and list (`notes-list-view`).
  - Colors: 10 color palette dots + default empty color.
  - Linkify: Regex `/(https?:\/\/[^\s]+)/g` converts URLs in notes to clickable external links.
  - Checklist: Add item on `Enter` key, checkbox toggle, remove item button.
  - Creator: Collapsed Google Keep style bar expanding into full editor on tap.

#### 2. Mobile-Expo Implementation
- **Source Files**:
  - `mobile-expo/src/modules/notes/NotesScreen.tsx` (425 lines)
  - `mobile-expo/src/modules/notes/notesStorage.ts` (59 lines)
  - `mobile-expo/src/modules/notes/types.ts` (25 lines)
  - `mobile-expo/src/modules/notes/components/NoteCard.tsx` (233 lines)
  - `mobile-expo/src/modules/notes/components/NoteEditorModal.tsx` (537 lines)
  - `mobile-expo/src/modules/notes/components/TagFilter.tsx` (91 lines)
  - `mobile-expo/src/modules/notes/components/ColorPicker.tsx` (75 lines)
- **Data Model**:
  ```typescript
  export interface NoteChecklistItem {
    id: string;
    text: string;
    done: boolean;
  }

  export interface NoteItem {
    id: string;
    title: string;
    content: string; // NOTE: Named 'content' in mobile, but was 'text' in web!
    checklist?: NoteChecklistItem[];
    tags: string[]; // Added in mobile!
    color: string;
    pinned: boolean;
    createdAt: number;
    updatedAt: number;
  }
  ```
- **Storage & Synchronization**:
  - `AsyncStorage` key: `@smartstudy_notes_data`.
  - Seeds initial sample notes (`SEED_NOTES`) if storage is empty.
  - No Firebase sync integration yet.

#### 3. Differences, Gaps & Bugs
1. **Sorting by Timestamp**:
   - In web: `pinned.sort((a, b) => b.updatedAt - a.updatedAt)` and `others.sort((a, b) => b.updatedAt - a.updatedAt)` guaranteed newly updated notes jumped to the top.
   - In mobile: `pinnedNotes` and `otherNotes` are filtered from `filteredNotes` without calling `.sort((a, b) => b.updatedAt - a.updatedAt)`. Notes retain insertion order or seed order.
2. **Copy Note Content**:
   - R3 explicitly requests "копирование результатов" across modules. In mobile `NoteCard`, only Pin and Delete buttons exist. There is no quick copy action to copy title + content/checklist to clipboard.
3. **Data Model Naming Difference**:
   - Web uses `note.text`, mobile uses `note.content`.
   - Web checklist uses `{ text: string, checked: boolean }`, mobile uses `{ id: string, text: string, done: boolean }`.
   - Any Firebase sync logic must map between these schema variants or standardize them.
4. **Cloud Synchronization (Firebase R4)**:
   - Web synced to `firebase.database().ref('users/' + uid + '/notes')`.
   - Mobile currently has zero Firebase listeners or writers.
5. **Reminders & Notifications**:
   - Web has reminders timestamp, reminder filter button, and notification scheduler.
   - Mobile does not store reminder timestamps or schedule notifications.

#### 4. Mobile UI Structure & Preservation Rules
- `NotesScreen.tsx`:
  - `AppHeader`: title "Заметки", subtitle with counter, right secondary icon toggle (grid/list), right action plus button.
  - Search container: TextInput with search icon and clear button.
  - `TagFilter`: horizontal ScrollView of chip pills.
  - `ScrollView` with `contentContainerStyle={styles.scrollContent}`:
    - Empty container (Feather `file-text`, title, subtitle, create button).
    - Pinned section with header `ЗАКРЕПЛЕННЫЕ (count)` and `gridRow` or `listColumn`.
    - Other section with header `ДРУГИЕ (count)` and `gridRow` or `listColumn`.
  - `NoteEditorModal`: full screen modal with X close, title, Pin button, Delete button (if editing), Check save button, color picker, title input, content input, checklist editor, and tags manager.
- **Preservation Directive**: All components in `components/` and `NotesScreen.tsx` have polished styling. Workers must only enhance data flow, sorting, clipboard actions, and Firebase synchronization without modifying the JSX element tree or StyleSheet properties.

---

### B. Unit Converter

#### 1. Legacy Web Implementation
- **Source Files**: `public/js/calculator.js` (lines 15–101), `public/index.html` (lines 319–359).
- **Categories & Units**:
  1. **Length**: `km` (1000m), `m` (1m), `cm` (0.01m), `mm` (0.001m), `mi` (1609.344m), `yd` (0.9144m), `ft` (0.3048m), `in` (0.0254m).
     - Formula: `out = v * (toMeters[from] / toMeters[to])`.
  2. **Mass**: `t` (1000kg), `kg` (1kg), `g` (0.001kg), `mg` (0.000001kg), `lb` (0.45359237kg), `oz` (0.028349523125kg).
     - Formula: `out = v * (toKg[from] / toKg[to])`.
  3. **Temperature**: `C`, `F`, `K`.
     - `C -> F`: `(v * 9/5) + 32`
     - `F -> C`: `(v - 32) * 5/9`
     - `C -> K`: `v + 273.15`
     - `K -> C`: `v - 273.15`
     - `F -> K`: `(v - 32) * 5/9 + 273.15`
     - `K -> F`: `(v - 273.15) * 9/5 + 32`
- **Output formatting**: `out.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 }) + ' ' + toText`.

#### 2. Mobile-Expo Implementation
- **Source File**: `mobile-expo/src/modules/tools/screens/UnitConverterScreen.tsx` (529 lines).
- **Categories & Units**:
  - Length: `mm`, `cm`, `m`, `km`, `in`, `ft`, `yd`, `mi` (8 units, exact match).
  - Mass: `mg`, `g`, `kg`, `lb`, `oz`, `t` (6 units, exact match).
  - Temperature: `C`, `F`, `K` (3 units, exact formulas).
- **UI Components**:
  - Category selector row: 3 horizontal pill tabs (`Длина`, `Масса`, `Температура`).
  - From Card: Unit selector pill, numeric `TextInput`, full unit label.
  - Swap Button: Circular primary button with `repeat` Feather icon.
  - To Card: Unit selector pill, result box, full unit label.
  - Formula Card: Feather `info` icon with summary text (`1 m = 100 cm`).
  - PickerModal: Full modal sheet with handle bar, title, search input, and FlatList with checkmarks.

#### 3. Differences, Gaps & Bugs
1. **Copying Conversion Result**:
   - In mobile, there is no tap-to-copy handler on either the result text, the formula card, or the To card. Users cannot copy the conversion result to clipboard.
2. **Swap Logic Value Update**:
   - In web: clicking swap simply inverted `from` and `to` units, keeping the input value intact and recalculating the result.
   - In mobile line 253: `handleSwap` executes `setFromValue(formatResult(convertedValue))`, changing the input value to the converted result while swapping units. This causes unexpected rounding if clicked multiple times.
3. **Number Formatting**:
   - In mobile, `formatResult` outputs scientific notation for numbers `< 0.0001`. In web, `toLocaleString` with `maximumFractionDigits: 6` was used.

#### 4. Mobile UI Structure & Preservation Rules
- The UI in `UnitConverterScreen.tsx` is completely implemented and beautifully styled with theme support.
- Workers should simply add a tap-to-copy handler on the result box or formula card using `expo-clipboard`, without altering any styles.

---

### C. Currency Converter

#### 1. Legacy Web Implementation
- **Source Files**: `public/js/calculator.js` (lines 103–332), `public/index.html` (lines 361–417).
- **Currencies (10)**:
  - `USD` ($ - US Dollar), `EUR` (€ - Euro), `RUB` (₽ - Russian Ruble), `CNY` (¥ - Chinese Yuan), `KZT` (₸ - Kazakhstani Tenge), `BYN` (Br - Belarusian Ruble), `GBP` (£ - British Pound), `JPY` (¥ - Japanese Yen), `TRY` (₺ - Turkish Lira), `AED` (د.إ - UAE Dirham).
- **Data Source & Caching**:
  - API endpoint: `https://open.er-api.com/v6/latest/USD`.
  - Cache storage: `localStorage.getItem('cachedRates')` storing `{ rates: currentRates, time: Date.now() }`.
  - Offline fallback: Displays cached rates with timestamp label `Показаны сохранённые курсы от <date>`.
- **Calculation**:
  - `resultVal = (amount / rateFrom) * rateTo`.
- **Popular Rates Grid**:
  - Displays a grid of 6 quick pairs: `USD/RUB`, `EUR/RUB`, `CNY/RUB`, `EUR/USD`, `USD/KZT`, `USD/BYN`.

#### 2. Mobile-Expo Implementation
- **Source File**: `mobile-expo/src/modules/tools/screens/CurrencyConverterScreen.tsx` (521 lines).
- **Currencies (9)**:
  - `USD` (US), `EUR` (EU), `RUB` (RU), `CNY` (CN), `KZT` (KZ), `BYN` (BY), `GBP` (GB), `TRY` (TR), `AED` (AE).
  - Uses 2-letter country code badges (strict compliance with AGENTS.md emoji ban).
- **Data Source & Caching**:
  - API endpoint: `https://open.er-api.com/v6/latest/USD`.
  - Cache storage: `AsyncStorage` key `@ssh_currency_rates` with 1-hour TTL (`RATES_CACHE_TTL = 3600_000`).
  - Cache fallback: Loads cached rates on network failure.
- **UI Components**:
  - `AppHeader` with `refresh-cw` right action.
  - From Card: flag badge, currency code selector pill, amount `TextInput`, full currency name.
  - Swap button with `repeat` icon.
  - To Card: flag badge, currency code selector pill, result box, full currency name.
  - Rate Info Card: 1 FROM = X TO rate line, plus last update time.
  - `CurrencyPickerModal`: Bottom sheet modal with live search.

#### 3. Differences, Gaps & Bugs
1. **Popular Rates Grid**:
   - Web displayed the top 6 currency pairs in a dedicated grid. Mobile only converts the currently selected pair.
2. **Currency Symbols**:
   - Web displayed currency symbols ($, €, ₽, etc.). Mobile only displays the 3-letter currency code (USD, RUB).
3. **Copy Result**:
   - Mobile lacks a tap-to-copy handler on the converted currency value.
4. **Number Input Handling**:
   - If the user enters a comma (`10,50`), mobile handles it with `replace(',', '.')`, which is good.

#### 4. Mobile UI Structure & Preservation Rules
- The UI in `CurrencyConverterScreen.tsx` is completely implemented and meets all R4 specifications.
- Workers can add a tap-to-copy handler on the result box or rate info card.

---

### D. Translator

#### 1. Legacy Web Implementation
- **Source Files**: `public/translator.js` (569 lines), `public/js/translator.js`, `public/translations.js`, `public/index.html`.
- **Translation API**:
  - **Google Translate Single Client**:
    `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=${sl}&tl=${to}&q=${encodeURIComponent(text)}`
  - Response parsing: `data[0].map(item => item[0] || '').join('')`.
  - Debounce: 600ms on typing.
  - Source language auto-detection (`auto` -> `Autodetect`).
- **Supported Languages (13)**:
  - `auto`, `ru`, `en`, `de`, `fr`, `es`, `ar`, `zh`, `ja`, `ko`, `tr`, `it`, `pt`.
- **Text-to-Speech (TTS)**:
  - Web Speech API: `speechSynthesis.speak(new SpeechSynthesisUtterance(text))` with voice language match.
  - Source TTS button and Target TTS button.
- **Favorites System**:
  - Dual storage: `localStorage` (`translator_favorites`) + Firebase Firestore (`users/${user.email || user.uid}/translator_favorites`).
  - Automatic sync on login: merges local and remote favorites by source text & target language.
  - Features: duplicate prevention, favorite count badge, click favorite to populate translator, delete favorite.
- **Synonyms (Datamuse API)**:
  - Fetches synonyms for short phrases (<= 3 words) via `https://api.datamuse.com/words?rel_syn=${query}&max=8`.
  - Displays chips; clicking a chip replaces translation text.
- **Copy**:
  - Target toolbar copy button copies translated text to clipboard with toast notification.

#### 2. Mobile-Expo Implementation
- **Source File**: `mobile-expo/src/modules/tools/screens/TranslatorScreen.tsx` (624 lines).
- **Translation API**:
  - **MyMemory API**:
    `https://api.mymemory.translated.net/get?q=${encoded}&langpair=${from}|${to}`
  - Response parsing: `data?.responseData?.translatedText`.
  - Debounce: 500ms.
- **Languages (6)**:
  - `ru` (Русский), `en` (English), `de` (Deutsch), `fr` (Francais), `es` (Espanol), `zh` (Zhongwen).
  - No `auto` detection.
- **TTS**:
  - Powered by `expo-speech` (`Speech.speak(text, { language: lang.speechLang })`).
  - Supports pause/stop toggle (`Speech.isSpeakingAsync()`).
- **Favorites**:
  - Stored in `AsyncStorage` key `@ssh_translator_favorites`.
  - View favorites mode toggled via `bookmark` header icon.
  - Favorite card displays language pair, source, target, trash icon, and tap-to-load.
- **Copy**:
  - **MISSING**: There is NO copy button on either the source or the target card!

#### 3. Differences, Gaps & Bugs
1. **CRITICAL: Translation API Reliability**:
   - MyMemory (`api.mymemory.translated.net`) enforces a strict daily rate limit of ~500–1000 words per IP address without an API key, after which it returns HTTP 429 and `MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY`.
   - The legacy web project used Google Translate (`https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=${sl}&tl=${to}&q=${encoded}`), which has no restrictive word caps and is vastly faster and more accurate.
   - **Recommendation**: Switch or fallback to the Google Translate `gtx` endpoint used in web.
2. **Missing Copy Button**:
   - The Target card toolbar only contains TTS (`volume-2`) and Favorite (`heart`). The copy button is completely absent.
   - R3 requires "копирование результатов". Adding a copy icon button (Feather `copy`) to the target card actions header is essential.
3. **Favorites Cloud Synchronization**:
   - In web: Firestore collection `users/${uid}/translator_favorites`.
   - In mobile: only local `AsyncStorage`.
4. **Synonyms Section**:
   - Present in web (Datamuse API), absent in mobile.

#### 4. Mobile UI Structure & Preservation Rules
- In `TranslatorScreen.tsx`:
  - `AppHeader`: title "Переводчик", subtitle language pair, back button, favorites toggle button.
  - When `showFavorites === true`: lists favorites with `favCard` styles and trash button.
  - When `showFavorites === false`:
    - `langRow`: from pill, swap button (`swapBtn`), to pill.
    - Source `textCard`: header label, actions (`volume-2`, `x`), `textArea`.
    - Target `textCard`: header label, actions (`volume-2`, `heart`), `targetTextDisplay` or activity indicator.
- **Preservation Directive**: In `styles.textCardActions`, there is room for a third action button (`copy`). Adding `TouchableOpacity` with Feather `copy` preserves 100% of the styling while restoring the missing feature.

---

### E. GenPass (Password Generator & Analyzer)

#### 1. Legacy Web Implementation
- **Source Files**: `public/genpass.js` (1,004 lines), `public/js/genpass.js` (adapter), `public/index.html` (lines 178–308).
- **Architecture**: 3 Full Functional Tabs:
  1. **Генератор (Generator)**:
     - Password display input with monospace font.
     - Save to vault button (`bookmark_add`).
     - 1-click copy button (`content_copy`) with toast feedback.
     - Length slider: 5 to 64 characters with live number display.
     - 4 switches: Uppercase (`A-Z`), Lowercase (`a-z`), Numbers (`0-9`), Symbols (`!@#$`).
     - Generate button.
  2. **Проверить пароль (Password Checker / Analyzer)**:
     - Password input with show/hide toggle (`visibility`) and clear (`close`).
     - Save analyzed password button (`bookmark_add`).
     - Score ring: circular ring showing 0–100% score with dynamic border color.
     - Status verdict: Danger (<25%), Weak (<45%), Medium (<70%), Good (<90%), Unbreakable (>=90%).
     - Crack time estimate: calculated via entropy and brute-force combinations (`< 1 second` up to `thousand years`).
     - 5-point Security Checklist with checkmark/cancel icons:
       1. Length at least 12 characters (`len >= 12`)
       2. Uppercase and lowercase letters (`hasUpper && hasLower`)
       3. Digits and special symbols (`hasNum && hasSym`)
       4. No simple patterns (checks for `qwerty`, `12345`, `asdfgh`, `password`, `111`, `aaa`)
       5. Not compromised (queries HaveIBeenPwned API)
     - **Real Pwned Passwords API integration**:
       - Computes SHA-1 hash of password using `crypto.subtle.digest('SHA-1', ...)`.
       - Takes first 5 hex chars as prefix, queries `https://api.pwnedpasswords.com/range/${prefix}` (k-Anonymity model).
       - Matches remainder of hash. If found, displays red warning banner with leak occurrence count (`Этот пароль найден в слитых базах данных {count} раз!`) and caps security score to 15%.
     - **In-place "Improve Password" Button**:
       - Replaces letters with l33t substitutions (`a`->`@`, `s`->`$`, `i`->`1`, `o`->`0`, `e`->`3`, `t`->`7`).
       - Capitalizes first letter, ensures missing character classes, and pads length to 16.
  3. **Мои пароли (Vault / Saved Passwords)**:
     - Manual add form: service label, password, generate button, save button.
     - Saved password card: service title, masked password (`••••••••`), show/hide toggle, 1-click copy, delete with confirmation modal.
     - Shield hover badge: displays score %, crack time, and recommendation.
     - Cloud synchronization: Firebase Realtime Database at `users/${uid}/passwords` with sync indicator.

#### 2. Mobile-Expo Implementation
- **Source File**: `mobile-expo/src/modules/tools/screens/GenPassScreen.tsx` (601 lines).
- **Features Implemented**:
  - Single screen displaying only the Generator and a simple 10-item History list.
  - Password display card with selectable text.
  - 4-segment strength bar:
    - Calculates entropy: `entropy = length * log2(charsetSize)`.
    - Labels: Слабый (<28 bit), Средний (<50 bit), Сильный (<80 bit), Очень сильный (>=80 bit).
  - Action buttons: "Сгенерировать" (Feather `refresh-cw`) and "Копировать" (Feather `copy`/`check`) with `Clipboard.setStringAsync` and 2s feedback.
  - Length slider with discrete touch dots (4, 8, 12, 16, 20, 24, 32, 48, 64) and quick preset pills (8, 12, 16, 24, 32).
  - 4 character set toggles with custom animated switch knobs.
  - Ephemeral history list (max 10 entries) stored in `@ssh_genpass_history`.

#### 3. Differences, Gaps & Bugs
1. **Missing Password Analyzer**:
   - The entire password analysis tab from web is absent: no manual password input for checking, no crack time calculation, no 5-point checklist, no HaveIBeenPwned leak API check, and no "Improve Password" algorithm.
2. **Missing Password Vault**:
   - Web had a full Password Vault with service labels (`Google`, `VK`, `GitHub`, etc.), show/hide toggles, delete confirmations, and Firebase sync (`users/${uid}/passwords`).
   - Mobile only has a flat history of raw generated passwords without names/labels.
3. **No Save-to-Vault Action**:
   - In web, generated passwords had a "Save to Vault" button prompting for a service name.

#### 4. Mobile UI Structure & Preservation Rules
- `GenPassScreen.tsx` has a very refined UI for the generator.
- To preserve 100% of the UI fidelity while fulfilling R3:
  - The Generator section (lines 177–372) should remain intact.
  - Below the Character toggles (or using a SegmentedControl / tab pill at the top, styled exactly like the `categoryRow` in `UnitConverterScreen`), workers can toggle between the Generator and the Password Checker / Vault without altering existing styles.
  - Alternatively, the analyzer input, crack time, and checklist can be displayed in an expandable card matching `optionCard` styling.

---

## 3. Cross-Cutting Capabilities Matrix

| Capability | Legacy Web Behavior | Mobile-Expo Behavior | Audit Gap / Remediation Needed |
|---|---|---|---|
| **Tagging** | None in `public/notes.js` (only search) | Fully implemented with `TagFilter`, preset tags, custom tags, badges | Mobile exceeds web! Ensure tag filtering and search work harmoniously |
| **Sorting** | Notes strictly sorted by `b.updatedAt - a.updatedAt` | Notes displayed in array order without explicit date sorting | Add `.sort((a, b) => b.updatedAt - a.updatedAt)` to notes pipeline |
| **Filtering** | Notes: query search + reminder filter. Converters: dropdowns. Translator: none. | Notes: query + tag. Converters: modal with live search. Translator: none. | Ensure all search inputs handle case-insensitive Russian & English |
| **Copying** | Translator: 1-click copy. GenPass: 1-click copy. Converters: none. | GenPass: 1-click copy with clipboard. Notes, Converters, Translator: missing copy | Implement 1-click copy in Translator (target card), Unit Converter (result), and NoteCard |
| **Unit Conversion Formulas** | Length (8 units), Mass (6 units), Temp (3 units) | Length (8 units), Mass (6 units), Temp (3 units) | 100% mathematical parity. Fix swap value rounding |
| **Exchange Rates & Caching** | `open.er-api.com/v6/latest/USD`, cached in localStorage, popular pairs grid | `open.er-api.com/v6/latest/USD`, cached in AsyncStorage (1 hr TTL) | Core logic matches. Missing popular pairs display and currency symbols |
| **Multi-Language & Speech** | Google Translate `gtx` (13 langs + auto), Web Speech TTS, Datamuse synonyms | MyMemory API (6 langs, no auto), `expo-speech` TTS, no synonyms | Switch/fallback to Google Translate `gtx` to fix MyMemory quota errors |
| **Password Strength** | 0-100% score, crack time, 5 rules, HaveIBeenPwned API, improve password | Entropy bits (0-128), 4-level bar, history list | Port crack time, checklist rules, and Pwned API to mobile |
| **Cloud Synchronization** | Firebase Realtime DB (notes, genpass) & Firestore (translator) | Local storage only (AsyncStorage) | Connect Firebase SDK (`studio-9933447149-80d6a`) as required by R4 |

---

## 4. UI Structure and Preservation Guide for Workers

### A. Strict Rules for R2/R3/R4 Implementers
1. **Never delete existing StyleSheet objects**: Every style key (`container`, `card`, `unitSelector`, `flagBadge`, etc.) in `mobile-expo/` must remain in place.
2. **Never change existing theme colors or font families**:
   - `Poppins_600SemiBold`, `Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold`.
   - `colors.background`, `colors.componentBackground`, `colors.borderColor`, `colors.primaryAccent`, `colors.textColor`, `colors.textColorSecondary`.
3. **No emojis in the UI**:
   - All icons must use `@expo/vector-icons` (`Feather`).
   - In `CurrencyConverterScreen`, currency flags use 2-letter textual codes (`US`, `EU`, `RU`, `KZ`), NOT unicode emoji flags.
4. **Enriching JSX without breaking layout**:
   - To add a Copy button to `TranslatorScreen`: add `<TouchableOpacity onPress={handleCopy} hitSlop={{...}}><Feather name="copy" .../></TouchableOpacity>` directly into the existing `textCardActions` View.
   - To add sorting to `NotesScreen`: update the `useMemo` filter chain before passing data to `NoteCard`.
   - To add copy to `NoteCard`: add a copy button inside `actionsRow` alongside the bookmark and trash buttons.

---

## 5. Concrete Action Plan for Implementation Phase

1. **Notes (`mobile-expo/src/modules/notes/`)**:
   - In `NotesScreen.tsx`, sort `filteredNotes` by `updatedAt` descending:
     ```typescript
     const sortedNotes = useMemo(() => {
       return [...filteredNotes].sort((a, b) => b.updatedAt - a.updatedAt);
     }, [filteredNotes]);
     ```
   - In `NoteCard.tsx`, add `onCopy` prop and copy button in `actionsRow` using `expo-clipboard`.
   - In `notesStorage.ts`, prepare sync adapter for Firebase Realtime Database (`users/${uid}/notes`).

2. **Unit Converter (`mobile-expo/src/modules/tools/screens/UnitConverterScreen.tsx`)**:
   - In `handleSwap`, fix value assignment: invert `fromUnit` and `toUnit` without overwriting `fromValue` with rounded result.
   - Add tap-to-copy handler on `resultBox` and `formulaCard` using `Clipboard.setStringAsync`.

3. **Currency Converter (`mobile-expo/src/modules/tools/screens/CurrencyConverterScreen.tsx`)**:
   - Add tap-to-copy handler on `resultBox`.
   - Add currency symbols to currency definitions (`$`, `€`, `₽`, `¥`, `₸`, `Br`, `£`, `₺`, `AED`).

4. **Translator (`mobile-expo/src/modules/tools/screens/TranslatorScreen.tsx`)**:
   - Switch primary translation request from MyMemory to Google Translate `gtx` endpoint:
     ```typescript
     const url = `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=${from}&tl=${to}&q=${encodeURIComponent(text)}`;
     const response = await fetch(url);
     const data = await response.json();
     if (data && data[0]) {
       const translated = data[0].map((item: any) => item[0] || '').join('');
       setTargetText(translated);
     }
     ```
   - Add copy button to target `textCardActions` with `Clipboard.setStringAsync` and toast/feedback.

5. **GenPass (`mobile-expo/src/modules/tools/screens/GenPassScreen.tsx`)**:
   - Implement crack time estimation function and HaveIBeenPwned k-Anonymity check:
     ```typescript
     // SHA-1 via Web Crypto API or expo-crypto
     ```
   - Add Password Analyzer and Vault modes or collapsible cards styled with existing `optionCard` components.
