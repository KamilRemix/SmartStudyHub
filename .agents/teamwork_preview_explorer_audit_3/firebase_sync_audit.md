# Аудит архитектуры Firebase и синхронизации данных: SmartStudyHub Legacy Web vs Mobile Expo

**Дата проведения аудита**: 2026-09-13  
**Целевой проект Firebase**: `studio-9933447149-80d6a`  
**Статус**: ЗАВЕРШЕНО (Готово к реализации)  
**Исследователь**: Explorer 3 (SmartStudyHub Differences Audit: R1 & R4 Focus)

---

## 1. Резюме аудита и границы задачи

### 1.1. Контекст
В рамках миграции бизнес-логики SmartStudyHub из устаревшего гибридного веб-проекта (Electron / Capacitor / Vanilla JS) в нативное мобильное приложение на React Native (Expo Managed Workflow) требуется восстановить:
1. Авторизацию пользователей (Email/Password, сессии, профили).
2. Двустороннюю синхронизацию данных (Заметки, Оценки, Настройки, Инструменты) с облачной инфраструктурой Firebase.
3. Офлайн-персистентность с гарантией целостности при переподключении.

### 1.2. Ключевые ограничения и директивы
- **Единственный разрешенный проект**: `studio-9933447149-80d6a` (Hosting: `studio-9933447149-80d6a.web.app`). Создание новых проектов или изменение конфигурации категорически запрещено (`AGENTS.md`).
- **Строгое сохранение UI (R5)**: Нативная верстка экранов `mobile-expo/src/` (структура JSX и `StyleSheet`) не подлежит разрушению или переделке. Разрешено только обогащение логикой, состояниями и аккуратными модальными окнами авторизации.
- **Запрет эмодзи**: Никаких эмодзи в UI, модальных окнах, уведомлениях и кнопках. Использовать только векторные иконки `@expo/vector-icons` (`Feather`) или SVG.
- **Особый статус российских сервисов (VK ID)**: В соответствии с правилами `AGENTS.md`, VK ID должен использовать нативный SDK/PKCE flow, а не Firebase OIDC. Пользовательская сессия VK хранится независимо (`ssh_vk_user`), а доступ к Firestore осуществляется через фоновый анонимный вход.
- **Совместимость с Expo Managed Workflow**: Запрещено использовать библиотеки, требующие кастомного нативного кода, ломающего Expo Go / стандартную сборку Metro. Используется официальный модульный **Firebase JS SDK** (`firebase` v10/v11) в сочетании с `@react-native-async-storage/async-storage`.

---

## 2. Аудит конфигурации Firebase в Legacy Web

### 2.1. Конфигурационные файлы в корне проекта
- **`.firebaserc`**:
  ```json
  {
    "projects": {
      "default": "studio-9933447149-80d6a"
    }
  }
  ```
- **`firebase.json`**:
  ```json
  {
    "hosting": {
      "site": "studio-9933447149-80d6a",
      "public": "dist",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "headers": [
        {
          "source": "**/*.@(js|html|css)",
          "headers": [
            { "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }
          ]
        }
      ]
    },
    "firestore": {
      "rules": "firestore.rules"
    }
  }
  ```
- **`google-credentials.json`**:
  - `client_id`: `121615915195-kddc512lnra4b2eo2qjnnbuc0sb0pcbh.apps.googleusercontent.com`
  - `project_id`: `studio-9933447149-80d6a`

### 2.2. Инициализация в `public/js/firebase-init.js`
В исходном коде веб-версии зафиксирована точная конфигурация проекта:
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

### 2.3. Правила безопасности Firestore (`firestore.rules`)
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
**Критическое наблюдение**:  
Все коллекции Firestore требуют наличия авторизованного контекста (`request.auth != null`). Любой неавторизованный запрос к Firestore завершается ошибкой `permission-denied`. Поэтому:
- При работе в офлайн/гостевом режиме приложение должно работать с `AsyncStorage`.
- При входе пользователя (Email/Password, Google или анонимном входе) открывается доступ к Firestore.

---

## 3. Аудит потоков данных и структур баз данных в Legacy Web

