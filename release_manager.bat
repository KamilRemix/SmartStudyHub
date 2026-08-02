@echo off
echo ========================================================
echo   SmartStudyHub - Cleanup, Build, Deploy, and Release
echo ========================================================

echo.
echo [1/5] Убираем следы ИИ и лишние markdown-описания...
del /Q DEPLOY_ELECTRON_AUTH.md 2>NUL
del /Q ELECTRON_GOOGLE_AUTH.md 2>NUL
del /Q RELEASE_NOTES.md 2>NUL
del /Q _deploy.bat 2>NUL
echo Успешно удалено.

echo.
echo [2/5] Собираем веб-версию и деплоим на Firebase...
call npm run build:web
call firebase deploy
echo Firebase деплой завершен.

echo.
echo [3/5] Заливаем актуальный код на GitHub...
git add .
git commit -m "chore: cleanup project, remove AI logs, deploy to Firebase"
git push origin main
echo Код загружен на GitHub.

echo.
echo [4/5] Собираем приложение Electron (.exe)...
call npm run build
echo Сборка Electron завершена.

echo [5/5] Создаем релиз на GitHub (требуется установленный gh CLI)...
:: Получаем версию из package.json
set "VERSION="
for /f "tokens=2 delims=:," %%a in ('findstr "\"version\":" package.json') do (
    set "VERSION=%%a"
)
if not defined VERSION (
    set "VERSION=1.0.0"
) else (
    set "VERSION=%VERSION: =%"
    set "VERSION=%VERSION:"=%"
    set "VERSION=%VERSION:,=%"
)

:: Поиск файла .exe в папке dist
set "EXE_FILE="
for %%f in ("dist\SmartStudyHub Setup *.exe" "dist\SmartStudyHub-Setup-*.exe" "dist\SmartStudyHub.Setup.*.exe" "dist\SmartStudyHub*.exe") do (
    if exist "%%f" set "EXE_FILE=%%f"
)

if not defined EXE_FILE (
    echo [ОШИБКА] Не удалось найти собранный .exe в папке dist!
    goto end
)

echo Найден исполняемый файл: %EXE_FILE%
echo Версия релиза: v%VERSION%

:: Проверяем, существует ли уже релиз на GitHub
gh release view v%VERSION% >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Релиз v%VERSION% уже существует. Загружаем ассет в существующий релиз...
    gh release upload v%VERSION% "%EXE_FILE%" --clobber
    echo Ассет успешно добавлен/обновлен!
) else (
    echo Создаем новый релиз v%VERSION%...
    gh release create v%VERSION% "%EXE_FILE%" --title "SmartStudyHub v%VERSION%" --notes "First stable release! Includes AI assistant, Smart Notes, Grade Calculator, and more."
    echo Релиз на GitHub создан!
)

:end
echo.
echo Готово!
pause

