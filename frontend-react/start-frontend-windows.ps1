# Windows Frontend Startup Script for PhD NexusCare
# Run this from frontend-react directory

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Green
Write-Host "PhD NexusCare Frontend - Windows Startup" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# Check if node_modules exists
if (!(Test-Path "node_modules")) {
    Write-Host "✗ Node modules not found!" -ForegroundColor Red
    Write-Host "Please run: npm install" -ForegroundColor Yellow
    exit 1
}

# Create .env if not exists
if (!(Test-Path ".env.local")) {
    Write-Host "Creating .env.local file..." -ForegroundColor Yellow
    $envContent = @"
# Frontend environment variables
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:8000
"@
    Set-Content ".env.local" $envContent
    Write-Host "✓ .env.local file created" -ForegroundColor Green
}

Write-Host ""
Write-Host "Starting Next.js development server..." -ForegroundColor Cyan
Write-Host "Frontend will be available at http://localhost:3000" -ForegroundColor White
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Start the server
npm run dev