Legacy-проект использовал гибридную схему хранения: параллельно задействованы **Firebase Realtime Database (RTDB)** и **Cloud Firestore**.

### 3.1. Структура Firebase Realtime Database (`studio-9933447149-80d6a-default-rtdb.firebaseio.com`)

| Путь в RTDB | Формат данных | Назначение |
|---|---|---|
| `users/${uid}/notes` | `{ [noteId]: NoteItem, updatedAt: number }` | Хранение всех заметок пользователя (Google Keep style) |
| `users/${uid}` | `{ subjects: { [name]: number[] }, settings: { gradingSystem, thresholds }, updatedAt: number }` | Оценки по предметам и шкала оценивания |
| `users_by_email/${sanitizedEmail}` | Зеркало объекта оценок | Резервное восстановление оценок по email (`.` заменяется на `_`) |
| `users/${uid}/passwords` | `Array<{ id, password, service, createdAt }>` | Сохраненная история генератора паролей (GenPass) |
| `users/${uid}/ai_settings` | `{ personalization, limits }` | Настройки ИИ-ассистента (в mobile-expo ИИ отключен по R2) |

### 3.2. Структура Cloud Firestore

| Коллекция / Документ | Формат данных | Назначение |
|---|---|---|
| `users/{uid}` | `{ subjects, settings, updatedAt }` | Дублирующее облачное хранилище оценок |
| `users/{email}` | `{ subjects, settings, updatedAt }` | Дублирующее облачное хранилище оценок по email |
| `users/{docId}/translator_favorites/{favId}` | `{ source, result, langFrom, langTo, timestamp }` | Избранные переводы в Переводчике |

### 3.3. Локальные ключи кэша в LocalStorage веб-версии
- `ssh_cached_user`: кэшированный профиль пользователя `{ uid, email, displayName, photoURL, isOfflineSession, providerData }`.
- `ssh_last_uid`: идентификатор последнего активного пользователя.
- `ssh_vk_user`: сессия пользователя VK ID.
- `ssh_explicit_logout`: флаг намеренного выхода (предотвращает случайное восстановление сессии).
- `ssh_notes_${uid}` и `ssh_notes_latest`: локальный кэш заметок.
- `ssh_notes_updated_at`: таймстамп последнего локального изменения заметок.
- `ssh_notes_pending_sync`: флаг наличия неотправленных в облако изменений заметок.
- `ssh_grades_${uid}` и `ssh_grades_latest`: локальный кэш оценок.
- `ssh_grades_updated_at`: таймстамп последнего локального изменения оценок.
- `ssh_grades_pending_sync`: объект неотправленных изменений оценок.

### 3.4. Логика разрешения конфликтов (Conflict Resolution) в Legacy Web
1. **Защита несохраненных изменений**: Если выставлен флаг `pending_sync`, входящий снимок из облака отклоняется, а локальные данные принудительно отправляются в облако.
2. **Сравнение таймстампов**: `localUpdatedAt` сравнивается с `cloudUpdatedAt`. Если локальные данные новее, облачные данные не перезаписывают локальный стейт, а локальные отправляются в облако.
3. **Защита от затирания холодного старта**: При инициализации пустой объект `{}` никогда не затирает непустой локальный кэш.

---

## 4. Аудит аутентификации в Legacy Web (`public/js/auth.js`)

### 4.1. Поддерживаемые методы
1. **Email & Password**:
   - Регистрация: `createUserWithEmailAndPassword(auth, email, password)` с установкой `displayName` по умолчанию из логина email.
   - Вход: `signInWithEmailAndPassword(auth, email, password)`.
   - Сброс пароля: `sendPasswordResetEmail(auth, email)`.
2. **Google Sign-In**:
   - В браузере: `firebaseAuth.signInWithPopup(new firebase.auth.GoogleAuthProvider())`.
   - В Capacitor (нативном Android): `FirebaseAuthentication.signInWithGoogle()` с передачей `idToken` в `GoogleAuthProvider.credential(idToken)`.
   - Ограничение: Запрещено запрашивать лишние scopes (YouTube, Drive), только `profile` и `email` (правило `AGENTS.md`).
