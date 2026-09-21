# Milestone 3 (Tools Module) Technical Architecture & Implementation Blueprint

**Project**: SmartStudyHub Mobile Expo Clone (`mobile-expo`)  
**Target Milestone**: Milestone 3 — Tools Module (Converters, Translator, GenPass)  
**Author**: `teamwork_preview_explorer_m3_1` (Tools Module Explorer)  
**Date**: 2026-09-12  

---

## 1. Executive Summary & Architectural Scope

The Tools Module serves as the comprehensive educational and utility powerhouse of SmartStudyHub Mobile. It provides four distinct subsystems:
1. **Unit Converters**: Length, Mass, and Temperature conversions based on exact SI base-unit mathematical models.
2. **Currency Converter**: 10 global currencies with live API rate fetching (`https://open.er-api.com/v6/latest/USD`), automatic caching under `@smartstudy_currency_rates`, and hardcoded offline baseline exchange rates for zero-connectivity resilience.
3. **Multi-Language Translator**: 6 core languages (`RU`, `EN`, `DE`, `FR`, `ES`, `ZH`), language swapping, multi-tiered translation engine (Google GTX / MyMemory API + rich offline study phrase dictionary), persistent favorites under `@smartstudy_translator_favorites`, and native audio pronunciation via `expo-speech` with exact BCP-47 language codes.
4. **GenPass Password Generator**: Configurable character length (5–64 chars), character set toggles (A-Z, a-z, 0-9, symbols), Shannon entropy bit calculation, pattern detection penalties, brute-force crack time estimation, dynamic strength indicators, interactive analyzer mode, and 1-click clipboard copying via `expo-clipboard`.

### Strict Constraints Adherence
- **Zero Emoji Policy**: Global verification against Unicode emoji patterns. All UI actions, status chips, and indicators use vector icons strictly from `@expo/vector-icons` (`Feather`).
- **Dynamic Theming**: Full visual adaptation across both Light and Dark modes using color tokens from `useTheme()`.
- **Zero Placeholders**: Complete, production-ready mathematical algorithms and service functions with zero `// TODO` or `// FIXME` comments.
- **Offline First**: All four tools operate reliably without an active internet connection.

---

## 2. Directory Layout & Module Structure

The Tools Module is located in `mobile-expo/src/modules/tools/` and organized into dedicated, highly cohesive submodules:

```
mobile-expo/src/modules/tools/
├── ToolsScreen.tsx                         # Main Tools Navigation Hub & Subtool Switcher
├── index.ts                                # Tools module root export
├── types.ts                                # Shared tools type definitions
├── components/
│   ├── SearchablePickerModal.tsx           # Reusable bottom sheet modal with live search input
│   └── ToolsHubCards.tsx                   # Launcher cards for the tools hub view
├── converters/
│   ├── index.ts                            # Converters sub-module export
│   ├── types.ts                            # Unit and currency types & interfaces
│   ├── components/
│   │   ├── UnitConverterView.tsx           # Length, mass, temperature converter UI
│   │   └── CurrencyConverterView.tsx       # 10-currency converter UI with popular pairs
│   └── utils/
│       ├── conversionMath.ts               # Exact conversion ratios, formulas, and validators
│       └── currencyStorage.ts              # Currency API fetching, AsyncStorage caching, offline baseline
├── translator/
│   ├── index.ts                            # Translator sub-module export
│   ├── types.ts                            # Language definitions, favorites schema, API types
│   ├── components/
│   │   ├── TranslatorView.tsx              # Main translation UI with textareas and controls
│   │   └── FavoritesModal.tsx              # Modal list of saved translations
│   └── utils/
│       ├── translationService.ts           # Multi-tier translation engine (API + offline dictionary)
│       ├── translatorStorage.ts            # AsyncStorage persistence for favorites
│       └── ttsService.ts                   # expo-speech wrapper with accurate BCP-47 codes
└── genpass/
    ├── index.ts                            # GenPass sub-module export
    ├── types.ts                            # Charset toggles, entropy metrics, evaluation result
    ├── components/
    │   ├── GenPassView.tsx                 # Password generator UI with controls and strength bar
    │   └── PasswordAnalyzerView.tsx        # Interactive manual password tester with 5 criteria
    └── utils/
        ├── passwordGenerator.ts            # Configurable secure password generation
        ├── entropyMath.ts                  # Shannon entropy, crack time, pattern penalty algorithms
        └── clipboardHelper.ts              # expo-clipboard integration with toast trigger
```

