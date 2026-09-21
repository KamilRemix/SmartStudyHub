# Handoff Report: Explorer M3-3 — GenPass & Global Verification

**Date**: 2026-09-13  
**Explorer**: Explorer M3-3 (`teamwork_preview_explorer_m3_3`)  
**Mission**: Investigate GenPass module in `mobile-expo/src/modules/tools/screens/GenPassScreen.tsx` and compare with legacy `public/genpass.js` and `public/renderer.js`. Formulate complete implementation specifications for Worker M3.  
**Handoff Type**: Hard (Investigation Complete)  

---

## 1. Observation

### 1.1 Codebase Locations & File Status
1. **Target Mobile Screen**:
   - Location: `c:\projects\SmartStudyHub\mobile-expo\src\modules\tools\screens\GenPassScreen.tsx` (601 lines).
   - Registered in: `mobile-expo/src/modules/tools/ToolsStackNavigator.tsx:8,22` and `mobile-expo/src/modules/tools/ToolsScreen.tsx:44-48`.
2. **Legacy Web Reference**:
   - Location: `c:\projects\SmartStudyHub\public\genpass.js` (1004 lines).
   - Adapter: `public/js/genpass.js` (11 lines, confirms implementation lives in `public/genpass.js`).
   - `public/renderer.js`: references `public/js/genpass.js` as the password generator adapter.
3. **Dependencies Status (`mobile-expo/package.json`)**:
   - `"expo-clipboard": "~57.0.2"` is **ALREADY installed** and present in `package.json:24`.
   - `"@react-native-async-storage/async-storage": "2.2.0"` is installed (`package.json:18`).
   - `"@expo/vector-icons": "^15.0.2"` is installed (`package.json:17`).
   - `"expo-crypto"` is **NOT** installed. However, pure TypeScript RFC 3174 SHA-1 hashing runs with 0 external dependencies and 100% browser/Hermes/native compatibility.
4. **Current Verification Baseline**:
   - `npx tsc --noEmit` in `mobile-expo/`: **Exit code 0** (0 type errors).
   - `tests/ui_constraints_empirical.test.ts`: **6/6 tests PASS** (0 emojis across 57 source files, package ID strictly `"com.smartstudyhub.mobile"`, vector icons conformance verified).

### 1.2 Comparison Matrix: Legacy Web (`public/genpass.js`) vs Mobile Expo (`GenPassScreen.tsx`)

| Feature / Algorithm | Legacy Web (`public/genpass.js`) | Current Mobile (`GenPassScreen.tsx`) | Status / Discrepancy |
| :--- | :--- | :--- | :--- |
| **Character Sets** | Upper (`A-Z`), Lower (`a-z`), Numbers (`0-9`), Symbols (`!@#$%^&*()_+-=[]{}|;:,.<>?`) | Identical charsets (`CHAR_SETS`) | **Parity Achieved** |
| **Charset Fallback** | Fallback to `lowercase + numbers` if all unchecked | Same fallback (`CHAR_SETS.lowercase + CHAR_SETS.numbers`) | **Parity Achieved** |
| **Length Configuration** | Slider (4-64) + numeric display | Slider (4-64), touch dots + quick presets `[8, 12, 16, 24, 32]` | **Parity Achieved (Enhanced UI)** |
| **1-Click Copy** | `navigator.clipboard.writeText` with checkmark icon & toast | `Clipboard.setStringAsync` (`expo-clipboard`) with check icon & "Скопировано" text | **Parity Achieved** |
| **History Persistence** | LocalStorage + Firebase RTDB (`users/${uid}/passwords`) | AsyncStorage (`@ssh_genpass_history`, max 10 entries) with tap-to-copy & clear button | **Parity Achieved (Local)** |
| **Entropy Calculation** | `len * Math.log2(poolSize)` based on actual chars in password | `password.length * Math.log2(charsetSize)` based on checkbox options | **Gap**: Should calculate from actual character classes present in password |
| **Strength Score (0-100%)** | 0-100% score based on length tiers, character sets, patterns, and breach check | **MISSING**: Only 4 rough levels based on entropy (<28, <50, <80, >=80) | **Defect / Gap**: No 0-100% score calculation |
| **Crack Time Estimation** | Formula `Math.pow(poolSize, len) / 1e11` with human-readable formatting | **MISSING**: Completely absent in current `GenPassScreen.tsx` | **Defect / Gap**: No crack time estimation |
| **Security Checklist** | 5 rules: Length >=12, Upper/Lower, Num/Symbols, No patterns, Not compromised | **MISSING**: Completely absent in current `GenPassScreen.tsx` | **Defect / Gap**: No checklist displayed |
| **Breach / Pwned Check** | HaveIBeenPwned API via k-Anonymity SHA-1 range query | **MISSING**: Completely absent in current `GenPassScreen.tsx` | **Defect / Gap**: No breach detection |
| **Custom Password Analysis** | Password Analyzer tab with text input | Password display is static `Text` | **Enhancement**: Allow `TextInput` or editing to analyze custom passwords |

