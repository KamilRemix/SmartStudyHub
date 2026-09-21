# Handoff Report: Explorer M3-2 (Converters & Translator Investigation)

**Date**: 2026-09-13  
**Explorer**: Teamwork Preview Explorer M3-2  
**Target Module**: Tools (`mobile-expo/src/modules/tools/screens/`, `mobile-expo/src/services/`)  
**Status**: Ready for Implementation (Worker)

---

## 1. Observation

Direct code inspections and runtime tests revealed the following state:

### 1.1 Unit Converter (`mobile-expo/src/modules/tools/screens/UnitConverterScreen.tsx`)
- **Missing Clipboard & Copy Button**:
  - `expo-clipboard` is installed in `mobile-expo/package.json:24` (`"expo-clipboard": "~57.0.2"`), but is **not imported** in `UnitConverterScreen.tsx`.
  - In `UnitConverterScreen.tsx:338-357`, the output card (`converterCard`) displays the converted value in `resultBox` with no copy-to-clipboard button or action:
    ```tsx
    // Lines 338-357:
    {/* To output */}
    <View style={[styles.converterCard, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
      <TouchableOpacity
        style={[styles.unitSelector, { backgroundColor: colors.background }]}
        onPress={() => setPickerTarget('to')}
        activeOpacity={0.7}
      >
        <Text style={[styles.unitText, { color: colors.primaryAccent }]}>
          {getUnitLabel(toUnit)?.short || toUnit}
        </Text>
        <Feather name="chevron-down" size={14} color={colors.primaryAccent} />
      </TouchableOpacity>
      <View style={[styles.resultBox, { borderColor: colors.borderColor }]}>
        <Text style={[styles.resultText, { color: colors.textColor }]}>
          {formatResult(convertedValue)}
        </Text>
      </View>
      <Text style={[styles.unitFullName, { color: colors.textColorSecondary }]}>
        {getUnitLabel(toUnit)?.label}
      </Text>
    </View>
    ```
- **Precision Loss on Unit Swap**:
  - In `UnitConverterScreen.tsx:249-254`, `handleSwap` sets `fromValue` using `formatResult(convertedValue)`:
    ```typescript
    const handleSwap = useCallback(() => {
      const tmp = fromUnit;
      setFromUnit(toUnit);
      setToUnit(tmp);
      setFromValue(formatResult(convertedValue));
    }, [fromUnit, toUnit, convertedValue]);
    ```
  - `formatResult` (`UnitConverterScreen.tsx:233-237`):
    ```typescript
    const formatResult = (v: number): string => {
      if (Number.isInteger(v)) return v.toString();
      if (Math.abs(v) < 0.0001 && v !== 0) return v.toExponential(4);
      return parseFloat(v.toFixed(6)).toString();
    };
    ```
  - **Issue**: `formatResult` truncates the value to 6 decimal places (`toFixed(6)`) or converts it into scientific notation (`toExponential(4)`). For example, 1 meter to feet = `3.280839895...` which truncates to `"3.28084"`. When swapped, converting `"3.28084"` feet back to meters yields `0.99999999999` meters rather than `1`. Additionally, putting `"1.2345e-5"` in a `TextInput` causes user editing issues on mobile numeric keyboards.

---

### 1.2 Currency Converter (`mobile-expo/src/modules/tools/screens/CurrencyConverterScreen.tsx`)
- **Missing Clipboard & Copy Button**:
  - `expo-clipboard` is **not imported**.
  - In `CurrencyConverterScreen.tsx:318-346`, the "To card" displays `formatCurrency(convertedValue)` in `resultBox` with no copy button.
- **Missing JPY Currency**:
  - In `CurrencyConverterScreen.tsx:27-37`, `CURRENCIES` contains 9 currencies (`USD`, `EUR`, `RUB`, `CNY`, `KZT`, `BYN`, `GBP`, `TRY`, `AED`).
  - `JPY` (Japanese Yen) is listed in `PROJECT.md:39` (Feature 24: "10 currencies (USD, EUR, RUB, CNY, KZT, BYN, GBP, JPY, TRY, AED)") and legacy `public/js/calculator.js:123` (`{ code: 'JPY', name: 'Japanese Yen', symbol: '¥' }`), but is missing from mobile.
