@echo off
echo ========================================
echo   FoodieGo WiFi Debug Setup
echo ========================================
echo.

echo Step 1: Getting your computer IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do set IP=%%a
echo Your IP Address: %IP%
echo.

echo Step 2: Connect your Android device via USB and enable USB debugging
echo.
echo Step 3: Setting up ADB over WiFi...
"%~dp0android\platform-tools\adb.exe" tcpip 5555
echo.
echo Step 4: Connecting to your device over WiFi...
"%~dp0android\platform-tools\adb.exe" connect %IP%:5555
echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Disconnect USB cable
echo 2. Start Metro: npm run start:wifi
echo 3. In app Dev Settings, set Metro to: %IP%:8081
echo.
pause
