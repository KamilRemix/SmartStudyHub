# Specification Mining Report: Tools & Theming

Authoritative Source: SmartStudyHub Codebase (`public/js/calculator.js`, `public/js/custom-select.js`, `public/js/ui.js`, `public/translator.js`, `public/genpass.js`, `public/style.css`, `public/index.html`, `public/translations.js`).

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Converter | Length Unit Conversion | Converts lengths between 8 metric and imperial units via base meter ratio | Numeric value, source unit (`km, m, cm, mm, mi, yd, ft, in`), target unit | Formatted converted number (2-6 decimals) + unit text | If `isNaN(v)`, returns `0.0000` | `public/js/calculator.js:56-61` |
| 2 | Converter | Mass Unit Conversion | Converts mass between 6 metric and imperial units via base kilogram ratio | Numeric value, source unit (`t, kg, g, mg, lb, oz`), target unit | Formatted converted number (2-6 decimals) + unit text | If `isNaN(v)`, returns `0.0000` | `public/js/calculator.js:63-66` |
| 3 | Converter | Temperature Conversion | Converts temperature among Celsius (°C), Fahrenheit (°F), and Kelvin (K) | Numeric value, source unit (`c, f, k`), target unit | Formatted converted number (2-6 decimals) + unit text | If `isNaN(v)`, returns `0.0000` | `public/js/calculator.js:68-76` |
| 4 | Converter | Unit Swap | Swaps 'From' and 'To' units and immediately re-evaluates result | Click event on swap trigger button | Inverted unit selection and updated result | None (noop if elements missing) | `public/js/calculator.js:86-100` |
| 5 | Converter | Currency Conversion | Converts amounts between world currencies using live/cached exchange rates | Amount (float), source currency code, target currency code | Formatted converted number (2-4 decimals) + currency symbol | If invalid amount, returns `0.0000`; if offline and no cache, returns 'Offline' | `public/js/calculator.js:149-174` |
| 6 | Converter | Exchange Rate Caching | Caches latest rates from open.er-api.com in persistent storage (`cachedRates`) | Fetch response from `https://open.er-api.com/v6/latest/USD` | Stored JSON `{ rates, time }` | Falls back to cached data with timestamp or shows error block | `public/js/calculator.js:217-300` |
| 7 | Converter | Popular Currency Rates Grid | Displays 6 popular conversion pairs (USD/RUB, EUR/RUB, CNY/RUB, EUR/USD, USD/KZT, USD/BYN) | Current exchange rate table | Rendered grid of cards with exchange rates rounded to 2 decimals | Displays error card with retry button if fetch fails and cache empty | `public/js/calculator.js:183-215` |
| 8 | Converter | Currency Swap | Swaps source and target currency dropdowns and recalculates | Click event on currency swap button | Inverted source/target currencies and recalculated value | None | `public/js/calculator.js:306-320` |
| 9 | Converter / UI | Bottom Sheet Picker (SmartPicker) | Replaces native selects with animated bottom sheet modal featuring live search | Trigger click, option list, search query | Selected option value, badge, title, subtitle | Displays 'No results found' / 'Ничего не найдено' when search misses | `public/js/custom-select.js:1-482` |
| 10 | Translator | Multi-Language Translation | Translates text between supported languages via Google Translate GTX API | Text string, source language code (`auto, ru, en, de, fr, es, zh`), target language code | Translated text string | Shows user-friendly error string ('Ошибка сети' / 'Ошибка перевода') | `public/translator.js:200-241` |
| 11 | Translator | Language Swap | Swaps source and target languages (defaulting auto to 'en') and swaps source/result text | Click on swap button | Inverted language picks, exchanged input/output text, auto-retranslate | Auto-detect cannot be target; falls back to 'en' | `public/translator.js:244-267` |
| 12 | Translator | Speech Synthesis (TTS) | Speaks text aloud in specified language using TTS engine | Text string, language code | Audio playback via TTS voice | Stops previous speech; fails gracefully if TTS unsupported | `public/translator.js:272-286` |
| 13 | Translator | Favorites Management | Saves translations with timestamp, metadata, and local/cloud synchronization | Source text, result text, source lang, target lang | Stored list of favorites, rendered list with remove & recall buttons | Prevents duplicate entries (case-insensitive) | `public/translator.js:295-475` |
| 14 | Translator | Synonyms Chips (Datamuse) | Fetches and displays synonyms for short phrases (<= 3 words) | Target text (EN or RU), language code | Clickable synonym chip buttons that replace result text | Silent catch on network error; hides section on long phrases | `public/translator.js:486-531` |
| 15 | Translator | Auto-Translate Debounce | Automatically triggers translation 600ms after user stops typing | Input event on source textarea | Auto-translated output and character count update | Clears previous timeout | `public/translator.js:152-160` |
| 16 | GenPass | Password Generator | Generates secure passwords of length 5-64 with selectable charsets | Length (int 5-64), booleans for upper, lower, numbers, symbols | Generated random password string | If all checkboxes unchecked, auto-enables lower and numbers | `public/genpass.js:687-706` |
| 17 | GenPass | 1-Click Clipboard Copy | Copies generated or saved password to system clipboard with visual confirmation | Password text | Clipboard update, icon changed to checkmark, toast confirmation | Catches permission rejections gracefully | `public/genpass.js:720-729, 541-549` |
| 18 | GenPass | Strength Analyzer Algorithm | Evaluates password strength based on entropy pool, length, patterns, and leaks | Password input string | Score (0-100%), status text, crack time, checklist status | Clamped between 0 and 100% | `public/genpass.js:877-988` |
| 19 | GenPass | Pwned Breach Check | Checks password against HaveIBeenPwned k-anonymity API using SHA-1 prefix/suffix | SHA-1 prefix (5 hex characters) | Leak count warning badge, score capped to maximum 15% | Silent error catch on network failure | `public/genpass.js:918-950` |
| 20 | GenPass | In-Place Password Improver | Enhances weak passwords (<80% score) with capitalization, leet substitutions, symbols, and length padding | Password string (<80% score) | Strengthened >=16 character password | If empty, generates a full 16-char random password | `public/genpass.js:759-828` |
| 21 | GenPass | Password Vault | Manages locally stored passwords with quick strength analyzer, visibility toggle, and copy | Password entry `{ id, label, password, createdAt }` | Rendered list with strength badges, show/hide, copy, and delete | Requires confirmation dialog before deletion | `public/genpass.js:467-576` |
| 22 | Theming | Dynamic Theme Switching | Toggles between Dark and Light themes with persistent storage and system scheme sync | Theme name ('light' or 'dark') | Applied CSS variables / React Native theme tokens | Defaults to system preference or 'dark' | `public/js/ui.js:58-112, public/style.css:1-34` |
| 23 | Theming | Strict Emoji Ban & Vector Icons | Completely forbids emoji characters; mandates Feather and MaterialIcons | Vector icon identifier | High-resolution scalable vector icon rendering | 0 emojis allowed in codebase and UI | `c:\projects\SmartStudyHub\AGENTS.md` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Unit Converter | Non-numeric input (NaN, empty string, letters) | Returns `0.0000` without throwing error. |
| 2 | Unit Converter | Source unit equals target unit (`from === to`) | Returns original input value without loss of precision (`out = v`). |
| 3 | Unit Converter | Negative temperatures (e.g. -40°C) | Correctly converts: -40°C = -40°F, -273.15°C = 0 K. |
| 4 | Unit Converter | Temperatures below absolute zero (< 0 Kelvin) | Arithmetic formula still computes; in mobile, optional validation can indicate physically impossible temperature. |
| 5 | Currency Converter | Zero or negative amount (`amount <= 0`) | Immediately sets result to `0.0000`. |
| 6 | Currency Converter | No internet connection on initial launch (no cache) | Displays error card with warning icon and retry button; result shows 'Offline'. |
| 7 | Currency Converter | Network failure with existing cache | Displays cached rates with timestamp banner: "Displaying cached rates from [Date]". |
| 8 | Currency Converter | Large numeric input (`1e12`) | Formatted with localized thousands separators and appropriate decimal truncation. |
| 9 | Bottom Sheet Picker | Empty search query | Shows full list of options without filtering. |
| 10 | Bottom Sheet Picker | Search query matches no items | Displays centered 'No results found' / 'Ничего не найдено' message. |
| 11 | Translator | Empty input or whitespace only | Clears result area, hides synonyms, resets character count to 0 without firing API. |
| 12 | Translator | Swap languages when source is 'auto' (Auto-detect) | Target language cannot be 'auto'; logic replaces 'auto' with 'en' upon swapping. |
| 13 | Translator | Network failure during translation | Displays 'Ошибка сети. Проверьте подключение.' in result container without crash. |
| 14 | Translator | Duplicate favorite addition | Checks case-insensitively; displays toast 'Уже в избранном' and suppresses duplicate entry. |
| 15 | Translator | Synonyms requested for long phrases (> 3 words) | Automatically skipped; Datamuse synonyms only query for 1 to 3 words. |
| 16 | GenPass Generator | User unchecks all 4 character set checkboxes | Guard clause immediately re-checks 'lower' and 'numbers' (`charset = chars.lower + chars.numbers`). |
| 17 | GenPass Generator | Password length set to extreme bounds (5 or 64) | Slider strictly clamped between `min=5` and `max=64`. |
| 18 | GenPass Analyzer | Empty input field | Resets score to 0%, ring to dark grey, status to 'Waiting...', checklist to defaults, hides warnings. |
| 19 | GenPass Analyzer | Simple repeating sequence (`12345`, `qwerty`, `password`) | Triggers regex penalty (-25 score) and unchecks 'No simple patterns'. |
| 20 | GenPass Analyzer | Leaked password discovered via k-anonymity API | Shows red warning banner with leak count, unchecks 'Not compromised', caps score to maximum 15%. |
| 21 | GenPass Vault | Deleting password | Prompts confirmation modal; removes entry from state and persistent storage upon confirmation. |
| 22 | Theming | Device switches OS dark mode while app is running | If user hasn't manually overridden theme, app automatically updates to match OS appearance. |

