# Survey Report: Features & UI Deep Dive (GenPass, Notes, Network & UI Polish)

**Investigator**: Survey Explorer 3 (Features & UI Explorer)  
**Date**: 2026-09-14  
**Target Codebase**: `c:\projects\SmartStudyHub\mobile-expo`  
**Firebase Target Project**: `studio-9933447149-80d6a` (Hosting site: `studio-9933447149-80d6a`, URL: `https://studio-9933447149-80d6a.web.app/`)  
**Package Identifier**: `com.smartstudyhub.mobile`  
**UI Constraints**: Strictly 0 emojis in UI; Feather icons (`@expo/vector-icons`); Google Fonts (`Poppins`, `Inter`).

---

## 1. Executive Summary & Problem Scope

This investigation conducts an authoritative, read-only architectural survey of the mobile clone (`mobile-expo`) to prepare the implementation team for:
1. **GenPass Overhaul**: Converting the jumping, erratic discrete-dot selector into a continuous 4–64 integer slider; validating the k-anonymity SHA-1 HaveIBeenPwned API pipeline; and engineering the full Password Vault ("Мои пароли") tab with local & cloud sync.
2. **NotesScreen Enhancements**: Designing seamless photo attachments via `expo-image-picker` and scheduled local reminders via `expo-notifications` (with Android high-importance notification channel).
3. **Honest Network Detection**: Eliminating deceptive static stubs ("Офлайн-режим: Активен") and architecting real-time network state listening, non-intrusive offline banners, and reconnect auto-sync.
4. **Russian Text Overflow & UI Responsiveness Audit**: Cataloging every screen and component where long Cyrillic strings clip, overflow, or break card layouts, specifying precise remedies (`flexShrink: 1`, `numberOfLines={1}`, container flexing, padding fixes).

---

## 2. GenPass & Password Generator Survey

### 2.1. Current Slider Component: Root Cause of "Jumping / Erratic" Behavior
- **Inspected File**: `mobile-expo/src/modules/tools/screens/GenPassScreen.tsx` (Lines 500–532).
- **Direct Observation**:
  ```tsx
  {/* Lines 500-532 in GenPassScreen.tsx */}
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
      {/* Discrete touch targets */}
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
  ```
- **Why it feels erratic and jumping**:
  1. **Not a true slider**: It is a static track containing an array of exactly 9 discrete touchable dots (`[4, 8, 12, 16, 20, 24, 32, 48, 64]`).
  2. **No drag/pan interaction**: There is no gesture recognizer or `PanResponder`. Dragging along the track does nothing or gets intercepted by the parent `ScrollView`.
  3. **Missing integer values**: A user cannot select any value between the 9 presets (e.g., 7, 9, 10, 13, 15, 20, 28). Tapping anywhere outside the 9 small dot hitboxes produces zero response.

### 2.2. Solution: Continuous Slider Allowing Any Integer 4 to 64
We evaluated two implementation approaches:

