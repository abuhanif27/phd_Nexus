# Windows Backend Startup Script for PhD NexusCare
# Run this from backend directory

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Green
Write-Host "PhD NexusCare Backend - Windows Startup" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# Check if venv exists
if (!(Test-Path ".venv")) {
    Write-Host "✗ Virtual environment not found!" -ForegroundColor Red
    Write-Host "Please run: ..\setup-windows.ps1" -ForegroundColor Yellow
    exit 1
}

# Activate venv
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& ".venv\Scripts\Activate.ps1"

# Check CORS settings
Write-Host "Checking CORS configuration..." -ForegroundColor Yellow
$settingsContent = Get-Content "nexuscare\settings.py" -Raw
if ($settingsContent -match "localhost:3000") {
    Write-Host "✓ CORS configured for frontend port 3000" -ForegroundColor Green
} else {
    Write-Host "⚠ Warning: CORS may not be configured for port 3000" -ForegroundColor Yellow
}

# Create .env if not exists
if (!(Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env" -Force 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ .env file created from template" -ForegroundColor Green
    } else {
        Write-Host "⚠ No .env.example found, using defaults" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Starting Django development server..." -ForegroundColor Cyan
Write-Host "Backend will be available at http://localhost:8000" -ForegroundColor White
Write-Host "Admin panel at http://localhost:8000/admin" -ForegroundColor White
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Start the server
python manage.py runserver 0.0.0.0:8000