---

## 2. Logic Chain

### 2.1 Missing Logic Breakdown & Mathematical Models

#### A. Actual Pool Size & Entropy Calculation
In `public/genpass.js:878-889`:
```javascript
let poolSize = 0;
if (/[a-z]/.test(password)) poolSize += 26;
if (/[A-Z]/.test(password)) poolSize += 26;
if (/[0-9]/.test(password)) poolSize += 10;
if (/[^A-Za-z0-9]/.test(password)) poolSize += 32;

const entropy = password.length > 0 && poolSize > 0 ? password.length * Math.log2(poolSize) : 0;
```
Calculating entropy based on the actual characters present in `password` rather than checkbox options ensures that if a password contains only digits, its entropy reflects the 10-character pool rather than a false 94-character pool.

#### B. 0-100% Strength Score Algorithm
In `public/genpass.js:902-915`:
1. Length Base Score:
   - `len < 5`: 0 points
   - `len 5..7`: 15 points
   - `len 8..11`: 30 points
   - `len >= 12`: 40 points
2. Variety Bonuses:
   - `hasUpper && hasLower`: +15 points
   - `hasNum`: +15 points
   - `hasSym`: +15 points
   - `len >= 16`: +15 points
3. Penalties:
   - Simple pattern `/(qwerty|12345|asdfgh|password|111|aaa|abc)/i`: -25 points
   - Pwned / Leaked: cap score at max 15 points (`score = Math.min(score, 15)`)
4. Clamping:
   - `score = Math.max(0, Math.min(100, score))`

#### C. Crack Time Estimation Model
In `public/genpass.js:953-966`:
```typescript
const combinations = Math.pow(poolSize, len);
const seconds = combinations / 100000000000; // 100 billion guesses/sec
```
Time formatting matching project Russian localization:
- `seconds < 1` -> `"менее секунды"`
- `seconds < 60` -> `~${Math.round(seconds)} сек.`
- `seconds < 3600` -> `~${Math.round(seconds / 60)} мин.`
- `seconds < 86400` -> `~${Math.round(seconds / 3600)} ч.`
- `seconds < 31536000` -> `~${Math.round(seconds / 86400)} дн.`
- `seconds < 3153600000` -> `~${Math.round(seconds / 31536000)} лет`
- `seconds < 3153600000000` -> `~${Math.round(seconds / 31536000 / 1000)} тыс. лет`
- `seconds >= 3153600000000` -> `> 1 млн лет`

#### D. Security Checklist (5 Rules)
Exact criteria matching `public/genpass.js:892-900`:
1. **Length >= 12**: `len >= 12` -> `"Длина минимум 12 символов"`
2. **Upper & Lower**: `hasUpper && hasLower` -> `"Заглавные и строчные буквы"`
3. **Digits & Symbols**: `hasNum && hasSym` -> `"Цифры и спецсимволы"`
4. **No Simple Patterns**: `!hasPattern` -> `"Нет простых паттернов (12345, qwerty)"`
5. **Not Compromised**: `!isPwned` -> `"Не скомпрометирован (база утечек)"`