#### Approach A: Built-in Gesture Responder (Recommended — Zero Dependencies, 100% Reliable)
Using React Native's responder system (`onStartShouldSetResponder`, `onResponderMove`, `onResponderGrant`) with `onLayout` measurement:
```tsx
const MIN_LEN = 4;
const MAX_LEN = 64;

// State to store measured track width
const [trackWidth, setTrackWidth] = useState(0);

const handleTouchMove = (locationX: number) => {
  if (trackWidth <= 0) return;
  const clampedX = Math.max(0, Math.min(trackWidth, locationX));
  const ratio = clampedX / trackWidth;
  const newLen = Math.round(MIN_LEN + ratio * (MAX_LEN - MIN_LEN));
  setOptions((prev) => (prev.length !== newLen ? { ...prev, length: newLen } : prev));
};

// In JSX:
<View style={styles.sliderRow}>
  <Text style={styles.sliderBound}>{MIN_LEN}</Text>
  <View
    style={styles.sliderInteractiveTrack}
    onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
    onStartShouldSetResponder={() => true}
    onMoveShouldSetResponder={() => true}
    onResponderGrant={(e) => handleTouchMove(e.nativeEvent.locationX)}
    onResponderMove={(e) => handleTouchMove(e.nativeEvent.locationX)}
  >
    {/* Background track */}
    <View style={[styles.sliderTrackBg, { backgroundColor: colors.borderColor }]} />
    {/* Active fill */}
    <View
      style={[
        styles.sliderFill,
        {
          backgroundColor: colors.primaryAccent,
          width: `${((options.length - MIN_LEN) / (MAX_LEN - MIN_LEN)) * 100}%`,
        },
      ]}
    />
    {/* Draggable thumb */}
    <View
      style={[
        styles.sliderThumb,
        {
          backgroundColor: colors.primaryAccent,
          borderColor: colors.componentBackground,
          left: `${((options.length - MIN_LEN) / (MAX_LEN - MIN_LEN)) * 100}%`,
        },
      ]}
    />
  </View>
  <Text style={styles.sliderBound}>{MAX_LEN}</Text>
</View>
```
- **Styles**:
  ```ts
  sliderInteractiveTrack: {
    flex: 1,
    height: 36,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderTrackBg: {
    height: 6,
    borderRadius: 3,
    width: '100%',
  },
  sliderFill: {
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    left: 0,
  },
  sliderThumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    marginLeft: -11,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  ```
- **Advantages**: Zero native binary dependencies, zero TurboModuleRegistry issues in Expo Go, instant response, preserves quick-preset pills (8, 12, 16, 24, 32) beneath the slider.

#### Approach B: `@react-native-community/slider`
- Requires installation of `@react-native-community/slider`.
- Standard, but Option A requires no extra packages and provides tighter visual integration with dark/light themes.

---

### 2.3. HaveIBeenPwned (HIBP) API Leak Check Pipeline
- **API Model**: Cloudflare-protected, rate-limited k-anonymity range API: `https://api.pwnedpasswords.com/range/{5_char_sha1_prefix}`.
- **Privacy Guarantee**: Only the first 5 hexadecimal characters of the SHA-1 hash are transmitted over the wire. The remaining 35 characters are compared strictly on-device against the returned list of compromised suffixes. The user's actual password never leaves the mobile device.

#### Hash Engine Availability:
1. `expo-crypto` is **already installed** in `mobile-expo/package.json` (`~57.0.3`):
   ```ts
   import * as Crypto from 'expo-crypto';
   const hash = (await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA1, password)).toUpperCase();
   ```
2. Pure JavaScript RFC 3174 SHA-1 is **already embedded** in `GenPassScreen.tsx` (Lines 181–222) and verified by test suites (`tools_features_empirical.test.ts`, `m3_challenger_adversarial.ts`, `challenger_m3_stress.test.ts`).
   - Pure JS is synchronous, runs with zero bridge delay, and functions reliably in offline test runners.
   - **Recommendation**: Retain the verified pure JS `sha1(password)` for instantaneous hashing, using `expo-crypto` as an asynchronous alternative if needed.

#### Leak Verification & Debounce Logic:
```ts
useEffect(() => {
  if (abortRef.current) abortRef.current.abort();

  if (!password || password.length < 4) {
    setIsPwned(false);
    setLeakCount(0);
    return;
  }

  const controller = new AbortController();
  abortRef.current = controller;

  const timer = setTimeout(async () => {
    try {
      const hash = sha1(password).toUpperCase();
      const prefix = hash.slice(0, 5);
      const suffix = hash.slice(5);

      const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        signal: controller.signal,
        headers: { 'Add-Padding': 'true' }, // K-anonymity padding
      });
      if (!res.ok) return;

      const text = await res.text();
      const match = text.split('\n').find((line) => line.trim().startsWith(suffix));

      if (match) {
        const count = parseInt(match.split(':')[1]?.trim() || '1', 10);
        setIsPwned(true);
        setLeakCount(count);
      } else {
        setIsPwned(false);
        setLeakCount(0);
      }
    } catch {
      // Aborted or offline: preserve existing safe state
    }
  }, 400);

  return () => {
    clearTimeout(timer);
    controller.abort();
  };
}, [password]);
```
- **Security Score Penalty**: When `isPwned === true`, `calculateScore()` caps score at `Math.min(score, 15)`. The security checklist fails the leak item, and a red alert badge renders with the exact breach count.

