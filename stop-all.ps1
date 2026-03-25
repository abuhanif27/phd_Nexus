[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-ListenerPids {
    param([int]$Port)

    try {
        $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop
        if ($null -eq $conns) {
            return @()
        }
        return @($conns | Select-Object -ExpandProperty OwningProcess -Unique)
    }
    catch {
        return @()
    }
}

function Stop-Port {
    param(
        [int]$Port,
        [string]$Name
    )

    $pids = @(Get-ListenerPids -Port $Port)
    if ($pids.Count -eq 0) {
        Write-Host "[INFO] $Name was not running on port $Port" -ForegroundColor Yellow
        return
    }

    Write-Host "[INFO] Stopping $Name on port $Port" -ForegroundColor Cyan

    for ($attempt = 1; $attempt -le 3; $attempt++) {
        $current = @(Get-ListenerPids -Port $Port)
        if ($current.Count -eq 0) {
            break
        }

        foreach ($procId in $current) {
            try {
                Stop-Process -Id $procId -Force -ErrorAction Stop
                Write-Host "[OK] Stopped PID $procId" -ForegroundColor Green
            }
            catch {
                Write-Host "[WARN] Could not stop PID ${procId}: $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }

        Start-Sleep -Milliseconds 600
    }

    $remaining = @(Get-ListenerPids -Port $Port)
    if ($remaining.Count -eq 0) {
        Write-Host "[OK] Port $Port is clear" -ForegroundColor Green
    }
    else {
        Write-Host "[WARN] Port $Port still in use by PID(s): $($remaining -join ', ')" -ForegroundColor Yellow
    }
}

Write-Host "Stopping NexusCare services (Windows launcher)..." -ForegroundColor Green

Stop-Port -Port 8000 -Name "Django backend"
Stop-Port -Port 3000 -Name "Next.js frontend"
Stop-Port -Port 8080 -Name "Auxiliary service"

Write-Host ""
Write-Host "Done." -ForegroundColor Green
