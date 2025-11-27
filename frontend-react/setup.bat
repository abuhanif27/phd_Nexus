@echo off
REM NexusCare React Frontend Setup Script for Windows

echo ===========================================
echo NexusCare React Frontend Setup (Windows)
echo ===========================================
echo.

REM Get script directory
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

REM Check if Node.js is installed
echo Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js 20+ from: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=1 delims=v." %%a in ('node -v') do set NODE_MAJOR=%%a
echo [OK] Node.js found

echo Checking npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed!
    pause
    exit /b 1
)
echo [OK] npm found
echo.

REM Install dependencies
echo Installing dependencies (this may take a few minutes)...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed
echo.

REM Create .env.local if it doesn't exist
if not exist ".env.local" (
    echo Creating .env.local with default values...
    (
        echo # API Configuration
        echo NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
        echo NEXT_PUBLIC_APP_NAME=NexusCare
        echo.
        echo # Environment
        echo NEXT_PUBLIC_ENV=development
        echo.
        echo # Feature Flags (optional)
        echo NEXT_PUBLIC_ENABLE_MSW=false
    ) > .env.local
    echo [OK] .env.local created
) else (
    echo [OK] .env.local already exists
)
echo.

echo ===========================================
echo Setup Complete!
echo ===========================================
echo.
echo Next Steps:
echo.
echo 1. Make sure your Django backend is running:
echo    cd ..\backend
echo    .venv\Scripts\activate
echo    python manage.py runserver
echo.
echo 2. Start the development server:
echo    npm run dev
echo.
echo 3. Open your browser:
echo    http://localhost:3000
echo.
echo 4. Login with your Django credentials
echo.
echo ===========================================
echo.
echo Useful commands:
echo    npm run dev          - Start dev server
echo    npm run build        - Build for production
echo    npm test             - Run unit tests
echo    npm run lint         - Lint code
echo    npm run typecheck    - Check types
echo.
pause