---

### 2.4. Password Vault ("Мои пароли"): Architecture & Data Schema
In the web application (`public/genpass.js`, lines 269–398), the Password Vault permitted users to store and manage credentials locally and in Firebase Realtime Database. The mobile app currently only has a transient 10-item history tape.

#### Data Schema:
```ts
export interface VaultPasswordItem {
  id: string;              // Unique ID (e.g. `vault_${Date.now()}_${rand}`)
  service: string;         // Service / Site name (e.g., "Google", "GitHub")
  login?: string;          // Login / Email (e.g., "student@university.ru")
  password: string;        // Plaintext password
  isFavorite: boolean;     // Bookmark / Favorite toggle
  createdAt: number;       // Timestamp
  updatedAt: number;       // Timestamp
}
```

#### Storage Strategy:
- **Local Storage Key**: `@ssh_vault_passwords` via `AsyncStorage`.
- **Cloud Sync Key**: Firebase Realtime Database at path `users/${user.uid}/passwords`.
- **Bidirectional Sync**: On app launch / user login, pull cloud passwords and merge with local passwords (union by `id`, latest `updatedAt` wins). On save / delete, push updated array to Firebase Realtime Database.

#### Vault UI & Modal Structure:
1. **Top Segmented Control in `GenPassScreen.tsx`**:
   - Tab 1: "Генератор" (Password generation, continuous slider, strength metrics, checklist).
   - Tab 2: "Мои пароли" (Saved passwords count, live search input, favorite filter chip, "+ Добавить" button).
2. **Vault Item Card Component (`VaultItemCard.tsx`)**:
   - Header: Shield badge with password health color, `service` name (`numberOfLines={1}`, `flexShrink: 1`), Favorite bookmark button (Feather `bookmark` with active tint `colors.primaryAccent`).
   - Login row: Email/username text with 1-tap copy button.
   - Password row: Masked `••••••••` by default; toggle button (Feather `eye` / `eye-off`); when revealed, rendered in monospace font; 1-tap copy button (Feather `copy` -> `check` with 2s toast feedback).
   - Actions: Delete button (Feather `trash-2`) with confirmation dialog.
3. **Add / Edit Password Modal**:
   - Fields:
     1. "Название сервиса" (e.g. "Google") — required.
     2. "Логин или Email" (e.g. "user@gmail.com") — optional.
     3. "Пароль" — with visibility toggle and "Сгенерировать безопасный" button that automatically injects a newly generated 16-character high-entropy password.
     4. "Добавить в избранное" toggle switch.
   - Buttons: "Отмена" (Feather `x`) and "Сохранить" (Feather `check`).

---

## 3. NotesScreen.tsx: Photo Attachments & Scheduled Reminders

### 3.1. Current State of `modules/notes/`
- **File List**:
  - `NotesScreen.tsx` (449 lines)
  - `notesStorage.ts` (59 lines)
  - `types.ts` (25 lines)
  - `components/NoteCard.tsx` (267 lines)
  - `components/NoteEditorModal.tsx` (537 lines)
  - `components/ColorPicker.tsx` (84 lines)
  - `components/TagFilter.tsx` (112 lines)
- **Gap Analysis**:
  - `NoteItem` currently only has `id`, `title`, `content`, `checklist`, `tags`, `color`, `pinned`, `createdAt`, `updatedAt`.
  - **Zero photo attachment logic**: no image picker, no image viewer, no image storage.
  - **Zero notification/reminder logic**: no scheduling, no date/time picker, no reminder display.

