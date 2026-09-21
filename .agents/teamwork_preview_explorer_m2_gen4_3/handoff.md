# Screen Integration & Compliance Explorer Report: Milestone M2

- **Agent**: `teamwork_preview_explorer_m2_gen4_3` (Screen Integration & Compliance Explorer)
- **Parent**: `teamwork_preview_orchestrator_4` (`e0dc7ad3-ae98-41f7-99ee-1d3aa3b332ed`)
- **Working Directory**: `c:\projects\SmartStudyHub\.agents\teamwork_preview_explorer_m2_gen4_3`
- **Date**: 2026-09-14
- **Scope**: Navigation tabs, all feature modules, UI invariants (zero emojis, Feather icons, layout preservation), and Worker integration blueprint.

---

## 1. Observation

Direct forensic inspection of `c:\projects\SmartStudyHub\mobile-expo\src\` yielded the following verified findings:

### 1.1 Invariant Audits: Emojis and Vector Icons
1. **Zero-Emoji Verification**:
   - Executed full recursive AST/file scan across all 67 `.ts`, `.tsx`, `.js`, `.jsx`, and `.json` files in `mobile-expo/src/` with Unicode regex:
     `[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u`
   - **Result**: `Total emojis found in mobile-expo/src: 0` (0 occurrences).
   - In `CurrencyConverterScreen.tsx:28-39` and `SettingsScreen.tsx:11-22`, country codes/flags and languages use purely textual abbreviations (`'US'`, `'EU'`, `'RU'`, `'CN'`, `'KZ'`, `'BY'`, `'GB'`, `'TR'`, `'AE'` and `'Русский (RU)'`, `'English (EN)'`). No flag emojis or icons are present.
2. **Icon Framework Verification**:
   - Grep search for all icon imports across `mobile-expo/src/`:
     Every single icon import is `import { Feather } from '@expo/vector-icons';` (25 call sites in `AppHeader.tsx`, `BottomTabNavigator.tsx`, `ToolsScreen.tsx`, `UnitConverterScreen.tsx`, `CurrencyConverterScreen.tsx`, `TranslatorScreen.tsx`, `GenPassScreen.tsx`, `NotesScreen.tsx`, `NoteCard.tsx`, `NoteEditorModal.tsx`, `GradesScreen.tsx`, `PeriodSelectorBar.tsx`, `SubjectDetailCard.tsx`, `GradeInputKeypad.tsx`, `StrategyEngineCard.tsx`, `AnnualTableCard.tsx`, `ThresholdsModal.tsx`, `WhatIfModal.tsx`, `AddSubjectModal.tsx`, `HistoryTapeView.tsx`, `CalculatorKeypadButton.tsx`, `LoginScreen.tsx`, `RegisterScreen.tsx`, `SettingsScreen.tsx`).
   - **Result**: 100% compliant with `AGENTS.md` (Feather icons exclusively, zero Material/Ionicons/FontAwesome).

---

### 1.2 Navigation Tabs Audit (`src/navigation/`)
- **File**: `mobile-expo/src/navigation/types.ts`
  - Lines 42-48 define static Russian labels:
    ```typescript
    export const TAB_LABELS_RU: Record<keyof RootTabParamList, string> = {
      Calculator: 'Калькулятор',
      Grades: 'Средний балл',
      Notes: 'Заметки',
      Tools: 'Инструменты',
      Settings: 'Настройки',
    };
    ```
- **File**: `mobile-expo/src/navigation/BottomTabNavigator.tsx`
  - Lines 62, 69, 76, 83, 90 hardcode `tabBarLabel` to the static Russian dictionary:
    ```typescript
    <Tab.Screen name="Calculator" component={CalculatorScreen} options={{ tabBarLabel: TAB_LABELS_RU.Calculator }} />
    <Tab.Screen name="Grades" component={GradesScreen} options={{ tabBarLabel: TAB_LABELS_RU.Grades }} />
    <Tab.Screen name="Notes" component={NotesScreen} options={{ tabBarLabel: TAB_LABELS_RU.Notes }} />
    <Tab.Screen name="Tools" component={ToolsStackNavigator} options={{ tabBarLabel: TAB_LABELS_RU.Tools }} />
    <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: TAB_LABELS_RU.Settings }} />
    ```
  - `BottomTabNavigator` does not invoke `useI18n()`. When switching language in `SettingsScreen`, the tab labels remain permanently in Russian.

---

### 1.3 Calculator Module Audit (`src/modules/calculator/`)
1. **`CalculatorScreen.tsx`**:
   - Line 55: `title="Калькулятор"` (hardcoded string).
   - Lines 57-61: Subtitle mapping hardcodes `'Стандартные вычисления'`, `'Вычисления с дробями'`, `'История вычислений'`.
   - Lines 75, 99, 123: Accessibility labels hardcode Russian strings.
   - Lines 92, 116, 140: Tab labels hardcode `'Стандартный'`, `'Дроби'`, `'История ({history.length})'`.
2. **`StandardCalculatorView.tsx`**:
   - Lines 121, 127, 133, 139, 152, 165, 178, 188, 194, 200, 211: Keypad accessibility labels (`'Очистить всё'`, `'Деление'`, `'Вычислить результат'`, etc.) are hardcoded in Russian.
3. **`expressionParser.ts`**:
   - Line 292: `const msg = err?.message === 'Division by zero' ? 'Деление на ноль' : 'Ошибка';` (hardcoded Russian error strings returned from evaluation engine).
4. **`FractionCalculatorView.tsx`**:
   - Line 52: `label="Первая дробь"`
   - Line 87: `label="Вторая дробь"`
   - Line 97: `<Text style={styles.calcButtonText}>Вычислить</Text>`
   - Line 118: `<Text style={[styles.resultLabel, ...]}>Результат:</Text>`
5. **`MixedFractionInput.tsx`**:
   - Line 61: `<Text ...>Целая</Text>`
   - Line 82: `<Text ...>Числитель</Text>`
   - Line 102: `<Text ...>Знаменатель</Text>`
6. **`FractionStepRenderer.tsx`**:
   - Line 18: `<Text ...>Пошаговое решение:</Text>`
7. **`HistoryTapeView.tsx`**:
   - Lines 32-38: `Alert.alert('Очистить историю', 'Вы уверены, что хотите удалить все сохраненные вычисления?', [{ text: 'Отмена' }, { text: 'Удалить' }])`
   - Line 47: `Записей: {history.length}`
   - Line 59: `<Text ...>Очистить</Text>`
   - Line 69: `<Text ...>История вычислений пуста</Text>`
   - Line 71: `<Text ...>Результаты вычислений будут сохраняться здесь автоматически.</Text>`
   - Line 115: `item.type === 'fraction' ? 'Дроби' : 'Стандартный'`

---

### 1.4 Grades Module Audit (`src/modules/grades/`)
1. **`GradesScreen.tsx`**:
   - Line 66: `name: 'Быстрый расчет'`
   - Lines 267-274: `getPeriodTitle()` returns hardcoded `'Годовая'`, `'1 Четверть'`, `'2 Четверть'`, `'3 Четверть'`, `'4 Четверть'`, `'1 Семестр'`, `'2 Семестр'`.
   - Lines 280-281: `AppHeader` `title="Средний балл"`, subtitle `'5-балльная' : 'US GPA 4.0'`.
   - Line 319: `Общий балл ({getPeriodTitle()}):`
   - Line 325: `Предметов с оценками: {subjects.length}`
   - Lines 354, 378: `'Быстрый расчет'`
   - Line 434: `'Предмет'`
   - Lines 483-493: `'Список предметов пуст'`, `'Добавьте предметы для расчета среднего балла и отслеживания успеваемости.'`, `'Добавить предмет'`.
2. **`PeriodSelectorBar.tsx`**:
   - Lines 25-34: Period chips `'1 Четверть'`, `'2 Четверть'`, `'3 Четверть'`, `'4 Четверть'`, `'Годовая'`, `'1 Семестр'`, `'2 Семестр'`.
3. **`SubjectDetailCard.tsx`**:
   - Line 55: `Цель: {subject.targetGrade}`
   - Lines 78-79: `{gradeCount} оценок • вес: {totalWeight.toFixed(1)}`, `'Нет оценок за этот период'`.
   - Line 96: `'Нажмите на кнопки оценок ниже, чтобы добавить первую оценку.'`
   - Line 157: `'Симулятор «Что если?»'`
4. **`GradeInputKeypad.tsx`**:
   - Lines 25-28: Weight labels `'1.0x Ответ'`, `'1.5x Тест'`, `'2.0x Контр.'`, `'3.0x Экзамен'`.
   - Lines 42-46: `Alert.alert('Очистить оценки', 'Удалить все оценки по этому предмету за текущий период?', [{ text: 'Отмена' }, { text: 'Удалить' }])`.
5. **`AnnualTableCard.tsx`**:
   - Line 52: `'Сводная годовая таблица'`
   - Line 58: `'Предмет'`
   - Line 69: `'Год'`
   - Line 72: `'Итог'`
   - Lines 29-36: Column codes `'1Ч'`, `'2Ч'`, `'3Ч'`, `'4Ч'`, `'1С'`, `'2С'`.
6. **`StrategyEngineCard.tsx`**:
   - Line 45: `'Стратегия достижения цели'`
   - Lines 96-101: `'Цель уже достигнута!'`, description `'Текущий балл ... Главное — удерживать планку!'`
   - Lines 117-123: `'Прямой путь: нужно ...'`, description `'Получив еще ...'`
   - Lines 142-146: `'Смешанный вариант:'`
   - Lines 166-171: `'Исправление оценки:'`
7. **`ThresholdsModal.tsx`**:
   - Lines 80, 85, 90, 108, 113, 118: Hardcoded validation error messages (`'Введите корректные числовые значения'`, `'Пороги должны убывать'`, etc.).
   - Line 167: `'Настройки оценок'`
   - Line 177: `'Шкала оценивания:'`
   - Lines 198, 220: `'5-балльная (РФ)'`, `'US Letter (GPA 4.0)'`
   - Line 227: `'Учебные периоды:'`
   - Lines 251, 276: `'4 Четверти'`, `'2 Семестра'`
   - Line 292: `'Пороги округления оценок:'`
   - Lines 299, 324, 349: `'5 (Отлично): от'`, `'4 (Хорошо): от'`, `'3 (Удовл.): от'`
   - Line 499: `'По умолчанию'`
   - Line 508: `'Готово'`
8. **`WhatIfModal.tsx`**:
   - Line 78: `'Симулятор «Что если?»'`
   - Line 92: `Предмет: {subject.name}`
   - Line 97: `'Гипотетическая оценка:'`
   - Line 163: `'Вес оценки:'`
   - Lines 209, 220, 229: `'Текущий'`, `'Прогноз'`, `'Изменение'`
   - Lines 257, 268: `'Отмена'`, `'Применить'`
9. **`AddSubjectModal.tsx`**:
   - Line 38: `setError('Введите название предмета')`
   - Line 63: `'Добавить предмет'`
   - Line 71: `'Название предмета:'`
   - Line 82: `placeholder="Например: Геометрия"`
   - Line 98: `'Целевая оценка:'`
   - Lines 144, 153: `'Отмена'`, `'Добавить'`

---

### 1.5 Notes Module Audit (`src/modules/notes/`)
1. **`NotesScreen.tsx`**:
   - Line 112: `Alert.alert('Удалить заметку', 'Вы уверены, что хотите удалить эту заметку?', ...)`
   - Line 201: `title="Заметки"`
   - Line 202: `subtitle="Заметок: {notes.length}"`
   - Line 230: `placeholder="Поиск по заголовку, тексту, тегам..."`
   - Lines 264-270: `'Ничего не найдено'`, `'Заметок пока нет'`, `'Попробуйте изменить поисковый запрос...'`, `'Нажмите «+» в верхнем правом углу...'`
   - Line 278: `'Создать заметку'`
   - Lines 292, 324: `ЗАКРЕПЛЕННЫЕ ({pinnedNotes.length})`, `ДРУГИЕ ({otherNotes.length})`
2. **`NoteCard.tsx`**:
   - Lines 61, 75: `'Без названия'`
   - Line 158: `+${remainingCount} еще`
3. **`NoteEditorModal.tsx`**:
   - Line 34: `const PRESET_TAGS = ['Учеба', 'Важное', 'Планы', 'Идеи'];`
   - Line 145: `{note ? 'Редактировать' : 'Новая заметка'}`
   - Line 196: `'Цвет фона:'`
   - Line 204: `placeholder="Заголовок"`
   - Line 214: `placeholder="Текст заметки..."`
   - Line 226: `'Чек-лист'`
   - Line 235: `'Пункт'`
   - Line 262: `placeholder="Элемент списка..."`
   - Line 281: `'Теги'`
   - Line 348: `placeholder="Свой тег..."`
4. **`TagFilter.tsx`**:
   - Line 11: `const PRESET_TAGS = ['Все', 'Учеба', 'Важное', 'Планы', 'Идеи'];`
   - Line 36: `tag === 'Все'` (filter equality check relies on string literal `'Все'`).

---

### 1.6 Tools Module Audit (`src/modules/tools/`)
1. **`ToolsScreen.tsx`**:
   - Line 58: `title="Инструменты"`, subtitle `"Учебные и повседневные утилиты"`
   - Lines 23-48: Tool cards titles & subtitles:
     - `'Конвертер единиц'`, `'Длина, масса, температура с live-поиском'`
     - `'Курсы валют'`, `'9 мировых валют, конвертация и оффлайн-кэш'`
     - `'Переводчик'`, `'6 языков, обмен направлений и озвучка TTS'`
     - `'Генератор паролей (GenPass)'`, `'Длина, спецсимволы, энтропия и быстрое копирование'`
   - Line 105: `'Все инструменты работают в автономном режиме без подключения к интернету.'`
2. **`UnitConverterScreen.tsx`**:
   - Lines 37-44, 59-64, 77-79: Unit labels (`'Миллиметры'`, `'Сантиметры'`, `'Метры'`, `'Килограммы'`, `'Цельсий'`, etc.).
   - Lines 102, 113, 124: Category labels (`'Длина'`, `'Масса'`, `'Температура'`).
   - Line 172: `placeholder="Поиск..."`
   - Line 277: `title="Конвертер единиц"`
   - Line 281: `accessibilityLabel="Назад"`
3. **`CurrencyConverterScreen.tsx`**:
   - Lines 29-38: Currency names (`'Доллар США'`, `'Евро'`, `'Российский рубль'`, etc.).
   - Line 238: `'Офлайн (базовые курсы)'`
   - Line 288: `title="Курсы валют"`, subtitle `"Конвертация в реальном времени"`
   - Line 306: `'Загрузка курсов...'`
   - Line 423: `Обновлено: {lastUpdate}`
   - Line 431: `'Популярные пары'`
4. **`TranslatorScreen.tsx`**:
   - Line 309: `title="Переводчик"`
   - Line 326: `Избранные переводы ({favorites.length})`
   - Line 332: `'Нет сохраненных переводов'`
   - Line 423: `placeholder="Введите текст для перевода..."`
   - Line 473: `'Перевод...'`
   - Line 478: `'Перевод появится здесь'`
5. **`GenPassScreen.tsx`**:
   - Line 20 imports `useI18n` and lines 476, 499, 522 use `t('genpassTabGen')`, `t('genpassTabCheck')`, `t('genpassTabVault')`.
   - Lines 571, 592, 603, 613, 698 hardcode: `'Сгенерировать'`, `'Скопировано'` / `'Копировать'`, `'В хранилище'`, `'Длина пароля'`, `'Набор символов'`.
   - Remaining keys already exist in `translations.ts` (`genpassUpper`, `genpassLower`, `genpassNumbers`, `genpassSymbols`, `genpassCheckPlaceholder`, `genpassWaiting`, `genpassAddNew`, `genpassAddLabelPlaceholder`, `genpassAddPwdPlaceholder`, `genpassAddBtn`, `genpassSyncStatus`).

---

### 1.7 Auth & Settings Module Audit (`src/modules/auth/` & `src/modules/settings/`)
1. **`LoginScreen.tsx` & `RegisterScreen.tsx`**:
   - Hardcoded strings for: `'Войдите через Google'`, `'Войдите через GitHub'`, `'Войти как гость (Демо-режим)'`, `'или через Email'`, `'Войти'`, `'Забыли пароль?'`, `'Нет аккаунта? Зарегистрироваться'`, `'Создать аккаунт'`, validation/auth error messages.
   - Matching keys already exist in `translations.ts` (`signInWithGoogle`, `signInWithGithub`, `authTabsSignIn`, `authTabsSignUp`, `authEmailLabel`, `authPasswordLabel`, `authForgotPasswordLink`, `authResetEmailSent`, `authErrorInvalidCredential`, `authErrorEmailAlreadyInUse`, `authErrorWeakPassword`, `authErrorEmptyFields`, `authErrorNetworkFailed`).
2. **`SettingsScreen.tsx`**:
   - Imports `useI18n` and implements a 10-language picker modal (`lang.nativeName`, `lang.name`), but the main screen UI text is hardcoded:
     - Header: `title="Настройки"`, `subtitle="Параметры и внешний вид"`
     - Section titles: `'АККАУНТ'`, `'ЯЗЫК ИНТЕРФЕЙСА'`, `'ВНЕШНИЙ ВИД'`, `'ОБЛАЧНАЯ СИНХРОНИЗАЦИЯ'`, `'О ПРИЛОЖЕНИИ'`
     - Actions: `'Выйти из аккаунта'`, `'Войти в аккаунт'`, `'Тема оформления'`, `'Темная'` / `'Светлая'`
     - Cloud status: `'Статус синхронизации'`, `'Выполняется синхронизация...'`, `'Синхронизировать'` / `'Локально'`, `'Версия сборки'`.

---

## 2. Logic Chain

1. **Premise 1**: The user request and Milestone M2 require comprehensive i18n support across 10 languages (`ru, en, uk, be, kk, es, de, fr, zh, tr`), with reactive language switching that instantly updates all navigation tabs and screens.
2. **Premise 2**: `I18nContext.tsx` and `translations.ts` provide the centralized provider and 10-language dictionary.
3. **Observation Linkage**:
   - `BottomTabNavigator.tsx` currently references `TAB_LABELS_RU` directly without subscribing to `useI18n()`. Therefore, switching the language in Settings will never update the bottom tab bar unless `BottomTabNavigator` calls `useI18n()`.
   - Across the 5 core modules (Calculator, Grades, Notes, Tools, Settings) and Auth screens, a total of 27 UI components contain hardcoded Cyrillic string literals.
   - `translations.ts` already contains 85+ required keys covering navigation, calc, grades, notes, tools, and auth, but approximately 25 granular UI labels (such as period abbreviations, subheaders, and confirmation dialog titles) are either missing or inconsistent between web `translations.js` and mobile `translations.ts`.
4. **Layout Preservation Invariant**:
   - Cyrillic strings and longer Romance/German translations can cause text wrapping or clipping.
   - Modifying JSX hierarchy or changing styling breaks invariant R5 ("СТРОГОЕ сохранение UI").
   - By keeping all `StyleSheet.create` definitions intact, wrapping text with `numberOfLines={1}` and `flexShrink: 1` where text might grow, and cleanly swapping literal text with `t('key')`, the UI layout and aesthetic will be preserved identically.
5. **Deductive Conclusion**:
   - The Worker can execute Milestone M2 in two structured phases without any UI regression:
     1. **Phase 1**: Enhance `translations.ts` with missing keys across all 10 languages (guaranteeing type safety and zero missing keys).
     2. **Phase 2**: Inject `const { t } = useI18n();` and replace hardcoded literals across all audited files according to the exact line-by-line blueprint below.

---

## 3. Caveats

1. **Dynamic Mathematical Expressions & Symbols**:
   - Digits (0-9), mathematical operators (+, -, ×, ÷, =, %, (, )), and currency symbols ($) are universal mathematical glyphs and must not be translated.
2. **Preset Tags Filtering**:
   - In `TagFilter.tsx` and `NoteEditorModal.tsx`, the preset tag `'Все'` is currently used both for display and as a filter sentinel. Replacing `'Все'` with a localized string must maintain the sentinel logic (e.g. comparing `selectedTag === ''` for "All").
3. **Hardware TTS & Locale Codes**:
   - In `TranslatorScreen.tsx`, speech locales (`'ru-RU'`, `'en-US'`, etc.) and language codes are ISO standards and must remain programmatic constants.
4. **Desktop/Electron & AI Artifacts**:
   - Keys in `translations.js` referencing Windows desktop installer or Gemini AI assistant (`downloadForPC`, `aiAssistant`) are excluded from mobile per R2 ("The Gemini AI assistant must NOT be ported").

---

## 4. Conclusion & Actionable Worker Blueprint

### 4.1 Prioritized File-by-File Integration Plan

| # | File Path | Scope of `t(...)` Changes | Key Dependencies |
|---|-----------|---------------------------|------------------|
| 1 | `src/navigation/BottomTabNavigator.tsx` | Add `useI18n()`, replace `TAB_LABELS_RU.*` with `t('calculator')`, `t('grades')`, `t('notes')`, `t('tools')`, `t('settings')` | Existing keys in `translations.ts` |
| 2 | `src/modules/calculator/CalculatorScreen.tsx` | Header title (`t('calculator')`), dynamic subtitles, tab labels (`t('calcTabStandard')`, `t('calcTabFraction')`, `t('calcTabHistory')`) | Existing + new sub keys |
| 3 | `src/modules/calculator/components/FractionCalculatorView.tsx` | `t('fractionFirst')`, `t('fractionSecond')`, `t('calcCalculate')`, `t('result')` | Existing + new keys |
| 4 | `src/modules/calculator/components/MixedFractionInput.tsx` | `t('whole')`, `t('numerator')`, `t('denominator')` | Already in `translations.ts` |
| 5 | `src/modules/calculator/components/FractionStepRenderer.tsx` | `t('fractionStepByStep')` | New key |
| 6 | `src/modules/calculator/components/HistoryTapeView.tsx` | Alert titles, empty state titles, badge labels, `t('clear')` | Existing + new keys |
| 7 | `src/modules/calculator/utils/expressionParser.ts` | Return error code or English standard (`'Division by zero'` / `'Error'`) for component to format | Algorithmic purity |
| 8 | `src/modules/grades/GradesScreen.tsx` | Header, period title generator, `t('gradesQuickCalc')`, `t('gradesTotalScore')`, `t('addSubject')`, empty states | Existing + new period keys |
| 9 | `src/modules/grades/components/PeriodSelectorBar.tsx` | Localized period chips (`t('periodQ1')` ... `t('periodAnnual')`) | New period keys |
| 10 | `src/modules/grades/components/SubjectDetailCard.tsx` | `t('targetGrade')`, `t('whatIf')`, grade statistics summary, empty hint | Existing keys |
| 11 | `src/modules/grades/components/GradeInputKeypad.tsx` | Weight labels (`t('gradesWeightAnswer')`, etc.), confirmation alert | Existing + new weight keys |
| 12 | `src/modules/grades/components/AnnualTableCard.tsx` | Table header (`t('gradesAnnualSummaryTable')`, `t('subjects')`, `t('gradesYear')`, `t('result')`) | Existing + new keys |
| 13 | `src/modules/grades/components/StrategyEngineCard.tsx` | `t('goalAchieved')`, `t('needFives')`, `t('needAs')`, `t('variantMixed')`, `t('variantFix')` | Already in `translations.ts` |
| 14 | `src/modules/grades/components/ThresholdsModal.tsx` | Validation errors, modal header, grading systems (`t('5Point')`, `t('letterGrades')`), thresholds labels | Already in `translations.ts` |
| 15 | `src/modules/grades/components/WhatIfModal.tsx` | `t('whatIf')`, `t('simulateGrade')`, `t('cancel')`, `t('apply')`, stat labels | Already in `translations.ts` |
| 16 | `src/modules/grades/components/AddSubjectModal.tsx` | `t('addSubject')`, `t('subjectName')`, `t('targetGrade')`, `t('cancel')`, `t('create')` | Already in `translations.ts` |
| 17 | `src/modules/notes/NotesScreen.tsx` | `t('notes')`, `t('noteSearch')`, `t('noteEmptyState')`, `t('takeANote')`, `t('notePinned')`, `t('noteOthers')` | Already in `translations.ts` |
| 18 | `src/modules/notes/components/NoteCard.tsx` | `t('noteUntitled')`, `+${remainingCount} ${t('noteMoreItems')}` | New keys |
| 19 | `src/modules/notes/components/NoteEditorModal.tsx` | `t('noteTitlePlaceholder')`, `t('takeANote')`, `t('noteEdit')`, `t('noteNew')`, `t('noteChecklist')` | Existing + new keys |
| 20 | `src/modules/notes/components/TagFilter.tsx` | `t('tagAll')` with safe sentinel logic (`tag === t('tagAll') ? '' : tag`) | New key |
| 21 | `src/modules/tools/ToolsScreen.tsx` | `t('tools')`, `t('unitConverter')`, `t('currencyRates')`, `t('translator')`, `t('genPassTitle')`, offline banner | Existing + new keys |
| 22 | `src/modules/tools/screens/UnitConverterScreen.tsx` | `t('unitConverter')`, `t('length')`, `t('mass')`, `t('temperature')`, `t('back')` | Already in `translations.ts` |
| 23 | `src/modules/tools/screens/CurrencyConverterScreen.tsx` | `t('currencyRates')`, `t('currencyConverterSub')`, `t('popularRates')`, `t('currencyOffline')`, `t('refresh')` | Already in `translations.ts` |
| 24 | `src/modules/tools/screens/TranslatorScreen.tsx` | `t('translator')`, `t('back')`, `t('translatorFavoritesTitle')`, `t('translatorInputPlaceholder')`, `t('translatorTranslating')` | Existing + new keys |
| 25 | `src/modules/tools/screens/GenPassScreen.tsx` | Connect remaining options and vault buttons (`t('genpassGenerate')`, `t('copy')`, `t('copied')`, etc.) | Already in `translations.ts` |
| 26 | `src/modules/auth/LoginScreen.tsx` & `RegisterScreen.tsx` | `t('signInWithGoogle')`, `t('signInWithGithub')`, `t('authTabsSignIn')`, `t('authTabsSignUp')`, auth errors | Already in `translations.ts` |
| 27 | `src/modules/settings/SettingsScreen.tsx` | `t('settings')`, `t('signOut')`, `t('language')`, `t('theme')`, `t('light')`, `t('dark')`, `t('versionLabel')`, section headers | Existing + new keys |

---

## 5. Verification Method

To independently verify screen coverage and compliance after the Worker implements the integration:

1. **Zero-Emoji Automated Invariant Check**:
   ```bash
   node -e "
   const fs = require('fs'), path = require('path');
   const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;
   function walk(d) {
     let res = [];
     for (const f of fs.readdirSync(d)) {
       const p = path.join(d, f);
       if (fs.statSync(p).isDirectory()) res = res.concat(walk(p));
       else if (/\.(tsx?|jsx?)$/.test(f)) res.push(p);
     }
     return res;
   }
   const files = walk('mobile-expo/src');
   let bad = 0;
   for (const f of files) {
     const c = fs.readFileSync(f, 'utf8');
     if (emojiRegex.test(c)) { console.error('Emoji found in ' + f); bad++; }
   }
   if (bad === 0) console.log('PASS: 0 Emojis');
   else process.exit(1);
   "
   ```
2. **Feather Icons Exclusivity Check**:
   ```bash
   npx ripgrep "from '@expo/vector-icons'" mobile-expo/src
   # Verify all matches import { Feather }
   ```
3. **TypeScript Compilation**:
   ```bash
   cd mobile-expo && npx tsc --noEmit
   # Must return 0 errors (Exit code 0)
   ```
4. **Metro Export Verification**:
   ```bash
   cd mobile-expo && npx expo export --no-bytecode
   # Must compile Android and iOS bundles with 0 errors
   ```
5. **Runtime Reactive Language Switching Test**:
   - Change `language` state to `'en'`, `'de'`, `'kk'`, etc.
   - Assert that `BottomTabNavigator` tab labels immediately re-render in the selected language without app reload.
   - Assert that `AppHeader` titles, cards, modal buttons, and alerts reflect the selected locale.