---

## 1. Converters Specification

### 1.1 Length Converter
Base Unit: **Meters (`m`)**

#### Conversion Ratios (`toMeters` table):
```typescript
export const LENGTH_FACTORS: Record<string, number> = {
  km: 1000,
  m: 1,
  cm: 0.01,
  mm: 0.001,
  mi: 1609.344,
  yd: 0.9144,
  ft: 0.3048,
  in: 0.0254,
};
```

#### Formula:
```typescript
function convertLength(value: number, from: string, to: string): number {
  if (from === to) return value;
  const fromFactor = LENGTH_FACTORS[from];
  const toFactor = LENGTH_FACTORS[to];
  if (!fromFactor || !toFactor) return value;
  return value * (fromFactor / toFactor);
}
```

#### Unit Labels and Badges:
- `km`: Kilometers (Километры), Badge: `km`
- `m`: Meters (Метры), Badge: `m`
- `cm`: Centimeters (Сантиметры), Badge: `cm`
- `mm`: Millimeters (Миллиметры), Badge: `mm`
- `mi`: Miles (Мили), Badge: `mi`
- `yd`: Yards (Ярды), Badge: `yd`
- `ft`: Feet (Футы), Badge: `ft`
- `in`: Inches (Дюймы), Badge: `in`

---

