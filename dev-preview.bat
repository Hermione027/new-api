@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "PS1_SCRIPT=%SCRIPT_DIR%dev-preview.ps1"
set "HAS_ARGS=1"

if not exist "%PS1_SCRIPT%" (
  echo Could not find "%PS1_SCRIPT%".
  pause
  exit /b 1
)

if "%~1"=="" (
  set "HAS_ARGS=0"
  echo Running dev preview action: start
  powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%PS1_SCRIPT%" start
) else (
  echo Running dev preview action: %~1
  powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%PS1_SCRIPT%" %*
)
set "EXIT_CODE=%ERRORLEVEL%"

if "%HAS_ARGS%"=="0" pause
exit /b %EXIT_CODE%