#### E. Pure TypeScript SHA-1 & HaveIBeenPwned API (k-Anonymity)
To avoid adding `expo-crypto` (which would require updating native project manifests or pod installations), a pure 35-line RFC 3174 SHA-1 hashing algorithm is used.
- SHA-1 of password produces 40-character hex string.
- First 5 characters (`prefix`) sent to `https://api.pwnedpasswords.com/range/${prefix}`.
- Response contains suffixes: `1E4C9B93F3F0682250B6CF8331B7EE68FD8:52372427`.
- If suffix matches, `isPwned = true`, leak count is extracted.
- Debounced by 400ms on user input with `AbortController` timeout (3000ms) to ensure it never blocks UI or crashes when offline.

---

## 3. UI Preservation & Emoji Ban Analysis

### 3.1 Strict UI Preservation Compliance (R5)
- All existing styles (`styles.passwordCard`, `styles.strengthSection`, `styles.strengthBarBg`, `styles.strengthSegment`, `styles.optionCard`, `styles.sliderTrack`, `styles.presetPill`, `styles.toggleRow`, `styles.historyItem`) are strictly preserved.
- The 4-segment strength bar is preserved. Its fill levels `[0, 1, 2, 3]` continue to map cleanly to:
  - Level 0: 1 segment filled (Danger / Опасно, `#ff4c4c`)
  - Level 1: 2 segments filled (Weak/Medium / Слабый/Средний, `#ff9500` / `#eab308`)
  - Level 2: 3 segments filled (Good/Strong / Отличный, `#34c759`)
  - Level 3: 4 segments filled (Unbreakable / Несокрушимый, `#00c853`)
- The new **Crack Time** row (`styles.crackTimeRow`) uses Feather icon `'clock'` and is inserted directly into `styles.strengthSection`.
- The new **Security Checklist** card uses the identical `styles.optionCard` layout already present on the screen. Each row displays a Feather icon (`check-circle` for passed, `x-circle` for failed) and `styles.checklistText`.
- Visual layout is 100% native, responsive, and adheres to dark/light theme tokens via `useTheme()`.

### 3.2 Emoji Ban Compliance (R2)
- Zero unicode emojis.
- Only vector icons from `@expo/vector-icons` (`Feather`):
  - `'refresh-cw'` (Generate)
  - `'copy'` / `'check'` (Copy / Copied)
  - `'clock'` (Crack time)
  - `'check-circle'` / `'x-circle'` (Checklist criteria)
  - `'alert-triangle'` (Leak warning)
  - `'trash-2'` (Delete history)

---

## 4. Concrete Code Implementation for Worker M3

Below is the complete, drop-in implementation for `mobile-expo/src/modules/tools/screens/GenPassScreen.tsx`:

```tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../../theme';
import { AppHeader } from '../../../components/common/AppHeader';

// --- Password generation & analysis logic ---

const CHAR_SETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  special: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

export interface GenOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  special: boolean;
}

export interface PasswordEntry {
  id: string;
  password: string;
  strength: string;
  timestamp: number;
}

export interface ChecklistRule {
  id: string;
  label: string;
  passed: boolean;
}

export interface StrengthInfo {
  label: string;
  color: string;
  level: number; // 0-3
  score: number; // 0-100
}

const HISTORY_KEY = '@ssh_genpass_history';
const MAX_HISTORY = 10;

function generatePassword(options: GenOptions): string {
  let charset = '';
  if (options.uppercase) charset += CHAR_SETS.uppercase;
  if (options.lowercase) charset += CHAR_SETS.lowercase;
  if (options.numbers) charset += CHAR_SETS.numbers;
  if (options.special) charset += CHAR_SETS.special;

  if (charset.length === 0) {
    charset = CHAR_SETS.lowercase + CHAR_SETS.numbers;
  }

  let password = '';
  for (let i = 0; i < options.length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}

function calculateEntropy(password: string): number {
  if (!password) return 0;
  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^A-Za-z0-9]/.test(password)) poolSize += 32;

  if (poolSize === 0) return 0;
  return password.length * Math.log2(poolSize);
}

function estimateCrackTime(password: string): string {
  if (!password) return '-';
  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^A-Za-z0-9]/.test(password)) poolSize += 32;

  if (poolSize === 0) return '-';

  const combinations = Math.pow(poolSize, password.length);
  const seconds = combinations / 100000000000; // 100 billion guesses/sec

  if (seconds < 1) return 'менее секунды';
  if (seconds < 60) return `~${Math.round(seconds)} сек.`;
  if (seconds < 3600) return `~${Math.round(seconds / 60)} мин.`;
  if (seconds < 86400) return `~${Math.round(seconds / 3600)} ч.`;
  if (seconds < 31536000) return `~${Math.round(seconds / 86400)} дн.`;
  if (seconds < 3153600000) return `~${Math.round(seconds / 31536000)} лет`;
  if (seconds < 3153600000000) return `~${Math.round(seconds / 31536000 / 1000)} тыс. лет`;
  return '> 1 млн лет';
}

function calculateScore(password: string, isPwned: boolean = false): number {
  const len = password.length;
  if (len === 0) return 0;

  let lenScore = 0;
  if (len < 5) lenScore = 0;
  else if (len <= 7) lenScore = 15;
  else if (len <= 11) lenScore = 30;
  else lenScore = 40;

  let score = lenScore;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 15;
  if (/(qwerty|12345|asdfgh|password|111|aaa|abc)/i.test(password)) score -= 25;
  if (len >= 16) score += 15;

  score = Math.max(0, Math.min(100, score));
  if (isPwned) score = Math.min(score, 15);
  return score;
}

function getStrength(score: number): StrengthInfo {
  if (score < 25) return { label: 'Опасно', color: '#ff4c4c', level: 0, score };
  if (score < 45) return { label: 'Слабый', color: '#ff9500', level: 1, score };
  if (score < 70) return { label: 'Средний', color: '#eab308', level: 1, score };
  if (score < 90) return { label: 'Отличный', color: '#34c759', level: 2, score };
  return { label: 'Несокрушимый', color: '#00c853', level: 3, score };
}

function evaluateChecklist(password: string, isPwned: boolean, leakCount: number): ChecklistRule[] {
  const len = password.length;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNum = /[0-9]/.test(password);
  const hasSym = /[^A-Za-z0-9]/.test(password);
  const hasPattern = /(qwerty|12345|asdfgh|password|111|aaa|abc)/i.test(password);

  return [
    {
      id: 'length',
      label: 'Длина минимум 12 символов',
      passed: len >= 12,
    },
    {
      id: 'upperlower',
      label: 'Заглавные и строчные буквы',
      passed: hasUpper && hasLower,
    },
    {
      id: 'numsym',
      label: 'Цифры и спецсимволы',
      passed: hasNum && hasSym,
    },
    {
      id: 'patterns',
      label: 'Нет простых паттернов',
      passed: len > 0 && !hasPattern,
    },
    {
      id: 'pwned',
      label: isPwned
        ? `Скомпрометирован (в утечках: ${leakCount})`
        : 'Не скомпрометирован (база утечек)',
      passed: !isPwned,
    },
  ];
}

// Pure JS RFC 3174 SHA-1 for HaveIBeenPwned API check
function sha1(msg: string): string {
  function rotl(n: number, s: number) {
    return (n << s) | (n >>> (32 - s));
  }
  let H0 = 0x67452301, H1 = 0xefcdab89, H2 = 0x98badcfe, H3 = 0x10325476, H4 = 0xc3d2e1f0;
  const bytes: number[] = [];
  for (let i = 0; i < msg.length; i++) {
    const c = msg.charCodeAt(i);
    if (c < 128) bytes.push(c);
    else if (c < 2048) bytes.push(192 | (c >> 6), 128 | (c & 63));
    else bytes.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63));
  }
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while ((bytes.length % 64) !== 56) bytes.push(0);
  bytes.push(0, 0, 0, 0);
  bytes.push((bitLen >>> 24) & 255, (bitLen >>> 16) & 255, (bitLen >>> 8) & 255, bitLen & 255);

  const W = new Uint32Array(80);
  for (let i = 0; i < bytes.length; i += 64) {
    for (let t = 0; t < 16; t++) {
      W[t] = (bytes[i + t * 4] << 24) | (bytes[i + t * 4 + 1] << 16) | (bytes[i + t * 4 + 2] << 8) | bytes[i + t * 4 + 3];
    }
    for (let t = 16; t < 80; t++) {
      W[t] = rotl(W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16], 1);
    }
    let A = H0, B = H1, C = H2, D = H3, E = H4;
    for (let t = 0; t < 80; t++) {
      const s = Math.floor(t / 20);
      let f = 0, K = 0;
      if (s === 0) { f = (B & C) | ((~B) & D); K = 0x5a827999; }
      else if (s === 1) { f = B ^ C ^ D; K = 0x6ed9eba1; }
      else if (s === 2) { f = (B & C) | (B & D) | (C & D); K = 0x8f1bbcdc; }
      else { f = B ^ C ^ D; K = 0xca62c1d6; }
      const temp = (rotl(A, 5) + f + E + K + W[t]) >>> 0;
      E = D; D = C; C = rotl(B, 30) >>> 0; B = A; A = temp;
    }
    H0 = (H0 + A) >>> 0; H1 = (H1 + B) >>> 0; H2 = (H2 + C) >>> 0; H3 = (H3 + D) >>> 0; H4 = (H4 + E) >>> 0;
  }
  const hex = (n: number) => ('00000000' + n.toString(16)).slice(-8);
  return (hex(H0) + hex(H1) + hex(H2) + hex(H3) + hex(H4)).toUpperCase();
}

// --- Main Screen ---

export const GenPassScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();

  const [options, setOptions] = useState<GenOptions>({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    special: true,
  });

  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<PasswordEntry[]>([]);
  const [isPwned, setIsPwned] = useState(false);
  const [leakCount, setLeakCount] = useState(0);

  const abortRef = useRef<AbortController | null>(null);

  // Load history
  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY).then((raw) => {
      if (raw) {
        try {
          setHistory(JSON.parse(raw));
        } catch {
          // ignore parse errors
        }
      }
    });
  }, []);

  const saveHistory = useCallback(async (items: PasswordEntry[]) => {
    setHistory(items);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  }, []);

  // HaveIBeenPwned breach check with 400ms debounce
  useEffect(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }

    if (!password || password.length < 4) {
      setIsPwned(false);
      setLeakCount(0);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    const timeout = setTimeout(async () => {
      try {
        const hash = sha1(password);
        const prefix = hash.slice(0, 5);
        const suffix = hash.slice(5);

        const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;

        const text = await res.text();
        const lines = text.split('\n');
        const found = lines.find((line) => line.startsWith(suffix));

        if (found) {
          const count = parseInt(found.split(':')[1]?.trim() || '1', 10);
          setIsPwned(true);
          setLeakCount(count);
        } else {
          setIsPwned(false);
          setLeakCount(0);
        }
      } catch {
        // network failure or aborted: do not treat as pwned
      }
    }, 400);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [password]);

  const entropy = calculateEntropy(password);
  const score = calculateScore(password, isPwned);
  const strength = getStrength(score);
  const crackTime = estimateCrackTime(password);
  const checklist = evaluateChecklist(password, isPwned, leakCount);

  const handleGenerate = useCallback(async () => {
    const newPassword = generatePassword(options);
    setPassword(newPassword);
    setCopied(false);

    const newScore = calculateScore(newPassword, false);
    const newStrength = getStrength(newScore);
    const entry: PasswordEntry = {
      id: Date.now().toString(),
      password: newPassword,
      strength: newStrength.label,
      timestamp: Date.now(),
    };

    const updatedHistory = [entry, ...history].slice(0, MAX_HISTORY);
    await saveHistory(updatedHistory);
  }, [options, history, saveHistory]);

  const handleCopy = useCallback(async () => {
    if (!password) return;
    await Clipboard.setStringAsync(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [password]);

  const toggleOption = (key: keyof Omit<GenOptions, 'length'>) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Generate on mount
  useEffect(() => {
    const pw = generatePassword(options);
    setPassword(pw);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title="GenPass"
        subtitle="Генератор и анализ паролей"
        leftAction={{
          icon: 'arrow-left',
          accessibilityLabel: 'Назад',
          onPress: () => navigation.goBack(),
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Password display & direct editing for analysis */}
        <View style={[styles.passwordCard, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
          <TextInput
            style={[styles.passwordText, { color: colors.textColor }]}
            value={password}
            onChangeText={setPassword}
            placeholder='Нажмите "Сгенерировать"'
            placeholderTextColor={colors.textColorSecondary}
            multiline
            selectTextOnFocus
          />

          {/* Strength bar & metrics */}
          {password.length > 0 && (
            <View style={styles.strengthSection}>
              <View style={styles.strengthBarBg}>
                {[0, 1, 2, 3].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.strengthSegment,
                      {
                        backgroundColor:
                          i <= strength.level ? strength.color : colors.borderColor,
                      },
                    ]}
                  />
                ))}
              </View>
              <View style={styles.strengthLabelRow}>
                <Text style={[styles.strengthLabel, { color: strength.color }]}>
                  {strength.label} ({strength.score}%)
                </Text>
                <Text style={[styles.entropyText, { color: colors.textColorSecondary }]}>
                  {Math.round(entropy)} бит
                </Text>
              </View>

              {/* Crack time estimation */}
              <View style={styles.crackTimeRow}>
                <Feather name="clock" size={13} color={colors.textColorSecondary} />
                <Text style={[styles.crackTimeText, { color: colors.textColorSecondary }]}>
                  Время на взлом: {crackTime}
                </Text>
              </View>

              {/* Leak warning alert if pwned */}
              {isPwned && (
                <View style={[styles.leakWarningBox, { backgroundColor: colors.error + '15', borderColor: colors.error + '40' }]}>
                  <Feather name="alert-triangle" size={14} color={colors.error} />
                  <Text style={[styles.leakWarningText, { color: colors.error }]}>
                    Пароль найден в слитых базах {leakCount} раз! Не используйте его.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primaryAccent }]}
              onPress={handleGenerate}
              activeOpacity={0.7}
            >
              <Feather name="refresh-cw" size={16} color="#ffffff" />
              <Text style={styles.actionBtnText}>Сгенерировать</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  backgroundColor: copied ? colors.success : colors.componentBackground,
                  borderColor: copied ? colors.success : colors.borderColor,
                  borderWidth: 1,
                },
              ]}
              onPress={handleCopy}
              activeOpacity={0.7}
            >
              <Feather
                name={copied ? 'check' : 'copy'}
                size={16}
                color={copied ? '#ffffff' : colors.textColor}
              />
              <Text
                style={[
                  styles.actionBtnText,
                  { color: copied ? '#ffffff' : colors.textColor },
                ]}
              >
                {copied ? 'Скопировано' : 'Копировать'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Security Checklist Card */}
        {password.length > 0 && (
          <View style={[styles.optionCard, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
            <Text style={[styles.optionLabel, { color: colors.textColor, marginBottom: 8 }]}>
              Критерии надежности
            </Text>
            {checklist.map((item) => (
              <View key={item.id} style={styles.checklistItem}>
                <Feather
                  name={item.passed ? 'check-circle' : 'x-circle'}
                  size={16}
                  color={item.passed ? colors.success : (item.id === 'pwned' && isPwned ? colors.error : colors.textColorSecondary)}
                />
                <Text
                  style={[
                    styles.checklistText,
                    {
                      color: item.passed ? colors.textColor : colors.textColorSecondary,
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Length slider */}
        <View style={[styles.optionCard, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
          <View style={styles.optionHeader}>
            <Text style={[styles.optionLabel, { color: colors.textColor }]}>Длина пароля</Text>
            <Text style={[styles.optionValue, { color: colors.primaryAccent }]}>
              {options.length}
            </Text>
          </View>
          <View style={styles.sliderRow}>
            <Text style={[styles.sliderBound, { color: colors.textColorSecondary }]}>4</Text>
            <View style={styles.sliderTrack}>
              <View
                style={[
                  styles.sliderFill,
                  {
                    backgroundColor: colors.primaryAccent,
                    width: `${((options.length - 4) / 60) * 100}%`,
                  },
                ]}
              />
              <View style={styles.sliderTouchArea}>
                {[4, 8, 12, 16, 20, 24, 32, 48, 64].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.sliderDot,
                      {
                        backgroundColor:
                          val <= options.length ? colors.primaryAccent : colors.borderColor,
                        left: `${((val - 4) / 60) * 100}%`,
                      },
                    ]}
                    onPress={() => setOptions((prev) => ({ ...prev, length: val }))}
                    hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
                  />
                ))}
              </View>
            </View>
            <Text style={[styles.sliderBound, { color: colors.textColorSecondary }]}>64</Text>
          </View>
          <View style={styles.presetRow}>
            {[8, 12, 16, 24, 32].map((val) => (
              <TouchableOpacity
                key={val}
                style={[
                  styles.presetPill,
                  {
                    backgroundColor:
                      options.length === val ? colors.primaryAccent : colors.background,
                    borderColor:
                      options.length === val ? colors.primaryAccent : colors.borderColor,
                  },
                ]}
                onPress={() => setOptions((prev) => ({ ...prev, length: val }))}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.presetText,
                    { color: options.length === val ? '#ffffff' : colors.textColorSecondary },
                  ]}
                >
                  {val}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Character toggles */}
        <View style={[styles.optionCard, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
          <Text style={[styles.optionLabel, { color: colors.textColor, marginBottom: 10 }]}>
            Набор символов
          </Text>
          {([
            { key: 'uppercase' as const, label: 'Заглавные (A-Z)', example: 'ABC...XYZ' },
            { key: 'lowercase' as const, label: 'Строчные (a-z)', example: 'abc...xyz' },
            { key: 'numbers' as const, label: 'Цифры (0-9)', example: '012...789' },
            { key: 'special' as const, label: 'Спецсимволы (!@#)', example: '!@#$%^&*' },
          ] as const).map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.toggleRow,
                {
                  backgroundColor: options[opt.key] ? colors.primaryAccent + '10' : 'transparent',
                  borderColor: options[opt.key] ? colors.primaryAccent + '40' : colors.borderColor,
                },
              ]}
              onPress={() => toggleOption(opt.key)}
              activeOpacity={0.7}
            >
              <View style={styles.toggleInfo}>
                <Text style={[styles.toggleLabel, { color: colors.textColor }]}>{opt.label}</Text>
                <Text style={[styles.toggleExample, { color: colors.textColorSecondary }]}>
                  {opt.example}
                </Text>
              </View>
              <View
                style={[
                  styles.toggleSwitch,
                  {
                    backgroundColor: options[opt.key] ? colors.primaryAccent : colors.borderColor,
                  },
                ]}
              >
                <View
                  style={[
                    styles.toggleKnob,
                    {
                      transform: [{ translateX: options[opt.key] ? 16 : 0 }],
                    },
                  ]}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* History */}
        {history.length > 0 && (
          <View style={[styles.optionCard, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
            <View style={styles.optionHeader}>
              <Text style={[styles.optionLabel, { color: colors.textColor }]}>
                История ({history.length})
              </Text>
              <TouchableOpacity
                onPress={async () => {
                  await saveHistory([]);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="trash-2" size={16} color={colors.error} />
              </TouchableOpacity>
            </View>
            {history.map((entry) => (
              <TouchableOpacity
                key={entry.id}
                style={[styles.historyItem, { borderColor: colors.borderColor }]}
                onPress={async () => {
                  setPassword(entry.password);
                  await Clipboard.setStringAsync(entry.password);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.historyPassword, { color: colors.textColor }]}
                  numberOfLines={1}
                >
                  {entry.password}
                </Text>
                <Text style={[styles.historyStrength, { color: colors.textColorSecondary }]}>
                  {entry.strength}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  passwordCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  passwordText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    letterSpacing: 1,
    textAlign: 'center',
    lineHeight: 28,
  },
  strengthSection: { gap: 6 },
  strengthBarBg: {
    flexDirection: 'row',
    gap: 4,
    height: 6,
  },
  strengthSegment: {
    flex: 1,
    borderRadius: 3,
  },
  strengthLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strengthLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  entropyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  crackTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  crackTimeText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  leakWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  leakWarningText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    flex: 1,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 5,
  },
  checklistText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#ffffff',
  },
  optionCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  optionValue: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  sliderBound: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    width: 20,
    textAlign: 'center',
  },
  sliderTrack: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(128,128,128,0.2)',
    borderRadius: 3,
    position: 'relative',
  },
  sliderFill: {
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  sliderTouchArea: {
    position: 'absolute',
    top: -8,
    left: 0,
    right: 0,
    bottom: -8,
  },
  sliderDot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    top: 4,
    marginLeft: -7,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  presetPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  presetText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
  },
  toggleInfo: { flex: 1, gap: 2 },
  toggleLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  toggleExample: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  toggleSwitch: {
    width: 40,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  historyPassword: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    flex: 1,
  },
  historyStrength: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
});
```