### 1.2 Mass Converter
Base Unit: **Kilograms (`kg`)**

#### Conversion Ratios (`toKg` table):
```typescript
export const MASS_FACTORS: Record<string, number> = {
  t: 1000,
  kg: 1,
  g: 0.001,
  mg: 0.000001,
  lb: 0.45359237,
  oz: 0.028349523125,
};
```

#### Formula:
```typescript
function convertMass(value: number, from: string, to: string): number {
  if (from === to) return value;
  const fromFactor = MASS_FACTORS[from];
  const toFactor = MASS_FACTORS[to];
  if (!fromFactor || !toFactor) return value;
  return value * (fromFactor / toFactor);
}
```

#### Unit Labels and Badges:
- `t`: Tonnes (Тонны), Badge: `t`
- `kg`: Kilograms (Килограммы), Badge: `kg`
- `g`: Grams (Граммы), Badge: `g`
- `mg`: Milligrams (Миллиграммы), Badge: `mg`
- `lb`: Pounds (Фунты), Badge: `lb`
- `oz`: Ounces (Унции), Badge: `oz`

---

### 1.3 Temperature Converter

#### Supported Units:
- `c`: Celsius (°C), Badge: `°C`
- `f`: Fahrenheit (°F), Badge: `°F`
- `k`: Kelvin (K), Badge: `K`

#### Formulas:
```typescript
function convertTemperature(value: number, from: string, to: string): number {
  if (from === to) return value;
  if (from === 'c' && to === 'f') return (value * 9) / 5 + 32;
  if (from === 'f' && to === 'c') return ((value - 32) * 5) / 9;
  if (from === 'c' && to === 'k') return value + 273.15;
  if (from === 'k' && to === 'c') return value - 273.15;
  if (from === 'f' && to === 'k') return ((value - 32) * 5) / 9 + 273.15;
  if (from === 'k' && to === 'f') return ((value - 273.15) * 9) / 5 + 32;
  return value;
}
```

---

### 1.4 Currency Converter

