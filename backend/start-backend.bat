@echo off
REM PhD NexusCare Backend Start Script for Windows

echo ===========================================
echo PhD NexusCare Backend Server (Windows)
echo ===========================================
echo.

REM Get script directory
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

REM Check if virtual environment exists
if not exist ".venv\Scripts\activate.bat" (
    echo [ERROR] Virtual environment not found!
    echo Please run setup.bat first
    pause
    exit /b 1
)

REM Activate virtual environment
echo Activating virtual environment...
call .venv\Scripts\activate.bat

echo.
echo Starting Django server...
echo.
echo [OK] Backend will be available at:
echo     http://localhost:8000
echo     http://localhost:8000/api/
echo     http://localhost:8000/admin/
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start Django server
python manage.py runserver