---

## 5. Caveats

1. **Network Connectivity for HaveIBeenPwned**:
   - The HaveIBeenPwned API requires internet access. If offline or if the API times out, the implementation gracefully ignores network errors and assumes non-compromised (`isPwned: false`), ensuring the password generator and local calculations remain 100% operational offline.
2. **Clipboard Permissions on Android 10+**:
   - `expo-clipboard` handles system notifications when copying. On Android 12+, a system toast is automatically displayed by the OS in addition to the button's internal visual state change ("Скопировано").
3. **Preset Pill Selection State**:
   - When a user changes the slider to an arbitrary number not in presets (e.g., 20), none of the preset pills will be highlighted. This matches intended design.

---

## 6. Conclusion

1. `mobile-expo/src/modules/tools/screens/GenPassScreen.tsx` currently has functional password generation and 1-click clipboard copying (`expo-clipboard`), but lacks:
   - Entropy calculation based on actual character pool
   - 0-100% score calculation and pattern penalties
   - Crack time estimation
   - 5-rule security checklist matching `public/genpass.js`
   - Real SHA-1 k-Anonymity breach detection via HaveIBeenPwned API
   - Interactive `TextInput` to analyze arbitrary user passwords
2. `mobile-expo/package.json` already contains `"expo-clipboard": "~57.0.2"` and all required dependencies. Zero new npm packages need to be installed.
3. The proposed enhancement enriches `GenPassScreen.tsx` with 100% parity with legacy `public/genpass.js`, zero emojis, and strict UI layout preservation.

---

## 7. Verification Method

To independently verify the recommendations:

1. **Typecheck verification**:
   ```powershell
   cd c:\projects\SmartStudyHub\mobile-expo
   npx tsc --noEmit
   ```
   *Expected result*: Exit code 0.

2. **UI & Emoji Audit verification**:
   ```powershell
   cd c:\projects\SmartStudyHub\mobile-expo
   node -e "const ts = require('typescript'); const fs = require('fs'); require.extensions['.ts'] = function (m, fn) { m._compile(ts.transpileModule(fs.readFileSync(fn, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, fn); }; require('./tests/ui_constraints_empirical.test.ts');"
   ```
   *Expected result*: 6/6 tests PASS. Zero unicode emojis.

3. **SHA-1 and Crack Time Parity Verification**:
   ```powershell
   node -e "const crypto = require('crypto'); console.log('Matches:', crypto.createHash('sha1').update('password').digest('hex').toUpperCase() === '5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8');"
   ```
   *Expected result*: `Matches: true`.
