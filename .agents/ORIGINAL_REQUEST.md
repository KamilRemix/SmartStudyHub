# Original User Request

## 2026-09-12T11:22:00Z

Create a fully functional mobile clone of the SmartStudyHub application using React Native (Expo Managed Workflow) in an isolated mobile-expo/ directory, without modifying the existing web project.

Working directory: c:\projects\SmartStudyHub\mobile-expo
Integrity mode: development

## Requirements

### R1. Architecture & Setup
- Platform: Expo (latest stable SDK), React Native, TypeScript.
- Navigation: React Navigation (Bottom Tabs) or Expo Router.
- Theming: Support for Dark Theme and Light Theme with dynamic switching.
- Configuration: Hardcode Android Package to package: com.smartstudyhub.mobile in pp.json.

### R2. UI & Design Rules
- Icons: STRICTLY @expo/vector-icons (Feather/MaterialIcons). NO EMOJIS anywhere in the UI.
- Typography: Google Fonts (Poppins / Inter) via expo-font.
- Exclusions: The Gemini AI assistant must NOT be ported.

### R3. Core Modules (Full Logic Required, No Mocks)
- **Calculator**: Full support for brackets, percentages, history, and smooth key presses.
- **Grade Average**: Input grades (1-5), weights, quarter/semester calculations, saved to @react-native-async-storage/async-storage.
- **Notes**: Create, edit, delete, text search, tags, color selection, grid/list view. Save to AsyncStorage.

### R4. Tools Module
- **Converters**: Length, mass, temp. Currencies (USD, EUR, RUB, CNY, KZT, BYN, GBP, TRY, AED) with caching. Use Bottom Sheet Modals with live search for selection.
- **Translator**: RU, EN, DE, FR, ES, ZH. Favorites, swap, TTS via expo-speech.
- **GenPass**: Length, special chars, numbers, strength analysis, 1-click copy.

## Acceptance Criteria

### Code Quality & Execution
- [ ] TypeScript compiles successfully: 
px tsc --noEmit runs with 0 errors in the mobile-expo folder.
- [ ] App starts without crashes: 
px expo export or 
px expo start successfully compiles the Metro bundle.
- [ ] pp.json strictly contains package: com.smartstudyhub.mobile.

### Feature & Logic Completeness
- [ ] No placeholders: Source files contain zero // TODO or // FIXME comments related to core logic.
- [ ] Emoji Ban: A global search for emoji unicode characters in the UI code returns 0 results.
- [ ] AsyncStorage is successfully integrated and called in the Notes and Grades modules.
- [ ] expo-speech is successfully integrated and called in the Translator module.

## 2026-09-13T13:26:06Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Full team (multi-part project)

Перенос недостающей бизнес-логики из старого веб-проекта SmartStudyHub в новое мобильное приложение на React Native (Expo) с проведением предварительного аудита и строгим сохранением текущего UI.

Working directory: c:\projects\SmartStudyHub
Integrity mode: development

## Requirements

### R1. Аудит различий
Сравнить файлы логики старого веб-проекта (в корне или `public/js/`) с экранами и модулями в `mobile-expo/src/`. Составить краткий отчет/список функций, которые были в старой версии, но отсутствуют в новой.

### R2. Восстановление логики: Калькулятор и Средний балл
Перенести все недостающие формулы, работу с коэффициентами и математическую логику. Настроить корректное сохранение и загрузку истории расчетов (через AsyncStorage или Firebase).

### R3. Восстановление логики: Заметки и Инструменты
Восстановить возможности, присутствовавшие в старом проекте: тегирование, сортировку, фильтрацию и копирование результатов.

### R4. Интеграция Firebase
Подключить конфигурацию проекта `studio-9933447149-80d6a` (используя Firebase JS SDK, совместимый с Expo) для восстановления функций входа пользователя и синхронизации данных.

### R5. СТРОГОЕ сохранение UI (CRITICAL)
Категорически запрещено ломать или кардинально переписывать текущую нативную верстку экранов в `mobile-expo/`. Все стили (`StyleSheet`), компоненты UI и внешний вид должны остаться прежними. Разрешено только добавление бизнес-логики, вычислений, обработчиков событий (например, `onPress`, `value`) и состояний.

## Acceptance Criteria

### Проверка сборки и типов
- [ ] Выполнение команды `npx tsc --noEmit` в папке `mobile-expo/` завершается без ошибок.
- [ ] Metro bundler (`npx expo export` или `npx expo start`) собирает проект без ошибок.

### Функциональность и безопасность UI
- [ ] Все недостающие математические формулы и фильтры из старого проекта успешно работают в новом.
- [ ] Авторизация и синхронизация через Firebase (`studio-9933447149-80d6a`) функционируют.
- [ ] Диффы файлов (git diff) подтверждают, что визуальная структура (JSX разметка) и стили не были удалены или кардинально изменены, а только обогащены логикой.

