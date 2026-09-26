@echo off
chcp 65001 >nul
echo ====================================================
echo   SmartStudyHub - One-Click Android ADB Installer
echo ====================================================
echo.

set  ADB_PATH=C:\Android\Sdk\platform-tools\adb.exe
if not exist %ADB_PATH% (
    set ADB_PATH=adb
)

echo [1/3] Checking connected Android devices...
%ADB_PATH% devices
echo.

echo [2/3] Waiting for device...
%ADB_PATH% wait-for-device
echo [OK] Device detected!
echo.

echo [3/3] Installing SmartStudyHub.apk...
cd /d %~dp0
if not exist SmartStudyHub.apk (
    if exist android\app\build\outputs\apk\debug\app-debug.apk (
        copy /y android\app\build\outputs\apk\debug\app-debug.apk SmartStudyHub.apk >nul
    ) else (
        echo [ERROR] SmartStudyHub.apk not found. Please run build_apk.bat first.
        pause
        exit /b 1
    )
)

%ADB_PATH% install -r -d -g SmartStudyHub.apk
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Installation failed.
    echo Ensure USB debugging is enabled on your phone and you authorized this computer.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ====================================================
echo   SUCCESS! SmartStudyHub is installed on your phone!
echo ====================================================
echo Launching app...
%ADB_PATH% shell am start -n com.smartstudyhub.mobile/.MainActivity
pause