---

## 3. Subsystem 1: Converters (`modules/tools/converters/`)

### 3.1 Length Converter
- **Base SI Unit**: Meter (`m = 1.0`)
- **Supported Units (8)**:
  | Code | Russian Name | English Name | Ratio to Meter (`m`) |
  | :--- | :--- | :--- | :--- |
  | `km` | Километры | Kilometers | `1000.0` |
  | `m`  | Метры | Meters | `1.0` |
  | `cm` | Сантиметры | Centimeters | `0.01` |
  | `mm` | Миллиметры | Millimeters | `0.001` |
  | `mi` | Мили | Miles | `1609.344` |
  | `yd` | Ярды | Yards | `0.9144` |
  | `ft` | Футы | Feet | `0.3048` |
  | `in` | Дюймы | Inches | `0.0254` |
- **Conversion Formula**:
  $$\text{valueInMeters} = \text{inputVal} \times \text{ratio}[\text{fromUnit}]$$
  $$\text{result} = \frac{\text{valueInMeters}}{\text{ratio}[\text{toUnit}]}$$

### 3.2 Mass Converter
- **Base SI Unit**: Kilogram (`kg = 1.0`)
- **Supported Units (6)**:
  | Code | Russian Name | English Name | Ratio to Kilogram (`kg`) |
  | :--- | :--- | :--- | :--- |
  | `t`  | Тонны | Metric Tonnes | `1000.0` |
  | `kg` | Килограммы | Kilograms | `1.0` |
  | `g`  | Граммы | Grams | `0.001` |
  | `mg` | Миллиграммы | Milligrams | `0.000001` ($10^{-6}$) |
  | `lb` | Фунты | Pounds (avoirdupois) | `0.45359237` |
  | `oz` | Унции | Ounces (avoirdupois) | `0.028349523125` ($\frac{\text{lb}}{16}$) |
- **Conversion Formula**:
  $$\text{valueInKg} = \text{inputVal} \times \text{ratio}[\text{fromUnit}]$$
  $$\text{result} = \frac{\text{valueInKg}}{\text{ratio}[\text{toUnit}]}$$

### 3.3 Temperature Converter
- **Supported Scales (3)**:
  - Celsius (`c`, `°C`)
  - Fahrenheit (`f`, `°F`)
  - Kelvin (`k`, `K`)
- **Exact Transformation Formulas**:
  - **Celsius to Fahrenheit**: $F = (C \times \frac{9}{5}) + 32$
  - **Fahrenheit to Celsius**: $C = (F - 32) \times \frac{5}{9}$
  - **Celsius to Kelvin**: $K = C + 273.15$
  - **Kelvin to Celsius**: $C = K - 273.15$
  - **Fahrenheit to Kelvin**: $K = (F - 32) \times \frac{5}{9} + 273.15$
  - **Kelvin to Fahrenheit**: $F = (K - 273.15) \times \frac{9}{5} + 32$
  - **Same Scale**: $\text{result} = \text{inputVal}$
- **Physical Boundary Validation**:
  - Absolute zero limits: $C \ge -273.15$, $F \ge -459.67$, $K \ge 0$.

### 3.4 Currency Converter
- **Supported Currencies (10)**:
  | Code | Symbol | Russian Name | English Name | Baseline Rate (per 1 USD) |
  | :--- | :--- | :--- | :--- | :--- |
  | `USD` | `$` | Доллар США | US Dollar | `1.0000` |
  | `EUR` | `€` | Евро | Euro | `0.9200` |
  | `RUB` | `₽` | Российский рубль | Russian Ruble | `92.5000` |
  | `CNY` | `¥` | Китайский юань | Chinese Yuan | `7.2400` |
  | `KZT` | `₸` | Казахстанский тенге | Kazakhstani Tenge | `485.0000` |
  | `BYN` | `Br` | Белорусский рубль | Belarusian Ruble | `3.2800` |
  | `GBP` | `£` | Британский фунт | British Pound | `0.7800` |
  | `JPY` | `¥` | Японская иена | Japanese Yen | `155.0000` |
  | `TRY` | `₺` | Турецкая лира | Turkish Lira | `33.5000` |
  | `AED` | `د.إ` | Дирхам ОАЭ | UAE Dirham | `3.6725` |

