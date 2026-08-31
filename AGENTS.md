# Agent Rules and Project Guidelines

## Git & Version Control (СТРОГОЕ ПРАВИЛО)
- После реализации КАЖДОЙ задачи, фичи или исправления агент ОБЯЗАН делать коммит:
  `git add .` и `git commit -m "тип(компонент): понятное описание изменений"`
- Никогда не выполнять скрытые или неконтролируемые откаты (`git reset --hard` / `git checkout .`), которые могут уничтожить код пользователя.

## Typography & Fonts
- Для типографики использовать ИСКЛЮЧИТЕЛЬНО Google Fonts (например, Inter, Roboto, Montserrat) через стандартный <link> в head, либо локально подключенные шрифты проекта. Сторонние непроверенные CDN для шрифтов запрещены.

## Firebase Configuration
- Запрещено создавать новые проекты Firebase или переключать проект.
- Единственный разрешенный проект: `studio-9933447149-80d6a` (Hosting site: `studio-9933447149-80d6a`, URL: https://studio-9933447149-80d6a.web.app/).
- Запрещено использовать команду `firebase projects:create` или менять конфигурацию проекта без прямого указания пользователя.

## UI & Design Rules
- Категорически ЗАПРЕЩЕНО использовать эмодзи (никаких 🚫, 🛡️, ✨, 📱, 🎉, 🚀 и т.д.) в интерфейсе приложения, модальных окнах, уведомлениях и кнопках.
- Для иконок использовать исключительно векторную библиотеку Feather Icons (feather-icons) или нативный SVG.

## File Safety & Code Quality
- Сохранять все файлы строго в кодировке UTF-8 без BOM.
- Не использовать блокирующие заглушки `if (false)` и всплывающие окна `alert()` для обработки ошибок (только console.error / console.warn).

## Firebase Auth Scopes
- ��� ��������� Google Sign-In ��������� ��������� ������������� ���������� (��������, YouTube � Google Drive) � ����� �������, ��� �������� Error 400: invalid_request. ������������ ������ ������� profile � email.

## Social Sign-In Buttons (Modern UI)
- ��������� ������������ ���������� HTML/CSS ����� �� 2010-�. ������ ����������� ����������� �������� � ����� �������:
  - VK: ��� #0077FF, ����� ����� � �������.
  - GitHub: ��� #24292e ��� #000000, ����� �����.
  - Google: ����� ���, ����� #3c4043, ������� #dadce0.
  - �������: ������� �������� (cubic-bezier), ���� (box-shadow) � transform (translateY(-2px)) ��� hover.

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