## 2026-09-14T10:46:33Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Full team (multi-part feature overhaul)

Комплексное обновление мобильного приложения SmartStudyHub (mobile-expo): реализация безопасного входа Google/GitHub для Expo Go, мультиязычности (i18n), кастомных порогов оценок, облачной синхронизации Firebase (история, оценки, заметки, хранилище паролей), продвинутого GenPass с проверкой утечек и хранилищем, реального детектора сети, фото и напоминаний в заметках, а также очистки настроек и исправления переполнения текста.

Working directory: c:\projects\SmartStudyHub\mobile-expo
Integrity mode: development

## Requirements

### R1. Аутентификация Google и GitHub в Expo Go (без падений и внешних браузеров)
- Обеспечить вход через Google и GitHub без нативных бинарных библиотек, вызывающих ошибку TurboModuleRegistry в базовом Expo Go.
- Использовать `expo-auth-session` / `WebBrowser` (встроенный in-app Custom Tab / AuthSession sheet) с возвратом токена и связкой с Firebase Auth.
- Предусмотреть стабильную обработку ошибок и резервный оффлайн/демо-режим в случае отмены или сетевого сбоя.

### R2. Мультиязычность (i18n)
- Интегрировать полноценную систему локализации на базе словаря проекта `public/translations.js`.
- Поддержка языков: Русский (ru), Английский (en), Украинский (uk), Белорусский (be), Казахский (kk), Испанский (es), Немецкий (de), Французский (fr), Турецкий (tr), Китайский (zh).
- Селектор языка в Настройках с мгновенным переключением интерфейса и сохранением выбора в AsyncStorage.

### R3. Кастомные пороги оценок (Custom Thresholds)
- Добавить возможность свободного редактирования численных и процентных порогов для оценок (например, 2.50, 3.50, 60%, 70% и т.д.) прямо в калькуляторе среднего балла.
- Сохранение настроенных порогов локально и в облаке Firebase.

### R4. Синхронизация данных с Firebase Realtime Database
- Облачная синхронизация для авторизованных пользователей:
  - История вычислений калькулятора (ограничение последних 5-10 записей для оптимизации памяти).
  - Оценки и предметы.
  - Заметки.
  - Хранилище сохраненных паролей.
  - Пользовательские настройки.
- Автоматическая двусторонняя синхронизация при входе и при восстановлении сети.

### R5. GenPass: Проверка утечек (HaveIBeenPwned) и Хранилище паролей (Vault)
- Проверка паролей на утечки через публичный API HaveIBeenPwned (k-anonymity SHA-1 range API) с выводом количества компрометаций.
- Раздел «Мои пароли» (Password Vault): добавление названия сервиса, логина/пароля, переключение видимости, 1-клик копирование, удаление, добавление в избранное/закладки и облачная синхронизация.

### R6. Честный детектор сети и элегантный оффлайн-индикатор
- Удалить статичную вводящую в заблуждение заглушку «Офлайн-режим: Активен» из Настроек.
- Внедрить реальное отслеживание сетевого подключения (Wi-Fi / Mobile).
- Ненавязчивая плашка-уведомление при реальной потере связи («Автономный режим • Данные сохранены локально») и тост при восстановлении сети с автосинхронизацией.

### R7. Плавный непрерывный ползунок длины в GenPass
- Возможность выбора любой точной длины пароля от 4 до 64 символов без скачков и жестких фиксаций.

### R8. Продвинутые Заметки: Фотографии и Push-напоминания
- Прикрепление фото/изображений к заметкам через `expo-image-picker`.
- Установка локальных напоминаний на определенную дату/время через `expo-notifications`.
- Синхронизация заметок с фото-метаданными в Firebase.

### R9. Адаптивность и исправление вылетов текста
- Устранить обрезание и переполнение русских длинных строк во всех карточках, бейджах и кнопках (`flexShrink: 1`, перенос строк, корректные отступы).

### R10. Очистка Настроек
- Удалить лишние и неактуальные пункты: заглушку оффлайн-режима, отображение имени пакета.
- Удалить дублирующуюся плашку шкалы оценок (так как выбор шкалы производится в самом калькуляторе оценок).
- Оставить: Профиль/Авторизация, Выбор языка, Переключение темы, Статус облачной синхронизации.

## Acceptance Criteria

### Сборка и стабильность
- [ ] `npx tsc --noEmit` в `mobile-expo/` завершается с 0 ошибок.
- [ ] Запуск в Expo Go не вызывает ошибок нативных TurboModules (`RNGoogleSignin`).
- [ ] Приложение корректно открывается и компилируется через Metro bundler.

