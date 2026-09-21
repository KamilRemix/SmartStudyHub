# Handoff Report: Features & UI Architecture Survey

**Investigator**: Survey Explorer 3 (Features & UI Explorer)  
**Date**: 2026-09-14  
**Working Directory**: `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_3`  
**Handoff Type**: Hard (Investigation complete)  

---

## 1. Observation

1. **GenPass Slider**:
   - In `mobile-expo/src/modules/tools/screens/GenPassScreen.tsx` (Lines 513–530):
     ```tsx
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
     ```
     The component is not a continuous slider; it is a discrete array of 9 touchable buttons. Any dragging gesture fails or gets intercepted by the enclosing `ScrollView`. Users cannot select lengths such as 7, 9, 13, 29.

2. **GenPass SHA-1 & HaveIBeenPwned**:
   - `expo-crypto` version `~57.0.3` is already present in `mobile-expo/package.json` line 26.
   - Pure JS RFC 3174 SHA-1 is already implemented synchronously in `GenPassScreen.tsx` lines 181–222 and verified by unit tests in `mobile-expo/tests/tools_features_empirical.test.ts` (lines 104–175) and `mobile-expo/tests/m3_challenger_adversarial.ts` (lines 510–615).
   - HIBP debounced check already exists in lines 265–311 querying `https://api.pwnedpasswords.com/range/{prefix}` with first 5 chars.

3. **GenPass Password Vault**:
   - `GenPassScreen.tsx` currently only contains an ephemeral 10-entry history tape (`@ssh_genpass_history`), with no service name, login/email, password masking, or favorite bookmarks.
   - In contrast, the web app (`public/genpass.js`, lines 269–398) featured a full "Мои пароли" (Vault) tab with service names, toggle visibility, 1-click copy, and Firebase Realtime Database sync under `users/${uid}/passwords`.

4. **Notes Module State**:
   - In `mobile-expo/src/modules/notes/types.ts` (lines 7–17), `NoteItem` is defined without `images` or `reminder` fields.
   - `mobile-expo/package.json` currently lacks `expo-image-picker` and `expo-notifications`.
   - `NoteEditorModal.tsx` and `NoteCard.tsx` contain zero image attachment or reminder scheduling code.

5. **Network Detection & Settings Screen Stubs**:
   - In `mobile-expo/src/modules/settings/SettingsScreen.tsx` (lines 248–258), the offline status is a hardcoded static fake stub:
     ```tsx
     <View style={styles.row}>
       <View style={styles.rowLeft}>
         <Feather name="check-circle" size={18} color={colors.primaryAccent} />
         <Text style={[styles.itemTitle, { color: colors.textColor }]}>Офлайн-режим</Text>
       </View>
       <Text style={[styles.itemValue, { color: colors.primaryAccent }]}>Активен</Text>
     </View>
     ```
   - Lines 230–246 display a redundant "Идентификатор пакета: com.smartstudyhub.mobile", and lines 164–194 display a duplicate "Шкала оценок" block.
   - No network state listener (`@react-native-community/netinfo`) is currently installed.

6. **Russian Text Overflow & Responsiveness**:
   - In `StrategyEngineCard.tsx` (lines 41–48), `titleWithIcon` does not have `flex: 1` or `flexShrink: 1`, causing the 26-character Russian string «Стратегия достижения цели» to push the 108px `targetRow` off-screen on 360px viewports.
   - In `UnitConverterScreen.tsx` (lines 427–440), «Температура» in `categoryPill` wraps or clips within 104px column width.
   - In `CalculatorScreen.tsx` (lines 178–195), `tabBar` items («Стандартный», «Дроби», «История») lack `numberOfLines={1}` and `flexShrink: 1`.
   - In `TranslatorScreen.tsx` (lines 511–524), long Russian language names (e.g. «Французский») wrap vertically in `langPill`, misaligning the swap button.

7. **Zero Emojis & Invariant Compliance**:
   - Global regex search for emojis in `mobile-expo/src` returned 0 results.
   - All icons strictly use Feather icons from `@expo/vector-icons`.
   - Firebase config in `services/firebase.ts` targets `studio-9933447149-80d6a`.

---

## 2. Logic Chain

1. **GenPass Slider Fix**:
   - Observation 1 proves the slider's jerky behavior is caused by having only 9 discrete `TouchableOpacity` dots.
   - Replacing this static structure with a container utilizing React Native's responder system (`onStartShouldSetResponder`, `onResponderMove`, `onResponderGrant`) and layout measurement (`onLayout`) will allow continuous thumb dragging and accurate selection of any integer from 4 to 64 without adding external binary packages.