3. **GitHub Sign-In**:
   - `firebaseAuth.signInWithPopup(new firebase.auth.GithubAuthProvider())`.
4. **VK ID (Российская авторизация)**:
   - Строго собственный PKCE OAuth 2.1 через SDK `@vkid/sdk` (`appId: 54715318`), без Firebase OIDC (`AGENTS.md`).
   - Сохранение профиля в `ssh_vk_user` с префиксом `vk_${userId}`.
   - Фоновый вход `firebaseAuth.signInAnonymously()` для удовлетворения `firestore.rules`.
   - Видимость кнопки VK: только для стран СНГ (`CIS_COUNTRY_CODES`: RU, BY, KZ, AM, AZ, KG, MD, TJ, TM, UZ, исключая Украину UA) или при русском языке системы.

---

## 5. Аудит текущего состояния Mobile Expo (`mobile-expo`)

### 5.1. Зависимости (`mobile-expo/package.json`)
```json
{
  "dependencies": {
    "@expo-google-fonts/inter": "^0.2.3",
    "@expo-google-fonts/poppins": "^0.2.3",
    "@expo/vector-icons": "^15.0.2",
    "@react-native-async-storage/async-storage": "2.2.0",
    "@react-navigation/bottom-tabs": "^7.2.0",
    "@react-navigation/native": "^7.0.14",
    "@react-navigation/native-stack": "^7.18.10",
    "expo": "~57.0.22",
    "expo-asset": "~57.0.17",
    "expo-clipboard": "~57.0.2",
    "expo-font": "~57.0.4",
    "expo-speech": "~57.0.3",
    "expo-status-bar": "~57.0.1",
    "react": "19.2.3",
    "react-native": "0.86.3",
    "react-native-safe-area-context": "~5.7.0",
    "react-native-screens": "~4.26.0"
  }
}
```
**Наблюдение**:
1. Библиотека `firebase` в данный момент **отсутствует** в `mobile-expo/package.json`.
2. Библиотека `@react-native-async-storage/async-storage` версии `2.2.0` уже установлена и готова к использованию в качестве адаптера персистентности.
3. Проверка типов `npx tsc --noEmit` выполняется успешно (0 ошибок).

### 5.2. Структура `mobile-expo/src/services/`
- Директория `src/services/` создана, но пуста.

### 5.3. Текущее хранение данных в модулях
- **Заметки (`src/modules/notes/notesStorage.ts`)**:
  - Использует ключ `@smartstudy_notes_data` в `AsyncStorage`.
  - Формат: массив `NoteItem[]`:
    ```typescript
    export interface NoteItem {
      id: string;
      title: string;
      content: string; // В web: text
      tags: string[];
      color: string;
      pinned: boolean;
      createdAt: number;
      updatedAt: number;
      checklist?: { id: string; text: string; done: boolean }[];
    }
    ```
  - **Различие со старым веб-проектом**:
    - В веб-версии заметки сохраняются в Realtime Database как ассоциативный массив/словарь `{ [id]: NoteItem, updatedAt }`, а текст заметки называется `text`.
    - В mobile-expo заметки хранятся как плоский массив `NoteItem[]`, а текст называется `content`.

- **Оценки (`src/modules/grades/utils/gradesStorage.ts`)**:
  - Использует ключ `@smartstudy_grades_data` в `AsyncStorage`.
  - Формат: объект `GradesStorageData`:
    ```typescript
    export interface GradesStorageData {
      settings: {
        gradingSystem: '5-point' | 'us-letter';
        periodMode: 'quarters' | 'semesters';
        activePeriod: 'q1' | 'q2' | 'q3' | 'q4' | 's1' | 's2' | 'annual';
        thresholds: {
          '5-point': { 5: number; 4: number; 3: number };
          'us-letter': { A: number; B: number; C: number; D: number; F: number };
        };
      };
      subjects: SubjectItem[]; // Массив предметов с коэффициентами и оценками по четвертям
      updatedAt: number;
    }
    ```
  - **Различие со старым веб-проектом**:
    - В веб-версии `subjects` — это простой словарь списков чисел: `{"Алгебра": [5, 4, 5]}`.
    - В mobile-expo структура богаче: включает веса оценок (`weight: 1.0, 1.5, 2.0`), привязку к периодам (`period: 'q1'`) и целевую оценку.

