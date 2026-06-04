@echo off
setlocal

set "ROOT=%~dp0"
set "NODE_EXE=C:\Users\17526\Documents\Codex\2026-05-23\nodejs\node-v24.16.0-win-x64\node.exe"

if exist "%NODE_EXE%" goto run
for %%I in (node.exe) do set "NODE_EXE=%%~$PATH:I"

:run
if not exist "%NODE_EXE%" (
  echo Node.js was not found.
  echo Please install Node.js or update launch-local.bat.
  pause
  exit /b 1
)

start "" /min "%NODE_EXE%" "%ROOT%server.js"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:4173"

endlocal
