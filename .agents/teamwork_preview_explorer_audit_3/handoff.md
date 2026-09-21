# Handoff Report: Firebase & Data Sync Audit (Explorer 3)

## 1. Observation
1. **Legacy Firebase Configuration**:
   - In `c:\projects\SmartStudyHub\.firebaserc` (lines 1–5):
     ```json
     {
       "projects": {
         "default": "studio-9933447149-80d6a"
       }
     }
     ```
   - In `c:\projects\SmartStudyHub\public\js\firebase-init.js` (lines 10–19):
     ```javascript
     var firebaseConfig = {
         apiKey: "AIzaSyDSgNxVrCXDGIrA-yZzAAYuWKtC13BmJLY",
         authDomain: "studio-9933447149-80d6a.firebaseapp.com",
         databaseURL: "https://studio-9933447149-80d6a-default-rtdb.firebaseio.com",
         projectId: "studio-9933447149-80d6a",
         storageBucket: "studio-9933447149-80d6a.firebasestorage.app",
         messagingSenderId: "121615915195",
         appId: "1:121615915195:web:f2eb26c4c23530ef8e719e",
         measurementId: "G-F02D7YK7S3"
     };
     ```
   - In `c:\projects\SmartStudyHub\firestore.rules` (lines 1–14):
     ```text
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         match /users/{userDoc} {
           allow read, write: if request.auth != null;
           match /{document=**} {
             allow read, write: if request.auth != null;
           }
         }
         match /{document=**} {
           allow read, write: if request.auth != null;
         }
       }
     }
     ```
2. **Legacy Data Storage & Sync Operations**:
   - Notes in RTDB: `public\notes.js` line 205:
     `await window.firebase.database().ref('users/' + user.uid + '/notes').set(notesData);`
     Notes are keyed as an object dictionary `{ [noteId]: NoteItem, updatedAt }`.
   - Grades in RTDB & Firestore: `public\renderer.js` lines 1367, 1370, 1383, 1386:
     Saves to RTDB `users/${uid}` and `users_by_email/${sanitizedEmail}`, and Firestore `users/{email}` and `users/{uid}`.
   - Translator favorites: `public\translator.js` line 303:
     `firebase.firestore().collection('users').doc(docId).collection('translator_favorites')`.
   - Passwords history: `public\genpass.js` line 328:
     `await window.firebase.database().ref('users/' + user.uid + '/passwords').set(savedPasswords);`.
3. **Legacy Russian Auth (VK ID) & Security Rules Compliance**:
   - `public\js\auth.js` lines 1495–1504: `VK_AUTH_CONFIG` has `appId: 54715318`.
   - `public\js\auth.js` lines 1686–1694:
     `localStorage.setItem('ssh_vk_user', JSON.stringify(vkUser));`
     `await firebaseAuth.signInAnonymously();` (anonymous Firebase session used to satisfy Firestore rules).
4. **Mobile Expo Current State**:
   - In `mobile-expo\package.json` (lines 14–32): `firebase` is currently not listed among dependencies. `@react-native-async-storage/async-storage` (`2.2.0`) is present.
   - In `mobile-expo\src\services\`: directory exists but is completely empty.
   - In `mobile-expo\src\modules\notes\notesStorage.ts` (lines 1–58): Notes stored in `AsyncStorage` under `@smartstudy_notes_data` as a flat array `NoteItem[]`.
   - In `mobile-expo\src\modules\grades\utils\gradesStorage.ts` (lines 1–79): Grades stored in `AsyncStorage` under `@smartstudy_grades_data` as `GradesStorageData` with `SubjectItem[]` containing weights and quarter periods.
   - In `mobile-expo\src\modules\settings\SettingsScreen.tsx` (lines 1–241): Only contains Appearance, Grading Scale, and About sections. Account/Sync card is missing.
   - TypeScript compilation test: `npx tsc --noEmit` exited with code 0 (0 errors).

## 2. Logic Chain
1. From Observation 1: The Firebase project is firmly locked to `studio-9933447149-80d6a`. All database interactions in the cloud use this project's RTDB (`https://studio-9933447149-80d6a-default-rtdb.firebaseio.com`) and Firestore instances.
2. From Observation 1 (`firestore.rules` requiring `request.auth != null`) and Observation 3: An unauthenticated client cannot read or write Firestore. Therefore, mobile-expo must support authenticated sessions (Email/Password, or anonymous fallback) to interact with Firestore, while maintaining local-first storage via `AsyncStorage` so that offline use is never blocked.
3. From Observation 2 and Observation 4:
   - Web stores Notes in RTDB as `{ [id]: note, updatedAt }` with field `text`, whereas Mobile stores an array of `NoteItem[]` with field `content`. A bidirectional adapter (`convertRtdbNotesToMobile` / `convertMobileNotesToRtdb`) is necessary to bridge them without data loss or breaking either platform.
   - Web stores Grades as `{ subjects: { "Subject": [grades] } }`, whereas Mobile uses `SubjectItem[]` with weights and periods. Storing a hybrid payload (both legacy `subjects` dictionary and `detailedSubjects` array) allows seamless two-way interoperability.