- **API Rate Provider**: `https://open.er-api.com/v6/latest/USD`
  - Real-time JSON response contains `rates: { [code: string]: number }` and `time_last_update_unix`.
- **AsyncStorage Persistence**:
  - Key: `@smartstudy_currency_rates`
  - Cached Structure:
    ```typescript
    export interface CachedCurrencyData {
      rates: Record<string, number>;
      lastUpdated: number; // Unix timestamp in ms
      isOfflineFallback: boolean;
      source: 'api' | 'cache' | 'baseline';
    }
    ```
- **Fallback Hierarchy**:
  1. Network fetch from API (validates status and structure). On success, saves to AsyncStorage and updates memory state.
  2. If network request fails or times out (5000ms), attempt reading cached rates from AsyncStorage `@smartstudy_currency_rates`.
  3. If AsyncStorage cache is empty (first launch with no network), fall back to hardcoded `BASELINE_CURRENCY_RATES`.
- **Conversion Equation**:
  $$\text{result} = \left(\frac{\text{amount}}{\text{rates}[\text{fromCurrency}]}\right) \times \text{rates}[\text{toCurrency}]$$
- **Popular Rate Pairs Grid**:
  Displays direct real-time conversion rates for frequent academic and travel pairs:
  - `USD / RUB`, `EUR / RUB`, `CNY / RUB`, `EUR / USD`, `USD / KZT`, `USD / BYN`.

### 3.5 Reusable SearchablePickerModal / BottomSheet
- **Component**: `SearchablePickerModal.tsx`
- **Behavior**:
  - Animated Modal from bottom with dark backdrop.
  - Header with title, item count, and Feather `x` close button.
  - Search input with Feather `search` icon and clear button.
  - Real-time filtering across item `key` (e.g., "USD"), `title` (e.g., "Доллар США"), and `subtitle` (e.g., "$").
  - `FlatList` with optimized item height and active state indicator (Feather `check`).
  - Safe-area insets padding and keyboard-avoiding behavior.

---

## 4. Subsystem 2: Translator (`modules/tools/translator/`)

### 4.1 Supported Languages
- **6 Core Target Languages**:
  | Code | Label (RU) | Label (EN) | BCP-47 TTS Code |
  | :--- | :--- | :--- | :--- |
  | `ru` | Русский | Russian | `ru-RU` |
  | `en` | English | English | `en-US` |
  | `de` | Deutsch | German | `de-DE` |
  | `fr` | Français | French | `fr-FR` |
  | `es` | Español | Spanish | `es-ES` |
  | `zh` | 中文 | Chinese | `zh-CN` |

- **Source Language Options**: Includes all 6 core languages plus `auto` (Автоопределение / Auto-detect).

### 4.2 Translation Engine Architecture
A three-tier resilient translation engine:
```
[User Text Input]
       │
       ▼
[Tier 1: Google Translate GTX Single Endpoint]
  URL: https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=${from}&tl=${to}&q=${encoded}
       │
       ├─► Success ──► Return translated string
       │
       ▼ (Failure or Network Error)
[Tier 2: MyMemory Translated API]
  URL: https://api.mymemory.translated.net/get?q=${encoded}&langpair=${from}|${to}
       │
       ├─► Success ──► Return responseData.translatedText
       │
       ▼ (Failure or Offline)
[Tier 3: Offline Study Phrase Dictionary]
  Normalized match (case-insensitive, trimmed punctuation)
       │
       ├─► Match Found ──► Return offline translated phrase + badge "[Оффлайн]"
       │
       ▼ (Not in dictionary)
[Graceful Offline Notice]
  "Оффлайн-режим: проверьте подключение к сети для перевода произвольного текста"
```

