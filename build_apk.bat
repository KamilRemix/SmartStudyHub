@echo off
chcp 65001 >nul
echo ====================================================
echo   SmartStudyHub - Android APK Builder
echo ====================================================
echo.

cd /d "%~dp0"
echo [1/4] Building web assets...
call npm run build:web
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Web build failed.
    exit /b %ERRORLEVEL%
)

echo.
echo [2/4] Syncing Capacitor Android assets...
call npx.cmd cap sync android
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Capacitor sync failed.
    exit /b %ERRORLEVEL%
)

echo.
echo [3/4] Building APK with Gradle...
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "PATH=%JAVA_HOME%\bin;%PATH%"
cd /d "%~dp0android"
call gradlew.bat assembleDebug
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Gradle build failed.
    exit /b %ERRORLEVEL%
)

cd /d "%~dp0"
echo.
echo [4/4] Copying APK to SmartStudyHub.apk...
copy /y "android\app\build\outputs\apk\debug\app-debug.apk" "SmartStudyHub.apk" >nul

echo.
echo ====================================================
echo   SUCCESS! APK is ready:
echo   %~dp0SmartStudyHub.apk
echo ====================================================

