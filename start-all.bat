@echo off
REM NexusCare - Quick Start Script for Windows
REM This script starts both Django backend and React frontend servers

echo ===========================================
echo NexusCare Quick Start (Windows)
echo ===========================================
echo.

REM Get script directory
set SCRIPT_DIR=%~dp0

REM Check backend
echo Checking Backend...
if exist "%SCRIPT_DIR%backend\manage.py" (
    if exist "%SCRIPT_DIR%backend\.venv\Scripts\activate.bat" (
        echo [OK] Backend ready
    ) else (
        echo [WARNING] Backend venv not found. Run backend\setup.bat first
    )
) else (
    echo [ERROR] Django manage.py not found
)

REM Check frontend (vanilla JS)
echo Checking Frontend (Vanilla JS)...
if exist "%SCRIPT_DIR%frontend\index.html" (
    echo [OK] Frontend ready
) else (
    echo [WARNING] Frontend not found
)

REM Check frontend-react
echo Checking Frontend (React/Next.js)...
if exist "%SCRIPT_DIR%frontend-react\package.json" (
    echo [OK] React frontend found
) else (
    echo [WARNING] React frontend not found
)

echo.
echo ===========================================
echo Starting Services...
echo ===========================================
echo.

REM Start backend
echo [1/2] Starting Django Backend Server...
start "NexusCare Backend" cmd /k "cd /d "%SCRIPT_DIR%backend" && call .venv\Scripts\activate.bat && python manage.py runserver"
timeout /t 3 /nobreak > nul

REM Ask which frontend to start
echo.
echo Which frontend would you like to start?
echo   1. Vanilla JS (localhost:8080) - Simple, no build needed
echo   2. React/Next.js (localhost:3000) - Modern, feature-rich
echo   3. Both
echo.
set /p choice="Enter choice (1/2/3, default=1): "

if "%choice%"=="" set choice=1
if "%choice%"=="2" goto react
if "%choice%"=="3" goto both
goto vanilla

:vanilla
echo [2/2] Starting Vanilla JS Frontend...
start "NexusCare Frontend" cmd /k "cd /d "%SCRIPT_DIR%frontend" && python -m http.server 8080"
set FRONTEND_URL=http://localhost:8080
goto done

:react
echo [2/2] Starting React Frontend...
if not exist "%SCRIPT_DIR%frontend-react\node_modules" (
    echo Installing dependencies first...
    start "NexusCare React Install" cmd /k "cd /d "%SCRIPT_DIR%frontend-react" && npm install && npm run dev"
) else (
    start "NexusCare React" cmd /k "cd /d "%SCRIPT_DIR%frontend-react" && npm run dev"
)
set FRONTEND_URL=http://localhost:3000
goto done

:both
echo [2/3] Starting Vanilla JS Frontend...
start "NexusCare Frontend (Vanilla)" cmd /k "cd /d "%SCRIPT_DIR%frontend" && python -m http.server 8080"
echo [3/3] Starting React Frontend...
if not exist "%SCRIPT_DIR%frontend-react\node_modules" (
    start "NexusCare React Install" cmd /k "cd /d "%SCRIPT_DIR%frontend-react" && npm install && npm run dev"
) else (
    start "NexusCare React" cmd /k "cd /d "%SCRIPT_DIR%frontend-react" && npm run dev"
)
set FRONTEND_URL=http://localhost:8080
set REACT_URL=http://localhost:3000
goto done

:done
timeout /t 2 /nobreak > nul
echo.
echo ===========================================
echo NexusCare is Ready!
echo ===========================================
echo.
echo Access Points:
if "%choice%"=="3" (
    echo   Vanilla Frontend: http://localhost:8080
    echo   React Frontend:   http://localhost:3000
) else (
    echo   Frontend:         %FRONTEND_URL%
)
echo   Django Backend:   http://localhost:8000
echo   API Endpoints:    http://localhost:8000/api
echo   Admin Panel:      http://localhost:8000/admin
echo.
echo Demo Accounts:
echo   Patient: patient@example.com / Pass1234!
echo   Doctor:  doctor@example.com / Pass1234!
echo.
echo To stop all services: stop-all.bat
echo.

REM Open browser
echo Opening browser...
timeout /t 2 /nobreak > nul
start %FRONTEND_URL%
if "%choice%"=="3" (
    timeout /t 1 /nobreak > nul
    start %REACT_URL%
)

echo.
echo Press any key to close this window...
pause > nul
