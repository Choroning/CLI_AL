# Windows PowerShell launcher — runs backend + frontend in parallel.
#
# Usage:
#   pwsh ./infra/dev.ps1            # install + run both
#   pwsh ./infra/dev.ps1 backend    # just backend
#   pwsh ./infra/dev.ps1 frontend   # just frontend
#   pwsh ./infra/dev.ps1 install    # install deps only
#
# The script uses Start-Job for parallel execution. Ctrl+C stops both.

param(
    [ValidateSet('all', 'backend', 'frontend', 'install')]
    [string]$Target = 'all'
)

$ErrorActionPreference = 'Stop'
$Repo = Split-Path -Parent $PSScriptRoot

function Install-Backend {
    Write-Host "==> Installing backend (pip)" -ForegroundColor Cyan
    Push-Location (Join-Path $Repo 'backend')
    try { python -m pip install -e ".[dev]" } finally { Pop-Location }
}

function Install-Frontend {
    Write-Host "==> Installing frontend (npm)" -ForegroundColor Cyan
    Push-Location (Join-Path $Repo 'frontend')
    try { npm install } finally { Pop-Location }
}

function Start-Backend {
    Write-Host "==> Backend on http://localhost:8000" -ForegroundColor Green
    Push-Location (Join-Path $Repo 'backend')
    try { uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload } finally { Pop-Location }
}

function Start-Frontend {
    Write-Host "==> Frontend on http://localhost:3000" -ForegroundColor Green
    Push-Location (Join-Path $Repo 'frontend')
    try { npm run dev } finally { Pop-Location }
}

switch ($Target) {
    'install'  { Install-Backend; Install-Frontend; break }
    'backend'  { Start-Backend; break }
    'frontend' { Start-Frontend; break }
    'all' {
        # Spawn both as Windows processes so logs interleave in the same console.
        $backend = Start-Process -FilePath 'pwsh' -ArgumentList '-NoExit','-Command',"& '$PSCommandPath' backend" -PassThru
        $frontend = Start-Process -FilePath 'pwsh' -ArgumentList '-NoExit','-Command',"& '$PSCommandPath' frontend" -PassThru
        Write-Host "Backend PID:  $($backend.Id)"
        Write-Host "Frontend PID: $($frontend.Id)"
        Write-Host "Close the spawned windows or kill these PIDs to stop."
    }
}
