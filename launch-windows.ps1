# Windows Full Launch Script for PhD NexusCare
# Starts both backend and frontend servers

Write-Host "==========================================" -ForegroundColor Green
Write-Host "PhD NexusCare - Windows Launch Script" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# Check directories
if (!(Test-Path "backend")) {
    Write-Host "✗ Backend directory not found!" -ForegroundColor Red
    exit 1
}

if (!(Test-Path "frontend-react")) {
    Write-Host "✗ Frontend directory not found!" -ForegroundColor Red
    exit 1
}

Write-Host "Starting PhD NexusCare..." -ForegroundColor Cyan
Write-Host ""

# Start backend in new window
Write-Host "[1/2] Starting Backend API..." -ForegroundColor Blue
$backendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; & '.\start-backend-windows.ps1'" -PassThru
Write-Host "✓ Backend process started (PID: $($backendProcess.Id))" -ForegroundColor Green

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Start frontend in new window
Write-Host "[2/2] Starting Frontend..." -ForegroundColor Blue
$frontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend-react; & '.\start-frontend-windows.ps1'" -PassThru
Write-Host "✓ Frontend process started (PID: $($frontendProcess.Id))" -ForegroundColor Green

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "✓ All services started!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend API: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Admin Panel: http://localhost:8000/admin" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the backend or frontend (in their respective windows)" -ForegroundColor Yellow
Write-Host ""

# Wait for both processes
Wait-Process -Id $backendProcess.Id, $frontendProcess.Id

