# Localization Audit & Zero Hardcoded Strings Survey (R1)

## 1. Observation

A full static code analysis and grep search was performed across all directories in `c:\projects\SmartStudyHub\mobile-expo\src\`. Over 350 lines of user-facing hardcoded Cyrillic and English strings, alerts, accessibility labels, and placeholders were discovered. In several core components and screens, `useI18n` is not imported at all.

### 1.1 Calculator Module (`src/modules/calculator/`)

| File | Line(s) | Current Hardcoded Content | Issue / Status |
|------|---------|---------------------------|----------------|
| `components/StandardCalculatorView.tsx` | 121 | `accessibilityLabel="Очистить всё"` | Raw RU string; no `useI18n` hook imported |
| `components/StandardCalculatorView.tsx` | 127 | `accessibilityLabel="Открывающая скобка"` | Raw RU string |
| `components/StandardCalculatorView.tsx` | 133 | `accessibilityLabel="Закрывающая скобка"` | Raw RU string |
| `components/StandardCalculatorView.tsx` | 139 | `accessibilityLabel="Деление"` | Raw RU string |
| `components/StandardCalculatorView.tsx` | 152 | `accessibilityLabel="Умножение"` | Raw RU string |
| `components/StandardCalculatorView.tsx` | 165 | `accessibilityLabel="Вычитание"` | Raw RU string |
| `components/StandardCalculatorView.tsx` | 178 | `accessibilityLabel="Сложение"` | Raw RU string |
| `components/StandardCalculatorView.tsx` | 188 | `accessibilityLabel="Стереть символ"` | Raw RU string |
| `components/StandardCalculatorView.tsx` | 194 | `accessibilityLabel="Точка"` | Raw RU string |
| `components/StandardCalculatorView.tsx` | 200 | `accessibilityLabel="Процент"` | Raw RU string |
| `components/StandardCalculatorView.tsx` | 211 | `accessibilityLabel="Вычислить результат"` | Raw RU string |
| `components/HistoryTapeView.tsx` | 33-38 | `Alert.alert('Очистить историю', 'Вы уверены, что хотите удалить все сохраненные вычисления?', [{ text: 'Отмена' }, { text: 'Удалить' }])` | Hardcoded RU alert title, message, and button labels |
| `components/HistoryTapeView.tsx` | 47 | `Записей: {history.length}` | Unlocalized record count |
| `components/HistoryTapeView.tsx` | 54, 59 | `accessibilityLabel="Очистить историю вычислений"`, text `Очистить` | Unlocalized action button |
| `components/HistoryTapeView.tsx` | 69, 72 | `История вычислений пуста`, `Результаты вычислений будут сохраняться здесь автоматически.` | Unlocalized empty state title & subtitle |
| `components/HistoryTapeView.tsx` | 115 | `item.type === 'fraction' ? 'Дроби' : 'Стандартный'` | Hardcoded badge strings |
| `components/HistoryTapeView.tsx` | 129, 143 | `accessibilityLabel={\`Вставить выражение: ${item.expression}\`}`, `accessibilityLabel={\`Вставить результат: ${item.result}\`}` | Hardcoded RU accessibility labels |
| `components/MixedFractionInput.tsx` | 64 | `{t('wholePart') \|\| 'Целая'}` | Key `wholePart` is missing in `translations.ts` (falls back to RU) |
| `components/MixedFractionInput.tsx` | 87 | `{t('numerator') \|\| 'Числитель'}` | Key `numerator` is missing in `translations.ts` (falls back to RU) |
| `components/MixedFractionInput.tsx` | 109 | `{t('denominator') \|\| 'Знаменатель'}` | Key `denominator` is missing in `translations.ts` (falls back to RU) |
| `components/FractionCalculatorView.tsx` | 120 | `{t('result') \|\| 'Результат'}:` | Key `result` is missing in `translations.ts` (falls back to RU) |
| `components/FractionStepRenderer.tsx` | 18 | `Пошаговое решение:` | Raw RU header string |
| `utils/fractionMath.ts` | 44, 127 | `displayMixed: 'Ошибка'` | Hardcoded error return string |
| `utils/fractionMath.ts` | 47, 130 | `'Знаменатель должен быть больше нуля'`, `'Деление на ноль невозможно'` | Hardcoded error strings in math engine |
| `utils/fractionMath.ts` | 59, 83, 93, 103, 114, 142, 157, 180 | Step labels: `'1. Перевод в неправильные дроби'`, `'2. Приведение к общему знаменателю'`, etc. | Math explanation labels hardcoded in Russian |
| `utils/expressionParser.ts` | 292 | `const msg = err?.message === 'Division by zero' ? 'Деление на ноль' : 'Ошибка';` | Hardcoded Russian error strings returned on calculator display |

---

### 1.2 Grades Module (`src/modules/grades/`)

| File | Line(s) | Current Hardcoded Content | Issue / Status |
|------|---------|---------------------------|----------------|
| `GradesScreen.tsx` | 269-276 | `getPeriodTitle()`: `'Годовая'`, `q1: '1 Четверть'`, `q2: '2 Четверть'`, `q3: '3 Четверть'`, `q4: '4 Четверть'`, `s1: '1 Семестр'`, `s2: '2 Семестр'` | Period titles displayed in header & summary are hardcoded Russian |
| `GradesScreen.tsx` | 380 | `<Text style={[styles.subjectChipText, ...]}>Быстрый расчет</Text>` | Hardcoded RU chip text (key `gradesQuickCalc` exists but was not used in JSX) |
| `GradesScreen.tsx` | 391 | `accessibilityLabel={\`Выбрать предмет ${s.name}\`}` | Hardcoded RU accessibility label |
| `GradesScreen.tsx` | 424 | `accessibilityLabel="Добавить предмет"` | Hardcoded RU accessibility label |
| `GradesScreen.tsx` | 436 | `<Text style={[styles.addSubjectChipText, ...]}>Предмет</Text>` | Hardcoded RU button label |
| `components/AddSubjectModal.tsx` | 38 | `setError('Введите название предмета');` | Unlocalized validation message; `useI18n` NOT imported |
| `components/AddSubjectModal.tsx` | 63 | `<Text style={[styles.title, ...]}>Добавить предмет</Text>` | Hardcoded modal title |
| `components/AddSubjectModal.tsx` | 71, 98 | `Название предмета:`, `Целевая оценка:` | Hardcoded field labels |
| `components/AddSubjectModal.tsx` | 82 | `placeholder="Например: Геометрия"` | Hardcoded placeholder |
| `components/AddSubjectModal.tsx` | 108 | `accessibilityLabel={\`Цель ${t}\`}` | Hardcoded target a11y label |
| `components/AddSubjectModal.tsx` | 144, 153 | Buttons: `Отмена`, `Добавить` | Hardcoded modal action buttons |
| `components/AnnualTableCard.tsx` | 29-36 | `label: '1Ч'`, `'2Ч'`, `'3Ч'`, `'4Ч'`, `'1С'`, `'2С'` | Short period tokens in table columns; `useI18n` NOT imported |
| `components/AnnualTableCard.tsx` | 52 | `<Text style={[styles.title, ...]}>Сводная годовая таблица</Text>` | Hardcoded table card title |
| `components/AnnualTableCard.tsx` | 58, 69, 72 | Headers: `Предмет`, `Год`, `Итог` | Hardcoded table column headers |
| `components/GradeInputKeypad.tsx` | 25-28 | `1.0x Ответ`, `1.5x Тест`, `2.0x Контр.`, `3.0x Экзамен` | Weight pill labels in RU; `useI18n` NOT imported |
| `components/GradeInputKeypad.tsx` | 43-46 | `Alert.alert('Очистить оценки', 'Удалить все оценки по этому предмету за текущий период?', [{ text: 'Отмена' }, { text: 'Удалить' }])` | Hardcoded alert dialog |
| `components/GradeInputKeypad.tsx` | 72, 102, 120, 137 | A11y labels: `Коэффициент веса...`, `Добавить оценку...`, `Удалить последнюю оценку`, `Очистить оценки за период` | Hardcoded RU accessibility labels |
| `components/PeriodSelectorBar.tsx` | 25-35 | `1 Четверть`, `2 Четверть`, `3 Четверть`, `4 Четверть`, `Годовая`, `1 Семестр`, `2 Семестр` | Hardcoded period pills; `useI18n` NOT imported |
| `components/PeriodSelectorBar.tsx` | 51, 77 | `accessibilityLabel={\`Выбрать период ${item.label}\`}`, `accessibilityLabel="Настройки периодов и шкалы"` | Hardcoded RU accessibility labels |
| `components/SubjectDetailCard.tsx` | 55 | `Цель: {subject.targetGrade}` | Hardcoded label; `useI18n` NOT imported |
| `components/SubjectDetailCard.tsx` | 62, 128, 145 | `accessibilityLabel={\`Удалить предмет ${subject.name}\`}`, `accessibilityLabel="Удалить оценку"`, `accessibilityLabel="Калькулятор Что если"` | Hardcoded RU accessibility labels |
| `components/SubjectDetailCard.tsx` | 78-79 | `${gradeCount} оценок • вес: ${totalWeight.toFixed(1)}`, `Нет оценок за этот период` | Hardcoded subtitle stats |
| `components/SubjectDetailCard.tsx` | 96 | `Нажмите на кнопки оценок ниже, чтобы добавить первую оценку.` | Hardcoded empty state hint |
| `components/SubjectDetailCard.tsx` | 157 | `<Text style={[styles.whatIfText, ...]}>Симулятор «Что если?»</Text>` | Hardcoded button title |
| `components/StrategyEngineCard.tsx` | 45 | `<Text style={[styles.cardTitle, ...]}>Стратегия достижения цели</Text>` | Hardcoded card title; `useI18n` NOT imported |
| `components/StrategyEngineCard.tsx` | 58 | `accessibilityLabel={\`Выбрать целевую оценку ${t}\`}` | Hardcoded target a11y label |
| `components/StrategyEngineCard.tsx` | 96 | `Цель уже достигнута!` | Hardcoded verdict title |
| `components/StrategyEngineCard.tsx` | 99-101 | `Текущий балл ... соответствует или превышает порог ... Главное — удерживать планку!` | Hardcoded verdict description |
| `components/StrategyEngineCard.tsx` | 117 | `Прямой путь: нужно {strategy.neededTopGrades} оценок «{strategy.topGradeValue}»` | Hardcoded direct strategy title |
| `components/StrategyEngineCard.tsx` | 120-123 | `Получив еще ... высших оценок (весом 1.0), ваш средний балл поднимется до ... (порог: ...).` | Hardcoded direct strategy description |
| `components/StrategyEngineCard.tsx` | 142, 145-147 | `Смешанный вариант:`, `{fives} пятерок и {fours} четверок → средний балл: ...` | Hardcoded mixed strategy section |
| `components/StrategyEngineCard.tsx` | 166, 169-172 | `Исправление оценки:`, `Пересдайте оценку «...» на «...» → прогноз балла: ... (цель будет достигнута!)` | Hardcoded remediation strategy |
| `components/ThresholdsModal.tsx` | 80, 85, 90, 108, 113, 118 | Validation errors: `Введите корректные числовые значения`, `Пороги должны быть больше 0`, `Пороги должны убывать...`, `Пороги не могут быть отрицательными` | Hardcoded validation errors; `useI18n` NOT imported |
| `components/ThresholdsModal.tsx` | 167 | `Настройки оценок` | Hardcoded modal title |
| `components/ThresholdsModal.tsx` | 177, 227, 292 | `Шкала оценивания:`, `Учебные периоды:`, `Пороги округления оценок:` | Hardcoded section titles |
| `components/ThresholdsModal.tsx` | 198, 220 | `5-балльная (РФ)`, `US Letter (GPA 4.0)` | Hardcoded system toggle options |
| `components/ThresholdsModal.tsx` | 251, 276 | `4 Четверти`, `2 Семестра` | Hardcoded period toggles |
| `components/ThresholdsModal.tsx` | 299, 324, 349, 373 | `5 (Отлично): от`, `4 (Хорошо): от`, `3 (Удовл.): от`, `• 2 (Неудовл.): ниже ...` | Hardcoded threshold field labels (5-point) |
| `components/ThresholdsModal.tsx` | 380, 405, 430, 455, 479 | `A (4.0 GPA): от`, `B (3.0 GPA): от`, `C (2.0 GPA): от`, `D (1.0 GPA): от`, `• F (0.0 GPA): ниже ...` | Hardcoded threshold field labels (US-letter) |
| `components/ThresholdsModal.tsx` | 500, 508 | Buttons: `По умолчанию`, `Готово` | Hardcoded modal buttons |
| `components/WhatIfModal.tsx` | 78, 84 | `Симулятор «Что если?»`, `accessibilityLabel="Закрыть симулятор"` | Hardcoded title & a11y label; `useI18n` NOT imported |
| `components/WhatIfModal.tsx` | 92, 97, 163 | `Предмет: {subject.name}`, `Гипотетическая оценка:`, `Вес оценки:` | Hardcoded field labels |
| `components/WhatIfModal.tsx` | 53-56, 173 | Weights: `1.0x Ответ`, `1.5x Тест`, `2.0x Контрольная`, `3.0x Экзамен` | Hardcoded weights |
| `components/WhatIfModal.tsx` | 209, 220, 229 | Results header: `Текущий`, `Прогноз`, `Изменение` | Hardcoded comparison headers |
| `components/WhatIfModal.tsx` | 247, 257, 264, 268 | Buttons & a11y: `Отменить симуляцию`, `Отмена`, `Применить гипотетическую оценку`, `Применить` | Hardcoded action buttons |
| `utils/gradesStorage.ts` | 19, 29, 39 | `name: 'Алгебра'`, `name: 'Русский язык'`, `name: 'Физика'` | Default initial subjects created in Russian regardless of locale |

---

### 1.3 Navigation & Shared Components

| File | Line(s) | Current Hardcoded Content | Issue / Status |
|------|---------|---------------------------|----------------|
| `src/navigation/BottomTabNavigator.tsx` | 99 | `tabBarLabel: t('tabGrades') \|\| t('grades')` | Key `tabGrades` missing from `translations.ts` (falls back to "Средний балл", which is too wide on some devices) |
| `src/components/common/OfflineBanner.tsx` | 106 | `t('onlineRestored') \|\| 'Связь восстановлена • Синхронизация'` | Key `onlineRestored` missing from `translations.ts`; fallback is Russian |
| `src/components/common/OfflineBanner.tsx` | 107 | `t('offlineModeDesc') \|\| 'Автономный режим • Данные сохранены локально'` | Key `offlineModeDesc` missing from `translations.ts`; fallback is Russian |

---

### 1.4 Auth Module (`src/modules/auth/`)

| File | Line(s) | Current Hardcoded Content | Issue / Status |
|------|---------|---------------------------|----------------|
| `LoginScreen.tsx` | 78, 86, 153 | Google auth errors: `'Ошибка авторизации через Google. Попробуйте снова'`, `'Ошибка входа через Google'`, `'Не удалось открыть окно входа Google. Проверьте подключение'` | Hardcoded Russian error strings; `useI18n` NOT imported |
| `LoginScreen.tsx` | 94, 107, 109, 111 | Email errors: `'Введите email и пароль'`, `'Неверный email или пароль'`, `'Слишком много попыток. Попробуйте позже'`, `'Ошибка входа. Проверьте подключение'` | Hardcoded Russian error strings |
| `LoginScreen.tsx` | 131, 133, 135 | Popup errors: `'Всплывающее окно заблокировано браузером...'`, `'Аккаунт с таким email уже существует...'` | Hardcoded Russian error strings |
| `LoginScreen.tsx` | 169, 171, 173, 199, 222 | GitHub auth errors: `'Ошибка авторизации через GitHub'`, `'Не удалось завершить вход через GitHub...'` | Hardcoded Russian error strings |
| `LoginScreen.tsx` | 231, 240 | Password reset: `'Введите email для сброса пароля'`, `'Не удалось отправить письмо'` | Hardcoded Russian error strings |
| `LoginScreen.tsx` | 258 | `Войдите, чтобы синхронизировать данные` | Hardcoded Russian subtitle |
| `LoginScreen.tsx` | 277, 297 | `Войти через Google`, `Войти через GitHub` | Hardcoded Russian button text |
| `LoginScreen.tsx` | 307 | `или через Email` | Hardcoded Russian divider text |
| `LoginScreen.tsx` | 317, 332 | `placeholder="Email"`, `placeholder="Пароль"` | Hardcoded placeholders |
| `LoginScreen.tsx` | 350 | `Письмо для сброса пароля отправлено` | Hardcoded success text |
| `LoginScreen.tsx` | 364, 371, 378 | `Войти`, `Забыли пароль?`, `Нет аккаунта? Зарегистрироваться` | Hardcoded button & links |
| `RegisterScreen.tsx` | 33, 37, 48, 50, 52, 54 | Validation/errors: `'Заполните все поля'`, `'Пароль должен содержать не менее 6 символов'`, `'Этот email уже зарегистрирован'`, `'Неверный формат email'`, `'Пароль слишком простой'`, `'Ошибка регистрации. Проверьте подключение'` | Hardcoded Russian error strings; `useI18n` NOT imported |
| `RegisterScreen.tsx` | 71, 73 | `Создать аккаунт`, `Для синхронизации данных между устройствами` | Hardcoded titles |
| `RegisterScreen.tsx` | 82, 95, 110 | `placeholder="Имя"`, `placeholder="Email"`, `placeholder="Пароль (минимум 6 символов)"` | Hardcoded placeholders |
| `RegisterScreen.tsx` | 135, 141 | `Зарегистрироваться`, `Уже есть аккаунт? Войти` | Hardcoded button & link |

---

### 1.5 Notes, Tools & Services Modules

- **Notes (`src/modules/notes/`)**:
  - `TagFilter.tsx`: PRESET_TAGS array `['Все', 'Учеба', 'Важное', 'Планы', 'Идеи']` hardcoded in Russian.
  - `NoteCard.tsx`: `'Без названия'`, `'Скопировано в буфер обмена'`, `'Открепить заметку'`, `'Закрепить заметку'`, `'Удалить заметку'`, `'+{remainingCount} еще'`.
  - `NoteEditorModal.tsx`: `'Редактировать'` / `'Новая заметка'`, `'Цвет фона:'`, `'Заголовок'`, `'Текст заметки...'`, `'Добавить фото'`, `'Напоминание активно'` / `'+1 ч'`, `'Чек-лист'`, `'Пункт'`, `'Элемент списка...'`, `'Теги'`, `'Свой тег...'`.
- **Tools (`src/modules/tools/`)**:
  - `UnitConverterScreen.tsx`: Categories ('Длина', 'Масса', 'Температура'), unit names ('Миллиметры', 'Сантиметры', 'Метры', etc.), headers ('Конвертер единиц'), search ('Поиск...').
  - `CurrencyConverterScreen.tsx`: Currency names ('Доллар США', 'Евро', etc.), statuses (' (кэш)', 'Офлайн (базовые курсы)', 'Загрузка курсов...'), title/subtitle ('Курсы валют', 'Конвертация в реальном времени'), labels ('Обновлено: ...', 'Популярные пары').
  - `TranslatorScreen.tsx`: Language names in modal, status messages ('Ошибка перевода', 'Перевод появится здесь', 'Перевод...').
  - `GenPassScreen.tsx`: Time units in crack time estimator ('менее секунды', 'сек', 'мин', 'часов', 'дней', 'лет'), strength descriptions ('Очень слабый', 'Слабый', 'Средний', 'Надежный', 'Максимальный'), HIBP leak messages ('Проверка по базам утечек...', 'Пароль найден в {count} утечках!', 'Пароль надежен, утечек не найдено').
- **Services (`src/services/`)**:
  - `notificationService.ts`: Channel name `'Напоминания заметок'`, default title `'Напоминание по заметке'`, body `'Пора вернуться к задачам в SmartStudyHub'`.
  - `auth.ts`: OFFLINE_DEMO_USER display name `'Гость (Офлайн)'`.

---

## 2. Logic Chain

1. **Premise 1**: SmartStudyHub is targeting international and US market readiness, requiring 100% localization into US English (`en`), Russian (`ru`), and 8 other languages (`uk`, `be`, `kk`, `es`, `de`, `fr`, `zh`, `tr`) with zero raw hardcoded strings.
2. **Premise 2**: `I18nContext.tsx` provides `t(key, params)` which resolves translations with fallback order: `translations[currentLanguage] -> translations['ru'] -> translations['en'] -> key`.
3. **Premise 3**: In several components (e.g. `MixedFractionInput.tsx`, `OfflineBanner.tsx`, `BottomTabNavigator.tsx`), developers wrote calls like `t('wholePart') || 'Целая'`, `t('onlineRestored') || 'Связь...'`, but the keys `wholePart`, `numerator`, `denominator`, `result`, `onlineRestored`, `offlineModeDesc`, `tabGrades` were never added to `src/i18n/translations.ts`. Therefore, for English and all non-Russian users, `t()` returns `undefined` and the UI falls back to the hardcoded Russian string.
4. **Premise 4**: In entire modal components and cards across `grades`, `calculator`, and `auth` (e.g. `ThresholdsModal.tsx`, `WhatIfModal.tsx`, `AddSubjectModal.tsx`, `StrategyEngineCard.tsx`, `AnnualTableCard.tsx`, `GradeInputKeypad.tsx`, `LoginScreen.tsx`, `RegisterScreen.tsx`), `useI18n` is not imported at all, and all text, placeholders, alerts, and accessibility labels are raw Cyrillic strings.
5. **Conclusion**: To achieve true zero hardcoded strings and international readiness, the application requires:
   - Defining a complete set of missing keys in `src/i18n/translations.ts` across `ru`, `en`, and the other 8 languages.
   - Importing `useI18n` in all aforementioned components and replacing all raw strings and fallbacks with `t(key)`.

---

## 3. Comprehensive Key Registry & Proposed Translations

Below is the dictionary of proposed keys to add to `src/i18n/translations.ts` for US English (`en`) and Russian (`ru`):

### 3.1 Calculator Module Keys

```json
{
  "ru": {
    "calcClearAll": "Очистить всё",
    "calcOpenParen": "Открывающая скобка",
    "calcCloseParen": "Закрывающая скобка",
    "calcDivide": "Деление",
    "calcMultiply": "Умножение",
    "calcSubtract": "Вычитание",
    "calcAdd": "Сложение",
    "calcBackspace": "Стереть символ",
    "calcDecimalPoint": "Точка",
    "calcPercent": "Процент",
    "calcEquals": "Вычислить результат",
    "calcClearHistoryTitle": "Очистить историю",
    "calcClearHistoryConfirm": "Вы уверены, что хотите удалить все сохраненные вычисления?",
    "calcRecordsCount": "Записей: {count}",
    "calcClearHistoryA11y": "Очистить историю вычислений",
    "calcHistoryEmptyTitle": "История вычислений пуста",
    "calcHistoryEmptyDesc": "Результаты вычислений будут сохраняться здесь автоматически.",
    "calcInsertExpression": "Вставить выражение: {expr}",
    "calcInsertResult": "Вставить результат: {res}",
    "wholePart": "Целая",
    "numerator": "Числитель",
    "denominator": "Знаменатель",
    "result": "Результат",
    "fractionStepSolution": "Пошаговое решение:",
    "fractionErrorDenomZero": "Знаменатель должен быть больше нуля",
    "fractionErrorDivideZero": "Деление на ноль невозможно",
    "calcError": "Ошибка",
    "calcDivisionByZero": "Деление на ноль"
  },
  "en": {
    "calcClearAll": "Clear all",
    "calcOpenParen": "Open parenthesis",
    "calcCloseParen": "Close parenthesis",
    "calcDivide": "Divide",
    "calcMultiply": "Multiply",
    "calcSubtract": "Subtract",
    "calcAdd": "Add",
    "calcBackspace": "Backspace",
    "calcDecimalPoint": "Decimal point",
    "calcPercent": "Percentage",
    "calcEquals": "Calculate result",
    "calcClearHistoryTitle": "Clear History",
    "calcClearHistoryConfirm": "Are you sure you want to delete all saved calculations?",
    "calcRecordsCount": "Entries: {count}",
    "calcClearHistoryA11y": "Clear calculation history",
    "calcHistoryEmptyTitle": "Calculation history is empty",
    "calcHistoryEmptyDesc": "Calculation results will be saved here automatically.",
    "calcInsertExpression": "Insert expression: {expr}",
    "calcInsertResult": "Insert result: {res}",
    "wholePart": "Whole",
    "numerator": "Numerator",
    "denominator": "Denominator",
    "result": "Result",
    "fractionStepSolution": "Step-by-step solution:",
    "fractionErrorDenomZero": "Denominator must be greater than zero",
    "fractionErrorDivideZero": "Division by zero is impossible",
    "calcError": "Error",
    "calcDivisionByZero": "Division by zero"
  }
}
```

---

### 3.2 Grades Module Keys

```json
{
  "ru": {
    "gradesAnnual": "Годовая",
    "quarter1": "1 Четверть",
    "quarter2": "2 Четверть",
    "quarter3": "3 Четверть",
    "quarter4": "4 Четверть",
    "semester1": "1 Семестр",
    "semester2": "2 Семестр",
    "shortQ1": "1Ч",
    "shortQ2": "2Ч",
    "shortQ3": "3Ч",
    "shortQ4": "4Ч",
    "shortS1": "1С",
    "shortS2": "2С",
    "tabGrades": "Оценки",
    "gradesSelectSubject": "Выбрать предмет {name}",
    "addSubject": "Добавить предмет",
    "addSubjectShort": "Предмет",
    "subject": "Предмет",
    "subjectNameRequired": "Введите название предмета",
    "subjectNameLabel": "Название предмета:",
    "subjectNamePlaceholder": "Например: Геометрия",
    "targetGradeLabel": "Целевая оценка:",
    "targetGradeA11y": "Цель {target}",
    "cancel": "Отмена",
    "add": "Добавить",
    "gradesAnnualSummaryTitle": "Сводная годовая таблица",
    "gradesAnnualYear": "Год",
    "gradesAnnualFinal": "Итог",
    "weightOral": "1.0x Ответ",
    "weightTest": "1.5x Тест",
    "weightExam": "2.0x Контр.",
    "weightFinal": "3.0x Экзамен",
    "weightCoefficientA11y": "Коэффициент веса {label}",
    "addGradeA11y": "Добавить оценку {val}",
    "deleteLastGradeA11y": "Удалить последнюю оценку",
    "clearGradesA11y": "Очистить оценки за период",
    "clearGradesTitle": "Очистить оценки",
    "clearGradesConfirm": "Удалить все оценки по этому предмету за текущий период?",
    "selectPeriodA11y": "Выбрать период {period}",
    "periodSettingsA11y": "Настройки периодов и шкалы",
    "targetLabel": "Цель: {target}",
    "deleteSubjectA11y": "Удалить предмет {name}",
    "gradesCountAndWeight": "{count} оценок • вес: {weight}",
    "noGradesInPeriod": "Нет оценок за этот период",
    "addFirstGradeHint": "Нажмите на кнопки оценок ниже, чтобы добавить первую оценку.",
    "deleteGradeA11y": "Удалить оценку",
    "whatIfSimulator": "Симулятор «Что если?»",
    "whatIfA11y": "Калькулятор Что если",
    "strategyTitle": "Стратегия достижения цели",
    "selectTargetGradeA11y": "Выбрать целевую оценку {target}",
    "strategyAchievedTitle": "Цель уже достигнута!",
    "strategyAchievedDesc": "Текущий балл {avg} соответствует или превышает порог {threshold}. Главное — удерживать планку!",
    "strategyDirectTitle": "Прямой путь: нужно {count} оценок «{grade}»",
    "strategyDirectDesc": "Получив еще {count} высших оценок (весом 1.0), ваш средний балл поднимется до {projected} (порог: {threshold}).",
    "strategyMixedTitle": "Смешанный вариант:",
    "strategyMixedDesc": "{fives} пятерок и {fours} четверок → средний балл: {projected}",
    "strategyRemediationTitle": "Исправление оценки:",
    "strategyRemediationDesc": "Пересдайте оценку «{low}» на «{top}» → прогноз балла: {projected} {achieved}",
    "strategyRemediationAchieved": "(цель будет достигнута!)",
    "thresholdErrorValidNumbers": "Введите корректные числовые значения",
    "thresholdErrorPositive": "Пороги должны быть больше 0",
    "thresholdErrorDescending": "Пороги должны убывать: (5) > (4) > (3)",
    "thresholdErrorNonNegative": "Пороги не могут быть отрицательными",
    "thresholdErrorDescendingUS": "Пороги должны убывать: A > B > C > D",
    "thresholdModalTitle": "Настройки оценок",
    "gradingScaleLabel": "Шкала оценивания:",
    "academicPeriodsLabel": "Учебные периоды:",
    "quarters4": "4 Четверти",
    "semesters2": "2 Семестра",
    "roundingThresholdsTitle": "Пороги округления оценок:",
    "threshold5Label": "5 (Отлично): от",
    "threshold4Label": "4 (Хорошо): от",
    "threshold3Label": "3 (Удовл.): от",
    "threshold2Note": "• 2 (Неудовл.): ниже {val}",
    "thresholdALabel": "A (4.0 GPA): от",
    "thresholdBLabel": "B (3.0 GPA): от",
    "thresholdCLabel": "C (2.0 GPA): от",
    "thresholdDLabel": "D (1.0 GPA): от",
    "thresholdFNote": "• F (0.0 GPA): ниже {val}",
    "resetDefault": "По умолчанию",
    "done": "Готово",
    "closeSimulatorA11y": "Закрыть симулятор",
    "subjectPrefix": "Предмет: {name}",
    "hypotheticalGradeLabel": "Гипотетическая оценка:",
    "selectGradeA11y": "Выбрать оценку {grade}",
    "gradeWeightLabel": "Вес оценки:",
    "gradeWeightA11y": "Вес {label}",
    "currentScoreLabel": "Текущий",
    "projectedScoreLabel": "Прогноз",
    "changeScoreLabel": "Изменение",
    "cancelSimulationA11y": "Отменить симуляцию",
    "applyHypoGradeA11y": "Применить гипотетическую оценку",
    "apply": "Применить"
  },
  "en": {
    "gradesAnnual": "Annual",
    "quarter1": "Quarter 1",
    "quarter2": "Quarter 2",
    "quarter3": "Quarter 3",
    "quarter4": "Quarter 4",
    "semester1": "Semester 1",
    "semester2": "Semester 2",
    "shortQ1": "Q1",
    "shortQ2": "Q2",
    "shortQ3": "Q3",
    "shortQ4": "Q4",
    "shortS1": "S1",
    "shortS2": "S2",
    "tabGrades": "Grades",
    "gradesSelectSubject": "Select subject {name}",
    "addSubject": "Add Subject",
    "addSubjectShort": "Subject",
    "subject": "Subject",
    "subjectNameRequired": "Please enter subject name",
    "subjectNameLabel": "Subject Name:",
    "subjectNamePlaceholder": "e.g. Geometry",
    "targetGradeLabel": "Target Grade:",
    "targetGradeA11y": "Target {target}",
    "cancel": "Cancel",
    "add": "Add",
    "gradesAnnualSummaryTitle": "Annual Summary Table",
    "gradesAnnualYear": "Year",
    "gradesAnnualFinal": "Final",
    "weightOral": "1.0x Oral",
    "weightTest": "1.5x Test",
    "weightExam": "2.0x Quiz",
    "weightFinal": "3.0x Exam",
    "weightCoefficientA11y": "Weight coefficient {label}",
    "addGradeA11y": "Add grade {val}",
    "deleteLastGradeA11y": "Delete last grade",
    "clearGradesA11y": "Clear grades for period",
    "clearGradesTitle": "Clear Grades",
    "clearGradesConfirm": "Delete all grades for this subject in the current period?",
    "selectPeriodA11y": "Select period {period}",
    "periodSettingsA11y": "Period and grading scale settings",
    "targetLabel": "Target: {target}",
    "deleteSubjectA11y": "Delete subject {name}",
    "gradesCountAndWeight": "{count} grades • weight: {weight}",
    "noGradesInPeriod": "No grades for this period",
    "addFirstGradeHint": "Tap the grade buttons below to add your first grade.",
    "deleteGradeA11y": "Delete grade",
    "whatIfSimulator": "\"What-If\" Simulator",
    "whatIfA11y": "What-If Calculator",
    "strategyTitle": "Target Achievement Strategy",
    "selectTargetGradeA11y": "Select target grade {target}",
    "strategyAchievedTitle": "Goal already achieved!",
    "strategyAchievedDesc": "Current score {avg} meets or exceeds threshold {threshold}. Keep it up!",
    "strategyDirectTitle": "Direct path: need {count} grades of \"{grade}\"",
    "strategyDirectDesc": "By earning {count} more top grades (weight 1.0), your average will rise to {projected} (threshold: {threshold}).",
    "strategyMixedTitle": "Mixed alternative:",
    "strategyMixedDesc": "{fives} top and {fours} second grades → average: {projected}",
    "strategyRemediationTitle": "Grade retake:",
    "strategyRemediationDesc": "Retake grade \"{low}\" to \"{top}\" → projected average: {projected} {achieved}",
    "strategyRemediationAchieved": "(goal will be achieved!)",
    "thresholdErrorValidNumbers": "Please enter valid numeric values",
    "thresholdErrorPositive": "Thresholds must be greater than 0",
    "thresholdErrorDescending": "Thresholds must decrease: (5) > (4) > (3)",
    "thresholdErrorNonNegative": "Thresholds cannot be negative",
    "thresholdErrorDescendingUS": "Thresholds must decrease: A > B > C > D",
    "thresholdModalTitle": "Grade Settings",
    "gradingScaleLabel": "Grading scale:",
    "academicPeriodsLabel": "Academic periods:",
    "quarters4": "4 Quarters",
    "semesters2": "2 Semesters",
    "roundingThresholdsTitle": "Grade rounding thresholds:",
    "threshold5Label": "5 (Excellent): from",
    "threshold4Label": "4 (Good): from",
    "threshold3Label": "3 (Satisfactory): from",
    "threshold2Note": "• 2 (Unsatisfactory): below {val}",
    "thresholdALabel": "A (4.0 GPA): from",
    "thresholdBLabel": "B (3.0 GPA): from",
    "thresholdCLabel": "C (2.0 GPA): from",
    "thresholdDLabel": "D (1.0 GPA): from",
    "thresholdFNote": "• F (0.0 GPA): below {val}",
    "resetDefault": "Defaults",
    "done": "Done",
    "closeSimulatorA11y": "Close simulator",
    "subjectPrefix": "Subject: {name}",
    "hypotheticalGradeLabel": "Hypothetical grade:",
    "selectGradeA11y": "Select grade {grade}",
    "gradeWeightLabel": "Grade weight:",
    "gradeWeightA11y": "Weight {label}",
    "currentScoreLabel": "Current",
    "projectedScoreLabel": "Projected",
    "changeScoreLabel": "Change",
    "cancelSimulationA11y": "Cancel simulation",
    "applyHypoGradeA11y": "Apply hypothetical grade",
    "apply": "Apply"
  }
}
```

---

### 3.3 Auth Module & Offline Banner Keys

```json
{
  "ru": {
    "onlineRestored": "Связь восстановлена • Синхронизация",
    "offlineModeDesc": "Автономный режим • Данные сохранены локально",
    "authSubtitleSync": "Войдите, чтобы синхронизировать данные",
    "authOrWithEmail": "или через Email",
    "authPasswordSent": "Письмо для сброса пароля отправлено",
    "authNoAccountSignUp": "Нет аккаунта? Зарегистрироваться",
    "authHaveAccountSignIn": "Уже есть аккаунт? Войти",
    "authSyncDevicesDesc": "Для синхронизации данных между устройствами",
    "authErrorFillFields": "Заполните все поля",
    "authErrorEnterEmailPassword": "Введите email и пароль",
    "authErrorEnterEmailReset": "Введите email для сброса пароля",
    "authErrorPasswordMin6": "Пароль должен содержать не менее 6 символов",
    "authErrorSendMailFailed": "Не удалось отправить письмо",
    "authErrorGoogleSignInPrompt": "Не удалось открыть окно входа Google. Проверьте подключение",
    "authErrorPopupBlocked": "Всплывающее окно заблокировано браузером. Разрешите всплывающие окна",
    "authErrorAccountExistsDiff": "Аккаунт с таким email уже существует через другой способ входа",
    "authErrorGithubPrompt": "Не удалось завершить вход через GitHub. Проверьте подключение",
    "namePlaceholder": "Имя",
    "passwordPlaceholderMin6": "Пароль (минимум 6 символов)"
  },
  "en": {
    "onlineRestored": "Connection restored • Syncing",
    "offlineModeDesc": "Offline mode • Data saved locally",
    "authSubtitleSync": "Sign in to sync your data",
    "authOrWithEmail": "or with Email",
    "authPasswordSent": "Password reset email sent",
    "authNoAccountSignUp": "Don't have an account? Sign Up",
    "authHaveAccountSignIn": "Already have an account? Sign In",
    "authSyncDevicesDesc": "To sync data between your devices",
    "authErrorFillFields": "Please fill in all fields",
    "authErrorEnterEmailPassword": "Enter email and password",
    "authErrorEnterEmailReset": "Enter email to reset password",
    "authErrorPasswordMin6": "Password must be at least 6 characters",
    "authErrorSendMailFailed": "Failed to send reset email",
    "authErrorGoogleSignInPrompt": "Failed to open Google sign-in. Check connection",
    "authErrorPopupBlocked": "Popup blocked by browser. Allow popups",
    "authErrorAccountExistsDiff": "An account with this email already exists via another provider",
    "authErrorGithubPrompt": "Failed to complete GitHub sign-in. Check connection",
    "namePlaceholder": "Name",
    "passwordPlaceholderMin6": "Password (minimum 6 characters)"
  }
}
```

---

## 4. Caveats

1. **Other 8 Languages Coverage**: Currently, `translations.ts` has existing translations for `uk`, `be`, `kk`, `es`, `de`, `fr`, `zh`, `tr`, but none of the new keys (neither those added in commit 6f995cc nor the newly proposed ones) exist in these 8 languages. Because `I18nContext.tsx` falls back to `ru` then `en`, all new keys will cleanly fall back without crash, but should eventually be translated into all 10 languages.
2. **Initial AsyncStorage State**: When existing users have stored grades or notes, their old subject names ('Алгебра', 'Русский язык') and note titles were already written into SQLite/AsyncStorage in Russian. New installations should initialize default subjects in the user's active locale.
3. **External Third-Party Services**: Error messages returned directly by Firebase Auth (e.g. `e.message`) should always be mapped to predefined localized translation keys using error codes (`e.code`) rather than rendering raw error messages.

---

## 5. Conclusion

- **Audit Coverage**: 100% of screens, modals, cards, keypad buttons, accessibility labels, and navigation tabs were inspected.
- **Root Cause of Lingering Russian in US English**:
  1. Missing dictionary entries in `src/i18n/translations.ts` (forcing fallback to `|| 'Russian'`).
  2. Components that omitted importing `useI18n` and hardcoded Russian text in JSX, alerts, and placeholders.
- **Action Plan**:
  1. Add the 70+ missing keys specified above to `ru` and `en` in `src/i18n/translations.ts`.
  2. In `src/modules/calculator/`: Replace accessibility labels in `StandardCalculatorView.tsx`, alerts & labels in `HistoryTapeView.tsx`, labels in `MixedFractionInput.tsx` and `FractionCalculatorView.tsx`.
  3. In `src/modules/grades/`: Connect `useI18n` to `GradesScreen.tsx`, `AddSubjectModal.tsx`, `AnnualTableCard.tsx`, `GradeInputKeypad.tsx`, `PeriodSelectorBar.tsx`, `SubjectDetailCard.tsx`, `StrategyEngineCard.tsx`, `ThresholdsModal.tsx`, and `WhatIfModal.tsx`.
  4. In `src/modules/auth/`: Connect `useI18n` to `LoginScreen.tsx` and `RegisterScreen.tsx`.
  5. In `src/components/common/`: Ensure `OfflineBanner.tsx` keys are mapped in `translations.ts`.

---

## 6. Verification Method

To verify the audit findings independently:
1. **Search for remaining Cyrillic in source code**:
   ```powershell
   cd c:\projects\SmartStudyHub\mobile-expo
   rg "[А-Яа-яЁё]" src/ --glob "!src/i18n/translations.ts"
   ```
   *Expected result prior to implementation*: Over 350 lines returned.
   *Target after implementation*: 0 lines returned (except purely internal comments or locale IDs).
2. **Typecheck verification**:
   ```powershell
   cd c:\projects\SmartStudyHub\mobile-expo
   npm run typecheck
   ```
   *Expected result*: 0 TypeScript errors.
3. **Locale Switching Validation**:
   - Launch app or inspect rendered test components.
   - Switch language to `en` in Settings.
   - Verify Calculator tabs, keypad accessibility labels, history tape, fraction whole/numerator/denominator, grades periods ("Quarter 1", "Annual"), weight pills ("1.0x Oral"), What-If modal, Add Subject modal, Thresholds modal, and Login screen render 100% in English without a single Russian word.
