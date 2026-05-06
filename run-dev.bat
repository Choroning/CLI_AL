@echo off
setlocal

set ROOT_DIR=%~dp0
cd /d "%ROOT_DIR%"

echo [1/4] Checking Python virtual environment...
if not exist ".venv\Scripts\python.exe" (
  python -m venv .venv
  if errorlevel 1 (
    echo Failed to create Python virtual environment.
    pause
    exit /b 1
  )
)

echo [2/4] Checking backend dependencies...
if not exist ".venv\Lib\site-packages\fastapi" (
  call ".venv\Scripts\python.exe" -m pip install -r backend\requirements.txt
  if errorlevel 1 (
    echo Failed to install backend dependencies.
    pause
    exit /b 1
  )
)
if not exist ".venv\Lib\site-packages\python_multipart" (
  call ".venv\Scripts\python.exe" -m pip install -r backend\requirements.txt
  if errorlevel 1 (
    echo Failed to install backend dependencies.
    pause
    exit /b 1
  )
)

echo [3/4] Checking frontend dependencies...
if not exist "node_modules" (
  call npm install
  if errorlevel 1 (
    echo Failed to install frontend dependencies.
    pause
    exit /b 1
  )
)

echo [4/4] Starting development servers...
start "CLI_AL Backend" cmd /k "cd /d "%ROOT_DIR%" && call .venv\Scripts\Activate.bat && python -m uvicorn app.main:app --app-dir backend --reload --port 8000"
start "CLI_AL Frontend" cmd /k "cd /d "%ROOT_DIR%" && npm --prefix frontend run dev"

echo.
echo Backend:  http://127.0.0.1:8000/api/health
echo Frontend: http://localhost:3000
echo.
echo Two terminal windows were opened. Close those windows to stop the servers.
pause