### 3.2. Photo Attachments Integration via `expo-image-picker`

#### Package Requirement:
- `expo-image-picker` is an Expo core module compatible with SDK 57.
- Add to `package.json`: `"expo-image-picker": "~57.0.0"`.

#### Data Model Extension (`src/modules/notes/types.ts`):
```ts
export interface NoteItem {
  id: string;
  title: string;
  content: string;
  checklist?: NoteChecklistItem[];
  tags: string[];
  color: string;
  pinned: boolean;
  images?: string[]; // Array of local file URIs (or remote URLs)
  reminder?: {
    timestamp: number; // Scheduled trigger time in ms
    notificationId?: string; // expo-notifications identifier
  };
  createdAt: number;
  updatedAt: number;
}
```

#### Image Capture & Selection Flow:
```ts
import * as ImagePicker from 'expo-image-picker';

export async function pickImageFromGallery(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Доступ запрещен', 'Для прикрепления фото требуется доступ к галерее.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.75,
  });
  if (!result.canceled && result.assets && result.assets[0]?.uri) {
    return result.assets[0].uri;
  }
  return null;
}

export async function capturePhotoFromCamera(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Доступ запрещен', 'Для создания снимка требуется доступ к камере.');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    quality: 0.75,
  });
  if (!result.canceled && result.assets && result.assets[0]?.uri) {
    return result.assets[0].uri;
  }
  return null;
}
```

#### UI Enhancements:
1. **In `NoteEditorModal.tsx`**:
   - Add an action button row: `[ Прикрепить фото ]` (Feather `camera` / `image`).
   - Selecting prompts an ActionSheet: "Сделать снимок", "Выбрать из галереи", "Отмена".
   - Horizontal carousel of attached images with rounded corners (`width: 80, height: 80, borderRadius: 10`).
   - Top-right overlay remove badge (Feather `x`) on each thumbnail.
2. **In `NoteCard.tsx`**:
   - If `note.images && note.images.length > 0`:
     - Render top hero thumbnail (`height: 120` in list mode, `height: 75` in grid mode, `borderRadius: 10`, `resizeMode: 'cover'`).
     - Display a photo count badge if > 1 image (e.g. Feather `image` + `2`).
3. **Storage & Cloud Sync Considerations**:
   - Local URIs (`file:///...`) are saved in `AsyncStorage`.
   - For Firebase Realtime Database: Realtime Database nodes should not hold raw high-res images. Either sync metadata (or compressed thumbnails) or, if Firebase Storage is enabled, upload to Storage and save the public download URL in the note.

---

### 3.3. Scheduled Reminders via `expo-notifications`

#### Package Requirement:
- `expo-notifications` is the standard Expo local notification scheduler.
- Add to `package.json`: `"expo-notifications": "~57.0.0"`.

#### Architecture & Android Channel Setup:
Android 8.0+ strictly requires an active Notification Channel with explicit importance:
```ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const NOTE_REMINDER_CHANNEL_ID = 'note-reminders';

export async function initNotificationSystem(): Promise<boolean> {
  // Set foreground presentation options
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(NOTE_REMINDER_CHANNEL_ID, {
      name: 'Напоминания о заметках',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
      sound: 'default',
    });
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleNoteNotification(
  noteId: string,
  title: string,
  content: string,
  triggerDate: Date
): Promise<string | null> {
  const granted = await initNotificationSystem();
  if (!granted) return null;

  return await Notifications.scheduleNotificationAsync({
    content: {
      title: title || 'Напоминание о заметке',
      body: content ? (content.length > 90 ? content.slice(0, 90) + '...' : content) : 'Откройте заметку в SmartStudyHub',
      sound: 'default',
      data: { noteId },
      channelId: NOTE_REMINDER_CHANNEL_ID,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
}

export async function cancelNoteNotification(notificationId?: string): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (e) {
    console.warn('[Notifications] Cancel error:', e);
  }
}
```