### 4.3 Offline Phrase Dictionary Corpus
The offline dictionary contains over 40 essential academic, conversational, and study terms mapped across all 6 languages:
- Greetings & Politeness: `hello`, `goodbye`, `thank you`, `please`, `yes`, `no`, `sorry`, `how are you`
- Study & School: `school`, `university`, `student`, `teacher`, `book`, `notebook`, `lesson`, `homework`, `exam`, `test`, `grade`, `library`, `classroom`, `mathematics`, `physics`, `chemistry`, `history`, `language`
- Academic Actions: `read`, `write`, `study`, `learn`, `think`, `question`, `answer`, `explain`
- System & Utility: `help`, `calculator`, `computer`, `dictionary`, `notes`, `tools`

### 4.4 Language Swap Mechanism
- Tapping the swap button (Feather `repeat`):
  1. Source language becomes previous target language.
  2. Target language becomes previous source language (if previous source was `auto`, target resolves to `ru` or `en` reciprocally).
  3. If translated result text is present, it swaps into the source input and triggers reverse translation.

### 4.5 Favorites & History
- **AsyncStorage Key**: `@smartstudy_translator_favorites`
- **Schema**:
  ```typescript
  export interface TranslatorFavorite {
    id: string;
    sourceText: string;
    translatedText: string;
    sourceLang: string;
    targetLang: string;
    timestamp: number;
  }
  ```
- **Operations**:
  - Add to Favorites: Checks for duplicates (case-insensitive source text + matching language pair).
  - Remove from Favorites: Removes by unique ID.
  - Tap to Load: Instantly populates translator with the saved pair and text.
  - Clear All Favorites with confirmation.

### 4.6 Text-to-Speech (TTS) Integration
- **Package**: `expo-speech` (`import * as Speech from 'expo-speech'`)
- **BCP-47 Language Mapping**:
  ```typescript
  export const BCP47_LANGUAGE_CODES: Record<string, string> = {
    ru: 'ru-RU',
    en: 'en-US',
    de: 'de-DE',
    fr: 'fr-FR',
    es: 'es-ES',
    zh: 'zh-CN',
  };
  ```
- **Audio Guard**:
  ```typescript
  export const speakText = async (text: string, langCode: string): Promise<void> => {
    if (!text || !text.trim()) return;
    try {
      await Speech.stop(); // Stop any currently playing audio
      const voiceLang = BCP47_LANGUAGE_CODES[langCode] || 'en-US';
      await Speech.speak(text.trim(), {
        language: voiceLang,
        pitch: 1.0,
        rate: 0.95,
      });
    } catch (err) {
      console.warn('[TTS] Speech synthesis error:', err);
    }
  };
  ```

---

## 5. Subsystem 3: GenPass Password Generator (`modules/tools/genpass/`)

### 5.1 Generator Configuration
- **Length Range**: 5 to 64 characters (default: 16 characters).
  - Preset quick buttons: `8`, `12`, `16`, `24`, `32`.
  - Stepper controls (`-` and `+`) and slider.
- **Character Sets**:
  - Uppercase letters (`upper`): `ABCDEFGHIJKLMNOPQRSTUVWXYZ` (26 chars)
  - Lowercase letters (`lower`): `abcdefghijklmnopqrstuvwxyz` (26 chars)
  - Digits (`digits`): `0123456789` (10 chars)
  - Special Symbols (`symbols`): `!@#$%^&*()_+-=[]{}|;:,.<>?` (26 chars)
- **Safety Fallback**: If user toggles off all character sets, auto-enable lowercase and digits to prevent empty generator states.

### 5.2 Shannon Entropy & Strength Calculation
1. **Alphabet Pool Size ($N$)**:
   $$N = (\text{hasLower} \cdot 26) + (\text{hasUpper} \cdot 26) + (\text{hasDigits} \cdot 10) + (\text{hasSymbols} \cdot 26)$$
2. **Shannon / Combinatorial Entropy ($H$)**:
   $$H = L \times \log_2(N) \quad (\text{in bits})$$
3. **Pattern Penalty Detection**:
   Passwords matching sequential patterns, repetitions, or common keyboard walks receive an entropy penalty:
   - Sequence checks: `12345`, `0123`, `qwerty`, `asdfgh`, `zxcvbn`, `password`, `admin`
   - Consecutive identical characters: `aaa`, `111`, `$$$`
   - Penalty: Deduct 25 bits from raw entropy (or $25\%$ reduction).
