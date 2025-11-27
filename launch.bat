@echo off
REM PhD NexusCare - Complete Launch Script for Windows
REM Starts both backend and frontend servers

echo ===========================================
echo PhD NexusCare Launch Script (Windows)
echo ===========================================
echo.

REM Get script directory
set SCRIPT_DIR=%~dp0
set BACKEND_DIR=%SCRIPT_DIR%backend
set FRONTEND_DIR=%SCRIPT_DIR%frontend

REM Check if directories exist
if not exist "%BACKEND_DIR%" (
    echo [ERROR] Backend directory not found!
    pause
    exit /b 1
)

if not exist "%FRONTEND_DIR%" (
    echo [ERROR] Frontend directory not found!
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist "%BACKEND_DIR%\.venv\Scripts\activate.bat" (
    echo [ERROR] Backend virtual environment not found!
    echo Please run setup.bat in the backend folder first
    pause
    exit /b 1
)

echo Starting PhD NexusCare...
echo.

REM Start backend in new window
echo [1/2] Starting Backend API...
start "NexusCare Backend" cmd /k "cd /d "%BACKEND_DIR%" && call .venv\Scripts\activate.bat && python manage.py runserver"

REM Wait a moment
timeout /t 3 /nobreak > nul

REM Start frontend in new window
echo [2/2] Starting Frontend Server...
start "NexusCare Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && python -m http.server 8080"

REM Wait a moment
timeout /t 2 /nobreak > nul

echo.
echo ===========================================
echo PhD NexusCare is Running!
echo ===========================================
echo.
echo Access Points:
echo   Frontend:    http://localhost:8080
echo   Backend API: http://localhost:8000/api
echo   Admin Panel: http://localhost:8000/admin
echo.
echo Demo Accounts:
echo   Patient: patient@example.com / Pass1234!
echo   Doctor:  doctor@example.com / Pass1234!
echo.
echo To stop: Close the two command windows that opened
echo Or run: stop-all.bat
echo.
echo ===========================================
echo.

REM Open browser
echo Opening browser...
timeout /t 2 /nobreak > nul
start http://localhost:8080

echo.
echo Ready! Press any key to close this window...
pause > nul