2. **HIBP & Pure JS SHA-1**:
   - Observation 2 demonstrates that pure JS RFC 3174 SHA-1 is already thoroughly tested and operational, and `expo-crypto` is present in `package.json`.
   - The k-anonymity model requires transmitting only the 5-character prefix to `https://api.pwnedpasswords.com/range/{prefix}` and performing matching locally on the device, ensuring zero credential leakage over the network.

3. **Vault Tab Architecture**:
   - Observation 3 shows that the web app's Vault was lost during the initial mobile port.
   - Introducing a 2-tab segmented control in `GenPassScreen.tsx` ("Генератор" and "Мои пароли"), supported by a `VaultPasswordItem` interface (`id`, `service`, `login`, `password`, `isFavorite`, `createdAt`, `updatedAt`), local `AsyncStorage` persistence (`@ssh_vault_passwords`), and Firebase Realtime Database sync (`users/${uid}/passwords`), fully restores parity with the web platform.

4. **Notes Photo & Reminder Architecture**:
   - Observation 4 shows missing models and modules in `notes`.
   - Installing `expo-image-picker` and `expo-notifications`, extending `NoteItem` with `images?: string[]` and `reminder?: { timestamp: number; notificationId?: string }`, setting up Android channel `note-reminders`, and providing UI controls in `NoteEditorModal.tsx` and `NoteCard.tsx` will fulfill R8 without native crashes in Expo Go.

5. **Real Network State & Clean Settings**:
   - Observation 5 confirms the presence of misleading static stubs in `SettingsScreen.tsx`.
   - Removing the static offline stub, package ID, and duplicate grading scale per R10, while integrating `@react-native-community/netinfo` with a top floating offline indicator («Автономный режим • Данные сохранены локально») and auto-sync on reconnect, provides an honest and responsive network UX.

6. **UI Responsiveness & Text Overflow**:
   - Observation 6 identifies 10 specific locations where Cyrillic strings cause container overflow.
   - Applying `flexShrink: 1`, `numberOfLines={1}`, container flexing, and adjusted paddings resolves all clipped elements on small mobile screens (320px–360px).

---

## 3. Caveats

1. **Expo Go Native Module Boundaries**:
   - `expo-notifications` and `expo-image-picker` are official Expo modules supported in Expo Go. However, remote push notifications require APNs/FCM credentials; local scheduled notifications (as required here) work entirely offline on-device without external servers.
2. **Image Storage Volume**:
   - Saving large raw camera images in Firebase Realtime Database is not feasible due to the 10MB node limit. Image URIs should remain local in `AsyncStorage`, while cloud sync should transfer metadata/thumbnails or utilize Firebase Cloud Storage when accessible.
3. **Google Sign-In TurboModule in `LoginScreen.tsx`**:
   - As observed during the TypeScript check (`TS2307: Cannot find module '@react-native-google-signin/google-signin'`), the auth screen currently contains an invalid native import that Explorer 1 is refactoring to `expo-auth-session` / `WebBrowser`.

---

## 4. Conclusion

1. The GenPass slider issue is completely understood and can be fixed with a zero-dependency responder-based continuous track supporting lengths 4–64.
2. The HIBP k-anonymity leak check pipeline is sound, with verified SHA-1 available both in pure JS and `expo-crypto`.
3. The Password Vault data model and UI architecture are fully specified, matching web features and supporting Firebase Realtime Database sync.
4. NotesScreen requires extending `NoteItem` and integrating `expo-image-picker` and `expo-notifications` with an Android high-importance channel.
5. Network detection can be reliably implemented with `@react-native-community/netinfo`, an offline banner, and auto-sync on reconnection, while stripping the fake stubs from `SettingsScreen.tsx`.
6. All 10 Russian text overflow locations across `StrategyEngineCard`, `UnitConverterScreen`, `CalculatorScreen`, `TranslatorScreen`, `BottomTabNavigator`, `AppHeader`, `SettingsScreen`, and `ThresholdsModal` have been documented with precise code fixes.

Full details are documented in:
`c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_3\survey_features_ui.md`.

---

## 5. Verification Method

1. **Inspect Survey Report**:
   - View `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_survey_3\survey_features_ui.md`.
2. **Verify Zero Emojis**:
   - Run ripgrep in `mobile-expo/src` for unicode emoji ranges:
     `grep -rnP "[\x{1F300}-\x{1F9FF}]|[\x{2600}-\x{26FF}]" src/` -> 0 matches.
3. **Verify Pure JS SHA-1 Test Suite**:
   - Run existing Node.js test:
     `npx ts-node tests/tools_features_empirical.test.ts`
     Expected output: `[PASS] GenPass algorithms, entropy, score, crack time, and SHA-1 verified.`
4. **Verify Text Overflow Layout Calculations**:
   - Review styles in `StrategyEngineCard.tsx` (lines 41–48) and `UnitConverterScreen.tsx` (lines 427–440) against the 360px viewport grid.
