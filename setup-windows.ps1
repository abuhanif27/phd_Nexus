# Windows Setup Script for PhD NexusCare
# Run this with: powershell -ExecutionPolicy Bypass -File setup-windows.ps1

Write-Host "==========================================" -ForegroundColor Green
Write-Host "PhD NexusCare - Windows Setup Script" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# Check Python version
Write-Host "Checking Python installation..." -ForegroundColor Cyan
$pythonVersion = python --version 2>&1
if ($pythonVersion -match "Python") {
    Write-Host "✓ Found: $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Python not found!" -ForegroundColor Red
    Write-Host "Please install Python 3.10+ from https://www.python.org/downloads/" -ForegroundColor Yellow
    exit 1
}

# Navigate to backend
Write-Host ""
Write-Host "Setting up Backend..." -ForegroundColor Cyan
Set-Location backend

# Create virtual environment
if (!(Test-Path ".venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to create virtual environment!" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Virtual environment created" -ForegroundColor Green
} else {
    Write-Host "✓ Virtual environment already exists" -ForegroundColor Green
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& ".venv\Scripts\Activate.ps1"

# Install requirements
Write-Host "Installing Python packages (this may take 2-3 minutes)..." -ForegroundColor Yellow
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install requirements!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Python packages installed" -ForegroundColor Green

# Download spaCy model
Write-Host ""
Write-Host "Downloading spaCy language model..." -ForegroundColor Yellow
python -m spacy download en_core_web_sm
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ Warning: spaCy model download may have issues, but continuing..." -ForegroundColor Yellow
}

# Run migrations
Write-Host ""
Write-Host "Setting up database..." -ForegroundColor Yellow
python manage.py migrate
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to run migrations!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Database setup complete" -ForegroundColor Green

# Setup Frontend
Write-Host ""
Write-Host "Setting up Frontend..." -ForegroundColor Cyan
Set-Location ..\frontend-react

# Check Node.js
$nodeVersion = node --version 2>&1
if ($nodeVersion -match "v") {
    Write-Host "✓ Found Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "⚠ Node.js not found! Please install from https://nodejs.org/" -ForegroundColor Yellow
}

# Install frontend dependencies
if (!(Test-Path "node_modules")) {
    Write-Host "Installing Node.js packages..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to install Node packages!" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Node packages installed" -ForegroundColor Green
} else {
    Write-Host "✓ Node packages already installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "✓ Setup Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Create admin account: cd backend && python manage.py createsuperuser" -ForegroundColor White
Write-Host "2. Start backend: .\start-backend-windows.ps1" -ForegroundColor White
Write-Host "3. Start frontend: cd frontend-react && npm run dev" -ForegroundColor White
Write-Host ""
