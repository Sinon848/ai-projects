$ErrorActionPreference = "Stop"

$repoRoot = $PSScriptRoot
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "图片压缩工坊.lnk"
$shortcutTarget = Join-Path $repoRoot "launch-local.bat"
$shortcutIcon = Join-Path $repoRoot "assets\shortcut-icon.ico"

$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $shortcutTarget
$shortcut.WorkingDirectory = $repoRoot
$shortcut.IconLocation = "$shortcutIcon,0"
$shortcut.Description = "图片压缩工坊"
$shortcut.Save()

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) {
  $node = "C:\Users\17526\Documents\Codex\2026-05-23\nodejs\node-v24.16.0-win-x64\node.exe"
}

Start-Process -WindowStyle Hidden -FilePath $node -ArgumentList "`"$repoRoot\server.js`""

$deadline = (Get-Date).AddSeconds(10)
while ((Get-Date) -lt $deadline) {
  try {
    Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:4173" -TimeoutSec 1 | Out-Null
    Start-Process "http://127.0.0.1:4173"
    exit 0
  } catch {
    Start-Sleep -Milliseconds 250
  }
}

throw "The local server did not start in time."
