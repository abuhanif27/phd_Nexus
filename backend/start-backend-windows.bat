@echo off
REM Windows Backend Startup Script for PhD NexusCare
REM Run from backend directory

echo ==========================================
echo PhD NexusCare Backend - Windows Startup
echo ==========================================
echo.

if not exist ".venv" (
    echo ERROR: Virtual environment not found!
    echo Please run ..\setup-windows.bat first
    pause
    exit /b 1
)

echo Activating virtual environment...
call .venv\Scripts\activate.bat

if not exist ".env" (
    echo Creating .env file...
    if exist ".env.example" (
        copy .env.example .env
        echo [OK] .env file created
    )
)

echo.
echo Starting Django development server...
echo Backend will be available at http://localhost:8000
echo Admin panel at http://localhost:8000/admin
echo Press Ctrl+C to stop
echo.

python manage.py runserver 0.0.0.0:8000
pause