#### Supported Currencies:
| Code | Name (English) | Name (Russian) | Symbol |
|------|----------------|----------------|--------|
| USD  | US Dollar      | Доллар США     | $      |
| EUR  | Euro           | Евро           | €      |
| RUB  | Russian Ruble  | Российский рубль | ₽    |
| CNY  | Chinese Yuan   | Китайский юань | ¥      |
| KZT  | Kazakhstani Tenge | Казахстанский тенге | ₸ |
| BYN  | Belarusian Ruble | Белорусский рубль | Br  |
| GBP  | British Pound  | Британский фунт | £     |
| TRY  | Turkish Lira   | Турецкая лира  | ₺      |
| AED  | UAE Dirham     | Дирхам ОАЭ     | د.إ    |
| JPY  | Japanese Yen   | Японская иена  | ¥      |

#### Fallback Default Exchange Rates (USD Base = 1.0):
```typescript
export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  RUB: 91.50,
  CNY: 7.15,
  KZT: 475.0,
  BYN: 3.25,
  GBP: 0.78,
  TRY: 34.0,
  AED: 3.67,
  JPY: 155.0,
};
```

#### API Endpoint & Response Format:
- **Endpoint**: `https://open.er-api.com/v6/latest/USD`
- **Method**: `GET`
- **Response**:
```json
{
  "result": "success",
  "base_code": "USD",
  "rates": {
    "USD": 1,
    "EUR": 0.923,
    "RUB": 91.45,
    "CNY": 7.18
  },
  "time_last_update_unix": 1726142400
}
```

#### Cache Storage Schema:
- **Key**: `cachedRates` (in `@react-native-async-storage/async-storage`)
- **Type**:
```typescript
interface CachedRatesPayload {
  rates: Record<string, number>;
  time: number; // Date.now() timestamp
}
```

#### Currency Calculation Formula:
```typescript
function convertCurrency(amount: number, from: string, to: string, rates: Record<string, number>): number {
  if (isNaN(amount) || amount <= 0) return 0;
  const rateFrom = rates[from];
  const rateTo = rates[to];
  if (!rateFrom || !rateTo) return 0;
  return (amount / rateFrom) * rateTo;
}
```

#### Popular Pairs Grid:
1. `USD / RUB`: `(1 / rates.USD) * rates.RUB`
2. `EUR / RUB`: `(1 / rates.EUR) * rates.RUB`
3. `CNY / RUB`: `(1 / rates.CNY) * rates.RUB`
4. `EUR / USD`: `(1 / rates.EUR) * rates.USD`
5. `USD / KZT`: `(1 / rates.USD) * rates.KZT`
6. `USD / BYN`: `(1 / rates.USD) * rates.BYN`

---

### 1.5 Bottom Sheet Modal & Live Search (SmartPicker)
Used for selecting units and currencies cleanly on mobile:
- **Structure**:
  - Modal overlay / backdrop (semi-transparent dark scrim)
  - Bottom sheet container (rounded top corners, radius 20px)
  - Drag handle indicator (width 40px, height 4px, background `rgba(255,255,255,0.2)`)
  - Title row: "Select Currency" / "Выберите валюту" or "Select Unit" / "Единица измерения" + close button (Feather `x`)
  - Search Input: placeholder "Search..." / "Поиск...", magnifying glass icon (Feather `search`), clear icon (Feather `x`)
  - Virtualized or scrollable FlatList of selectable options
- **Item layout**:
  - Left: Badge chip (e.g. `$`, `km`, `RU`)
  - Middle: Title (localized name) + subtitle (`USD • $` or symbol)
  - Right: Checkmark icon (Feather `check`) if active
- **Live Search filter logic**:
  Matches if query is substring of `title`, `subtitle`, `code`, or `badge` (case-insensitive).
  If no results, displays: "No results found" / "Ничего не найдено".

---

## 2. Translator Specification

### 2.1 Supported Languages
| Code | Label (Native) | Label (English) | Speech Locale |
|------|----------------|-----------------|---------------|
| auto | Автоопределение | Auto Detect      | n/a           |
| ru   | Русский        | Russian         | `ru-RU`       |
| en   | English        | English         | `en-US`       |
| de   | Deutsch        | German          | `de-DE`       |
| fr   | Français       | French          | `fr-FR`       |
| es   | Español        | Spanish         | `es-ES`       |
| zh   | 中文           | Chinese         | `zh-CN`       |

*(Defaults: Source: `auto`, Target: `ru`)*

---

