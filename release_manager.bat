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

echo.
echo [5/5] Создаем релиз на GitHub (требуется установленный gh CLI)...
:: Замените dist\SmartStudyHub*.exe на точное имя вашего файла, если оно отличается
for %%f in (dist\SmartStudyHub-Setup-*.exe) do (
    gh release create v1.0.0 "%%f" --title "SmartStudyHub v1.0.0" --notes "First stable release! Includes AI assistant, Smart Notes, Grade Calculator, and more."
)
echo Релиз на GitHub создан!

echo.
echo Готово!
pause
