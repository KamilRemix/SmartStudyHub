# Agent Rules and Project Guidelines

## Рыночная ориентация
- Наше приложение ориентировано в первую очередь на рынок США (глобальный англоязычный сегмент).

## Android APK & Build Distribution (СТРОГОЕ ПРАВИЛО)
- APK файл ВСЕГДА должен называться строго `SmartStudyHub.apk` без каких-либо суффиксов версий, дат, веток или тегов (никаких `SmartStudyHub-v1.4.0-test.apk` и т.п.).
- Запрещено создавать вложенные подпапки для хранения APK (никаких `latest-apk`, `SmartStudyHub-Android-APK` и т.д.). Все локальные сборки помещаются строго в `build_artifacts/SmartStudyHub.apk`.
- Каждый новый билд ОБЯЗАН перезаписывать предыдущий файл `SmartStudyHub.apk`, а любые старые временные сборки немедленно удаляются. В репозитории и релизах всегда должен быть строго один актуальный APK.
- Основной актуальный APK приложения строится из платформы Capacitor (`android/`), куда компилируется весь веб-код (`public/` -> `dist/`) со всеми новыми функциями (AI Assistant, Генератор презентаций, Калькулятор и др.). Не собирать устаревший `mobile-expo`, если пользователь тестирует актуальный функционал.

## Git & Version Control (СТРОГОЕ ПРАВИЛО)
- После реализации КАЖДОЙ задачи, фичи или исправления агент ОБЯЗАН делать коммит:
  `git add .` и `git commit -m "тип(компонент): понятное описание изменений"`
- Никогда не выполнять скрытые или неконтролируемые откаты (`git reset --hard` / `git checkout .`), которые могут уничтожить код пользователя.

## Typography & Fonts
- Для типографики использовать ИСКЛЮЧИТЕЛЬНО Google Fonts (например, Inter, Roboto, Montserrat) через стандартный <link> в head, либо локально подключенные шрифты проекта. Сторонние непроверенные CDN для шрифтов запрещены. Либо свой стиль.

## Firebase Configuration
- Запрещено создавать новые проекты Firebase или переключать проект.
- Единственный разрешенный проект: `studio-9933447149-80d6a` (Hosting site: `studio-9933447149-80d6a`, URL: https://studio-9933447149-80d6a.web.app/).
- Запрещено использовать команду `firebase projects:create` или менять конфигурацию проекта без прямого указания пользователя.
- Не создавать новые имена пакетов, чтобы не было путаницы.

## UI & Design Rules
- Категорически ЗАПРЕЩЕНО использовать эмодзи (никаких эмодзи в интерфейсе приложения, модальных окнах, уведомлениях и кнопках).
- Для иконок использовать исключительно векторную библиотеку Feather Icons (feather-icons) или нативный SVG.

## File Safety & Code Quality
- Сохранять все файлы строго в кодировке UTF-8 без BOM.
- Не использовать блокирующие заглушки `if (false)` и всплывающие окна `alert()` для обработки ошибок (только console.error / console.warn).

## Firebase Auth Scopes
- Для провайдера Google Sign-In запрещено добавлять дополнительные разрешения (например, YouTube и Google Drive) в один запрос, так как вызывает Error 400: invalid_request. Запрашивать только базовые profile и email.

## Social Sign-In Buttons (Modern UI)
- Запрещено использовать устаревшие стили. Кнопки авторизации оформлять в общем дизайне:
  - VK: фон #0077FF, белый текст и иконка.
  - GitHub: фон #24292e или #000000, белый текст.
  - Google: белый фон, текст #3c4043, граница #dadce0.
  - Плавные переходы (cubic-bezier), тени (box-shadow) и transform (translateY(-2px)) для hover.

## Russian Services Auth (VK, Yandex, etc.)
- Russian services (VK ID, Yandex ID, etc.) MUST use their own native SDK for authentication, NOT Firebase OIDC providers.
- VK login uses the VK ID SDK with PKCE OAuth 2.1 flow (window.signInWithVk). Do NOT route VK auth through firebase.auth().signInWithPopup() or signInWithRedirect().
- The VK auth session is managed independently: user data is stored in localStorage (ssh_vk_user) and the app's currentUser object.
- Only Google and GitHub use Firebase Auth (signInWithPopup/signInWithRedirect).
- NEVER replace the VK SDK login flow with Firebase OIDC. The VK SDK flow is tested and working.

## VK Button Visibility (Region-Based)
- The VK sign-in button is shown/hidden dynamically based on user region and language.
- Show VK button if: IP is from CIS countries (RU, BY, KZ, AM, AZ, KG, MD, TJ, TM, UZ) OR browser/system language is Russian.
- Hide VK button for: Ukraine (UA) and all non-CIS countries with non-Russian language.
- On Android: if installed from RuStore (ru.vk.store), always show VK button regardless of region.
- The CIS country list is defined in CIS_COUNTRY_CODES constant. Ukraine is explicitly excluded.
