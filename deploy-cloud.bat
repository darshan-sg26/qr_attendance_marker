@echo off
echo ========================================
echo QR Attendance System - Cloud Deployment
echo ========================================
echo.

echo Installing dependencies...
call npm install

echo.
echo Downloading face recognition models...
call npm run download-models

echo.
echo Starting cloud server...
echo.
echo Teacher Interface: http://localhost:3000
echo Student Interface: http://localhost:3000/student
echo.
echo Press Ctrl+C to stop the server
echo.

node cloud-server.js
pause
