[CmdletBinding()]
param(
    [switch]$NoBrowser
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Test-PortListening {
    param([int]$Port)

    try {
        return $null -ne (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop | Select-Object -First 1)
    }
    catch {
        return $false
    }
}

function Start-Backend {
    param(
        [string]$BackendDir,
        [string]$BackendLogOut,
        [string]$BackendLogErr
    )

    if (Test-PortListening -Port 8000) {
        Write-Host "[WARN] Backend already listening on port 8000" -ForegroundColor Yellow
        return
    }

    $managePy = Join-Path $BackendDir "manage.py"
    if (-not (Test-Path $managePy)) {
        throw "manage.py not found in backend folder: $BackendDir"
    }

    $venvPython = Join-Path $BackendDir ".venv\Scripts\python.exe"
    $pythonExe = if (Test-Path $venvPython) { $venvPython } else { "python" }

    Write-Host "[INFO] Starting Django backend on :8000" -ForegroundColor Cyan
    $backendProcess = Start-Process -FilePath $pythonExe `
        -ArgumentList @("manage.py", "runserver", "0.0.0.0:8000") `
        -WorkingDirectory $BackendDir `
        -RedirectStandardOutput $BackendLogOut `
        -RedirectStandardError $BackendLogErr `
        -NoNewWindow `
        -PassThru

    # Wait up to 30 seconds for backend to start
    $maxWaitTime = 30
    $elapsed = 0
    $checkInterval = 2
    
    while ($elapsed -lt $maxWaitTime) {
        Start-Sleep -Seconds $checkInterval
        $elapsed += $checkInterval
        
        if (Test-PortListening -Port 8000) {
            Write-Host "[OK] Backend started. PID: $($backendProcess.Id)" -ForegroundColor Green
            return
        }
    }
    
    Write-Host "[WARN] Backend process started but port 8000 is not listening yet (waited $maxWaitTime seconds)." -ForegroundColor Yellow
    Write-Host "[HINT] Check logs: $BackendLogErr" -ForegroundColor Gray
}

function Start-Frontend {
    param(
        [string]$FrontendDir,
        [string]$FrontendLogOut,
        [string]$FrontendLogErr
    )

    if (Test-PortListening -Port 3000) {
        Write-Host "[WARN] Frontend already listening on port 3000" -ForegroundColor Yellow
        return
    }

    $packageJson = Join-Path $FrontendDir "package.json"
    if (-not (Test-Path $packageJson)) {
        throw "package.json not found in frontend folder: $FrontendDir"
    }

    $nodeModules = Join-Path $FrontendDir "node_modules"
    if (-not (Test-Path $nodeModules)) {
        Write-Host "[INFO] Installing frontend dependencies..." -ForegroundColor Cyan
        & npm install --prefix $FrontendDir
    }

    Write-Host "[INFO] Starting Next.js frontend on :3000" -ForegroundColor Cyan
    $frontendProcess = Start-Process -FilePath "npm.cmd" `
        -ArgumentList @("run", "dev") `
        -WorkingDirectory $FrontendDir `
        -RedirectStandardOutput $FrontendLogOut `
        -RedirectStandardError $FrontendLogErr `
        -NoNewWindow `
        -PassThru

    # Wait up to 45 seconds for frontend to start (npm needs more time)
    $maxWaitTime = 45
    $elapsed = 0
    $checkInterval = 2
    
    while ($elapsed -lt $maxWaitTime) {
        Start-Sleep -Seconds $checkInterval
        $elapsed += $checkInterval
        
        if (Test-PortListening -Port 3000) {
            Write-Host "[OK] Frontend started. PID: $($frontendProcess.Id)" -ForegroundColor Green
            return
        }
    }
    
    Write-Host "[WARN] Frontend process started but port 3000 is not listening yet (waited $maxWaitTime seconds)." -ForegroundColor Yellow
    Write-Host "[HINT] Check logs: $FrontendLogErr" -ForegroundColor Gray
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$backendDir = Join-Path $scriptDir "backend"
$frontendDir = Join-Path $scriptDir "frontend"

$backendLogOut = Join-Path $env:TEMP "nexuscare-backend.out.log"
$backendLogErr = Join-Path $env:TEMP "nexuscare-backend.err.log"
$frontendLogOut = Join-Path $env:TEMP "nexuscare-frontend.out.log"
$frontendLogErr = Join-Path $env:TEMP "nexuscare-frontend.err.log"

Write-Host "Starting NexusCare (Windows launcher)..." -ForegroundColor Green

Start-Backend -BackendDir $backendDir -BackendLogOut $backendLogOut -BackendLogErr $backendLogErr
Start-Frontend -FrontendDir $frontendDir -FrontendLogOut $frontendLogOut -FrontendLogErr $frontendLogErr

Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000"
Write-Host "Backend:  http://localhost:8000"
Write-Host "API:      http://localhost:8000/api"
Write-Host "Admin:    http://localhost:8000/admin"

Write-Host ""
Write-Host "Logs:" -ForegroundColor Cyan
Write-Host "Backend out:  $backendLogOut"
Write-Host "Backend err:  $backendLogErr"
Write-Host "Frontend out: $frontendLogOut"
Write-Host "Frontend err: $frontendLogErr"

if (-not $NoBrowser) {
    Start-Process "http://localhost:3000" | Out-Null
}

Write-Host ""
Write-Host "Done." -ForegroundColor Green