### 2.2 Translation Backend API & Fallback
1. **Primary API (Google GTX endpoint)**:
   ```
   https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl={from}&tl={to}&q={encodedText}
   ```
   - Parameter `sl`: source language code (use `auto` for auto-detect).
   - Parameter `tl`: target language code.
   - Parsing logic:
     ```typescript
     const res = await fetch(url);
     const data = await res.json();
     let translated = '';
     if (data && Array.isArray(data[0])) {
       translated = data[0].map((item: any) => item[0] || '').join('');
     }
     ```
2. **Offline Fallback Dictionary**:
   When network fails, a local dictionary provides immediate offline translations for core educational and conversational phrases:
   ```typescript
   export const OFFLINE_DICTIONARY: Record<string, Record<string, string>> = {
     "hello": { ru: "привет", de: "hallo", fr: "bonjour", es: "hola", zh: "你好" },
     "привет": { en: "hello", de: "hallo", fr: "bonjour", es: "hola", zh: "你好" },
     "thank you": { ru: "спасибо", de: "danke", fr: "merci", es: "gracias", zh: "谢谢" },
     "спасибо": { en: "thank you", de: "danke", fr: "merci", es: "gracias", zh: "谢谢" },
     "study": { ru: "учеба", de: "studium", fr: "études", es: "estudio", zh: "学习" },
     "calculator": { ru: "калькулятор", de: "Taschenrechner", fr: "calculatrice", es: "calculadora", zh: "计算器" },
     "school": { ru: "школа", de: "Schule", fr: "école", es: "escuela", zh: "学校" },
     "university": { ru: "университет", de: "Universität", fr: "université", es: "universidad", zh: "大学" },
     "grade": { ru: "оценка", de: "Note", fr: "note", es: "nota", zh: "成绩" }
   };
   ```
   If phrase is not in offline dictionary, displays friendly offline banner: "Network error. Showing offline fallback." / "Ошибка сети. Проверьте подключение."

---

### 2.3 Language Swap Logic
```typescript
function swapLanguages(
  fromLang: string,
  toLang: string,
  sourceText: string,
  resultText: string
) {
  // 'auto' cannot be a target language; fallback to 'en'
  const newTarget = fromLang === 'auto' ? 'en' : fromLang;
  const newSource = toLang;

  // Swap texts
  const newSourceText = resultText;
  const newResultText = sourceText;

  return {
    fromLang: newSource,
    toLang: newTarget,
    sourceText: newSourceText,
    resultText: newResultText,
  };
}
```

---

### 2.4 Text-to-Speech (TTS) via `expo-speech`
- Integration:
  ```typescript
  import * as Speech from 'expo-speech';

  export function speakText(text: string, langCode: string) {
    if (!text) return;
    Speech.stop();

    const localeMap: Record<string, string> = {
      ru: 'ru-RU',
      en: 'en-US',
      de: 'de-DE',
      fr: 'fr-FR',
      es: 'es-ES',
      zh: 'zh-CN',
    };

    const language = localeMap[langCode] || langCode;
    Speech.speak(text, {
      language,
      rate: 0.95,
      pitch: 1.0,
    });
  }
  ```
- Speaker buttons:
  - Source text speaker (MaterialIcons `volume_up`)
  - Translated text speaker (MaterialIcons `volume_up`)

---

### 2.5 Favorites Management
- **Schema**:
  ```typescript
  export interface TranslatorFavorite {
    id: string;          // uuid or timestamp
    source: string;      // original text
    result: string;      // translated text
    langFrom: string;    // 'en', 'ru', etc.
    langTo: string;      // 'ru', 'de', etc.
    timestamp: number;   // Date.now()
  }
  ```
- **Storage Key**: `translator_favorites` in `AsyncStorage`.
- **Operations**:
  - `addFavorite(source, result, langFrom, langTo)`: Validates non-empty, checks case-insensitive duplicate (`source` + `langFrom` + `langTo`).
  - `removeFavorite(id)`: Filters out matching id and persists.
  - `selectFavorite(fav)`: Populates source text and language pickers, displays translated text.

---

### 2.6 Synonyms (Datamuse API)
- Trigger condition: Target text has `<= 3` words and target language is `en` or `ru`.
- Endpoint: `https://api.datamuse.com/words?rel_syn=${encodeURIComponent(text.trim().toLowerCase())}&max=8`
- Chips display: List of horizontal pills. Tapping a pill updates the translated result.

---

## 3. GenPass Specification

### 3.1 Generation Options & Charsets
```typescript
export const GENPASS_CHARSETS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

export interface GenPassOptions {
  length: number;       // min: 5, max: 64, default: 16
  useUpper: boolean;    // default true
  useLower: boolean;    // default true
  useNumbers: boolean;  // default true
  useSymbols: boolean;  // default true
}
```