#### Reminder Date/Time Picker UX:
To maintain 100% stability across Expo Go without native binary picker crashes:
1. Provide a **Quick Preset Sheet** in `NoteEditorModal.tsx`:
   - "Через 15 минут"
   - "Через 1 час"
   - "Сегодня в 18:00"
   - "Завтра в 09:00"
   - "Выбрать время..." (via date input modal or `@react-native-community/datetimepicker`).
2. Display active reminder chip inside `NoteEditorModal`:
   - Feather `bell` + `15 сен, 09:00` + Feather `x` (remove reminder).
3. Display active reminder chip on `NoteCard.tsx`:
   - Feather `bell` icon with formatted date string in subtle accent color.

---

## 4. Network Detection & Resilient Offline Architecture

### 4.1. Network Libraries Evaluation
- **Option 1: `@react-native-community/netinfo`**:
  - Universal React Native standard.
  - Event-driven (`NetInfo.addEventListener(state => ...)`).
  - Works out of the box in Expo Go.
- **Option 2: `expo-network`**:
  - Official Expo SDK package.
  - `Network.getNetworkStateAsync()` returns `{ isConnected, isInternetReachable, type }`.
  - Can lack continuous event subscription in some configurations, requiring polling intervals.
- **Recommendation**: Use `@react-native-community/netinfo` as the primary network listener because of its event-driven listener pattern and zero battery overhead.

### 4.2. Network Context & State Hook
Create `src/context/NetworkContext.tsx`:
```tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkContextValue {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string;
}

const NetworkContext = createContext<NetworkContextValue>({
  isConnected: true,
  isInternetReachable: true,
  connectionType: 'unknown',
});

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<NetworkContextValue>({
    isConnected: true,
    isInternetReachable: true,
    connectionType: 'unknown',
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setStatus({
        isConnected: state.isConnected ?? true,
        isInternetReachable: state.isInternetReachable,
        connectionType: state.type,
      });
    });
    return () => unsubscribe();
  }, []);

  return <NetworkContext.Provider value={status}>{children}</NetworkContext.Provider>;
};

export const useNetwork = () => useContext(NetworkContext);
```

### 4.3. Non-Intrusive Offline Indicator & Reconnect Toast
- **Remove Deceptive Stub**: In `SettingsScreen.tsx` (lines 248–258), the hardcoded:
  ```tsx
  <View style={styles.row}>
    <Feather name="check-circle" size={18} color={colors.primaryAccent} />
    <Text style={[styles.itemTitle, { color: colors.textColor }]}>Офлайн-режим</Text>
    <Text style={[styles.itemValue, { color: colors.primaryAccent }]}>Активен</Text>
  </View>
  ```
  must be **completely removed** per Requirement R10.
- **Global Offline Banner Component (`OfflineBanner.tsx`)**:
  - Placed at the top of the root screen wrapper below the safe area header.
  - When `!isConnected`:
    - Renders a slim bar (height 32px):
    - Background: `rgba(245, 158, 11, 0.15)` (Amber warning).
    - Border: `1px solid rgba(245, 158, 11, 0.3)`.
    - Content: `<Feather name="wifi-off" size={13} color="#f59e0b" />` + `<Text style={styles.offlineText}>Автономный режим • Данные сохранены локально</Text>`.
- **Reconnect Toast with Auto-Sync Trigger**:
  - When state transitions from `offline` to `online`:
    - Display a floating green toast for 3.5 seconds:
      `<Feather name="wifi" size={14} color="#10b981" />` + `<Text>Подключение восстановлено • Синхронизация...</Text>`.
    - Automatically call `syncAllModulesWithFirebase()`:
      - Push pending Calculator history tape (capped at last 10 entries).
      - Push updated Grades & custom thresholds.
      - Push Notes.
      - Push Password Vault credentials.

---

## 5. UI Responsiveness & Russian Text Overflow Comprehensive Audit

