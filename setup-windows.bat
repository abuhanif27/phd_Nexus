@echo off
REM Windows Command Prompt Setup Script for PhD NexusCare
REM Run as Administrator

echo ==========================================
echo PhD NexusCare - Windows Setup Script
echo ==========================================
echo.

REM Check Python
echo Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found!
    echo Please install Python 3.10+ from https://www.python.org/downloads/
    echo During installation, make sure to check "Add Python to PATH"
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo [OK] %PYTHON_VERSION%
echo.

REM Navigate to backend
echo Setting up Backend...
cd backend

REM Create virtual environment
if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment!
        pause
        exit /b 1
    )
)

REM Activate virtual environment
echo Activating virtual environment...
call .venv\Scripts\activate.bat

REM Install requirements
echo Installing Python packages (this may take 2-3 minutes)...
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install requirements!
    pause
    exit /b 1
)

REM Download spaCy model
echo Downloading spaCy language model...
python -m spacy download en_core_web_sm

REM Run migrations
echo Setting up database...
python manage.py migrate
if errorlevel 1 (
    echo ERROR: Failed to run migrations!
    pause
    exit /b 1
)

REM Go back and setup frontend
cd ..
echo.
echo Setting up Frontend...
cd frontend-react

REM Install Node packages
if not exist "node_modules" (
    echo Installing Node.js packages...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install Node packages!
        pause
        exit /b 1
    )
)

echo.
echo ==========================================
echo [OK] Setup Complete!
echo ==========================================
echo.
echo Next steps:
echo 1. Create admin account: cd backend ^&^& python manage.py createsuperuser
echo 2. Start backend: .\start-backend-windows.bat
echo 3. Start frontend: cd frontend-react ^&^& npm run dev
echo.
pause