#### Safeguard:
If all 4 options are disabled, force `useLower = true` and `useNumbers = true`.

#### Generator Algorithm:
```typescript
export function generatePassword(options: GenPassOptions): string {
  let charset = '';
  if (options.useUpper) charset += GENPASS_CHARSETS.upper;
  if (options.useLower) charset += GENPASS_CHARSETS.lower;
  if (options.useNumbers) charset += GENPASS_CHARSETS.numbers;
  if (options.useSymbols) charset += GENPASS_CHARSETS.symbols;

  if (!charset) {
    charset = GENPASS_CHARSETS.lower + GENPASS_CHARSETS.numbers;
  }

  let pwd = '';
  for (let i = 0; i < options.length; i++) {
    const idx = Math.floor(Math.random() * charset.length);
    pwd += charset[idx];
  }
  return pwd;
}
```

---

### 3.2 Strength Scoring & Meter Algorithm
1. **Pool Size Calculation**:
   - `hasLower`: +26
   - `hasUpper`: +26
   - `hasNum`: +10
   - `hasSym`: +32
2. **Length Base Points**:
   - `< 5`: 0 points
   - `5 to 7`: 15 points
   - `8 to 11`: 30 points
   - `>= 12`: 40 points
3. **Bonuses & Penalties**:
   - `hasUpper && hasLower`: +15 points
   - `hasNum`: +15 points
   - `hasSym`: +15 points
   - Pattern match (`/(qwerty|12345|asdfgh|password|111|aaa)/i`): -25 points
   - `length >= 16`: +15 points
   - Score clamped: `Math.max(0, Math.min(100, score))`
4. **Breach Check via HaveIBeenPwned API (k-Anonymity)**:
   - Calculate SHA-1 hash of password.
   - Send first 5 characters (prefix) to `https://api.pwnedpasswords.com/range/{prefix}`.
   - If response contains remaining 35 characters (suffix), `isPwned = true`, leak warning triggered, and score capped to `min(score, 15)`.
5. **Crack Time Estimation**:
   - `combinations = Math.pow(poolSize, length)`
   - `seconds = combinations / 100_000_000_000` (assuming 100 billion guesses/sec)
   - Time string bands:
     - `< 1s`: "less than a second" / "менее секунды"
     - `< 60s`: `~X seconds` / `~X секунд`
     - `< 3600s`: `~X minutes` / `~X минут`
     - `< 86400s`: `~X hours` / `~X часов`
     - `< 31536000s`: `~X days` / `~X дней`
     - `< 3153600000s`: `~X years` / `~X лет`
     - `>= 3153600000s`: `~X thousand years` / `~X тысяч лет`
6. **Rating Tiers**:
   - `score < 25%`: Danger (`#ff4c4c`)
   - `25% <= score < 45%`: Weak (`#ff9800`)
   - `45% <= score < 70%`: Medium (`#ffeb3b`)
   - `70% <= score < 90%`: Good / Excellent (`#4caf50`)
   - `score >= 90%`: Unbreakable (`#00e676`)
7. **Security Checklist**:
   1. Length >= 12 chars
   2. Uppercase and lowercase letters
   3. Digits and special symbols
   4. No simple patterns
   5. Not compromised in database leaks

---

### 3.3 In-Place Password Improver
Activated when `score < 80%`:
1. Capitalizes first letter if lowercase.
2. Performs leet substitutions (40% probability per char):
   `a/A -> @`, `s/S -> $`, `i/I -> 1`, `o/O -> 0`, `e/E -> 3`, `t/T -> 7`.
3. Ensures presence of:
   - Uppercase letter (adds `'K'` if missing)
   - Lowercase letter (adds `'m'` if missing)
   - Digit (adds random 0-9 if missing)
   - Symbol (adds `'!'` if missing)
4. Pads with random numbers and symbols until length >= 16.

---

### 3.4 Password Vault (Saved Passwords)
- **Schema**:
  ```typescript
  export interface SavedPasswordItem {
    id: string;
    label: string;
    password: string;
    createdAt: number;
  }
  ```
- **Storage Key**: `genpass_saved` in `AsyncStorage`.
- **UI Elements**:
  - Masked password display (`••••••••`) with show/hide toggle.
  - Strength shield badge colored according to quick evaluator score.
  - 1-click clipboard copy button.
  - Delete button with confirmation dialog.
  - "Add Password" modal form (`label` + `password` + quick generate button).

---

## 4. Theming System Specification