- **Инструменты (`src/modules/tools/screens/`)**:
  - `TranslatorScreen.tsx` сохраняет избранное локально в `@smartstudy_translator_favorites`.
  - `GenPassScreen.tsx` сохраняет историю паролей в `@smartstudy_passwords_history`.
  - `CurrencyConverterScreen.tsx` кэширует курсы валют в `@smartstudy_currency_rates`.

- **Настройки (`src/modules/settings/SettingsScreen.tsx`)**:
  - Содержит только секции: "ВНЕШНИЙ ВИД", "СИСТЕМА ОЦЕНОК", "О ПРИЛОЖЕНИИ".
  - Секция учетной записи пользователя и синхронизации с облаком **полностью отсутствует**.

---

## 6. Целевая архитектура интеграции Firebase в Mobile Expo

### 6.1. Пакетные требования и Metro Bundler
Для обеспечения 100% совместимости с Expo Managed Workflow без использования нативных линкеров:
1. Добавить зависимость:
   ```bash
   npm install firebase@^11.4.0
   ```
   (Модульный чистый JS SDK: `firebase/app`, `firebase/auth`, `firebase/database`, `firebase/firestore`).
2. Настроить Metro Bundler (`mobile-expo/metro.config.js`):
   Firebase JS SDK использует `.cjs` модули, поэтому в конфигурацию Metro необходимо добавить расширение `cjs`:
   ```javascript
   const { getDefaultConfig } = require('expo/metro-config');
   const config = getDefaultConfig(__dirname);
   config.resolver.sourceExts.push('cjs');
   module.exports = config;
   ```

### 6.2. Инициализация Firebase в `mobile-expo/src/services/firebase/`

Создается модульная структура сервисов:
```
mobile-expo/src/services/
├── firebase/
│   ├── firebaseConfig.ts    # Инициализация App, Auth (с AsyncStorage), Firestore, RTDB
│   ├── authService.ts       # Вход, регистрация, выход, слушатель сессии, кэш
│   ├── syncService.ts       # Синхронизация Заметок, Оценок, Избранного
│   ├── types.ts             # Типы пользователей, сессий и DTO
│   └── index.ts             # Экспорт наружу
```

#### `src/services/firebase/firebaseConfig.ts`:
```typescript
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  Auth
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDSgNxVrCXDGIrA-yZzAAYuWKtC13BmJLY",
  authDomain: "studio-9933447149-80d6a.firebaseapp.com",
  databaseURL: "https://studio-9933447149-80d6a-default-rtdb.firebaseio.com",
  projectId: "studio-9933447149-80d6a",
  storageBucket: "studio-9933447149-80d6a.firebasestorage.app",
  messagingSenderId: "121615915195",
  appId: "1:121615915195:web:f2eb26c4c23530ef8e719e",
  measurementId: "G-F02D7YK7S3"
};

// Инициализация синглтона приложения
export const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApp();

// Инициализация Auth с защитой от двойной инициализации при Fast Refresh
let authInstance: Auth;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const firestore: Firestore = getFirestore(app);
export const rtdb: Database = getDatabase(app);
```

### 6.3. Архитектура сервиса аутентификации (`authService.ts`)

1. **Email / Password**:
   - `signIn(email, password)`: вызывает `signInWithEmailAndPassword(auth, email, password)`.
   - `signUp(email, password, displayName?)`: вызывает `createUserWithEmailAndPassword(auth, email, password)` и `updateProfile(user, { displayName })`.
   - `signOut()`: сохраняет локальный флаг `@smartstudy_explicit_logout`, очищает сессионный кэш `@smartstudy_cached_user` и вызывает `auth.signOut()`.
   - `resetPassword(email)`: вызывает `sendPasswordResetEmail(auth, email)`.
