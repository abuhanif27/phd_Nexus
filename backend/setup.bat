@echo off
REM PhD NexusCare Backend Setup Script for Windows
REM This script sets up the complete backend environment

echo ===========================================
echo PhD NexusCare Backend Setup (Windows)
echo ===========================================
echo.

REM Get script directory
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo Working directory: %CD%
echo.

REM Check Python version
echo Checking Python version...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.10 or higher from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)
python --version
echo.

REM Create virtual environment
if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created
) else (
    echo [OK] Virtual environment already exists
)
echo.

REM Activate virtual environment
echo Activating virtual environment...
call .venv\Scripts\activate.bat

REM Upgrade pip
echo Upgrading pip...
python -m pip install --upgrade pip

REM Check if requirements.txt exists
if not exist "requirements.txt" (
    echo [ERROR] requirements.txt not found!
    echo Please ensure requirements.txt is in the backend directory
    pause
    exit /b 1
)

REM Install dependencies
echo Installing Python dependencies (this may take a few minutes)...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed
echo.

REM Check for Tesseract
echo Checking for Tesseract OCR...
tesseract --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Tesseract not found
    echo Please install Tesseract from: https://github.com/UB-Mannheim/tesseract/wiki
    echo After installation, add Tesseract to your PATH
) else (
    echo [OK] Tesseract found
)
echo.

REM Download spaCy model
echo Downloading spaCy language model...
python -m spacy download en_core_web_sm
if %errorlevel% neq 0 (
    echo [WARNING] Could not download spaCy model automatically
    echo Try running: python -m spacy download en_core_web_sm
    echo Or visit: https://spacy.io/models/en for manual download options
)
echo [OK] spaCy model setup complete
echo.

REM Set up environment file
if not exist ".env" (
    echo Creating .env file from template...
    if exist ".env.example" (
        copy .env.example .env
        echo [OK] .env file created
        echo Note: Edit .env file if you need custom settings
    ) else (
        echo [WARNING] .env.example not found, skipping .env creation
    )
) else (
    echo [OK] .env file already exists
)
echo.

REM Create directories
echo Creating required directories...
if not exist "media" mkdir media
if not exist "ai_models" mkdir ai_models
if not exist "ai_index" mkdir ai_index
echo [OK] Directories created
echo.

REM Run migrations
echo Running database migrations...
python manage.py migrate
if %errorlevel% neq 0 (
    echo [ERROR] Failed to run migrations
    pause
    exit /b 1
)
echo [OK] Database initialized
echo.

REM Seed demo data
echo Seeding demo data...
python manage.py seed_demo
echo [OK] Demo data seeded
echo.

REM Train specialist classifier
echo Training specialist classifier...
if exist "data\symptoms_train.csv" (
    python manage.py train_sklearn
    echo [OK] Classifier trained
) else (
    echo [WARNING] Training data not found at data\symptoms_train.csv
    echo Skipping classifier training
)
echo.

REM Summary
echo ===========================================
echo Setup Complete!
echo ===========================================
echo.
echo Demo Credentials:
echo   Patient: patient@example.com / Pass1234!
echo   Doctor: doctor@example.com / Pass1234!
echo.
echo To start the server:
echo   1. Open Command Prompt in backend folder
echo   2. Run: .venv\Scripts\activate
echo   3. Run: python manage.py runserver
echo.
echo Or use: start-backend.bat
echo.
echo API will be available at: http://localhost:8000/api/
echo Admin panel: http://localhost:8000/admin/
echo.
pause