### 4.1 Design Philosophy & EMOJI BAN
- **Strict Rule**: ZERO EMOJI CHARACTERS in the entire application UI, alerts, modals, toasts, or placeholders.
- All visual iconography is provided strictly by `@expo/vector-icons` (`Feather` and `MaterialIcons`).
- Glassmorphism aesthetic: Translucent cards, subtle frosted borders, soft shadows, neon/glow accents.

---

### 4.2 Theme Tokens & Color Palettes

```typescript
export interface AppTheme {
  isDark: boolean;
  background: string;
  surface: string;
  surfaceSecondary: string;
  glassCard: string;
  glassBorder: string;
  primaryAccent: string;
  secondaryAccent: string;
  text: string;
  textSecondary: string;
  border: string;
  glowPrimary: string;
  glowSecondary: string;
  shadowDeep: string;
  shadowLift: string;
  success: string;
  warning: string;
  danger: string;
}

export const lightTheme: AppTheme = {
  isDark: false,
  background: '#f4f7f9',
  surface: '#ffffff',
  surfaceSecondary: '#f0f2f5',
  glassCard: 'rgba(255, 255, 255, 0.75)',
  glassBorder: 'rgba(255, 255, 255, 0.85)',
  primaryAccent: '#007aff',      // iOS Blue
  secondaryAccent: '#ff3b30',    // iOS Red
  text: '#000000',
  textSecondary: '#6e6e73',
  border: 'rgba(0, 0, 0, 0.08)',
  glowPrimary: 'rgba(0, 122, 255, 0.25)',
  glowSecondary: 'rgba(255, 59, 48, 0.25)',
  shadowDeep: 'rgba(0, 0, 0, 0.12)',
  shadowLift: 'rgba(0, 0, 0, 0.04)',
  success: '#34c759',
  warning: '#ff9500',
  danger: '#ff3b30',
};

export const darkTheme: AppTheme = {
  isDark: true,
  background: '#121212',
  surface: '#1e1e1e',
  surfaceSecondary: '#2a2a2a',
  glassCard: 'rgba(30, 30, 46, 0.65)',
  glassBorder: 'rgba(255, 255, 255, 0.12)',
  primaryAccent: '#00ffff',      // Electric Cyan
  secondaryAccent: '#9400d3',    // Purple / Violet
  text: '#e0e0e0',
  textSecondary: '#a0a0a0',
  border: 'rgba(255, 255, 255, 0.10)',
  glowPrimary: 'rgba(0, 255, 255, 0.35)',
  glowSecondary: 'rgba(148, 0, 211, 0.35)',
  shadowDeep: 'rgba(0, 0, 0, 0.50)',
  shadowLift: 'rgba(0, 0, 0, 0.25)',
  success: '#00e676',
  warning: '#ffeb3b',
  danger: '#ff4c4c',
};
```

---

### 4.3 Typography Specification (Google Fonts via `expo-font`)
- Primary Font: **Poppins** (`@expo-google-fonts/poppins`)
  - `Poppins_300Light`
  - `Poppins_400Regular`
  - `Poppins_500Medium`
  - `Poppins_600SemiBold`
  - `Poppins_700Bold`
- Secondary / Numeric Font: **Inter** or System Monospace (`Platform.select({ ios: 'Courier', android: 'monospace' })`).
- Type Scale Hierarchy:
  - Display / Large Title: 28px, Bold (700)
  - Screen Header: 22px, SemiBold (600)
  - Card Title: 17px, SemiBold (600)
  - Body Text: 15px, Regular (400)
  - Subtitle / Form Label: 13px, Medium (500)
  - Caption / Footnote: 11px, Regular (400)
  - Numeric Display (Converter/Calculator): 24-32px, Bold (700), tabular figures

---

### 4.4 Comprehensive Icon Mapping Table (No Emojis)

