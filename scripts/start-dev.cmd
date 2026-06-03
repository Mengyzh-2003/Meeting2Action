@echo off
setlocal

set "ROOT=%~dp0.."

if not exist "%ROOT%\package.json" (
  echo [ERROR] package.json not found. Run this script from the repository scripts folder.
  exit /b 1
)

pushd "%ROOT%" || exit /b 1

echo [INFO] Project root: %CD%

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm is not available in PATH.
  popd
  exit /b 1
)

if not exist "node_modules" (
  echo [STEP 1/3] Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    popd
    exit /b 1
  )
) else if not exist "node_modules\@anthropic-ai\sdk" (
  echo [STEP 1/3] Dependencies look incomplete, repairing install...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    popd
    exit /b 1
  )
) else (
  echo [STEP 1/3] node_modules already exists, skip install.
)

echo [STEP 2/3] Starting API server in the background...
start "Meeting2Action API" /B /D "%CD%" cmd /c "npm run dev:api"

echo [STEP 3/3] Starting Web server in the background...
start "Meeting2Action Web" /B /D "%CD%" cmd /c "npm run dev:web"

echo [STEP 4/4] Waiting 3 seconds for servers to start...
timeout /t 3 >nul

echo [DONE] Open http://127.0.0.1:3000 in your browser.
start "" "http://127.0.0.1:3000"

popd
endlocal