4. **Strength Tier Mapping**:
   | Adjusted Entropy ($H$) | Strength Level | RU Label | EN Label | Score (%) | Color Token |
   | :--- | :--- | :--- | :--- | :--- | :--- |
   | $H < 36$ bits | Danger | Опасно | Danger | $0 - 25\%$ | `#ff4c4c` (Red) |
   | $36 \le H < 50$ bits | Weak | Слабый | Weak | $26 - 45\%$ | `#ff9800` (Orange) |
   | $50 \le H < 65$ bits | Medium | Средний | Medium | $46 - 70\%$ | `#ffeb3b` (Yellow) |
   | $65 \le H < 80$ bits | Good | Надежный | Strong | $71 - 90\%$ | `#34c759` (Green) |
   | $H \ge 80$ bits | Unbreakable | Несокрушимый | Unbreakable | $91 - 100\%$ | `#00e676` (Cyan/Emerald) |

### 5.3 Crack Time Estimation
Assuming modern offline brute-force capabilities of $10^{11}$ (100 billion) hashes per second:
- Total Combinations: $C = N^L = 2^H$
- Seconds to Crack: $S = \frac{C}{10^{11}}$
- Human-Readable Translation:
  - $S < 1$ sec: `менее секунды` (`less than a second`)
  - $S < 60$ sec: `~${Math.round(S)} сек`
  - $S < 3600$ sec: `~${Math.round(S / 60)} мин`
  - $S < 86400$ sec: `~${Math.round(S / 3600)} ч`
  - $S < 31536000$ sec: `~${Math.round(S / 86400)} дн`
  - $S < 3153600000$ sec: `~${Math.round(S / 31536000)} лет`
  - $S \ge 3153600000$ sec: `тысячелетия` (`thousands of years`)

### 5.4 1-Click Clipboard Copy
- **Integration**: `expo-clipboard`
  ```typescript
  import * as Clipboard from 'expo-clipboard';
  await Clipboard.setStringAsync(generatedPassword);
  ```
- **Visual Feedback**:
  - Copy button icon transitions from Feather `copy` to Feather `check` for 1500ms.
  - Floating pill notification: "Скопировано в буфер обмена".

### 5.5 Password Analyzer Mode
An interactive diagnostic tool where users can enter any password to evaluate:
- Live entropy calculation and crack time.
- 5 Security Criteria Checklist (with Feather `check-circle` / `x-circle` icons):
  1. Длина минимум 12 символов ($L \ge 12$)
  2. Заглавные и строчные буквы ($A-Z$ and $a-z$)
  3. Цифры и спецсимволы ($0-9$ and symbols)
  4. Отсутствие простых паттернов (no trivial patterns)
  5. Энтропия от 60 бит ($H \ge 60$ bits)

---

## 6. Subsystem 4: Tools Navigation Hub (`ToolsScreen.tsx`)

### 6.1 Hub Architecture & State Management
`ToolsScreen.tsx` serves as the primary gateway with a responsive layout:
- **Navigation Modes**:
  - `hub`: Displays the 4 utility launcher cards with Feather icons, descriptions, and chevron badges.
  - `converters`: Renders `UnitConverterView` (Length, Mass, Temp).
  - `currency`: Renders `CurrencyConverterView` (10-currency exchange rates).
  - `translator`: Renders `TranslatorView` (6 languages, TTS, favorites).
  - `genpass`: Renders `GenPassView` (generator & analyzer).
- **Persistent Header Navigation**:
  - When drilled into any tool, `AppHeader` displays a back button (`leftAction` with Feather `arrow-left`), resetting mode to `hub`.
  - A horizontal top tab pill bar allows instantaneous switching between tools without navigating back to the hub.

### 6.2 Feather Vector Icon Map
Strictly adhering to the Zero Emoji constraint:
| Feature | Feather Icon Name |
| :--- | :--- |
| Unit Converters | `sliders` |
| Currency Converter | `dollar-sign` |
| Translator | `globe` |
| GenPass Generator | `key` |
| Language Swap | `repeat` |
| Text-to-Speech (TTS) | `volume-2` |
| Copy to Clipboard | `copy` |
| Copy Confirmed | `check` |
| Favorites / Save | `bookmark` |
| Delete Favorite | `trash-2` |
| Search Input | `search` |
| Close Modal | `x` |
| Refresh Rates | `refresh-cw` |
| Password Visibility | `eye` / `eye-off` |
| Criteria Passed | `check-circle` |
| Criteria Failed | `x-circle` |
| Back to Hub | `arrow-left` |