| UI Element / Action | Web Implementation | React Native `@expo/vector-icons` | Library | Icon Name |
|---------------------|--------------------|-----------------------------------|---------|-----------|
| Bottom Tab: Calculator | `<i data-feather="cpu">` | `<Feather name="cpu" />` | Feather | `cpu` |
| Bottom Tab: Grades | `<i data-feather="bar-chart-2">` | `<Feather name="bar-chart-2" />` | Feather | `bar-chart-2` |
| Bottom Tab: Tools | `<i data-feather="grid">` | `<Feather name="grid" />` | Feather | `grid` |
| Tile: Settings | `<i data-feather="settings">` | `<Feather name="settings" />` | Feather | `settings` |
| Tile: Unit Converter | `<i data-feather="sliders">` | `<Feather name="sliders" />` | Feather | `sliders` |
| Tile: Currency Converter | `<i data-feather="dollar-sign">` | `<Feather name="dollar-sign" />` | Feather | `dollar-sign` |
| Tile: Notes | `<i data-feather="file-text">` | `<Feather name="file-text" />` | Feather | `file-text` |
| Tile: Translator | `<i data-feather="globe">` | `<Feather name="globe" />` | Feather | `globe` |
| Tile: GenPass | `vpn_key` | `<MaterialIcons name="vpn-key" />` | MaterialIcons | `vpn-key` |
| Navigation Back Button | `arrow_back` | `<MaterialIcons name="arrow-back" />` | MaterialIcons | `arrow-back` |
| Swap Units / Currencies | `<i data-feather="repeat">` | `<Feather name="repeat" />` | Feather | `repeat` |
| Swap Languages | `swap_horiz` | `<MaterialIcons name="swap-horiz" />` | MaterialIcons | `swap-horiz` |
| Refresh Rates | `<i data-feather="refresh-cw">` | `<Feather name="refresh-cw" />` | Feather | `refresh-cw` |
| Search in Picker | `search` | `<Feather name="search" />` | Feather | `search` |
| Close / Clear Modal | `close` | `<Feather name="x" />` | Feather | `x` |
| Selection Checkmark | `check` | `<Feather name="check" />` | Feather | `check` |
| Copy to Clipboard | `content_copy` | `<MaterialIcons name="content-copy" />` | MaterialIcons | `content-copy` |
| Text-to-Speech (TTS) | `volume_up` | `<MaterialIcons name="volume-up" />` | MaterialIcons | `volume-up` |
| Bookmark / Favorite | `bookmark` / `star` | `<MaterialIcons name="bookmark" />` | MaterialIcons | `bookmark` |
| Add Favorite / Save | `bookmark_add` | `<MaterialIcons name="bookmark-add" />` | MaterialIcons | `bookmark-add` |
| Delete Favorite / Password | `delete` | `<MaterialIcons name="delete" />` | MaterialIcons | `delete` |
| Password Visibility Show | `visibility` | `<MaterialIcons name="visibility" />` | MaterialIcons | `visibility` |
| Password Visibility Hide | `visibility_off` | `<MaterialIcons name="visibility-off" />` | MaterialIcons | `visibility-off` |
| Security Shield / Score | `shield` | `<MaterialIcons name="shield" />` | MaterialIcons | `shield` |
| Warning / Leak Alert | `warning` | `<MaterialIcons name="warning" />` | MaterialIcons | `warning` |
| Checklist Valid Item | `check_circle` | `<MaterialIcons name="check-circle" />` | MaterialIcons | `check-circle` |
| Checklist Invalid Item | `cancel` | `<MaterialIcons name="cancel" />` | MaterialIcons | `cancel` |
| Synonyms Auto Magic | `auto_awesome` | `<MaterialIcons name="auto-awesome" />` | MaterialIcons | `auto-awesome` |
| Sync Status | `sync` | `<MaterialIcons name="sync" />` | MaterialIcons | `sync` |
| Add Password Button | `add_circle` | `<MaterialIcons name="add-circle" />` | MaterialIcons | `add-circle` |

---

## 5. Mobile Expo Architecture Recommendations

1. **Folder Structure**:
   ```
   mobile-expo/
   ├── src/
   │   ├── navigation/
   │   │   └── RootNavigator.tsx
   │   ├── theme/
   │   │   ├── ThemeContext.tsx
   │   │   ├── colors.ts
   │   │   └── typography.ts
   │   ├── components/
   │   │   ├── common/
   │   │   │   ├── GlassCard.tsx
   │   │   │   └── SmartPickerModal.tsx
   │   │   └── tools/
   │   │       ├── UnitConverter.tsx
   │   │       ├── CurrencyConverter.tsx
   │   │       ├── Translator.tsx
   │   │       └── GenPass.tsx
   │   ├── services/
   │   │   ├── currencyApi.ts
   │   │   ├── translatorApi.ts
   │   │   ├── pwnedApi.ts
   │   │   └── ttsService.ts
   │   └── utils/
   │       ├── converterFormulas.ts
   │       └── passwordEvaluator.ts
   ```
2. **State Management**:
   - `ThemeContext`: controls `isDark`, dynamic toggle, and system appearance synchronization.
   - `AsyncStorage`: handles persistence for `theme`, `cachedRates`, `translator_favorites`, and `genpass_saved`.
3. **Speech & Clipboard**:
   - `expo-speech` for TTS.
   - `expo-clipboard` for 1-click password and translation copy.
