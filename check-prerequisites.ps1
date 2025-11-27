# Windows Prerequisites Checker
# Run this to verify all dependencies are installed

Write-Host "PhD NexusCare - Windows Prerequisites Check" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

$allGood = $true

# Check Python
Write-Host "Checking Python..." -ForegroundColor Cyan
$pythonPath = Get-Command python -ErrorAction SilentlyContinue
if ($pythonPath) {
    $pythonVersion = python --version 2>&1
    Write-Host "✓ $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Python not found!" -ForegroundColor Red
    Write-Host "  Download from: https://www.python.org/downloads/" -ForegroundColor Yellow
    $allGood = $false
}

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Cyan
$nodePath = Get-Command node -ErrorAction SilentlyContinue
if ($nodePath) {
    $nodeVersion = node --version
    Write-Host "✓ Node.js $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Node.js not found (Optional)" -ForegroundColor Yellow
    Write-Host "  Download from: https://nodejs.org/" -ForegroundColor Yellow
}

# Check Git
Write-Host "Checking Git..." -ForegroundColor Cyan
$gitPath = Get-Command git -ErrorAction SilentlyContinue
if ($gitPath) {
    $gitVersion = git --version
    Write-Host "✓ $gitVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Git not found!" -ForegroundColor Red
    Write-Host "  Download from: https://git-scm.com/downloads" -ForegroundColor Yellow
    $allGood = $false
}

# Check Tesseract (optional but recommended)
Write-Host "Checking Tesseract OCR..." -ForegroundColor Cyan
$tesseractPath = "C:\Program Files\Tesseract-OCR\tesseract.exe"
if (Test-Path $tesseractPath) {
    Write-Host "✓ Tesseract OCR found" -ForegroundColor Green
} else {
    Write-Host "⚠ Tesseract OCR not found (Optional)" -ForegroundColor Yellow
    Write-Host "  Download from: https://github.com/UB-Mannheim/tesseract/wiki" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green

if ($allGood) {
    Write-Host "✓ All prerequisites installed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next: Run setup-windows.ps1" -ForegroundColor Cyan
} else {
    Write-Host "✗ Please install missing dependencies" -ForegroundColor Red
    Write-Host ""
    Write-Host "View SETUP_WINDOWS.md for detailed instructions" -ForegroundColor Cyan
}

Write-Host ""
