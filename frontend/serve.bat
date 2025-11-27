@echo off
REM PhD NexusCare Frontend Server for Windows
REM Simple script to serve the frontend with Python

echo ===========================================
echo PhD NexusCare Frontend Server (Windows)
echo ===========================================
echo.

REM Get script directory
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

REM Check if we're in the frontend directory
if not exist "index.html" (
    echo [ERROR] index.html not found!
    echo Please run this script from the frontend directory.
    pause
    exit /b 1
)

echo Starting frontend server...
echo.
echo [OK] Frontend will be available at:
echo     http://localhost:8080
echo.
echo Make sure the backend is running at:
echo     http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo.
echo ===========================================
echo.

REM Start Python HTTP server
python -m http.server 8080