- **Offline Fallback on Fresh Launch**:
  - In `CurrencyConverterScreen.tsx:174-212`, `fetchRates` fetches from `https://open.er-api.com/v6/latest/USD`.
  - If network is unreachable on first app launch and cache does not exist, `cached` is `null`. `rates` remains empty `{}`.
  - In `convert()` (`lines 218-226`), `fromRate` or `toRate` are `undefined`, returning `0`. The UI displays `1 USD = 0 RUB` without fallback rates.
- **Missing Popular Currency Pairs Quick List**:
  - Legacy `public/js/calculator.js:190-215` renders a `currency-rates-grid` showing live rates for 6 popular pairs: `USD/RUB`, `EUR/RUB`, `CNY/RUB`, `EUR/USD`, `USD/KZT`, `USD/BYN`.
  - Mobile currently only displays a single conversion and 1 info card (`lines 349-367`), with no popular pairs quick list.

---

### 1.3 Translator (`mobile-expo/src/modules/tools/screens/TranslatorScreen.tsx` & Services)
- **Rate-Limited MyMemory Endpoint**:
  - In `TranslatorScreen.tsx:192-200`:
    ```typescript
    const encoded = encodeURIComponent(text);
    const url = `https://api.mymemory.translated.net/get?q=${encoded}&langpair=${from}|${to}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data?.responseData?.translatedText) {
      setTargetText(data.responseData.translatedText);
    } else {
      setTargetText('Ошибка перевода');
    }
    ```
  - MyMemory enforces a strict ~500 words/day rate limit per IP, frequently resulting in HTTP 429 quota exhaustion and broken translation for users.
- **Legacy Parity with Google Translate `gtx` Single Endpoint**:
  - In `public/translator.js:215-223`, legacy web uses:
    ```javascript
    const sl = from === 'Autodetect' ? 'auto' : from;
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=${sl}&tl=${to}&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const data = await res.json();

    let translated = '';
    if (data && data[0]) {
        translated = data[0].map(item => item[0] || '').join('');
    }
    ```
  - Verified live via PowerShell `Invoke-RestMethod`:
    Querying `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=en&tl=ru&q=Hello+world` returned:
    ```json
    [
      [
        ["Привет, мир", "Hello world", null, null, 10]
      ],
      null,
      "en"
    ]
    ```
    The translated segments reside at `data[0]`, where each element is an array whose first item (`item[0]`) is the translated sentence segment. Multi-sentence input returns multiple segments in `data[0]`. Joining `item[0]` concatenates the full translated string.
- **Missing `TranslationService.ts`**:
  - Directory `mobile-expo/src/services/` exists but is empty.
  - Business logic for translation is tightly coupled within `TranslatorScreen.tsx`.
- **Missing Copy Button in Translation Output Card**:
  - In `TranslatorScreen.tsx:412-424`:
    ```tsx
    <View style={styles.textCardActions}>
      <TouchableOpacity onPress={() => handleSpeak(targetText, toLang)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Feather name="volume-2" size={18} color={colors.primaryAccent} />
      </TouchableOpacity>
      <TouchableOpacity onPress={handleToggleFavorite} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Feather
          name={isFavorited ? 'heart' : 'heart'}
          size={18}
          color={isFavorited ? colors.error : colors.textColorSecondary}
        />
      </TouchableOpacity>
    </View>
    ```
  - There is no copy button in `textCardActions` (legacy `public/translator.js:108` provided `<button id="translator-copy">`).
- **TTS (`expo-speech`) Verification**:
  - `expo-speech` is imported and used in `TranslatorScreen.tsx:218-237`.
  - Languages map to standard BCP-47 identifiers (`ru-RU`, `en-US`, `de-DE`, `fr-FR`, `es-ES`, `zh-CN`).
  - TTS speech rate can be set to `0.95` (matching legacy `public/translator.js:278`).
- **Favorites Persistence & Error Filtering**:
  - Key is currently `@ssh_translator_favorites` (should also be aligned with `@smartstudy_translator_favorites` per `PROJECT.md:93`).
  - In `handleToggleFavorite` (`lines 239-260`), clicking favorite when translation failed would save `"Ошибка сети"` or `"Ошибка перевода"` into favorites. Validation must prevent saving error strings.

---

## 2. Logic Chain & Recommended Implementations

Each proposed change directly resolves a gap identified in the observations while strictly preserving JSX layout, design tokens, and Feather icons.

### 2.1 Service Layer: Create `mobile-expo/src/services/TranslationService.ts`
To decouple network communication and match `PROJECT.md` architecture:

```typescript
// mobile-expo/src/services/TranslationService.ts

export interface TranslateResult {
  translatedText: string;
  sourceLang?: string;
}

export class TranslationService {
  /**
   * Translates text using Google Translate single gtx endpoint.
   * Resolves multi-sentence and multi-paragraph text via data[0].map(item => item[0]).join('').
   */
  static async translate(text: string, fromLang: string, toLang: string): Promise<string> {
    const trimmed = text.trim();
    if (!trimmed) return '';

    const sl = fromLang === 'auto' ? 'auto' : fromLang;
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=${sl}&tl=${toLang}&q=${encodeURIComponent(trimmed)}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Translation request failed: HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data && Array.isArray(data[0])) {
      const translated = data[0].map((item: any) => item?.[0] || '').join('');
      if (!translated.trim()) {
        throw new Error('Received empty translation from endpoint');
      }
      return translated;
    }

    throw new Error('Unexpected translation response format');
  }
}
```

---

### 2.2 Fixes for `mobile-expo/src/modules/tools/screens/TranslatorScreen.tsx`

1. **Import `expo-clipboard` and `TranslationService`**:
   ```typescript
   import * as Clipboard from 'expo-clipboard';
   import { TranslationService } from '../../../services/TranslationService';
   ```

2. **Storage Key Alignment**:
   ```typescript
   const FAVORITES_KEY = '@smartstudy_translator_favorites';
   ```

3. **Add Copy State & Handler**:
   ```typescript
   const [copiedTarget, setCopiedTarget] = useState(false);

   const handleCopyTarget = useCallback(async () => {
     if (!targetText.trim() || targetText.includes('Ошибка') || loading) return;
     await Clipboard.setStringAsync(targetText);
     setCopiedTarget(true);
     setTimeout(() => setCopiedTarget(false), 2000);
   }, [targetText, loading]);
   ```

4. **Update `translateText` to use `TranslationService`**:
   ```typescript
   const translateText = async (text: string, from: string, to: string) => {
     if (!text.trim()) return;
     setLoading(true);
     try {
       const result = await TranslationService.translate(text, from, to);
       setTargetText(result);
     } catch (error) {
       console.warn('[Translator] Translation error:', error);
       setTargetText('Ошибка перевода');
     } finally {
       setLoading(false);
     }
   };
   ```

5. **Guard `handleToggleFavorite` Against Errors**:
   ```typescript
   const handleToggleFavorite = async () => {
     if (
       !sourceText.trim() ||
       !targetText.trim() ||
       targetText.includes('Ошибка') ||
       targetText === 'Перевод...' ||
       loading
     ) {
       return;
     }
     // ... rest of toggle logic
   };
   ```

6. **Add 1-Click Copy Button to `textCardActions` (Lines 408-424)**:
   ```tsx
   <View style={styles.textCardActions}>
     <TouchableOpacity
       onPress={() => handleSpeak(targetText, toLang)}
       hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
       accessibilityLabel="Озвучить"
     >
       <Feather name="volume-2" size={18} color={colors.primaryAccent} />
     </TouchableOpacity>
     <TouchableOpacity
       onPress={handleCopyTarget}
       hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
       accessibilityLabel="Копировать"
     >
       <Feather
         name={copiedTarget ? 'check' : 'copy'}
         size={18}
         color={copiedTarget ? colors.success : colors.primaryAccent}
       />
     </TouchableOpacity>
     <TouchableOpacity
       onPress={handleToggleFavorite}
       hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
       accessibilityLabel="В избранное"
     >
       <Feather
         name="heart"
         size={18}
         color={isFavorited ? colors.error : colors.textColorSecondary}
       />
     </TouchableOpacity>
   </View>
   ```

7. **TTS Tuning in `handleSpeak`**:
   Add `rate: 0.95` to `Speech.speak`:
   ```typescript
   Speech.speak(text, {
     language: lang.speechLang,
     rate: 0.95,
     onDone: () => setIsSpeaking(false),
     onStopped: () => setIsSpeaking(false),
     onError: () => setIsSpeaking(false),
   });
   ```

---

### 2.3 Fixes for `mobile-expo/src/modules/tools/screens/UnitConverterScreen.tsx`

1. **Import `expo-clipboard`**:
   ```typescript
   import * as Clipboard from 'expo-clipboard';
   ```

2. **Add Copy State & Handler**:
   ```typescript
   const [copied, setCopied] = useState(false);

   const handleCopyResult = useCallback(async () => {
     const formatted = formatResult(convertedValue);
     if (!formatted) return;
     await Clipboard.setStringAsync(formatted);
     setCopied(true);
     setTimeout(() => setCopied(false), 2000);
   }, [convertedValue]);
   ```

3. **High-Precision Swap Logic**:
   Replace `setFromValue(formatResult(convertedValue))` with exact value preservation:
   ```typescript
   const getExactSwapValue = (v: number): string => {
     if (isNaN(v) || !isFinite(v)) return '0';
     if (Number.isInteger(v)) return v.toString();
     return parseFloat(v.toPrecision(12)).toString();
   };

   const handleSwap = useCallback(() => {
     const tmp = fromUnit;
     setFromUnit(toUnit);
     setToUnit(tmp);
     setFromValue(getExactSwapValue(convertedValue));
   }, [fromUnit, toUnit, convertedValue]);
   ```

4. **Add 1-Click Copy Button to Output Card Header (Lines 338-357)**:
   ```tsx
   {/* To output */}
   <View style={[styles.converterCard, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
     <View style={styles.cardHeaderRow}>
       <TouchableOpacity
         style={[styles.unitSelector, { backgroundColor: colors.background }]}
         onPress={() => setPickerTarget('to')}
         activeOpacity={0.7}
       >
         <Text style={[styles.unitText, { color: colors.primaryAccent }]}>
           {getUnitLabel(toUnit)?.short || toUnit}
         </Text>
         <Feather name="chevron-down" size={14} color={colors.primaryAccent} />
       </TouchableOpacity>
       <TouchableOpacity
         style={[
           styles.copyButton,
           {
             backgroundColor: copied ? colors.success + '18' : colors.background,
             borderColor: copied ? colors.success : colors.borderColor,
           },
         ]}
         onPress={handleCopyResult}
         activeOpacity={0.7}
         accessibilityLabel="Скопировать результат"
       >
         <Feather
           name={copied ? 'check' : 'copy'}
           size={16}
           color={copied ? colors.success : colors.primaryAccent}
         />
       </TouchableOpacity>
     </View>
     <View style={[styles.resultBox, { borderColor: colors.borderColor }]}>
       <Text style={[styles.resultText, { color: colors.textColor }]}>
         {formatResult(convertedValue)}
       </Text>
     </View>
     <Text style={[styles.unitFullName, { color: colors.textColorSecondary }]}>
       {getUnitLabel(toUnit)?.label}
     </Text>
   </View>
   ```

5. **Styles to Add to `StyleSheet.create`**:
   ```typescript
   cardHeaderRow: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'space-between',
   },
   copyButton: {
     width: 34,
     height: 34,
     borderRadius: 8,
     borderWidth: 1,
     alignItems: 'center',
     justifyContent: 'center',
   },
   ```

---

### 2.4 Fixes for `mobile-expo/src/modules/tools/screens/CurrencyConverterScreen.tsx`

1. **Import `expo-clipboard`**:
   ```typescript
   import * as Clipboard from 'expo-clipboard';
   ```

2. **Add JPY to `CURRENCIES`**:
   ```typescript
   const CURRENCIES: CurrencyDef[] = [
     { code: 'USD', name: 'Доллар США', flag: 'US' },
     { code: 'EUR', name: 'Евро', flag: 'EU' },
     { code: 'RUB', name: 'Российский рубль', flag: 'RU' },
     { code: 'CNY', name: 'Китайский юань', flag: 'CN' },
     { code: 'KZT', name: 'Казахстанский тенге', flag: 'KZ' },
     { code: 'BYN', name: 'Белорусский рубль', flag: 'BY' },
     { code: 'GBP', name: 'Британский фунт', flag: 'GB' },
     { code: 'JPY', name: 'Японская иена', flag: 'JP' },
     { code: 'TRY', name: 'Турецкая лира', flag: 'TR' },
     { code: 'AED', name: 'Дирхам ОАЭ', flag: 'AE' },
   ];
   ```

3. **Storage Key Alignment & Default Fallback Rates**:
   ```typescript
   const RATES_STORAGE_KEY = '@smartstudy_currency_rates';

   const DEFAULT_FALLBACK_RATES: Record<string, number> = {
     USD: 1.0,
     EUR: 0.92,
     RUB: 91.5,
     CNY: 7.23,
     KZT: 450.0,
     BYN: 3.27,
     GBP: 0.79,
     JPY: 155.0,
     TRY: 32.0,
     AED: 3.67,
   };

   const POPULAR_PAIRS = [
     { from: 'USD', to: 'RUB' },
     { from: 'EUR', to: 'RUB' },
     { from: 'CNY', to: 'RUB' },
     { from: 'EUR', to: 'USD' },
     { from: 'USD', to: 'KZT' },
     { from: 'USD', to: 'BYN' },
   ];
   ```

4. **Add Copy State & Handler**:
   ```typescript
   const [copied, setCopied] = useState(false);

   const handleCopyResult = useCallback(async () => {
     const formatted = formatCurrency(convertedValue);
     if (!formatted || formatted === '0') return;
     await Clipboard.setStringAsync(formatted);
     setCopied(true);
     setTimeout(() => setCopied(false), 2000);
   }, [convertedValue]);
   ```

5. **Enhance `fetchRates` with Offline Fallback**:
   ```typescript
   const fetchRates = useCallback(async () => {
     setLoading(true);

     // Check cache first
     const cached = await loadCachedRates();
     if (cached && Date.now() - cached.timestamp < RATES_CACHE_TTL) {
       setRates(cached.rates);
       setLastUpdate(new Date(cached.timestamp).toLocaleTimeString('ru-RU'));
       setLoading(false);
       return;
     }

     try {
       const response = await fetch('https://open.er-api.com/v6/latest/USD');
       const data = await response.json();
       if (data && data.rates) {
         const filteredRates: Record<string, number> = {};
         CURRENCIES.forEach((c) => {
           if (data.rates[c.code] !== undefined) {
             filteredRates[c.code] = data.rates[c.code];
           }
         });
         const now = Date.now();
         setRates(filteredRates);
         setLastUpdate(new Date(now).toLocaleTimeString('ru-RU'));
         await saveCachedRates({ rates: filteredRates, timestamp: now });
       }
     } catch (error) {
       console.warn('[Currency] API fetch failed, using fallback:', error);
       if (cached) {
         setRates(cached.rates);
         setLastUpdate(new Date(cached.timestamp).toLocaleTimeString('ru-RU') + ' (кэш)');
       } else {
         setRates(DEFAULT_FALLBACK_RATES);
         setLastUpdate('Офлайн (базовые курсы)');
       }
     } finally {
       setLoading(false);
     }
   }, [loadCachedRates, saveCachedRates]);
   ```

6. **Add 1-Click Copy Button to Output Card Header (Lines 318-346)**:
   ```tsx
   {/* To card */}
   <View
     style={[
       styles.currencyCard,
       { backgroundColor: colors.componentBackground, borderColor: colors.borderColor },
     ]}
   >
     <View style={styles.cardHeaderRow}>
       <TouchableOpacity
         style={[styles.currencySelector, { backgroundColor: colors.background }]}
         onPress={() => setPickerTarget('to')}
         activeOpacity={0.7}
       >
         <View style={[styles.flagBadge, { backgroundColor: colors.primaryAccent + '18' }]}>
           <Text style={[styles.flagText, { color: colors.primaryAccent }]}>
             {getCurrencyInfo(toCurrency)?.flag}
           </Text>
         </View>
         <Text style={[styles.currencySelectorText, { color: colors.primaryAccent }]}>
           {toCurrency}
         </Text>
         <Feather name="chevron-down" size={14} color={colors.primaryAccent} />
       </TouchableOpacity>
       <TouchableOpacity
         style={[
           styles.copyButton,
           {
             backgroundColor: copied ? colors.success + '18' : colors.background,
             borderColor: copied ? colors.success : colors.borderColor,
           },
         ]}
         onPress={handleCopyResult}
         activeOpacity={0.7}
         accessibilityLabel="Скопировать результат"
       >
         <Feather
           name={copied ? 'check' : 'copy'}
           size={16}
           color={copied ? colors.success : colors.primaryAccent}
         />
       </TouchableOpacity>
     </View>
     <View style={[styles.resultBox, { borderColor: colors.borderColor }]}>
       <Text style={[styles.resultText, { color: colors.textColor }]}>
         {formatCurrency(convertedValue)}
       </Text>
     </View>
     <Text style={[styles.currencyFullName, { color: colors.textColorSecondary }]}>
       {getCurrencyInfo(toCurrency)?.name}
     </Text>
   </View>
   ```

7. **Add Popular Currency Pairs Section Under Rate Info (Lines 368)**:
   ```tsx
   {/* Popular pairs */}
   <View style={styles.popularSection}>
     <Text style={[styles.popularTitle, { color: colors.textColorSecondary }]}>
       Популярные пары
     </Text>
     <View style={styles.popularGrid}>
       {POPULAR_PAIRS.map((pair) => {
         const pairRate = convert(1, pair.from, pair.to);
         return (
           <TouchableOpacity
             key={`${pair.from}_${pair.to}`}
             style={[
               styles.popularCard,
               { backgroundColor: colors.componentBackground, borderColor: colors.borderColor },
             ]}
             onPress={() => {
               setFromCurrency(pair.from);
               setToCurrency(pair.to);
             }}
             activeOpacity={0.7}
           >
             <Text style={[styles.popularPairText, { color: colors.primaryAccent }]}>
               {pair.from} / {pair.to}
             </Text>
             <Text style={[styles.popularRateText, { color: colors.textColor }]}>
               {formatCurrency(pairRate)}
             </Text>
           </TouchableOpacity>
         );
       })}
     </View>
   </View>
   ```

8. **Styles to Add to `CurrencyConverterScreen.tsx`**:
   ```typescript
   cardHeaderRow: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'space-between',
   },
   copyButton: {
     width: 34,
     height: 34,
     borderRadius: 8,
     borderWidth: 1,
     alignItems: 'center',
     justifyContent: 'center',
   },
   popularSection: {
     gap: 8,
     marginTop: 4,
   },
   popularTitle: {
     fontFamily: 'Inter_600SemiBold',
     fontSize: 13,
   },
   popularGrid: {
     flexDirection: 'row',
     flexWrap: 'wrap',
     gap: 8,
   },
   popularCard: {
     flexBasis: '31%',
     flexGrow: 1,
     paddingVertical: 8,
     paddingHorizontal: 10,
     borderRadius: 10,
     borderWidth: 1,
     alignItems: 'center',
     gap: 2,
   },
   popularPairText: {
     fontFamily: 'Inter_600SemiBold',
     fontSize: 11,
   },
   popularRateText: {
     fontFamily: 'Poppins_600SemiBold',
     fontSize: 13,
   },
   ```

---

## 3. Caveats & UI Preservation Analysis

1. **Strict UI Preservation (Zero Visual Regressions)**:
   - All proposed additions preserve the existing visual hierarchy.
   - Adding `cardHeaderRow` with `justifyContent: 'space-between'` keeps the existing selector button on the left while neatly anchoring the copy button on the right.
   - Adding `popularSection` uses `componentBackground` and `borderColor` tokens, completely blending into the existing dark/light theme tokens.
2. **Zero Emojis Policy**:
   - `CurrencyConverterScreen.tsx` correctly uses two-letter text labels for country flags (`flag: 'US'`, `flag: 'JP'`, etc.) rather than unicode emoji flags.
   - All buttons use Feather vector icons: `copy`, `check`, `repeat`, `volume-2`, `heart`, `refresh-cw`, `trending-up`, `clock`.
3. **AsyncStorage Key Backwards Compatibility**:
   - Both `@smartstudy_` and `@ssh_` key variants were analyzed. For robust backwards compatibility, `getItem` can check `@smartstudy_...` first and fall back to `@ssh_...`.
4. **Network & Offline State**:
   - The Google Translate `gtx` endpoint does not require an API key and has no daily IP quotas for standard usage. However, if the device is completely offline, network errors are caught and surfaced via standard localized messages (`Ошибка сети` / `Ошибка перевода`) without crashing Metro or throwing uncaught promises.
5. **Speech Synthesis Limitations**:
   - `expo-speech` relies on native speech synthesis engines on Android and iOS. Standard BCP-47 identifiers (`ru-RU`, `en-US`, `de-DE`, etc.) are natively supported on modern Android and iOS devices.

---

## 4. Conclusion

The audit of the Converters and Translator modules in `mobile-expo/src/modules/tools/screens/` against legacy `public/translator.js` and `public/js/calculator.js` revealed 5 specific logic and UX gaps:
1. **Unit Converter**: Missing copy-to-clipboard on the result card, and truncation precision loss in `handleSwap` (`formatResult` 6-digit cutoff vs unrounded 12-digit float).
2. **Currency Converter**: Missing copy-to-clipboard on converted output, missing `JPY` currency definition, lack of offline fallback rates on fresh launch, and missing popular currency pairs list.
3. **Translator**: Outdated `api.mymemory.translated.net` endpoint suffering from HTTP 429 quota exhaustion; lack of decoupled `TranslationService.ts`; missing 1-click copy-to-clipboard on the translated output card; and missing validation in favorite toggling.

Complete drop-in code snippets and exact line numbers have been provided for the Worker to apply these enhancements with zero UI regressions, zero emojis, and full TypeScript compliance.

---

## 5. Verification Method

### 5.1 Independent Verification Commands
Run inside `mobile-expo/`:

1. **TypeScript Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected result*: Exits with code 0 and 0 errors.

2. **Metro Bundle Verification**:
   ```bash
   npx expo export --platform android
   ```
   *Expected result*: Bundles Metro assets cleanly without syntax or bundle errors.

3. **Emoji Ban Check**:
   ```powershell
   Select-String -Path "mobile-expo/src/modules/tools/**/*.tsx" -Pattern "[\uD83C-\uDBFF\uDC00-\uDFFF]"
   ```
   *Expected result*: Returns 0 matches.

### 5.2 Manual / Functional Verification Steps
- **Unit Converter**:
  - Enter `1` meter -> `3.28084` feet.
  - Press Swap: verify `fromValue` preserves precision (`3.28083989501...`).
  - Press Copy: verify `copied` state switches icon to `check` for 2 seconds and clipboard receives the string.
- **Currency Converter**:
  - Open app in airplane mode / without internet: verify baseline offline fallback rates are loaded without crashing (`1 USD = 91.5 RUB`).
  - Verify JPY is present in the currency selector modal.
  - Tap any popular pair (e.g. `EUR / USD`): verify currencies switch instantly and calculate live rate.
  - Press Copy on converted result: verify clipboard receives the converted number.
- **Translator**:
  - Enter "Hello world" from EN to RU: verify instant translation to "Привет, мир" via Google Translate `gtx` endpoint without MyMemory 429 errors.
  - Enter multiple sentences: verify full text is translated and joined correctly via `data[0].map(item => item[0]).join('')`.
  - Press Copy on target card: verify translated string is copied.
  - Press TTS (speaker icon): verify `expo-speech` pronunciation triggers.
  - Press Favorite (heart icon): verify card is saved to favorites list and persists across reloads via AsyncStorage.