---

## 7. Complete TypeScript Interface & Schema Specifications

### 7.1 Common Tools Types (`src/modules/tools/types.ts`)
```typescript
export type ActiveToolId = 'hub' | 'converters' | 'currency' | 'translator' | 'genpass';

export interface ToolCardDefinition {
  id: ActiveToolId;
  title: string;
  subtitle: string;
  icon: 'sliders' | 'dollar-sign' | 'globe' | 'key';
}

export interface PickerOption {
  key: string;
  badge: string;
  title: string;
  subtitle?: string;
}
```

### 7.2 Converters Types (`src/modules/tools/converters/types.ts`)
```typescript
export type ConverterCategory = 'length' | 'mass' | 'temp';

export interface UnitDefinition {
  code: string;
  symbol: string;
  nameRu: string;
  nameEn: string;
  ratioToBase: number; // For length (m) and mass (kg)
}

export interface CurrencyDefinition {
  code: string;
  symbol: string;
  nameRu: string;
  nameEn: string;
  baselineRate: number; // Relative to 1 USD
}

export interface CachedCurrencyRates {
  rates: Record<string, number>;
  lastUpdated: number;
  base: 'USD';
  isOfflineFallback: boolean;
}
```

### 7.3 Translator Types (`src/modules/tools/translator/types.ts`)
```typescript
export interface LanguageOption {
  code: string;
  nameRu: string;
  nameEn: string;
  bcp47: string;
}

export interface TranslatorFavorite {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
}
```

### 7.4 GenPass Types (`src/modules/tools/genpass/types.ts`)
```typescript
export interface GenPassConfig {
  length: number;
  useUpper: boolean;
  useLower: boolean;
  useDigits: boolean;
  useSymbols: boolean;
}

export interface PasswordStrengthAnalysis {
  entropyBits: number;
  scorePercent: number; // 0 - 100
  tier: 'danger' | 'weak' | 'medium' | 'strong' | 'unbreakable';
  statusTextRu: string;
  statusTextEn: string;
  badgeColor: string;
  crackTimeRu: string;
  crackTimeEn: string;
  criteria: {
    hasMinLength: boolean;
    hasUpperAndLower: boolean;
    hasDigitsAndSymbols: boolean;
    hasNoCommonPatterns: boolean;
    hasHighEntropy: boolean;
  };
}
```

---

## 8. Verification & Acceptance Testing Protocol

To ensure 100% compliance with requirements and prevent regressions:

1. **TypeScript Compilation**:
   - Execute `npm run typecheck` (`tsc --noEmit`). Must exit with code 0.
2. **Zero Emoji Audit**:
   - Run empirical test suite `mobile-expo/tests/ui_constraints_empirical.test.ts`. Must pass with 0 emoji violations and 0 placeholder comments.
3. **Unit Math Verification**:
   - $1\text{ km} = 1000\text{ m} = 100000\text{ cm} = 1000000\text{ mm} = 0.621371\text{ mi}$.
   - $1\text{ t} = 1000\text{ kg} = 1000000\text{ g} = 2204.62\text{ lb}$.
   - $0^\circ\text{C} = 32^\circ\text{F} = 273.15\text{ K}$; $100^\circ\text{C} = 212^\circ\text{F} = 373.15\text{ K}$.
4. **Currency Offline Resilience**:
   - Ensure conversion succeeds using baseline exchange rates when network requests fail.
   - Confirm `@smartstudy_currency_rates` key updates in AsyncStorage upon successful network responses.
5. **Translator & TTS Verification**:
   - Verify all 6 languages translate correctly.
   - Verify offline phrase dictionary resolves common terms when offline.
   - Verify `Speech.speak()` triggers with valid BCP-47 codes without crash.
   - Verify favorites persist across reload under `@smartstudy_translator_favorites`.
6. **GenPass Verification**:
   - Verify generated password length strictly matches requested length (5–64).
   - Verify Shannon entropy increases with length and pool diversity.
   - Verify `expo-clipboard` copies string with visual confirmation.

---
*End of Analysis Report*