2. **Офлайн-сессия и слушатель**:
   - При старте приложения извлекается `@smartstudy_cached_user` из `AsyncStorage` для мгновенного отображения профиля без задержек сети.
   - Метод `onAuthStateChanged(auth, callback)` синхронизирует состояние пользователя:
     - При успешной авторизации кэширует сессию в `AsyncStorage` (`@smartstudy_cached_user`, `@smartstudy_last_uid`).
     - При выходе или сбросе очищает кэш.
3. **Анонимный вход (Fallback / Гостевой режим)**:
   - Для пользователей без учетной записи или пользователей VK вход выполняется через `signInAnonymously(auth)` для удовлетворения правил Firestore (`request.auth != null`).

---

## 7. Модель двусторонней синхронизации данных (Data Synchronization)

### 7.1. Синхронизация заметок (Notes)
Для обеспечения полной совместимости со старым веб-проектом используется адаптер между структурой словаря RTDB и массивом `NoteItem[]` в мобильном приложении.

#### Схема преобразования данных:
```typescript
// Преобразование из RTDB (Web) в Mobile
export function convertRtdbNotesToMobile(rtdbNotes: any): NoteItem[] {
  if (!rtdbNotes || typeof rtdbNotes !== 'object') return [];
  const list: NoteItem[] = [];
  for (const [id, val] of Object.entries(rtdbNotes)) {
    if (id === 'updatedAt' || typeof val !== 'object' || !val) continue;
    const item = val as any;
    list.push({
      id: item.id || id,
      title: item.title || '',
      content: item.content || item.text || '',
      tags: Array.isArray(item.tags) ? item.tags : [],
      color: item.color || '#16504b',
      pinned: !!item.pinned,
      createdAt: item.createdAt || Date.now(),
      updatedAt: item.updatedAt || Date.now(),
      checklist: Array.isArray(item.checklist) ? item.checklist : undefined,
    });
  }
  return list;
}

// Преобразование из Mobile в RTDB (Web)
export function convertMobileNotesToRtdb(notes: NoteItem[]): Record<string, any> {
  const rtdbMap: Record<string, any> = {
    updatedAt: Date.now(),
  };
  for (const note of notes) {
    rtdbMap[note.id] = {
      ...note,
      text: note.content, // Дублируем для обратной совместимости с legacy web
    };
  }
  return rtdbMap;
}
```

#### Алгоритм синхронизации:
1. Запись в RTDB по пути `users/${user.uid}/notes`.
2. Локальное сохранение в `AsyncStorage` под ключом `@smartstudy_notes_data`.
3. Подписка в реальном времени через `onValue(ref(rtdb, 'users/' + user.uid + '/notes'), callback)`.
4. Разрешение конфликтов: если локальный `updatedAt` новее облачного, локальные заметки отправляются в облако; если облачный новее, обновляется `AsyncStorage` и стейт.

### 7.2. Синхронизация оценок (Grades)
Мобильное приложение поддерживает расширенную модель (веса, четверти/семестры), тогда как старый веб-проект ожидает плоский массив `{"Алгебра": [5, 4, 5]}`.

#### Двусторонний формат полезной нагрузки:
При сохранении мобильное приложение отправляет в RTDB (`users/${user.uid}`) и Firestore (`users/{user.uid}`) гибридный объект:
```typescript
const payload = {
  // 1. Поле для совместимости со старым веб-проектом
  subjects: {
    "Алгебра": [5, 4, 5],
    "Русский язык": [4, 5, 4]
  },
  // 2. Полные расширенные данные для мобильного приложения
  detailedSubjects: gradesData.subjects,
  settings: gradesData.settings,
  updatedAt: Date.now()
};
```
При чтении:
- Если присутствует `detailedSubjects`, мобильное приложение использует его.
- Если присутствуют только простые `subjects` (созданные из веб-интерфейса), данные адаптируются в `SubjectItem[]` со стандартными весами 1.0.

### 7.3. Синхронизация избранных переводов (Translator Favorites)
- Хранилище: коллекция Firestore `users/${user.uid}/translator_favorites`.
- При добавлении/удалении избранного в `TranslatorScreen.tsx` документ создается/удаляется в Firestore и параллельно обновляется `@smartstudy_translator_favorites` в `AsyncStorage`.

