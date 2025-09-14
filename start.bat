@echo off
echo Starting QR Attendance System...
echo.
echo Installing dependencies...
call npm install
echo.
echo Downloading face recognition models...
call npm run download-models
echo.
echo Starting server...
echo.
echo Teacher Interface: http://localhost:3000
echo Student Interface: http://localhost:3000/student
echo.
call npm start
pause