### Функциональная проверка
- [ ] Кнопка Google вызывает встроенный лист авторизации, не ломая Expo Go.
- [ ] Переключение языка в Настройках моментально обновляет текст на экранах (RU, EN, UK, BE и др.).
- [ ] Ввод любого порога оценок (например, 2.70 или 3.65) сохраняется и пересчитывает средний балл.
- [ ] История расчетов ограничивается 5-10 записями и синхронизируется с Firebase при входе.
- [ ] В GenPass работает проверка утечек по API и есть вкладка «Мои пароли» с сохранением и закладками.
- [ ] Ползунок GenPass позволяет плавно выбрать любую длину (например, 7, 13, 29).
- [ ] В Заметках работает выбор фото из галереи и планирование напоминания.
- [ ] Статус сети определяется честно (никаких ложных «Офлайн-режим: Активен» при включенном Wi-Fi).
- [ ] Длинные надписи не вылезают за границы кнопок и карточек.
- [ ] В настройках отсутствуют удаленные технические заглушки.

## 2026-09-14T11:31:05Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt -> delegate to teamwork_preview
> Requested team: Full team (multi-part feature overhaul)

Комплексное обновление мобильного приложения SmartStudyHub (mobile-expo): реализация безопасного входа Google/GitHub для Expo Go, мультиязычности (i18n), кастомных порогов оценок, облачной синхронизации Firebase (история, оценки, заметки, хранилище паролей), продвинутого GenPass с проверкой утечек и хранилищем, реального детектора сети, фото и напоминаний в заметках, а также очистки настроек и исправления переполнения текста.

Working directory: c:\projects\SmartStudyHub\mobile-expo
Integrity mode: development

Продолжай выполнение этапов M2-M7 согласно PROJECT.md:
- M2: i18n Localization Engine (10 языков)
- M3: Custom Grade Thresholds & Math Engine
- M4: Cloud Sync & Network Detection
- M5: GenPass Evolution (Slider, HIBP & Vault)
- M6: Advanced Notes & UI Responsiveness
- M7: E2E Testing & Audit

## 2026-09-21T13:21:19Z

Refining SmartStudyHub mobile application for international and US market readiness: comprehensive localization covering every button and label without raw hardcoded strings, authentic 4-color Google brand logo, removal of guest mode from login, replacing technical cloud sync card with a graceful network requirement indicator, fixing fraction input box dimensions and prefilled digits, and resolving Google/GitHub mobile authentication.

Working directory: c:\projects\SmartStudyHub\mobile-expo
Integrity mode: development

## Requirements

### R1. Complete US English & Russian Localization (Zero Hardcoded Strings)
Audit every component and screen (`modules/calculator`, `modules/grades`, `modules/notes`, `modules/tools`, `modules/settings`, `modules/auth`, `components`). Ensure 100% of user-facing strings are localized through `i18n` with full support for US English (`en`) as the primary international market language, and Russian (`ru`) along with the other 8 supported languages. Remove all hardcoded strings (such as "Целая", "Числитель", "Знаменатель", "Вычислить", "Первая дробь", "Вторая дробь", etc.).

### R2. Authentic Google 4-Color Logo & Guest Mode Removal
- Replace the solid single-color red Google icon with the authentic official Google 4-color 'G' logo (`#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`) rendered via SVG.
- Completely remove "Войти как гость (Демо-режим)" from the Login screen.
- Fix Google OAuth redirect configuration to prevent "Доступ заблокирован: ошибка авторизации" in Expo Go and native builds.
- Fix GitHub authentication flow on mobile so registration/login works reliably.

### R3. Fraction Calculator Input Polish
- Remove hardcoded prefilled digits (`1 1/2` and `2 1/3`) in fraction calculator; start clean and empty with subtle placeholders.
- Redesign `MixedFractionInput` dimensions, vertical padding, and font sizes so digits are never cut off or clipped.
- Fully localize fraction labels (Whole, Numerator, Denominator, Fraction 1, Fraction 2, Calculate).

### R4. Remove Technical Cloud Sync Card & Add Internet Requirement Notification
- Remove the technical "Cloud Sync / studio-9933447149-80d6a / sync status" card from `SettingsScreen`.
- Implement a sleek, native-styled Internet Requirement modal / toast for features requiring an active network connection (cloud sync, online translator, currency rates, social sign-in) with clear retry capability.

### R5. Android Signing & Keystore Verification
- Confirm that no keystores or Android release keys were deleted or compromised, verifying EAS cloud credentials configuration for package `com.smartstudyhub.mobile`.

## Acceptance Criteria
- [ ] 100% of strings in calculator, fractions, grades, notes, tools, auth, and settings are localized in `en` and `ru`
- [ ] Google login button features the official multi-colored 'G' brand logo
- [ ] Guest login button is removed from `LoginScreen`
- [ ] Fraction calculator inputs are spacious, unclipped, and start empty without cut-off prefilled numbers
- [ ] Technical cloud sync card is removed from Settings and replaced by a graceful network requirement alert
- [ ] `npm run typecheck` passes with 0 errors
- [ ] Android signing credentials safety verified in EAS/project