We performed a line-by-line inspection of all screens and components in `mobile-expo/src` to identify where long Cyrillic strings get clipped, truncated awkwardly, or push sibling elements off-screen.

| # | Screen / Component | Exact File & Lines | Root Cause of Overflow | Concrete Remedy |
|---|--------------------|-------------------|------------------------|-----------------|
| **1** | **Strategy Engine Card** | `modules/grades/components/StrategyEngineCard.tsx` (Lines 41–48, 193–205) | `titleWithIcon` (`flexDirection: 'row'`) and `cardTitle` have NO `flex: 1` or `flexShrink: 1`. Russian title «Стратегия достижения цели» (26 chars) sits beside `targetRow` (108px fixed width). On 360px screens, it forces the target buttons off the right edge of the card. | Add `flex: 1, flexShrink: 1` to `titleWithIcon`, and `cardTitle: { flexShrink: 1, fontSize: 14 }`. |
| **2** | **Unit Converter Screen** | `modules/tools/screens/UnitConverterScreen.tsx` (Lines 287–316, 427–440) | The 3 category tabs («Длина», «Масса», «Температура») use `categoryPill: { flex: 1, gap: 6 }`. On a 360px screen, each pill has only ~104px total width. «Температура» (11 chars) + icon (14px) + gap + padding exceeds 104px, wrapping to 2 lines or clipping. | Add `flexShrink: 1` and `numberOfLines={1}` to `categoryText`. Reduce `gap: 4`, `paddingHorizontal: 4`, `fontSize: 11.5`. |
| **3** | **Calculator Screen Mode Tabs** | `modules/calculator/CalculatorScreen.tsx` (Lines 71–143, 178–195) | `tabBar` has 3 pills: «Стандартный», «Дроби», «История (10)». `tabText` has no `numberOfLines={1}` or `flexShrink: 1`. On narrow screens or large font scale, «Стандартный» wraps vertically, breaking tab bar alignment. | Add `numberOfLines={1}`, `flexShrink: 1` to `tabText`. Set `fontSize: 11.5` and `paddingHorizontal: 4`. |
| **4** | **Translator Screen Language Bar** | `modules/tools/screens/TranslatorScreen.tsx` (Lines 364–394, 511–524) | `langPill` has `flex: 1`. When a language with a long Russian title is selected (e.g. «Французский»), the text + chevron icon overflows the pill width on small devices, causing two-line wrap that misaligns the swap button. | Add `numberOfLines={1}`, `flexShrink: 1` to `langPillText`. |
| **5** | **Bottom Tab Navigator** | `navigation/BottomTabNavigator.tsx` (Lines 49–54) & `navigation/types.ts` | 5 bottom tabs on a 360px screen provide ~72px per tab. «Средний балл» (12 chars) with `fontSize: 10.5` bold Poppins exceeds 72px when system accessibility text scaling is active (>1.0x). | Set `maxFontSizeMultiplier: 1.15`, `numberOfLines={1}`, `flexShrink: 1`, or reduce font size to `10`. |
| **6** | **AppHeader Title Alignment** | `components/common/AppHeader.tsx` (Lines 118–145) | Asymmetric containers: `leftContainer` is fixed `width: 44`, while `rightContainer` is fixed `width: 72`. Long titles like «Конвертер единиц» or «Конвертер валют» are pushed off-center and can truncate with ellipsis prematurely. | Equalize container bounding boxes or apply `minWidth: 44`, ensuring `titleContainer` has `flex: 1, paddingHorizontal: 4` and text centering. |
| **7** | **Settings Screen Theme Row** | `modules/settings/SettingsScreen.tsx` (Lines 130–161) | Theme toggle row: left column has title and subtitle («Светлая тема активна» / «Темная тема активна»), right column has toggle button. Without `flexShrink: 1` on `rowLeft`, long subtitle pushes against the button. | Add `flex: 1, flexShrink: 1` to `rowLeft`, add `numberOfLines={1}` to `itemSubtitle`. |
| **8** | **NoteCard Header Actions** | `modules/notes/components/NoteCard.tsx` (Lines 73–114) | NoteCard header has `title` (`flex: 1`) and 3 action buttons (copy, pin, delete = ~84px). If `actionsRow` does not specify `flexShrink: 0`, a long note title can squeeze the action icon touch targets. | Add `flexShrink: 0` to `actionsRow`, and keep `numberOfLines={2}` on `title`. |
| **9** | **Thresholds Modal System Switch** | `modules/grades/components/ThresholdsModal.tsx` (Lines 184–207, 533–546) | `toggleBtn` has «5-балльная (РФ)» and «US Letter (GPA 4.0)». On small phones (320–360px), modal card padding leaves ~130px per button. «US Letter (GPA 4.0)» wraps into two lines. | Add `numberOfLines={1}`, `flexShrink: 1` to `toggleBtnText`, set `fontSize: 11`. |
| **10** | **Settings Screen Redundant Stubs** | `modules/settings/SettingsScreen.tsx` (Lines 164–194, 230–258) | Duplicate «Шкала оценок» card (already in Calculator), package name stub «com.smartstudyhub.mobile», and fake «Офлайн-режим: Активен». | **Delete all 3 stubs** per R10. Keep Profile/Auth, Language Selector, Theme Switch, and Cloud Sync status. |

