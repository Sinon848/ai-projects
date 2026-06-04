$ErrorActionPreference = "Stop"

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) {
  $node = "C:\Users\17526\Documents\Codex\2026-05-23\nodejs\node-v24.16.0-win-x64\node.exe"
}

Start-Process -WindowStyle Hidden -FilePath $node -ArgumentList "`"$PSScriptRoot\server.js`""
Start-Sleep -Seconds 2
Start-Process "http://127.0.0.1:4173"