4. From Observation 4: `mobile-expo` is built with Expo Managed Workflow. To maintain compatibility without requiring native rebuilds or CocoaPods, the modular pure-JavaScript Firebase SDK (`firebase` v10/v11) must be installed.
5. In React Native, `getAuth(app)` does not persist across restarts by default. Initializing auth via `initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })` using the already installed `@react-native-async-storage/async-storage` provides native session persistence.
6. From Observation 4: In `SettingsScreen.tsx`, an "АККАУНТ И СИНХРОНИЗАЦИЯ" section must be inserted using the identical card and typography styles (`styles.card`, `styles.row`, `Feather` icons, no emojis) to satisfy Requirement R5 (STRICT UI preservation).

## 3. Caveats
- Google Sign-In and GitHub Sign-In on mobile: In web/Electron, `signInWithPopup` was used, which is unsupported in React Native. On Expo, social sign-ins require `expo-auth-session` / `expo-web-browser` with credential token exchange. However, Email/Password and Anonymous auth run 100% in pure JS without external web redirects.
- In accordance with AGENTS.md, VK ID must never be routed through Firebase OIDC; if implemented on mobile, it must use direct PKCE OAuth 2.1 or native deep-linking.
- Network connectivity detection: rather than introducing third-party native modules, Firebase RTDB's built-in `.info/connected` hook reliably provides online/offline status in pure JS.

## 4. Conclusion
1. Integration of Firebase project `studio-9933447149-80d6a` into `mobile-expo` is completely feasible within the Expo Managed Workflow by adding the pure-JS `firebase` SDK and configuring `metro.config.js` with `.cjs` support.
2. Architecture design is finalized with 4 core service files under `mobile-expo/src/services/firebase/`: `firebaseConfig.ts`, `authService.ts`, `syncService.ts`, and `AuthContext.tsx`.
3. Bidirectional schema adapters preserve 100% interoperability between the legacy web format (RTDB dictionary, simple grade lists) and the enhanced mobile model (arrays, weights, quarters).
4. Detailed audit report has been written to:  
   `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_audit_3\firebase_sync_audit.md`.

## 5. Verification Method
1. **TypeScript compilation check**:
   ```bash
   cd c:\projects\SmartStudyHub\mobile-expo
   npx tsc --noEmit
   ```
   Must exit with code 0.
2. **Audit Report Inspection**:
   Inspect `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_audit_3\firebase_sync_audit.md` to confirm:
   - Correct project ID (`studio-9933447149-80d6a`) and config parameters.
   - Accurate RTDB and Firestore collection mappings.
   - Exact schema conversion functions for Notes and Grades.
   - Compliance with emoji ban and AGENTS.md rules.
3. **Invalidation Conditions**:
   - Any attempt to create a new Firebase project or use a project other than `studio-9933447149-80d6a`.
   - Any dependency on native iOS/Android Firebase SDKs requiring bare workflow ejecting or custom native development clients.
   - Visual changes or removal of existing styles in `mobile-expo/src/modules/settings/SettingsScreen.tsx`.