---

## 6. Verification Against Strict Invariants

| Project Rule | Invariant Constraint | Survey Finding & Status |
|---|---|---|
| **Emoji Ban** | Zero emoji unicode characters in UI, alerts, or notifications | Verified via regex audit: **0 emoji characters found** across `mobile-expo/src`. All icons use `@expo/vector-icons` (Feather). |
| **Vector Icons** | Exclusively Feather Icons (`@expo/vector-icons`) | Confirmed throughout all screens (`Feather name="..."`). Zero emoji icons. |
| **Firebase Project** | Strictly `studio-9933447149-80d6a` | Verified `services/firebase.ts`: configuration points exclusively to `studio-9933447149-80d6a`. |
| **Package Identifier** | `com.smartstudyhub.mobile` | Verified `mobile-expo/app.json`: `"package": "com.smartstudyhub.mobile"`. |
| **Typography** | Google Fonts (`Poppins`, `Inter`) via `expo-font` | Verified in `theme/useAppFonts.ts` and `theme/typography.ts`. |

---

## 7. Recommended Implementation Sequence for Engineering Team

1. **Step 1: UI Responsiveness Fixes**: Apply `flexShrink: 1`, `numberOfLines={1}`, and container flex rules to `StrategyEngineCard.tsx`, `UnitConverterScreen.tsx`, `CalculatorScreen.tsx`, `TranslatorScreen.tsx`, and `AppHeader.tsx`.
2. **Step 2: GenPass Smooth Slider**: Replace discrete 9-dot `TouchableOpacity` view with `PanResponder` / continuous gesture tracker allowing any integer from 4 to 64.
3. **Step 3: GenPass Password Vault**: Add `VaultItemCard.tsx`, `AddPasswordModal.tsx`, top segmented tab bar, `AsyncStorage` persistence, and Firebase Realtime Database sync.
4. **Step 4: Notes Photo Attachments**: Install `expo-image-picker`, update `NoteItem` interface, add photo selection & removal to `NoteEditorModal.tsx`, and preview thumbnails to `NoteCard.tsx`.
5. **Step 5: Notes Push Reminders**: Install `expo-notifications`, configure Android notification channel `note-reminders`, build quick-preset reminder selector in `NoteEditorModal.tsx`, and add reminder chip to `NoteCard.tsx`.
6. **Step 6: Network Detection & Settings Cleanup**: Install `@react-native-community/netinfo`, create `NetworkContext.tsx`, add `OfflineBanner.tsx` and reconnect auto-sync toast, and strip deleted items from `SettingsScreen.tsx`.