### 7.4. Синхронизация паролей (GenPass History)
- Хранилище: RTDB `users/${user.uid}/passwords`.
- Синхронизируется массив сгенерированных паролей между `GenPassScreen.tsx` и облаком.

---

## 8. План интеграции пользовательского интерфейса (R5 Compliance)

### 8.1. Точка интеграции: `SettingsScreen.tsx`
Текущий файл `mobile-expo/src/modules/settings/SettingsScreen.tsx` содержит верстку на карточках с использованием `Feather` и шрифтов `Poppins`/`Inter`.

В строгом соответствии с **R5** (запрет на ломку верстки):
1. Существующие секции `ВНЕШНИЙ ВИД`, `СИСТЕМА ОЦЕНОК`, `О ПРИЛОЖЕНИИ` сохраняются в неизменном виде со всеми стилями.
2. В начало списка перед секцией `ВНЕШНИЙ ВИД` добавляется секция **АККАУНТ И СИНХРОНИЗАЦИЯ**, выполненная в идентичном стиле карточки `styles.card`:
   - В неавторизованном состоянии:
     - Иконка `Feather name="user"` (цвет `colors.primaryAccent`).
     - Заголовок: "Локальный профиль".
     - Подзаголовок: "Данные сохраняются на устройстве".
     - Кнопка "Войти" с иконкой `log-in`.
   - В авторизованном состоянии:
     - Иконка `Feather name="user-check"`.
     - Заголовок: `displayName` или email пользователя.
     - Подзаголовок: "Синхронизация активна".
     - Кнопка "Выйти" с иконкой `log-out`.
     - Кнопка "Синхронизировать сейчас" с иконкой `refresh-cw`.
3. Добавляется модальное окно авторизации (`AuthModal.tsx`):
   - Табы: "Вход" и "Регистрация".
   - Поля ввода: Email, Пароль, Подтверждение пароля.
   - Ссылка на восстановление пароля: "Забыли пароль?".
   - Кнопка отправки: "Войти" / "Создать аккаунт".
   - Никаких эмодзи (строго Feather-иконки: `mail`, `lock`, `user`, `alert-circle`).

---

## 9. Матрица верификации и приемки

| Критерий | Способ проверки | Статус / Требование |
|---|---|---|
| Проект Firebase | Проверка `FIREBASE_CONFIG.projectId` | Строго `studio-9933447149-80d6a` |
| Expo Managed Workflow | `npx expo export` / `npm list` | Чистый JS SDK (`firebase`), без native pods |
| Компиляция TypeScript | `npx tsc --noEmit` в папке `mobile-expo/` | 0 ошибок |
| Запрет эмодзи | Поиск по регулярному выражению в исходниках | 0 эмодзи в коде UI |
| Сохранение верстки (R5) | `git diff mobile-expo/src/modules/settings/` | Стили и структура существующих секций сохранены |
| Офлайн-персистентность | Проверка работы без сети | `AsyncStorage` отдает кэш мгновенно |

---

## 10. Рекомендации для разработчиков (Worker Task Plan)

1. **Шаг 1**: Установить `firebase` в `mobile-expo`:
   ```bash
   cd mobile-expo
   npm install firebase@^11.4.0
   ```
2. **Шаг 2**: Обновить `mobile-expo/metro.config.js` добавлением `cjs` в `sourceExts`.
3. **Шаг 3**: Создать сервисные модули в `mobile-expo/src/services/firebase/`:
   - `firebaseConfig.ts`
   - `authService.ts`
   - `syncService.ts`
   - `AuthContext.tsx`
4. **Шаг 4**: Обогатить хранилища:
   - В `notesStorage.ts`: подключить `syncNotesWithCloud()`.
   - В `gradesStorage.ts`: подключить `syncGradesWithCloud()`.
5. **Шаг 5**: Добавить секцию аккаунта и компонент модального окна авторизации в `SettingsScreen.tsx` без изменения существующих секций.
6. **Шаг 6**: Провести `npx tsc --noEmit` и Metro сборку.
