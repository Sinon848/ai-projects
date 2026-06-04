@echo off
setlocal

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launch-local.ps1"

endlocal
